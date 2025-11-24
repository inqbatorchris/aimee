import { Router, Request } from 'express';
import { authenticateToken } from '../auth';
import { storage } from '../storage';
import { insertWorkflowTemplateSchema, integrations, workItems } from '@shared/schema';
import { z } from 'zod';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { SplynxService } from '../services/integrations/splynxService';
import crypto from 'crypto';

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    organizationId: number;
    role: string;
  };
}

const router = Router();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16;

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required for completion callbacks');
}

function decrypt(text: string): string {
  if (!text) return '';
  
  try {
    const parts = text.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

async function processCompletionCallbacks(
  callbacks: any[],
  completedStepId: string,
  stepData: any,
  workItemId: number,
  organizationId: number
) {
  console.log(`[CompletionCallbacks] Processing callbacks for step ${completedStepId}`);
  
  for (const callback of callbacks) {
    try {
      const matchingMappings = callback.fieldMappings?.filter((m: any) => m.sourceStepId === completedStepId) || [];
      
      if (matchingMappings.length === 0) {
        console.log(`[CompletionCallbacks] No mappings for step ${completedStepId} in callback ${callback.action}`);
        continue;
      }

      console.log(`[CompletionCallbacks] Found ${matchingMappings.length} mappings for step ${completedStepId}`);

      if (callback.integrationName === 'splynx') {
        const [workItem] = await db
          .select()
          .from(workItems)
          .where(eq(workItems.id, workItemId))
          .limit(1);

        if (!workItem) {
          console.error(`[CompletionCallbacks] Work item ${workItemId} not found`);
          continue;
        }

        const ticketId = workItem.workflowMetadata?.splynx_ticket_id;
        if (!ticketId) {
          console.error(`[CompletionCallbacks] No Splynx ticket ID in work item metadata`);
          continue;
        }

        const [integration] = await db
          .select()
          .from(integrations)
          .where(
            and(
              eq(integrations.organizationId, organizationId),
              eq(integrations.platformType, 'splynx')
            )
          )
          .limit(1);

        if (!integration || !integration.credentialsEncrypted) {
          console.error(`[CompletionCallbacks] Splynx integration not found or not configured`);
          continue;
        }

        const credentials = JSON.parse(decrypt(integration.credentialsEncrypted));
        const splynxService = new SplynxService({ 
          baseUrl: credentials.baseUrl, 
          authHeader: credentials.authHeader 
        });

        if (callback.action === 'addTicketMessage') {
          const messageMapping = matchingMappings.find((m: any) => m.targetField === 'message');
          const isInternalMapping = matchingMappings.find((m: any) => m.targetField === 'isInternal');
          
          const message = stepData?.data?.[messageMapping?.sourceField] || stepData?.[messageMapping?.sourceField];
          const isInternal = stepData?.data?.[isInternalMapping?.sourceField] || stepData?.[isInternalMapping?.sourceField];

          if (message) {
            console.log(`[CompletionCallbacks] Adding message to ticket ${ticketId}`);
            await splynxService.addTicketMessage(ticketId, message, isInternal === 'true' || isInternal === true);
          }
        } else if (callback.action === 'updateTicketStatus') {
          const statusMapping = matchingMappings.find((m: any) => m.targetField === 'statusId');
          const statusId = stepData?.data?.[statusMapping?.sourceField] || stepData?.[statusMapping?.sourceField];

          if (statusId) {
            console.log(`[CompletionCallbacks] Updating ticket ${ticketId} status to ${statusId}`);
            await splynxService.updateTicketStatus(ticketId, statusId);
          }
        }
      }
    } catch (error) {
      console.error(`[CompletionCallbacks] Error processing callback:`, error);
    }
  }
}

// Transform database step format to UI-compatible format
function transformStepForUI(dbStep: any) {
  const baseStep = {
    id: dbStep.id,
    name: dbStep.title || dbStep.name || dbStep.label, // Support title, name, and label
    label: dbStep.label || dbStep.title || dbStep.name, // Support label field for frontend
    description: dbStep.description,
    order: dbStep.order,
    required: dbStep.required !== undefined ? dbStep.required : true,
  };

  // Map step types
  let stepType = dbStep.type;
  if (stepType === 'checklist') {
    stepType = 'inspection';
  }

  // Build config based on step type
  let config: any = {};

  // Check for form fields in both formFields and config.fields
  const formFields = dbStep.formFields || dbStep.config?.fields;
  const mappedFormFields = formFields && formFields.length > 0 
    ? formFields.map((field: any) => ({
        id: field.id,
        name: field.id || field.name,
        type: field.type,
        label: field.label,
        required: field.required !== undefined ? field.required : false,
        placeholder: field.placeholder,
        options: field.options,
      }))
    : null;
  
  if (mappedFormFields) {
    config.fields = mappedFormFields;
  }

  // Check for photo config in both photoConfig and config
  const photoConfig = dbStep.photoConfig || dbStep.config;
  if (photoConfig && (photoConfig.minPhotos !== undefined || photoConfig.maxPhotos !== undefined)) {
    config.minPhotos = photoConfig.minPhotos;
    config.maxPhotos = photoConfig.maxPhotos;
    config.category = photoConfig.category;
  }

  // Copy additional config properties
  if (dbStep.config) {
    if (dbStep.config.placeholder) config.placeholder = dbStep.config.placeholder;
    if (dbStep.config.multiline !== undefined) config.multiline = dbStep.config.multiline;
    // Preserve OCR configuration
    if (dbStep.config.photoAnalysisConfig) config.photoAnalysisConfig = dbStep.config.photoAnalysisConfig;
  }

  if (dbStep.checklistItems && dbStep.checklistItems.length > 0) {
    // Transform checklist items to ensure consistent format with id and name
    config.checklistItems = dbStep.checklistItems.map((item: any) => ({
      id: item.id,
      name: item.name || item.title, // Support both name and title
      checked: item.checked || false,
    }));
  }

  return {
    ...baseStep,
    type: stepType,
    config: Object.keys(config).length > 0 ? config : undefined,
    formFields: mappedFormFields || undefined, // Add formFields at step level for Field App
  };
}

function transformTemplateForUI(template: any) {
  if (!template) return null;
  
  return {
    ...template,
    steps: Array.isArray(template.steps) 
      ? template.steps.map(transformStepForUI)
      : [],
  };
}

router.get('/templates', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const templates = await storage.getWorkflowTemplates(user.organizationId);
    const transformedTemplates = templates.map(transformTemplateForUI);
    res.json(transformedTemplates);
  } catch (error) {
    console.error('Error fetching workflow templates:', error);
    res.status(500).json({ error: 'Failed to fetch workflow templates' });
  }
});

