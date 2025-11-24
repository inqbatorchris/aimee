import { db } from '../db';
import { workItems, workItemWorkflowExecutions, workItemWorkflowExecutionSteps, workflowTemplates, workItemSources, activityLogs } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export interface CreateWorkItemWithWorkflowData {
  organizationId: number;
  title: string;
  description?: string;
  assignedTo?: number;
  dueDate?: string;
  workflowTemplateId: string;
  workflowSource: string;
  workflowMetadata?: Record<string, any>;
  teamId?: number;
  createdBy?: number;
}

export interface StartWorkflowExecutionData {
  workItemId: number;
  organizationId: number;
  userId?: number;
}

export interface UpdateWorkflowStepData {
  executionId: number;
  organizationId: number;
  currentStepId: string;
  executionData: Record<string, any>;
}

export class WorkItemWorkflowService {
  async createWorkItemWithWorkflow(data: CreateWorkItemWithWorkflowData) {
    const workItem = await db
      .insert(workItems)
      .values({
        organizationId: data.organizationId,
        title: data.title,
        description: data.description,
        assignedTo: data.assignedTo,
        dueDate: data.dueDate,
        workflowTemplateId: data.workflowTemplateId,
        workflowSource: data.workflowSource,
        workflowMetadata: data.workflowMetadata || {},
        teamId: data.teamId,
        createdBy: data.createdBy,
        status: 'Planning',
      })
      .returning();
    
    return workItem[0];
  }

  async startWorkflowExecution(data: StartWorkflowExecutionData) {
    const { workItemId, organizationId } = data;

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

    if (!workItem.length || !workItem[0].workflowTemplateId) {
      throw new Error('Work item not found or has no workflow template');
    }

    const existingExecution = await db
      .select()
      .from(workItemWorkflowExecutions)
      .where(
        and(
          eq(workItemWorkflowExecutions.workItemId, workItemId),
          eq(workItemWorkflowExecutions.status, 'in_progress')
        )
      )
      .limit(1);

    if (existingExecution.length > 0) {
      return existingExecution[0];
    }

    const execution = await db
      .insert(workItemWorkflowExecutions)
      .values({
        organizationId,
        workItemId,
        workflowTemplateId: workItem[0].workflowTemplateId,
        status: 'in_progress',
        executionData: {},
        startedAt: new Date(),
      })
      .returning();

    // Get workflow template and create step records
    const template = await this.getWorkflowTemplate(workItem[0].workflowTemplateId, organizationId);
    if (template && template.steps && Array.isArray(template.steps)) {
      const stepRecords = template.steps.map((step: any, index: number) => ({
        organizationId,
        workItemId,
        executionId: execution[0].id,
        stepIndex: index,
        stepTitle: step.title || step.label || `Step ${index + 1}`,
        stepDescription: step.description,
        status: 'not_started' as const,
        // Store full step configuration as evidence to preserve checklist items, form fields, etc.
        evidence: {
          stepId: step.id,
          stepType: step.type,
          checklistItems: step.checklistItems,
          formFields: step.formFields,
          photoConfig: step.photoConfig,
          config: step.config,
          required: step.required
        } as any
      }));

      if (stepRecords.length > 0) {
        await db.insert(workItemWorkflowExecutionSteps).values(stepRecords);
      }
    }

    return execution[0];
  }

  async updateWorkflowStep(data: UpdateWorkflowStepData) {
    const { executionId, organizationId, currentStepId, executionData } = data;

    const execution = await db
      .update(workItemWorkflowExecutions)
      .set({
        currentStepId,
        executionData,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workItemWorkflowExecutions.id, executionId),
          eq(workItemWorkflowExecutions.organizationId, organizationId)
        )
      )
      .returning();

