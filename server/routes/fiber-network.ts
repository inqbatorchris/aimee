import { Router } from 'express';
import { db } from '../db';
import { fiberNetworkNodes, fiberNetworkActivityLogs, fiberNodeTypes, workItems, insertFiberNetworkNodeSchema, insertFiberNodeTypeSchema } from '../../shared/schema';
import { eq, and, sql, inArray, desc } from 'drizzle-orm';
import { authenticateToken } from '../auth';
import { z } from 'zod';

const router = Router();

// Validation schema for creating fiber network node (from client)
// Client shouldn't send organizationId, createdBy, or updatedBy
const createNodeSchema = insertFiberNetworkNodeSchema.omit({
  organizationId: true,
  createdBy: true,
  updatedBy: true
}).extend({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

// Create a new fiber network node
router.post('/nodes', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    
    // Validate user ID
    if (!req.user.id || isNaN(req.user.id)) {
      console.error('Invalid user ID:', req.user);
      return res.status(400).json({ error: 'Invalid user authentication' });
    }
    
    // Validate request body with Zod (without organizationId)
    const validation = createNodeSchema.safeParse(req.body);
    if (!validation.success) {
      console.error('Validation failed for fiber node creation:', validation.error.format());
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.error.format() 
      });
    }
    
    // Add organizationId to the validated data
    const data = {
      ...validation.data,
      organizationId,
      createdBy: req.user.id,
      updatedBy: req.user.id
    };
    
    // Create the fiber network node with numeric coordinates
    // Use spread to include all fields from data
    const result = await db
      .insert(fiberNetworkNodes)
      .values(data as any) // Type assertion to bypass TypeScript issue
      .returning();
    
    const newNode = result[0];
    
    // Log the creation
    await db.insert(fiberNetworkActivityLogs).values({
      organizationId,
      userId: req.user.id,
      userName: req.user.fullName || req.user.email,
      actionType: 'create',
      entityType: 'fiber_node',
      entityId: newNode.id,
      changes: {
        added: { 
          name: data.name, 
          nodeType: data.nodeType, 
          network: data.network, 
          status: data.status, 
          latitude: data.latitude, 
          longitude: data.longitude 
        }
      },
      ipAddress: req.ip
    });
    
    res.status(201).json({ node: newNode });
  } catch (error) {
    console.error('Error creating fiber network node:', error);
    res.status(500).json({ error: 'Failed to create fiber network node' });
  }
});

// Get all fiber network nodes for an organization
router.get('/nodes', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    
    const nodes = await db
      .select()
      .from(fiberNetworkNodes)
      .where(eq(fiberNetworkNodes.organizationId, organizationId))
      .orderBy(fiberNetworkNodes.name);
    
    // Get work item counts for each fiber node
    const workItemCounts = await db
      .select({
        fiberNodeId: sql<number>`CAST((workflow_metadata->>'fiberNodeId') AS INTEGER)`,
        status: workItems.status,
        count: sql<number>`COUNT(*)::int`
      })
      .from(workItems)
      .where(
        and(
          eq(workItems.organizationId, organizationId),
          sql`workflow_metadata->>'fiberNodeId' IS NOT NULL`
        )
      )
      .groupBy(
        sql`workflow_metadata->>'fiberNodeId'`,
        workItems.status
      );
    
    // Aggregate counts by node
    const countsByNode = new Map<number, { pending: number; completed: number; total: number }>();
    
    workItemCounts.forEach(row => {
      if (!countsByNode.has(row.fiberNodeId)) {
        countsByNode.set(row.fiberNodeId, { pending: 0, completed: 0, total: 0 });
      }
      const counts = countsByNode.get(row.fiberNodeId)!;
      counts.total += row.count;
      
      if (row.status === 'Completed') {
        counts.completed += row.count;
      } else {
        counts.pending += row.count;
      }
    });
    
    // Attach counts to nodes
    const nodesWithCounts = nodes.map(node => ({
      ...node,
      workItemCounts: countsByNode.get(node.id) || { pending: 0, completed: 0, total: 0 }
    }));
    
    res.json({ nodes: nodesWithCounts });
  } catch (error) {
    console.error('Error fetching fiber network nodes:', error);
    res.status(500).json({ error: 'Failed to fetch fiber network nodes' });
  }
});

