import { Router } from 'express';
import { storage } from '../storage';
import { authenticateToken } from '../auth';
import {
  insertTaskTypeConfigurationSchema,
  insertWorkflowTemplateSchema,
  insertFieldTaskSchema,
  insertFieldTaskExecutionSchema,
  insertTaskChecklistSchema,
  insertVisitWorkflowSchema,
  insertVehicleCheckSchema,
  insertSyncQueueSchema,
  insertSplynxAdministratorSchema,
} from '../../shared/schema';
import { z } from 'zod';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// ========================================
// SPLYNX ADMINISTRATORS (USER MAPPING)
// ========================================

router.get('/splynx-administrators', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const admins = await storage.getSplynxAdministrators(user.organizationId);
    res.json(admins);
  } catch (error) {
    console.error('Error fetching Splynx administrators:', error);
    res.status(500).json({ error: 'Failed to fetch Splynx administrators' });
  }
});

router.post('/splynx-administrators/sync', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const admins = req.body.administrators;
    if (!Array.isArray(admins)) {
      return res.status(400).json({ error: 'Invalid payload - administrators array required' });
    }

    const validated = admins.map(admin => insertSplynxAdministratorSchema.parse({
      ...admin,
      organizationId: user.organizationId
    }));

    const result = await storage.upsertSplynxAdministrators(user.organizationId, validated);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error syncing Splynx administrators:', error);
    res.status(500).json({ error: 'Failed to sync Splynx administrators' });
  }
});

// ========================================
// TASK TYPE CONFIGURATIONS
// ========================================

router.get('/task-type-configurations', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const configs = await storage.getTaskTypeConfigurations(user.organizationId);
    res.json(configs);
  } catch (error) {
    console.error('Error fetching task type configurations:', error);
    res.status(500).json({ error: 'Failed to fetch task type configurations' });
  }
});

router.get('/task-type-configurations/:id', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const id = parseInt(req.params.id);
    const config = await storage.getTaskTypeConfiguration(id);
    
    if (!config) {
      return res.status(404).json({ error: 'Task type configuration not found' });
    }

    if (config.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied - organization mismatch' });
    }
    
    res.json(config);
  } catch (error) {
    console.error('Error fetching task type configuration:', error);
    res.status(500).json({ error: 'Failed to fetch task type configuration' });
  }
});

router.post('/task-type-configurations', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const validated = insertTaskTypeConfigurationSchema.parse({
      ...req.body,
      organizationId: user.organizationId
    });

    const config = await storage.createTaskTypeConfiguration(validated);
    res.status(201).json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating task type configuration:', error);
    res.status(500).json({ error: 'Failed to create task type configuration' });
  }
});

router.put('/task-type-configurations/:id', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const id = parseInt(req.params.id);
    const existing = await storage.getTaskTypeConfiguration(id);
    
    if (!existing) {
      return res.status(404).json({ error: 'Task type configuration not found' });
    }

    if (existing.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied - organization mismatch' });
    }

    const updateData = insertTaskTypeConfigurationSchema.partial().omit({ organizationId: true }).parse(req.body);
    const updated = await storage.updateTaskTypeConfiguration(id, updateData);
    
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating task type configuration:', error);
    res.status(500).json({ error: 'Failed to update task type configuration' });
  }
});

router.delete('/task-type-configurations/:id', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const id = parseInt(req.params.id);
    const existing = await storage.getTaskTypeConfiguration(id);
    
    if (!existing) {
      return res.status(404).json({ error: 'Task type configuration not found' });
    }

    if (existing.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied - organization mismatch' });
    }

    const deleted = await storage.deleteTaskTypeConfiguration(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting task type configuration:', error);
    res.status(500).json({ error: 'Failed to delete task type configuration' });
  }
});

// Workflow template routes have been consolidated to /api/workflows/templates
// Use those endpoints instead of the field-engineering specific ones

// ========================================
// FIELD TASKS
// ========================================

router.get('/tasks', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const filters: any = {};
    
    if (req.query.userId) {
      filters.userId = parseInt(req.query.userId as string);
    }
    if (req.query.status) {
      filters.status = req.query.status as string;
    }
    if (req.query.appTaskType) {
      filters.appTaskType = req.query.appTaskType as string;
    }

    const tasks = await storage.getFieldTasks(user.organizationId, filters);
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching field tasks:', error);
    res.status(500).json({ error: 'Failed to fetch field tasks' });
  }
});

