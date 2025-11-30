import { Router, Request, Response } from 'express';
import { z } from 'zod';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { storage } from '../storage.js';
import { authenticateToken } from '../auth.js';
import { ensureTeamMeetings } from '../utils/meetingGenerator.js';
import { eq, and, gte, lte, desc, inArray, notInArray, gt, asc, isNull, or, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { checkInMeetings, teams, workItems, teamMembers, meetingAttendees, updateMeetingStatusSchema, keyResultTasks, objectives, keyResults, activityLogs, keyResultSnapshots, keyResultComments, users, mindMapNodePositions } from '../../shared/schema.js';
import type { User } from '../../shared/schema.js';

const router = Router();

// Extend Express Request type with proper User type
interface AuthRequest extends Request {
  user?: User;
}

// Helper function to log activities
async function logActivity(
  organizationId: number,
  userId: number,
  actionType: 'creation' | 'status_change' | 'assignment' | 'comment' | 'file_upload' | 'kpi_update' | 'agent_action' | 'completion',
  entityType: string,
  entityId: number,
  description: string,
  metadata?: any
) {
  try {
    await db.insert(activityLogs).values({
      organizationId,
      userId,
      actionType,
      entityType,
      entityId,
      description,
      metadata: metadata || {}
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error to avoid breaking the main operation
  }
}

// Schemas
const createObjectiveSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.string().optional(),
  priority: z.string().optional(),
  status: z.enum(['Draft', 'Active', 'On Track', 'At Risk', 'Off Track', 'Completed', 'Archived']).default('Draft'),
  targetValue: z.number().optional().nullable(),
  currentValue: z.number().default(0),
  kpiType: z.enum(['Derived from Key Results', 'Manual Input']).default('Derived from Key Results'),
  ownerId: z.number().optional().nullable(),
  teamId: z.number().optional().nullable(),
});

// Key Results validation schema (migration 002)
// Note: Drizzle returns decimal fields as strings, so we validate as strings and convert as needed
const createKeyResultSchema = z.object({
  objectiveId: z.number(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  targetValue: z.string().optional(), // Decimal fields come as strings from Drizzle
  currentValue: z.string().default('0'), // Decimal fields come as strings from Drizzle
  type: z.enum(['Numeric Target', 'Percentage KPI', 'Milestone']).default('Numeric Target'),
  status: z.enum(['Not Started', 'On Track', 'At Risk', 'Stuck', 'Completed']).default('Not Started'),
  knowledgeDocumentId: z.number().optional(),
  ownerId: z.number().optional(),
});

// Key Result Task validation schema (migration 003)
const createTaskSchema = z.object({
  keyResultId: z.number(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['Not Started', 'On Track', 'Stuck', 'Completed']).default('Not Started'),
  targetCompletion: z.string().optional(), // Keep as timestamp string
  assignedTo: z.number().optional(),
});

const updateProgressSchema = z.object({
  currentValue: z.string(),
  notes: z.string().optional(),
});

// Mission and Vision validation schema
const updateMissionVisionSchema = z.object({
  mission: z.string().optional(),
  vision: z.string().optional(),
  strategyStatementHtml: z.string().optional(),
});

// Get mission and vision for organization
router.get('/mission-vision', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }
    
    let missionVision = await storage.getMissionVision(organizationId);
    
    // If no mission/vision exists, create default one
    if (!missionVision) {
      missionVision = await storage.createMissionVision({
        organizationId,
        mission: '',
        vision: '',
        updatedBy: req.user?.id
      });
    }
    
    res.json(missionVision);
  } catch (error) {
    console.error('Error fetching mission/vision:', error);
    res.status(500).json({ error: 'Failed to fetch mission and vision' });
  }
});

// Update mission and vision
router.put('/mission-vision', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;
    
    if (!organizationId || !userId) {
      return res.status(400).json({ error: 'Authentication required' });
    }
    
    // Validate the request body
    const validatedData = updateMissionVisionSchema.parse(req.body);
    const { mission, vision, strategyStatementHtml } = validatedData;
    
    // Sanitize HTML if provided
    let sanitizedStrategyStatementHtml = strategyStatementHtml;
    if (strategyStatementHtml) {
      const window = new JSDOM('').window;
      const purify = DOMPurify(window);
      sanitizedStrategyStatementHtml = purify.sanitize(strategyStatementHtml, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'],
        ALLOWED_ATTR: ['class', 'id']
      });
    }
    
    // Check if mission/vision exists
    let missionVision = await storage.getMissionVision(organizationId);
    
    if (missionVision) {
      // Update existing
      missionVision = await storage.updateMissionVision(organizationId, {
        mission,
        vision,
        strategyStatementHtml: sanitizedStrategyStatementHtml,
        updatedBy: userId
      });
    } else {
      // Create new
      missionVision = await storage.createMissionVision({
        organizationId,
        mission,
        vision,
        strategyStatementHtml: sanitizedStrategyStatementHtml,
        updatedBy: userId
      });
    }
    
    // Log activity
    await storage.logActivity({
      organizationId,
      userId,
      actionType: 'status_change',
      entityType: 'mission_vision',
      entityId: missionVision?.id || 0,
      description: 'Mission and Vision updated',
      metadata: { mission, vision, hasStrategyStatement: !!sanitizedStrategyStatementHtml }
    });
    
    res.json(missionVision);
  } catch (error) {
    console.error('Error updating mission/vision:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update mission and vision' });
  }
});

// Get objectives (with auth) - used by frontend
router.get('/objectives-bypass', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }
    const objectives = await storage.getObjectives(organizationId);
    res.json(objectives);
  } catch (error) {
    console.error('Error fetching objectives (bypass):', error);
    res.status(500).json({ error: 'Failed to fetch objectives' });
  }
});

// Get all objectives for organization
router.get('/objectives', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;
    const objectives = await storage.getObjectives(organizationId);
    res.json(objectives);
  } catch (error) {
    console.error('Error fetching objectives:', error);
    res.status(500).json({ error: 'Failed to fetch objectives' });
  }
});

// Get single objective
router.get('/objectives/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const objectiveId = parseInt(req.params.id);
    const objective = await storage.getObjective(objectiveId);
    
    if (!objective) {
      return res.status(404).json({ error: 'Objective not found' });
    }
    
    res.json(objective);
  } catch (error) {
    console.error('Error fetching objective:', error);
    res.status(500).json({ error: 'Failed to fetch objective' });
  }
});

// Create new objective
router.post('/objectives', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const data = createObjectiveSchema.parse(req.body);
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    
    const objective = await storage.createObjective({
      organizationId,
      title: data.title,
      description: data.description,
      status: data.status,
      targetValue: data.targetValue?.toString(),
      currentValue: data.currentValue?.toString(),
      kpiType: data.kpiType,
      ownerId: data.ownerId || userId,
      teamId: data.teamId,
      createdBy: userId,
    });
    
    // Log activity
    await storage.logActivity({
      organizationId,
      userId,
      actionType: 'creation',
      entityType: 'objective',
      entityId: objective.id,
      description: `Objective "${data.title}" was created`,
      metadata: { title: data.title }
    });
    
    res.status(201).json(objective);
  } catch (error) {
    console.error('Error creating objective:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create objective' });
  }
});

// Reorder objectives (must come before the generic update route)
router.put('/objectives/reorder', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { updates } = req.body;
    
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Updates must be an array' });
    }
    
    // Validate each update has id and displayOrder
    for (const update of updates) {
      if (typeof update.id !== 'number' || typeof update.displayOrder !== 'number') {
        return res.status(400).json({ error: 'Each update must have id and displayOrder' });
      }
    }
    
    await storage.updateObjectivesOrder(updates);
    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering objectives:', error);
    res.status(500).json({ error: 'Failed to reorder objectives' });
  }
});

// Update objective
router.put('/objectives/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const objectiveId = parseInt(req.params.id);
    const data = createObjectiveSchema.partial().parse(req.body);
    
    const objective = await storage.updateObjective(objectiveId, {
      ...data,
      targetValue: data.targetValue?.toString(),
      currentValue: data.currentValue?.toString(),
      updatedAt: new Date(),
    });
    
    if (!objective) {
      return res.status(404).json({ error: 'Objective not found' });
    }
    
    res.json(objective);
  } catch (error) {
    console.error('Error updating objective:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update objective' });
  }
});

// Get objective dependencies
router.get('/objectives/:id/dependencies', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const objectiveId = parseInt(req.params.id);
    const dependencies = await storage.getObjectiveDependencies(objectiveId);
    res.json(dependencies);
  } catch (error) {
    console.error('Error fetching objective dependencies:', error);
    res.status(500).json({ error: 'Failed to fetch dependencies' });
  }
});

// Delete objective
router.delete('/objectives/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const objectiveId = parseInt(req.params.id);
    const cascade = req.query.cascade === 'true';
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    
    // Check if objective exists first
    const objective = await storage.getObjective(objectiveId);
    if (!objective) {
      return res.status(404).json({ error: 'Objective not found' });
    }
    
    // Check for dependencies if not cascading
    if (!cascade) {
      const dependencies = await storage.getObjectiveDependencies(objectiveId);
      if (dependencies.totalCount > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete objective',
          message: `This objective has ${dependencies.keyResults.length} key result(s), ${dependencies.tasks.length} task(s), and ${dependencies.workItems.length} work item(s). Use cascade=true to delete all dependencies.`,
          dependencies
        });
      }
    }
    
    // Delete the objective (with or without cascade)
    const deleted = cascade 
      ? await storage.cascadeDeleteObjective(objectiveId)
      : await storage.deleteObjective(objectiveId);
    
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete objective' });
    }
    
    // Log activity with cascade information
    await storage.logActivity({
      organizationId,
      userId,
      actionType: 'deletion',
      entityType: 'objective',
      entityId: objectiveId,
      description: cascade 
        ? `Objective "${objective.title}" and all dependencies were deleted`
        : `Objective "${objective.title}" was deleted`,
      metadata: { 
        title: objective.title, 
        deletedBy: userId,
        cascade
      }
    });
    
    res.json({ success: true, message: 'Objective deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting objective:', error);
    
    // Check for foreign key constraint violations
    if (error.code === '23503') {
      // PostgreSQL foreign key violation error code
      if (error.constraint?.includes('activity_logs')) {
        return res.status(400).json({ 
          error: 'Cannot delete objective',
          message: 'This objective has associated activity logs. Delete related activities first or archive the objective instead.',
          constraint: 'activity_logs'
        });
      } else if (error.constraint?.includes('key_results')) {
        return res.status(400).json({ 
          error: 'Cannot delete objective',
          message: 'This objective has associated key results. Delete all key results first.',
          constraint: 'key_results'
        });
      } else {
        return res.status(400).json({ 
          error: 'Cannot delete objective',
          message: 'This objective has dependencies that must be removed first.',
          constraint: error.constraint
        });
      }
    }
    
    res.status(500).json({ error: 'Failed to delete objective', message: error.message });
  }
});

