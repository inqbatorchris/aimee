import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../auth';
import { Request, Response } from 'express';
import { storage } from '../storage';
import { 
  type WorkItem,
  type InsertWorkItem
} from '@shared/schema';
import { eq, and, or, gte, lte, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from '../db';
import { workItems, checkInCycles, checkInMeetings, users, keyResultTasks, teams, keyResults, objectives, knowledgeDocumentAttachments, knowledgeDocuments, workItemWorkflowExecutions, workItemWorkflowExecutionSteps, workItemSources, addresses } from '@shared/schema';

const router = Router();

// Schema for creating work item
const createWorkItemSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['Planning', 'Ready', 'In Progress', 'Stuck', 'Completed', 'Archived']).default('Planning'),
  dueDate: z.string().optional(),
  assignedTo: z.number().optional(),
  assigneeId: z.number().nullable().optional(),
  attachments: z.array(z.any()).default([]),
  checkInCycleId: z.number().optional().nullable(),
  checkInMeetingId: z.number().optional().nullable(),
  keyResultTaskId: z.number().optional().nullable(),
  teamId: z.number().optional().nullable(),
  workflowTemplateId: z.string().optional(),
  workItemType: z.string().optional(),
  workflowSource: z.enum(['template', 'manual', 'system', 'splynx', 'airtable', 'vapi_voice_ai']).optional(),
  workflowMetadata: z.any().optional(),
});

// Schema for updating work item
const updateWorkItemSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['Planning', 'Ready', 'In Progress', 'Stuck', 'Completed', 'Archived']).optional(),
  dueDate: z.string().nullable().optional(),
  assignedTo: z.number().nullable().optional(),
  attachments: z.array(z.any()).optional(),
  checkInCycleId: z.number().nullable().optional(),
  keyResultTaskId: z.number().nullable().optional(),
  targetMeetingId: z.number().nullable().optional(),
  teamId: z.number().nullable().optional(),
  workflowTemplateId: z.string().nullable().optional(),
  workItemType: z.string().nullable().optional(),
  workflowSource: z.enum(['template', 'manual', 'system', 'splynx', 'airtable', 'vapi_voice_ai']).nullable().optional(),
  workflowMetadata: z.any().optional(),
});

// Schema for bulk update
const bulkUpdateSchema = z.object({
  ids: z.array(z.number()).min(1),
  set: z.object({
    checkInCycleId: z.union([z.number(), z.null()]).optional(),
    status: z.enum(['Planning', 'Ready', 'In Progress', 'Stuck', 'Completed', 'Archived']).optional(),
    assignedTo: z.number().optional().nullable(),
    dueDate: z.string().optional().nullable(),
    teamId: z.union([z.number(), z.null()]).optional(),
    workflowTemplateId: z.string().nullable().optional(),
    workItemType: z.string().nullable().optional(),
    workflowSource: z.enum(['template', 'manual', 'system', 'splynx', 'airtable', 'vapi_voice_ai']).nullable().optional(),
    workflowMetadata: z.any().optional(),
  })
});