router.get('/templates/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const template = await storage.getWorkflowTemplate(user.organizationId, req.params.id);
    
    if (!template) {
      return res.status(404).json({ error: 'Workflow template not found' });
    }
    
    const transformedTemplate = transformTemplateForUI(template);
    res.json(transformedTemplate);
  } catch (error) {
    console.error('Error fetching workflow template:', error);
    res.status(500).json({ error: 'Failed to fetch workflow template' });
  }
});

router.post('/templates', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const validated = insertWorkflowTemplateSchema.parse({
      ...req.body,
      organizationId: user.organizationId
    });

    const template = await storage.createWorkflowTemplate(validated);
    res.status(201).json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    
    // Check for duplicate key constraint violation
    if ((error as any).code === '23505') {
      console.error('Error creating workflow template:', error);
      return res.status(409).json({ 
        error: 'A workflow template with this name already exists. Please choose a different name.' 
      });
    }
    
    console.error('Error creating workflow template:', error);
    res.status(500).json({ error: 'Failed to create workflow template' });
  }
});

router.put('/templates/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const existing = await storage.getWorkflowTemplate(user.organizationId, req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Workflow template not found' });
    }

    const updateData = insertWorkflowTemplateSchema.partial().omit({ organizationId: true, id: true }).parse(req.body);
    const updated = await storage.updateWorkflowTemplate(user.organizationId, req.params.id, updateData);
    
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[Workflows] Template validation error:', JSON.stringify(error.errors, null, 2));
      console.error('[Workflows] Request body:', JSON.stringify(req.body, null, 2));
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating workflow template:', error);
    res.status(500).json({ error: 'Failed to update workflow template' });
  }
});

router.delete('/templates/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const deleted = await storage.deleteWorkflowTemplate(user.organizationId, req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Workflow template not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting workflow template:', error);
    res.status(500).json({ error: 'Failed to delete workflow template' });
  }
});

// Workflow assignment and execution endpoints
router.post('/work-items/:id/assign', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const workItemId = parseInt(req.params.id);
    const { templateId } = req.body;

    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const result = await storage.assignWorkflowToWorkItem(user.organizationId, workItemId, templateId);
    res.json(result);
  } catch (error) {
    console.error('Error assigning workflow:', error);
    res.status(500).json({ error: 'Failed to assign workflow' });
  }
});