// Get activity logs for an objective
router.get('/objectives/:id/activity', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const objectiveId = parseInt(req.params.id);
    const organizationId = req.user?.organizationId || 3;
    
    // Verify objective exists and belongs to user's organization
    const objective = await storage.getObjective(objectiveId);
    if (!objective) {
      return res.status(404).json({ error: 'Objective not found' });
    }
    
    // Get all activity logs for the organization
    const allLogs = await storage.getActivityLogs(organizationId, {
      limit: 100
    });
    
    // Filter for this specific objective - includes both direct objective logs and related activities
    const objectiveLogs = allLogs.filter(log => {
      // Direct entity match for objective logs
      if (log.entityType === 'objective' && log.entityId === objectiveId) {
        return true;
      }
      
      // Metadata objectiveId match for key result or other related logs
      try {
        if (log.metadata) {
          const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
          return metadata.objectiveId === objectiveId || metadata.objectiveId === String(objectiveId);
        }
      } catch (e) {
        // Ignore JSON parse errors and continue
      }
      
      return false;
    });
    
    // Transform database format to frontend expected format
    const transformedLogs = objectiveLogs.map(log => ({
      id: log.id,
      type: log.actionType === 'creation' ? 'created' : 
            log.actionType === 'status_change' ? 'status_changed' :
            log.actionType === 'kpi_update' ? 'progress_updated' :
            log.actionType === 'deletion' ? 'deleted' :
            log.actionType,
      description: log.description,
      userId: log.userId,
      userName: 'System User', // Could be enhanced to fetch actual user names
      timestamp: log.createdAt,
      metadata: typeof log.metadata === 'string' ? JSON.parse(log.metadata || '{}') : (log.metadata || {})
    }));
    
    res.json(transformedLogs);
  } catch (error) {
    console.error('Error fetching objective activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// Get single objective (with auth)
router.get('/objectives-bypass/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const objectiveId = parseInt(req.params.id);
    const objective = await storage.getObjective(objectiveId);
    
    if (!objective) {
      return res.status(404).json({ error: 'Objective not found' });
    }
    
    res.json(objective);
  } catch (error) {
    console.error('Error fetching objective (bypass):', error);
    res.status(500).json({ error: 'Failed to fetch objective' });
  }
});

// Get all key results for organization (for workflow builder)
router.get('/key-results', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    // Fetch all key results for the organization
    const allKeyResults = await db
      .select()
      .from(keyResults)
      .where(eq(keyResults.organizationId, organizationId))
      .orderBy(asc(keyResults.title));

    res.json(allKeyResults);
  } catch (error) {
    console.error('Error fetching key results:', error);
    res.status(500).json({ error: 'Failed to fetch key results' });
  }
});

// Get key results by objective (with auth)
router.get('/key-results/by-objective/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const objectiveId = parseInt(req.params.id);
    const keyResults = await storage.getKeyResultsByObjective(objectiveId);
    res.json(keyResults);
  } catch (error) {
    console.error('Error fetching key results (bypass):', error);
    res.status(500).json({ error: 'Failed to fetch key results' });
  }
});

// Get key results for objective
router.get('/objectives/:id/key-results', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const objectiveId = parseInt(req.params.id);
    const keyResults = await storage.getKeyResultsByObjective(objectiveId);
    res.json(keyResults);
  } catch (error) {
    console.error('Error fetching key results:', error);
    res.status(500).json({ error: 'Failed to fetch key results' });
  }
});

// Get single key result
router.get('/key-results/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const keyResultId = parseInt(req.params.id);
    const keyResult = await storage.getKeyResult(keyResultId);
    
    if (!keyResult) {
      return res.status(404).json({ error: 'Key result not found' });
    }
    
    res.json(keyResult);
  } catch (error) {
    console.error('Error fetching key result:', error);
    res.status(500).json({ error: 'Failed to fetch key result' });
  }
});

// Get single key result (with auth)
router.get('/key-results-bypass/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const keyResultId = parseInt(req.params.id);
    const keyResult = await storage.getKeyResult(keyResultId);
    
    if (!keyResult) {
      return res.status(404).json({ error: 'Key result not found' });
    }
    
    res.json(keyResult);
  } catch (error) {
    console.error('Error fetching key result (bypass):', error);
    res.status(500).json({ error: 'Failed to fetch key result' });
  }
});

// Get activity logs for a key result
router.get('/key-results/:id/activities', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const keyResultId = parseInt(req.params.id);
    const organizationId = req.user?.organizationId || 3;
    
    // Verify key result exists and belongs to user's organization
    const keyResult = await storage.getKeyResult(keyResultId);
    if (!keyResult) {
      return res.status(404).json({ error: 'Key result not found' });
    }
    
    // Get all activity logs for the organization
    const allLogs = await storage.getActivityLogs(organizationId, {
      limit: 100
    });
    
    // Filter for this specific key result - includes both direct key result logs and related activities
    const keyResultLogs = allLogs.filter(log => {
      // Direct entity match for key result logs
      if (log.entityType === 'key_result' && log.entityId === keyResultId) {
        return true;
      }
      
      // Metadata keyResultId match for related logs
      try {
        if (log.metadata) {
          const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
          return metadata.keyResultId === keyResultId || metadata.keyResultId === String(keyResultId);
        }
      } catch (e) {
        // Ignore JSON parse errors and continue
      }
      
      return false;
    });
    
    // Transform database format to frontend expected format
    const transformedLogs = keyResultLogs.map(log => ({
      id: log.id,
      entityType: log.entityType,
      entityId: log.entityId,
      userId: log.userId,
      action: log.actionType === 'creation' ? 'created' : 
              log.actionType === 'status_change' ? 'status_changed' :
              log.actionType === 'kpi_update' ? 'progress_updated' :
              log.actionType === 'deletion' ? 'deleted' :
              log.actionType,
      metadata: typeof log.metadata === 'string' ? JSON.parse(log.metadata || '{}') : (log.metadata || {}),
      notes: log.description,
      createdAt: log.createdAt,
      user: {
        id: log.userId,
        fullName: (log as any).userName || 'Unknown User',
        email: 'user@aimee.works'
      }
    }));
    
    res.json(transformedLogs);
  } catch (error) {
    console.error('Error fetching key result activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// Get KPI history for a key result
router.get('/key-results/:id/kpi-history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const keyResultId = parseInt(req.params.id);
    const snapshots = await storage.getKeyResultSnapshots(keyResultId);
    
    // Transform snapshots into graph-friendly format
    const history = snapshots.map((snapshot: any) => ({
      date: snapshot.snapshotDate,
      value: parseFloat(snapshot.currentValue),
      target: parseFloat(snapshot.targetValue),
      meetingId: snapshot.checkInMeetingId,
      status: snapshot.status
    }));
    
    res.json(history);
  } catch (error) {
    console.error('Failed to fetch KPI history:', error);
    res.status(500).json({ error: 'Failed to fetch KPI history' });
  }
});

// Add comment to a key result
router.post('/key-results/:id/comments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const keyResultId = parseInt(req.params.id);
    const { comment, meetingId } = req.body;
    const userId = req.user?.id;
    const organizationId = req.user?.organizationId || 3;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!comment?.trim()) {
      return res.status(400).json({ error: 'Comment is required' });
    }
    
    const newComment = await storage.createKeyResultComment({
      keyResultId,
      meetingId: meetingId || null,
      userId,
      comment: comment.trim()
    });
    
    // Create activity log entry for the comment
    await storage.logActivity({
      organizationId,
      userId,
      actionType: 'comment',
      entityType: 'key_result',
      entityId: keyResultId,
      description: comment.trim(),
      metadata: meetingId ? { meetingId } : undefined
    });
    
    res.json(newComment);
  } catch (error) {
    console.error('Failed to add comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Get comments for a key result
router.get('/key-results/:id/comments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const keyResultId = parseInt(req.params.id);
    const comments = await storage.getKeyResultComments(keyResultId);
    res.json(comments);
  } catch (error) {
    console.error('Failed to fetch comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Create key result
router.post('/key-results', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const data = createKeyResultSchema.parse(req.body);
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    
    const keyResult = await storage.createKeyResult({
      organizationId,
      objectiveId: data.objectiveId,
      title: data.title,
      description: data.description,
      targetValue: data.targetValue,
      currentValue: data.currentValue,
      type: data.type,
      status: data.status,
      knowledgeDocumentId: data.knowledgeDocumentId,
      ownerId: data.ownerId || userId,
      createdBy: userId,
      // TODO: Removed fields in migration 002 - may need to revisit for timeline/unit tracking
      // unit: data.unit, // REMOVED in migration 002
      // startDate: data.startDate || null, // REMOVED in migration 002
      // endDate: data.endDate || null, // REMOVED in migration 002
    });
    
    // Log activity
    await storage.logActivity({
      organizationId,
      userId,
      actionType: 'creation',
      entityType: 'key_result',
      entityId: keyResult.id,
      description: `Created key result: ${data.title}`,
      metadata: { title: data.title, objectiveId: data.objectiveId },
    });
    
    res.status(201).json(keyResult);
  } catch (error) {
    console.error('Error creating key result:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create key result' });
  }
});

// Update key result
router.put('/key-results/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const keyResultId = parseInt(req.params.id);
    const data = createKeyResultSchema.partial().parse(req.body);
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    
    // Get the current key result to compare changes
    const oldKeyResult = await storage.getKeyResult(keyResultId);
    
    const keyResult = await storage.updateKeyResult(keyResultId, {
      ...data,
      updatedAt: new Date(),
      // TODO: Removed fields in migration 002 - may need to revisit for timeline tracking
      // startDate: data.startDate || null, // REMOVED in migration 002
      // endDate: data.endDate || null, // REMOVED in migration 002
    });
    
    if (!keyResult) {
      return res.status(404).json({ error: 'Key result not found' });
    }
    
    // Log activity for significant changes
    const changes: string[] = [];
    
    if (data.currentValue !== undefined && oldKeyResult && data.currentValue !== oldKeyResult.currentValue) {
      changes.push(`Updated progress from ${oldKeyResult.currentValue} to ${data.currentValue}`);
      await storage.logActivity({
        organizationId,
        userId,
        actionType: 'kpi_update',
        entityType: 'key_result',
        entityId: keyResultId,
        description: `Updated progress from ${oldKeyResult.currentValue} to ${data.currentValue}`,
        metadata: { 
          oldValue: oldKeyResult.currentValue, 
          newValue: data.currentValue,
          title: keyResult.title 
        }
      });
    }
    
    if (data.status !== undefined && oldKeyResult && data.status !== oldKeyResult.status) {
      changes.push(`Changed status from "${oldKeyResult.status}" to "${data.status}"`);
      await storage.logActivity({
        organizationId,
        userId,
        actionType: 'status_change',
        entityType: 'key_result',
        entityId: keyResultId,
        description: `Changed status from "${oldKeyResult.status}" to "${data.status}"`,
        metadata: { 
          oldStatus: oldKeyResult.status, 
          newStatus: data.status,
          title: keyResult.title 
        }
      });
    }
    
    if (data.title !== undefined && oldKeyResult && data.title !== oldKeyResult.title) {
      changes.push(`Updated title from "${oldKeyResult.title}" to "${data.title}"`);
    }
    
    res.json(keyResult);
  } catch (error) {
    console.error('Error updating key result:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update key result' });
  }
});

// Get key result dependencies
router.get('/key-results/:id/dependencies', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const keyResultId = parseInt(req.params.id);
    const dependencies = await storage.getKeyResultDependencies(keyResultId);
    res.json(dependencies);
  } catch (error) {
    console.error('Error fetching key result dependencies:', error);
    res.status(500).json({ error: 'Failed to fetch dependencies' });
  }
});

