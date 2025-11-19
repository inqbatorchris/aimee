import express from 'express';
import type { Request, Response } from 'express';
import { storage } from '../storage';
import { WorkflowExecutor } from '../services/workflow/WorkflowExecutor';
import crypto from 'crypto';
import { raw } from 'express';

const router = express.Router();

// Middleware to parse raw body for signature verification
router.use(raw({ type: 'application/json' }));

/**
 * Unified webhook endpoint - accepts all webhooks with routing info in payload
 * Route: POST /api/webhooks
 */
router.post('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  console.log(`[WEBHOOK] Unified webhook received`);
  
  try {
    // Parse the unified payload format
    let unifiedPayload: any;
    try {
      if (Buffer.isBuffer(req.body)) {
        unifiedPayload = JSON.parse(req.body.toString());
      } else {
        unifiedPayload = req.body;
      }
    } catch (error) {
      console.error(`[WEBHOOK] Failed to parse unified webhook payload:`, error);
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    // Extract routing information from payload
    const { organization_id, trigger_key, integration_type, event_data } = unifiedPayload;
    
    if (!organization_id || !trigger_key || !integration_type || !event_data) {
      return res.status(400).json({ 
        error: 'Missing required fields: organization_id, trigger_key, integration_type, event_data' 
      });
    }

    // Set up request parameters for the existing handler
    const mockReq = {
      ...req,
      params: { 
        organizationId: organization_id.toString(), 
        triggerKey: trigger_key 
      },
      body: event_data,
      get: req.get?.bind(req) || (() => undefined), // Ensure get method is available
      ip: req.ip || '127.0.0.1',
      connection: req.connection || { remoteAddress: '127.0.0.1' },
      method: req.method,
      headers: req.headers,
    };

    console.log(`[WEBHOOK] Routing to: ${organization_id}/${trigger_key} (${integration_type})`);
    
    // Call the existing handler function
    return await handleWebhookRequest(mockReq, res, integration_type, startTime);

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error(`[WEBHOOK] Error processing unified webhook (${processingTime}ms):`, error);
    res.status(500).json({ 
      error: 'Internal server error',
      processingTime
    });
  }
});

/**
 * Unified webhook endpoint documentation - GET handler for browser access
 * Route: GET /api/webhooks
 */
router.get('/', (req: Request, res: Response) => {
  const baseUrl = req.protocol + '://' + req.get('host');
  
  res.json({
    title: "Unified Webhook Endpoint",
    description: "This endpoint accepts webhooks from any integration with routing information in the payload.",
    method: "POST",
    url: `${baseUrl}/api/webhooks`,
    contentType: "application/json",
    payloadFormat: {
      organization_id: "number - Your organization ID",
      trigger_key: "string - The trigger identifier (e.g., 'payment_received')",
      integration_type: "string - Integration type (e.g., 'splynx')",
      event_data: "object - The actual webhook payload from the external service"
    },
    example: {
      organization_id: 3,
      trigger_key: "payment_received",
      integration_type: "splynx",
      event_data: {
        id: "payment-123",
        event_type: "payment_received",
        customer_id: 456,
        payment_amount: 99.99,
        timestamp: "2025-01-01T12:00:00Z"
      }
    },
    legacyEndpoint: {
      description: "Organization-scoped endpoints are still supported for backward compatibility",
      format: `${baseUrl}/api/webhooks/{integration_type}/{organization_id}/{trigger_key}`,
      example: `${baseUrl}/api/webhooks/splynx/3/payment_received`
    }
  });
});

/**
 * Enhanced Splynx webhook endpoint with security and logging
 * Route: POST /api/webhooks/splynx/:organizationId/:triggerKey
 */
router.post('/splynx/:organizationId/:triggerKey', async (req: Request, res: Response) => {
  const startTime = Date.now();
  console.log(`[WEBHOOK] Splynx webhook received: ${req.params.organizationId}/${req.params.triggerKey}`);
  
  return await handleWebhookRequest(req, res, 'splynx', startTime);
});

/**
 * Vapi webhook endpoint for voice AI events
 * Route: POST /api/webhooks/vapi/:organizationId
 */