// Get a single fiber network node
router.get('/nodes/:id', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const nodeId = parseInt(req.params.id);
    
    const node = await db
      .select()
      .from(fiberNetworkNodes)
      .where(
        and(
          eq(fiberNetworkNodes.id, nodeId),
          eq(fiberNetworkNodes.organizationId, organizationId)
        )
      )
      .limit(1);
    
    if (node.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    res.json({ node: node[0] });
  } catch (error) {
    console.error('Error fetching fiber network node:', error);
    res.status(500).json({ error: 'Failed to fetch fiber network node' });
  }
});

// Bulk update status for multiple nodes (MUST BE BEFORE /nodes/:id to avoid path conflict)
router.patch('/nodes/bulk-update-status', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { nodeIds, status } = req.body;
    
    // Validate user ID
    if (!req.user.id || isNaN(req.user.id)) {
      console.error('Invalid user ID:', req.user);
      return res.status(400).json({ error: 'Invalid user authentication' });
    }
    
    // Validate input
    if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
      return res.status(400).json({ error: 'Invalid nodeIds array' });
    }
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    // Update all nodes
    const result = await db
      .update(fiberNetworkNodes)
      .set({
        status,
        updatedBy: req.user.id,
        updatedAt: new Date()
      })
      .where(
        and(
          inArray(fiberNetworkNodes.id, nodeIds),
          eq(fiberNetworkNodes.organizationId, organizationId)
        )
      )
      .returning();
    
    // Log the bulk update only if nodes were actually updated
    if (result.length > 0) {
      await db.insert(fiberNetworkActivityLogs).values(
        result.map(node => ({
          organizationId,
          userId: req.user.id,
          userName: req.user.name || req.user.email,
          actionType: 'update' as const,
          entityType: 'fiber_node' as const,
          entityId: node.id,
          changes: { after: { status } },
          ipAddress: req.ip
        }))
      );
    }
    
    res.json({ 
      updated: result.length,
      nodes: result 
    });
  } catch (error) {
    console.error('Error bulk updating fiber network nodes:', error);
    res.status(500).json({ error: 'Failed to bulk update fiber network nodes' });
  }
});

// Update a fiber network node
router.patch('/nodes/:id', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const nodeId = parseInt(req.params.id);
    const { name, nodeType, status, what3words, address, notes, photos, fiberDetails } = req.body;
    
    // Validate user ID
    if (!req.user.id || isNaN(req.user.id)) {
      console.error('Invalid user ID:', req.user);
      return res.status(400).json({ error: 'Invalid user authentication' });
    }
    
    // Build update object
    const updateData: any = {
      updatedBy: req.user.id,
      updatedAt: new Date()
    };
    
    if (name !== undefined) updateData.name = name;
    if (nodeType !== undefined) updateData.nodeType = nodeType;
    if (status !== undefined) updateData.status = status;
    if (what3words !== undefined) updateData.what3words = what3words;
    if (address !== undefined) updateData.address = address;
    if (notes !== undefined) updateData.notes = notes;
    if (photos !== undefined) updateData.photos = photos;
    if (fiberDetails !== undefined) updateData.fiberDetails = fiberDetails;
    
    const result = await db
      .update(fiberNetworkNodes)
      .set(updateData)
      .where(
        and(
          eq(fiberNetworkNodes.id, nodeId),
          eq(fiberNetworkNodes.organizationId, organizationId)
        )
      )
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    // Log the update
    await db.insert(fiberNetworkActivityLogs).values({
      organizationId,
      userId: req.user.id,
      userName: req.user.name || req.user.email,
      actionType: 'update',
      entityType: 'fiber_node',
      entityId: nodeId,
      changes: req.body,
      ipAddress: req.ip
    });
    
    res.json({ node: result[0] });
  } catch (error) {
    console.error('Error updating fiber network node:', error);
    res.status(500).json({ error: 'Failed to update fiber network node' });
  }
});