// GET /work-items - List work items with filters
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;
    
    // Parse query parameters
    const {
      status,
      origin,
      assigneeId,
      assignedTo, // Support both assigneeId and assignedTo for backwards compatibility
      ownerId,
      dueFrom,
      dueTo,
      inCycle,
      checkInCycleId,
      excludeCycleId,
      teamId,
      targetMeetingId,
      keyResultTaskId,
      workItemType,
      workflowTemplateId,
      fiberNodeId, // NEW: Filter by linked fiber network node
      page = '1',
      pageSize = '50'
    } = req.query;
    
    // Build where conditions
    const conditions = [eq(workItems.organizationId, organizationId)];
    
    // Status filter (can be array)
    if (status) {
      const statuses = Array.isArray(status) ? status : status.toString().split(',');
      conditions.push(inArray(workItems.status, statuses as any));
    }
    
    // Origin filter
    if (origin === 'Ad-hoc') {
      conditions.push(isNull(workItems.keyResultTaskId));
    } else if (origin === 'KR Task') {
      conditions.push(isNotNull(workItems.keyResultTaskId));
    }
    
    // Assignee filter - support both assigneeId and assignedTo parameter names
    const assigneeFilter = assigneeId || assignedTo;
    if (assigneeFilter) {
      conditions.push(eq(workItems.assignedTo, parseInt(assigneeFilter as string)));
    }
    
    // Owner filter
    if (ownerId) {
      conditions.push(eq(workItems.ownerId, parseInt(ownerId as string)));
    }
    
    // Due date range
    if (dueFrom) {
      conditions.push(gte(workItems.dueDate, dueFrom as string));
    }
    if (dueTo) {
      conditions.push(lte(workItems.dueDate, dueTo as string));
    }
    
    // In cycle filter
    if (inCycle === 'true') {
      conditions.push(isNotNull(workItems.checkInCycleId));
    } else if (inCycle === 'false') {
      conditions.push(isNull(workItems.checkInCycleId));
    }
    
    // Specific cycle filter (supports 'null' string for backlog)
    if (checkInCycleId === 'null') {
      conditions.push(isNull(workItems.checkInCycleId));
    } else if (checkInCycleId) {
      conditions.push(eq(workItems.checkInCycleId, parseInt(checkInCycleId as string)));
    }
    
    // Exclude specific cycle (for "available to add" queries)
    if (excludeCycleId) {
      const excludeId = parseInt(excludeCycleId as string);
      if (!isNaN(excludeId)) {
        conditions.push(or(
          isNull(workItems.checkInCycleId),
          sql`${workItems.checkInCycleId} != ${excludeId}`
        )!);
      }
    }
    
    // Target meeting filter (for check-in meetings functionality)
    if (targetMeetingId === 'null') {
      conditions.push(isNull(workItems.targetMeetingId));
    } else if (targetMeetingId) {
      conditions.push(eq(workItems.targetMeetingId, parseInt(targetMeetingId as string)));
    }
    
    // Key Result Task filter (for task detail panel)
    if (keyResultTaskId) {
      conditions.push(eq(workItems.keyResultTaskId, parseInt(keyResultTaskId as string)));
    }
    
    // Team filter - work items can belong to teams via direct teamId or relationships
    if (teamId) {
      const teamIdInt = parseInt(teamId as string);
      if (!isNaN(teamIdInt)) {
        // Work items belong to a team if:
        // 1. They have a direct teamId, OR
        // 2. They're linked to a checkInCycle that belongs to the team, OR  
        // 3. They're linked to a checkInMeeting that belongs to the team
        const teamFilter = or(
          eq(workItems.teamId, teamIdInt),
          sql`EXISTS (
            SELECT 1 FROM ${checkInCycles} 
            WHERE ${checkInCycles.id} = ${workItems.checkInCycleId} 
            AND ${checkInCycles.teamId} = ${teamIdInt}
          )`,
          sql`EXISTS (
            SELECT 1 FROM ${checkInMeetings} 
            WHERE ${checkInMeetings.id} = ${workItems.targetMeetingId} 
            AND ${checkInMeetings.teamId} = ${teamIdInt}
          )`
        )!;
        conditions.push(teamFilter);
      }
    }
    
    // Work item type filter (for template-based filtering)
    // Match on either workItemType OR workflowTemplateId to catch both new and legacy items
    if (workItemType) {
      conditions.push(or(
        eq(workItems.workItemType, workItemType as string),
        eq(workItems.workflowTemplateId, workItemType as string)
      )!);
    }
    
    // Workflow template filter
    if (workflowTemplateId === 'none') {
      // Filter for work items without a workflow template
      conditions.push(isNull(workItems.workflowTemplateId));
    } else if (workflowTemplateId) {
      // Filter for work items with a specific workflow template
      conditions.push(eq(workItems.workflowTemplateId, workflowTemplateId as string));
    }
    
    // Fiber Node ID filter - Query JSONB workflowMetadata field
    if (fiberNodeId) {
      const nodeId = parseInt(fiberNodeId as string);
      if (!isNaN(nodeId)) {
        conditions.push(
          sql`${workItems.workflowMetadata}->>'fiberNodeId' = ${nodeId.toString()}`
        );
      }
    }
    
    // Pagination
    const limit = parseInt(pageSize as string);
    const offset = (parseInt(page as string) - 1) * limit;
    
    // Query with joins for related data
    const items = await db
      .select({
        workItem: workItems,
        assignee: {
          id: users.id,
          fullName: users.fullName,
          email: users.email
        },
        keyResultTask: {
          id: keyResultTasks.id,
          title: keyResultTasks.title,
          keyResultId: keyResultTasks.keyResultId
        },
        checkInCycle: {
          id: checkInCycles.id,
          status: checkInCycles.status,
          startDate: checkInCycles.startDate,
          endDate: checkInCycles.endDate
        },
        targetMeeting: {
          id: checkInMeetings.id,
          scheduledDate: checkInMeetings.scheduledDate,
          status: checkInMeetings.status,
          teamId: checkInMeetings.teamId
        },
        team: {
          id: teams.id,
          name: teams.name
        }
      })
      .from(workItems)
      .leftJoin(users, eq(workItems.assignedTo, users.id))
      .leftJoin(keyResultTasks, eq(workItems.keyResultTaskId, keyResultTasks.id))
      .leftJoin(checkInCycles, eq(workItems.checkInCycleId, checkInCycles.id))
      .leftJoin(checkInMeetings, eq(workItems.targetMeetingId, checkInMeetings.id))
      .leftJoin(teams, eq(workItems.teamId, teams.id))
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
      .orderBy(workItems.updatedAt);
    
    // Format response
    const formattedItems = items.map(item => ({
      ...item.workItem,
      assignee: item.assignee?.id ? item.assignee : null,
      keyResultTask: item.keyResultTask?.id ? item.keyResultTask : null,
      checkInCycle: item.checkInCycle?.id ? item.checkInCycle : null,
      targetMeeting: item.targetMeeting?.id ? item.targetMeeting : null,
      team: item.team?.id ? item.team : null
    }));
    
    res.json(formattedItems);
  } catch (error) {
    console.error('Error fetching work items:', error);
    res.status(500).json({ error: 'Failed to fetch work items' });
  }
});

// GET /check-in-cycles - Get check-in cycles for dropdowns
router.get('/check-in-cycles', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;
    const { status } = req.query;
    
    let cycles = await storage.getCheckInCycles(organizationId);
    
    // Filter by status if provided (e.g., 'Planning,In Progress')
    if (status) {
      const statusFilters = (status as string).split(',').map(s => s.trim());
      cycles = cycles.filter(cycle => statusFilters.includes(cycle.status));
    }
    
    res.json(cycles);
  } catch (error) {
    console.error('Error fetching check-in cycles:', error);
    res.status(500).json({ error: 'Failed to fetch check-in cycles' });
  }
});

// GET /users - Get active users for assignment
router.get('/users', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;
    const { active } = req.query;
    
    const conditions = [eq(users.organizationId, organizationId)];
    
    if (active === 'true') {
      conditions.push(eq(users.isActive, true));
    }
    
    const userList = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(users.fullName);
    
    res.json(userList);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /team/:teamId - Get all work items for a team
router.get('/team/:teamId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;
    const teamId = parseInt(req.params.teamId);
    
    // Get all work items for the team with assignee info
    const items = await db
      .select({
        workItem: workItems,
        assignee: {
          id: users.id,
          fullName: users.fullName,
          email: users.email
        }
      })
      .from(workItems)
      .leftJoin(users, eq(workItems.assignedTo, users.id))
      .where(
        and(
          eq(workItems.organizationId, organizationId),
          eq(workItems.teamId, teamId)
        )
      )
      .orderBy(workItems.createdAt);
    
    // Format response
    const formattedItems = items.map(item => ({
      ...item.workItem,
      assignee: item.assignee?.id ? item.assignee : null
    }));
    
    res.json(formattedItems);
  } catch (error) {
    console.error('Error fetching team work items:', error);
    res.status(500).json({ error: 'Failed to fetch team work items' });
  }
});

// GET /work-items/recurring-tasks - Get recurring tasks with metadata for manual generation
router.get('/recurring-tasks', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' });
    }
    
    const tasks = await storage.getRecurringTasksWithMetadata(organizationId);
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching recurring tasks:', error);
    res.status(500).json({ error: 'Failed to fetch recurring tasks' });
  }
});

// POST /work-items/generate-manual - Manually generate work items from recurring tasks
const generateManualSchema = z.object({
  taskIds: z.array(z.number()).min(1, 'At least one task must be selected')
});