router.get('/tasks/:id', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const task = await storage.getFieldTask(req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied - organization mismatch' });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

router.post('/tasks', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const validated = insertFieldTaskSchema.parse({
      ...req.body,
      organizationId: user.organizationId
    });

    const task = await storage.createFieldTask(validated);
    res.status(201).json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.put('/tasks/:id', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const existing = await storage.getFieldTask(req.params.id);
    
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (existing.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied - organization mismatch' });
    }

    const updateData = insertFieldTaskSchema.partial().omit({ organizationId: true }).parse(req.body);
    const updated = await storage.updateFieldTask(req.params.id, updateData);
    
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.delete('/tasks/:id', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const existing = await storage.getFieldTask(req.params.id);
    
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (existing.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied - organization mismatch' });
    }

    const deleted = await storage.deleteFieldTask(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// ========================================
// TASK EXECUTIONS
// ========================================

router.get('/tasks/:taskId/executions', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const task = await storage.getFieldTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied - organization mismatch' });
    }

    const executions = await storage.getFieldTaskExecutions(req.params.taskId);
    res.json(executions);
  } catch (error) {
    console.error('Error fetching task executions:', error);
    res.status(500).json({ error: 'Failed to fetch task executions' });
  }
});

router.get('/task-executions/:id', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const execution = await storage.getFieldTaskExecution(req.params.id);
    
    if (!execution) {
      return res.status(404).json({ error: 'Task execution not found' });
    }

    const task = await storage.getFieldTask(execution.taskId);
    if (!task || task.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied - organization mismatch' });
    }
    
    res.json(execution);
  } catch (error) {
    console.error('Error fetching task execution:', error);
    res.status(500).json({ error: 'Failed to fetch task execution' });
  }
});

router.post('/tasks/:taskId/executions', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const task = await storage.getFieldTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied - organization mismatch' });
    }

    const validated = insertFieldTaskExecutionSchema.parse({
      ...req.body,
      taskId: req.params.taskId,
      executedByUserId: user.id
    });

    const execution = await storage.createFieldTaskExecution(validated);
    res.status(201).json(execution);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating task execution:', error);
    res.status(500).json({ error: 'Failed to create task execution' });
  }
});

router.put('/task-executions/:id', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const existing = await storage.getFieldTaskExecution(req.params.id);
    
    if (!existing) {
      return res.status(404).json({ error: 'Task execution not found' });
    }

    const task = await storage.getFieldTask(existing.taskId);
    if (!task || task.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied - organization mismatch' });
    }

    const updateData = insertFieldTaskExecutionSchema.partial().omit({ taskId: true, executedByUserId: true }).parse(req.body);
    const updated = await storage.updateFieldTaskExecution(req.params.id, updateData);
    
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating task execution:', error);
    res.status(500).json({ error: 'Failed to update task execution' });
  }
});

// ========================================
// TASK CHECKLISTS
// ========================================

router.get('/tasks/:taskId/checklists', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const task = await storage.getFieldTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied - organization mismatch' });
    }

    const checklists = await storage.getTaskChecklists(req.params.taskId);
    res.json(checklists);
  } catch (error) {
    console.error('Error fetching task checklists:', error);
    res.status(500).json({ error: 'Failed to fetch task checklists' });
  }
});

router.post('/tasks/:taskId/checklists', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const task = await storage.getFieldTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied - organization mismatch' });
    }

    const validated = insertTaskChecklistSchema.parse({
      ...req.body,
      taskId: req.params.taskId
    });

    const checklist = await storage.createTaskChecklist(validated);
    res.status(201).json(checklist);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating checklist:', error);
    res.status(500).json({ error: 'Failed to create checklist' });
  }
});

router.put('/checklists/:id', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const existing = await storage.getTaskChecklist(req.params.id);
    
    if (!existing) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    const task = await storage.getFieldTask(existing.taskId);
    if (!task || task.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied - organization mismatch' });
    }

    const schema = z.object({
      items: z.array(z.object({
        id: z.string(),
        name: z.string(),
        checked: z.boolean(),
        order: z.number()
      })).optional(),
      completedCount: z.number().optional(),
      totalCount: z.number().optional(),
      splynxChecklistId: z.number().nullable().optional()
    });
    const updateData = schema.parse(req.body);
    const updated = await storage.updateTaskChecklist(req.params.id, updateData);
    
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating checklist:', error);
    res.status(500).json({ error: 'Failed to update checklist' });
  }
});