// Delete a fiber network node
router.delete('/nodes/:id', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const nodeId = parseInt(req.params.id);
    
    // Validate user ID
    if (!req.user.id || isNaN(req.user.id)) {
      console.error('Invalid user ID:', req.user);
      return res.status(400).json({ error: 'Invalid user authentication' });
    }
    
    // Check if node exists and belongs to this organization
    const existingNode = await db
      .select()
      .from(fiberNetworkNodes)
      .where(
        and(
          eq(fiberNetworkNodes.id, nodeId),
          eq(fiberNetworkNodes.organizationId, organizationId)
        )
      )
      .limit(1);
    
    if (existingNode.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    // Delete the node
    const result = await db
      .delete(fiberNetworkNodes)
      .where(
        and(
          eq(fiberNetworkNodes.id, nodeId),
          eq(fiberNetworkNodes.organizationId, organizationId)
        )
      )
      .returning();
    
    // Log the deletion
    await db.insert(fiberNetworkActivityLogs).values({
      organizationId,
      userId: req.user.id,
      userName: req.user.fullName || req.user.email,
      actionType: 'delete' as const,
      entityType: 'fiber_node' as const,
      entityId: nodeId,
      changes: { deleted: existingNode[0] } as any,
      ipAddress: req.ip
    });
    
    res.json({ 
      success: true, 
      message: 'Node deleted successfully',
      deletedNode: result[0] 
    });
  } catch (error) {
    console.error('Error deleting fiber network node:', error);
    res.status(500).json({ error: 'Failed to delete fiber network node' });
  }
});

// Get activity logs for a node
router.get('/nodes/:id/activity', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const nodeId = parseInt(req.params.id);
    
    const logs = await db
      .select()
      .from(fiberNetworkActivityLogs)
      .where(
        and(
          eq(fiberNetworkActivityLogs.entityId, nodeId),
          eq(fiberNetworkActivityLogs.entityType, 'fiber_node'),
          eq(fiberNetworkActivityLogs.organizationId, organizationId)
        )
      )
      .orderBy(sql`${fiberNetworkActivityLogs.timestamp} DESC`)
      .limit(100);
    
    res.json({ logs });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// Create a new chamber record from workflow completion
router.post('/nodes/from-workflow', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { 
      name, 
      nodeType = 'chamber',
      network,
      latitude, 
      longitude, 
      what3words, 
      address, 
      notes, 
      photos = [],
      fiberDetails = {},
      workItemId 
    } = req.body;
    
    // Validate required fields
    if (!name || !latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, latitude, and longitude are required' 
      });
    }
    
    // Create the fiber network node
    const result = await db
      .insert(fiberNetworkNodes)
      .values({
        organizationId,
        name,
        nodeType,
        network: network || 'FibreLtd',
        status: 'active',
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        what3words,
        address,
        notes,
        photos,
        fiberDetails,
        createdBy: req.user.id,
        updatedBy: req.user.id
      })
      .returning();
    
    const newNode = result[0];
    
    // Log the creation
    await db.insert(fiberNetworkActivityLogs).values({
      organizationId,
      userId: req.user.id,
      userName: req.user.fullName || req.user.email,
      actionType: 'workflow_completed',
      entityType: 'fiber_node',
      entityId: newNode.id,
      changes: {
        added: { name, nodeType, latitude, longitude }
      },
      workItemId: workItemId || null,
      ipAddress: req.ip
    });
    
    res.status(201).json({ node: newNode });
  } catch (error) {
    console.error('Error creating fiber network node from workflow:', error);
    res.status(500).json({ error: 'Failed to create chamber record' });
  }
});

// Get available networks list for field app
router.get('/networks', authenticateToken, async (req: any, res) => {
  try {
    // Return standard list of networks
    const networks = ['CCNet', 'FibreLtd', 'S&MFibre'];
    res.json({ networks });
  } catch (error) {
    console.error('Error fetching networks:', error);
    res.status(500).json({ error: 'Failed to fetch networks' });
  }
});

// ========================================
// NODE TYPE MANAGEMENT ENDPOINTS
// ========================================

// Get all active node types for the organization
router.get('/node-types', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    
    const nodeTypes = await db
      .select()
      .from(fiberNodeTypes)
      .where(
        and(
          eq(fiberNodeTypes.organizationId, organizationId),
          eq(fiberNodeTypes.isActive, true)
        )
      )
      .orderBy(fiberNodeTypes.sortOrder, fiberNodeTypes.label);
    
    res.json({ nodeTypes });
  } catch (error) {
    console.error('Error fetching node types:', error);
    res.status(500).json({ error: 'Failed to fetch node types' });
  }
});