router.post('/generate-manual', authenticateToken, async (req: Request, res: Response) => {
  try {
    console.log('[GenerateManual] Endpoint hit with body:', req.body);
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;
    
    if (!organizationId || !userId) {
      console.log('[GenerateManual] Unauthorized - no org or user');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Validate request
    const data = generateManualSchema.parse(req.body);
    console.log('[GenerateManual] Validated data:', data);
    
    // Import workItemGenerator
    const { workItemGenerator } = await import('../services/workItemGenerator.js');
    
    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
      items: [] as any[]
    };
    
    // Process each task
    for (const taskId of data.taskIds) {
      try {
        // Verify task belongs to organization
        const task = await storage.getKeyResultTask(taskId);
        if (!task || task.organizationId !== organizationId) {
          results.errors.push(`Task ${taskId} not found or access denied`);
          continue;
        }
        
        if (!task.isRecurring) {
          results.errors.push(`Task ${taskId} is not a recurring task`);
          continue;
        }
        
        // Generate work item
        const workItem = await workItemGenerator.generateNextRecurringWorkItem(task);
        
        if (workItem) {
          results.created++;
          results.items.push({
            taskId,
            workItemId: workItem.id,
            status: 'created'
          });
        } else {
          results.skipped++;
          results.items.push({
            taskId,
            status: 'skipped',
            reason: 'Work item already exists or task limit reached'
          });
        }
      } catch (error: any) {
        console.error(`Error generating work item for task ${taskId}:`, error);
        results.errors.push(`Task ${taskId}: ${error.message}`);
      }
    }
    
    // Log activity
    if (results.created > 0) {
      await storage.logActivity({
        organizationId,
        userId,
        actionType: 'creation',
        entityType: 'work_item',
        entityId: 0,
        description: `Manually generated ${results.created} work items from recurring tasks`,
        metadata: {
          source: 'manual',
          taskIds: data.taskIds,
          created: results.created,
          skipped: results.skipped,
          errors: results.errors.length
        }
      });
    }
    
    console.log('[GenerateManual] Sending response:', results);
    res.json(results);
  } catch (error) {
    console.error('[GenerateManual] Error generating work items:', error);
    res.status(500).json({ error: 'Failed to generate work items' });
  }
});

// GET /work-items/:id - Get single work item
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const workItemId = parseInt(req.params.id);
    if (isNaN(workItemId)) {
      return res.status(400).json({ error: 'Invalid work item ID' });
    }
    const organizationId = req.user?.organizationId || 3;
    
    // Query with joins for related data
    const items = await db
      .select({
        workItem: workItems,
        assignee: {
          id: users.id,
          fullName: users.fullName,
          email: users.email
        },
        keyResultTask: {
          id: keyResultTasks.id,
          title: keyResultTasks.title,
          keyResultId: keyResultTasks.keyResultId
        },
        checkInCycle: {
          id: checkInCycles.id,
          status: checkInCycles.status,
          startDate: checkInCycles.startDate,
          endDate: checkInCycles.endDate
        },
        targetMeeting: {
          id: checkInMeetings.id,
          scheduledDate: checkInMeetings.scheduledDate,
          status: checkInMeetings.status,
          teamId: checkInMeetings.teamId
        },
        team: {
          id: teams.id,
          name: teams.name
        }
      })
      .from(workItems)
      .leftJoin(users, eq(workItems.assignedTo, users.id))
      .leftJoin(keyResultTasks, eq(workItems.keyResultTaskId, keyResultTasks.id))
      .leftJoin(checkInCycles, eq(workItems.checkInCycleId, checkInCycles.id))
      .leftJoin(checkInMeetings, eq(workItems.targetMeetingId, checkInMeetings.id))
      .leftJoin(teams, eq(workItems.teamId, teams.id))
      .where(
        and(
          eq(workItems.id, workItemId),
          eq(workItems.organizationId, organizationId)
        )
      )
      .limit(1);
    
    if (items.length === 0) {
      return res.status(404).json({ error: 'Work item not found' });
    }
    
    const item = items[0];
    const formattedItem = {
      ...item.workItem,
      assignee: item.assignee?.id ? item.assignee : null,
      keyResultTask: item.keyResultTask?.id ? item.keyResultTask : null,
      checkInCycle: item.checkInCycle?.id ? item.checkInCycle : null,
      targetMeeting: item.targetMeeting?.id ? item.targetMeeting : null,
      team: item.team?.id ? item.team : null
    };
    
    res.json(formattedItem);
  } catch (error) {
    console.error('Error fetching work item:', error);
    res.status(500).json({ error: 'Failed to fetch work item' });
  }
});

// POST /work-items - Create work item
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const data = createWorkItemSchema.parse(req.body);
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    
    
    const workItem = await storage.createWorkItem({
      organizationId,
      title: data.title,
      description: data.description,
      status: data.status,
      dueDate: data.dueDate || null,
      assignedTo: data.assignedTo || data.assigneeId,
      attachments: data.attachments,
      checkInCycleId: data.checkInCycleId,
      targetMeetingId: data.checkInMeetingId,
      keyResultTaskId: data.keyResultTaskId,
      teamId: data.teamId,
      ownerId: userId,
      createdBy: userId,
      workflowTemplateId: data.workflowTemplateId || null,
      workItemType: data.workItemType || null,
      workflowSource: data.workflowSource || null,
      workflowMetadata: data.workflowMetadata || null,
    });
    
    // Log activity
    await storage.logActivity({
      organizationId,
      userId,
      actionType: 'creation',
      entityType: 'work_item',
      entityId: workItem.id,
      description: `Created work item "${data.title}"`,
      metadata: { title: data.title, status: data.status }
    });
    
    // If this work item is associated with an address record, link it
    const metadata = data.workflowMetadata as any;
    if (metadata?.addressRecordId) {
      const addressRecordId = parseInt(metadata.addressRecordId);
      
      await storage.logActivity({
        organizationId,
        userId,
        actionType: 'creation',
        entityType: 'address',
        entityId: addressRecordId,
        description: `Work item "${data.title}" added to address`,
        metadata: { workItemId: workItem.id, title: data.title, status: data.status }
      });
      
      // Create work_item_source record to link work item to address_records table
      await db.insert(workItemSources).values({
        organizationId,
        workItemId: workItem.id,
        sourceTable: 'address_records',
        sourceId: addressRecordId
      });
      
      console.log(`[Work Item Creation] Linked work item ${workItem.id} to address_records ${addressRecordId}`);
    }
    
    // Auto-initialize workflow execution if template is assigned
    if (data.workflowTemplateId) {
      try {
        await workItemWorkflowService.startWorkflowExecution({
          workItemId: workItem.id,
          organizationId,
          userId
        });
      } catch (error) {
        console.error('Failed to initialize workflow execution:', error);
        // Don't fail the work item creation if workflow init fails
      }
    }
    
    res.status(201).json(workItem);
  } catch (error) {
    console.error('Error creating work item:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create work item' });
  }
});

