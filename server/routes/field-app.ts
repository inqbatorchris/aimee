/**
 * Field App API Routes
 * Handles bulk downloads, sync, and photo uploads for offline field work
 */

import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { authenticateToken } from '../auth';
import { db } from '../db';
import { workItems, workItemWorkflowExecutions, workItemWorkflowExecutionSteps, fiberNetworkNodes, fiberNetworkActivityLogs, audioRecordings } from '@shared/schema';
import { and, eq, inArray, asc } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { audioProcessingService } from '../services/audioProcessingService';

const router = Router();

// Ensure upload directory exists
const uploadDir = 'uploads/field-photos';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Sanitize error messages for user-facing logs
const getSafeErrorMessage = (error: any): string => {
  // Return generic message - actual error is logged server-side via console.error
  if (error.message?.toLowerCase().includes('unique')) {
    return 'Sync conflict - data already exists';
  }
  if (error.message?.toLowerCase().includes('not found')) {
    return 'Data not found';
  }
  if (error.message?.toLowerCase().includes('permission')) {
    return 'Permission denied';
  }
  // Generic fallback for all other errors
  return 'Synchronization error occurred';
};

// Configure multer for photo uploads
const photoStorage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `photo-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage: photoStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|heic|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, heic, webp) are allowed'));
    }
  }
});

// Ensure audio upload directory exists
const audioUploadDir = 'uploads/field-audio';
if (!fs.existsSync(audioUploadDir)) {
  fs.mkdirSync(audioUploadDir, { recursive: true });
}

// Configure multer for audio uploads
const audioStorage = multer.diskStorage({
  destination: audioUploadDir,
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `audio-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const audioUpload = multer({ 
  storage: audioStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for audio
  fileFilter: (req, file, cb) => {
    const allowedTypes = /webm|m4a|mp3|wav|ogg|aac/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype || extname) { // Allow if either matches (some browsers send wrong MIME types)
      return cb(null, true);
    } else {
      cb(new Error('Only audio files (webm, m4a, mp3, wav, ogg, aac) are allowed'));
    }
  }
});

// Get available work items for download
router.get('/available-items', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    // Get user's teams (users can belong to multiple teams)
    const userTeams = await storage.getUserTeams(userId);
    const userTeamIds = userTeams.map((t: any) => t.id);

    // Get all work items for the organization
    const allWorkItems = await storage.getWorkItems(organizationId);
    
    // Debug: Log first item to see structure
    if (allWorkItems.length > 0) {
      console.log('[Field App] Sample work item:', JSON.stringify(allWorkItems[0], null, 2));
      console.log('[Field App] First item keys:', Object.keys(allWorkItems[0]));
      console.log('[Field App] User info:', { userId, userTeamIds });
    }
    
    // Apply filters
    const filters = {
      assignedTo: req.query.assignedTo 
        ? (Array.isArray(req.query.assignedTo) ? req.query.assignedTo : [req.query.assignedTo])
        : ['me'],
      status: req.query.status 
        ? (Array.isArray(req.query.status) ? req.query.status : req.query.status.split(','))
        : ['Planning', 'Ready', 'In Progress'],
      dateRange: req.query.dateRange || 'week',
      templateIds: req.query.templateIds 
        ? (Array.isArray(req.query.templateIds) 
            ? req.query.templateIds
            : (req.query.templateIds as string).split(','))
        : []
    };

    // Filter work items based on criteria - with detailed logging
    let step1 = allWorkItems.filter((item: any) => {
      const matchesAssignment = filters.assignedTo.some((assignmentType: string) => {
        if (assignmentType === 'me') {
          // "My Work" = assigned directly to me ONLY (not team assignments)
          return item.assignedTo === userId;
        }
        if (assignmentType === 'team') {
          // "My Team" = assigned to any of my teams OR assigned to me
          return (item.teamId && userTeamIds.includes(item.teamId)) || 
                 item.assignedTo === userId;
        }
        if (assignmentType === 'all') {
          // "All Work" = everything in the organization
          return true;
        }
        return false;
      });
      return matchesAssignment;
    });
    
    let step2 = step1.filter((item: any) => {
      if (filters.status.length === 0) return true;
      return filters.status.includes(item.status);
    });
    
    let step3 = step2.filter((item: any) => {
      if (filters.templateIds.length === 0) return true;
      // When specific templates are selected, ONLY show items with those templates
      // Check both workflowTemplateId AND workItemType (both may contain the template ID)
      if (!item.workflowTemplateId && !item.workItemType) return false;
      // Normalize to strings for type-safe comparison (query params are strings, IDs can be strings or numbers)
      const workflowTemplateIdStr = String(item.workflowTemplateId);
      const workItemTypeStr = String(item.workItemType);
      return filters.templateIds.includes(workflowTemplateIdStr) || 
             filters.templateIds.includes(workItemTypeStr);
    });
    
    let filteredItems = step3.filter((item: any) => {
      if (filters.dateRange === 'all') return true;
      if (!item.dueDate) return true; // Include items without due dates
      const dueDate = new Date(item.dueDate);
      const now = new Date();
      const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (filters.dateRange === 'today' && daysDiff > 1) return false;
      if (filters.dateRange === 'week' && daysDiff > 7) return false;
      if (filters.dateRange === 'month' && daysDiff > 30) return false;
      return true;
    });
    
    console.log('[Field App] Filter results:', {
      total: allWorkItems.length,
      afterAssignment: step1.length,
      afterStatus: step2.length,
      afterTemplate: step3.length,
      final: filteredItems.length,
      filters: {
        assignedTo: filters.assignedTo,
        status: filters.status,
        templateIds: filters.templateIds,
        dateRange: filters.dateRange
      },
      userId: userId,
      sampleItems: filteredItems.slice(0, 3).map((item: any) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        assignedTo: item.assignedTo,
        workflowTemplateId: item.workflowTemplateId,
        dueDate: item.dueDate
      }))
    });

    // Enhance work items with template names
    const enhancedItems = await Promise.all(
      filteredItems.map(async (item: any) => {
        if (item.workflowTemplateId) {
          const template = await storage.getWorkflowTemplate(organizationId, String(item.workflowTemplateId));
          return {
            ...item,
            workflowTemplateName: template?.name
          };
        }
        return item;
      })
    );

    res.json({ items: enhancedItems });
  } catch (error) {
    console.error('Error fetching available items:', error);
    res.status(500).json({ error: 'Failed to fetch available items' });
  }
});