// Delete key result
router.delete('/key-results/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const keyResultId = parseInt(req.params.id);
    const cascade = req.query.cascade === 'true';
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    
    // Check if key result exists first
    const keyResult = await storage.getKeyResult(keyResultId);
    if (!keyResult) {
      return res.status(404).json({ error: 'Key result not found' });
    }
    
    // Check for dependencies if not cascading
    if (!cascade) {
      const dependencies = await storage.getKeyResultDependencies(keyResultId);
      if (dependencies.totalCount > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete key result',
          message: `This key result has ${dependencies.tasks.length} task(s) and ${dependencies.workItems.length} work item(s). Use cascade=true to delete all dependencies.`,
          dependencies
        });
      }
    }
    
    // Delete the key result (with or without cascade)
    const deleted = cascade 
      ? await storage.cascadeDeleteKeyResult(keyResultId)
      : await storage.deleteKeyResult(keyResultId);
    
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete key result' });
    }
    
    // Log activity with cascade information
    await storage.logActivity({
      organizationId,
      userId,
      actionType: 'deletion',
      entityType: 'key_result',
      entityId: keyResultId,
      description: cascade 
        ? `Key result "${keyResult.title}" and all dependencies were deleted`
        : `Key result "${keyResult.title}" was deleted`,
      metadata: { 
        title: keyResult.title, 
        deletedBy: userId,
        cascade
      }
    });
    
    res.json({ success: true, message: 'Key result deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting key result:', error);
    
    // Check for foreign key constraint violations
    if (error.code === '23503') {
      // PostgreSQL foreign key violation error code
      if (error.constraint?.includes('activity_logs')) {
        return res.status(400).json({ 
          error: 'Cannot delete key result',
          message: 'This key result has associated activity logs. Delete related activities first or archive the key result instead.',
          constraint: 'activity_logs'
        });
      } else if (error.constraint?.includes('key_result_tasks') || error.constraint?.includes('task')) {
        return res.status(400).json({ 
          error: 'Cannot delete key result',
          message: 'This key result has associated tasks. Delete all tasks first.',
          constraint: 'tasks'
        });
      } else {
        return res.status(400).json({ 
          error: 'Cannot delete key result',
          message: 'This key result has dependencies that must be removed first.',
          constraint: error.constraint
        });
      }
    }
    
    res.status(500).json({ error: 'Failed to delete key result', message: error.message });
  }
});

// Update key result progress
router.post('/key-results/:id/progress', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const keyResultId = parseInt(req.params.id);
    const data = updateProgressSchema.parse(req.body);
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    
    const keyResult = await storage.updateKeyResult(keyResultId, {
      currentValue: data.currentValue,
      updatedAt: new Date(),
    });
    
    if (!keyResult) {
      return res.status(404).json({ error: 'Key result not found' });
    }
    
    // Log activity
    await storage.logActivity({
      organizationId,
      userId,
      actionType: 'kpi_update',
      entityType: 'key_result',
      entityId: keyResultId,
      description: `Updated progress to ${data.currentValue}`,
      metadata: { 
        currentValue: data.currentValue,
        notes: data.notes 
      },
    });
    
    res.json(keyResult);
  } catch (error) {
    console.error('Error updating progress:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Get tasks by key result (with auth)
router.get('/tasks/by-key-result/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const keyResultId = parseInt(req.params.id);
    const tasks = await storage.getKeyResultTasks(keyResultId);
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks (bypass):', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get all key results (with auth) - for Tasks page filtering
router.get('/key-results-bypass', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }
    const keyResults = await storage.getAllKeyResults(organizationId);
    res.json(keyResults);
  } catch (error) {
    console.error('Error fetching key results (bypass):', error);
    res.status(500).json({ error: 'Failed to fetch key results' });
  }
});

// Get all tasks (with auth) - for Tasks page with relationship data
router.get('/tasks-bypass', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }
    const tasks = await storage.getAllTasks(organizationId);
    
    // Enrich tasks with objective and key result titles
    const enrichedTasks = await Promise.all(
      tasks.map(async (task) => {
        if (task.keyResultId) {
          const keyResult = await storage.getKeyResult(task.keyResultId);
          if (keyResult && keyResult.objectiveId) {
            const objective = await storage.getObjective(keyResult.objectiveId);
            return {
              ...task,
              keyResultTitle: keyResult.title,
              objectiveTitle: objective?.title,
              objectiveId: keyResult.objectiveId
            };
          }
        }
        return {
          ...task,
          keyResultTitle: null,
          objectiveTitle: null,
          objectiveId: null
        };
      })
    );
    
    res.json(enrichedTasks);
  } catch (error) {
    console.error('Error fetching all tasks (bypass):', error);
    res.status(500).json({ error: 'Failed to fetch all tasks' });
  }
});


// Create task
router.post('/tasks', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const data = createTaskSchema.parse(req.body);
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    
    const task = await storage.createKeyResultTask({
      organizationId,
      keyResultId: data.keyResultId,
      title: data.title,
      description: data.description,
      status: data.status,
      targetCompletion: data.targetCompletion ? new Date(data.targetCompletion) : null,
      assignedTo: data.assignedTo || userId,
      createdBy: userId,
      // TODO: Removed field in migration 003 - may need to revisit for task prioritization
      // priority: data.priority, // REMOVED in migration 003
    });
    
    // Log activity
    await storage.logActivity({
      organizationId,
      userId,
      actionType: 'creation',
      entityType: 'task',
      entityId: task.id,
      description: `Created task: ${data.title}`,
      metadata: { title: data.title, keyResultId: data.keyResultId },
    });
    
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/tasks/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const data = createTaskSchema.partial().parse(req.body);
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    
    const task = await storage.updateKeyResultTask(taskId, {
      ...data,
      targetCompletion: data.targetCompletion ? new Date(data.targetCompletion) : null,
      updatedAt: new Date(),
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Log activity
    await storage.logActivity({
      organizationId,
      userId,
      actionType: data.status === 'Completed' ? 'completion' : 'status_change',
      entityType: 'task',
      entityId: taskId,
      description: `Task status updated to: ${data.status}`,
      metadata: { status: data.status },
    });
    
    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// ======= KEY RESULT TASKS API ROUTES (RECURRING SUPPORT) =======

// Schema for creating Key Result Tasks with recurring functionality
const createKeyResultTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  isRecurring: z.boolean().default(false),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']).optional(),
  frequencyParams: z.any().optional(), // JSON params for frequency configuration
  endDate: z.string().optional(),
  totalOccurrences: z.number().optional(),
  teamId: z.number().optional(),
  assignedTo: z.number().optional(),
  status: z.enum(['Not Started', 'On Track', 'Stuck', 'Completed']).default('Not Started'),
  targetCompletion: z.string().optional(), // For one-time tasks
  nextDueDate: z.string().optional(), // For recurring tasks
});

// Get Key Result Tasks for a specific Key Result
router.get('/key-results/:id/tasks', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const keyResultId = parseInt(req.params.id);
    const tasks = await storage.getKeyResultTasks(keyResultId);
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching key result tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create a new Key Result Task
router.post('/key-results/:id/tasks', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const keyResultId = parseInt(req.params.id);
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    
    const data = createKeyResultTaskSchema.parse(req.body);
    
    // Get the key result to inherit team/assignee if not provided
    const keyResult = await storage.getKeyResult(keyResultId);
    if (!keyResult) {
      return res.status(404).json({ error: 'Key result not found' });
    }
    
    // Validate recurring task configuration
    if (data.isRecurring) {
      // Ensure next due date is set and reasonable
      const nextDue = data.nextDueDate ? new Date(data.nextDueDate) : new Date();
      const maxFuture = new Date();
      maxFuture.setDate(maxFuture.getDate() + 60); // Max 60 days ahead
      
      if (nextDue > maxFuture) {
        return res.status(400).json({ 
          error: 'Next due date cannot be more than 60 days in the future' 
        });
      }
      
      // Check end date vs next due date
      if (data.endDate && new Date(data.endDate) < nextDue) {
        return res.status(400).json({ 
          error: 'End date cannot be before next due date' 
        });
      }
      
      // Ensure frequency is set
      if (!data.frequency) {
        return res.status(400).json({ 
          error: 'Recurring tasks must have a frequency' 
        });
      }
    }
    
    const task = await storage.createKeyResultTask({
      organizationId,
      keyResultId,
      title: data.title,
      description: data.description,
      status: data.status,
      isRecurring: data.isRecurring,
      frequency: data.frequency,
      frequencyParams: data.frequencyParams,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      totalOccurrences: data.totalOccurrences,
      teamId: data.teamId || keyResult.teamId,
      assignedTo: data.assignedTo || keyResult.assignedTo || keyResult.ownerId,
      targetCompletion: data.targetCompletion ? new Date(data.targetCompletion) : undefined,
      nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : data.isRecurring ? new Date() : undefined,
      generationStatus: data.isRecurring ? 'active' : undefined,
      completedCount: 0,
      missedCount: 0,
      currentStreak: 0,
      longestStreak: 0,
      createdBy: userId,
    });
    
    // If it's a one-time task, generate the work item immediately
    if (!data.isRecurring) {
      const { workItemGenerator } = await import('../services/workItemGenerator.js');
      try {
        const workItem = await workItemGenerator.generateOneTimeWorkItem(task.id, userId);
        console.log('Generated work item for one-time task:', workItem.id);
      } catch (err) {
        console.error('Failed to generate work item:', err);
      }
    }
    
    // Log activity
    await logActivity(
      organizationId,
      userId,
      'creation',
      'key_result_task',
      task.id,
      `Created ${data.isRecurring ? 'recurring' : 'one-time'} task: ${data.title}`,
      { 
        title: data.title, 
        keyResultId, 
        isRecurring: data.isRecurring,
        frequency: data.frequency 
      }
    );
    
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating key result task:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update a Key Result Task
router.patch('/strategy/tasks/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const updates = req.body;
    const userId = req.user?.id || 7;
    
    console.log(`📝 Updating task ${taskId} with updates:`, updates);
    
    // Get the task before updating to compare values
    const previousTask = await storage.getKeyResultTask(taskId);
    
    if (!previousTask) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Update the task
    const task = await storage.updateKeyResultTask(taskId, updates);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Sync team and assignee changes to generated work items
    // Compare actual values, not just request payload
    const workItemUpdates: any = {};
    let syncRequired = false;
    
    if (previousTask.teamId !== task.teamId) {
      console.log(`🔄 Team ID changed from ${previousTask.teamId} to ${task.teamId}`);
      workItemUpdates.teamId = task.teamId;
      syncRequired = true;
    }
    
    if (previousTask.assignedTo !== task.assignedTo) {
      console.log(`🔄 Assignee changed from ${previousTask.assignedTo} to ${task.assignedTo}`);
      workItemUpdates.assignedTo = task.assignedTo;
      syncRequired = true;
    }
    
    if (syncRequired) {
      console.log(`🔍 Syncing required, looking for work items for task ${taskId}`);
      // Get all work items generated from this task
      const workItemsToSync = await db.select()
        .from(workItems)
        .where(eq(workItems.keyResultTaskId, taskId));
      
      console.log(`📊 Found ${workItemsToSync.length} work items to sync`);
      
      if (workItemsToSync.length > 0) {
        // Update all work items with the new values
        workItemUpdates.updatedAt = new Date();
        
        console.log(`✅ Updating work items with:`, workItemUpdates);
        
        await db.update(workItems)
          .set(workItemUpdates)
          .where(eq(workItems.keyResultTaskId, taskId));
        
        console.log(`✅ Successfully synced ${workItemsToSync.length} work items`);
        
        // Log the sync activity
        await storage.logActivity({
          organizationId: task.organizationId,
          userId,
          actionType: 'agent_action',
          entityType: 'work_item',
          entityId: workItemsToSync[0].id,
          description: `Auto-synced ${workItemsToSync.length} work item(s) from task update`,
          metadata: {
            taskId,
            taskTitle: task.title,
            updates: workItemUpdates,
            affectedWorkItems: workItemsToSync.map(w => w.id)
          }
        });
      } else {
        console.log(`ℹ️ No work items found to sync for task ${taskId}`);
      }
    } else {
      console.log(`ℹ️ No sync required for task ${taskId} (no team or assignee changes)`);
    }
    
    // Log activity
    const changeDescriptions = [];
    if (updates.status) changeDescriptions.push(`status to ${updates.status}`);
    if (updates.title) changeDescriptions.push('title');
    if (updates.description !== undefined) changeDescriptions.push('description');
    if (updates.assignedTo) changeDescriptions.push('assignee');
    if (updates.teamId) changeDescriptions.push('team');
    if (updates.targetCompletion) changeDescriptions.push('due date');
    
    await logActivity(
      task.organizationId,
      userId,
      updates.status ? 'status_change' : 'agent_action',
      'key_result_task',
      taskId,
      changeDescriptions.length > 0 
        ? `Updated task: ${changeDescriptions.join(', ')}` 
        : `Updated task: ${task.title}`,
      updates
    );
    
    res.json(task);
  } catch (error) {
    console.error('Error updating key result task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete a Key Result Task
router.delete('/strategy/tasks/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const userId = req.user?.id || 7;
    
    // Get task details before deletion
    const task = await storage.getKeyResultTask(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const deleted = await storage.deleteKeyResultTask(taskId);
    if (!deleted) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Log activity
    await storage.logActivity({
      organizationId: task.organizationId,
      userId,
      actionType: 'deletion',
      entityType: 'key_result_task',
      entityId: taskId,
      description: `Deleted task: ${task.title}`,
      metadata: { title: task.title, keyResultId: task.keyResultId },
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting key result task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Generate work items for upcoming recurring tasks (manual trigger for testing)
router.post('/tasks/generate-work-items', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { lookaheadDays = 7 } = req.body;
    const userId = req.user?.id || 7;
    
    const { workItemGenerator } = await import('../services/workItemGenerator.js');
    const report = await workItemGenerator.generateUpcomingWorkItems(lookaheadDays);
    
    // Log activity
    await storage.logActivity({
      organizationId: req.user?.organizationId || 3,
      userId,
      actionType: 'generation',
      entityType: 'work_item',
      entityId: 0,
      description: `Generated ${report.created} work items from recurring tasks`,
      metadata: report,
    });
    
    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Error generating work items:', error);
    res.status(500).json({ error: 'Failed to generate work items' });
  }
});

// ======= END KEY RESULT TASKS API ROUTES =======

// Schema for creating/updating check-in cycles
const createCheckInCycleSchema = z.object({
  teamId: z.number().optional().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(['Planning', 'In Progress', 'Review', 'Completed']).optional(),
  notes: z.string().optional().nullable(),
  // Legacy fields - optional and will be stripped
  objectiveId: z.number().optional().nullable(),
  frequency: z.string().optional(),
});

const updateCheckInCycleSchema = z.object({
  teamId: z.number().optional().nullable(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['Planning', 'In Progress', 'Review', 'Completed']).optional(),
  notes: z.string().optional().nullable(),
});

// Get check-in cycles with overlap filtering
router.get('/check-in-cycles', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;
    const { overlapsStart, overlapsEnd, teamId } = req.query;
    
    // If overlap params provided, use overlap query
    if (overlapsStart && overlapsEnd) {
      const cycles = await storage.getCheckInCyclesByOverlap(
        organizationId,
        overlapsStart as string,
        overlapsEnd as string,
        teamId ? parseInt(teamId as string) : undefined
      );
      res.json(cycles);
    } else {
      // Fall back to regular list
      const cycles = await storage.getCheckInCycles(organizationId);
      res.json(cycles);
    }
  } catch (error) {
    console.error('Error fetching check-in cycles:', error);
    res.status(500).json({ error: 'Failed to fetch check-in cycles' });
  }
});

// Create check-in cycle
router.post('/check-in-cycles', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;
    const data = createCheckInCycleSchema.parse(req.body);
    
    // Strip legacy fields and log if present
    const { objectiveId, frequency, ...cycleData } = data;
    if (objectiveId || frequency) {
      console.warn('Legacy fields in POST /check-in-cycles:', { objectiveId, frequency });
    }
    
    const cycle = await storage.createCheckInCycle({
      organizationId,
      teamId: cycleData.teamId,
      startDate: cycleData.startDate,
      endDate: cycleData.endDate,
      status: cycleData.status || 'Planning',
      notes: cycleData.notes,
    });
    
    res.json(cycle);
  } catch (error) {
    console.error('Error creating check-in cycle:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create check-in cycle' });
  }
});

// Update check-in cycle
router.patch('/check-in-cycles/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const cycleId = parseInt(req.params.id);
    const data = updateCheckInCycleSchema.parse(req.body);
    
    const cycle = await storage.updateCheckInCycle(cycleId, data);
    res.json(cycle);
  } catch (error) {
    console.error('Error updating check-in cycle:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update check-in cycle' });
  }
});

