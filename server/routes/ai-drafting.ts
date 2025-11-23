import { Router } from 'express';
import { db } from '../db';
import { authenticateToken } from '../auth';
import { 
  ticketDraftResponses, 
  aiAgentConfigurations,
  workItems,
  knowledgeDocuments,
  workflowTemplates,
  insertTicketDraftResponseSchema,
  insertAiAgentConfigurationSchema,
  objectives,
  keyResults
} from '../../shared/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { calculateEditPercentage } from '../utils/text-comparison';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// ========================================
// MODEL MANAGEMENT ENDPOINTS  
// ========================================

// Get available OpenAI models
router.get('/models', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    // Define available models for ticket drafting (focusing on text generation models)
    const availableModels = [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Most capable model, best for complex responses',
        context_window: 128000,
        maxTokens: 4096,
        recommended: false
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o-mini',
        description: 'Fast and cost-effective, great for most support tickets',
        context_window: 128000,
        maxTokens: 16384,
        recommended: true
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Previous generation flagship model',
        context_window: 128000,
        maxTokens: 4096,
        recommended: false
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Budget-friendly option for simple responses',
        context_window: 16385,
        maxTokens: 4096,
        recommended: false
      }
    ];

    res.json({ models: availableModels });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch available models' });
  }
});

// ========================================
// AI AGENT CONFIGURATION ENDPOINTS
// ========================================

// Get AI agent configuration for organization
router.get('/config', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const featureType = req.query.featureType as string || 'ticket_drafting';

    const configs = await db
      .select()
      .from(aiAgentConfigurations)
      .where(
        and(
          eq(aiAgentConfigurations.organizationId, user.organizationId),
          eq(aiAgentConfigurations.featureType, featureType)
        )
      )
      .limit(1);

    if (!configs.length) {
      // Return default configuration for first-time setup
      return res.json({
        id: null,
        organizationId: user.organizationId,
        featureType,
        isEnabled: false,
        systemPromptDocumentIds: [],
        knowledgeDocumentIds: [],
        modelConfig: {
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 1000,
        },
        linkedObjectiveId: null,
        linkedKeyResultIds: [],
        autoGenerateOnArrival: true,
      });
    }

    res.json(configs[0]);
  } catch (error) {
    console.error('Error fetching AI config:', error);
    res.status(500).json({ error: 'Failed to fetch AI configuration' });
  }
});

// Create or update AI agent configuration
router.post('/config', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    // Validate request body
    const validationResult = insertAiAgentConfigurationSchema.safeParse({
      ...req.body,
      organizationId: user.organizationId,
      createdBy: user.id,
    });

    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid configuration data', 
        details: validationResult.error.errors 
      });
    }

    const configData = validationResult.data;

    // SECURITY: Validate that all knowledge document IDs belong to this organization
    if (configData.knowledgeDocumentIds && configData.knowledgeDocumentIds.length > 0) {
      const kbDocs = await db
        .select({ id: knowledgeDocuments.id })
        .from(knowledgeDocuments)
        .where(
          and(
            inArray(knowledgeDocuments.id, configData.knowledgeDocumentIds),
            eq(knowledgeDocuments.organizationId, user.organizationId)
          )
        );

      const validKbDocIds = kbDocs.map(doc => doc.id);
      const invalidIds = configData.knowledgeDocumentIds.filter(id => !validKbDocIds.includes(id));

      if (invalidIds.length > 0) {
        return res.status(403).json({ 
          error: 'Forbidden: Some knowledge document IDs do not belong to your organization',
          invalidIds 
        });
      }
    }

    // Check if config already exists
    const existingConfigs = await db
      .select()
      .from(aiAgentConfigurations)
      .where(
        and(
          eq(aiAgentConfigurations.organizationId, user.organizationId),
          eq(aiAgentConfigurations.featureType, configData.featureType)
        )
      )
      .limit(1);

    let savedConfig;

    if (existingConfigs.length > 0) {
      // Update existing config
      [savedConfig] = await db
        .update(aiAgentConfigurations)
        .set({
          ...configData,
          updatedAt: new Date(),
        })
        .where(eq(aiAgentConfigurations.id, existingConfigs[0].id))
        .returning();
    } else {
      // Create new config
      [savedConfig] = await db
        .insert(aiAgentConfigurations)
        .values(configData)
        .returning();
    }

    res.status(existingConfigs.length > 0 ? 200 : 201).json(savedConfig);
  } catch (error) {
    console.error('Error saving AI config:', error);
    res.status(500).json({ error: 'Failed to save AI configuration' });
  }
});

// Delete AI agent configuration
router.delete('/config/:id', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const configId = parseInt(req.params.id);

    // Verify ownership before deleting
    const config = await db
      .select()
      .from(aiAgentConfigurations)
      .where(
        and(
          eq(aiAgentConfigurations.id, configId),
          eq(aiAgentConfigurations.organizationId, user.organizationId)
        )
      )
      .limit(1);

    if (!config.length) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    await db
      .delete(aiAgentConfigurations)
      .where(eq(aiAgentConfigurations.id, configId));

    res.json({ success: true, message: 'Configuration deleted' });
  } catch (error) {
    console.error('Error deleting AI config:', error);
    res.status(500).json({ error: 'Failed to delete AI configuration' });
  }
});