// Bulk download work items with templates
router.post('/download', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;
    
    const { workItemIds, includeTemplates, includeAttachments, offset, limit } = req.body;

    if (!workItemIds || !Array.isArray(workItemIds)) {
      return res.status(400).json({ error: 'workItemIds array is required' });
    }

    // Apply chunking if offset/limit provided (backward compatible)
    const totalRequested = workItemIds.length;
    const chunkOffset = offset !== undefined ? offset : 0;
    const chunkLimit = limit !== undefined ? limit : totalRequested;
    const chunkedIds = workItemIds.slice(chunkOffset, chunkOffset + chunkLimit);
    
    console.log('[Download] Chunked request:', {
      totalRequested,
      offset: chunkOffset,
      limit: chunkLimit,
      chunkSize: chunkedIds.length
    });

    // Fetch all work items and filter by chunked IDs
    const allWorkItems = await storage.getWorkItems(organizationId);
    const workItems = allWorkItems.filter((item: any) => 
      chunkedIds.includes(item.id)
    );

    // Collect unique template IDs
    const templateIds = new Set<string>();
    workItems.forEach((item: any) => {
      if (item.workflowTemplateId) {
        templateIds.add(String(item.workflowTemplateId));
      }
    });

    // Fetch templates if requested
    let templates: any[] = [];
    if (includeTemplates && templateIds.size > 0) {
      templates = await Promise.all(
        Array.from(templateIds).map(id => storage.getWorkflowTemplate(organizationId, id))
      );
      templates = templates.filter((t: any) => t !== null);
    }

    // Get execution states and steps with evidence for all work items
    const executionStates: any[] = [];
    
    for (const workItem of workItems) {
      // Get execution for this work item
      const execution = await db.select()
        .from(workItemWorkflowExecutions)
        .where(
          and(
            eq(workItemWorkflowExecutions.workItemId, workItem.id),
            eq(workItemWorkflowExecutions.organizationId, organizationId)
          )
        )
        .limit(1);
      
      if (execution && execution.length > 0) {
        // Get all steps for this execution
        const steps = await db.select()
          .from(workItemWorkflowExecutionSteps)
          .where(
            and(
              eq(workItemWorkflowExecutionSteps.executionId, execution[0].id),
              eq(workItemWorkflowExecutionSteps.organizationId, organizationId)
            )
          )
          .orderBy(asc(workItemWorkflowExecutionSteps.stepIndex));
        
        executionStates.push({
          workItemId: workItem.id,
          execution: execution[0],
          steps: steps.map(step => ({
            ...step,
            // Ensure evidence is included with full configuration
            evidence: step.evidence || {}
          }))
        });
      }
    }

    // Return batch metadata for chunked downloads
    const hasMore = (chunkOffset + chunkLimit) < totalRequested;
    const currentBatch = Math.floor(chunkOffset / chunkLimit) + 1;
    const totalBatches = Math.ceil(totalRequested / chunkLimit);
    
    res.json({
      workItems,
      templates,
      executionStates,
      // Batch metadata (only present if chunking is used)
      metadata: {
        totalRequested,
        currentBatch,
        totalBatches,
        offset: chunkOffset,
        limit: chunkLimit,
        returned: workItems.length,
        hasMore
      }
    });
  } catch (error) {
    console.error('Error downloading items:', error);
    res.status(500).json({ error: 'Failed to download items' });
  }
});

