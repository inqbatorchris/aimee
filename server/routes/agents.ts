import { Router } from 'express';
import { storage } from '../storage';
import { authenticateToken } from '../auth';
import { WorkflowExecutor } from '../services/workflow/WorkflowExecutor';
import { insertAgentWorkflowSchema, insertAgentWorkflowRunSchema, agentWorkflowSchedules, integrations } from '../../shared/schema';
import { z } from 'zod';
import { IntegrationCatalogImporter } from '../services/integrations/IntegrationCatalogImporter';
import { SplynxService } from '../services/integrations/splynxService';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

// Helper function to convert frequency to cron expression
function frequencyToCron(frequency: string): string {
  switch (frequency) {
    case 'hourly':
      return '0 * * * *'; // Every hour at minute 0
    case 'daily':
      return '0 0 * * *'; // Every day at midnight
    case 'weekly':
      return '0 0 * * 0'; // Every Sunday at midnight
    case 'monthly':
      return '0 0 1 * *'; // First day of month at midnight
    default:
      return '0 * * * *'; // Default to hourly
  }
}

// Helper function to decrypt credentials
function decryptCredentials(encrypted: string): string {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  const [ivHex, encryptedText] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  // Hash the encryption key to get the correct 32-byte key for AES-256
  const key = crypto.createHash('sha256').update(String(encryptionKey)).digest();

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Apply authentication middleware to all routes
router.use(authenticateToken);

// ========================================
// AGENT USER ENDPOINTS
// ========================================

// Get all agent users for organization
router.get('/agent-users', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const agentUsers = await storage.getAgentUsers(user.organizationId);
    res.json(agentUsers);
  } catch (error) {
    console.error('Error fetching agent users:', error);
    res.status(500).json({ error: 'Failed to fetch agent users' });
  }
});

// Create agent user
router.post('/agent-users', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const { username, fullName, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required' });
    }

    const agentUser = await storage.createAgentUser({
      organizationId: user.organizationId,
      username,
      fullName: fullName || username,
      email,
      userType: 'agent',
      role: 'team_member',
      isActive: true,
    });

    res.status(201).json(agentUser);
  } catch (error) {
    console.error('Error creating agent user:', error);
    res.status(500).json({ error: 'Failed to create agent user' });
  }
});

// ========================================
// WORKFLOW ENDPOINTS
// ========================================