// PATCH /work-items/bulk - Bulk update work items (moved before :id route to fix route matching)
router.patch('/bulk', authenticateToken, async (req: Request, res: Response) => {
  console.log('📦 Bulk update endpoint hit with data:', req.body);
  try {
    const data = bulkUpdateSchema.parse(req.body);
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    
    // Update all work items
    const updateData: any = {};
    if (data.set.checkInCycleId !== undefined) {
      updateData.checkInCycleId = data.set.checkInCycleId;
    }
    if (data.set.status !== undefined) {
      updateData.status = data.set.status;
    }
    if (data.set.assignedTo !== undefined) {
      updateData.assignedTo = data.set.assignedTo;
    }
    if (data.set.dueDate !== undefined) {
      updateData.dueDate = data.set.dueDate || null;
    }
    if (data.set.teamId !== undefined) {
      updateData.teamId = data.set.teamId;
    }
    if (data.set.workflowTemplateId !== undefined) {
      updateData.workflowTemplateId = data.set.workflowTemplateId;
    }
    if (data.set.workItemType !== undefined) {
      updateData.workItemType = data.set.workItemType;
    }
    if (data.set.workflowSource !== undefined) {
      updateData.workflowSource = data.set.workflowSource;
    }
    if (data.set.workflowMetadata !== undefined) {
      updateData.workflowMetadata = data.set.workflowMetadata;
    }
    
    updateData.updatedAt = new Date();
    
    const result = await db.update(workItems)
      .set(updateData)
      .where(and(
        inArray(workItems.id, data.ids),
        eq(workItems.organizationId, organizationId)
      ))
      .returning();
    
    // Log bulk activity
    await storage.logActivity({
      organizationId,
      userId,
      actionType: 'bulk_update' as any,
      entityType: 'work_item',
      entityId: data.ids[0], // Use first ID as reference
      description: `Bulk updated ${data.ids.length} work items`,
      metadata: { 
        workItemIds: data.ids,
        updates: data.set,
        affectedCount: result.length
      }
    });
    
    res.json({ 
      updated: result.length
    });
  } catch (error) {
    console.error('Error bulk updating work items:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to bulk update work items' });
  }
});