// Sync changes from offline work
router.post('/sync', authenticateToken, async (req: any, res) => {
  const startTime = Date.now();
  const organizationId = req.user?.organizationId;
  const userId = req.user?.id;
  
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
      // Log failed sync attempt - invalid request
      await storage.logActivity({
        organizationId,
        userId,
        actionType: 'field_app_sync_failed',
        entityType: 'field_app_sync',
        entityId: null,
        description: 'Field app sync failed - invalid request format',
        metadata: {
          error: 'Invalid request format',
          updateCount: 0,
          duration: Date.now() - startTime
        }
      });
      
      return res.status(400).json({ error: 'Updates array is required' });
    }

    const results = [];
    const conflicts = [];

    for (const update of updates) {
      try {
        switch (update.type) {
          case 'workItem':
            // Extract only updatable fields from the work item data
            // Field app sends entire work item including localEdits
            const workItemUpdates: any = {};
            const allowedFields = ['title', 'description', 'status', 'priority', 'location', 'notes', 'dueDate', 'assignedTo'];
            
            for (const field of allowedFields) {
              if (update.data[field] !== undefined) {
                workItemUpdates[field] = update.data[field];
              }
            }
            
            // Also check localEdits for status changes
            if (update.data.localEdits?.status) {
              workItemUpdates.status = update.data.localEdits.status;
            }
            
            console.log('[Sync] Work item update:', { 
              id: update.entityId, 
              updates: workItemUpdates,
              hasStatus: !!workItemUpdates.status 
            });
            
            const updatedItem = await storage.updateWorkItem(
              update.entityId,
              workItemUpdates
            );
            results.push({ type: 'workItem', id: update.entityId, success: true });
            break;

          case 'workflowStep':
            // Update workflow step execution
            const { workItemId, stepIndex, stepId, status, notes, evidence } = update.data;
            
            // Ensure workItemId is a number
            const numericWorkItemId = typeof workItemId === 'string' ? parseInt(workItemId, 10) : workItemId;
            
            console.log('[Sync] Processing workflow step update:', { 
              workItemId: numericWorkItemId, 
              stepIndex, 
              stepId, 
              status, 
              hasNotes: !!notes,
              hasEvidence: !!evidence,
              evidenceKeys: evidence ? Object.keys(evidence) : []
            });
            
            // Get the workflow execution for this work item
            const execution = await db.select()
              .from(workItemWorkflowExecutions)
              .where(
                and(
                  eq(workItemWorkflowExecutions.workItemId, numericWorkItemId),
                  eq(workItemWorkflowExecutions.organizationId, organizationId)
                )
              )
              .limit(1);
            
            if (!execution || execution.length === 0) {
              console.warn(`No workflow execution found for work item ${numericWorkItemId}`);
              conflicts.push({
                entityId: update.entityId,
                type: update.type,
                error: 'Workflow execution not found'
              });
              break;
            }
            
            // Find the step record
            const stepRecord = await db.select()
              .from(workItemWorkflowExecutionSteps)
              .where(
                and(
                  eq(workItemWorkflowExecutionSteps.workItemId, numericWorkItemId),
                  eq(workItemWorkflowExecutionSteps.executionId, execution[0].id),
                  eq(workItemWorkflowExecutionSteps.stepIndex, stepIndex)
                )
              )
              .limit(1);
            
            if (!stepRecord || stepRecord.length === 0) {
              console.warn(`No step record found for work item ${numericWorkItemId}, step index ${stepIndex}`);
              conflicts.push({
                entityId: update.entityId,
                type: update.type,
                error: 'Step record not found'
              });
              break;
            }
            
            // Keep photos as objects with data property for web app compatibility
            let processedEvidence = evidence;
            if (evidence && evidence.photos && Array.isArray(evidence.photos)) {
              processedEvidence = {
                ...evidence,
                photos: evidence.photos.map((photo: any) => {
                  // If photo is already an object with data property, keep it
                  if (photo.data && typeof photo.data === 'string') {
                    return photo;  // Keep full object structure
                  }
                  // If photo is a plain string, wrap it in an object
                  if (typeof photo === 'string' && photo.startsWith('data:image')) {
                    return { data: photo };
                  }
                  return photo;
                })
              };
            }
            
            // Build update data with explicit type safety for timestamps
            const updateData: {
              status?: string;
              updatedAt: Date;
              notes?: string | null;
              evidence?: any;
              completedAt?: Date | null;
              completedBy?: number | null;
            } = {
              updatedAt: new Date()
            };
            
            // Only update fields that were explicitly provided
            if (status) {
              updateData.status = status;
            }
            
            if (notes !== undefined) {
              updateData.notes = notes || null;
            }
            
            if (processedEvidence !== undefined) {
              // Merge evidence while preserving template-defined properties
              const existingEvidence = (stepRecord[0].evidence as any) || {};
              updateData.evidence = {
                ...existingEvidence,
                ...processedEvidence,
                // Explicitly preserve template-defined properties
                checklistItems: existingEvidence.checklistItems,
                formFields: existingEvidence.formFields,
                photoConfig: existingEvidence.photoConfig,
                stepType: existingEvidence.stepType,
                config: existingEvidence.config,
                required: existingEvidence.required
              };
            }
            
            // Handle completion status
            if (status === 'completed') {
              updateData.completedAt = new Date();
              updateData.completedBy = userId;
            } else if (status === 'in_progress' || status === 'not_started') {
              // Clear completion data if step was uncompleted
              updateData.completedAt = null;
              updateData.completedBy = null;
            }
            
            console.log('[Sync] Update data prepared:', {
              stepId: stepRecord[0].id,
              hasStatus: !!updateData.status,
              hasNotes: updateData.notes !== undefined,
              hasEvidence: !!updateData.evidence,
              hasCompletedAt: updateData.completedAt !== undefined,
              completedAtType: updateData.completedAt ? typeof updateData.completedAt : 'undefined',
              updatedAtType: typeof updateData.updatedAt,
              allKeys: Object.keys(updateData)
            });
            
            // Ensure all timestamps are proper Date objects or null
            const safeUpdateData: any = {
              updatedAt: new Date()
            };
            
            // Only add fields that were explicitly set
            if (updateData.status) {
              safeUpdateData.status = updateData.status;
            }
            if (updateData.notes !== undefined) {
              safeUpdateData.notes = updateData.notes;
            }
            if (updateData.evidence !== undefined) {
              safeUpdateData.evidence = updateData.evidence;
            }
            if (updateData.completedAt !== undefined) {
              safeUpdateData.completedAt = updateData.completedAt instanceof Date ? updateData.completedAt : null;
            }
            if (updateData.completedBy !== undefined) {
              safeUpdateData.completedBy = updateData.completedBy;
            }
            
            console.log('[Sync] Safe update data:', {
              keys: Object.keys(safeUpdateData),
              hasCompletedAt: 'completedAt' in safeUpdateData,
              completedAtValue: safeUpdateData.completedAt
            });
            
            await db.update(workItemWorkflowExecutionSteps)
              .set(safeUpdateData)
              .where(
                eq(workItemWorkflowExecutionSteps.id, stepRecord[0].id)
              );
            
            results.push({ type: 'workflowStep', id: update.entityId, success: true });
            break;

          case 'fiberNetworkNode':
            // Create fiber network node from field app
            const nodeData = update.data;
            
            console.log('[Sync] Processing fiber network node creation:', { 
              id: nodeData.id,
              name: nodeData.name,
              nodeType: nodeData.nodeType,
              workItemId: nodeData.workItemId,
              latitude: nodeData.latitude,
              longitude: nodeData.longitude
            });
            
            // Validate node data
            if (!nodeData.name || nodeData.latitude == null || nodeData.longitude == null) {
              console.warn('[Sync] Invalid fiber node data:', nodeData);
              conflicts.push({
                entityId: update.entityId,
                type: update.type,
                error: 'Missing required fields: name, latitude, longitude'
              });
              break;
            }
            
            // Create the fiber network node with numeric coordinates
            const nodeResult = await db
              .insert(fiberNetworkNodes)
              .values({
                organizationId,
                name: nodeData.name,
                nodeType: nodeData.nodeType || 'chamber',
                network: nodeData.network || 'FibreLtd',
                status: nodeData.status || 'planned',
                latitude: nodeData.latitude,
                longitude: nodeData.longitude,
                what3words: nodeData.what3words || null,
                address: nodeData.address || null,
                notes: nodeData.notes || null,
                photos: nodeData.photos || [],
                fiberDetails: nodeData.fiberDetails || {},
                createdBy: userId,
                updatedBy: userId
              })
              .returning();
            
            const newNode = nodeResult[0];
            
            console.log('[Sync] Fiber network node created:', {
              id: newNode.id,
              name: newNode.name,
              latitude: newNode.latitude,
              longitude: newNode.longitude
            });
            
            // Log the creation in fiber network activity logs
            await db.insert(fiberNetworkActivityLogs).values({
              organizationId,
              userId,
              userName: req.user.fullName || req.user.email || 'Field User',
              actionType: 'create',
              entityType: 'fiber_node',
              entityId: newNode.id,
              changes: {
                added: { 
                  name: nodeData.name, 
                  nodeType: nodeData.nodeType, 
                  network: nodeData.network, 
                  status: nodeData.status,
                  latitude: nodeData.latitude,
                  longitude: nodeData.longitude
                }
              },
              ipAddress: req.ip || 'field-app'
            });
            
            // Automatically create sign-off work item (7 days due)
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 7);
            
            const workItemTitle = `New node sign off: ${nodeData.name}`;
            const workItemDescription = `Sign-off required for fiber network node:\n\n` +
              `Node: ${nodeData.name}\n` +
              `Type: ${nodeData.nodeType}\n` +
              `Network: ${nodeData.network}\n` +
              `Location: ${nodeData.latitude}, ${nodeData.longitude}\n` +
              `Address: ${nodeData.address || 'Not provided'}\n` +
              `Created: ${new Date().toLocaleString()}`;
            
            const newWorkItem = await storage.createWorkItem({
              title: workItemTitle,
              description: workItemDescription,
              status: 'Planning',
              teamId: 16,
              dueDate: dueDate.toISOString(),
              organizationId,
              workflowTemplateId: 'fiber-node-signoff-v1',
              workflowMetadata: {
                fiberNodeId: newNode.id,
                fiberNodeName: nodeData.name,
                nodeLocation: {
                  latitude: nodeData.latitude,
                  longitude: nodeData.longitude,
                  address: nodeData.address
                },
                createdInField: true
              }
            });
            
            // Initialize the workflow execution record
            try {
              await db.insert(workItemWorkflowExecutions).values({
                organizationId,
                workItemId: newWorkItem.id,
                workflowTemplateId: 'fiber-node-signoff-v1',
                status: 'not_started',
                executionData: {},
                createdAt: new Date(),
                updatedAt: new Date()
              });
              console.log('[Sync] Auto-created sign-off work item with initialized workflow for fiber node:', newNode.id);
            } catch (workflowError) {
              console.warn('[Sync] Failed to initialize workflow for sign-off work item (template may not exist):', workflowError);
              console.log('[Sync] Auto-created sign-off work item (workflow not initialized) for fiber node:', newNode.id);
            }
            
            results.push({ type: 'fiberNetworkNode', id: update.entityId, success: true, serverId: newNode.id });
            break;

          default:
            console.warn(`Unknown update type: ${update.type}`);
        }
      } catch (error) {
        console.error(`Failed to sync update ${update.entityId}:`, error);
        conflicts.push({
          entityId: update.entityId,
          type: update.type,
          error: 'Sync failed - server data wins'
        });
      }
    }

    // Get fresh data for user
    const allWorkItems = await storage.getWorkItems(organizationId);
    const freshWorkItems = allWorkItems.filter((item: any) => {
      return item.assignedTo === userId && 
        ['Planning', 'Ready', 'In Progress'].includes(item.status);
    });

    // Get fresh templates for updated work items
    const templateIds = new Set<string>();
    freshWorkItems.forEach((item: any) => {
      if (item.workflowTemplateId) {
        templateIds.add(String(item.workflowTemplateId));
      }
    });

    let freshTemplates: any[] = [];
    if (templateIds.size > 0) {
      freshTemplates = await Promise.all(
        Array.from(templateIds).map(id => storage.getWorkflowTemplate(organizationId, id))
      );
      freshTemplates = freshTemplates.filter((t: any) => t !== null);
    }

    const syncResult = {
      results,
      conflicts,
      newData: {
        workItems: freshWorkItems,
        templates: freshTemplates
      }
    };

    // Log successful sync
    await storage.logActivity({
      organizationId,
      userId,
      actionType: conflicts.length > 0 ? 'field_app_sync_partial' : 'field_app_sync_success',
      entityType: 'field_app_sync',
      entityId: null,
      description: conflicts.length > 0 
        ? `Field app sync completed with ${conflicts.length} conflicts`
        : `Field app sync completed successfully`,
      metadata: {
        updateCount: updates.length,
        successCount: results.length,
        conflictCount: conflicts.length,
        conflicts: conflicts,
        duration: Date.now() - startTime,
        updatedTypes: results.reduce((acc: any, r: any) => {
          acc[r.type] = (acc[r.type] || 0) + 1;
          return acc;
        }, {})
      }
    });

    res.json(syncResult);
  } catch (error: any) {
    console.error('Error syncing data:', error);
    
    // Log failed sync attempt (sanitized - generic message only)
    const safeErrorMessage = getSafeErrorMessage(error);
    await storage.logActivity({
      organizationId,
      userId,
      actionType: 'field_app_sync_failed',
      entityType: 'field_app_sync',
      entityId: null,
      description: `Field app sync failed: ${safeErrorMessage}`,
      metadata: {
        error: safeErrorMessage,
        errorType: 'SyncError',
        updateCount: req.body?.updates?.length || 0,
        duration: Date.now() - startTime
      }
    });
    
    res.status(500).json({ error: 'Failed to sync data' });
  }
});