// Update check-in cycle status only
router.put('/check-in-cycles/:id/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const cycleId = parseInt(req.params.id);
    const { status } = z.object({
      status: z.enum(['Planning', 'In Progress', 'Review', 'Completed'])
    }).parse(req.body);
    
    const cycle = await storage.updateCheckInCycleStatus(cycleId, status);
    res.json({ id: cycle.id, status: cycle.status });
  } catch (error) {
    console.error('Error updating check-in cycle status:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid status', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update check-in cycle status' });
  }
});

// Get current check-in cycle
router.get('/check-in-cycles/current', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;
    
    // Get current active cycle (status = 'In Progress' or 'Planning')
    const cycles = await storage.getCheckInCycles(organizationId);
    
    // Find the most recent active cycle
    const currentCycle = cycles.find(cycle => 
      cycle.status === 'In Progress' || cycle.status === 'Planning'
    ) || cycles[0]; // Fallback to most recent cycle
    
    res.json(currentCycle || null);
  } catch (error) {
    console.error('Error fetching current check-in cycle:', error);
    res.status(500).json({ error: 'Failed to fetch current check-in cycle' });
  }
});

// Bulk upsert cycle participants
router.post('/check-in-cycle-participants/bulk', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const participantsSchema = z.array(z.object({
      cycleId: z.number(),
      userId: z.number(),
      role: z.enum(['Leader', 'Member', 'Watcher'])
    }));
    
    const participants = participantsSchema.parse(req.body);
    
    const result = await storage.bulkUpsertCycleParticipants(
      participants.map(p => ({
        checkInCycleId: p.cycleId,
        userId: p.userId,
        role: p.role,
      }))
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error upserting cycle participants:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to upsert cycle participants' });
  }
});

// ========================================
// CHECK-IN MEETINGS API (Phase-1)
// ========================================

// Schema for check-in meeting status updates

// Schema for work item target meeting updates
const updateWorkItemMeetingSchema = z.object({
  targetMeetingId: z.number().nullable()
});

// Schema for meeting item updates
const createMeetingItemUpdateSchema = z.object({
  workItemId: z.number().optional(),
  keyResultId: z.number().optional(),
  objectiveId: z.number().optional(),
  updateType: z.enum(['progress', 'status_change', 'notes', 'completion']),
  previousValue: z.any().optional(),
  newValue: z.any().optional(),
  notes: z.string().optional()
});

// GET /api/strategy/check-in-meetings - List meetings with auto-generation
router.get('/check-in-meetings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;
    const { teamId, start, end } = req.query;
    
    // Parse dates
    const startDate = start ? new Date(start as string) : new Date();
    const endDate = end ? new Date(end as string) : new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000);
    
    let meetings;
    
    if (teamId) {
      // Auto-generate meetings if none exist for the team
      const teamIdNum = parseInt(teamId as string);
      const generated = await ensureTeamMeetings(teamIdNum, startDate, endDate);
      console.log(`Auto-generated ${generated} meetings for team ${teamIdNum}`);
      
      // Fetch meetings for specific team
      meetings = await db
        .select()
        .from(checkInMeetings)
        .where(
          and(
            eq(checkInMeetings.organizationId, organizationId),
            eq(checkInMeetings.teamId, teamIdNum),
            gte(checkInMeetings.scheduledDate, startDate),
            lte(checkInMeetings.scheduledDate, endDate)
          )
        )
        .orderBy(checkInMeetings.scheduledDate);
    } else {
      // Fetch all meetings for organization
      meetings = await db
        .select()
        .from(checkInMeetings)
        .where(
          and(
            eq(checkInMeetings.organizationId, organizationId),
            gte(checkInMeetings.scheduledDate, startDate),
            lte(checkInMeetings.scheduledDate, endDate)
          )
        )
        .orderBy(checkInMeetings.scheduledDate);
    }
    
    // Dedupe meetings in-memory by (teamId, scheduledDate) as a belt-and-braces
    const deduped = new Map<string, any>();
    meetings.forEach((meeting: any) => {
      const key = `${meeting.teamId}-${new Date(meeting.scheduledDate).toISOString()}`;
      if (!deduped.has(key)) {
        deduped.set(key, meeting);
      }
    });
    
    // Get attendance records for completed meetings
    const dedupedMeetings = Array.from(deduped.values());
    const meetingIds = dedupedMeetings
      .filter((m: any) => m.status === 'Completed')
      .map((m: any) => m.id);
    
    let attendanceRecords: any[] = [];
    if (meetingIds.length > 0) {
      attendanceRecords = await db
        .select()
        .from(meetingAttendees)
        .where(inArray(meetingAttendees.meetingId, meetingIds));
    }
    
    // Attach attendance to meetings
    const meetingsWithAttendance = dedupedMeetings.map((meeting: any) => ({
      ...meeting,
      attendees: attendanceRecords.filter((a: any) => a.meetingId === meeting.id)
    }));
    
    res.json(meetingsWithAttendance);
  } catch (error) {
    console.error('Error fetching check-in meetings:', error);
    res.status(500).json({ error: 'Failed to fetch check-in meetings' });
  }
});

// GET /api/strategy/check-in-meetings/:id - Get a specific meeting by ID
router.get('/check-in-meetings/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const meetingId = parseInt(req.params.id);
    const organizationId = req.user?.organizationId || 3;
    
    // Fetch the specific meeting
    const meetings = await db
      .select()
      .from(checkInMeetings)
      .where(
        and(
          eq(checkInMeetings.id, meetingId),
          eq(checkInMeetings.organizationId, organizationId)
        )
      )
      .limit(1);
      
    if (!meetings.length) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    const meeting = meetings[0];
    
    // Fetch team information separately if needed
    let team = null;
    if (meeting.teamId) {
      const teamResult = await db
        .select()
        .from(teams)
        .where(eq(teams.id, meeting.teamId))
        .limit(1);
      
      if (teamResult.length) {
        team = teamResult[0];
      }
    }
    
    // Return meeting with team info
    res.json({
      ...meeting,
      team
    });
  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({ error: 'Failed to fetch meeting' });
  }
});

// POST /api/strategy/check-in-meetings/:id/start - Start a meeting
router.post('/check-in-meetings/:id/start', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const meetingId = parseInt(req.params.id);
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    
    // Check meeting exists and belongs to user's organization
    const existingMeeting = await db
      .select()
      .from(checkInMeetings)
      .where(
        and(
          eq(checkInMeetings.id, meetingId),
          eq(checkInMeetings.organizationId, organizationId)
        )
      )
      .limit(1);
      
    if (!existingMeeting.length) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    // Initialize metadata with start information
    const metadata = {
      ...(existingMeeting[0].agenda || {}),
      startedAt: new Date().toISOString(),
      phase: 'review'
    };
    
    // Update meeting to In Progress status with start time
    const updated = await db
      .update(checkInMeetings)
      .set({ 
        status: 'In Progress',
        actualStartTime: new Date(),
        updatedAt: new Date(),
        agenda: metadata
      })
      .where(eq(checkInMeetings.id, meetingId))
      .returning();
    
    // Log activity
    await storage.logActivity({
      organizationId,
      userId,
      actionType: 'status_change',
      entityType: 'check_in_meeting',
      entityId: meetingId,
      description: 'Check-in meeting started',
      metadata: { 
        from_status: existingMeeting[0].status,
        to_status: 'In Progress',
        meetingId
      }
    });
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error starting meeting:', error);
    res.status(500).json({ error: 'Failed to start meeting' });
  }
});