// Create a new node type
router.post('/node-types', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    
    // Validate user ID
    if (!req.user.id || isNaN(req.user.id)) {
      console.error('Invalid user ID:', req.user);
      return res.status(400).json({ error: 'Invalid user authentication' });
    }
    
    // Validate request body
    const validation = insertFiberNodeTypeSchema.safeParse({
      ...req.body,
      organizationId,
      createdBy: req.user.id,
    });
    
    if (!validation.success) {
      console.error('Validation failed for node type creation:', validation.error.format());
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.error.format() 
      });
    }
    
    // Check if node type with same value already exists for this organization
    const existingType = await db
      .select()
      .from(fiberNodeTypes)
      .where(
        and(
          eq(fiberNodeTypes.organizationId, organizationId),
          eq(fiberNodeTypes.value, validation.data.value)
        )
      )
      .limit(1);
    
    if (existingType.length > 0) {
      return res.status(400).json({ 
        error: 'Node type already exists',
        details: 'A node type with this value already exists for your organization' 
      });
    }
    
    // Create the node type
    const result = await db
      .insert(fiberNodeTypes)
      .values(validation.data)
      .returning();
    
    res.status(201).json({ nodeType: result[0] });
  } catch (error) {
    console.error('Error creating node type:', error);
    res.status(500).json({ error: 'Failed to create node type' });
  }
});

// Delete a node type
router.delete('/node-types/:id', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const nodeTypeId = parseInt(req.params.id);
    
    // Validate user ID
    if (!req.user.id || isNaN(req.user.id)) {
      console.error('Invalid user ID:', req.user);
      return res.status(400).json({ error: 'Invalid user authentication' });
    }
    
    // Check if node type exists and belongs to this organization
    const existingType = await db
      .select()
      .from(fiberNodeTypes)
      .where(
        and(
          eq(fiberNodeTypes.id, nodeTypeId),
          eq(fiberNodeTypes.organizationId, organizationId)
        )
      )
      .limit(1);
    
    if (existingType.length === 0) {
      return res.status(404).json({ error: 'Node type not found' });
    }
    
    // Check if any nodes are using this type
    const nodesUsingType = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(fiberNetworkNodes)
      .where(
        and(
          eq(fiberNetworkNodes.organizationId, organizationId),
          sql`${fiberNetworkNodes.nodeType}::text = ${existingType[0].value}`
        )
      );
    
    if (nodesUsingType[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete node type',
        details: `${nodesUsingType[0].count} node(s) are using this type. Please reassign them first.`
      });
    }
    
    // Soft delete by setting isActive to false
    const result = await db
      .update(fiberNodeTypes)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(fiberNodeTypes.id, nodeTypeId),
          eq(fiberNodeTypes.organizationId, organizationId)
        )
      )
      .returning();
    
    res.json({ 
      success: true, 
      message: 'Node type deleted successfully',
      nodeType: result[0]
    });
  } catch (error) {
    console.error('Error deleting node type:', error);
    res.status(500).json({ error: 'Failed to delete node type' });
  }
});

// ========================================
// CABLE MANAGEMENT ENDPOINTS
// ========================================