// ========================================
// TICKET DRAFT ENDPOINTS
// ========================================

// Get draft for a specific work item
router.get('/drafts/work-item/:workItemId', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const workItemId = parseInt(req.params.workItemId);

    // Verify work item belongs to user's organization
    const workItem = await db
      .select()
      .from(workItems)
      .where(
        and(
          eq(workItems.id, workItemId),
          eq(workItems.organizationId, user.organizationId)
        )
      )
      .limit(1);

    if (!workItem.length) {
      return res.status(404).json({ error: 'Work item not found' });
    }

    // Get draft for this work item
    const drafts = await db
      .select()
      .from(ticketDraftResponses)
      .where(eq(ticketDraftResponses.workItemId, workItemId))
      .orderBy(desc(ticketDraftResponses.createdAt))
      .limit(1);

    if (!drafts.length) {
      return res.status(404).json({ error: 'No draft found for this work item' });
    }

    res.json(drafts[0]);
  } catch (error) {
    console.error('Error fetching draft:', error);
    res.status(500).json({ error: 'Failed to fetch draft' });
  }
});

// Get all drafts for organization (with pagination)
router.get('/drafts', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const sentOnly = req.query.sentOnly === 'true';

    let query = db
      .select()
      .from(ticketDraftResponses)
      .where(eq(ticketDraftResponses.organizationId, user.organizationId))
      .orderBy(desc(ticketDraftResponses.createdAt))
      .limit(limit)
      .offset(offset);

    const drafts = await query;

    res.json({
      drafts,
      pagination: {
        limit,
        offset,
        total: drafts.length,
      }
    });
  } catch (error) {
    console.error('Error fetching drafts:', error);
    res.status(500).json({ error: 'Failed to fetch drafts' });
  }
});

// Create/generate new draft
router.post('/drafts', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const validationResult = insertTicketDraftResponseSchema.safeParse({
      ...req.body,
      organizationId: user.organizationId,
    });

    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid draft data', 
        details: validationResult.error.errors 
      });
    }

    const draftData = validationResult.data;

    // Verify work item exists and belongs to organization
    const workItem = await db
      .select()
      .from(workItems)
      .where(
        and(
          eq(workItems.id, draftData.workItemId),
          eq(workItems.organizationId, user.organizationId)
        )
      )
      .limit(1);

    if (!workItem.length) {
      return res.status(404).json({ error: 'Work item not found' });
    }

    // Check if draft already exists for this work item
    const existingDrafts = await db
      .select()
      .from(ticketDraftResponses)
      .where(eq(ticketDraftResponses.workItemId, draftData.workItemId))
      .limit(1);

    let savedDraft;

    if (existingDrafts.length > 0) {
      // Update existing draft (regeneration)
      [savedDraft] = await db
        .update(ticketDraftResponses)
        .set({
          originalDraft: draftData.originalDraft,
          generationMetadata: draftData.generationMetadata,
          regenerationCount: (existingDrafts[0].regenerationCount || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(ticketDraftResponses.id, existingDrafts[0].id))
        .returning();
    } else {
      // Create new draft
      [savedDraft] = await db
        .insert(ticketDraftResponses)
        .values({
          organizationId: draftData.organizationId,
          workItemId: draftData.workItemId,
          originalDraft: draftData.originalDraft,
          generationMetadata: draftData.generationMetadata || {},
          regenerationCount: 0,
        })
        .returning();
    }

    // Update work item metadata to link to draft
    await db
      .update(workItems)
      .set({
        workflowMetadata: {
          ...(workItem[0].workflowMetadata as any || {}),
          draftId: savedDraft.id,
          draftGeneratedAt: new Date().toISOString(),
        },
      })
      .where(eq(workItems.id, draftData.workItemId));

    res.status(existingDrafts.length > 0 ? 200 : 201).json(savedDraft);
  } catch (error) {
    console.error('Error creating draft:', error);
    res.status(500).json({ error: 'Failed to create draft' });
  }
});

// Regenerate draft
router.post('/drafts/:id/regenerate', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const draftId = parseInt(req.params.id);

    // Verify draft belongs to user's organization
    const drafts = await db
      .select()
      .from(ticketDraftResponses)
      .where(
        and(
          eq(ticketDraftResponses.id, draftId),
          eq(ticketDraftResponses.organizationId, user.organizationId)
        )
      )
      .limit(1);

    if (!drafts.length) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    // Trigger regeneration by calling the generate_draft action handler
    // This will update the existing draft with a new response
    const draft = drafts[0];
    
    // TODO: Implement actual regeneration logic by calling generateTicketDraft
    // For now, return the existing draft with incremented regeneration count
    const [updatedDraft] = await db
      .update(ticketDraftResponses)
      .set({
        regenerationCount: (draft.regenerationCount || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(ticketDraftResponses.id, draftId))
      .returning();

    res.json(updatedDraft);
  } catch (error) {
    console.error('Error regenerating draft:', error);
    res.status(500).json({ error: 'Failed to regenerate draft' });
  }
});