// Get sync activity logs for current user
router.get('/sync-logs', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!organizationId || !userId) {
      return res.status(400).json({ error: 'User not authenticated' });
    }

    // Get field app sync activity logs for this user
    const logs = await storage.getActivityLogs(organizationId, {
      userId,
      entityType: 'field_app_sync',
      limit
    });

    res.json({ logs });
  } catch (error) {
    console.error('Error fetching sync logs:', error);
    res.status(500).json({ error: 'Failed to fetch sync logs' });
  }
});

// Upload photo captured offline
router.post('/upload-photo', authenticateToken, upload.single('file'), async (req: any, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;
    const { workItemId, stepId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!workItemId) {
      return res.status(400).json({ error: 'workItemId is required' });
    }

    console.log('[Upload Photo] Processing upload:', {
      workItemId,
      stepId,
      fileName: file.filename,
      size: file.size
    });

    // Convert uploaded file to base64 for database storage
    const photoPath = file.path;
    const photoBuffer = await fs.promises.readFile(photoPath);
    const base64Data = `data:${file.mimetype};base64,${photoBuffer.toString('base64')}`;

    // If stepId provided, update the step evidence in database
    if (stepId) {
      // Find the execution and step
      const execution = await db.select()
        .from(workItemWorkflowExecutions)
        .where(
          and(
            eq(workItemWorkflowExecutions.workItemId, parseInt(workItemId)),
            eq(workItemWorkflowExecutions.organizationId, organizationId)
          )
        )
        .limit(1);

      if (execution && execution.length > 0) {
        // Find the step by stepId (need to parse template to get stepIndex)
        const workItem = await db.select()
          .from(workItems)
          .where(eq(workItems.id, parseInt(workItemId)))
          .limit(1);

        if (workItem && workItem.length > 0 && workItem[0].workflowTemplateId) {
          const template = await storage.getWorkflowTemplate(organizationId, workItem[0].workflowTemplateId);
          if (!template) {
            console.warn('[Upload Photo] Template not found');
            return res.json({ success: false, error: 'Template not found' });
          }
          
          const templateStep = template.steps.find((s: any) => s.id === stepId);
          const stepIndex = templateStep ? template.steps.indexOf(templateStep) : -1;

          if (stepIndex >= 0) {
            // Get the step record
            const stepRecord = await db.select()
              .from(workItemWorkflowExecutionSteps)
              .where(
                and(
                  eq(workItemWorkflowExecutionSteps.executionId, execution[0].id),
                  eq(workItemWorkflowExecutionSteps.stepIndex, stepIndex)
                )
              )
              .limit(1);

            if (stepRecord && stepRecord.length > 0) {
              // Update evidence with new photo
              const existingEvidence = (stepRecord[0].evidence as any) || {};
              const existingPhotos = existingEvidence.photos || [];
              
              // Check for duplicate photos (same fileName and size)
              const isDuplicate = existingPhotos.some((photo: any) => 
                photo.fileName === file.filename && photo.size === file.size
              );
              
              if (isDuplicate) {
                console.log('[Upload Photo] Duplicate photo detected, skipping:', {
                  fileName: file.filename,
                  size: file.size
                });
                
                // Clean up the uploaded file since we're not using it
                fs.unlink(file.path, (err) => {
                  if (err) console.error('Failed to delete duplicate file:', err);
                });
                
                // Return success but indicate it was a duplicate
                return res.json({
                  success: true,
                  duplicate: true,
                  photoId: `existing-${file.filename}`,
                  fileName: file.filename,
                  size: file.size,
                  workItemId,
                  stepId,
                  message: 'Photo already exists'
                });
              }
              
              const newPhoto = {
                data: base64Data,
                fileName: file.filename,
                size: file.size,
                uploadedAt: new Date().toISOString(),
                uploadedBy: userId
              };

              await db.update(workItemWorkflowExecutionSteps)
                .set({
                  evidence: {
                    ...existingEvidence,
                    photos: [...existingPhotos, newPhoto]
                  },
                  updatedAt: new Date()
                })
                .where(eq(workItemWorkflowExecutionSteps.id, stepRecord[0].id));

              console.log('[Upload Photo] Photo saved to database evidence');
              
              // Log photo upload in activity logs
              await storage.logActivity({
                organizationId,
                userId,
                actionType: 'file_upload',
                entityType: 'work_item',
                entityId: parseInt(workItemId),
                description: `Photo uploaded from field app: ${file.filename}`,
                metadata: {
                  action: 'photo_uploaded',
                  fileName: file.filename,
                  fileSize: file.size,
                  stepId,
                  stepIndex
                }
              });
            }
          }
        }
      }
    }

    res.json({
      success: true,
      photoId: `photo-${Date.now()}`,
      url: `/uploads/field-photos/${file.filename}`,
      fileName: file.filename,
      size: file.size,
      workItemId,
      stepId
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Failed to delete uploaded file:', err);
      });
    }
    
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// Upload audio from field app
router.post('/upload-audio', authenticateToken, audioUpload.single('file'), async (req: any, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;
    const { workItemId, stepId, duration } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!workItemId) {
      return res.status(400).json({ error: 'workItemId is required' });
    }

    console.log('[Upload Audio] Processing upload:', {
      workItemId,
      stepId,
      fileName: file.filename,
      size: file.size,
      duration
    });

    // Generate unique audio ID
    const audioId = `audio-${Date.now()}-${Math.round(Math.random() * 1E9)}`;

    // Create audio_recordings database record
    const [audioRecord] = await db.insert(audioRecordings).values({
      id: audioId,
      organizationId,
      workItemId: parseInt(workItemId),
      stepId: stepId || null,
      filePath: file.path,
      fileName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      duration: parseInt(duration) || 0,
      uploadedBy: userId,
    }).returning();

    console.log('[Upload Audio] Created audio_recordings record:', audioRecord.id);

    // Trigger async AI processing in background
    audioProcessingService.processAudioRecording(audioId, organizationId)
      .catch(err => console.error('[Upload Audio] Processing failed:', err));

    // Convert uploaded file to base64 for step evidence backward compatibility
    const audioPath = file.path;
    const audioBuffer = await fs.promises.readFile(audioPath);
    const base64Data = `data:${file.mimetype};base64,${audioBuffer.toString('base64')}`;

    // If stepId provided, update the step evidence in database
    if (stepId) {
      const execution = await db.select()
        .from(workItemWorkflowExecutions)
        .where(
          and(
            eq(workItemWorkflowExecutions.workItemId, parseInt(workItemId)),
            eq(workItemWorkflowExecutions.organizationId, organizationId)
          )
        )
        .limit(1);

      if (execution && execution.length > 0) {
        const workItem = await db.select()
          .from(workItems)
          .where(eq(workItems.id, parseInt(workItemId)))
          .limit(1);

        if (workItem && workItem.length > 0 && workItem[0].workflowTemplateId) {
          const template = await storage.getWorkflowTemplate(organizationId, workItem[0].workflowTemplateId);
          if (!template) {
            console.warn('[Upload Audio] Template not found');
            return res.json({ success: false, error: 'Template not found' });
          }
          
          const templateStep = template.steps.find((s: any) => s.id === stepId);
          const stepIndex = templateStep ? template.steps.indexOf(templateStep) : -1;

          if (stepIndex >= 0) {
            const stepRecord = await db.select()
              .from(workItemWorkflowExecutionSteps)
              .where(
                and(
                  eq(workItemWorkflowExecutionSteps.executionId, execution[0].id),
                  eq(workItemWorkflowExecutionSteps.stepIndex, stepIndex)
                )
              )
              .limit(1);

            if (stepRecord && stepRecord.length > 0) {
              const existingEvidence = (stepRecord[0].evidence as any) || {};
              const existingAudio = existingEvidence.audioRecordings || [];
              
              // Check for duplicate audio
              const isDuplicate = existingAudio.some((audio: any) => 
                audio.fileName === file.filename && audio.size === file.size
              );
              
              if (isDuplicate) {
                console.log('[Upload Audio] Duplicate audio detected, skipping:', {
                  fileName: file.filename,
                  size: file.size
                });
                
                fs.unlink(file.path, (err) => {
                  if (err) console.error('Failed to delete duplicate file:', err);
                });
                
                return res.json({
                  success: true,
                  duplicate: true,
                  audioId: `existing-${file.filename}`,
                  fileName: file.filename,
                  size: file.size,
                  workItemId,
                  stepId,
                  message: 'Audio already exists'
                });
              }
              
              const newAudio = {
                audioId,
                data: base64Data,
                fileName: file.filename,
                size: file.size,
                duration: parseInt(duration) || 0,
                uploadedAt: new Date().toISOString(),
                uploadedBy: userId
              };

              await db.update(workItemWorkflowExecutionSteps)
                .set({
                  evidence: {
                    ...existingEvidence,
                    audioRecordings: [...existingAudio, newAudio]
                  },
                  updatedAt: new Date()
                })
                .where(eq(workItemWorkflowExecutionSteps.id, stepRecord[0].id));

              console.log('[Upload Audio] Audio saved to database evidence');
              
              // Log audio upload in activity logs
              await storage.logActivity({
                organizationId,
                userId,
                actionType: 'file_upload',
                entityType: 'work_item',
                entityId: parseInt(workItemId),
                description: `Audio recording uploaded from field app: ${file.filename}`,
                metadata: {
                  action: 'audio_uploaded',
                  fileName: file.filename,
                  fileSize: file.size,
                  duration: parseInt(duration) || 0,
                  stepId,
                  stepIndex
                }
              });
            }
          }
        }
      }
    }

    // Keep file on disk for AI processing (don't delete it)

    res.json({
      success: true,
      audioId,
      fileName: file.filename,
      size: file.size,
      duration: parseInt(duration) || 0,
      workItemId,
      stepId
    });
  } catch (error) {
    console.error('Error uploading audio:', error);
    
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Failed to delete uploaded file:', err);
      });
    }
    
    res.status(500).json({ error: 'Failed to upload audio' });
  }
});

