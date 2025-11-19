import express from 'express';
import type { Request, Response } from 'express';
import { storage } from '../storage';
import { WorkflowExecutor } from '../services/workflow/WorkflowExecutor';
import crypto from 'crypto';
import { raw } from 'express';
import { authenticateToken } from '../auth';

const router = express.Router();

/**
 * Unified webhook endpoint - accepts all webhooks with routing info in payload
 * Route: POST /api/webhooks
 * IMPORTANT: Uses raw body parser for signature verification
 */
router.post('/', raw({ type: 'application/json' }), async (req: Request, res: Response) => {
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
 * IMPORTANT: Uses raw body parser for signature verification
 */
router.post('/splynx/:organizationId/:triggerKey', raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const startTime = Date.now();
  console.log(`[WEBHOOK] Splynx webhook received: ${req.params.organizationId}/${req.params.triggerKey}`);
  
  return await handleWebhookRequest(req, res, 'splynx', startTime);
});

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

    // Parse the payload first to check for ping requests
    let payload: any;
    try {
      if (Buffer.isBuffer(req.body)) {
        const bodyString = req.body.toString();
        const contentType = req.get('Content-Type') || '';
        
        if (contentType.includes('application/x-www-form-urlencoded')) {
          // Parse form-urlencoded data
          const params = new URLSearchParams(bodyString);
          payload = {};
          params.forEach((value, key) => {
            payload[key] = value;
          });
        } else {
          // Parse JSON
          payload = JSON.parse(bodyString);
        }
      } else {
        payload = req.body;
      }
    } catch (error) {
      console.error(`[WEBHOOK] Failed to parse webhook payload:`, error);
      return res.status(400).json({ error: 'Invalid payload format' });
    }

    // Handle Splynx ping requests immediately (before signature verification)
    if (payload.type === 'ping') {
      console.log(`[WEBHOOK] Ping request received for ${triggerKey}`);
      return res.status(200).send('ok');
    }

    // Verify webhook signature if secret is configured
    let verified = false;
    if (trigger.webhookSecret) {
      verified = await verifyWebhookSignature(req, trigger.webhookSecret);
      if (!verified) {
        console.log(`[WEBHOOK] Signature verification failed for ${triggerKey}`);
        return res.status(401).json({ error: 'Invalid signature' });
      }
    } else {
      console.log(`[WEBHOOK] No webhook secret configured for trigger ${triggerKey}, skipping verification`);
      verified = true; // If no secret is configured, consider it verified
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
 * Verify webhook signature using HMAC SHA-1 (Splynx standard)
 * Splynx generates signatures using: HMAC-SHA1(secret, raw_request_body)
 * and sends them in the X-Splynx-Signature header
 */
async function verifyWebhookSignature(req: any, secret: string): Promise<boolean> {
  try {
    const signature = req.get('X-Splynx-Signature') || req.get('X-Hub-Signature-256') || req.get('Authorization');
    
    if (!signature) {
      console.log('[WEBHOOK] No signature header found');
      return false;
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    
    // Splynx uses SHA1 (not SHA256!)
    const expectedSignature = crypto
      .createHmac('sha1', secret)
      .update(rawBody)
      .digest('hex');

    let receivedSignature = signature;
    // Handle different signature formats
    if (signature.startsWith('sha1=')) {
      receivedSignature = signature.slice(5);
    } else if (signature.startsWith('sha256=')) {
      receivedSignature = signature.slice(7);
    } else if (signature.startsWith('Bearer ')) {
      receivedSignature = signature.slice(7);
    }

    // Timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );

    console.log(`[WEBHOOK] Signature verification: ${isValid ? 'PASSED' : 'FAILED'}`);
    console.log(`[WEBHOOK] Expected (SHA1): ${expectedSignature.substring(0, 16)}...`);
    console.log(`[WEBHOOK] Received: ${receivedSignature.substring(0, 16)}...`);
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
 * SECURITY: Enforces authentication and organization ownership
 */
router.get('/events/:organizationId', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const orgId = parseInt(req.params.organizationId);
    if (isNaN(orgId)) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    // CRITICAL: Verify the user can only access their own organization's events
    if (orgId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
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

/**
 * Get webhook event details by ID
 * SECURITY: Verifies organization ownership before returning data
 */
router.get('/events/detail/:eventId', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const eventId = parseInt(req.params.eventId);
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const event = await storage.getWebhookEvent(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // CRITICAL: Verify the event belongs to the user's organization
    if (event.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(event);

  } catch (error) {
    console.error('Error fetching webhook event:', error);
    res.status(500).json({ error: 'Failed to fetch webhook event' });
  }
});

/**
 * Test webhook signature verification
 * POST /api/webhooks/test-signature
 * Body: { payload: string, secret: string, signature: string }
 * SECURITY: Requires authentication to prevent adversarial probing
 */
router.post('/test-signature', authenticateToken, async (req, res) => {
  try {
    const { payload, secret, signature } = req.body;

    if (!payload || !secret || !signature) {
      return res.status(400).json({ 
        error: 'Missing required fields: payload, secret, signature' 
      });
    }

    // Calculate expected signature using SHA1 (Splynx standard)
    const expectedSignature = crypto
      .createHmac('sha1', secret)
      .update(payload)
      .digest('hex');

    // Clean up received signature (remove prefixes)
    let cleanSignature = signature;
    if (signature.startsWith('sha1=')) {
      cleanSignature = signature.slice(5);
    }

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(cleanSignature, 'hex')
    );

    res.json({
      valid: isValid,
      expectedSignature,
      receivedSignature: cleanSignature,
      algorithm: 'HMAC-SHA1'
    });

  } catch (error: any) {
    console.error('Error testing signature:', error);
    res.status(500).json({ 
      error: 'Failed to test signature',
      message: error.message 
    });
  }
});

/**
 * Update webhook secret for a trigger
 * PATCH /api/webhooks/triggers/:triggerId/secret
 * Body: { secret: string }
 * SECURITY: Requires authentication and verifies organization ownership
 */
router.patch('/triggers/:triggerId/secret', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const triggerId = parseInt(req.params.triggerId);
    if (isNaN(triggerId)) {
      return res.status(400).json({ error: 'Invalid trigger ID' });
    }

    const { secret } = req.body;
    if (!secret || typeof secret !== 'string') {
      return res.status(400).json({ error: 'Secret is required and must be a string' });
    }

    // SECURITY: Get trigger by ID first (without cross-tenant access)
    const trigger = await storage.getIntegrationTrigger(triggerId);
    
    if (!trigger) {
      return res.status(404).json({ error: 'Trigger not found' });
    }

    // CRITICAL: Get integration and verify it belongs to the user's organization
    const integration = await storage.getIntegrationById(trigger.integrationId);
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    if (integration.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update the webhook secret
    const updated = await storage.updateIntegrationTrigger(triggerId, {
      webhookSecret: secret
    });

    res.json({
      success: true,
      trigger: updated
    });

  } catch (error: any) {
    console.error('Error updating webhook secret:', error);
    res.status(500).json({ 
      error: 'Failed to update webhook secret',
      message: error.message 
    });
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