// ========================================
// VISIT WORKFLOWS
// ========================================

router.get('/tasks/:taskId/workflows', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const task = await storage.getFieldTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied - organization mismatch' });
    }

    const workflows = await storage.getVisitWorkflows(req.params.taskId);
    res.json(workflows);
  } catch (error) {
    console.error('Error fetching visit workflows:', error);
    res.status(500).json({ error: 'Failed to fetch visit workflows' });
  }
});

router.post('/tasks/:taskId/workflows', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const task = await storage.getFieldTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied - organization mismatch' });
    }

    const validated = insertVisitWorkflowSchema.parse({
      ...req.body,
      taskId: req.params.taskId
    });

    const workflow = await storage.createVisitWorkflow(validated);
    res.status(201).json(workflow);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

router.put('/workflows/:id', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const existing = await storage.getVisitWorkflow(req.params.id);
    
    if (!existing) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const task = await storage.getFieldTask(existing.taskId);
    if (!task || task.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied - organization mismatch' });
    }

    const updateData = insertVisitWorkflowSchema.partial().omit({ taskId: true }).parse(req.body);
    const updated = await storage.updateVisitWorkflow(req.params.id, updateData);
    
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating workflow:', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// ========================================
// VEHICLE CHECKS
// ========================================

router.get('/vehicle-checks', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const checks = await storage.getVehicleChecks(user.organizationId, userId);
    res.json(checks);
  } catch (error) {
    console.error('Error fetching vehicle checks:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle checks' });
  }
});

router.post('/vehicle-checks', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const validated = insertVehicleCheckSchema.parse({
      ...req.body,
      organizationId: user.organizationId,
      userId: user.id
    });

    const check = await storage.createVehicleCheck(validated);
    res.status(201).json(check);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating vehicle check:', error);
    res.status(500).json({ error: 'Failed to create vehicle check' });
  }
});

// ========================================
// SYNC QUEUE
// ========================================

router.get('/sync-queue', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const queue = await storage.getSyncQueue(user.organizationId, userId);
    res.json(queue);
  } catch (error) {
    console.error('Error fetching sync queue:', error);
    res.status(500).json({ error: 'Failed to fetch sync queue' });
  }
});

router.get('/sync-queue/pending', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const pending = await storage.getPendingSyncItems(user.organizationId, userId);
    res.json(pending);
  } catch (error) {
    console.error('Error fetching pending sync items:', error);
    res.status(500).json({ error: 'Failed to fetch pending sync items' });
  }
});

router.post('/sync-queue', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const validated = insertSyncQueueSchema.parse({
      ...req.body,
      organizationId: user.organizationId,
      userId: user.id
    });

    const item = await storage.createSyncQueueItem(validated);
    res.status(201).json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating sync queue item:', error);
    res.status(500).json({ error: 'Failed to create sync queue item' });
  }
});

router.put('/sync-queue/:id', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const id = parseInt(req.params.id);
    const existing = await storage.getSyncQueueItem(id);
    
    if (!existing) {
      return res.status(404).json({ error: 'Sync queue item not found' });
    }

    if (existing.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied - organization mismatch' });
    }

    const updateData = insertSyncQueueSchema.partial().omit({ organizationId: true, userId: true }).parse(req.body);
    const updated = await storage.updateSyncQueueItem(id, updateData);
    
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating sync queue item:', error);
    res.status(500).json({ error: 'Failed to update sync queue item' });
  }
});

router.delete('/sync-queue/:id', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const id = parseInt(req.params.id);
    const existing = await storage.getSyncQueueItem(id);
    
    if (!existing) {
      return res.status(404).json({ error: 'Sync queue item not found' });
    }

    if (existing.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied - organization mismatch' });
    }

    const deleted = await storage.deleteSyncQueueItem(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting sync queue item:', error);
    res.status(500).json({ error: 'Failed to delete sync queue item' });
  }
});

export default router;