// Get audio recording with transcription and extracted data
router.get('/audio-recordings/:id', authenticateToken, async (req: any, res) => {
  try {
    const audioId = req.params.id;
    const organizationId = req.user?.organizationId;

    const [audioRec] = await db
      .select()
      .from(audioRecordings)
      .where(
        and(
          eq(audioRecordings.id, audioId),
          eq(audioRecordings.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!audioRec) {
      return res.status(404).json({ error: 'Audio recording not found' });
    }

    res.json({ audioRecording: audioRec });
  } catch (error) {
    console.error('Error fetching audio recording:', error);
    res.status(500).json({ error: 'Failed to fetch audio recording' });
  }
});

// Update audio recording (manual corrections to transcription/extracted data)
router.patch('/audio-recordings/:id', authenticateToken, async (req: any, res) => {
  try {
    const audioId = req.params.id;
    const organizationId = req.user?.organizationId;
    const { transcription, extractedData } = req.body;

    const updateData: any = {};
    if (transcription !== undefined) {
      updateData.transcription = transcription;
    }
    if (extractedData !== undefined) {
      updateData.extractedData = extractedData;
    }

    const [updated] = await db
      .update(audioRecordings)
      .set(updateData)
      .where(
        and(
          eq(audioRecordings.id, audioId),
          eq(audioRecordings.organizationId, organizationId)
        )
      )
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Audio recording not found' });
    }

    console.log('[Audio Recording] Updated:', audioId);
    res.json({ success: true, audioRecording: updated });
  } catch (error) {
    console.error('Error updating audio recording:', error);
    res.status(500).json({ error: 'Failed to update audio recording' });
  }
});

// Trigger re-processing of audio recording
router.post('/audio-recordings/:id/reprocess', authenticateToken, async (req: any, res) => {
  try {
    const audioId = req.params.id;
    const organizationId = req.user?.organizationId;

    const [audioRec] = await db
      .select()
      .from(audioRecordings)
      .where(
        and(
          eq(audioRecordings.id, audioId),
          eq(audioRecordings.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!audioRec) {
      return res.status(404).json({ error: 'Audio recording not found' });
    }

    // Reset processing status
    await db
      .update(audioRecordings)
      .set({
        processingStatus: 'pending',
        processingError: null
      })
      .where(eq(audioRecordings.id, audioId));

    // Trigger reprocessing
    audioProcessingService.processAudioRecording(audioId, organizationId)
      .catch(err => console.error('[Reprocess Audio] Processing failed:', err));

    res.json({ success: true, message: 'Reprocessing started' });
  } catch (error) {
    console.error('Error reprocessing audio:', error);
    res.status(500).json({ error: 'Failed to reprocess audio' });
  }
});

// Delete photo from workflow step evidence
router.delete('/delete-photo', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;
    const { workItemId, stepId, photoIndex } = req.body;

    if (!workItemId || stepId === undefined || photoIndex === undefined) {
      return res.status(400).json({ error: 'workItemId, stepId, and photoIndex are required' });
    }

    console.log('[Delete Photo] Processing deletion:', {
      workItemId,
      stepId,
      photoIndex
    });

    // Get the step record directly using the execution step ID
    const stepRecord = await db.select()
      .from(workItemWorkflowExecutionSteps)
      .where(
        and(
          eq(workItemWorkflowExecutionSteps.id, parseInt(stepId)),
          eq(workItemWorkflowExecutionSteps.organizationId, organizationId),
          eq(workItemWorkflowExecutionSteps.workItemId, parseInt(workItemId))
        )
      )
      .limit(1);

    if (!stepRecord || stepRecord.length === 0) {
      return res.status(404).json({ error: 'Step record not found' });
    }

    const existingEvidence = (stepRecord[0].evidence as any) || {};
    const existingPhotos = existingEvidence.photos || [];

    if (photoIndex < 0 || photoIndex >= existingPhotos.length) {
      return res.status(400).json({ error: 'Invalid photo index' });
    }

    // Get photo info for logging before deletion
    const deletedPhoto = existingPhotos[photoIndex];

    // Remove the photo from the array
    const updatedPhotos = existingPhotos.filter((_: any, index: number) => index !== photoIndex);

    // Update the step evidence
    await db.update(workItemWorkflowExecutionSteps)
      .set({
        evidence: {
          ...existingEvidence,
          photos: updatedPhotos
        },
        updatedAt: new Date()
      })
      .where(eq(workItemWorkflowExecutionSteps.id, stepRecord[0].id));

    console.log('[Delete Photo] Photo deleted from evidence');

    // Log photo deletion in activity logs
    await storage.logActivity({
      organizationId,
      userId,
      actionType: 'deletion',
      entityType: 'work_item',
      entityId: parseInt(workItemId),
      description: `Photo deleted from workflow step: ${stepRecord[0].stepTitle}`
    });

    res.json({
      success: true,
      message: 'Photo deleted successfully',
      remainingPhotos: updatedPhotos.length
    });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

export default router;