    return execution[0];
  }

  async completeWorkflow(executionId: number, organizationId: number) {
    const execution = await db
      .update(workItemWorkflowExecutions)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workItemWorkflowExecutions.id, executionId),
          eq(workItemWorkflowExecutions.organizationId, organizationId)
        )
      )
      .returning();

    if (execution.length > 0) {
      // Update work item status
      await db
        .update(workItems)
        .set({
          status: 'Completed',
          updatedAt: new Date(),
        })
        .where(eq(workItems.id, execution[0].workItemId));

      // Get workflow template to check for completion callbacks
      if (!execution[0].workflowTemplateId) {
        return execution[0];
      }
      
      const template = await this.getWorkflowTemplate(execution[0].workflowTemplateId, organizationId);
      
      // Execute completion callbacks if configured
      if (template?.completionCallbacks && Array.isArray(template.completionCallbacks)) {
        console.log(`[Workflow Completion] Found ${template.completionCallbacks.length} completion callback(s)`);
        
        for (const callback of template.completionCallbacks) {
          try {
            await this.executeCompletionCallback(callback, executionId, organizationId, execution[0].workItemId);
          } catch (error) {
            console.error('[Workflow Completion] Callback execution failed:', error);
          }
        }
      }

      // Legacy: Check if this workflow should update a fiber network node (backwards compatibility)
      const [workItem] = await db
        .select()
        .from(workItems)
        .where(eq(workItems.id, execution[0].workItemId))
        .limit(1);

      const metadata = workItem?.workflowMetadata as any;
      if (metadata?.fiberNodeId) {
        const fiberNodeId = metadata.fiberNodeId;
        console.log(`[Workflow Completion] Updating fiber node ${fiberNodeId} from completed workflow (legacy)`);

        // Get workflow steps for THIS execution only (not all executions)
        const steps = await db
          .select()
          .from(workItemWorkflowExecutionSteps)
          .where(
            and(
              eq(workItemWorkflowExecutionSteps.executionId, executionId),
              eq(workItemWorkflowExecutionSteps.organizationId, organizationId)
            )
          )
          .orderBy(workItemWorkflowExecutionSteps.stepIndex);
        
        // Collect all photos from workflow steps
        const workflowPhotos: any[] = [];
        let workflowNotes = '';
        
        for (const step of steps) {
          // Photos are stored in step.evidence.photos array, not directly in evidence
          if (step.evidence && typeof step.evidence === 'object') {
            const evidence = step.evidence as any;
            if (evidence.photos && Array.isArray(evidence.photos)) {
              workflowPhotos.push(...evidence.photos);
            }
          }
          if (step.notes) {
            workflowNotes += `${step.stepTitle}: ${step.notes}\n`;
          }
        }
        
        // Only update fiber node if there are photos or notes to add
        if (workflowPhotos.length === 0 && !workflowNotes.trim()) {
          console.log(`[Workflow Completion] No evidence or notes to update for fiber node ${fiberNodeId}`);
          return execution[0];
        }

        // Get current fiber node to append photos
        const { fiberNetworkNodes } = await import('../../shared/schema.js');
        const [currentNode] = await db
          .select()
          .from(fiberNetworkNodes)
          .where(eq(fiberNetworkNodes.id, fiberNodeId))
          .limit(1);

        if (currentNode) {
          const existingPhotos = currentNode.photos || [];
          const allPhotos = [...existingPhotos, ...workflowPhotos];

          // Append notes
          const existingNotes = currentNode.notes || '';
          const updatedNotes = existingNotes
            ? `${existingNotes}\n\nWorkflow Completion (${new Date().toLocaleDateString()}):\n${workflowNotes}`
            : `Workflow Completion (${new Date().toLocaleDateString()}):\n${workflowNotes}`;

          // Update fiber node
          await db
            .update(fiberNetworkNodes)
            .set({
              photos: allPhotos,
              notes: updatedNotes,
              updatedAt: new Date(),
            })
            .where(eq(fiberNetworkNodes.id, fiberNodeId));

          // Log the activity
          const { fiberNetworkActivityLogs, users } = await import('../../shared/schema.js');
          // Get the user who completed the work item
          const completedBy = workItem?.assignedTo || workItem?.createdBy || 0;
          
          // Get user name from database if we have a valid userId
          let completedByName = 'Field Worker';
          if (completedBy > 0) {
            const [user] = await db
              .select({ fullName: users.fullName, email: users.email })
              .from(users)
              .where(eq(users.id, completedBy))
              .limit(1);
            if (user) {
              completedByName = user.fullName || user.email;
            }
          }
          
          await db.insert(fiberNetworkActivityLogs).values({
            organizationId,
            userId: completedBy,
            userName: completedByName,
            actionType: 'workflow_completed',
            entityType: 'fiber_node',
            entityId: fiberNodeId,
            workItemId: execution[0].workItemId,
            changes: {
              workflowName: workItem?.title,
              photosAdded: workflowPhotos.length,
              notesAdded: workflowNotes,
            },
          } as any);

          console.log(`[Workflow Completion] Updated fiber node ${fiberNodeId} with ${workflowPhotos.length} photos`);
        }
      }

      // Log workflow completion activity
      await this.logWorkflowCompletionActivity(execution[0], organizationId);
    }

    return execution[0];
  }

  /**
   * Log workflow completion activity
   */
  private async logWorkflowCompletionActivity(
    execution: any,
    organizationId: number
  ) {
    try {
      // Get work item
      const [workItem] = await db
        .select()
        .from(workItems)
        .where(eq(workItems.id, execution.workItemId))
        .limit(1);

      if (!workItem) return;

      // Get template name
      let templateName = 'Workflow';
      if (execution.workflowTemplateId) {
        const template = await this.getWorkflowTemplate(execution.workflowTemplateId, organizationId);
        if (template) {
          templateName = template.name || 'Workflow';
        }
      }

      // Try to get source record linkage
      let sourceTable = 'work_item';
      let sourceId = execution.workItemId;
      
      try {
        const [workItemSource] = await db
          .select()
          .from(workItemSources)
          .where(
            and(
              eq(workItemSources.workItemId, execution.workItemId),
              eq(workItemSources.organizationId, organizationId)
            )
          )
          .limit(1);

        if (workItemSource) {
          sourceTable = workItemSource.sourceTable;
          sourceId = workItemSource.sourceId;
        } else {
          // Fallback to metadata
          const metadata = workItem.workflowMetadata as any;
          if (metadata?.addressRecordId) {
            sourceTable = 'address';
            sourceId = metadata.addressRecordId;
          } else if (metadata?.customerId) {
            sourceTable = 'customer';
            sourceId = metadata.customerId;
          }
        }
      } catch (error) {
        // Fallback
      }

      const description = `Workflow "${templateName}" completed successfully`;

      // Create activity log
      await db.insert(activityLogs).values({
        organizationId,
        userId: workItem.assignedTo || workItem.createdBy || null,
        actionType: 'completion',
        entityType: sourceTable,
        entityId: sourceId,
        description,
        metadata: {
          workItemId: execution.workItemId,
          workItemTitle: workItem.title,
          workflowTemplateId: execution.workflowTemplateId,
          templateName,
          executionId: execution.id,
          startedAt: execution.startedAt,
          completedAt: execution.completedAt,
        },
      });

      console.log(`[Activity Log] Workflow completion logged: ${description}`);
    } catch (error) {
      console.error('[WorkItemWorkflowService] Failed to log workflow completion:', error);
      // Don't throw - logging failure shouldn't break workflow completion
    }
  }

  private async executeCompletionCallback(
    callback: any,
    executionId: number,
    organizationId: number,
    workItemId: number
  ) {
    console.log(`[Callback] Executing ${callback.action} for ${callback.integrationName}`);

    // Get workflow execution to extract data from executionData
    const [execution] = await db
      .select()
      .from(workItemWorkflowExecutions)
      .where(
        and(
          eq(workItemWorkflowExecutions.id, executionId),
          eq(workItemWorkflowExecutions.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!execution) {
      throw new Error('Workflow execution not found');
    }

    const executionData = (execution.executionData as Record<string, any>) || {};
    console.log(`[Callback] ExecutionData keys:`, Object.keys(executionData));

    // Get execution steps to access evidence data
    const steps = await db
      .select()
      .from(workItemWorkflowExecutionSteps)
      .where(
        and(
          eq(workItemWorkflowExecutionSteps.executionId, executionId),
          eq(workItemWorkflowExecutionSteps.organizationId, organizationId)
        )
      )
      .orderBy(workItemWorkflowExecutionSteps.stepIndex);

    // Build a map of steps by stepId for easy lookup
    const stepsByStepId: Record<string, any> = {};
    steps.forEach(step => {
      const evidence = step.evidence as any;
      if (evidence?.stepId) {
        stepsByStepId[evidence.stepId] = step;
      }
    });

    // Map field data from execution
    const mappedData: Record<string, any> = {};
    
    if (callback.fieldMappings && Array.isArray(callback.fieldMappings)) {
      for (const mapping of callback.fieldMappings) {
        const { sourceStepId, sourceField, targetField } = mapping;
        
        let value: any = undefined;
        
        // First, try to get value from executionData (backward compatibility)
        const stepData = executionData[sourceStepId];
        if (stepData) {
          // Check for geolocation data first
          if (stepData.geolocation && stepData.geolocation[sourceField] !== undefined) {
            value = stepData.geolocation[sourceField];
          }
          // Check for data fields (form responses, etc.)
          else if (stepData.data && stepData.data[sourceField] !== undefined) {
            value = stepData.data[sourceField];
          }
          // Check for notes field
          else if (sourceField === 'notes' && stepData.notes) {
            value = stepData.notes;
          }
        }
        
        // If not found in executionData, check step evidence
        if ((value === undefined || value === null || value === '') && stepsByStepId[sourceStepId]) {
          const step = stepsByStepId[sourceStepId];
          const evidence = step.evidence as any;
          
          if (evidence) {
            // Check direct evidence fields
            if (evidence[sourceField] !== undefined) {
              value = evidence[sourceField];
              console.log(`[Callback] Found ${sourceStepId}.${sourceField} in evidence: ${value}`);
            }
            // Check evidence.checked for checkbox steps
            else if (sourceField === 'checked' && evidence.checked !== undefined) {
              value = evidence.checked;
              console.log(`[Callback] Found ${sourceStepId}.checked in evidence: ${value}`);
            }
          }
          
          // Check step notes
          if ((value === undefined || value === null || value === '') && sourceField === 'text' && step.notes) {
            value = step.notes;
            console.log(`[Callback] Found ${sourceStepId}.text in step notes: ${value}`);
          }
        }
        
        if (value !== undefined && value !== null && value !== '') {
          mappedData[targetField] = value;
          console.log(`[Callback] Mapped ${sourceStepId}.${sourceField} -> ${targetField} = ${value}`);
        } else {
          console.log(`[Callback] No value found for ${sourceStepId}.${sourceField} in executionData or evidence`);
        }
      }
    }

    // Add photos and notes from all steps
    const allPhotos: any[] = [];
    let allNotes = '';
    
    // Collect from executionData (backward compatibility)
    Object.values(executionData).forEach((stepData: any) => {
      if (stepData.photos && Array.isArray(stepData.photos)) {
        allPhotos.push(...stepData.photos);
      }
      if (stepData.notes) {
        allNotes += stepData.notes + '\n';
      }
    });
    
    // Collect from step evidence (current storage location)
    console.log(`[Callback] Processing ${steps.length} steps for photos`);
    steps.forEach((step: any) => {
      const evidence = step.evidence as any;
      console.log(`[Callback] Step ${step.id} evidence keys:`, evidence ? Object.keys(evidence) : 'no evidence');
      if (evidence) {
        // Collect photos from evidence
        if (evidence.photos && Array.isArray(evidence.photos)) {
          allPhotos.push(...evidence.photos);
          console.log(`[Callback] Collected ${evidence.photos.length} photos from step ${step.id} (stepId: ${evidence.stepId})`);
        }
        // Collect photo URLs if stored differently
        if (evidence.photoUrl) {
          allPhotos.push({ url: evidence.photoUrl });
          console.log(`[Callback] Collected photoUrl from step ${step.id}`);
        }
      }
      // Collect notes from step
      if (step.notes) {
        allNotes += step.notes + '\n';
      }
    });
    
    console.log(`[Callback] Total photos collected: ${allPhotos.length}`);
    
    if (allPhotos.length > 0) {
      mappedData.photos = allPhotos;
    }
    if (allNotes.trim()) {
      mappedData.notes = allNotes;
    }

    // Add organization context
    mappedData.organizationId = organizationId;
    mappedData.workItemId = workItemId;

    console.log(`[Callback] Mapped data:`, JSON.stringify(mappedData, null, 2));

    // Handle Splynx-specific callbacks (update ticket/task status)
    if (callback.action === 'update_splynx_status' || callback.splynxAction) {
      const { splynxAction, splynxEntityType, splynxStatusId, splynxMessage, integrationId } = callback;
      
      // Get work item to access metadata
      const [workItem] = await db
        .select()
        .from(workItems)
        .where(eq(workItems.id, workItemId))
        .limit(1);
      
      if (workItem?.workflowMetadata) {
        const metadata = workItem.workflowMetadata as any;
        const ticketId = metadata.splynx_ticket_id;
        const taskId = metadata.splynx_task_id;
        const entityType = splynxEntityType || (ticketId ? 'ticket' : taskId ? 'task' : null);
        const entityId = ticketId || taskId;
        
        if (entityId && entityType && integrationId) {
          try {
            // Get integration credentials
            const { integrations } = await import('@shared/schema');
            const { eq } = await import('drizzle-orm');
            
            const [integration] = await db
              .select()
              .from(integrations)
              .where(eq(integrations.id, integrationId))
              .limit(1);
            
            if (integration?.credentialsEncrypted) {
              // Decrypt credentials (reuse from integrations.ts)
              const crypto = await import('crypto');
              const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
              const parts = integration.credentialsEncrypted.split(':');
              const iv = Buffer.from(parts[0], 'hex');
              const encryptedText = parts[1];
              const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
              const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
              let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
              decrypted += decipher.final('utf8');
              const credentials = JSON.parse(decrypted);
              
              // Create Splynx service
              const { SplynxService } = await import('../services/integrations/splynxService');
              const splynxService = new SplynxService(credentials);
              
              // Execute Splynx action
              if (splynxAction === 'update_status' && splynxStatusId) {
                if (entityType === 'ticket') {
                  await splynxService.updateTicketStatus(entityId, splynxStatusId);
                  console.log(`[Callback] Updated Splynx ticket ${entityId} status to ${splynxStatusId}`);
                } else if (entityType === 'task') {
                  await splynxService.updateTaskStatus(entityId, splynxStatusId);
                  console.log(`[Callback] Updated Splynx task ${entityId} status to ${splynxStatusId}`);
                }
              }
              
              // Add message if configured
              if (splynxMessage && entityType === 'ticket') {
                const processedMessage = splynxMessage.replace(/\{workItemId\}/g, workItemId.toString())
                  .replace(/\{completedAt\}/g, new Date().toISOString());
                await splynxService.addTicketMessage(entityId, processedMessage);
                console.log(`[Callback] Added message to Splynx ticket ${entityId}`);
              }
            }
          } catch (error: any) {
            console.error(`[Callback] Splynx update failed:`, error.message);
          }
        }
      }
    }

    // Handle database integration (for OCR and other use cases)
    if (callback.action === 'database_integration' && callback.databaseConfig) {
      const { targetTable, recordIdSource } = callback.databaseConfig;
      
      console.log(`[Callback] Database integration: updating ${targetTable}`);

      try {
        // Determine the target record ID
        let targetRecordId: number | undefined;

        if (recordIdSource === 'work_item_source') {
          // Get from work_item_sources table (OCR use case)
          const { workItemSources } = await import('@shared/schema');
          const [source] = await db
            .select()
            .from(workItemSources)
            .where(
              and(
                eq(workItemSources.workItemId, workItemId),
                eq(workItemSources.organizationId, organizationId)
              )
            )
            .limit(1);

          if (source && source.sourceTable === targetTable) {
            targetRecordId = source.sourceId;
            console.log(`[Callback] Using work item source: ${targetTable}#${targetRecordId}`);
          }
        } else if (recordIdSource?.startsWith('workflow_metadata.')) {
          // Get from workflow metadata (e.g., workflow_metadata.addressId)
          const metadataKey = recordIdSource.replace('workflow_metadata.', '');
          const [workItem] = await db
            .select()
            .from(workItems)
            .where(eq(workItems.id, workItemId))
            .limit(1);

          if (workItem?.workflowMetadata) {
            const metadata = workItem.workflowMetadata as any;
            targetRecordId = metadata[metadataKey];
            console.log(`[Callback] Using workflow metadata.${metadataKey}: ${targetRecordId}`);
          }
        }

        if (!targetRecordId) {
          throw new Error(`Could not determine target record ID from ${recordIdSource}`);
        }

        // Use FieldManagerService to update the record
        const { FieldManagerService } = await import('./ocr/FieldManagerService');
        const { customFieldDefinitions } = await import('@shared/schema');
        const fieldManager = new FieldManagerService();

        // Get allowed custom fields for this table to validate mappings
        const allowedFields = await db
          .select()
          .from(customFieldDefinitions)
          .where(
            and(
              eq(customFieldDefinitions.organizationId, organizationId),
              eq(customFieldDefinitions.tableName, targetTable)
            )
          );

        const allowedFieldNames = new Set(allowedFields.map(f => f.fieldName));
        console.log(`[Callback] Allowed fields for ${targetTable}:`, Array.from(allowedFieldNames));

        // Update each mapped field (only if allowed or no restrictions)
        for (const [fieldName, value] of Object.entries(mappedData)) {
          // Skip meta fields
          if (['organizationId', 'workItemId', 'photos', 'notes'].includes(fieldName)) {
            continue;
          }

          // Validate field is allowed (if custom fields are defined)
          if (allowedFields.length > 0 && !allowedFieldNames.has(fieldName)) {
            console.warn(`[Callback] Skipping ${fieldName}: not in allowed custom fields for ${targetTable}`);
            continue;
          }

          await fieldManager.updateDynamicField({
            organizationId,
            tableName: targetTable,
            recordId: targetRecordId,
            fieldName,
            value,
          });

          console.log(`[Callback] Updated ${targetTable}#${targetRecordId}.${fieldName} = ${value}`);
        }

        return { 
          success: true, 
          mappedData,
          targetTable,
          targetRecordId,
        };
      } catch (error) {
        console.error('[Callback] Database integration error:', error);
        throw error;
      }
    }

    // Execute webhook if URL is provided
    if (callback.webhookUrl) {
      const method = callback.webhookMethod || 'POST';
      const headers = {
        'Content-Type': 'application/json',
        ...(callback.webhookHeaders || {}),
      };

      console.log(`[Callback] Calling webhook: ${method} ${callback.webhookUrl}`);

      // Use fetch to call the webhook
      try {
        const baseUrl = process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : 'http://localhost:5000';
        
        const url = callback.webhookUrl.startsWith('http') 
          ? callback.webhookUrl 
          : `${baseUrl}${callback.webhookUrl}`;

        const response = await fetch(url, {
          method,
          headers,
          body: JSON.stringify(mappedData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Callback] Webhook failed: ${response.status} ${response.statusText}`, errorText);
          throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log(`[Callback] Webhook success:`, result);
        
        return result;
      } catch (error) {
        console.error('[Callback] Webhook error:', error);
        throw error;
      }
    }

    return { success: true, mappedData };
  }

  async getWorkflowExecution(workItemId: number, organizationId: number) {
    const executions = await db
      .select()
      .from(workItemWorkflowExecutions)
      .where(
        and(
          eq(workItemWorkflowExecutions.workItemId, workItemId),
          eq(workItemWorkflowExecutions.organizationId, organizationId)
        )
      );

    return executions;
  }

  async getWorkflowTemplate(templateId: string, organizationId: number) {
    const template = await db
      .select()
      .from(workflowTemplates)
      .where(
        and(
          eq(workflowTemplates.id, templateId),
          eq(workflowTemplates.organizationId, organizationId)
        )
      )
      .limit(1);

    return template[0];
  }

  async getWorkflowSteps(workItemId: number, organizationId: number) {
    const steps = await db
      .select()
      .from(workItemWorkflowExecutionSteps)
      .where(
        and(
          eq(workItemWorkflowExecutionSteps.workItemId, workItemId),
          eq(workItemWorkflowExecutionSteps.organizationId, organizationId)
        )
      )
      .orderBy(workItemWorkflowExecutionSteps.stepIndex);

    return steps;
  }

  async updateStepStatus(
    stepId: number,
    organizationId: number,
    status: 'not_started' | 'in_progress' | 'completed' | 'cancelled',
    userId?: number,
    notes?: string,
    evidence?: any
  ) {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'completed') {
      updateData.completedAt = new Date();
      updateData.completedBy = userId;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Get existing step to detect photo analysis config
    const existingSteps = await db
      .select()
      .from(workItemWorkflowExecutionSteps)
      .where(
        and(
          eq(workItemWorkflowExecutionSteps.id, stepId),
          eq(workItemWorkflowExecutionSteps.organizationId, organizationId)
        )
      )
      .limit(1);

    const existingStep = existingSteps[0];
    if (!existingStep) {
      throw new Error('Step not found');
    }

    if (evidence !== undefined) {
      const existingEvidence = (existingStep.evidence as any) || {};
      
      // Merge evidence while preserving template-defined properties
      updateData.evidence = {
        ...existingEvidence,
        ...evidence,
        // Explicitly preserve template-defined properties
        checklistItems: existingEvidence.checklistItems,
        formFields: existingEvidence.formFields,
        photoConfig: existingEvidence.photoConfig,
        photoAnalysisConfig: existingEvidence.photoAnalysisConfig,
        stepType: existingEvidence.stepType,
        config: existingEvidence.config,
        required: existingEvidence.required
      };
    }

    const step = await db
      .update(workItemWorkflowExecutionSteps)
      .set(updateData)
      .where(
        and(
          eq(workItemWorkflowExecutionSteps.id, stepId),
          eq(workItemWorkflowExecutionSteps.organizationId, organizationId)
        )
      )
      .returning();

    // Detect photo upload with OCR configuration
    if (evidence?.photos && Array.isArray(evidence.photos)) {
      const stepEvidence = (step[0].evidence as any) || {};
      const photoAnalysisConfig = stepEvidence.photoAnalysisConfig;

      // Check if OCR is enabled for this step
      if (photoAnalysisConfig?.enabled && photoAnalysisConfig?.extractions) {
        console.log(`[WorkItemWorkflowService] Photo OCR enabled for step ${stepId}`);
        
        // Trigger OCR processing for newly added photos
        // This will be done via agent workflows (async processing)
        try {
          await this.triggerPhotoAnalysis(
            step[0],
            evidence.photos,
            photoAnalysisConfig,
            organizationId,
            userId
          );
        } catch (error) {
          console.error('[WorkItemWorkflowService] Failed to trigger photo analysis:', error);
          // Don't fail the step update if OCR trigger fails
        }
      }
    }

    return step[0];
  }

  /**
   * Trigger photo analysis using OCR action
   * This is called when a photo is uploaded to a step with photoAnalysisConfig enabled
   */
  private async triggerPhotoAnalysis(
    step: any,
    photos: any[],
    photoAnalysisConfig: any,
    organizationId: number,
    userId?: number
  ) {
    console.log(`[WorkItemWorkflowService] Triggering photo analysis for ${photos.length} photo(s)`);

    // Import OCR action
    const { AnalyzeImageOCRAction } = await import('./workflow/actions/AnalyzeImageOCRAction');
    const ocrAction = new AnalyzeImageOCRAction();

    // Process each photo
    for (const photo of photos) {
      try {
        console.log(`[WorkItemWorkflowService] Processing photo: ${photo.url}`);

        // Execute OCR analysis
        const result = await ocrAction.execute(
          {
            stepId: step.id,
            workItemId: step.workItemId,
            photoData: photo,
            photoAnalysisConfig,
          },
          {
            organizationId: organizationId.toString(),
            userId,
            manualData: {
              stepId: step.id,
              workItemId: step.workItemId,
              photoData: photo,
              photoAnalysisConfig,
            },
          }
        );

        if (result.success) {
          console.log(`[WorkItemWorkflowService] OCR completed successfully for ${photo.url}`);
          console.log(`  Extracted fields: ${Object.keys(result.extractedData).length}`);
          console.log(`  Average confidence: ${result.confidence}%`);

          // Log extraction activity
          await this.logOCRExtractionActivity(
            step.workItemId,
            organizationId,
            result.extractedData,
            userId
          );
        } else {
          console.error(`[WorkItemWorkflowService] OCR failed for ${photo.url}`);
          if (result.errors) {
            console.error(`  Errors: ${result.errors.join(', ')}`);
          }
        }
      } catch (error) {
        console.error(`[WorkItemWorkflowService] Failed to process photo ${photo.url}:`, error);
        // Log failure activity
        await this.logOCRExtractionFailure(
          step.workItemId,
          organizationId,
          photo.url,
          error instanceof Error ? error.message : 'Unknown error',
          userId
        );
      }
    }
  }

  /**
   * Log OCR extraction activity
   */
  private async logOCRExtractionActivity(
    workItemId: number,
    organizationId: number,
    extractedData: Record<string, any>,
    userId?: number
  ) {
    try {
      // Get work item to find source linkage
      const [workItem] = await db
        .select()
        .from(workItems)
        .where(
          and(
            eq(workItems.id, workItemId),
            eq(workItems.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!workItem) return;

      // Try to get work item source linkage (might not exist for legacy work items)
      let sourceTable = 'work_item';
      let sourceId = workItemId;
      
      try {
        const [workItemSource] = await db
          .select()
          .from(workItemSources)
          .where(
            and(
              eq(workItemSources.workItemId, workItemId),
              eq(workItemSources.organizationId, organizationId)
            )
          )
          .limit(1);

        if (workItemSource) {
          sourceTable = workItemSource.sourceTable;
          sourceId = workItemSource.sourceId;
        } else {
          // Fallback to metadata
          const metadata = workItem.workflowMetadata as any;
          if (metadata?.addressRecordId) {
            sourceTable = 'address';
            sourceId = metadata.addressRecordId;
          } else if (metadata?.customerId) {
            sourceTable = 'customer';
            sourceId = metadata.customerId;
          }
        }
      } catch (error) {
        // work_item_sources might not exist, use fallback
        console.log('[WorkItemWorkflowService] Using fallback for source linkage');
      }

      // Build activity description
      const extractionSummary = Object.entries(extractedData)
        .map(([field, data]: [string, any]) => `${data.field || field}: "${data.value}" (${data.confidence}% confidence)`)
        .join(', ');

      const description = `OCR extracted data from workflow photo: ${extractionSummary}`;

      // Create activity log
      await db.insert(activityLogs).values({
        organizationId,
        userId: userId || null,
        actionType: 'agent_action',
        entityType: sourceTable,
        entityId: sourceId,
        description,
        metadata: {
          workItemId,
          workItemTitle: workItem.title,
          extractedFields: Object.keys(extractedData),
          extractions: extractedData,
          ocrProvider: 'openai',
        },
      });

      console.log(`[Activity Log] OCR extraction logged: ${description}`);
    } catch (error) {
      console.error('[WorkItemWorkflowService] Failed to log OCR activity:', error);
      // Don't throw - logging failure shouldn't break OCR processing
    }
  }

  /**
   * Log OCR extraction failure
   */
  private async logOCRExtractionFailure(
    workItemId: number,
    organizationId: number,
    photoUrl: string,
    errorMessage: string,
    userId?: number
  ) {
    try {
      // Get work item to find source linkage
      const [workItem] = await db
        .select()
        .from(workItems)
        .where(
          and(
            eq(workItems.id, workItemId),
            eq(workItems.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!workItem) return;

      // Try to get source info
      let sourceTable = 'work_item';
      let sourceId = workItemId;
      
      try {
        const [workItemSource] = await db
          .select()
          .from(workItemSources)
          .where(
            and(
              eq(workItemSources.workItemId, workItemId),
              eq(workItemSources.organizationId, organizationId)
            )
          )
          .limit(1);

        if (workItemSource) {
          sourceTable = workItemSource.sourceTable;
          sourceId = workItemSource.sourceId;
        }
      } catch (error) {
        // Fallback
      }

      const description = `OCR extraction failed: ${errorMessage}`;

      // Create activity log
      await db.insert(activityLogs).values({
        organizationId,
        userId: userId || null,
        actionType: 'agent_action',
        entityType: sourceTable,
        entityId: sourceId,
        description,
        metadata: {
          workItemId,
          workItemTitle: workItem.title,
          photoUrl,
          errorMessage,
          failed: true,
        },
      });

      console.log(`[Activity Log] OCR failure logged: ${description}`);
    } catch (error) {
      console.error('[WorkItemWorkflowService] Failed to log OCR failure:', error);
    }
  }

  async addStepEvidence(
    stepId: number,
    organizationId: number,
    evidence: any
  ) {
    const step = await db
      .select()
      .from(workItemWorkflowExecutionSteps)
      .where(
        and(
          eq(workItemWorkflowExecutionSteps.id, stepId),
          eq(workItemWorkflowExecutionSteps.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!step.length) {
      throw new Error('Step not found');
    }

    const currentEvidence = step[0].evidence || {};
    const updatedEvidence = {
      ...currentEvidence,
      ...evidence,
    };

    const updatedStep = await db
      .update(workItemWorkflowExecutionSteps)
      .set({
        evidence: updatedEvidence,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workItemWorkflowExecutionSteps.id, stepId),
          eq(workItemWorkflowExecutionSteps.organizationId, organizationId)
        )
      )
      .returning();

    return updatedStep[0];
  }
}

export const workItemWorkflowService = new WorkItemWorkflowService();
