import { Router } from 'express';
import { db } from '../db';
import { fiberNetworkNodes, fiberNetworkActivityLogs, workItems, insertFiberNetworkNodeSchema } from '../../shared/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
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
    const { name, status, what3words, address, notes, photos, fiberDetails } = req.body;
    
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
      actionType: 'delete',
      entityType: 'fiber_node',
      entityId: nodeId,
      changes: { deleted: existingNode[0] },
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

export default router;