// POST /api/strategy/check-in-meetings/:id/complete - Complete a meeting
router.post('/check-in-meetings/:id/complete', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const meetingId = parseInt(req.params.id);
    const { notes, duration, metadata } = req.body;
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    
    // Check meeting exists and belongs to user's organization
    const existingMeeting = await db
      .select()
      .from(checkInMeetings)
      .where(
        and(
          eq(checkInMeetings.id, meetingId),
          eq(checkInMeetings.organizationId, organizationId)
        )
      )
      .limit(1);
      
    if (!existingMeeting.length) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    // Merge existing metadata with new metadata
    const existingMetadata = existingMeeting[0].agenda || {};
    const updatedMetadata = {
      ...existingMetadata,
      ...metadata,
      duration,
      completedAt: new Date().toISOString()
    };
    
    // Update meeting to Completed status with end time and metadata
    const updated = await db
      .update(checkInMeetings)
      .set({ 
        status: 'Completed',
        actualEndTime: new Date(),
        updatedAt: new Date(),
        agenda: updatedMetadata,
        ...(notes ? { notes } : {})
      })
      .where(eq(checkInMeetings.id, meetingId))
      .returning();
    
    // Find incomplete work items from this meeting
    const incompleteItems = await db
      .select()
      .from(workItems)
      .where(
        and(
          eq(workItems.targetMeetingId, meetingId),
          notInArray(workItems.status, ['Completed', 'Archived'])
        )
      );
    
    // Find the next scheduled meeting for the same team
    const nextMeeting = await db
      .select()
      .from(checkInMeetings)
      .where(
        and(
          eq(checkInMeetings.teamId, existingMeeting[0].teamId),
          eq(checkInMeetings.status, 'Planning'),
          gt(checkInMeetings.scheduledDate, new Date())
        )
      )
      .orderBy(asc(checkInMeetings.scheduledDate))
      .limit(1);
    
    // If there's a next meeting and incomplete items, carry them forward
    let carriedForwardCount = 0;
    if (nextMeeting.length > 0 && incompleteItems.length > 0) {
      await db
        .update(workItems)
        .set({ 
          targetMeetingId: nextMeeting[0].id,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(workItems.targetMeetingId, meetingId),
            notInArray(workItems.status, ['Completed', 'Archived'])
          )
        );
      
      carriedForwardCount = incompleteItems.length;
      
      // Log the carryover activity
      await storage.logActivity({
        organizationId,
        userId,
        actionType: 'bulk_update',
        entityType: 'work_items',
        entityId: nextMeeting[0].id,
        description: `${carriedForwardCount} incomplete items carried forward to next meeting`,
        metadata: { 
          fromMeetingId: meetingId,
          toMeetingId: nextMeeting[0].id,
          itemCount: carriedForwardCount,
          items: incompleteItems.map(i => ({ id: i.id, title: i.title, status: i.status }))
        }
      });
    }
    
    // Log meeting completion activity
    await storage.logActivity({
      organizationId,
      userId,
      actionType: 'status_change',
      entityType: 'check_in_meeting',
      entityId: meetingId,
      description: 'Check-in meeting completed',
      metadata: { 
        from_status: existingMeeting[0].status,
        to_status: 'Completed',
        meetingId,
        changes: metadata?.changes?.length || 0,
        feedback: metadata?.feedback,
        carriedForwardCount,
        nextMeetingId: nextMeeting[0]?.id || null
      }
    });
    
    // Return updated meeting with carryover info
    res.json({
      ...updated[0],
      carryoverInfo: {
        itemsCarriedForward: carriedForwardCount,
        nextMeetingId: nextMeeting[0]?.id || null,
        nextMeetingDate: nextMeeting[0]?.scheduledDate || null
      }
    });
  } catch (error) {
    console.error('Error completing meeting:', error);
    res.status(500).json({ error: 'Failed to complete meeting' });
  }
});

// GET /api/strategy/meetings/:id/snapshots - Get Key Result snapshots for a meeting
router.get('/meetings/:id/snapshots', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const meetingId = parseInt(req.params.id);
    const organizationId = req.user?.organizationId || 3;
    
    // Verify meeting belongs to user's organization
    const meeting = await db
      .select()
      .from(checkInMeetings)
      .where(
        and(
          eq(checkInMeetings.id, meetingId),
          eq(checkInMeetings.organizationId, organizationId)
        )
      )
      .limit(1);
      
    if (!meeting.length) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    // Get all snapshots for this meeting with Key Result details
    const snapshots = await db
      .select({
        snapshot: keyResultSnapshots,
        keyResult: keyResults,
        objective: objectives
      })
      .from(keyResultSnapshots)
      .leftJoin(keyResults, eq(keyResultSnapshots.keyResultId, keyResults.id))
      .leftJoin(objectives, eq(keyResults.objectiveId, objectives.id))
      .where(eq(keyResultSnapshots.checkInMeetingId, meetingId))
      .orderBy(keyResultSnapshots.keyResultId);
    
    // Get previous meeting snapshots for comparison
    const previousMeeting = await db
      .select()
      .from(checkInMeetings)
      .where(
        and(
          eq(checkInMeetings.teamId, meeting[0].teamId),
          eq(checkInMeetings.organizationId, organizationId),
          eq(checkInMeetings.status, 'Completed'),
          sql`${checkInMeetings.scheduledDate} < ${meeting[0].scheduledDate}`
        )
      )
      .orderBy(desc(checkInMeetings.scheduledDate))
      .limit(1);
    
    let previousSnapshots: any[] = [];
    if (previousMeeting.length > 0) {
      previousSnapshots = await db
        .select()
        .from(keyResultSnapshots)
        .where(eq(keyResultSnapshots.checkInMeetingId, previousMeeting[0].id));
    }
    
    // Enrich snapshots with delta calculations
    const enrichedSnapshots = snapshots.map(({ snapshot, keyResult, objective }) => {
      const previousSnapshot = previousSnapshots.find(
        ps => ps.keyResultId === snapshot.keyResultId
      );
      
      const currentValue = parseFloat(snapshot.currentValue || '0');
      const previousValue = previousSnapshot ? parseFloat(previousSnapshot.currentValue || '0') : null;
      const delta = previousValue !== null ? currentValue - previousValue : null;
      const percentChange = previousValue && previousValue !== 0 
        ? ((currentValue - previousValue) / previousValue) * 100 
        : null;
      
      return {
        id: snapshot.id,
        keyResultId: snapshot.keyResultId,
        keyResultTitle: keyResult?.title || snapshot.title,
        objectiveTitle: objective?.title,
        currentValue: snapshot.currentValue,
        targetValue: snapshot.targetValue,
        status: snapshot.status,
        type: snapshot.type,
        snapshotDate: snapshot.snapshotDate,
        delta,
        percentChange,
        previousValue: previousSnapshot?.currentValue || null
      };
    });
    
    res.json(enrichedSnapshots);
  } catch (error) {
    console.error('Failed to fetch meeting snapshots:', error);
    res.status(500).json({ error: 'Failed to fetch meeting snapshots' });
  }
});

// GET /api/strategy/meetings/:id/key-result-comments - Get Key Result comments for a meeting
router.get('/meetings/:id/key-result-comments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const meetingId = parseInt(req.params.id);
    const organizationId = req.user?.organizationId || 3;
    
    // Verify meeting belongs to user's organization
    const meeting = await db
      .select()
      .from(checkInMeetings)
      .where(
        and(
          eq(checkInMeetings.id, meetingId),
          eq(checkInMeetings.organizationId, organizationId)
        )
      )
      .limit(1);
      
    if (!meeting.length) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    // Get all comments for this meeting with Key Result and user details
    const comments = await db
      .select({
        comment: keyResultComments,
        keyResult: keyResults,
        user: users
      })
      .from(keyResultComments)
      .leftJoin(keyResults, eq(keyResultComments.keyResultId, keyResults.id))
      .leftJoin(users, eq(keyResultComments.userId, users.id))
      .where(eq(keyResultComments.meetingId, meetingId))
      .orderBy(keyResultComments.keyResultId, desc(keyResultComments.createdAt));
    
    // Group comments by Key Result
    const groupedComments = comments.reduce((acc: any, { comment, keyResult, user }) => {
      const krId = comment.keyResultId;
      if (!acc[krId]) {
        acc[krId] = {
          keyResultId: krId,
          keyResultTitle: keyResult?.title || 'Unknown',
          comments: []
        };
      }
      acc[krId].comments.push({
        id: comment.id,
        comment: comment.comment,
        userId: comment.userId,
        userName: user?.fullName || user?.username || 'Unknown',
        createdAt: comment.createdAt
      });
      return acc;
    }, {});
    
    res.json(Object.values(groupedComments));
  } catch (error) {
    console.error('Failed to fetch meeting comments:', error);
    res.status(500).json({ error: 'Failed to fetch meeting comments' });
  }
});

// POST /api/strategy/meetings/:id/seed-items - Seed work items to meeting by assigning eligible team items
router.post('/meetings/:id/seed-items', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const meetingId = parseInt(req.params.id);
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    
    // Get meeting details
    const meeting = await db
      .select()
      .from(checkInMeetings)
      .where(
        and(
          eq(checkInMeetings.id, meetingId),
          eq(checkInMeetings.organizationId, organizationId)
        )
      )
      .limit(1);
    
    if (!meeting.length) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    const targetMeeting = meeting[0];
    
    // Debug: Check all work items for this org
    const allOrgItems = await db
      .select()
      .from(workItems)
      .where(eq(workItems.organizationId, organizationId));
    
    console.log(`Debug - Total work items in org ${organizationId}:`, allOrgItems.length);
    console.log(`Debug - Meeting team ID: ${targetMeeting.teamId}`);
    
    // Find eligible work items for this team that aren't assigned to any meeting
    const eligibleItems = await db
      .select()
      .from(workItems)
      .where(
        and(
          eq(workItems.organizationId, organizationId),
          eq(workItems.teamId, targetMeeting.teamId),
          isNull(workItems.targetMeetingId),
          notInArray(workItems.status, ['Completed', 'Archived'])
        )
      );
    
    console.log(`Debug - Eligible items found: ${eligibleItems.length}`);
    
    // Assign eligible items to this meeting
    let assignedCount = 0;
    if (eligibleItems.length > 0) {
      const itemIds = eligibleItems.map(item => item.id);
      
      await db
        .update(workItems)
        .set({
          targetMeetingId: meetingId,
          updatedAt: new Date()
        })
        .where(inArray(workItems.id, itemIds));
      
      assignedCount = eligibleItems.length;
      
      // Log the activity
      await storage.logActivity({
        organizationId,
        userId,
        actionType: 'bulk_update',
        entityType: 'work_items',
        entityId: meetingId,
        description: `${assignedCount} work items seeded to meeting`,
        metadata: {
          meetingId,
          itemCount: assignedCount,
          items: eligibleItems.map(i => ({ id: i.id, title: i.title, status: i.status }))
        }
      });
    }
    
    res.json({
      success: true,
      assignedCount,
      meetingId,
      teamId: targetMeeting.teamId
    });
  } catch (error) {
    console.error('Error seeding meeting items:', error);
    res.status(500).json({ error: 'Failed to seed meeting items' });
  }
});

