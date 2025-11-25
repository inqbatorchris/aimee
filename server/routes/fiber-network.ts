import { Router } from 'express';
import { db } from '../db';
import { 
  fiberNetworkNodes, 
  fiberNetworkActivityLogs, 
  fiberNodeTypes, 
  workItems, 
  fiberSpliceTrays,
  fiberConnections,
  cableFiberDefinitions,
  insertFiberNetworkNodeSchema, 
  insertFiberNodeTypeSchema,
  insertFiberSpliceTraySchema,
  insertFiberConnectionSchema,
  insertCableFiberDefinitionSchema
} from '../../shared/schema';
import { eq, and, sql, inArray, desc } from 'drizzle-orm';
import { authenticateToken } from '../auth';
import { z } from 'zod';
import { generateFiberColorScheme } from '../../shared/fiberColorStandards';

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

// Workflow callback endpoint to save verified splice connections from voice memo workflow
router.post('/save-splice-connections', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const userId = req.user.id;
    const { fiberNodeId, spliceConnections, workItemId, transcriptionText, audioReference, photos } = req.body;

    console.log('[Save Splice Connections] Workflow callback received:', {
      fiberNodeId,
      workItemId,
      connectionsCount: spliceConnections?.length || 0
    });

    if (!fiberNodeId) {
      return res.status(400).json({ error: 'fiberNodeId is required' });
    }

    if (!spliceConnections || !Array.isArray(spliceConnections)) {
      return res.status(400).json({ error: 'spliceConnections array is required' });
    }

    // Get the fiber node
    const [node] = await db
      .select()
      .from(fiberNetworkNodes)
      .where(
        and(
          eq(fiberNetworkNodes.id, fiberNodeId),
          eq(fiberNetworkNodes.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!node) {
      return res.status(404).json({ error: 'Fiber node not found' });
    }

    // Map connections to schema format
    const newConnections = spliceConnections.map((conn: any) => ({
      id: conn.id || `splice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workItemId: workItemId || conn.workItemId,
      incomingCable: conn.incomingCable,
      incomingFiber: parseInt(conn.incomingFiber),
      incomingBufferTube: conn.incomingBufferTube || undefined,
      outgoingCable: conn.outgoingCable,
      outgoingFiber: parseInt(conn.outgoingFiber),
      outgoingBufferTube: conn.outgoingBufferTube || undefined,
      verificationStatus: 'verified',
      transcriptionText: conn.transcriptionText || transcriptionText,
      audioReference: conn.audioReference || audioReference,
      photoReference: conn.photoReference || (photos && photos[0]),
      notes: conn.notes || undefined,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      verifiedBy: userId,
      verifiedAt: new Date().toISOString()
    }));

    // Append to node's splice connections
    const currentFiberDetails = node.fiberDetails || {};
    const existingSplices = currentFiberDetails.spliceConnections || [];

    const updatedFiberDetails = {
      ...currentFiberDetails,
      spliceConnections: [...existingSplices, ...newConnections]
    };

    await db
      .update(fiberNetworkNodes)
      .set({
        fiberDetails: updatedFiberDetails,
        updatedBy: userId,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(fiberNetworkNodes.id, fiberNodeId),
          eq(fiberNetworkNodes.organizationId, organizationId)
        )
      );

    // Log the activity
    await db.insert(fiberNetworkActivityLogs).values({
      organizationId,
      userId,
      userName: req.user.fullName || req.user.email,
      actionType: 'update',
      entityType: 'fiber_node',
      entityId: fiberNodeId,
      workItemId,
      changes: {
        added: {
          spliceConnections: newConnections.length,
          method: 'voice_memo_workflow'
        }
      },
      ipAddress: req.ip
    });

    console.log('[Save Splice Connections] Successfully saved', newConnections.length, 'connections to node', fiberNodeId);

    res.json({ 
      success: true, 
      connectionsAdded: newConnections.length,
      fiberNodeId,
      fiberNodeName: node.name
    });
  } catch (error: any) {
    console.error('[Save Splice Connections] Error:', error);
    res.status(500).json({ 
      error: 'Failed to save splice connections',
      details: error.message 
    });
  }
});

// Create a new cable connection between two nodes
router.post('/cables', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const userId = req.user.id;
    const { startNodeId, endNodeId, cableData } = req.body;

    // Validate input
    if (!startNodeId || !endNodeId || !cableData?.cableId) {
      return res.status(400).json({ error: 'Missing required fields: startNodeId, endNodeId, and cableData.cableId' });
    }

    // Get both nodes
    const nodes = await db
      .select()
      .from(fiberNetworkNodes)
      .where(
        and(
          inArray(fiberNetworkNodes.id, [startNodeId, endNodeId]),
          eq(fiberNetworkNodes.organizationId, organizationId)
        )
      );

    if (nodes.length !== 2) {
      return res.status(404).json({ error: 'One or both nodes not found' });
    }

    const [startNode, endNode] = nodes[0].id === startNodeId ? [nodes[0], nodes[1]] : [nodes[1], nodes[0]];

    // Calculate initial route geometry (straight line)
    const routeGeometry: Array<[number, number]> = [
      [Number(startNode.latitude), Number(startNode.longitude)],
      [Number(endNode.latitude), Number(endNode.longitude)]
    ];

    // Create cable object using cableId as the shared identifier
    const newCable = {
      id: cableData.cableId,
      connectedNodeId: endNode.id,
      connectedNodeName: endNode.name,
      fiberCount: cableData.fiberCount || 24,
      cableIdentifier: cableData.cableId,
      cableType: cableData.cableType || 'single_mode',
      lengthMeters: cableData.lengthMeters || 0,
      status: cableData.status || 'planned',
      direction: 'outgoing' as const,
      routeGeometry,
      notes: cableData.notes || '',
      createdBy: userId,
      createdAt: new Date().toISOString()
    };

    // Create reverse cable for end node
    const reverseCable = {
      ...newCable,
      connectedNodeId: startNode.id,
      connectedNodeName: startNode.name,
      direction: 'incoming' as const,
      routeGeometry: [...routeGeometry].reverse()
    };

    // Update start node
    const startFiberDetails = startNode.fiberDetails || {};
    const startCables = startFiberDetails.cables || [];
    await db
      .update(fiberNetworkNodes)
      .set({
        fiberDetails: {
          ...startFiberDetails,
          cables: [...startCables, newCable]
        },
        updatedBy: userId,
        updatedAt: new Date()
      })
      .where(eq(fiberNetworkNodes.id, startNode.id));

    // Update end node
    const endFiberDetails = endNode.fiberDetails || {};
    const endCables = endFiberDetails.cables || [];
    await db
      .update(fiberNetworkNodes)
      .set({
        fiberDetails: {
          ...endFiberDetails,
          cables: [...endCables, reverseCable]
        },
        updatedBy: userId,
        updatedAt: new Date()
      })
      .where(eq(fiberNetworkNodes.id, endNode.id));

    // Log activity
    await db.insert(fiberNetworkActivityLogs).values({
      organizationId,
      userId,
      userName: req.user.fullName || req.user.email,
      actionType: 'create',
      entityType: 'cable',
      entityId: startNode.id,
      changes: {
        added: {
          cableId: newCable.id,
          from: startNode.name,
          to: endNode.name,
          fiberCount: newCable.fiberCount
        }
      },
      ipAddress: req.ip
    });

    res.status(201).json({ 
      success: true, 
      cable: newCable,
      startNode: startNode.name,
      endNode: endNode.name
    });
  } catch (error: any) {
    console.error('Error creating cable:', error);
    res.status(500).json({ error: 'Failed to create cable', details: error.message });
  }
});

// Update cable route geometry (waypoints)
router.patch('/cables/:cableId/route', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const userId = req.user.id;
    const { cableId } = req.params;
    const { nodeId, waypoints } = req.body;

    if (!waypoints || !Array.isArray(waypoints)) {
      return res.status(400).json({ error: 'Waypoints array is required' });
    }

    // Get the node
    const [node] = await db
      .select()
      .from(fiberNetworkNodes)
      .where(
        and(
          eq(fiberNetworkNodes.id, nodeId),
          eq(fiberNetworkNodes.organizationId, organizationId)
        )
      );

    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Find and update the cable
    const fiberDetails = node.fiberDetails || {};
    const cables = fiberDetails.cables || [];
    const cableIndex = cables.findIndex((c: any) => c.id === cableId);

    if (cableIndex === -1) {
      return res.status(404).json({ error: 'Cable not found' });
    }

    // Update route geometry
    cables[cableIndex].routeGeometry = waypoints;

    await db
      .update(fiberNetworkNodes)
      .set({
        fiberDetails: {
          ...fiberDetails,
          cables
        },
        updatedBy: userId,
        updatedAt: new Date()
      })
      .where(eq(fiberNetworkNodes.id, nodeId));

    // Also update the connected node's reverse cable
    const connectedNodeId = cables[cableIndex].connectedNodeId;
    const [connectedNode] = await db
      .select()
      .from(fiberNetworkNodes)
      .where(
        and(
          eq(fiberNetworkNodes.id, connectedNodeId),
          eq(fiberNetworkNodes.organizationId, organizationId)
        )
      );

    if (connectedNode) {
      const connectedFiberDetails = connectedNode.fiberDetails || {};
      const connectedCables = connectedFiberDetails.cables || [];
      const connectedCableIndex = connectedCables.findIndex((c: any) => 
        c.id === cableId && c.connectedNodeId === nodeId
      );

      if (connectedCableIndex !== -1) {
        connectedCables[connectedCableIndex].routeGeometry = [...waypoints].reverse();
        
        await db
          .update(fiberNetworkNodes)
          .set({
            fiberDetails: {
              ...connectedFiberDetails,
              cables: connectedCables
            },
            updatedBy: userId,
            updatedAt: new Date()
          })
          .where(eq(fiberNetworkNodes.id, connectedNodeId));
      }
    }

    res.json({ success: true, cableId, waypoints: waypoints.length });
  } catch (error: any) {
    console.error('Error updating cable route:', error);
    res.status(500).json({ error: 'Failed to update cable route', details: error.message });
  }
});

// Delete a cable
router.delete('/cables/:cableId', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const userId = req.user.id;
    const { cableId } = req.params;
    const { nodeId } = req.query;

    if (!nodeId) {
      return res.status(400).json({ error: 'nodeId query parameter is required' });
    }

    // Get the node
    const [node] = await db
      .select()
      .from(fiberNetworkNodes)
      .where(
        and(
          eq(fiberNetworkNodes.id, parseInt(nodeId as string)),
          eq(fiberNetworkNodes.organizationId, organizationId)
        )
      );

    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Find the cable to get connected node
    const fiberDetails = node.fiberDetails || {};
    const cables = fiberDetails.cables || [];
    const cable = cables.find((c: any) => c.id === cableId);

    if (!cable) {
      return res.status(404).json({ error: 'Cable not found' });
    }

    const connectedNodeId = cable.connectedNodeId;

    // Remove cable from this node
    const updatedCables = cables.filter((c: any) => c.id !== cableId);
    await db
      .update(fiberNetworkNodes)
      .set({
        fiberDetails: {
          ...fiberDetails,
          cables: updatedCables
        },
        updatedBy: userId,
        updatedAt: new Date()
      })
      .where(eq(fiberNetworkNodes.id, node.id));

    // Remove reverse cable from connected node
    const [connectedNode] = await db
      .select()
      .from(fiberNetworkNodes)
      .where(
        and(
          eq(fiberNetworkNodes.id, connectedNodeId),
          eq(fiberNetworkNodes.organizationId, organizationId)
        )
      );

    if (connectedNode) {
      const connectedFiberDetails = connectedNode.fiberDetails || {};
      const connectedCables = connectedFiberDetails.cables || [];
      const filteredConnectedCables = connectedCables.filter((c: any) => 
        !(c.id === cableId && c.connectedNodeId === node.id)
      );

      await db
        .update(fiberNetworkNodes)
        .set({
          fiberDetails: {
            ...connectedFiberDetails,
            cables: filteredConnectedCables
          },
          updatedBy: userId,
          updatedAt: new Date()
        })
        .where(eq(fiberNetworkNodes.id, connectedNodeId));
    }

    // Log activity
    await db.insert(fiberNetworkActivityLogs).values({
      organizationId,
      userId,
      userName: req.user.fullName || req.user.email,
      actionType: 'delete',
      entityType: 'cable',
      entityId: node.id,
      changes: {
        before: {
          cableId,
          from: node.name,
          to: cable.connectedNodeName
        }
      },
      ipAddress: req.ip
    });

    res.json({ success: true, cableId });
  } catch (error: any) {
    console.error('Error deleting cable:', error);
    res.status(500).json({ error: 'Failed to delete cable', details: error.message });
  }
});

// ========================================
// FIBER STATUS ENDPOINTS
// ========================================

// Get fiber status for a cable at a node - shows which fibers are used/available/live
router.get('/cables/:cableId/fiber-status', authenticateToken, async (req: any, res) => {
  try {
    const { cableId } = req.params;
    const { nodeId } = req.query; // Optional: which node's perspective
    const organizationId = req.user.organizationId;

    console.log('[FIBER-STATUS] Getting status for cable:', cableId, 'at node:', nodeId);

    // 1. Get the cable's fiber count from any node that has it
    const cableNodesResult = await db.execute(sql`
      SELECT id, name, fiber_details
      FROM fiber_network_nodes
      WHERE organization_id = ${organizationId}
        AND fiber_details IS NOT NULL
    `);

    let fiberCount = 12; // Default
    let cableIdentifier = cableId;
    
    // Find the cable in any node's fiber_details
    for (const node of cableNodesResult.rows) {
      const fiberDetails = node.fiber_details as any;
      const cables = fiberDetails?.cables || [];
      const cable = cables.find((c: any) => c.id === cableId);
      if (cable) {
        fiberCount = cable.fiberCount || 12;
        cableIdentifier = cable.cableIdentifier || cableId;
        break;
      }
    }

    // 2. Get all splice connections that use this cable (as left or right)
    const spliceConnectionsResult = await db.execute(sql`
      SELECT 
        fc.id,
        fc.splice_tray_id,
        fc.left_fiber_number,
        fc.left_fiber_color,
        fc.right_fiber_number,
        fc.right_fiber_color,
        fst.tray_identifier,
        fst.fiber_node_id,
        fnn.name as node_name
      FROM fiber_connections fc
      JOIN fiber_splice_trays fst ON fc.splice_tray_id = fst.id
      JOIN fiber_network_nodes fnn ON fst.fiber_node_id = fnn.id
      WHERE fc.organization_id = ${organizationId}
    `);

    // 3. Get all terminations that use this cable
    const terminationsResult = await db.execute(sql`
      SELECT 
        ft.id,
        ft.fiber_number,
        ft.fiber_color,
        ft.is_live,
        ft.service_name,
        ft.termination_type,
        ft.termination_identifier,
        ft.status,
        fnn.name as customer_node_name,
        fnn.id as customer_node_id
      FROM fiber_terminations ft
      JOIN fiber_network_nodes fnn ON ft.customer_node_id = fnn.id
      WHERE ft.organization_id = ${organizationId}
        AND ft.cable_id = ${cableId}
    `);

    // 4. Build fiber status array
    const fibers: Array<{
      fiberNumber: number;
      color: string;
      colorHex: string;
      status: 'available' | 'used' | 'live' | 'reserved';
      usageType?: 'splice' | 'termination' | 'reserved';
      endpoint?: {
        type: 'node' | 'customer';
        nodeId?: number;
        nodeName?: string;
        trayId?: number;
        trayIdentifier?: string;
        fiberNumber?: number;
        serviceName?: string;
        terminationType?: string;
      };
    }> = [];

    // Import color function
    const { getColorForFiberNumber } = await import('../../shared/fiberColorStandards');

    for (let i = 1; i <= fiberCount; i++) {
      const colorInfo = getColorForFiberNumber(i, fiberCount);
      
      // Check if used in termination
      const termination = terminationsResult.rows.find((t: any) => t.fiber_number === i);
      if (termination) {
        fibers.push({
          fiberNumber: i,
          color: colorInfo.color,
          colorHex: colorInfo.colorHex,
          status: (termination as any).is_live ? 'live' : 'used',
          usageType: 'termination',
          endpoint: {
            type: 'customer',
            nodeId: (termination as any).customer_node_id,
            nodeName: (termination as any).customer_node_name,
            serviceName: (termination as any).service_name,
            terminationType: (termination as any).termination_type
          }
        });
        continue;
      }

      // Check if used in splice (we need to match by checking node's cable data)
      // For now, mark as available - we'll enhance this in the next iteration
      // The splice connections use left_cable_id/right_cable_id which are integers, not the cable string ID
      // This is a known mismatch we need to address
      
      fibers.push({
        fiberNumber: i,
        color: colorInfo.color,
        colorHex: colorInfo.colorHex,
        status: 'available'
      });
    }

    // 5. Calculate summary stats
    const summary = {
      totalFibers: fiberCount,
      available: fibers.filter(f => f.status === 'available').length,
      used: fibers.filter(f => f.status === 'used').length,
      live: fibers.filter(f => f.status === 'live').length,
      reserved: fibers.filter(f => f.status === 'reserved').length,
      utilizationPercent: Math.round((fibers.filter(f => f.status !== 'available').length / fiberCount) * 100)
    };

    res.json({
      cableId,
      cableIdentifier,
      fiberCount,
      summary,
      fibers
    });

  } catch (error: any) {
    console.error('[FIBER-STATUS] Error:', error);
    res.status(500).json({ error: 'Failed to get fiber status', details: error.message });
  }
});

// Get fiber status for all cables at a node
router.get('/nodes/:nodeId/fiber-status', authenticateToken, async (req: any, res) => {
  try {
    const { nodeId } = req.params;
    const organizationId = req.user.organizationId;

    // Get the node and its cables
    const nodeResult = await db
      .select()
      .from(fiberNetworkNodes)
      .where(
        and(
          eq(fiberNetworkNodes.id, parseInt(nodeId)),
          eq(fiberNetworkNodes.organizationId, organizationId)
        )
      )
      .limit(1);

    if (nodeResult.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    const node = nodeResult[0];
    const fiberDetails = (node.fiberDetails as any) || {};
    const cables = fiberDetails.cables || [];

    // For each cable, get basic status info including terminations and splices
    const cableStatuses = [];
    
    for (const cable of cables) {
      // Count terminations for this cable
      const terminationsResult = await db.execute(sql`
        SELECT COUNT(*) as count, 
               SUM(CASE WHEN is_live THEN 1 ELSE 0 END) as live_count
        FROM fiber_terminations
        WHERE organization_id = ${organizationId}
          AND cable_id = ${cable.id}
      `);

      // Count splice connections for this cable (using new varchar cable ID columns)
      const spliceResult = await db.execute(sql`
        SELECT COUNT(DISTINCT fiber_number) as splice_count
        FROM (
          SELECT left_fiber_number as fiber_number FROM fiber_connections 
          WHERE organization_id = ${organizationId} AND cable_a_id = ${cable.id}
          UNION ALL
          SELECT right_fiber_number as fiber_number FROM fiber_connections 
          WHERE organization_id = ${organizationId} AND cable_b_id = ${cable.id}
        ) splices
      `);

      const termCount = parseInt((terminationsResult.rows[0] as any)?.count || '0');
      const liveCount = parseInt((terminationsResult.rows[0] as any)?.live_count || '0');
      const spliceCount = parseInt((spliceResult.rows[0] as any)?.splice_count || '0');
      const fiberCount = cable.fiberCount || 12;
      
      // Total used = max of terminated and spliced (they may overlap)
      const totalUsed = Math.max(termCount, spliceCount);

      cableStatuses.push({
        cableId: cable.id,
        cableIdentifier: cable.cableIdentifier,
        fiberCount,
        connectedNodeId: cable.connectedNodeId,
        connectedNodeName: cable.connectedNodeName,
        direction: cable.direction || 'outgoing',
        summary: {
          totalFibers: fiberCount,
          used: totalUsed,
          live: liveCount,
          spliced: spliceCount,
          available: Math.max(0, fiberCount - totalUsed),
          utilizationPercent: Math.round((totalUsed / fiberCount) * 100)
        }
      });
    }

    res.json({
      nodeId: parseInt(nodeId),
      nodeName: node.name,
      cables: cableStatuses
    });

  } catch (error: any) {
    console.error('[FIBER-STATUS] Error getting node fiber status:', error);
    res.status(500).json({ error: 'Failed to get node fiber status', details: error.message });
  }
});

// Get fiber utilization for all cables in the organization (batch endpoint for table view)
router.get('/cables/utilization', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;

    // Get all nodes with their cables
    const nodes = await db
      .select()
      .from(fiberNetworkNodes)
      .where(eq(fiberNetworkNodes.organizationId, organizationId));

    // Collect all cables with their node info (deduplicated by cable ID)
    const cableMap = new Map<string, { id: string; fiberCount: number }>();
    for (const node of nodes) {
      const fiberDetails = (node.fiberDetails as any) || {};
      const cables = fiberDetails.cables || [];
      for (const cable of cables) {
        if (!cableMap.has(cable.id)) {
          cableMap.set(cable.id, {
            id: cable.id,
            fiberCount: cable.fiberCount || 12
          });
        }
      }
    }

    // Get termination counts for all cables in one query
    const terminationsResult = await db.execute(sql`
      SELECT cable_id, 
             COUNT(*) as term_count,
             SUM(CASE WHEN is_live THEN 1 ELSE 0 END) as live_count
      FROM fiber_terminations
      WHERE organization_id = ${organizationId}
      GROUP BY cable_id
    `);

    // Get splice connection counts for all cables (using new varchar cable ID columns)
    const spliceResult = await db.execute(sql`
      SELECT cable_id, COUNT(DISTINCT fiber_number) as splice_count
      FROM (
        SELECT cable_a_id as cable_id, left_fiber_number as fiber_number
        FROM fiber_connections 
        WHERE organization_id = ${organizationId} AND cable_a_id IS NOT NULL
        UNION ALL
        SELECT cable_b_id as cable_id, right_fiber_number as fiber_number
        FROM fiber_connections 
        WHERE organization_id = ${organizationId} AND cable_b_id IS NOT NULL
      ) splices
      GROUP BY cable_id
    `);

    // Build maps for terminations and splices
    const termMap = new Map<string, { termCount: number; liveCount: number }>();
    for (const row of terminationsResult.rows as any[]) {
      termMap.set(row.cable_id, {
        termCount: parseInt(row.term_count || '0'),
        liveCount: parseInt(row.live_count || '0')
      });
    }

    const spliceMap = new Map<string, number>();
    for (const row of spliceResult.rows as any[]) {
      spliceMap.set(row.cable_id, parseInt(row.splice_count || '0'));
    }

    // Build response with utilization for each cable
    const cableUtilization: Record<string, {
      used: number;
      live: number;
      spliced: number;
      available: number;
      utilizationPercent: number;
    }> = {};

    for (const [cableId, cable] of cableMap) {
      const term = termMap.get(cableId) || { termCount: 0, liveCount: 0 };
      const spliceCount = spliceMap.get(cableId) || 0;
      const fiberCount = cable.fiberCount;
      
      // Total used = terminated fibers + spliced fibers (may overlap, take max for safety)
      const totalUsed = Math.max(term.termCount, spliceCount);
      
      cableUtilization[cableId] = {
        used: totalUsed,
        live: term.liveCount,
        spliced: spliceCount,
        available: Math.max(0, fiberCount - totalUsed),
        utilizationPercent: Math.round((totalUsed / fiberCount) * 100)
      };
    }

    res.json({ utilization: cableUtilization });

  } catch (error: any) {
    console.error('[FIBER-STATUS] Error getting all cables utilization:', error);
    res.status(500).json({ error: 'Failed to get cables utilization', details: error.message });
  }
});

// ========================================
// SPLICE DOCUMENTATION ENDPOINTS
// ========================================

// Create a splice tray at a node
router.post('/nodes/:nodeId/splice-trays', authenticateToken, async (req: any, res) => {
  try {
    const { nodeId } = req.params;
    const organizationId = req.user.organizationId;
    const userId = req.user.id;
    
    // Extract frontend fields
    const { trayIdentifier, description, connections } = req.body;

    console.log('[SPLICE] Creating tray:', { nodeId, trayIdentifier, connectionCount: connections?.length });

    // Verify node exists and belongs to organization
    const node = await db
      .select()
      .from(fiberNetworkNodes)
      .where(
        and(
          eq(fiberNetworkNodes.id, parseInt(nodeId)),
          eq(fiberNetworkNodes.organizationId, organizationId)
        )
      )
      .limit(1);

    if (node.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Create splice tray using actual database columns (not ORM)
    // Actual table: fiber_splice_trays with columns: id, organization_id, fiber_node_id, tray_identifier, description, created_at, created_by
    const trayResult = await db.execute(sql`
      INSERT INTO fiber_splice_trays (organization_id, fiber_node_id, tray_identifier, description, created_by, created_at)
      VALUES (${organizationId}, ${parseInt(nodeId)}, ${trayIdentifier}, ${description || ''}, ${userId}, NOW())
      RETURNING *
    `);

    const tray = trayResult.rows[0];
    console.log('[SPLICE] Created tray:', tray);

    // Insert fiber connections if provided
    // Now storing both legacy integer IDs (0) and new string cable IDs for proper tracking
    let insertedConnections: any[] = [];
    if (connections && Array.isArray(connections) && connections.length > 0) {
      for (const conn of connections) {
        // Store string cable IDs in new varchar columns for proper utilization tracking
        const cableAId = conn.leftCableId || null;
        const cableBId = conn.rightCableId || null;
        
        const connResult = await db.execute(sql`
          INSERT INTO fiber_connections (
            organization_id, splice_tray_id, left_cable_id, left_fiber_number, 
            left_fiber_color, left_fiber_color_hex,
            right_cable_id, right_fiber_number,
            right_fiber_color, right_fiber_color_hex,
            cable_a_id, cable_b_id,
            created_via, created_by, created_at
          )
          VALUES (
            ${organizationId}, ${tray.id}, 0, ${conn.leftFiberNumber},
            ${conn.leftFiberColor || null}, ${conn.leftFiberColorHex || null},
            0, ${conn.rightFiberNumber},
            ${conn.rightFiberColor || null}, ${conn.rightFiberColorHex || null},
            ${cableAId}, ${cableBId},
            ${conn.createdVia || 'manual'}, ${userId}, NOW()
          )
          RETURNING *
        `);
        insertedConnections.push(connResult.rows[0]);
      }
      console.log('[SPLICE] Created connections:', insertedConnections.length);
    }

    // Log activity
    await db.insert(fiberNetworkActivityLogs).values({
      organizationId,
      userId,
      userName: req.user.fullName || req.user.email,
      actionType: 'create',
      entityType: 'splice_tray',
      entityId: parseInt(nodeId),
      changes: {
        added: {
          trayId: tray.id,
          trayIdentifier,
          connectionCount: insertedConnections.length
        }
      },
      ipAddress: req.ip
    });

    console.log('[SPLICE] Success! Tray created with', insertedConnections.length, 'connections');

    res.status(201).json({ 
      tray,
      connections: insertedConnections,
      message: `Created tray with ${insertedConnections.length} connections`
    });
  } catch (error: any) {
    console.error('Error creating splice tray:', error);
    res.status(500).json({ error: 'Failed to create splice tray', details: error.message });
  }
});

// Get all splice trays for a node
router.get('/nodes/:nodeId/splice-trays', authenticateToken, async (req: any, res) => {
  try {
    const { nodeId } = req.params;
    const organizationId = req.user.organizationId;

    console.log('[SPLICE GET] Fetching trays for node:', nodeId, 'org:', organizationId);

    // Use raw SQL matching actual database columns
    const traysResult = await db.execute(sql`
      SELECT t.*, 
             COALESCE(c.connection_count, 0) as connection_count
      FROM fiber_splice_trays t
      LEFT JOIN (
        SELECT splice_tray_id, COUNT(*) as connection_count
        FROM fiber_connections
        GROUP BY splice_tray_id
      ) c ON c.splice_tray_id = t.id
      WHERE t.fiber_node_id = ${parseInt(nodeId)}
        AND t.organization_id = ${organizationId}
      ORDER BY t.tray_identifier
    `);

    console.log('[SPLICE GET] Found trays:', traysResult.rows.length);

    // Fetch connections for each tray
    const trays = await Promise.all(traysResult.rows.map(async (row: any) => {
      const connectionsResult = await db.execute(sql`
        SELECT * FROM fiber_connections
        WHERE splice_tray_id = ${row.id}
        ORDER BY left_fiber_number
      `);

      const connections = connectionsResult.rows.map((conn: any) => ({
        id: conn.id,
        leftCableId: conn.left_cable_id,
        leftFiberNumber: conn.left_fiber_number,
        leftFiberColor: conn.left_fiber_color,
        leftFiberColorHex: conn.left_fiber_color_hex,
        rightCableId: conn.right_cable_id,
        rightFiberNumber: conn.right_fiber_number,
        rightFiberColor: conn.right_fiber_color,
        rightFiberColorHex: conn.right_fiber_color_hex,
        createdVia: conn.created_via
      }));

      return {
        id: row.id,
        organizationId: row.organization_id,
        nodeId: row.fiber_node_id,
        trayIdentifier: row.tray_identifier,
        description: row.description,
        createdAt: row.created_at,
        createdBy: row.created_by,
        connectionCount: parseInt(row.connection_count) || 0,
        connections
      };
    }));

    console.log('[SPLICE GET] Returning trays with connections:', trays.length);

    res.json({ trays });
  } catch (error: any) {
    console.error('Error fetching splice trays:', error);
    res.status(500).json({ error: 'Failed to fetch splice trays', details: error.message });
  }
});

// Update a splice tray
router.patch('/splice-trays/:trayId', authenticateToken, async (req: any, res) => {
  try {
    const { trayId } = req.params;
    const organizationId = req.user.organizationId;
    const userId = req.user.id;

    // Verify tray exists and belongs to organization
    const existing = await db
      .select()
      .from(fiberSpliceTrays)
      .where(
        and(
          eq(fiberSpliceTrays.id, parseInt(trayId)),
          eq(fiberSpliceTrays.organizationId, organizationId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Splice tray not found' });
    }

    const updateSchema = insertFiberSpliceTraySchema.partial().omit({
      organizationId: true,
      nodeId: true,
      createdBy: true
    });

    const validation = updateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.error.format() 
      });
    }

    const result = await db
      .update(fiberSpliceTrays)
      .set({
        ...validation.data,
        updatedBy: userId,
        updatedAt: new Date()
      })
      .where(eq(fiberSpliceTrays.id, parseInt(trayId)))
      .returning();

    // Log activity
    await db.insert(fiberNetworkActivityLogs).values({
      organizationId,
      userId,
      userName: req.user.fullName || req.user.email,
      actionType: 'update',
      entityType: 'splice_tray',
      entityId: existing[0].nodeId,
      changes: {
        before: existing[0],
        after: validation.data
      },
      ipAddress: req.ip
    });

    res.json({ tray: result[0] });
  } catch (error: any) {
    console.error('Error updating splice tray:', error);
    res.status(500).json({ error: 'Failed to update splice tray', details: error.message });
  }
});

// Delete a splice tray
router.delete('/splice-trays/:trayId', authenticateToken, async (req: any, res) => {
  try {
    const { trayId } = req.params;
    const organizationId = req.user.organizationId;
    const userId = req.user.id;

    // Verify tray exists and belongs to organization
    const existing = await db
      .select()
      .from(fiberSpliceTrays)
      .where(
        and(
          eq(fiberSpliceTrays.id, parseInt(trayId)),
          eq(fiberSpliceTrays.organizationId, organizationId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Splice tray not found' });
    }

    // Check if tray has connections
    const connections = await db
      .select()
      .from(fiberConnections)
      .where(
        and(
          eq(fiberConnections.trayId, parseInt(trayId)),
          eq(fiberConnections.isDeleted, false)
        )
      )
      .limit(1);

    if (connections.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete tray with existing connections. Delete connections first.' 
      });
    }

    // Delete tray (cascade will handle connections)
    await db
      .delete(fiberSpliceTrays)
      .where(eq(fiberSpliceTrays.id, parseInt(trayId)));

    // Log activity
    await db.insert(fiberNetworkActivityLogs).values({
      organizationId,
      userId,
      userName: req.user.fullName || req.user.email,
      actionType: 'delete',
      entityType: 'splice_tray',
      entityId: existing[0].nodeId,
      changes: {
        before: existing[0]
      },
      ipAddress: req.ip
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting splice tray:', error);
    res.status(500).json({ error: 'Failed to delete splice tray', details: error.message });
  }
});

// Create splice connections (manual entry)
router.post('/splice-connections/manual', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const userId = req.user.id;
    const { trayId, connections, workItemId } = req.body;

    // Verify tray exists
    const tray = await db
      .select()
      .from(fiberSpliceTrays)
      .where(
        and(
          eq(fiberSpliceTrays.id, trayId),
          eq(fiberSpliceTrays.organizationId, organizationId)
        )
      )
      .limit(1);

    if (tray.length === 0) {
      return res.status(404).json({ error: 'Splice tray not found' });
    }

    // Validate connections array
    if (!Array.isArray(connections) || connections.length === 0) {
      return res.status(400).json({ error: 'Connections array required' });
    }

    // Insert all connections
    const createdConnections = [];
    for (const conn of connections) {
      const validation = insertFiberConnectionSchema.omit({
        organizationId: true,
        createdByUserId: true,
        createdAt: true,
        updatedAt: true
      }).safeParse({
        ...conn,
        trayId,
        nodeId: tray[0].nodeId,
        workItemId: workItemId || null,
        createdVia: 'manual',
        isDeleted: false
      });

      if (!validation.success) {
        return res.status(400).json({ 
          error: 'Connection validation failed', 
          details: validation.error.format() 
        });
      }

      const result = await db
        .insert(fiberConnections)
        .values({
          ...validation.data,
          organizationId,
          createdByUserId: userId
        })
        .returning();

      createdConnections.push(result[0]);
    }

    // Log activity
    await db.insert(fiberNetworkActivityLogs).values({
      organizationId,
      userId,
      userName: req.user.fullName || req.user.email,
      actionType: 'create',
      entityType: 'splice_connections',
      entityId: tray[0].nodeId,
      changes: {
        added: {
          trayId,
          connectionCount: connections.length,
          workItemId: workItemId || null
        }
      },
      workItemId: workItemId || null,
      ipAddress: req.ip
    });

    res.status(201).json({ connections: createdConnections });
  } catch (error: any) {
    console.error('Error creating splice connections:', error);
    res.status(500).json({ error: 'Failed to create splice connections', details: error.message });
  }
});

// Get splice connections for a node
router.get('/nodes/:nodeId/splice-connections', authenticateToken, async (req: any, res) => {
  try {
    const { nodeId } = req.params;
    const organizationId = req.user.organizationId;

    const connections = await db
      .select()
      .from(fiberConnections)
      .where(
        and(
          eq(fiberConnections.nodeId, parseInt(nodeId)),
          eq(fiberConnections.organizationId, organizationId),
          eq(fiberConnections.isDeleted, false)
        )
      )
      .orderBy(fiberConnections.createdAt);

    res.json({ connections });
  } catch (error: any) {
    console.error('Error fetching splice connections:', error);
    res.status(500).json({ error: 'Failed to fetch splice connections', details: error.message });
  }
});

// Get splice connections for a tray
router.get('/splice-trays/:trayId/connections', authenticateToken, async (req: any, res) => {
  try {
    const { trayId } = req.params;
    const organizationId = req.user.organizationId;

    // Verify tray exists
    const tray = await db
      .select()
      .from(fiberSpliceTrays)
      .where(
        and(
          eq(fiberSpliceTrays.id, parseInt(trayId)),
          eq(fiberSpliceTrays.organizationId, organizationId)
        )
      )
      .limit(1);

    if (tray.length === 0) {
      return res.status(404).json({ error: 'Splice tray not found' });
    }

    const connections = await db
      .select()
      .from(fiberConnections)
      .where(
        and(
          eq(fiberConnections.trayId, parseInt(trayId)),
          eq(fiberConnections.isDeleted, false)
        )
      )
      .orderBy(fiberConnections.cableAId, fiberConnections.cableAFiberNumber);

    res.json({ connections });
  } catch (error: any) {
    console.error('Error fetching tray connections:', error);
    res.status(500).json({ error: 'Failed to fetch tray connections', details: error.message });
  }
});

// Delete a splice connection (soft delete)
router.delete('/splice-connections/:connectionId', authenticateToken, async (req: any, res) => {
  try {
    const { connectionId } = req.params;
    const organizationId = req.user.organizationId;
    const userId = req.user.id;

    // Verify connection exists
    const existing = await db
      .select()
      .from(fiberConnections)
      .where(
        and(
          eq(fiberConnections.id, parseInt(connectionId)),
          eq(fiberConnections.organizationId, organizationId),
          eq(fiberConnections.isDeleted, false)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Soft delete
    await db
      .update(fiberConnections)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedByUserId: userId
      })
      .where(eq(fiberConnections.id, parseInt(connectionId)));

    // Log activity
    await db.insert(fiberNetworkActivityLogs).values({
      organizationId,
      userId,
      userName: req.user.fullName || req.user.email,
      actionType: 'delete',
      entityType: 'splice_connection',
      entityId: existing[0].nodeId,
      changes: {
        before: existing[0]
      },
      ipAddress: req.ip
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting splice connection:', error);
    res.status(500).json({ error: 'Failed to delete splice connection', details: error.message });
  }
});

// ========================================
// CABLE FIBER DEFINITION ENDPOINTS
// ========================================

// Create or update cable fiber definition
router.post('/cables/:cableId/fiber-definition', authenticateToken, async (req: any, res) => {
  try {
    const { cableId } = req.params;
    const organizationId = req.user.organizationId;
    const userId = req.user.id;
    const { nodeId, fiberCount, cableType, bufferTubeCount, fibersPerTube } = req.body;

    // Generate color scheme based on fiber count
    const colorScheme = generateFiberColorScheme(fiberCount, cableType || 'single_mode');

    // Check if definition already exists
    const existing = await db
      .select()
      .from(cableFiberDefinitions)
      .where(
        and(
          eq(cableFiberDefinitions.cableId, cableId),
          eq(cableFiberDefinitions.nodeId, nodeId),
          eq(cableFiberDefinitions.organizationId, organizationId)
        )
      )
      .limit(1);

    let result;
    if (existing.length > 0) {
      // Update existing
      result = await db
        .update(cableFiberDefinitions)
        .set({
          fiberCount,
          cableType: cableType || 'single_mode',
          bufferTubeCount,
          fibersPerTube,
          colorScheme,
          updatedAt: new Date()
        })
        .where(eq(cableFiberDefinitions.id, existing[0].id))
        .returning();
    } else {
      // Create new
      result = await db
        .insert(cableFiberDefinitions)
        .values({
          organizationId,
          cableId,
          nodeId,
          fiberCount,
          cableType: cableType || 'single_mode',
          bufferTubeCount,
          fibersPerTube,
          colorScheme,
          createdBy: userId
        })
        .returning();
    }

    res.status(201).json({ definition: result[0] });
  } catch (error: any) {
    console.error('Error creating cable fiber definition:', error);
    res.status(500).json({ error: 'Failed to create cable fiber definition', details: error.message });
  }
});

// Get cable fiber definition
router.get('/cables/:cableId/fiber-definition', authenticateToken, async (req: any, res) => {
  try {
    const { cableId } = req.params;
    const { nodeId } = req.query;
    const organizationId = req.user.organizationId;

    const definition = await db
      .select()
      .from(cableFiberDefinitions)
      .where(
        and(
          eq(cableFiberDefinitions.cableId, cableId),
          nodeId ? eq(cableFiberDefinitions.nodeId, parseInt(nodeId as string)) : sql`true`,
          eq(cableFiberDefinitions.organizationId, organizationId)
        )
      )
      .limit(1);

    if (definition.length === 0) {
      return res.status(404).json({ error: 'Cable fiber definition not found' });
    }

    res.json({ definition: definition[0] });
  } catch (error: any) {
    console.error('Error fetching cable fiber definition:', error);
    res.status(500).json({ error: 'Failed to fetch cable fiber definition', details: error.message });
  }
});

export default router;