// PATCH /work-items/:id - Update work item
router.patch('/:id', authenticateToken, async (req: Request, res: Response) => {
  console.log('🔄 Single update endpoint hit with ID:', req.params.id, 'Body:', req.body);
  try {
    const workItemId = parseInt(req.params.id);
    if (isNaN(workItemId)) {
      console.error('❌ Invalid work item ID:', req.params.id);
      return res.status(400).json({ error: 'Invalid work item ID' });
    }
    const data = updateWorkItemSchema.parse(req.body);
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    
    // Get existing work item
    const existing = await storage.getWorkItem(workItemId);
    if (!existing) {
      return res.status(404).json({ error: 'Work item not found' });
    }
    
    console.log('[Workflow Protection] Checking conditions:', {
      hasIncomingStatus: !!data.status,
      incomingStatus: data.status,
      isNotCompleted: data.status !== 'Completed',
      hasWorkflowTemplate: !!existing.workflowTemplateId,
      workflowTemplateId: existing.workflowTemplateId
    });
    
    // Check if all workflow steps are completed - if so, preserve Completed status
    if (data.status && data.status !== 'Completed' && existing.workflowTemplateId) {
      const steps = await db
        .select()
        .from(workItemWorkflowExecutionSteps)
        .where(eq(workItemWorkflowExecutionSteps.workItemId, workItemId));
      
      if (steps.length > 0) {
        const allCompleted = steps.every(step => step.status === 'completed');
        if (allCompleted) {
          console.log(`[Workflow] Preserving 'Completed' status - all ${steps.length} workflow steps are completed`);
          data.status = 'Completed';
        }
      }
    }
    
    // Validate KR task exists if provided
    if (data.keyResultTaskId) {
      const krTaskExists = await db
        .select({ id: keyResultTasks.id })
        .from(keyResultTasks)
        .where(eq(keyResultTasks.id, data.keyResultTaskId))
        .limit(1);
      
      if (krTaskExists.length === 0) {
        console.error('❌ KR task not found:', data.keyResultTaskId);
        return res.status(400).json({ 
          error: 'Invalid Key Result task', 
          details: 'The selected Key Result task does not exist. Please select a valid task or unlink the current one.' 
        });
      }
    }
    
    const updated = await storage.updateWorkItem(workItemId, {
      ...data,
      dueDate: data.dueDate || undefined,
    });
    
    if (!updated) {
      return res.status(404).json({ error: 'Work item not found' });
    }
    
    // Log activity for significant changes
    if (data.status && data.status !== existing.status) {
      await storage.logActivity({
        organizationId,
        userId,
        actionType: 'status_change',
        entityType: 'work_item',
        entityId: workItemId,
        description: `Changed status from "${existing.status}" to "${data.status}"`,
        metadata: { oldStatus: existing.status, newStatus: data.status, taskId: existing.keyResultTaskId }
      });
      
      // If this work item is associated with an address, also log status change for the address
      const metadata = existing.workflowMetadata as any;
      if (metadata?.addressRecordId) {
        await storage.logActivity({
          organizationId,
          userId,
          actionType: 'status_change',
          entityType: 'address',
          entityId: parseInt(metadata.addressRecordId),
          description: `Work item "${existing.title}" status changed to "${data.status}"`,
          metadata: { workItemId, oldStatus: existing.status, newStatus: data.status, workItemTitle: existing.title }
        });
      }
      
      // Handle completion for recurring tasks
      if (data.status === 'Completed' && existing.status !== 'Completed' && existing.keyResultTaskId) {
        const { workItemGenerator } = await import('../services/workItemGenerator.js');
        await workItemGenerator.handleWorkItemCompletion(workItemId, userId);
      }
      
      // Auto-sync task status from work item status (one-off tasks only)
      if (existing.keyResultTaskId) {
        const parentTask = await storage.getKeyResultTask(existing.keyResultTaskId);
        
        // Only sync status for ONE-OFF tasks (recurring tasks have multiple work items)
        if (parentTask && !parentTask.isRecurring) {
          // Map work item status to task status
          const statusMap: Record<string, string> = {
            'Planning': 'Not Started',
            'Ready': 'Not Started',
            'In Progress': 'On Track',
            'Stuck': 'Stuck',
            'Completed': 'Completed'
            // 'Archived' - don't change task status
          };
          
          const newTaskStatus = statusMap[data.status];
          
          if (newTaskStatus && newTaskStatus !== parentTask.status) {
            await storage.updateKeyResultTask(existing.keyResultTaskId, {
              status: newTaskStatus as any
            });
            
            // Log the automatic status sync
            await storage.logActivity({
              organizationId,
              userId,
              actionType: 'status_change',
              entityType: 'key_result_task',
              entityId: existing.keyResultTaskId,
              description: `Auto-synced from work item: ${newTaskStatus}`,
              metadata: { 
                workItemId, 
                workItemStatus: data.status,
                oldTaskStatus: parentTask.status,
                newTaskStatus
              }
            });
          }
        }
      }
    }
    
    // Auto-sync due date from work item to task (one-off tasks only)
    if ('dueDate' in data && existing.keyResultTaskId) {
      const parentTask = await storage.getKeyResultTask(existing.keyResultTaskId);
      
      // Only sync due date for ONE-OFF tasks (recurring tasks have multiple work items)
      if (parentTask && !parentTask.isRecurring) {
        const newDueDate = data.dueDate || null;
        const oldTargetCompletion = parentTask.targetCompletion;
        
        // Only update if the due dates are different
        const datesAreDifferent = 
          (newDueDate === null && oldTargetCompletion !== null) ||
          (newDueDate !== null && oldTargetCompletion === null) ||
          (newDueDate !== null && oldTargetCompletion !== null && 
           new Date(newDueDate).toISOString().split('T')[0] !== new Date(oldTargetCompletion).toISOString().split('T')[0]);
        
        if (datesAreDifferent) {
          await storage.updateKeyResultTask(existing.keyResultTaskId, {
            targetCompletion: newDueDate ? new Date(newDueDate) : null
          });
          
          // Log the automatic due date sync
          await storage.logActivity({
            organizationId,
            userId,
            actionType: 'agent_action',
            entityType: 'key_result_task',
            entityId: existing.keyResultTaskId,
            description: `Auto-synced target completion date from work item`,
            metadata: { 
              workItemId, 
              oldTargetCompletion,
              newTargetCompletion: newDueDate
            }
          });
        }
      }
    }
    
    if (data.assignedTo && data.assignedTo !== existing.assignedTo) {
      await storage.logActivity({
        organizationId,
        userId,
        actionType: 'assignment',
        entityType: 'work_item',
        entityId: workItemId,
        description: `Reassigned work item`,
        metadata: { 
          oldAssignee: existing.assignedTo, 
          newAssignee: data.assignedTo,
          taskId: existing.keyResultTaskId
        }
      });
      
      // Also log to parent task if linked
      if (existing.keyResultTaskId) {
        await storage.logActivity({
          organizationId,
          userId,
          actionType: 'assignment',
          entityType: 'key_result_task',
          entityId: existing.keyResultTaskId,
          description: `Work item reassigned`,
          metadata: { 
            workItemId,
            workItemTitle: existing.title,
            oldAssignee: existing.assignedTo, 
            newAssignee: data.assignedTo
          }
        });
      }
    }
    
    if (data.keyResultTaskId !== undefined && data.keyResultTaskId !== existing.keyResultTaskId) {
      const action = data.keyResultTaskId ? 'link' : 'unlink';
      await storage.logActivity({
        organizationId,
        userId,
        actionType: action as any,
        entityType: 'work_item',
        entityId: workItemId,
        description: `${action === 'link' ? 'Linked' : 'Unlinked'} work item`,
        metadata: { 
          keyResultTaskId: data.keyResultTaskId,
          previousKeyResultTaskId: existing.keyResultTaskId
        }
      });
      
      // Log to the task being linked TO (if linking)
      if (data.keyResultTaskId) {
        await storage.logActivity({
          organizationId,
          userId,
          actionType: 'agent_action',
          entityType: 'key_result_task',
          entityId: data.keyResultTaskId,
          description: `Work item linked`,
          metadata: { 
            workItemId,
            workItemTitle: existing.title
          }
        });
      }
      
      // Log to the task being unlinked FROM (if unlinking)
      if (existing.keyResultTaskId && !data.keyResultTaskId) {
        await storage.logActivity({
          organizationId,
          userId,
          actionType: 'agent_action',
          entityType: 'key_result_task',
          entityId: existing.keyResultTaskId,
          description: `Work item unlinked`,
          metadata: { 
            workItemId,
            workItemTitle: existing.title
          }
        });
      }
    }
    
    // Auto-initialize workflow if template was just attached
    if (data.workflowTemplateId && !existing.workflowTemplateId && updated) {
      try {
        console.log(`🔄 Auto-initializing workflow for work item ${workItemId} with template ${data.workflowTemplateId}`);
        await workItemWorkflowService.startWorkflowExecution({ workItemId: updated.id, organizationId, userId });
        console.log(`✅ Workflow initialized successfully for work item ${workItemId}`);
      } catch (error) {
        console.error(`❌ Failed to auto-initialize workflow for work item ${workItemId}:`, error);
        // Don't fail the update if workflow initialization fails
      }
    }
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating work item:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update work item' });
  }
});