// POST /api/strategy/meetings/:id/carry-forward - Manually carry forward items to another meeting
router.post('/meetings/:id/carry-forward', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const meetingId = parseInt(req.params.id);
    const { targetMeetingId, itemIds } = req.body;
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    
    // If no target meeting specified, find the next one
    let actualTargetMeetingId = targetMeetingId;
    
    if (!actualTargetMeetingId) {
      // Get meeting to find its team
      const sourceMeeting = await db
        .select()
        .from(checkInMeetings)
        .where(eq(checkInMeetings.id, meetingId))
        .limit(1);
      
      if (!sourceMeeting.length) {
        return res.status(404).json({ error: 'Source meeting not found' });
      }
      
      // Find next meeting for the team
      const nextMeeting = await db
        .select()
        .from(checkInMeetings)
        .where(
          and(
            eq(checkInMeetings.teamId, sourceMeeting[0].teamId),
            eq(checkInMeetings.status, 'Planning'),
            gt(checkInMeetings.scheduledDate, new Date())
          )
        )
        .orderBy(asc(checkInMeetings.scheduledDate))
        .limit(1);
      
      if (!nextMeeting.length) {
        return res.status(400).json({ error: 'No future meetings found for this team' });
      }
      
      actualTargetMeetingId = nextMeeting[0].id;
    }
    
    // Build the where clause based on whether specific items are provided
    let whereClause;
    if (itemIds && itemIds.length > 0) {
      // Move specific items
      whereClause = inArray(workItems.id, itemIds);
    } else {
      // Move all incomplete items from the meeting
      whereClause = and(
        eq(workItems.targetMeetingId, meetingId),
        notInArray(workItems.status, ['Completed', 'Archived'])
      );
    }
    
    // Update the items
    const result = await db
      .update(workItems)
      .set({ 
        targetMeetingId: actualTargetMeetingId,
        updatedAt: new Date()
      })
      .where(whereClause)
      .returning();
    
    // Log the activity
    if (result.length > 0) {
      await storage.logActivity({
        organizationId,
        userId,
        actionType: 'bulk_update',
        entityType: 'work_items',
        entityId: actualTargetMeetingId,
        description: `${result.length} items manually moved to different meeting`,
        metadata: {
          fromMeetingId: meetingId,
          toMeetingId: actualTargetMeetingId,
          itemCount: result.length,
          itemIds: result.map(i => i.id)
        }
      });
    }
    
    res.json({ 
      movedCount: result.length,
      targetMeetingId: actualTargetMeetingId,
      items: result
    });
  } catch (error) {
    console.error('Error carrying forward items:', error);
    res.status(500).json({ error: 'Failed to carry forward items' });
  }
});

// PATCH /api/strategy/check-in-meetings/:id/notes - Update meeting notes, attendance, and agenda
router.patch('/check-in-meetings/:id/notes', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const meetingId = parseInt(req.params.id);
    const { notes, attendees, agendaItems } = req.body;
    const organizationId = req.user?.organizationId || 3;
    
    // Check meeting exists and belongs to user's organization
    const existingMeeting = await db
      .select()
      .from(checkInMeetings)
      .where(
        and(
          eq(checkInMeetings.id, meetingId),
          eq(checkInMeetings.organizationId, organizationId)
        )
      )
      .limit(1);
      
    if (!existingMeeting.length) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    // Prepare meeting data with agenda items as metadata
    const meetingData: any = { 
      notes,
      updatedAt: new Date()
    };
    
    // Store agenda items in agenda field if provided
    if (agendaItems) {
      meetingData.agenda = { 
        agendaItems,
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Update meeting with notes and metadata
    const updated = await db
      .update(checkInMeetings)
      .set(meetingData)
      .where(eq(checkInMeetings.id, meetingId))
      .returning();
    
    // Update attendees if provided
    if (attendees && typeof attendees === 'object') {
      // First, remove existing attendees for this meeting
      await db
        .delete(meetingAttendees)
        .where(eq(meetingAttendees.meetingId, meetingId));
      
      // Then insert new attendees
      const attendeeRecords = Object.entries(attendees)
        .filter(([_, status]) => status === 'present' || status === 'absent')
        .map(([userId, status]) => ({
          meetingId,
          userId: parseInt(userId),
          attended: status === 'present',
          organizationId
        }));
      
      if (attendeeRecords.length > 0) {
        await db.insert(meetingAttendees).values(attendeeRecords);
      }
    }
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating meeting notes:', error);
    res.status(500).json({ error: 'Failed to update meeting notes' });
  }
});

// POST /api/strategy/check-in-meetings/:id/status - Update meeting status
router.post('/check-in-meetings/:id/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const meetingId = parseInt(req.params.id);
    const { status, reason } = updateMeetingStatusSchema.parse(req.body);
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    
    // Check meeting exists and belongs to user's organization
    const existingMeeting = await db
      .select()
      .from(checkInMeetings)
      .where(
        and(
          eq(checkInMeetings.id, meetingId),
          eq(checkInMeetings.organizationId, organizationId)
        )
      )
      .limit(1);
      
    if (!existingMeeting.length) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    // Update meeting status and store skip reason in notes field
    const updated = await db
      .update(checkInMeetings)
      .set({ 
        status,
        updatedAt: new Date(),
        ...(status === 'In Progress' ? { actualStartTime: new Date() } : {}),
        ...(status === 'Completed' || status === 'Skipped' ? { actualEndTime: new Date() } : {}),
        ...(status === 'Skipped' && reason ? { notes: reason } : {})
      })
      .where(eq(checkInMeetings.id, meetingId))
      .returning();
      
    // If meeting is completed, carry over incomplete items to next meeting
    if (status === 'Completed') {
      console.log(`📸 Meeting ${meetingId} completed - processing carryover items`);
      
      // Find incomplete items from this meeting
      const incompleteItems = await db
        .select()
        .from(workItems)
        .where(
          and(
            eq(workItems.targetMeetingId, meetingId),
            or(
              eq(workItems.status, 'Planning'),
              eq(workItems.status, 'In Progress'),
              eq(workItems.status, 'Stuck')
            )
          )
        );
      
      if (incompleteItems.length > 0) {
        // Find the next scheduled meeting for this team
        const nextMeeting = await db
          .select()
          .from(checkInMeetings)
          .where(
            and(
              eq(checkInMeetings.teamId, existingMeeting[0].teamId),
              eq(checkInMeetings.organizationId, organizationId),
              gt(checkInMeetings.scheduledDate, existingMeeting[0].scheduledDate),
              eq(checkInMeetings.status, 'Planning')
            )
          )
          .orderBy(checkInMeetings.scheduledDate)
          .limit(1);
        
        if (nextMeeting.length > 0) {
          // Update incomplete items to target the next meeting
          await db
            .update(workItems)
            .set({ 
              targetMeetingId: nextMeeting[0].id,
              updatedAt: new Date()
            })
            .where(
              and(
                eq(workItems.targetMeetingId, meetingId),
                or(
                  eq(workItems.status, 'Planning'),
                  eq(workItems.status, 'In Progress'),
                  eq(workItems.status, 'Stuck')
                )
              )
            );
          
          console.log(`✅ Carried over ${incompleteItems.length} items to next meeting ${nextMeeting[0].id}`);
        } else {
          console.log(`⚠️ No future meeting found for team ${existingMeeting[0].teamId} - items remain with current meeting`);
        }
      }
    }
    
    // Log activity with enhanced metadata for skip/cancel
    const previousStatus = existingMeeting[0].status;
    await storage.logActivity({
      organizationId,
      userId,
      actionType: 'status_change',
      entityType: 'check_in_meeting',
      entityId: meetingId,
      description: status === 'Skipped' 
        ? `Check-in meeting skipped/cancelled${reason ? ': ' + reason : ''}`
        : `Check-in meeting status changed to ${status}`,
      metadata: { 
        from_status: previousStatus,
        to_status: status,
        meetingId,
        ...(status === 'Skipped' && reason ? { reason_notes: reason } : {})
      }
    });
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating meeting status:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update meeting status' });
  }
});

// POST /api/strategy/meetings/:meetingId/feedback - Submit individual feedback after meeting
router.post('/meetings/:meetingId/feedback', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const meetingId = parseInt(req.params.meetingId);
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    
    // Validate input for simplified feedback
    const feedbackData = z.object({
      overallRating: z.enum(['poor', 'good', 'great']).optional(),
      itemsForNextCheckIn: z.string().optional()
    }).parse(req.body);
    
    // Check if feedback already exists
    const existing = await storage.getUserFeedback(meetingId, userId);
    if (existing) {
      return res.status(400).json({ error: 'Feedback already submitted for this meeting' });
    }
    
    // Create feedback
    const feedback = await storage.createTeamFeedback({
      organizationId,
      meetingId,
      userId,
      ...feedbackData
    });
    
    res.json(feedback);
  } catch (error) {
    console.error('Error submitting feedback:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid feedback data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// GET /api/strategy/meetings/:meetingId/feedback - Get all feedback for a meeting
router.get('/meetings/:meetingId/feedback', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const meetingId = parseInt(req.params.meetingId);
    const organizationId = req.user?.organizationId || 3;
    
    // Get all feedback for the meeting
    const feedback = await storage.getTeamFeedback(meetingId);
    
    res.json({ feedback });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// GET /api/strategy/meetings/:meetingId/my-feedback - Check if current user has submitted feedback
router.get('/meetings/:meetingId/my-feedback', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const meetingId = parseInt(req.params.meetingId);
    const userId = req.user?.id || 7;
    
    // Get user's feedback
    const feedback = await storage.getUserFeedback(meetingId, userId);
    
    res.json({ 
      hasSubmitted: !!feedback,
      feedback 
    });
  } catch (error) {
    console.error('Error checking user feedback:', error);
    res.status(500).json({ error: 'Failed to check feedback status' });
  }
});

// PATCH /api/strategy/meetings/:id/notes - Update meeting notes with rich text
router.patch('/meetings/:id/notes', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const meetingId = parseInt(req.params.id);
    const { richNotes } = req.body;
    const organizationId = req.user?.organizationId || 3;
    
    // Update meeting with rich notes
    const updated = await storage.updateMeetingRichNotes(meetingId, richNotes);
    
    if (!updated) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating meeting notes:', error);
    res.status(500).json({ error: 'Failed to update meeting notes' });
  }
});

// PATCH /api/work-items/:id - Set/unset target_meeting_id with team validation
router.patch('/work-items/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const workItemId = parseInt(req.params.id);
    const { targetMeetingId } = updateWorkItemMeetingSchema.parse(req.body);
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    const userRole = req.user?.role || 'team_member';
    
    // Get work item to validate team match
    const workItem = await db
      .select({
        id: workItems.id,
        organizationId: workItems.organizationId,
        teamId: workItems.teamId,
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
      
    if (!workItem.length) {
      return res.status(404).json({ error: 'Work item not found' });
    }
    
    // If setting a target meeting, check permissions and validate team match
    if (targetMeetingId) {
      // Check if user is Admin/Super Admin
      const isAdminUser = userRole === 'admin' || userRole === 'super_admin';
      
      // If not admin, check if user is Leader in the team
      if (!isAdminUser && workItem[0].teamId) {
        const teamMembership = await db
          .select()
          .from(teamMembers)
          .where(
            and(
              eq(teamMembers.teamId, workItem[0].teamId),
              eq(teamMembers.userId, userId)
            )
          )
          .limit(1);
        
        const isLeader = teamMembership.length > 0 && teamMembership[0].role === 'Leader';
        
        if (!isLeader) {
          return res.status(403).json({ 
            error: 'Only Admin, Owner, or Team Leader can assign work items to check-ins' 
          });
        }
      }
      
      // Validate meeting exists and belongs to the same team
      const meeting = await db
        .select()
        .from(checkInMeetings)
        .where(
          and(
            eq(checkInMeetings.id, targetMeetingId),
            eq(checkInMeetings.organizationId, organizationId)
          )
        )
        .limit(1);
        
      if (!meeting.length) {
        return res.status(404).json({ error: 'Target meeting not found' });
      }
      
      // Validate team match
      if (workItem[0].teamId && meeting[0].teamId !== workItem[0].teamId) {
        return res.status(400).json({ 
          error: 'Work item can only be assigned to meetings of the same team' 
        });
      }
    }
    
    // Update work item
    const updated = await db
      .update(workItems)
      .set({ 
        targetMeetingId,
        updatedAt: new Date()
      })
      .where(eq(workItems.id, workItemId))
      .returning();
      
    // Log activity
    await storage.logActivity({
      organizationId,
      userId,
      actionType: 'assignment',
      entityType: 'work_item',
      entityId: workItemId,
      description: targetMeetingId 
        ? `Work item assigned to meeting ${targetMeetingId}`
        : 'Work item unassigned from meeting',
      metadata: { targetMeetingId, workItemId }
    });
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating work item meeting assignment:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update work item meeting assignment' });
  }
});