// Get all workflows for organization
router.get('/workflows', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const workflows = await storage.getAgentWorkflows(user.organizationId);
    res.json(workflows);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// Get specific workflow
router.get('/workflows/:id', async (req, res) => {
  try {
    const workflowId = parseInt(req.params.id);
    if (isNaN(workflowId)) {
      return res.status(400).json({ error: 'Invalid workflow ID' });
    }

    const workflow = await storage.getAgentWorkflow(workflowId);
    
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    res.json(workflow);
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

// Create workflow
router.post('/workflows', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    // Convert frontend actions to workflow definition array
    const workflowDefinition = req.body.actions || [{ type: 'log_event', name: 'Log Event', config: {} }];

    // Validate assignedUserId is provided
    if (!req.body.assignedUserId) {
      return res.status(400).json({ error: 'Assigned user ID is required' });
    }

    // Prepare data for validation - only include fields the backend schema expects
    const workflowData = {
      name: req.body.name,
      description: req.body.description,
      triggerType: req.body.triggerType,
      triggerConfig: req.body.triggerConfig || {},
      workflowDefinition,
      organizationId: user.organizationId,
      createdBy: user.id,
      assignedUserId: req.body.assignedUserId,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    };

    // Validate request body
    const validationResult = insertAgentWorkflowSchema.safeParse(workflowData);

    if (!validationResult.success) {
      console.error('❌ Workflow validation failed:', JSON.stringify(validationResult.error.issues, null, 2));
      console.error('❌ Request body:', JSON.stringify(req.body, null, 2));
      return res.status(400).json({ 
        error: 'Invalid input data', 
        details: validationResult.error.issues 
      });
    }

    const workflow = await storage.createAgentWorkflow(validationResult.data);
    res.status(201).json(workflow);
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// Update workflow
router.put('/workflows/:id', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const workflowId = parseInt(req.params.id);
    if (isNaN(workflowId)) {
      return res.status(400).json({ error: 'Invalid workflow ID' });
    }

    const workflow = await storage.updateAgentWorkflow(workflowId, req.body);
    
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    // Handle schedule creation/update/deletion based on trigger type
    if (req.body.triggerType === 'schedule' && req.body.triggerConfig?.frequency) {
      // Check if schedule exists
      const existingSchedules = await db
        .select()
        .from(agentWorkflowSchedules)
        .where(eq(agentWorkflowSchedules.workflowId, workflowId))
        .limit(1);
      
      const cronExpression = frequencyToCron(req.body.triggerConfig.frequency);
      
      if (existingSchedules.length > 0) {
        // Update existing schedule
        await db
          .update(agentWorkflowSchedules)
          .set({
            cronExpression,
            isActive: workflow.isEnabled,
            updatedAt: new Date()
          })
          .where(eq(agentWorkflowSchedules.id, existingSchedules[0].id));
        
        console.log(`📅 Updated schedule for workflow ${workflowId}: ${cronExpression}`);
      } else {
        // Create new schedule
        await db
          .insert(agentWorkflowSchedules)
          .values({
            workflowId,
            organizationId: user.organizationId,
            cronExpression,
            timezone: 'UTC',
            isActive: workflow.isEnabled,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        
        console.log(`📅 Created new schedule for workflow ${workflowId}: ${cronExpression}`);
      }
    } else if (req.body.triggerType && req.body.triggerType !== 'schedule') {
      // If trigger type is not schedule, deactivate any existing schedules
      await db
        .update(agentWorkflowSchedules)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(agentWorkflowSchedules.workflowId, workflowId));
      
      console.log(`📅 Deactivated schedule for workflow ${workflowId} (trigger type changed to ${req.body.triggerType})`);
    }
    
    res.json(workflow);
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// Delete workflow
router.delete('/workflows/:id', async (req, res) => {
  try {
    const workflowId = parseInt(req.params.id);
    if (isNaN(workflowId)) {
      return res.status(400).json({ error: 'Invalid workflow ID' });
    }

    await storage.deleteAgentWorkflow(workflowId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

// Test Splynx query (for Agent Builder UI)
router.post('/workflows/test-splynx-query', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const { entity, mode, filters, dateRange, dateRangeField, limit } = req.body;
    
    if (!entity) {
      return res.status(400).json({ error: 'Entity is required' });
    }

    // Get Splynx integration credentials
    const [splynxIntegration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.organizationId, user.organizationId),
          eq(integrations.platformType, 'splynx')
        )
      )
      .limit(1);

    if (!splynxIntegration || !splynxIntegration.credentialsEncrypted) {
      return res.status(400).json({ error: 'Splynx integration not configured' });
    }

    // Decrypt credentials
    const credentials = JSON.parse(decryptCredentials(splynxIntegration.credentialsEncrypted));
    const { baseUrl, authHeader } = credentials;

    if (!baseUrl || !authHeader) {
      return res.status(400).json({ error: 'Splynx credentials incomplete' });
    }

    // Query Splynx using SplynxService
    const splynxService = new SplynxService({ baseUrl, authHeader });

    // For testing, we want to show the TRUE total count, not limited
    // So we query with a high limit to get all matching records
    const fullResult = await splynxService.queryEntities({
      entity,
      mode: 'list', // Always use list mode to get records
      filters: filters || [],
      dateRange,
      dateRangeField,
      limit: 10000, // High limit to get all matching records
    });

    // Return the full count but only first 5 records as samples
    const sampleLimit = limit || 5;
    res.json({
      count: fullResult.count, // True total count
      records: fullResult.records?.slice(0, sampleLimit) || [], // Only first 5 as samples
    });
  } catch (error) {
    console.error('Error testing Splynx query:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to test query' 
    });
  }
});

// Execute workflow manually
router.post('/workflows/:id/execute', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const workflowId = parseInt(req.params.id);
    if (isNaN(workflowId)) {
      return res.status(400).json({ error: 'Invalid workflow ID' });
    }

    const workflow = await storage.getAgentWorkflow(workflowId);
    
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Map workflowDefinition to configuration.steps format expected by WorkflowExecutor
    const workflowWithConfig = {
      ...workflow,
      configuration: {
        steps: workflow.workflowDefinition || []
      }
    };

    // Execute workflow using WorkflowExecutor
    const executor = new WorkflowExecutor();
    
    // Execute asynchronously (don't wait for completion)
    // Spread request body data (like trigger) directly into context for template resolution
    executor.executeWorkflow(workflowWithConfig, {
      organizationId: String(user.organizationId),
      userId: user.id,
      triggerSource: `Manual execution by user ${user.id}`,
      ...req.body,
      manualData: req.body
    }).catch(error => {
      console.error('Workflow execution failed:', error);
    });

    res.json({ 
      success: true,
      message: 'Workflow execution started' 
    });
  } catch (error) {
    console.error('Error executing workflow:', error);
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

// Get all workflow runs for organization
router.get('/runs', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const runs = await storage.getAllWorkflowRuns(user.organizationId);
    res.json(runs);
  } catch (error) {
    console.error('Error fetching all workflow runs:', error);
    res.status(500).json({ error: 'Failed to fetch workflow runs' });
  }
});

// Get workflow runs for a specific workflow
router.get('/workflows/:id/runs', async (req, res) => {
  try {
    const workflowId = parseInt(req.params.id);
    if (isNaN(workflowId)) {
      return res.status(400).json({ error: 'Invalid workflow ID' });
    }

    const runs = await storage.getWorkflowRuns(workflowId);
    res.json(runs);
  } catch (error) {
    console.error('Error fetching workflow runs:', error);
    res.status(500).json({ error: 'Failed to fetch workflow runs' });
  }
});

// Get specific workflow run with full execution details
router.get('/workflows/:workflowId/runs/:runId', async (req, res) => {
  try {
    const workflowId = parseInt(req.params.workflowId);
    const runId = parseInt(req.params.runId);
    
    if (isNaN(workflowId) || isNaN(runId)) {
      return res.status(400).json({ error: 'Invalid workflow ID or run ID' });
    }

    const run = await storage.getWorkflowRun(runId);
    
    if (!run) {
      return res.status(404).json({ error: 'Workflow run not found' });
    }
    
    // Verify the run belongs to the specified workflow
    if (run.workflowId !== workflowId) {
      return res.status(403).json({ error: 'Run does not belong to specified workflow' });
    }
    
    res.json(run);
  } catch (error) {
    console.error('Error fetching workflow run:', error);
    res.status(500).json({ error: 'Failed to fetch workflow run' });
  }
});


// Get available triggers for organization
router.get('/triggers', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    console.log(`🔧 Fetching triggers for organization: ${user.organizationId}`);
    const triggers = await storage.getAllTriggersForOrganization(user.organizationId);
    console.log(`🔧 Found ${triggers.length} triggers:`, triggers.map(t => t.name));
    res.json(triggers);
  } catch (error) {
    console.error('🚨 Error fetching triggers:', error);
    res.status(500).json({ error: 'Failed to fetch triggers' });
  }
});

// Get triggers for specific integration
router.get('/triggers/:integrationId', async (req, res) => {
  try {
    const integrationId = parseInt(req.params.integrationId);
    if (isNaN(integrationId)) {
      return res.status(400).json({ error: 'Invalid integration ID' });
    }

    const triggers = await storage.getIntegrationTriggers(integrationId);
    res.json(triggers);
  } catch (error) {
    console.error('Error fetching integration triggers:', error);
    res.status(500).json({ error: 'Failed to fetch integration triggers' });
  }
});

// Get all actions for organization
router.get('/actions', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const actions = await storage.getAllActionsForOrganization(user.organizationId);
    res.json(actions);
  } catch (error) {
    console.error('Error fetching actions:', error);
    res.status(500).json({ error: 'Failed to fetch actions' });
  }
});

// Get actions for specific integration
router.get('/actions/:integrationId', async (req, res) => {
  try {
    const integrationId = parseInt(req.params.integrationId);
    if (isNaN(integrationId)) {
      return res.status(400).json({ error: 'Invalid integration ID' });
    }

    const actions = await storage.getIntegrationActions(integrationId);
    res.json(actions);
  } catch (error) {
    console.error('Error fetching integration actions:', error);
    res.status(500).json({ error: 'Failed to fetch integration actions' });
  }
});

// Import catalog for an integration
router.post('/integrations/:integrationId/import-catalog', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const integrationId = parseInt(req.params.integrationId);
    if (isNaN(integrationId)) {
      return res.status(400).json({ error: 'Invalid integration ID' });
    }

    // Verify the integration belongs to the organization
    const integration = await storage.getIntegrationById(integrationId);
    if (!integration || integration.organizationId !== user.organizationId) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Import catalog
    const catalogImporter = new IntegrationCatalogImporter(storage);
    const result = await catalogImporter.importCatalog(integration);
    
    res.json({
      success: true,
      message: `Successfully imported ${result.triggersImported} triggers and ${result.actionsImported} actions for ${integration.platformType}`,
      triggersImported: result.triggersImported,
      actionsImported: result.actionsImported
    });
  } catch (error) {
    console.error('Error importing integration catalog:', error);
    res.status(500).json({ error: 'Failed to import integration catalog' });
  }
});

export default router;