// GET /work-items/:id/comments - Get all comments for a work item
router.get('/:id/comments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const workItemId = parseInt(req.params.id);
    const organizationId = req.user?.organizationId || 3;
    
    // Verify work item exists and belongs to organization
    const existing = await storage.getWorkItem(workItemId);
    if (!existing || existing.organizationId !== organizationId) {
      return res.status(404).json({ error: 'Work item not found' });
    }
    
    // Get comments with user details
    const comments = await storage.getWorkItemComments(workItemId);
    
    res.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /work-items/:id/activity - Log activity for a work item
router.post('/:id/activity', authenticateToken, async (req: Request, res: Response) => {
  try {
    const workItemId = parseInt(req.params.id);
    const { actionType, description, metadata } = req.body;
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    
    // Verify work item exists and belongs to organization
    const existing = await storage.getWorkItem(workItemId);
    if (!existing || existing.organizationId !== organizationId) {
      return res.status(404).json({ error: 'Work item not found' });
    }
    
    // Log the activity
    await storage.logActivity({
      organizationId,
      userId,
      actionType: actionType || 'comment',
      entityType: 'work_item',
      entityId: workItemId,
      description,
      metadata: metadata || {}
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// GET /work-items/:id/activity - Get activity logs for a work item
router.get('/:id/activity', authenticateToken, async (req: Request, res: Response) => {
  try {
    const workItemId = parseInt(req.params.id);
    const organizationId = req.user?.organizationId || 3;
    
    // Verify work item exists and belongs to organization
    const existing = await storage.getWorkItem(workItemId);
    if (!existing || existing.organizationId !== organizationId) {
      return res.status(404).json({ error: 'Work item not found' });
    }
    
    // Get activity logs for this work item
    const allActivities = await storage.getActivityLogs(organizationId, {
      entityType: 'work_item',
      limit: 100,
    });
    
    // Filter by entityId (work item ID)
    const activities = allActivities.filter(log => log.entityId === workItemId);
    
    res.json({ activities });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// GET /work-items/:id/inherited-documents - Get inherited documents from the hierarchy
router.get('/:id/inherited-documents', authenticateToken, async (req: Request, res: Response) => {
  try {
    const workItemId = parseInt(req.params.id);
    const organizationId = req.user?.organizationId || 3;

    if (isNaN(workItemId)) {
      return res.status(400).json({ error: 'Invalid work item ID' });
    }

    // Get the work item
    const workItem = await db
      .select()
      .from(workItems)
      .where(
        and(
          eq(workItems.id, workItemId),
          eq(workItems.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!workItem.length) {
      return res.status(404).json({ error: 'Work item not found' });
    }

    const inheritedDocuments = [];
    const item = workItem[0];

    // If work item is linked to a task, traverse the hierarchy
    if (item.keyResultTaskId) {
      // Get the task
      const task = await db
        .select()
        .from(keyResultTasks)
        .where(eq(keyResultTasks.id, item.keyResultTaskId))
        .limit(1);

      if (task.length > 0) {
        const taskData = task[0];

        // Get documents attached to the task
        const taskDocs = await db
          .select({
            attachmentId: knowledgeDocumentAttachments.id,
            documentId: knowledgeDocumentAttachments.documentId,
            notes: knowledgeDocumentAttachments.notes,
            attachedAt: knowledgeDocumentAttachments.attachedAt,
            attachedBy: knowledgeDocumentAttachments.attachedBy,
            document: knowledgeDocuments,
            source: sql<string>`'task'`,
            sourceId: knowledgeDocumentAttachments.taskId,
            sourceTitle: sql<string>`${taskData.title}`
          })
          .from(knowledgeDocumentAttachments)
          .leftJoin(knowledgeDocuments, eq(knowledgeDocumentAttachments.documentId, knowledgeDocuments.id))
          .where(eq(knowledgeDocumentAttachments.taskId, taskData.id));

        inheritedDocuments.push(...taskDocs);

        // Get the key result
        if (taskData.keyResultId) {
          const keyResult = await db
            .select()
            .from(keyResults)
            .where(eq(keyResults.id, taskData.keyResultId))
            .limit(1);

          if (keyResult.length > 0) {
            const keyResultData = keyResult[0];

            // Get documents attached to the key result
            const keyResultDocs = await db
              .select({
                attachmentId: knowledgeDocumentAttachments.id,
                documentId: knowledgeDocumentAttachments.documentId,
                notes: knowledgeDocumentAttachments.notes,
                attachedAt: knowledgeDocumentAttachments.attachedAt,
                attachedBy: knowledgeDocumentAttachments.attachedBy,
                document: knowledgeDocuments,
                source: sql<string>`'keyResult'`,
                sourceId: knowledgeDocumentAttachments.keyResultId,
                sourceTitle: sql<string>`${keyResultData.title}`
              })
              .from(knowledgeDocumentAttachments)
              .leftJoin(knowledgeDocuments, eq(knowledgeDocumentAttachments.documentId, knowledgeDocuments.id))
              .where(eq(knowledgeDocumentAttachments.keyResultId, keyResultData.id));

            inheritedDocuments.push(...keyResultDocs);

            // Get the objective
            if (keyResultData.objectiveId) {
              const objective = await db
                .select()
                .from(objectives)
                .where(eq(objectives.id, keyResultData.objectiveId))
                .limit(1);

              if (objective.length > 0) {
                const objectiveData = objective[0];

                // Get documents attached to the objective
                const objectiveDocs = await db
                  .select({
                    attachmentId: knowledgeDocumentAttachments.id,
                    documentId: knowledgeDocumentAttachments.documentId,
                    notes: knowledgeDocumentAttachments.notes,
                    attachedAt: knowledgeDocumentAttachments.attachedAt,
                    attachedBy: knowledgeDocumentAttachments.attachedBy,
                    document: knowledgeDocuments,
                    source: sql<string>`'objective'`,
                    sourceId: knowledgeDocumentAttachments.objectiveId,
                    sourceTitle: sql<string>`${objectiveData.title}`
                  })
                  .from(knowledgeDocumentAttachments)
                  .leftJoin(knowledgeDocuments, eq(knowledgeDocumentAttachments.documentId, knowledgeDocuments.id))
                  .where(eq(knowledgeDocumentAttachments.objectiveId, objectiveData.id));

                inheritedDocuments.push(...objectiveDocs);
              }
            }
          }
        }
      }
    }

    // Remove duplicates by document ID (in case same document is attached at multiple levels)
    const uniqueDocuments = inheritedDocuments.reduce((acc, doc) => {
      if (!acc.find(existing => existing.documentId === doc.documentId)) {
        acc.push(doc);
      }
      return acc;
    }, [] as any[]);

    // Sort by attachment date (most recent first)
    uniqueDocuments.sort((a, b) => new Date(b.attachedAt).getTime() - new Date(a.attachedAt).getTime());

    res.json({
      workItemId,
      workItemTitle: item.title,
      inheritedDocuments: uniqueDocuments
    });

  } catch (error) {
    console.error('Error fetching inherited documents:', error);
    res.status(500).json({ error: 'Failed to fetch inherited documents' });
  }
});

// DELETE /work-items/:id - Delete a work item
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const workItemId = parseInt(req.params.id);
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    
    // First check if the work item exists and belongs to the user's organization
    const existingItem = await db
      .select({
        id: workItems.id,
        organizationId: workItems.organizationId,
        createdBy: workItems.createdBy,
        assignedTo: workItems.assignedTo,
        title: workItems.title
      })
      .from(workItems)
      .where(
        and(
          eq(workItems.id, workItemId),
          eq(workItems.organizationId, organizationId)
        )
      )
      .limit(1);
    
    if (!existingItem.length) {
      return res.status(404).json({ error: 'Work item not found' });
    }
    
    const item = existingItem[0];
    
    // Check permissions: user can delete if they created it, are assigned to it, or have management permissions
    const userRole = req.user?.role || 'team_member';
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isManager = userRole === 'manager';
    const isCreator = item.createdBy === userId;
    const isAssignee = item.assignedTo === userId;
    const canDelete = isAdmin || isManager || isCreator || isAssignee;
    
    if (!canDelete) {
      console.log(`Delete permission denied for work item ${workItemId}:`, {
        userId,
        userRole,
        createdBy: item.createdBy,
        assignedTo: item.assignedTo,
        isAdmin,
        isManager,
        isCreator,
        isAssignee
      });
      return res.status(403).json({ 
        error: 'You do not have permission to delete this work item. Only admins, managers, the creator, or the assignee can delete work items.' 
      });
    }
    
    // Perform the deletion
    await db
      .delete(workItems)
      .where(
        and(
          eq(workItems.id, workItemId),
          eq(workItems.organizationId, organizationId)
        )
      );
    
    console.log(`Work item ${workItemId} "${item.title}" deleted by user ${userId}`);
    
    res.json({ success: true, message: 'Work item deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting work item:', error);
    res.status(500).json({ error: 'Failed to delete work item' });
  }
});

// ========================================
// WORKFLOW EXECUTION ENDPOINTS
// ========================================

import { workItemWorkflowService } from '../services/WorkItemWorkflowService';

router.post('/:id/executions/start', authenticateToken, async (req: Request, res: Response) => {
  try {
    const workItemId = parseInt(req.params.id);
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    
    const execution = await workItemWorkflowService.startWorkflowExecution({
      workItemId,
      organizationId,
      userId
    });
    
    res.status(201).json(execution);
  } catch (error: any) {
    console.error('Error starting workflow execution:', error);
    res.status(500).json({ error: error.message || 'Failed to start workflow execution' });
  }
});

router.get('/:id/executions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const workItemId = parseInt(req.params.id);
    const organizationId = req.user?.organizationId || 3;
    
    const executions = await workItemWorkflowService.getWorkflowExecution(workItemId, organizationId);
    res.json(executions);
  } catch (error) {
    console.error('Error fetching workflow executions:', error);
    res.status(500).json({ error: 'Failed to fetch workflow executions' });
  }
});

router.put('/:id/executions/:executionId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const workItemId = parseInt(req.params.id);
    const executionId = parseInt(req.params.executionId);
    const organizationId = req.user?.organizationId || 3;
    const { currentStepId, executionData } = req.body;
    
    const execution = await workItemWorkflowService.updateWorkflowStep({
      executionId,
      organizationId,
      currentStepId,
      executionData
    });
    
    res.json(execution);
  } catch (error) {
    console.error('Error updating workflow step:', error);
    res.status(500).json({ error: 'Failed to update workflow step' });
  }
});

router.post('/:id/executions/:executionId/complete', authenticateToken, async (req: Request, res: Response) => {
  try {
    const executionId = parseInt(req.params.executionId);
    const organizationId = req.user?.organizationId || 3;
    
    const execution = await workItemWorkflowService.completeWorkflow(executionId, organizationId);
    res.json(execution);
  } catch (error) {
    console.error('Error completing workflow:', error);
    res.status(500).json({ error: 'Failed to complete workflow' });
  }
});

// GET /work-items/:id/workflow/steps - Get workflow execution steps
router.get('/:id/workflow/steps', authenticateToken, async (req: Request, res: Response) => {
  try {
    const workItemId = parseInt(req.params.id);
    const organizationId = req.user?.organizationId || 3;
    
    const steps = await workItemWorkflowService.getWorkflowSteps(workItemId, organizationId);
    res.json(steps);
  } catch (error) {
    console.error('Error getting workflow steps:', error);
    res.status(500).json({ error: 'Failed to get workflow steps' });
  }
});

// GET /work-items/:id/workflow/steps/:stepId - Get single workflow step
router.get('/:id/workflow/steps/:stepId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const workItemId = parseInt(req.params.id);
    const stepId = parseInt(req.params.stepId);
    const organizationId = req.user?.organizationId || 3;
    
    const allSteps = await workItemWorkflowService.getWorkflowSteps(workItemId, organizationId);
    const step = allSteps.find(s => s.id === stepId);
    
    if (!step) {
      return res.status(404).json({ error: 'Workflow step not found' });
    }
    
    res.json(step);
  } catch (error) {
    console.error('Error getting workflow step:', error);
    res.status(500).json({ error: 'Failed to get workflow step' });
  }
});

// PUT /work-items/:id/workflow/steps/:stepId - Update step status
router.put('/:id/workflow/steps/:stepId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const stepId = parseInt(req.params.stepId);
    const workItemId = parseInt(req.params.id);
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id;
    const { status, notes, evidence } = req.body;
    
    const step = await workItemWorkflowService.updateStepStatus(
      stepId,
      organizationId,
      status,
      userId,
      notes,
      evidence
    );
    
    // Auto-complete work item when all steps are completed
    if (status === 'completed') {
      console.log(`[Workflow] Step marked as completed. Checking if all steps are complete for work item ${workItemId}...`);
      const allSteps = await workItemWorkflowService.getWorkflowSteps(workItemId, organizationId);
      console.log(`[Workflow] All steps:`, allSteps.map(s => ({ id: s.id, status: s.status })));
      const allCompleted = allSteps.every(s => s.status === 'completed');
      console.log(`[Workflow] All completed:`, allCompleted);
      
      if (allCompleted) {
        console.log(`[Workflow] All steps completed! Triggering workflow completion for work item ${workItemId}...`);
        
        // Get execution ID from the step
        const executionId = step.executionId;
        
        if (executionId) {
          try {
            console.log(`[Workflow] Calling completeWorkflow with executionId: ${executionId}`);
            // This will trigger completion callbacks and update work item status
            await workItemWorkflowService.completeWorkflow(executionId, organizationId);
            console.log(`[Workflow] Workflow completion successful for work item ${workItemId}`);
          } catch (error) {
            console.error('[Workflow] Error completing workflow:', error);
            // Fallback: manually update status if completion fails
            await db.update(workItems)
              .set({ 
                status: 'Completed',
                updatedAt: new Date()
              })
              .where(and(
                eq(workItems.id, workItemId),
                eq(workItems.organizationId, organizationId)
              ));
          }
        } else {
          console.log('[Workflow] No executionId found, updating status directly');
          // Fallback: Update work item status to Completed
          await db.update(workItems)
            .set({ 
              status: 'Completed',
              updatedAt: new Date()
            })
            .where(and(
              eq(workItems.id, workItemId),
              eq(workItems.organizationId, organizationId)
            ));
        }
      }
    }
    
    res.json(step);
  } catch (error) {
    console.error('Error updating step status:', error);
    res.status(500).json({ error: 'Failed to update step status' });
  }
});

// POST /work-items/:id/workflow/steps/:stepId/evidence - Add evidence to step
router.post('/:id/workflow/steps/:stepId/evidence', authenticateToken, async (req: Request, res: Response) => {
  try {
    const stepId = parseInt(req.params.stepId);
    const organizationId = req.user?.organizationId || 3;
    const { evidence } = req.body;
    
    const step = await workItemWorkflowService.addStepEvidence(stepId, organizationId, evidence);
    res.json(step);
  } catch (error) {
    console.error('Error adding step evidence:', error);
    res.status(500).json({ error: 'Failed to add step evidence' });
  }
});

// POST /work-items/:id/workflow/steps/:stepId/evidence/upload-chunk - Chunked upload for large evidence files
router.post('/:id/workflow/steps/:stepId/evidence/upload-chunk', authenticateToken, async (req: Request, res: Response) => {
  try {
    const stepId = parseInt(req.params.stepId);
    const workItemId = parseInt(req.params.id);
    const organizationId = req.user?.organizationId || 3;
    const { 
      uploadId, 
      chunkIndex, 
      totalChunks, 
      chunkData, 
      fileName, 
      fileType, 
      fileSize 
    } = req.body;

    // Validate chunk data
    if (!uploadId || chunkIndex === undefined || !totalChunks || !chunkData) {
      return res.status(400).json({ 
        error: 'Missing required fields: uploadId, chunkIndex, totalChunks, chunkData' 
      });
    }

    // TODO: In production, store chunks in a temporary location (filesystem, S3, etc.)
    // For now, we'll store in memory using a simple in-memory cache
    // In production, replace this with Redis or file storage
    const cacheKey = `upload_${organizationId}_${uploadId}`;
    
    // Initialize global cache if needed
    (global as any).uploadCache = (global as any).uploadCache || {};
    
    // Initialize upload tracking if session doesn't exist (not just when chunkIndex===0)
    if (!(global as any).uploadCache[cacheKey]) {
      (global as any).uploadCache[cacheKey] = {
        stepId,
        workItemId,
        organizationId,
        fileName,
        fileType,
        fileSize,
        totalChunks,
        chunks: new Array(totalChunks),
        receivedChunks: 0
      };
    }

    const upload = (global as any).uploadCache[cacheKey];
    
    // Validate chunk index bounds
    if (chunkIndex < 0 || chunkIndex >= totalChunks) {
      return res.status(400).json({ 
        error: `Invalid chunk index ${chunkIndex}. Must be between 0 and ${totalChunks - 1}` 
      });
    }
    
    // Validate totalChunks matches the session
    if (upload.totalChunks !== totalChunks) {
      return res.status(400).json({ 
        error: `Total chunks mismatch. Expected ${upload.totalChunks}, got ${totalChunks}` 
      });
    }

    // Validate chunk payload size (rough base64-encoded size check)
    // Each chunk should be reasonable (max ~10MB base64 = ~13.3MB encoded)
    const MAX_CHUNK_SIZE_BYTES = 15 * 1024 * 1024; // 15MB to be safe
    if (chunkData.length > MAX_CHUNK_SIZE_BYTES) {
      return res.status(413).json({ 
        error: `Chunk too large. Maximum chunk size is ${MAX_CHUNK_SIZE_BYTES} bytes` 
      });
    }

    // Store chunk only if not already received (use strict undefined check for idempotence)
    const isNewChunk = upload.chunks[chunkIndex] === undefined;
    if (isNewChunk) {
      upload.chunks[chunkIndex] = chunkData;
      upload.receivedChunks++;
    }

    // Check if all chunks received (verify all slots are filled with !== undefined)
    const allChunksReceived = upload.chunks.every((chunk: any) => chunk !== undefined);
    if (allChunksReceived && upload.receivedChunks === upload.totalChunks) {
      // Reassemble file
      const completeFileData = upload.chunks.join('');
      
      // Create evidence record
      const evidence = {
        fileName: upload.fileName,
        fileType: upload.fileType,
        fileSize: upload.fileSize,
        fileData: completeFileData,
        uploadedAt: new Date().toISOString()
      };

      // Add evidence to step
      const step = await workItemWorkflowService.addStepEvidence(stepId, organizationId, evidence);
      
      // Clean up upload cache
      delete (global as any).uploadCache[cacheKey];

      res.json({ 
        success: true, 
        completed: true, 
        uploadId, 
        step 
      });
    } else {
      // More chunks needed
      res.json({ 
        success: true, 
        completed: false, 
        uploadId, 
        receivedChunks: upload.receivedChunks, 
        totalChunks: upload.totalChunks 
      });
    }
  } catch (error) {
    console.error('Error uploading evidence chunk:', error);
    res.status(500).json({ error: 'Failed to upload evidence chunk' });
  }
});

// POST /work-items/:id/workflow/initialize - Manually initialize workflow for existing work item
router.post('/:id/workflow/initialize', authenticateToken, async (req: Request, res: Response) => {
  try {
    const workItemId = parseInt(req.params.id);
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id;
    
    // Get work item to check if it has a template
    const workItem = await db.query.workItems.findFirst({
      where: and(
        eq(workItems.id, workItemId),
        eq(workItems.organizationId, organizationId)
      )
    });
    
    if (!workItem) {
      return res.status(404).json({ error: 'Work item not found' });
    }
    
    if (!workItem.workflowTemplateId) {
      return res.status(400).json({ error: 'Work item does not have a workflow template attached' });
    }
    
    // Check if workflow already exists and delete it to allow re-initialization
    const existing = await db.query.workItemWorkflowExecutions.findFirst({
      where: eq(workItemWorkflowExecutions.workItemId, workItemId)
    });
    
    if (existing) {
      // Delete existing workflow execution (cascade will delete steps)
      await db.delete(workItemWorkflowExecutions)
        .where(eq(workItemWorkflowExecutions.id, existing.id));
      console.log(`Deleted existing workflow execution ${existing.id} for work item ${workItemId}`);
    }
    
    // Initialize workflow
    await workItemWorkflowService.startWorkflowExecution({ workItemId, organizationId, userId });
    
    res.json({ success: true, message: 'Workflow initialized successfully' });
  } catch (error) {
    console.error('Error initializing workflow:', error);
    res.status(500).json({ error: 'Failed to initialize workflow' });
  }
});

export default router;