// POST /api/strategy/meeting-item-updates - Apply change to work item + log
router.post('/meeting-item-updates', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const data = createMeetingItemUpdateSchema.parse(req.body);
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    const { meetingId } = req.query;
    
    if (!meetingId) {
      return res.status(400).json({ error: 'Meeting ID is required in query parameters' });
    }
    
    const meetingIdNum = parseInt(meetingId as string);
    
    // Validate meeting exists
    const meeting = await db
      .select()
      .from(checkInMeetings)
      .where(
        and(
          eq(checkInMeetings.id, meetingIdNum),
          eq(checkInMeetings.organizationId, organizationId)
        )
      )
      .limit(1);
      
    if (!meeting.length) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    // Apply changes to work item if specified
    if (data.workItemId && data.newValue) {
      try {
        // Update work item based on update type
        const updateData: any = {};
        
        if (data.updateType === 'status_change' && data.newValue.status) {
          updateData.status = data.newValue.status;
        }
        if (data.updateType === 'progress' && data.newValue.progress !== undefined) {
          // Could update progress-related fields
        }
        
        if (Object.keys(updateData).length > 0) {
          updateData.updatedAt = new Date();
          
          await db
            .update(workItems)
            .set(updateData)
            .where(eq(workItems.id, data.workItemId));
        }
      } catch (updateError) {
        console.error('Error applying work item changes:', updateError);
      }
    }
    
    // Log the meeting item update (stub - table not implemented in storage yet)
    console.log(`📝 Meeting item update logged:`, {
      meetingId: meetingIdNum,
      workItemId: data.workItemId,
      keyResultId: data.keyResultId,
      objectiveId: data.objectiveId,
      updateType: data.updateType,
      updatedBy: userId,
      notes: data.notes
    });
    
    // Log activity
    await storage.logActivity({
      organizationId,
      userId,
      actionType: 'agent_action',
      entityType: data.workItemId ? 'work_item' : (data.keyResultId ? 'key_result' : 'objective'),
      entityId: data.workItemId || data.keyResultId || data.objectiveId || 0,
      description: `Meeting item update: ${data.updateType}`,
      metadata: { 
        meetingId: meetingIdNum,
        updateType: data.updateType,
        notes: data.notes
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Meeting item update recorded',
      updateType: data.updateType
    });
  } catch (error) {
    console.error('Error creating meeting item update:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create meeting item update' });
  }
});

// Get activity logs for objectives/key results
router.get('/activity-logs', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const { objectiveId, keyResultId, limit = 50 } = req.query;

    // Get all activity logs for the organization
    const allLogs = await storage.getActivityLogs(organizationId, {
      limit: parseInt(limit as string)
    });

    // Filter by objectiveId or keyResultId if provided
    let filteredLogs = allLogs;
    if (objectiveId) {
      const objId = parseInt(objectiveId as string);
      filteredLogs = filteredLogs.filter(log => 
        (log.metadata as any)?.objectiveId === objId || 
        (log.entityType === 'objective' && log.entityId === objId)
      );
    } else if (keyResultId) {
      const krId = parseInt(keyResultId as string);
      filteredLogs = filteredLogs.filter(log => 
        (log.metadata as any)?.keyResultId === krId || 
        (log.entityType === 'key_result' && log.entityId === krId)
      );
    }
    
    res.json(filteredLogs);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// === KEY RESULT TASKS ENDPOINTS ===

// Get all key result tasks for the organization
router.get('/key-result-tasks', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;
    
    // Fetch all KR tasks with their related key results and teams
    const tasks = await db
      .select({
        id: keyResultTasks.id,
        title: keyResultTasks.title,
        description: keyResultTasks.description,
        status: keyResultTasks.status,
        isRecurring: keyResultTasks.isRecurring,
        frequency: keyResultTasks.frequency,
        teamId: keyResultTasks.teamId,
        assignedTo: keyResultTasks.assignedTo,
        keyResultId: keyResultTasks.keyResultId,
        team: teams,
        keyResult: {
          id: keyResults.id,
          title: keyResults.title,
        }
      })
      .from(keyResultTasks)
      .leftJoin(teams, eq(keyResultTasks.teamId, teams.id))
      .leftJoin(keyResults, eq(keyResultTasks.keyResultId, keyResults.id))
      .leftJoin(objectives, eq(keyResults.objectiveId, objectives.id))
      .where(eq(objectives.organizationId, organizationId))
      .orderBy(keyResultTasks.title);
    
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching key result tasks:', error);
    res.status(500).json({ error: 'Failed to fetch key result tasks' });
  }
});

// Get single key result task by ID
router.get('/key-result-tasks/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }
    
    // Fetch single KR task with flattened data to avoid circular references
    const [task] = await db
      .select({
        id: keyResultTasks.id,
        title: keyResultTasks.title,
        description: keyResultTasks.description,
        status: keyResultTasks.status,
        isRecurring: keyResultTasks.isRecurring,
        frequency: keyResultTasks.frequency,
        teamId: keyResultTasks.teamId,
        assignedTo: keyResultTasks.assignedTo,
        keyResultId: keyResultTasks.keyResultId,
        // Flatten to avoid circular references
        teamName: teams.name,
        keyResultTitle: keyResults.title,
      })
      .from(keyResultTasks)
      .leftJoin(teams, eq(keyResultTasks.teamId, teams.id))
      .leftJoin(keyResults, eq(keyResultTasks.keyResultId, keyResults.id))
      .leftJoin(objectives, eq(keyResults.objectiveId, objectives.id))
      .where(and(
        eq(keyResultTasks.id, taskId),
        eq(objectives.organizationId, organizationId)
      ));
    
    if (!task) {
      return res.status(404).json({ error: 'Key result task not found' });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Error fetching key result task:', error);
    res.status(500).json({ error: 'Failed to fetch key result task' });
  }
});

// Update key result task
router.patch('/key-result-tasks/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const updates = req.body;
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    
    // Get existing task first using direct database query
    const [existingTask] = await db
      .select()
      .from(keyResultTasks)
      .where(eq(keyResultTasks.id, taskId));
    
    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Prepare updates with proper date conversion
    const dbUpdates: any = {
      ...updates,
      updatedAt: new Date()
    };
    
    // Convert targetCompletion string to Date if present
    if (updates.targetCompletion !== undefined) {
      dbUpdates.targetCompletion = updates.targetCompletion ? new Date(updates.targetCompletion) : null;
    }
    
    // Update the task in database
    const [updatedTask] = await db
      .update(keyResultTasks)
      .set(dbUpdates)
      .where(eq(keyResultTasks.id, taskId))
      .returning();
    
    if (!updatedTask) {
      return res.status(500).json({ error: 'Failed to update task' });
    }
    
    // Log activity for the update
    // Create a more specific message for status changes
    let activityMessage = `Updated task: ${updatedTask.title}`;
    let actionType: 'creation' | 'status_change' | 'assignment' | 'comment' | 'file_upload' | 'kpi_update' | 'agent_action' | 'completion' | 'deletion' | 'generation' | 'bulk_update' = 'agent_action';
    
    if (updates.status && updates.status !== existingTask.status) {
      activityMessage = `Status changed from "${existingTask.status}" to "${updates.status}"`;
      actionType = 'status_change';
    } else if (updates.assignedTo && updates.assignedTo !== existingTask.assignedTo) {
      activityMessage = `Task reassigned`;
    } else if (updates.title && updates.title !== existingTask.title) {
      activityMessage = `Task renamed from "${existingTask.title}" to "${updates.title}"`;
    }
    
    await storage.logActivity({
      organizationId,
      userId,
      actionType,
      entityType: 'key_result_task',
      entityId: taskId,
      description: activityMessage,
      metadata: { 
        taskId,
        updates,
        keyResultId: existingTask.keyResultId,
        previousValues: {
          status: existingTask.status,
          assignedTo: existingTask.assignedTo,
          title: existingTask.title
        }
      }
    });
    
    // Auto-sync target completion date to work items (one-off tasks only)
    if ('targetCompletion' in updates && !updatedTask.isRecurring) {
      const newTargetCompletion = updates.targetCompletion ? new Date(updates.targetCompletion) : null;
      const oldTargetCompletion = existingTask.targetCompletion;
      
      // Only update if the dates are different
      const datesAreDifferent = 
        (newTargetCompletion === null && oldTargetCompletion !== null) ||
        (newTargetCompletion !== null && oldTargetCompletion === null) ||
        (newTargetCompletion !== null && oldTargetCompletion !== null && 
         newTargetCompletion.toISOString().split('T')[0] !== new Date(oldTargetCompletion).toISOString().split('T')[0]);
      
      if (datesAreDifferent) {
        // Update all work items linked to this task
        await db
          .update(workItems)
          .set({
            dueDate: newTargetCompletion ? newTargetCompletion.toISOString().split('T')[0] : null,
            updatedAt: new Date()
          })
          .where(eq(workItems.keyResultTaskId, taskId));
        
        // Log the automatic sync
        await storage.logActivity({
          organizationId,
          userId,
          actionType: 'agent_action',
          entityType: 'key_result_task',
          entityId: taskId,
          description: `Auto-synced target completion to linked work items`,
          metadata: { 
            taskId,
            oldTargetCompletion,
            newTargetCompletion
          }
        });
      }
    }
    
    // If status changed to completed, update metrics
    if (updates.status === 'Completed' && existingTask.status !== 'Completed') {
      if (updatedTask.isRecurring) {
        await db
          .update(keyResultTasks)
          .set({
            completedCount: (existingTask.completedCount || 0) + 1,
            currentStreak: (existingTask.currentStreak || 0) + 1,
            longestStreak: Math.max(
              (existingTask.longestStreak || 0),
              (existingTask.currentStreak || 0) + 1
            ),
            lastCompletedDate: new Date(),
            updatedAt: new Date()
          })
          .where(eq(keyResultTasks.id, taskId));
      }
      
      // Log completion activity
      await storage.logActivity({
        organizationId,
        userId,
        actionType: 'completion',
        entityType: 'key_result_task',
        entityId: taskId,
        description: `Completed task: ${updatedTask.title}`,
        metadata: { 
          taskId,
          keyResultId: existingTask.keyResultId,
          isRecurring: updatedTask.isRecurring
        }
      });
    }
    
    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating key result task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});


// Get dependencies for a key result task
router.get('/key-result-tasks/:id/dependencies', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    
    // Get task first to verify it exists
    const task = await storage.getKeyResultTask(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Get dependencies
    const dependencies = await storage.getKeyResultTaskDependencies(taskId);
    
    res.json({
      workItemsCount: dependencies.workItems.length,
      snapshotsCount: dependencies.snapshots.length,
      totalDependencies: dependencies.totalCount,
      workItems: dependencies.workItems.map(w => ({
        id: w.id,
        title: w.title,
        status: w.status
      })),
      snapshots: dependencies.snapshots.map(s => ({
        id: s.id,
        title: s.title
      }))
    });
  } catch (error) {
    console.error('Error fetching task dependencies:', error);
    res.status(500).json({ error: 'Failed to fetch task dependencies' });
  }
});