// Add cable connection to a node
router.post('/nodes/:id/cables', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const nodeId = parseInt(req.params.id);
    const { connectedNodeId, fiberCount, cableIdentifier, cableType, direction, routeGeometry, notes } = req.body;
    
    if (!req.user.id || isNaN(req.user.id)) {
      return res.status(400).json({ error: 'Invalid user authentication' });
    }
    
    if (!connectedNodeId || !fiberCount || !cableIdentifier || !direction) {
      return res.status(400).json({ 
        error: 'Missing required fields: connectedNodeId, fiberCount, cableIdentifier, and direction are required' 
      });
    }
    
    // Get the node
    const nodes = await db
      .select()
      .from(fiberNetworkNodes)
      .where(
        and(
          eq(fiberNetworkNodes.id, nodeId),
          eq(fiberNetworkNodes.organizationId, organizationId)
        )
      )
      .limit(1);
    
    if (nodes.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    const node = nodes[0];
    const currentFiberDetails = node.fiberDetails || {};
    const currentCables = currentFiberDetails.cables || [];
    
    // Get connected node name
    const connectedNodes = await db
      .select()
      .from(fiberNetworkNodes)
      .where(
        and(
          eq(fiberNetworkNodes.id, connectedNodeId),
          eq(fiberNetworkNodes.organizationId, organizationId)
        )
      )
      .limit(1);
    
    const connectedNodeName = connectedNodes.length > 0 ? connectedNodes[0].name : undefined;
    
    // Create new cable entry
    const newCable = {
      id: `cable_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      connectedNodeId,
      connectedNodeName,
      fiberCount,
      cableIdentifier,
      cableType,
      direction,
      routeGeometry,
      notes,
      createdBy: req.user.id,
      createdAt: new Date().toISOString()
    };
    
    // Update node with new cable
    const updatedFiberDetails = {
      ...currentFiberDetails,
      cables: [...currentCables, newCable]
    };
    
    const result = await db
      .update(fiberNetworkNodes)
      .set({
        fiberDetails: updatedFiberDetails,
        updatedBy: req.user.id,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(fiberNetworkNodes.id, nodeId),
          eq(fiberNetworkNodes.organizationId, organizationId)
        )
      )
      .returning();
    
    // Log the cable addition
    await db.insert(fiberNetworkActivityLogs).values({
      organizationId,
      userId: req.user.id,
      userName: req.user.fullName || req.user.email,
      actionType: 'update',
      entityType: 'fiber_node',
      entityId: nodeId,
      changes: { added: { cable: newCable } },
      ipAddress: req.ip
    });
    
    res.status(201).json({ cable: newCable, node: result[0] });
  } catch (error) {
    console.error('Error adding cable to node:', error);
    res.status(500).json({ error: 'Failed to add cable' });
  }
});

// Get cables for a node
router.get('/nodes/:id/cables', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const nodeId = parseInt(req.params.id);
    
    const nodes = await db
      .select()
      .from(fiberNetworkNodes)
      .where(
        and(
          eq(fiberNetworkNodes.id, nodeId),
          eq(fiberNetworkNodes.organizationId, organizationId)
        )
      )
      .limit(1);
    
    if (nodes.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    const node = nodes[0];
    const cables = node.fiberDetails?.cables || [];
    
    res.json({ cables });
  } catch (error) {
    console.error('Error fetching cables:', error);
    res.status(500).json({ error: 'Failed to fetch cables' });
  }
});

// ========================================
// SPLICE CONNECTION MANAGEMENT ENDPOINTS
// ========================================

// Get splice connections for a node
router.get('/nodes/:id/splice-connections', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const nodeId = parseInt(req.params.id);
    
    const nodes = await db
      .select()
      .from(fiberNetworkNodes)
      .where(
        and(
          eq(fiberNetworkNodes.id, nodeId),
          eq(fiberNetworkNodes.organizationId, organizationId)
        )
      )
      .limit(1);
    
    if (nodes.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    const node = nodes[0];
    const spliceConnections = node.fiberDetails?.spliceConnections || [];
    
    res.json({ spliceConnections });
  } catch (error) {
    console.error('Error fetching splice connections:', error);
    res.status(500).json({ error: 'Failed to fetch splice connections' });
  }
});

// Add or update splice connections for a node (bulk operation)
router.patch('/nodes/:id/splice-connections', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const nodeId = parseInt(req.params.id);
    const { connections, operation = 'add' } = req.body; // operation: 'add', 'replace', 'verify'
    
    if (!req.user.id || isNaN(req.user.id)) {
      return res.status(400).json({ error: 'Invalid user authentication' });
    }
    
    if (!connections || !Array.isArray(connections)) {
      return res.status(400).json({ error: 'Connections array is required' });
    }
    
    // Get the node
    const nodes = await db
      .select()
      .from(fiberNetworkNodes)
      .where(
        and(
          eq(fiberNetworkNodes.id, nodeId),
          eq(fiberNetworkNodes.organizationId, organizationId)
        )
      )
      .limit(1);
    
    if (nodes.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    const node = nodes[0];
    const currentFiberDetails = node.fiberDetails || {};
    const currentConnections = currentFiberDetails.spliceConnections || [];
    
    let updatedConnections;
    
    if (operation === 'replace') {
      // Replace all connections
      updatedConnections = connections.map((conn: any) => ({
        ...conn,
        id: conn.id || `splice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdBy: conn.createdBy || req.user.id,
        createdAt: conn.createdAt || new Date().toISOString(),
        verifiedBy: conn.verifiedBy,
        verifiedAt: conn.verifiedAt
      }));
    } else if (operation === 'verify') {
      // Verify specific connections by ID
      const connectionIds = connections.map((c: any) => c.id);
      updatedConnections = currentConnections.map((conn: any) => {
        if (connectionIds.includes(conn.id)) {
          return {
            ...conn,
            verificationStatus: 'verified',
            verifiedBy: req.user.id,
            verifiedAt: new Date().toISOString()
          };
        }
        return conn;
      });
    } else {
      // Add new connections
      const newConnections = connections.map((conn: any) => ({
        ...conn,
        id: conn.id || `splice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdBy: req.user.id,
        createdAt: new Date().toISOString(),
        verificationStatus: conn.verificationStatus || 'manual'
      }));
      updatedConnections = [...currentConnections, ...newConnections];
    }
    
    // Update node with new connections
    const updatedFiberDetails = {
      ...currentFiberDetails,
      spliceConnections: updatedConnections
    };
    
    const result = await db
      .update(fiberNetworkNodes)
      .set({
        fiberDetails: updatedFiberDetails,
        updatedBy: req.user.id,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(fiberNetworkNodes.id, nodeId),
          eq(fiberNetworkNodes.organizationId, organizationId)
        )
      )
      .returning();
    
    // Log the update
    await db.insert(fiberNetworkActivityLogs).values({
      organizationId,
      userId: req.user.id,
      userName: req.user.fullName || req.user.email,
      actionType: 'update',
      entityType: 'fiber_node',
      entityId: nodeId,
      changes: { 
        operation,
        connectionsCount: connections.length
      },
      ipAddress: req.ip
    });
    
    res.json({ spliceConnections: updatedConnections, node: result[0] });
  } catch (error) {
    console.error('Error updating splice connections:', error);
    res.status(500).json({ error: 'Failed to update splice connections' });
  }
});

// ========================================
// AI PROCESSING ENDPOINTS
// ========================================

// Transcribe audio for splice documentation
router.post('/transcribe-splice', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { audioBase64, language, prompt } = req.body;
    
    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data is required' });
    }
    
    // Import OpenAI service
    const { default: OpenAIService } = await import('../services/integrations/openaiService');
    const openaiService = new OpenAIService(organizationId);
    await openaiService.initialize();
    
    // Transcribe the audio
    const transcription = await openaiService.transcribeAudioFromBase64(audioBase64, {
      language,
      prompt: prompt || 'Fiber optic splice connection documentation'
    });
    
    res.json({ transcription });
  } catch (error: any) {
    console.error('Error transcribing audio:', error);
    res.status(500).json({ 
      error: 'Failed to transcribe audio',
      details: error.message 
    });
  }
});

// Extract splice connections from transcription
router.post('/extract-splice-data', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { transcription, nodeId, nodeName, availableCables } = req.body;
    
    if (!transcription) {
      return res.status(400).json({ error: 'Transcription is required' });
    }
    
    // Import OpenAI service
    const { default: OpenAIService } = await import('../services/integrations/openaiService');
    const openaiService = new OpenAIService(organizationId);
    await openaiService.initialize();
    
    // Extract splice connections
    const connections = await openaiService.extractSpliceConnections(transcription, {
      nodeName,
      availableCables
    });
    
    // Add metadata to connections
    const enrichedConnections = connections.map(conn => ({
      ...conn,
      verificationStatus: 'ai_generated',
      transcriptionText: transcription,
      createdAt: new Date().toISOString()
    }));
    
    // If nodeId is provided, optionally save to the node
    if (nodeId) {
      const nodes = await db
        .select()
        .from(fiberNetworkNodes)
        .where(
          and(
            eq(fiberNetworkNodes.id, parseInt(nodeId)),
            eq(fiberNetworkNodes.organizationId, organizationId)
          )
        )
        .limit(1);
      
      if (nodes.length > 0) {
        const node = nodes[0];
        const currentFiberDetails = node.fiberDetails || {};
        const currentConnections = currentFiberDetails.spliceConnections || [];
        
        const newConnections = enrichedConnections.map(conn => ({
          ...conn,
          id: `splice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdBy: req.user.id
        }));
        
        const updatedFiberDetails = {
          ...currentFiberDetails,
          spliceConnections: [...currentConnections, ...newConnections]
        };
        
        await db
          .update(fiberNetworkNodes)
          .set({
            fiberDetails: updatedFiberDetails,
            updatedBy: req.user.id,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(fiberNetworkNodes.id, parseInt(nodeId)),
              eq(fiberNetworkNodes.organizationId, organizationId)
            )
          );
        
        // Log the AI extraction
        await db.insert(fiberNetworkActivityLogs).values({
          organizationId,
          userId: req.user.id,
          userName: req.user.fullName || req.user.email,
          actionType: 'update',
          entityType: 'fiber_node',
          entityId: parseInt(nodeId),
          changes: { 
            aiExtracted: {
              connectionsCount: newConnections.length,
              method: 'whisper_gpt4'
            }
          },
          ipAddress: req.ip
        });
      }
    }
    
    res.json({ connections: enrichedConnections });
  } catch (error: any) {
    console.error('Error extracting splice data:', error);
    res.status(500).json({ 
      error: 'Failed to extract splice data',
      details: error.message 
    });
  }
});

export default router;