router.get('/work-items/:id/workflow', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const workItemId = parseInt(req.params.id);
    const workflow = await storage.getWorkItemWorkflow(user.organizationId, workItemId);
    res.json(workflow);
  } catch (error) {
    console.error('Error fetching work item workflow:', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

router.put('/work-items/:workItemId/workflow/steps/:stepId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const { workItemId, stepId } = req.params;
    const stepData = req.body;

    // Get execution ID from work item
    const workflow = await storage.getWorkItemWorkflow(user.organizationId, parseInt(workItemId));
    
    if (!workflow.execution) {
      return res.status(404).json({ error: 'No workflow execution found for this work item' });
    }

    const updated = await storage.updateWorkflowStepCompletion(
      user.organizationId,
      workflow.execution.id,
      stepId,
      stepData
    );

    // Process completion callbacks if this step has any
    if (workflow.template?.completionCallbacks) {
      await processCompletionCallbacks(
        workflow.template.completionCallbacks,
        stepId,
        stepData,
        parseInt(workItemId),
        user.organizationId
      );
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating workflow step:', error);
    res.status(500).json({ error: 'Failed to update workflow step' });
  }
});

// Complete workflow and execute callbacks
router.post('/work-items/:workItemId/workflow/complete', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const workItemId = parseInt(req.params.workItemId);
    const { executionData } = req.body;

    // Get workflow and template
    const workflow = await storage.getWorkItemWorkflow(user.organizationId, workItemId);
    
    if (!workflow.template || !workflow.execution) {
      return res.status(404).json({ error: 'No workflow found for this work item' });
    }

    // Process completion callbacks if defined
    const callbacks = workflow.template.completionCallbacks || [];
    const callbackResults = [];

    for (const callback of callbacks) {
      if (callback.integrationName === 'fiber-network' && callback.action === 'create-node') {
        try {
          // Extract data from execution using field mappings
          const nodeData: any = {
            workItemId,
            photos: []
          };

          // Map fields from workflow steps to target fields
          for (const mapping of callback.fieldMappings || []) {
            const stepData = executionData[mapping.sourceStepId];
            if (stepData) {
              // Check for geolocation data first
              if (stepData.geolocation && (mapping.sourceField === 'latitude' || mapping.sourceField === 'longitude')) {
                const value = stepData.geolocation[mapping.sourceField];
                if (value !== undefined && value !== null) {
                  nodeData[mapping.targetField] = value;
                }
              }
              // Then check for regular data fields
              else if (stepData.data) {
                const value = stepData.data[mapping.sourceField];
                if (value !== undefined && value !== null) {
                  nodeData[mapping.targetField] = value;
                }
              }
            }
          }

          // Collect all photos from photo steps
          Object.values(executionData).forEach((step: any) => {
            if (step.photos && Array.isArray(step.photos)) {
              nodeData.photos.push(...step.photos.map((photo: any) => ({
                data: photo.data || photo.url,
                fileName: photo.fileName || `photo-${Date.now()}.png`,
                fileSize: photo.fileSize || 0,
                uploadedBy: user.id,
                uploaderName: user.fullName || user.email,
                timestamp: new Date().toISOString(),
                category: photo.category || 'general',
                source: 'workflow',
                workItemId
              })));
            }
          });

          // Extract fiber details from fiber-details step
          const fiberDetailsStep = executionData['fiber-details'];
          if (fiberDetailsStep && fiberDetailsStep.data) {
            nodeData.fiberDetails = {
              installations: [{
                workItemId,
                completedAt: new Date().toISOString(),
                completedBy: user.fullName || user.email,
                ...fiberDetailsStep.data
              }]
            };
          }

          // Call the fiber network API to create the node
          const axios = await import('axios');
          const response = await axios.default.post(
            `http://localhost:${process.env.PORT || 5000}/api/fiber-network/nodes/from-workflow`,
            nodeData,
            {
              headers: {
                'Authorization': req.headers.authorization || ''
              }
            }
          );

          callbackResults.push({
            callback: callback.integrationName,
            success: true,
            data: response.data
          });
        } catch (callbackError) {
          console.error('Error executing completion callback:', callbackError);
          callbackResults.push({
            callback: callback.integrationName,
            success: false,
            error: callbackError instanceof Error ? callbackError.message : 'Unknown error'
          });
        }
      }
    }

    // Mark workflow execution as completed
    const updated = await storage.updateWorkflowStepCompletion(
      user.organizationId,
      workflow.execution.id,
      'workflow-complete',
      { completed: true, callbackResults }
    );

    res.json({ 
      success: true, 
      execution: updated,
      callbackResults 
    });
  } catch (error) {
    console.error('Error completing workflow:', error);
    res.status(500).json({ error: 'Failed to complete workflow' });
  }
});

export default router;