// Delete key result task (with cascade option)
router.delete('/key-result-tasks/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id || 7;
    const cascade = req.query.cascade === 'true';
    
    // Get existing task first
    const existingTask = await storage.getKeyResultTask(taskId);
    
    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check for dependencies if not cascading
    if (!cascade) {
      const dependencies = await storage.getKeyResultTaskDependencies(taskId);
      if (dependencies.totalCount > 0) {
        return res.status(400).json({
          error: 'Cannot delete task',
          message: 'This task has dependent work items. Use cascade=true to delete all dependencies.',
          dependencies: {
            workItemsCount: dependencies.workItems.length,
            snapshotsCount: dependencies.snapshots.length,
            totalCount: dependencies.totalCount
          }
        });
      }
    }
    
    // Delete the task (with or without cascading)
    const deleted = cascade 
      ? await storage.cascadeDeleteKeyResultTask(taskId)
      : await storage.deleteKeyResultTask(taskId);
    
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete task' });
    }
    
    // Log activity
    await storage.logActivity({
      organizationId,
      userId,
      actionType: 'deletion',
      entityType: 'key_result_task',
      entityId: taskId,
      description: `Deleted task: ${existingTask.title}${cascade ? ' (with dependencies)' : ''}`,
      metadata: { 
        taskId,
        title: existingTask.title,
        keyResultId: existingTask.keyResultId,
        cascaded: cascade
      },
    });
    
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting key result task:', error);
    
    // Check for foreign key constraint violations
    if (error.code === '23503') {
      if (error.constraint?.includes('work_items')) {
        return res.status(400).json({ 
          error: 'Cannot delete task',
          message: 'This task has associated work items. Delete them first or use cascade=true.',
          constraint: 'work_items'
        });
      }
    }
    
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Get activity logs for key result task
router.get('/key-result-tasks/:id/activity', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }
    
    // Get all activity logs for the organization
    const allLogs = await storage.getActivityLogs(organizationId, {
      limit: 100
    });
    
    // Filter for this specific task - includes both task logs and work item logs
    const taskLogs = allLogs.filter(log => {
      // Direct entity match for task creation logs
      if ((log.entityType === 'key_result_task' || log.entityType === 'task') && log.entityId === taskId) {
        return true;
      }
      
      // Metadata taskId match for work item logs (handle JSON string and type conversion)
      try {
        if (log.metadata) {
          const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
          return metadata.taskId === taskId || metadata.taskId === String(taskId);
        }
      } catch (e) {
        // Ignore JSON parse errors and continue
      }
      
      return false;
    });
    
    res.json(taskLogs);
  } catch (error) {
    console.error('Error fetching task activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// Get strategy settings for organization
router.get('/settings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }
    
    const settings = await storage.getStrategySettings(organizationId);
    res.json(settings);
  } catch (error) {
    console.error('Error fetching strategy settings:', error);
    res.status(500).json({ error: 'Failed to fetch strategy settings' });
  }
});

// Update strategy settings
router.patch('/settings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }
    
    // Validate settings
    const settingsSchema = z.object({
      cronEnabled: z.boolean().optional(),
      cronSchedule: z.string().optional(),
      lookaheadDays: z.number().min(1).max(90).optional(),
      autoGenerateWorkItems: z.boolean().optional(),
      generateOnTaskCreation: z.boolean().optional(),
      notifyOnGeneration: z.boolean().optional(),
      notifyEmailRecipients: z.array(z.string().email()).optional(),
      lastCronExecution: z.string().optional(),
    });
    
    const validated = settingsSchema.parse(req.body);
    
    // Update settings with user who made the change
    const updated = await storage.updateStrategySettings(organizationId, {
      ...validated,
      lastCronExecution: validated.lastCronExecution ? new Date(validated.lastCronExecution) : undefined,
      updatedBy: userId,
    });
    
    // If cron settings changed, restart cron jobs
    if (validated.cronEnabled !== undefined || validated.cronSchedule !== undefined) {
      // TODO: Trigger cron service restart for this organization
      console.log(`[CRON] Settings updated for org ${organizationId}, may need cron restart`);
    }
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating strategy settings:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid settings', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update strategy settings' });
  }
});

// Get recent work item generation activity
router.get('/settings/activity', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }
    
    // Get activity logs related to work item generation
    const logs = await storage.getActivityLogs(organizationId, {
      entityType: 'work_item',
      limit: 50
    });
    
    // Filter for generation-related activities
    const generationLogs = logs.filter(log => 
      log.description?.includes('generated') || 
      log.description?.includes('automatic') ||
      (log.metadata as any)?.source === 'cron' ||
      (log.metadata as any)?.source === 'automation'
    );
    
    res.json(generationLogs);
  } catch (error) {
    console.error('Error fetching generation activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// GET /api/strategy/my-day - Get My Day dashboard data
router.get('/my-day', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;
    
    if (!organizationId || !userId) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const oneWeekFromNow = new Date(today);
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    const oneWeekStr = oneWeekFromNow.toISOString().split('T')[0];

    // Get priority key results (at risk, assigned to user or user's teams)
    const userTeams = await db.select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));
    
    const userTeamIds = userTeams.map(t => t.teamId);

    // Get key results assigned to user or their teams, prioritize at-risk
    const priorityKRs = await db.select({
      id: keyResults.id,
      title: keyResults.title,
      currentValue: keyResults.currentValue,
      targetValue: keyResults.targetValue,
      status: keyResults.status,
      objectiveId: keyResults.objectiveId,
      objectiveTitle: objectives.title,
    })
    .from(keyResults)
    .leftJoin(objectives, eq(keyResults.objectiveId, objectives.id))
    .where(and(
      eq(keyResults.organizationId, organizationId),
      or(
        eq(keyResults.ownerId, userId),
        userTeamIds.length > 0 ? inArray(objectives.ownerId, userTeamIds) : undefined
      )
    ))
    .orderBy(
      sql`CASE WHEN ${keyResults.status} = 'At Risk' THEN 1 WHEN ${keyResults.status} = 'Stuck' THEN 2 ELSE 3 END`,
      desc(keyResults.updatedAt)
    )
    .limit(3);

    // Get today's tasks (work items due today or overdue, assigned to user)
    const todayTasks = await db.select({
      id: workItems.id,
      title: workItems.title,
      description: workItems.description,
      status: workItems.status,
      dueDate: workItems.dueDate,
      keyResultTaskId: workItems.keyResultTaskId,
      workflowTemplateId: workItems.workflowTemplateId,
      workItemType: workItems.workItemType,
      keyResultTask: {
        id: keyResultTasks.id,
        title: keyResultTasks.title,
        keyResultId: keyResultTasks.keyResultId,
      }
    })
    .from(workItems)
    .leftJoin(keyResultTasks, eq(workItems.keyResultTaskId, keyResultTasks.id))
    .where(and(
      eq(workItems.organizationId, organizationId),
      eq(workItems.assignedTo, userId),
      or(
        lte(workItems.dueDate, todayStr),
        eq(workItems.status, 'In Progress')
      )
    ))
    .orderBy(workItems.dueDate);

    // Get this week's meetings (user's team meetings)
    const weekMeetings = await db.select({
      id: checkInMeetings.id,
      title: checkInMeetings.title,
      scheduledDate: checkInMeetings.scheduledDate,
      status: checkInMeetings.status,
      teamId: checkInMeetings.teamId,
      teamName: teams.name,
    })
    .from(checkInMeetings)
    .leftJoin(teams, eq(checkInMeetings.teamId, teams.id))
    .where(and(
      eq(checkInMeetings.organizationId, organizationId),
      userTeamIds.length > 0 ? inArray(checkInMeetings.teamId, userTeamIds) : undefined,
      sql`${checkInMeetings.scheduledDate} >= ${today.toISOString()}`,
      sql`${checkInMeetings.scheduledDate} <= ${oneWeekFromNow.toISOString()}`
    ))
    .orderBy(checkInMeetings.scheduledDate);

    // Get backlog items (work items not in a cycle, for quick add to meetings)
    const backlogItems = await db.select({
      id: workItems.id,
      title: workItems.title,
      status: workItems.status,
      assignedTo: workItems.assignedTo,
      assignedUserName: users.fullName,
    })
    .from(workItems)
    .leftJoin(users, eq(workItems.assignedTo, users.id))
    .where(and(
      eq(workItems.organizationId, organizationId),
      isNull(workItems.targetMeetingId),
      or(
        eq(workItems.assignedTo, userId),
        userTeamIds.length > 0 ? inArray(workItems.teamId, userTeamIds) : undefined
      )
    ))
    .limit(20);

    res.json({
      priorityOutcomes: priorityKRs,
      todayTasks,
      weekMeetings,
      backlogItems,
    });
  } catch (error) {
    console.error('Error fetching My Day data:', error);
    res.status(500).json({ error: 'Failed to fetch My Day data' });
  }
});

// ========================================
// MIND MAP NODE POSITIONS ENDPOINTS
// ========================================

// Schema for saving node positions
const saveNodePositionsSchema = z.object({
  positions: z.array(z.object({
    nodeId: z.string().min(1).max(100),
    nodeType: z.string().min(1).max(50),
    positionX: z.number(),
    positionY: z.number(),
  })),
  viewport: z.object({
    x: z.number(),
    y: z.number(),
    zoom: z.number(),
  }).optional(),
});

// Get saved mind map positions for current user
router.get('/mindmap-positions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;
    
    if (!organizationId || !userId) {
      return res.status(400).json({ error: 'Authentication required' });
    }
    
    const positions = await db.select()
      .from(mindMapNodePositions)
      .where(and(
        eq(mindMapNodePositions.organizationId, organizationId),
        eq(mindMapNodePositions.userId, userId)
      ));
    
    // Extract viewport from mission node if present
    const missionNode = positions.find(p => p.nodeId === 'mission');
    const viewport = missionNode ? {
      x: parseFloat(missionNode.viewportX || '0'),
      y: parseFloat(missionNode.viewportY || '0'),
      zoom: parseFloat(missionNode.viewportZoom || '1'),
    } : null;
    
    res.json({
      positions: positions.map(p => ({
        nodeId: p.nodeId,
        nodeType: p.nodeType,
        positionX: parseFloat(p.positionX),
        positionY: parseFloat(p.positionY),
      })),
      viewport,
    });
  } catch (error) {
    console.error('Error fetching mind map positions:', error);
    res.status(500).json({ error: 'Failed to fetch mind map positions' });
  }
});

// Save mind map positions for current user (bulk upsert)
router.post('/mindmap-positions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;
    
    if (!organizationId || !userId) {
      return res.status(400).json({ error: 'Authentication required' });
    }
    
    const data = saveNodePositionsSchema.parse(req.body);
    
    // Use upsert for each position
    for (const pos of data.positions) {
      const existingPosition = await db.select()
        .from(mindMapNodePositions)
        .where(and(
          eq(mindMapNodePositions.organizationId, organizationId),
          eq(mindMapNodePositions.userId, userId),
          eq(mindMapNodePositions.nodeId, pos.nodeId)
        ))
        .limit(1);
      
      if (existingPosition.length > 0) {
        // Update existing position
        const updateData: any = {
          nodeType: pos.nodeType,
          positionX: pos.positionX.toString(),
          positionY: pos.positionY.toString(),
          updatedAt: new Date(),
        };
        
        // Only update viewport on mission node
        if (pos.nodeId === 'mission' && data.viewport) {
          updateData.viewportX = data.viewport.x.toString();
          updateData.viewportY = data.viewport.y.toString();
          updateData.viewportZoom = data.viewport.zoom.toString();
        }
        
        await db.update(mindMapNodePositions)
          .set(updateData)
          .where(eq(mindMapNodePositions.id, existingPosition[0].id));
      } else {
        // Insert new position
        const insertData: any = {
          organizationId,
          userId,
          nodeId: pos.nodeId,
          nodeType: pos.nodeType,
          positionX: pos.positionX.toString(),
          positionY: pos.positionY.toString(),
        };
        
        // Only set viewport on mission node
        if (pos.nodeId === 'mission' && data.viewport) {
          insertData.viewportX = data.viewport.x.toString();
          insertData.viewportY = data.viewport.y.toString();
          insertData.viewportZoom = data.viewport.zoom.toString();
        }
        
        await db.insert(mindMapNodePositions).values(insertData);
      }
    }
    
    res.json({ success: true, saved: data.positions.length });
  } catch (error) {
    console.error('Error saving mind map positions:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to save mind map positions' });
  }
});

// Clear all mind map positions for current user (reset layout)
router.delete('/mindmap-positions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;
    
    if (!organizationId || !userId) {
      return res.status(400).json({ error: 'Authentication required' });
    }
    
    await db.delete(mindMapNodePositions)
      .where(and(
        eq(mindMapNodePositions.organizationId, organizationId),
        eq(mindMapNodePositions.userId, userId)
      ));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing mind map positions:', error);
    res.status(500).json({ error: 'Failed to clear mind map positions' });
  }
});

export default router;