router.post('/vapi/:organizationId', async (req: Request, res: Response) => {
  const startTime = Date.now();
  console.log(`[WEBHOOK] Vapi webhook received for organization: ${req.params.organizationId}`);
  
  try {
    const { organizationId } = req.params;
    const orgId = parseInt(organizationId);
    
    if (isNaN(orgId)) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    // Parse Vapi webhook payload
    let payload: any;
    try {
      if (Buffer.isBuffer(req.body)) {
        payload = JSON.parse(req.body.toString());
      } else {
        payload = req.body;
      }
    } catch (error) {
      console.error(`[WEBHOOK] Failed to parse Vapi payload:`, error);
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    const { message: { type, call } } = payload;
    
    console.log(`[WEBHOOK] Vapi event type: ${type}, call ID: ${call?.id}`);

    // Handle different Vapi event types
    switch (type) {
      case 'status-update':
        await handleVapiStatusUpdate(orgId, call, payload);
        break;
      
      case 'function-call':
        // Function calls are handled by direct API endpoints, not webhooks
        console.log(`[WEBHOOK] Function call webhook received (handled by direct API)`);
        break;
      
      case 'end-of-call-report':
        await handleVapiEndOfCall(orgId, call, payload);
        break;
      
      case 'transcript':
        await handleVapiTranscript(orgId, call, payload);
        break;
      
      default:
        console.log(`[WEBHOOK] Unknown Vapi event type: ${type}`);
    }

    // Log the webhook event
    await storage.createWebhookEvent({
      organizationId: orgId,
      source: 'vapi',
      eventType: type,
      payload,
      processedAt: new Date(),
      processingTimeMs: Date.now() - startTime,
    });

    res.json({ success: true, processingTime: Date.now() - startTime });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error(`[WEBHOOK] Error processing Vapi webhook (${processingTime}ms):`, error);
    res.status(500).json({ 
      error: 'Internal server error',
      processingTime
    });
  }
});

// Vapi webhook event handlers
async function handleVapiStatusUpdate(organizationId: number, call: any, payload: any) {
  console.log(`[VAPI] Status update: ${call.status}`);
  
  // Check if call record exists
  const existing = await storage.getVapiCallByVapiId(call.id, organizationId);
  
  if (!existing) {
    // Create new call record
    await storage.createVapiCall({
      organizationId,
      vapiCallId: call.id,
      assistantId: call.assistantId,
      phoneNumberId: call.phoneNumberId,
      customerPhoneNumber: call.customer?.number,
      status: call.status as any,
      startedAt: call.startedAt ? new Date(call.startedAt) : new Date(),
      rawCallData: payload,
    });
  } else {
    // Update existing call
    await storage.updateVapiCall(existing.id, {
      status: call.status as any,
      rawCallData: payload,
    });
  }
}

async function handleVapiEndOfCall(organizationId: number, call: any, payload: any) {
  console.log(`[VAPI] End of call report for: ${call.id}`);
  
  const existing = await storage.getVapiCallByVapiId(call.id, organizationId);
  if (!existing) {
    console.error(`[VAPI] Call not found: ${call.id}`);
    return;
  }

  // Extract analysis from end-of-call report
  const analysis = payload.message?.analysis || {};
  const transcript = payload.message?.transcript || '';
  
  // Determine if call was autonomous
  const wasAutonomous = !call.endedReason?.includes('forward') && 
                        call.endedReason !== 'assistant_forwarded';
  
  // Extract actions taken from transcript/metadata
  const metadata = payload.message?.metadata || {};
  
  await storage.updateVapiCall(existing.id, {
    endedAt: call.endedAt ? new Date(call.endedAt) : new Date(),
    durationSeconds: call.duration || 0,
    endReason: call.endedReason as any,
    wasAutonomous,
    transcript,
    summary: analysis.summary || '',
    sentimentScore: analysis.sentiment || '0',
    customerIntent: metadata.intent || '',
    knowledgeGaps: metadata.knowledgeGaps || [],
    knowledgeFilesUsed: metadata.knowledgeFilesUsed || [],
  });

  console.log(`[VAPI] Call ${call.id} completed. Autonomous: ${wasAutonomous}`);
}

async function handleVapiTranscript(organizationId: number, call: any, payload: any) {
  console.log(`[VAPI] Transcript update for: ${call.id}`);
  
  const existing = await storage.getVapiCallByVapiId(call.id, organizationId);
  if (!existing) {
    return;
  }

  const transcript = payload.message?.transcript || '';
  await storage.updateVapiCall(existing.id, {
    transcript,
  });
}

/**
 * Reusable webhook request handler - processes webhooks for any integration type
 */
async function handleWebhookRequest(req: any, res: Response, integrationType: string, startTime: number) {
  try {
    const { organizationId, triggerKey } = req.params;
    const orgId = parseInt(organizationId);
    
    if (isNaN(orgId)) {
      console.log(`[WEBHOOK] Invalid organization ID: ${organizationId}`);
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    // Get the integration and trigger for this organization
    const integration = await storage.getIntegration(orgId, integrationType);
    if (!integration) {
      console.log(`[WEBHOOK] No ${integrationType} integration found for organization ${orgId}`);
      return res.status(404).json({ error: 'Integration not found' });
    }

    const trigger = await storage.getIntegrationTriggerByKey(integration.id, triggerKey);
    if (!trigger) {
      console.log(`[WEBHOOK] No trigger found for key: ${triggerKey}`);
      return res.status(404).json({ error: 'Trigger not found' });
    }

    // Verify webhook signature if secret is configured
    let verified = false;
    if (trigger.webhookSecret) {
      verified = await verifyWebhookSignature(req, trigger.webhookSecret);
      if (!verified) {
        console.log(`[WEBHOOK] Signature verification failed for ${triggerKey}`);
      }
    } else {
      console.log(`[WEBHOOK] No webhook secret configured for trigger ${triggerKey}, skipping verification`);
      verified = true; // If no secret is configured, consider it verified
    }

    // Parse the payload
    let payload: any;
    try {
      if (Buffer.isBuffer(req.body)) {
        payload = JSON.parse(req.body.toString());
      } else {
        payload = req.body;
      }
    } catch (error) {
      console.error(`[WEBHOOK] Failed to parse webhook payload:`, error);
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    // Extract request metadata
    const headers = req.headers;
    const userAgent = req.get('User-Agent') || '';
    const sourceIp = req.ip || req.connection.remoteAddress || '';
    const method = req.method;

    // Store the webhook event
    const webhookEventData = {
      organizationId: orgId,
      integrationId: integration.id,
      triggerId: trigger.id,
      triggerKey,
      eventId: payload.id || payload.event_id || null,
      payload,
      headers,
      method,
      userAgent,
      sourceIp,
      verified,
      processed: false,
      workflowTriggered: false,
    };

    console.log(`[WEBHOOK] Storing webhook event for ${triggerKey}`);
    const webhookEvent = await storage.createWebhookEvent(webhookEventData);

    // Update trigger statistics
    await storage.updateTriggerWebhookStats(trigger.id);

    // Process workflow triggering
    const allWorkflows = await storage.getAgentWorkflows(integration.organizationId);
    const triggeredWorkflows = allWorkflows.filter((workflow: any) => {
      if (!workflow.isEnabled) return false;
      
      // Check for webhook trigger type
      if (workflow.triggerType === 'webhook' && workflow.triggerConfig?.triggerId === trigger.id) {
        return true;
      }
      
      // Keep backward compatibility with integration_event
      if (workflow.triggerType === 'integration_event' &&
          workflow.triggerConfig?.integrationId === integration.id &&
          workflow.triggerConfig?.eventType === triggerKey) {
        return true;
      }
      
      return false;
    });

    console.log(`[WEBHOOK] Found ${triggeredWorkflows.length} workflows to trigger`);

    let workflowResults = [];
    if (triggeredWorkflows.length > 0) {
      const executor = new WorkflowExecutor();
      for (const workflow of triggeredWorkflows) {
        try {
          console.log(`[WEBHOOK] Triggering workflow: ${workflow.name}`);
          
          const runResult = await storage.createWorkflowRun({
            workflowId: workflow.id,
            status: 'running',
            triggerSource: 'webhook',
            startedAt: new Date(),
            contextData: {
              webhookEventId: webhookEvent.id,
              integrationId: integration.id,
              triggerKey,
              eventData: payload
            },
            executionLog: [{ 
              timestamp: new Date(), 
              message: `Triggered by ${integrationType} webhook: ${trigger.name}` 
            }]
          });

          await executor.executeWorkflow(workflow, {
            triggerSource: 'webhook',
            organizationId: integration.organizationId.toString(),
            webhookData: {
              integration: integrationType,
              event: triggerKey,
              data: payload,
              eventId: webhookEvent.id
            }
          });

          await storage.updateWorkflowRun(runResult.id, {
            status: 'completed',
            completedAt: new Date()
          });

          workflowResults.push({
            workflowId: workflow.id,
            workflowName: workflow.name,
            success: true,
            runId: runResult.id
          });

          // Update webhook event to mark workflow as triggered
          await storage.updateWebhookEvent(webhookEvent.id, {
            workflowTriggered: true,
            workflowRunId: runResult.id,
            processed: true,
            processedAt: new Date()
          });

        } catch (error: any) {
          console.error(`[WEBHOOK] Error executing workflow ${workflow.name}:`, error);
          workflowResults.push({
            workflowId: workflow.id,
            workflowName: workflow.name,
            success: false,
            error: error.message
          });
        }
      }
    } else {
      // Mark as processed even if no workflows triggered
      await storage.updateWebhookEvent(webhookEvent.id, {
        processed: true,
        processedAt: new Date()
      });
    }

    // Respond quickly to avoid timeouts
    const processingTime = Date.now() - startTime;
    console.log(`[WEBHOOK] Webhook processed in ${processingTime}ms`);
    
    res.status(200).json({
      success: true,
      eventId: webhookEvent.id,
      verified,
      triggeredWorkflows: triggeredWorkflows.length,
      workflowResults,
      processingTime
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error(`[WEBHOOK] Error processing webhook (${processingTime}ms):`, error);
    res.status(500).json({ 
      error: 'Internal server error',
      processingTime
    });
  }
}

/**
 * Verify webhook signature using HMAC SHA-256
 */
async function verifyWebhookSignature(req: any, secret: string): Promise<boolean> {
  try {
    const signature = req.get('X-Splynx-Signature') || req.get('X-Hub-Signature-256') || req.get('Authorization');
    
    if (!signature) {
      console.log('[WEBHOOK] No signature header found');
      return false;
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    let receivedSignature = signature;
    if (signature.startsWith('sha256=')) {
      receivedSignature = signature.slice(7);
    } else if (signature.startsWith('Bearer ')) {
      receivedSignature = signature.slice(7);
    }

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );

    console.log(`[WEBHOOK] Signature verification: ${isValid ? 'PASSED' : 'FAILED'}`);
    return isValid;

  } catch (error) {
    console.error('[WEBHOOK] Error verifying signature:', error);
    return false;
  }
}

// Legacy webhook endpoint for integration events (maintaining backward compatibility)
// This endpoint will be called by external services (like Splynx) when events occur
router.post('/integration/:integrationId/:triggerKey', async (req: Request, res: Response) => {
  try {
    const { integrationId, triggerKey } = req.params;
    const eventData = req.body;

    console.log('Webhook received:', {
      integrationId,
      triggerKey,
      eventData
    });

    // Validate integration exists
    const integrationIdNum = parseInt(integrationId);
    if (isNaN(integrationIdNum)) {
      return res.status(400).json({ error: 'Invalid integration ID' });
    }

    // Get the integration triggers to find the organization
    const triggers = await storage.getIntegrationTriggers(integrationIdNum);
    if (triggers.length === 0) {
      return res.status(404).json({ error: 'No triggers found for this integration' });
    }
    
    // Get integrations for the organization to find the matching integration
    // We need to find the integration by checking all organizations
    // In production, we'd add a direct method to get integration by ID
    // For now, we'll get all organizations and find the integration
    let integration: any = null;
    const organizations = await storage.getOrganizations();
    for (const org of organizations) {
      const orgIntegrations = await storage.getIntegrations(org.id);
      integration = orgIntegrations.find((i: any) => i.id === integrationIdNum);
      if (integration) break;
    }
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Validate trigger exists for this integration
    const trigger = triggers.find(t => t.triggerKey === triggerKey);
    
    if (!trigger) {
      return res.status(404).json({ error: 'Trigger not found for this integration' });
    }

    // Log the webhook activity
    await storage.logActivity({
      organizationId: integration.organizationId,
      userId: 1, // System user ID (we should have a system user)
      actionType: 'agent_action',
      entityType: 'integration',
      entityId: integration.id,
      description: `Webhook received for ${integration.platformType}: ${trigger.name}`,
      metadata: {
        triggerKey,
        eventData
      }
    });

    // Find all workflows that are triggered by this integration event
    const allWorkflows = await storage.getAgentWorkflows(integration.organizationId);
    const triggeredWorkflows = allWorkflows.filter((workflow: any) => {
      return workflow.isEnabled &&
        workflow.triggerType === 'integration_event' &&
        workflow.triggerConfig?.integrationId === integrationIdNum &&
        workflow.triggerConfig?.eventType === triggerKey;
    });

    console.log(`Found ${triggeredWorkflows.length} workflows to trigger`);

    // Execute each triggered workflow
    const executor = new WorkflowExecutor();
    const executionResults = [];

    for (const workflow of triggeredWorkflows) {
      try {
        console.log(`Triggering workflow: ${workflow.name}`);
        
        // Create a workflow run (the executor will create it but we track it here)
        const runResult = await storage.createWorkflowRun({
          workflowId: workflow.id,
          status: 'running',
          triggerSource: 'integration_event',
          startedAt: new Date(),
          contextData: {
            integrationId: integrationIdNum,
            triggerKey,
            eventData
          },
          executionLog: [{ 
            timestamp: new Date(), 
            message: `Triggered by ${integration.platformType} event: ${trigger.name}` 
          }]
        });
        const runId = runResult.id;

        // Execute the workflow with the event data as context
        await executor.executeWorkflow(workflow, {
          triggerSource: 'integration_event',
          organizationId: integration.organizationId.toString(),
          webhookData: {
            integration: integration.platformType,
            event: triggerKey,
            data: eventData
          }
        });

        // Mark run as completed
        await storage.updateWorkflowRun(runId, {
          status: 'completed',
          completedAt: new Date(),
          executionLog: [
            { timestamp: new Date(), message: `Triggered by ${integration.platformType} event: ${trigger.name}` },
            { timestamp: new Date(), message: 'Workflow execution completed successfully' }
          ]
        });

        // Update workflow's last run info
        await storage.updateAgentWorkflow(workflow.id, {
          lastRunAt: new Date(),
          lastRunStatus: 'completed'
        });

        executionResults.push({
          workflowId: workflow.id,
          workflowName: workflow.name,
          success: true,
          runId
        });

        // Log successful execution
        await storage.logActivity({
          organizationId: workflow.organizationId,
          userId: 1, // System user ID
          actionType: 'agent_action',
          entityType: 'workflow',
          entityId: workflow.id,
          description: `Workflow triggered by ${integration.platformType} event: ${trigger.name}`,
          metadata: {
            triggerKey,
            runId,
            success: true
          }
        });

      } catch (error: any) {
        console.error(`Error executing workflow ${workflow.name}:`, error);
        
        executionResults.push({
          workflowId: workflow.id,
          workflowName: workflow.name,
          success: false,
          error: error.message
        });

        // Log failed execution
        await storage.logActivity({
          organizationId: workflow.organizationId,
          userId: 1, // System user ID
          actionType: 'agent_action',
          entityType: 'workflow',
          entityId: workflow.id,
          description: `Failed to execute workflow triggered by ${integration.platformType} event`,
          metadata: {
            triggerKey,
            error: error.message
          }
        });
      }
    }

    // Return success response with execution summary
    res.json({
      success: true,
      message: `Webhook processed successfully`,
      triggeredWorkflows: triggeredWorkflows.length,
      executionResults
    });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process webhook',
      message: error.message 
    });
  }
});

/**
 * Get webhook events for organization (for debugging/monitoring)
 */
router.get('/events/:organizationId', async (req, res) => {
  try {
    const orgId = parseInt(req.params.organizationId);
    if (isNaN(orgId)) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const integrationId = req.query.integrationId ? parseInt(req.query.integrationId as string) : undefined;

    // Get webhook events, optionally filtered by integration
    let events = await storage.getWebhookEvents(orgId, limit, offset);
    
    // Filter by integration if specified
    if (integrationId && events) {
      events = events.filter(event => event.integrationId === integrationId);
    }

    res.json(events || []);

  } catch (error) {
    console.error('Error fetching webhook events:', error);
    res.status(500).json({ error: 'Failed to fetch webhook events' });
  }
});

// Health check endpoint for webhook service
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'webhook-handler',
    timestamp: new Date().toISOString()
  });
});

export default router;