// Update draft and mark as sent
router.patch('/drafts/:id', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const draftId = parseInt(req.params.id);
    const { finalResponse } = req.body;

    if (!finalResponse) {
      return res.status(400).json({ error: 'Final response is required' });
    }

    // Verify draft belongs to user's organization
    const drafts = await db
      .select()
      .from(ticketDraftResponses)
      .where(
        and(
          eq(ticketDraftResponses.id, draftId),
          eq(ticketDraftResponses.organizationId, user.organizationId)
        )
      )
      .limit(1);

    if (!drafts.length) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    const draft = drafts[0];

    // Calculate edit percentage using Levenshtein distance-based comparison
    const editPercentage = calculateEditPercentage(draft.originalDraft, finalResponse);

    // Update draft with final response
    const [updatedDraft] = await db
      .update(ticketDraftResponses)
      .set({
        finalResponse,
        editPercentage: editPercentage,
        sentAt: new Date(),
        sentBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(ticketDraftResponses.id, draftId))
      .returning();

    res.json(updatedDraft);
  } catch (error) {
    console.error('Error updating draft:', error);
    res.status(500).json({ error: 'Failed to update draft' });
  }
});

// Delete draft
router.delete('/drafts/:id', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const draftId = parseInt(req.params.id);

    // Verify draft belongs to user's organization
    const draft = await db
      .select()
      .from(ticketDraftResponses)
      .where(
        and(
          eq(ticketDraftResponses.id, draftId),
          eq(ticketDraftResponses.organizationId, user.organizationId)
        )
      )
      .limit(1);

    if (!draft.length) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    await db
      .delete(ticketDraftResponses)
      .where(eq(ticketDraftResponses.id, draftId));

    res.json({ success: true, message: 'Draft deleted' });
  } catch (error) {
    console.error('Error deleting draft:', error);
    res.status(500).json({ error: 'Failed to delete draft' });
  }
});

// Initialize AI drafting (validate configuration)
router.post('/initialize-workflows', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    // Get AI configuration
    const configs = await db
      .select()
      .from(aiAgentConfigurations)
      .where(
        and(
          eq(aiAgentConfigurations.organizationId, user.organizationId),
          eq(aiAgentConfigurations.featureType, 'ticket_drafting')
        )
      )
      .limit(1);

    if (!configs.length) {
      return res.status(400).json({ 
        error: 'No AI configuration found. Please save your configuration first.' 
      });
    }

    const agentConfig = configs[0];

    // Validate that referenced resources exist
    const validations = [];

    if (agentConfig.linkedObjectiveId) {
      const objective = await db
        .select()
        .from(objectives)
        .where(
          and(
            eq(objectives.id, agentConfig.linkedObjectiveId),
            eq(objectives.organizationId, user.organizationId)
          )
        )
        .limit(1);

      if (!objective.length) {
        validations.push({ field: 'objective', error: 'Referenced objective not found' });
      }
    }

    if (agentConfig.linkedKeyResultIds && agentConfig.linkedKeyResultIds.length > 0) {
      const keyResultsData = await db
        .select()
        .from(keyResults)
        .where(
          and(
            inArray(keyResults.id, agentConfig.linkedKeyResultIds),
            eq(keyResults.organizationId, user.organizationId)
          )
        );

      if (keyResultsData.length !== agentConfig.linkedKeyResultIds.length) {
        validations.push({ field: 'keyResults', error: 'Some referenced key results not found' });
      }
    }

    if (agentConfig.knowledgeDocumentIds && agentConfig.knowledgeDocumentIds.length > 0) {
      const kbDocs = await db
        .select()
        .from(knowledgeDocuments)
        .where(
          and(
            inArray(knowledgeDocuments.id, agentConfig.knowledgeDocumentIds),
            eq(knowledgeDocuments.organizationId, user.organizationId)
          )
        );

      if (kbDocs.length !== agentConfig.knowledgeDocumentIds.length) {
        validations.push({ field: 'knowledgeDocuments', error: 'Some referenced knowledge documents not found' });
      }
    }

    if (validations.length > 0) {
      return res.status(400).json({ 
        error: 'Configuration validation failed',
        details: validations
      });
    }

    // Mark config as enabled
    await db
      .update(aiAgentConfigurations)
      .set({ isEnabled: true, updatedAt: new Date() })
      .where(eq(aiAgentConfigurations.id, agentConfig.id));

    res.json({
      success: true,
      message: 'AI ticket drafting has been successfully initialized and enabled',
      config: {
        id: agentConfig.id,
        isEnabled: true,
        knowledgeDocCount: agentConfig.knowledgeDocumentIds?.length || 0,
        linkedObjectiveId: agentConfig.linkedObjectiveId,
        linkedKeyResultCount: agentConfig.linkedKeyResultIds?.length || 0,
      }
    });
  } catch (error) {
    console.error('Error initializing AI drafting:', error);
    res.status(500).json({ error: 'Failed to initialize AI drafting' });
  }
});

export default router;
