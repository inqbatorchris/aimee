import { Router } from 'express';
import { storage } from '../storage';
import { authenticateToken } from '../auth';
import { OpenAIService, type ChatMessage } from '../services/integrations/openaiService';
import { db } from '../db';
import {
  aiChatSessions,
  aiChatMessages,
  aiProposedActions,
  aiAssistantConfig,
  aiAssistantFunctions,
  aiFunctionUsageLogs,
  activityLogs,
  users,
  knowledgeDocuments,
  knowledgeDocumentActivity,
  workItems,
  checkInMeetings,
  meetingTopics,
  missionVision,
  agentWorkflows,
  workflowTemplates,
  integrations,
  integrationTriggers,
  type InsertAIChatSession,
  type InsertAIChatMessage,
  type InsertAIProposedAction,
  type InsertActivityLog,
} from '../../shared/schema';
import { eq, and, desc, sql, gte, lte, like, or } from 'drizzle-orm';
import { coreStorage } from '../core-storage';
import { z } from 'zod';

const router = Router();

router.use(authenticateToken);

// Get or create AI Assistant config for organization
router.get('/config', async (req: any, res) => {
  try {
    let config = await db.query.aiAssistantConfig.findFirst({
      where: eq(aiAssistantConfig.organizationId, req.user.organizationId),
    });

    if (!config) {
      const [newConfig] = await db.insert(aiAssistantConfig).values({
        organizationId: req.user.organizationId,
      }).returning();
      config = newConfig;
    }

    res.json(config);
  } catch (error: any) {
    console.error('Error fetching AI config:', error);
    res.status(500).json({ error: 'Failed to fetch AI configuration' });
  }
});

// Update AI Assistant config
router.put('/config', async (req: any, res) => {
  try {
    const [updated] = await db.update(aiAssistantConfig)
      .set({
        ...req.body,
        updatedAt: new Date(),
      })
      .where(eq(aiAssistantConfig.organizationId, req.user.organizationId))
      .returning();

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating AI config:', error);
    res.status(500).json({ error: 'Failed to update AI configuration' });
  }
});

// Update AI Assistant config (PATCH)
router.patch('/config', async (req: any, res) => {
  try {
    const [updated] = await db.update(aiAssistantConfig)
      .set({
        ...req.body,
        updatedAt: new Date(),
      })
      .where(eq(aiAssistantConfig.organizationId, req.user.organizationId))
      .returning();

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating AI config:', error);
    res.status(500).json({ error: 'Failed to update AI configuration' });
  }
});

// Get all AI Assistant functions for organization
router.get('/functions', async (req: any, res) => {
  try {
    console.log('🔍 Fetching functions for organization:', req.user.organizationId);
    const functions = await db.query.aiAssistantFunctions.findMany({
      where: eq(aiAssistantFunctions.organizationId, req.user.organizationId),
      orderBy: [desc(aiAssistantFunctions.isEnabled), aiAssistantFunctions.displayName],
    });
    console.log('📦 Found functions:', functions.length);

    res.json(functions);
  } catch (error: any) {
    console.error('Error fetching AI functions:', error);
    res.status(500).json({ error: 'Failed to fetch AI functions' });
  }
});

// Update AI Assistant function
router.patch('/functions/:functionId', async (req: any, res) => {
  try {
    const functionId = parseInt(req.params.functionId);
    
    console.log('🔄 ===== PATCH /functions/:functionId =====');
    console.log('Function ID:', functionId);
    console.log('Request body:', JSON.stringify(req.body));
    console.log('User org ID:', req.user.organizationId);
    console.log('User ID:', req.user.id);

    // Get the current function to check what changed
    const currentFunction = await db.query.aiAssistantFunctions.findFirst({
      where: and(
        eq(aiAssistantFunctions.id, functionId),
        eq(aiAssistantFunctions.organizationId, req.user.organizationId)
      )
    });

    if (!currentFunction) {
      console.error('❌ Function not found:', functionId);
      return res.status(404).json({ error: 'Function not found' });
    }

    console.log('Current function state:', currentFunction.displayName, 'enabled:', currentFunction.isEnabled);

    const [updated] = await db.update(aiAssistantFunctions)
      .set({
        ...req.body,
        updatedAt: new Date(),
      })
      .where(and(
        eq(aiAssistantFunctions.id, functionId),
        eq(aiAssistantFunctions.organizationId, req.user.organizationId)
      ))
      .returning();

    console.log('✅ Function updated:', updated.displayName, 'enabled:', updated.isEnabled);

    // Log activity if isEnabled changed
    if (req.body.isEnabled !== undefined && currentFunction.isEnabled !== req.body.isEnabled) {
      const activityLogData: InsertActivityLog = {
        organizationId: req.user.organizationId,
        userId: req.user.id,
        actionType: 'status_change',
        entityType: 'ai_function',
        entityId: functionId,
        description: `${updated.displayName} function ${req.body.isEnabled ? 'enabled' : 'disabled'}`,
        metadata: {
          functionName: updated.displayName,
          previousState: currentFunction.isEnabled,
          newState: updated.isEnabled,
        },
      };

      await db.insert(activityLogs).values(activityLogData);
      console.log('📝 Activity logged for function toggle');
    }

    res.json(updated);
  } catch (error: any) {
    console.error('❌ Error updating AI function:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Failed to update AI function' });
  }
});

// Create new chat session
router.post('/sessions', async (req: any, res) => {
  try {
    const { title, pageContext, pageData, personalityConfig } = req.body;

    const sessionData: InsertAIChatSession = {
      organizationId: req.user.organizationId,
      userId: req.user.id,
      title: title || 'New Chat',
      pageContext: pageContext || '/',
      pageData: pageData || null,
      personalityConfig: personalityConfig || null,
    };

    const [session] = await db.insert(aiChatSessions)
      .values(sessionData)
      .returning();

    res.json(session);
  } catch (error: any) {
    console.error('Error creating chat session:', error);
    res.status(500).json({ error: 'Failed to create chat session' });
  }
});

// Get all chat sessions for current user
router.get('/sessions', async (req: any, res) => {
  try {
    const sessions = await db.query.aiChatSessions.findMany({
      where: and(
        eq(aiChatSessions.organizationId, req.user.organizationId),
        eq(aiChatSessions.userId, req.user.id)
      ),
      orderBy: [desc(aiChatSessions.lastMessageAt)],
      limit: 50,
    });

    res.json(sessions);
  } catch (error: any) {
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({ error: 'Failed to fetch chat sessions' });
  }
});

// Get specific chat session with messages
router.get('/sessions/:sessionId', async (req: any, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);

    const session = await db.query.aiChatSessions.findFirst({
      where: and(
        eq(aiChatSessions.id, sessionId),
        eq(aiChatSessions.organizationId, req.user.organizationId)
      ),
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const messages = await db.query.aiChatMessages.findMany({
      where: eq(aiChatMessages.sessionId, sessionId),
      orderBy: [aiChatMessages.createdAt],
    });

    res.json({ session, messages });
  } catch (error: any) {
    console.error('Error fetching chat session:', error);
    res.status(500).json({ error: 'Failed to fetch chat session' });
  }
});

// Get messages for a session
router.get('/sessions/:sessionId/messages', async (req: any, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);

    // Verify session belongs to user's organization
    const session = await db.query.aiChatSessions.findFirst({
      where: and(
        eq(aiChatSessions.id, sessionId),
        eq(aiChatSessions.organizationId, req.user.organizationId)
      ),
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const messages = await db.query.aiChatMessages.findMany({
      where: eq(aiChatMessages.sessionId, sessionId),
      orderBy: [aiChatMessages.createdAt],
    });

    // Also load all proposed actions for this session
    const proposedActions = await db.query.aiProposedActions.findMany({
      where: and(
        eq(aiProposedActions.sessionId, sessionId),
        eq(aiProposedActions.organizationId, req.user.organizationId)
      ),
      orderBy: [aiProposedActions.createdAt],
    });

    // Create a map of messageId -> proposedAction for easy lookup
    const actionsByMessageId = new Map();
    for (const action of proposedActions) {
      if (action.messageId) {
        actionsByMessageId.set(action.messageId, action);
      }
    }

    // Attach proposed actions to their corresponding messages
    const messagesWithActions = messages.map(msg => ({
      ...msg,
      proposedAction: actionsByMessageId.get(msg.id) || null,
    }));

    res.json(messagesWithActions);
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Update chat session (rename, etc.)
router.patch('/sessions/:sessionId', async (req: any, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const { title } = req.body;

    // Verify session belongs to user
    const session = await db.query.aiChatSessions.findFirst({
      where: and(
        eq(aiChatSessions.id, sessionId),
        eq(aiChatSessions.organizationId, req.user.organizationId),
        eq(aiChatSessions.userId, req.user.id)
      ),
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const [updated] = await db.update(aiChatSessions)
      .set({
        title: title || session.title,
        updatedAt: new Date(),
      })
      .where(eq(aiChatSessions.id, sessionId))
      .returning();

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating chat session:', error);
    res.status(500).json({ error: 'Failed to update chat session' });
  }
});

// Delete chat session
router.delete('/sessions/:sessionId', async (req: any, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);

    // Verify session belongs to user
    const session = await db.query.aiChatSessions.findFirst({
      where: and(
        eq(aiChatSessions.id, sessionId),
        eq(aiChatSessions.organizationId, req.user.organizationId),
        eq(aiChatSessions.userId, req.user.id)
      ),
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Delete all messages in the session first
    await db.delete(aiChatMessages)
      .where(eq(aiChatMessages.sessionId, sessionId));

    // Delete any proposed actions
    await db.delete(aiProposedActions)
      .where(eq(aiProposedActions.sessionId, sessionId));

    // Delete the session
    await db.delete(aiChatSessions)
      .where(eq(aiChatSessions.id, sessionId));

    res.json({ success: true, message: 'Chat session deleted' });
  } catch (error: any) {
    console.error('Error deleting chat session:', error);
    res.status(500).json({ error: 'Failed to delete chat session' });
  }
});

// Auto-generate session title based on conversation
router.post('/sessions/:sessionId/auto-name', async (req: any, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);

    // Verify ownership
    const session = await db.query.aiChatSessions.findFirst({
      where: and(
        eq(aiChatSessions.id, sessionId),
        eq(aiChatSessions.userId, req.user.id),
        eq(aiChatSessions.organizationId, req.user.organizationId)
      ),
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get first 3-5 messages to analyze
    const messages = await db.select()
      .from(aiChatMessages)
      .where(eq(aiChatMessages.sessionId, sessionId))
      .orderBy(aiChatMessages.createdAt)
      .limit(5);

    if (messages.length < 2) {
      return res.json({ message: 'Not enough messages to generate title' });
    }

    // Build conversation summary
    const conversationSummary = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    // Use AI to generate title
    const openaiService = new OpenAIService(req.user.organizationId);
    await openaiService.initialize();
    
    const titlePrompt = `Based on this conversation, generate a concise, descriptive title (3-6 words max). Focus on the main topic or intent.

Conversation:
${conversationSummary}

Title:`;

    const titleResponse = await openaiService.createChatCompletion([
      { role: 'user', content: titlePrompt }
    ], {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 20,
    });

    let generatedTitle = titleResponse.choices[0].message.content?.trim() || 'New Chat';
    
    // Remove quotes if present
    generatedTitle = generatedTitle.replace(/^["']|["']$/g, '');
    
    // Limit to 60 characters
    if (generatedTitle.length > 60) {
      generatedTitle = generatedTitle.substring(0, 57) + '...';
    }

    // Update session title
    const [updated] = await db.update(aiChatSessions)
      .set({
        title: generatedTitle,
        updatedAt: new Date(),
      })
      .where(eq(aiChatSessions.id, sessionId))
      .returning();

    res.json({ title: generatedTitle, session: updated });
  } catch (error) {
    console.error('Error auto-naming session:', error);
    res.status(500).json({ error: 'Failed to generate session title' });
  }
});

// Send message and get AI response
router.post('/sessions/:sessionId/messages', async (req: any, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const { content, functionCall } = req.body;

    const session = await db.query.aiChatSessions.findFirst({
      where: and(
        eq(aiChatSessions.id, sessionId),
        eq(aiChatSessions.organizationId, req.user.organizationId)
      ),
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const userMessageData: InsertAIChatMessage = {
      sessionId,
      organizationId: req.user.organizationId,
      role: 'user',
      content,
      functionCall: functionCall || null,
    };

    const [userMessage] = await db.insert(aiChatMessages)
      .values(userMessageData)
      .returning();

    const previousMessages = await db.query.aiChatMessages.findMany({
      where: eq(aiChatMessages.sessionId, sessionId),
      orderBy: [aiChatMessages.createdAt],
      limit: 20,
    });

    const config = await db.query.aiAssistantConfig.findFirst({
      where: eq(aiAssistantConfig.organizationId, req.user.organizationId),
    });

    const systemPrompt = await buildSystemPrompt(req.user, session, config);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...previousMessages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant' | 'function',
        content: m.content || '',
      })),
    ];

    const openaiService = new OpenAIService(req.user.organizationId);
    await openaiService.initialize();

    const availableFunctions = await getAvailableFunctions(req.user.organizationId, req.user.role);

    const startTime = Date.now();
    
    // 🔍 LOG: OpenAI Request
    console.log('\n━━━━ AI CHAT REQUEST ━━━━');
    console.log('📤 Sending to OpenAI:');
    console.log('  Model:', config?.defaultModel || 'gpt-4o-mini');
    console.log('  Message count:', messages.length);
    console.log('  Functions available:', availableFunctions.length);
    console.log('  System prompt length:', messages[0]?.content?.length || 0, 'chars');
    console.log('  Last user message:', content.substring(0, 100));
    
    const completion = await openaiService.createChatCompletion(messages, {
      model: config?.defaultModel || 'gpt-4o-mini',
      temperature: parseFloat(config?.temperature?.toString() || '0.7'),
      max_tokens: config?.maxTokens || 2000,
      functions: availableFunctions,
      function_call: 'auto',
    });

    const executionTime = Date.now() - startTime;
    let assistantMessage = completion.choices[0].message;
    
    // 🔍 LOG: OpenAI Response
    console.log('\n📥 OpenAI Response:');
    console.log('  Response time:', executionTime, 'ms');
    console.log('  Tokens used:', completion.usage?.total_tokens || 0);
    console.log('  Has function_call:', !!assistantMessage.function_call);
    if (assistantMessage.function_call) {
      console.log('  Function name:', assistantMessage.function_call.name);
      console.log('  Function args:', assistantMessage.function_call.arguments.substring(0, 200));
    }
    console.log('  Message content:', assistantMessage.content?.substring(0, 200) || '[empty]');
    console.log('━━━━━━━━━━━━━━━━━━━━\n');

    // Define read-only functions
    const readOnlyFunctions = [
      'list_objectives',
      'list_key_results',
      'list_key_result_tasks',
      'list_work_items',
      'list_knowledge_documents',
      'list_upcoming_meetings',
      'get_meeting_agenda',
      'get_vision_mission',
      'list_addresses',
      'get_recent_activity',
      // Workflow Builder read-only functions
      'list_integration_capabilities',
      'list_workflow_step_types',
      'list_existing_workflows',
      'preview_agent_workflow',
      'preview_workflow_template',
    ];
    
    // Check if the AI wants to call a function
    if (assistantMessage.function_call) {
      const functionName = assistantMessage.function_call.name;
      const functionArgs = JSON.parse(assistantMessage.function_call.arguments);
      
      // Determine if this is a read-only function
      const isReadOnly = readOnlyFunctions.includes(functionName);
      
      if (isReadOnly) {
        // Auto-execute read-only functions
        try {
          const action = {
            actionType: functionName,
            actionPayload: functionArgs
          };
          const functionResult = await executeAction(action, req.user);
          
          // Add function call and result to messages
          messages.push({
            role: 'assistant' as const,
            content: '',
            function_call: assistantMessage.function_call,
          });
          messages.push({
            role: 'function' as const,
            name: functionName,
            content: JSON.stringify(functionResult),
          });
          
          // Get AI's final response with the function result
          // IMPORTANT: Include functions so AI can call write functions after reading data
          const finalCompletion = await openaiService.createChatCompletion(messages, {
            model: config?.defaultModel || 'gpt-4o-mini',
            temperature: parseFloat(config?.temperature?.toString() || '0.7'),
            max_tokens: config?.maxTokens || 2000,
            functions: availableFunctions,
            function_call: 'auto',
          });
          
          // Update assistant message with the final response
          assistantMessage = finalCompletion.choices[0].message;
          
          // Update function statistics
          const functionRecord = await db.query.aiAssistantFunctions.findFirst({
            where: and(
              eq(aiAssistantFunctions.organizationId, req.user.organizationId),
              eq(aiAssistantFunctions.functionName, functionName)
            )
          });
          
          if (functionRecord) {
            await db.update(aiAssistantFunctions)
              .set({
                totalCalls: (functionRecord.totalCalls || 0) + 1,
                successfulCalls: (functionRecord.successfulCalls || 0) + 1,
                lastCalledAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(aiAssistantFunctions.id, functionRecord.id));
          }
          
          // Log function execution in activity logs
          await db.insert(activityLogs).values({
            organizationId: req.user.organizationId,
            userId: req.user.id,
            actionType: 'ai_chat',
            entityType: 'ai_function',
            entityId: functionRecord?.id,
            description: `Auto-executed function: ${functionName}`,
            metadata: {
              sessionId,
              functionName,
              functionArgs,
              executionTime: Date.now() - startTime,
              success: true,
            },
          });
        } catch (error: any) {
          console.error('Error auto-executing function:', error);
          
          // ✅ Provide helpful error message to user instead of silent failure
          const errorMessage = error.message || 'Unknown error occurred';
          const suggestion = getSuggestionForError(error);
          
          // Create an error response message for the AI to deliver to the user
          messages.push({
            role: 'assistant' as const,
            content: '',
            function_call: assistantMessage.function_call,
          });
          messages.push({
            role: 'function' as const,
            name: functionName,
            content: JSON.stringify({
              error: true,
              message: errorMessage,
              suggestion: suggestion,
            }),
          });
          
          // Let AI formulate a user-friendly response based on the error
          try {
            const errorRecoveryCompletion = await openaiService.createChatCompletion(messages, {
              model: config?.defaultModel || 'gpt-4o-mini',
              temperature: parseFloat(config?.temperature?.toString() || '0.7'),
              max_tokens: config?.maxTokens || 2000,
            });
            assistantMessage = errorRecoveryCompletion.choices[0].message;
          } catch (recoveryError) {
            // If AI can't recover, provide a basic error message
            assistantMessage = {
              role: 'assistant' as const,
              content: `❌ I encountered an error: ${errorMessage}\n\n💡 ${suggestion}`,
            };
          }
        }
      }
    }

    // ✅ FIX: Generate preview if AI made function call but provided no content
    let messageContent = assistantMessage.content || '';
    if (!messageContent && assistantMessage.function_call) {
      const functionName = assistantMessage.function_call.name;
      const functionArgs = JSON.parse(assistantMessage.function_call.arguments);
      messageContent = generateActionPreview(functionName, functionArgs);
    }

    const aiMessageData: InsertAIChatMessage = {
      sessionId,
      organizationId: req.user.organizationId,
      role: 'assistant',
      content: messageContent,  // ✅ Never empty now
      functionCall: assistantMessage.function_call || null,
      modelUsed: config?.defaultModel || 'gpt-4o-mini',
      tokensUsed: completion.usage?.total_tokens || 0,
      executionTime,
    };

    const [aiMessage] = await db.insert(aiChatMessages)
      .values(aiMessageData)
      .returning();

    const totalTokens = (session.totalTokensUsed || 0) + (completion.usage?.total_tokens || 0);
    const estimatedCost = calculateCost(config?.defaultModel || 'gpt-4o-mini', completion.usage?.total_tokens || 0);

    await db.update(aiChatSessions)
      .set({
        totalMessages: (session.totalMessages || 0) + 2,
        totalTokensUsed: totalTokens,
        estimatedCost: ((parseFloat(session.estimatedCost?.toString() || '0') + estimatedCost) as any),
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(aiChatSessions.id, sessionId));

    // Create activity log for AI chat interaction
    const activityData: InsertActivityLog = {
      organizationId: req.user.organizationId,
      userId: req.user.id,
      actionType: 'ai_chat',
      entityType: 'ai_chat_session',
      entityId: sessionId,
      description: `AI chat: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
      metadata: {
        sessionId,
        userMessageId: userMessage.id,
        aiMessageId: aiMessage.id,
        tokensUsed: completion.usage?.total_tokens || 0,
        model: config?.defaultModel || 'gpt-4o-mini',
        executionTime,
      },
    };
    await db.insert(activityLogs).values(activityData);

    // Only create proposed action for write functions
    if (assistantMessage.function_call && !readOnlyFunctions.includes(assistantMessage.function_call.name)) {
      const proposedAction = await createProposedAction(
        sessionId,
        aiMessage.id,
        req.user,
        assistantMessage.function_call
      );
      
      // 🔍 LOG: Proposed Action Created
      console.log('\n✋ PROPOSED ACTION CREATED');
      console.log('  Action ID:', proposedAction.id);
      console.log('  Type:', proposedAction.actionType);
      console.log('  Status:', proposedAction.status);
      console.log('  Payload:', JSON.stringify(proposedAction.actionPayload).substring(0, 200));
      console.log('  Requires Approval:', true);
      console.log('  ➡️  Returning to frontend with approval button\n');
      
      const responseData = { userMessage, aiMessage, proposedAction };
      console.log('📤 RESPONSE BEING SENT TO FRONTEND:');
      console.log('   userMessage:', userMessage ? 'present (id: ' + userMessage.id + ')' : 'MISSING');
      console.log('   aiMessage:', aiMessage ? 'present (id: ' + aiMessage.id + ')' : 'MISSING');
      console.log('   proposedAction:', proposedAction ? 'present (id: ' + proposedAction.id + ')' : 'MISSING');
      console.log('   Full response keys:', Object.keys(responseData));
      console.log('   Serialized length:', JSON.stringify(responseData).length, 'bytes\n');
      
      res.json(responseData);
    } else {
      console.log('\n✅ READ-ONLY or NO FUNCTION CALL');
      console.log('  ➡️  Returning direct response (no approval needed)\n');
      res.json({ userMessage, aiMessage });
    }
  } catch (error: any) {
    console.error('Error sending message:', error);
    
    // Extract the actual OpenAI error message if available
    let errorMessage = 'Failed to send message';
    let errorDetails = error.message;
    
    // Check if this is an OpenAI API error
    if (error.response?.data?.error) {
      const openaiError = error.response.data.error;
      errorMessage = openaiError.message || errorMessage;
      errorDetails = `OpenAI API Error: ${openaiError.message || 'Unknown error'}`;
      
      // Log the specific OpenAI error for debugging
      console.error('🚫 OpenAI API Error:', {
        message: openaiError.message,
        type: openaiError.type,
        code: openaiError.code,
        param: openaiError.param,
      });
    } else if (error.message) {
      errorDetails = error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: errorDetails,
    });
  }
});

// Get available functions for AI
async function getAvailableFunctions(organizationId: number, userRole: string) {
  const functions = await db.query.aiAssistantFunctions.findMany({
    where: and(
      eq(aiAssistantFunctions.organizationId, organizationId),
      eq(aiAssistantFunctions.isEnabled, true)
    ),
  });

  return functions
    .filter(f => canUserAccessFunction(f, userRole))
    .filter(f => f.functionSchema != null) // Exclude functions with null schema
    .map(f => normalizeFunctionSchema(f.functionSchema));
}

// Normalize function schema to handle both old and new OpenAI formats
function normalizeFunctionSchema(schema: any): any {
  // Check if this is the new OpenAI Tools format (has type: "function" wrapper)
  if (schema?.type === 'function' && schema?.function) {
    // Extract the inner function definition for the legacy functions parameter
    return schema.function;
  }
  
  // Already in the correct format (old OpenAI functions format)
  return schema;
}

function canUserAccessFunction(func: any, userRole: string): boolean {
  const roleHierarchy: { [key: string]: number } = {
    'team_member': 1,
    'manager': 2,
    'admin': 3,
    'super_admin': 4,
  };

  const requiredLevel = roleHierarchy[func.minimumRole || 'team_member'] || 1;
  const userLevel = roleHierarchy[userRole] || 1;

  return userLevel >= requiredLevel;
}

// Generate human-readable action preview when AI makes a function call
function generateActionPreview(functionName: string, args: any): string {
  switch (functionName) {
    case 'create_objective':
      return `📊 I'll create this objective:

**${args.title}**
${args.description ? `\n${args.description}\n` : ''}
🎯 Target Date: ${args.targetDate ? new Date(args.targetDate).toLocaleDateString() : 'Not specified'}
👤 Owner: ${args.ownerId ? 'Assigned owner' : 'You'}
📈 Status: ${args.status || 'Not Started'}

${args.keyResults?.length ? `This will include ${args.keyResults.length} key result(s).` : 'You can add key results after creation.'}`;

    case 'create_key_result':
      return `📈 I'll add this key result:

**${args.title}**
${args.description ? `\n${args.description}\n` : ''}
📊 Target: ${args.currentValue || 0} → ${args.targetValue} ${args.unit || ''}
📏 Measurement: ${args.kpiType || 'Manual tracking'}
${args.deadline ? `⏰ Deadline: ${new Date(args.deadline).toLocaleDateString()}` : ''}`;

    case 'create_task':
      return `✅ I'll create this task:

**${args.title}**
${args.description ? `\n${args.description}\n` : ''}
${args.assignedTo ? '👤 Will be assigned to selected user\n' : ''}
${args.dueDate ? `📅 Due: ${new Date(args.dueDate).toLocaleDateString()}\n` : ''}
${args.priority ? `⚡ Priority: ${args.priority}` : ''}`;

    case 'update_objective':
      const objUpdates = Object.keys(args).filter(k => k !== 'id');
      return `🔄 I'll update the objective with these changes:

${objUpdates.map(key => {
        const value = args[key];
        const displayValue = key.includes('Date') && value ? new Date(value).toLocaleDateString() : value;
        return `• **${key}**: ${displayValue}`;
      }).join('\n')}`;

    case 'update_key_result':
      const krUpdates = Object.keys(args).filter(k => k !== 'id');
      return `📊 I'll update the key result:

${krUpdates.map(key => {
        const value = args[key];
        const displayValue = key.includes('Date') && value ? new Date(value).toLocaleDateString() : value;
        return `• **${key}**: ${displayValue}`;
      }).join('\n')}`;

    case 'update_task':
      const taskUpdates = Object.keys(args).filter(k => k !== 'id');
      return `✏️ I'll update the task:

${taskUpdates.map(key => {
        const value = args[key];
        const displayValue = key.includes('Date') && value ? new Date(value).toLocaleDateString() : value;
        return `• **${key}**: ${displayValue}`;
      }).join('\n')}`;

    case 'complete_task':
      return `✅ I'll mark task #${args.taskId} as completed.`;

    case 'draft_objective_with_krs':
      return `📋 I'll create a complete objective structure:

**${args.title}**
${args.description ? `\n${args.description}\n` : ''}
🎯 Target Date: ${args.targetDate ? new Date(args.targetDate).toLocaleDateString() : 'Not specified'}

This will include ${args.keyResults?.length || 0} key result(s) that will be created step-by-step after you approve.`;

    case 'create_work_item':
      return `📝 I'll create this work item:

**${args.title}**
${args.description ? `\n${args.description}\n` : ''}
${args.status ? `📊 Status: ${args.status}\n` : ''}
${args.assignedTo ? '👤 Will be assigned to selected user\n' : ''}
${args.dueDate ? `📅 Due: ${new Date(args.dueDate).toLocaleDateString()}\n` : ''}
${args.priority ? `⚡ Priority: ${args.priority}` : ''}`;

    case 'update_work_item':
      const workItemUpdates = Object.keys(args).filter(k => k !== 'id');
      return `🔄 I'll update the work item with these changes:

${workItemUpdates.map(key => {
        const value = args[key];
        const displayValue = key.includes('Date') || key.includes('date') && value ? new Date(value).toLocaleDateString() : value;
        return `• **${key}**: ${displayValue}`;
      }).join('\n')}`;

    // Knowledge Base function previews
    case 'create_knowledge_document':
      return `📚 I'll create this knowledge base document:

**${args.title}**
${args.summary ? `\n📝 Summary: ${args.summary}\n` : ''}
${args.categories && args.categories.length > 0 ? `🏷️ Categories: ${args.categories.join(', ')}\n` : ''}
${args.status ? `📊 Status: ${args.status}\n` : ''}
${args.visibility ? `👁️ Visibility: ${args.visibility}\n` : ''}
${args.content ? `📄 Content: ${args.content.substring(0, 200)}${args.content.length > 200 ? '...' : ''}` : ''}`;

    case 'update_knowledge_document':
      const kbDocUpdates = Object.keys(args).filter(k => k !== 'id');
      return `📝 I'll update the knowledge base document with these changes:

${kbDocUpdates.map(key => {
        const value = args[key];
        let displayValue = value;
        if (key === 'content' && typeof value === 'string') {
          displayValue = value.substring(0, 200) + (value.length > 200 ? '...' : '');
        } else if (Array.isArray(value)) {
          displayValue = value.join(', ');
        }
        return `• **${key}**: ${displayValue}`;
      }).join('\n')}`;

    // Check-in Meeting function previews
    case 'extract_action_points_from_transcript':
      return `🤖 I'll analyze the meeting transcript and extract:
      
• Action items with owners
• Decisions made
• Follow-up items
• Due dates mentioned

Transcript length: ${args.transcript.length} characters

This will take a moment as I process the content with AI...`;

    case 'create_meeting_action_items':
      return `✅ I'll create ${args.actionItems.length} work item${args.actionItems.length !== 1 ? 's' : ''} from the meeting:

${args.actionItems.map((item: any, index: number) => `${index + 1}. **${item.title}**
   ${item.description ? `   📝 ${item.description}\n` : ''}   ${item.assignedTo ? `👤 Assigned to user #${item.assignedTo}\n` : ''}   ${item.dueDate ? `📅 Due: ${new Date(item.dueDate).toLocaleDateString()}` : ''}`).join('\n\n')}

These will be linked to meeting #${args.meetingId}`;

    // Vision & Mission function previews
    case 'update_vision_mission':
      const updates = [];
      if (args.mission !== undefined) {
        updates.push(`**Mission:**\n${args.mission.substring(0, 200)}${args.mission.length > 200 ? '...' : ''}`);
      }
      if (args.vision !== undefined) {
        updates.push(`**Vision:**\n${args.vision.substring(0, 200)}${args.vision.length > 200 ? '...' : ''}`);
      }
      if (args.strategyStatementHtml !== undefined) {
        const textContent = args.strategyStatementHtml.replace(/<[^>]*>/g, '');
        updates.push(`**Strategy Statement:**\n${textContent.substring(0, 200)}${textContent.length > 200 ? '...' : ''}`);
      }
      return `🎯 I'll update the organization's vision and mission:

${updates.join('\n\n')}`;

    default:
      return `⚡ I'm proposing to execute: **${functionName}**

With the following parameters:
${JSON.stringify(args, null, 2)}`;
  }
}

async function buildSystemPrompt(user: any, session: any, config: any): Promise<string> {
  const personalityName = config?.personalityName || 'Aimee';

  let prompt = `You are ${personalityName}, an AI assistant for aimee.works Strategy OS.

⚙️ CORE BEHAVIOR RULES (CRITICAL - Always follow):
1. **WAIT FOR REQUESTS**: Only respond when the user asks you to do something. Never proactively suggest actions unprompted.
2. **STEP-BY-STEP EXECUTION**: Execute one function at a time, not compound operations. Chain functions sequentially after user approval.
3. **STRICT VALIDATION**: All inputs are validated. If validation fails, you'll receive an error with suggestions - explain them clearly to the user.
4. **ERROR HANDLING**: When errors occur, explain the problem in simple terms and suggest how to fix it.
5. **CONVERSATIONAL**: Be natural and helpful - avoid robotic "I'll propose" language unless actually proposing a write action.

🎯 RESPONSE PRIORITY (CRITICAL - Follow this order):
1. **FIRST**: Answer the user's question directly with specific data and insights
2. **THEN**: If the user asked you to do something, execute or propose the necessary function
3. **ALWAYS**: Format responses naturally with structure (bullets, emojis, headers)

📊 CONVERSATION STYLE:
- Be direct and helpful - provide actual information immediately
- Use natural language and conversational tone
- Format with bullet points, emojis (📊 ✅ ⚠️ 🚫), and clear structure
- Show actual numbers, progress, and metrics when discussing work
- Only suggest actions when the user explicitly asks for help

✨ HOW TO RESPOND:

**GOOD Example:**
User: "What are my current objectives?"
You: "Here are your 3 active objectives:

📊 **Reach $2M ARR** - 65% complete
   • On track, due in 45 days
   • KR: Close 50 deals (32/50 complete - 64%)
   • KR: Increase ARPU to $4k (currently $3.2k)

⚠️ **Increase NPS to 50** - 15% complete (AT RISK!)
   • Due in 21 days, needs immediate attention
   • Stalled: No updates in 12 days
   
✅ **Launch mobile app** - 85% complete
   • Ahead of schedule, in final testing"

**BAD Example (Don't do this):**
User: "What are my current objectives?"
You: "⚡ Proposing action: list_objectives"

🔧 WHEN TO USE FUNCTIONS:
- **READ functions** (list_objectives, list_key_results, list_tasks, list_integration_capabilities, list_existing_workflows): Auto-execute and include results in your response
- **PROACTIVE LOOKUPS**: When the user asks you to create something, FIRST use read functions to look up any required IDs or data. Don't ask the user for IDs you can look up yourself.
  - Example: User says "create a workflow for Splynx tickets" → First call list_integration_capabilities to find the Splynx integration ID, then IMMEDIATELY call the create function
- **WRITE functions** (create/update): Call the function directly - the system will automatically show an approval card to the user. DO NOT ask "should I proceed?" or "please confirm" in text - just call the function!
- **CRITICAL**: When you have all the required data from read functions, IMMEDIATELY call the write function. Don't ask for text confirmation. The approval card UI handles user approval.
- **STEP-BY-STEP**: When creating complex structures (e.g., objective + key results), call ONE function at a time:
  1. Call create_objective → system shows approval card → user clicks approve
  2. Call create_key_result → system shows approval card → user clicks approve
  3. Continue until complete

❌ ERROR HANDLING:
When you receive an error:
- Explain what went wrong in simple terms
- Show the specific validation issue (e.g., "Title must be at least 3 characters")
- Suggest how to fix it (e.g., "Try providing a more detailed title")
- Ask if they want to try again with corrections

Current Context:
- User: ${user.name} (${user.role})
- Organization: ${user.organizationId}
- Page: ${session.pageContext || 'Unknown'}
- Date: ${new Date().toLocaleDateString()}

Available Functions:
• list_objectives - View all objectives with progress
• create_objective - Create new objective
• update_objective - Update objective details
• list_key_results - View key results for objectives
• create_key_result - Add key result to objective
• update_key_result - Update key result progress
• list_key_result_tasks - View tasks for key result
• create_task - Add task to key result
• update_task - Update task details
• complete_task - Mark task as completed
• draft_objective_with_krs - Create complete OKR structure
• list_work_items - View work items with filters (status, assignee, due dates)
• create_work_item - Create new one-off work item
• update_work_item - Update work item details (title, status, assignee, due date)`;

  if (session.pageData) {
    prompt += `\n\n📄 CURRENT PAGE DATA (Use this context):
${JSON.stringify(session.pageData, null, 2)}

The user is viewing this data RIGHT NOW. Reference it naturally:
- "Looking at your current objective..."
- "I see this key result is stuck..."
- "Based on what's on your screen..."`;
  }

  // Load Knowledge Base document if configured
  if (config?.instructionDocumentId) {
    try {
      const kbDoc = await db.query.knowledgeDocuments.findFirst({
        where: and(
          eq(knowledgeDocuments.id, config.instructionDocumentId),
          eq(knowledgeDocuments.organizationId, user.organizationId)
        ),
      });

      if (kbDoc && kbDoc.content) {
        prompt += `\n\n📚 INSTRUCTION DOCUMENT (Follow these guidelines):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${kbDoc.title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${kbDoc.content}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
These are organization-specific instructions. Follow them carefully while maintaining your core behavior rules above.`;
      }
    } catch (error) {
      console.error('Error loading instruction document:', error);
    }
  }

  // Add custom instructions if configured
  if (config?.customInstructions) {
    prompt += `\n\n💡 CUSTOM INSTRUCTIONS:
${config.customInstructions}`;
  }

  return prompt;
}

async function createProposedAction(
  sessionId: number,
  messageId: number,
  user: any,
  functionCall: any
): Promise<any> {
  const actionData: InsertAIProposedAction = {
    sessionId,
    messageId,
    organizationId: user.organizationId,
    userId: user.id,
    actionType: functionCall.name,
    actionPayload: JSON.parse(functionCall.arguments),
    reasoning: 'AI proposed function call',
    status: 'pending',
  };

  const [action] = await db.insert(aiProposedActions)
    .values(actionData)
    .returning();

  return action;
}

function calculateCost(model: string, tokens: number): number {
  // Pricing per 1000 tokens (approximate as of Oct 2025 - OpenAI official pricing)
  const pricing: { [key: string]: number } = {
    'gpt-4o': 0.00500,             // $5.00 per 1M tokens
    'gpt-4o-mini': 0.00025,        // $0.25 per 1M tokens (RECOMMENDED)
    'gpt-4-turbo': 0.01000,        // $10.00 per 1M tokens
    'gpt-4': 0.03000,              // $30.00 per 1M tokens
    'o1': 0.01500,                 // $15.00 per 1M tokens
    'o3-mini': 0.00100,            // $1.00 per 1M tokens
    'o4-mini': 0.00100,            // $1.00 per 1M tokens
    'gpt-3.5-turbo': 0.0005,       // $0.50 per 1M tokens
  };

  return (pricing[model] || pricing['gpt-4o-mini']) * tokens;
}

// Approve and execute action
router.post('/actions/:actionId/approve', async (req: any, res) => {
  try {
    const actionId = parseInt(req.params.actionId);
    console.log('\n🟢 ========== APPROVE ACTION REQUEST ==========');
    console.log('🆔 Action ID:', actionId);
    console.log('👤 User:', req.user.email, '(ID:', req.user.id, ')');
    console.log('🏢 Organization ID:', req.user.organizationId);

    const action = await db.query.aiProposedActions.findFirst({
      where: and(
        eq(aiProposedActions.id, actionId),
        eq(aiProposedActions.organizationId, req.user.organizationId)
      ),
    });

    console.log('📋 Action found:', action ? 'YES' : 'NO');
    if (action) {
      console.log('   Type:', action.actionType);
      console.log('   Status:', action.status);
      console.log('   Payload:', JSON.stringify(action.actionPayload).substring(0, 100));
    }

    if (!action) {
      console.log('❌ Action not found - returning 404\n');
      return res.status(404).json({ error: 'Action not found' });
    }

    if (action.status !== 'pending') {
      console.log('❌ Action already processed (status:', action.status, ') - returning 400\n');
      return res.status(400).json({ error: 'Action already processed' });
    }

    const startTime = Date.now();
    let executionResult: any;
    let executionError: string | null = null;

    console.log('⚡ Executing action:', action.actionType);
    try {
      executionResult = await executeAction(action, req.user);
      console.log('✅ Action executed successfully');
      console.log('   Result:', JSON.stringify(executionResult).substring(0, 200));
      
      await db.update(aiProposedActions)
        .set({
          status: 'executed',
          approvedBy: req.user.id,
          approvedAt: new Date(),
          executedAt: new Date(),
          executionResult,
          updatedAt: new Date(),
        })
        .where(eq(aiProposedActions.id, actionId));

      const activityData: InsertActivityLog = {
        organizationId: req.user.organizationId,
        userId: req.user.id,
        actionType: 'agent_action',
        entityType: 'ai_proposed_action',
        entityId: actionId,
        description: `AI executed: ${action.actionType}`,
        metadata: {
          actionType: action.actionType,
          executionTime: Date.now() - startTime,
          result: executionResult,
        },
      };

      await db.insert(activityLogs).values(activityData);

      // ✅ Send AI follow-up message to verify DB and confirm to user
      try {
        const verificationPrompt = `The user approved the action. The ${action.actionType} has been executed successfully. 

Execution Result:
${JSON.stringify(executionResult, null, 2)}

Please:
1. Verify the database to confirm what was created/updated
2. Provide a clear confirmation message to the user about what changed
3. Show relevant details (ID, title, status, etc.)

Be specific and reference the actual data from the database.`;

        // Get OpenAI integration for API key
        const integrations = await storage.getIntegrations(req.user.organizationId);
        const openaiIntegration = integrations.find((i: any) => i.integrationType === 'openai');
        
        // Get AI config
        const aiConfig = await db.query.aiAssistantConfig.findFirst({
          where: eq(aiAssistantConfig.organizationId, req.user.organizationId),
        });

        // Get session
        const session = await db.query.aiChatSessions.findFirst({
          where: eq(aiChatSessions.id, action.sessionId),
        });

        if (session && aiConfig && openaiIntegration?.config?.apiKey) {
          // Get conversation history
          const previousMessages = await db.query.aiChatMessages.findMany({
            where: eq(aiChatMessages.sessionId, action.sessionId),
            orderBy: [desc(aiChatMessages.createdAt)],
            limit: 10,
          });

          const messages: ChatMessage[] = previousMessages
            .reverse()
            .map(msg => ({
              role: msg.role as 'system' | 'user' | 'assistant' | 'function',
              content: msg.content || '',
              function_call: msg.functionCall,
            }));

          // Add system message with verification prompt
          messages.push({
            role: 'user' as const,
            content: verificationPrompt,
          });

          // Get AI response
          const openaiService = new OpenAIService(openaiIntegration.config.apiKey);
          const systemPrompt = await buildSystemPrompt(req.user, session, aiConfig);
          
          messages.unshift({
            role: 'system' as const,
            content: systemPrompt,
          });

          const completion = await openaiService.createChatCompletion(messages, {
            model: aiConfig.defaultModel || 'gpt-4o-mini',
            temperature: parseFloat(aiConfig.temperature?.toString() || '0.7'),
            max_tokens: aiConfig.maxTokens || 2000,
          });

          const confirmationMessage = completion.choices[0].message;

          // Save AI confirmation message
          const aiMessageData: InsertAIChatMessage = {
            sessionId: action.sessionId,
            organizationId: req.user.organizationId,
            role: 'assistant',
            content: confirmationMessage.content || 'Action executed successfully.',
            modelUsed: aiConfig.defaultModel || 'gpt-4o-mini',
            tokensUsed: completion.usage?.total_tokens || 0,
            executionTime: Date.now() - startTime,
          };

          await db.insert(aiChatMessages).values(aiMessageData);
        }
      } catch (verificationError) {
        console.error('Error sending AI verification message:', verificationError);
        // Don't fail the approval if verification fails
      }

      console.log('📤 Sending success response to frontend\n');
      res.json({ success: true, result: executionResult });
    } catch (error: any) {
      executionError = error.message;
      console.log('\n❌ ========== ACTION EXECUTION FAILED ==========');
      console.log('Error message:', executionError);
      console.log('Error type:', typeof error);
      console.log('Error object:', error);
      console.log('Error stack:', error.stack);
      console.log('==============================================\n');
      
      await db.update(aiProposedActions)
        .set({
          status: 'failed',
          executionError,
          updatedAt: new Date(),
        })
        .where(eq(aiProposedActions.id, actionId));

      res.status(500).json({ error: 'Action execution failed', details: executionError });
    }
  } catch (error: any) {
    console.error('\n❌ ========== OUTER ERROR (APPROVE ROUTE) ==========');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('===================================================\n');
    res.status(500).json({ error: 'Failed to approve action' });
  }
});

// Reject action
router.post('/actions/:actionId/reject', async (req: any, res) => {
  try {
    const actionId = parseInt(req.params.actionId);
    const { reason } = req.body;

    await db.update(aiProposedActions)
      .set({
        status: 'rejected',
        rejectedBy: req.user.id,
        rejectedAt: new Date(),
        rejectionReason: reason || 'Rejected by user',
        updatedAt: new Date(),
      })
      .where(and(
        eq(aiProposedActions.id, actionId),
        eq(aiProposedActions.organizationId, req.user.organizationId)
      ));

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error rejecting action:', error);
    res.status(500).json({ error: 'Failed to reject action' });
  }
});

// ✅ Zod Validation Schemas for AI Functions
// Helper to accept both date-only (YYYY-MM-DD) and full datetime (ISO 8601) formats
const flexibleDateString = () => 
  z.string().refine(
    (val) => {
      // Accept YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return true;
      // Accept full ISO 8601 datetime format
      try {
        return !isNaN(new Date(val).getTime());
      } catch {
        return false;
      }
    },
    { message: 'Invalid date format. Use YYYY-MM-DD or ISO 8601 datetime format' }
  ).transform((val) => {
    // If it's just a date (YYYY-MM-DD), convert to datetime at end of day
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return `${val}T23:59:59.999Z`;
    }
    return val;
  });

const CreateObjectiveSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title must be 200 characters or less'),
  description: z.string().optional(),
  targetDate: flexibleDateString().optional(),
  ownerId: z.number().int().positive('Owner ID must be a positive integer').optional(),
  status: z.enum(['Draft', 'Active', 'On Track', 'At Risk', 'Off Track', 'Completed', 'Archived']).optional(),
});

const UpdateObjectiveSchema = z.object({
  id: z.number().int().positive('Objective ID must be a positive integer'),
  title: z.string().min(3).max(200).optional(),
  description: z.string().optional(),
  targetDate: flexibleDateString().optional(),
  status: z.enum(['Draft', 'Active', 'On Track', 'At Risk', 'Off Track', 'Completed', 'Archived']).optional(),
  progress: z.number().min(0).max(100).optional(),
});

const CreateKeyResultSchema = z.object({
  objectiveId: z.number().int().positive('Objective ID must be a positive integer'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().optional(),
  kpiType: z.string().optional().default('Manual'),
  currentValue: z.number().optional(),
  targetValue: z.number(),
  unit: z.string().optional(),
  deadline: flexibleDateString().optional(),
});

const UpdateKeyResultSchema = z.object({
  id: z.number().int().positive('Key result ID must be a positive integer'),
  title: z.string().min(3).max(200).optional(),
  description: z.string().optional(),
  currentValue: z.number().optional(),
  targetValue: z.number().optional(),
  status: z.enum(['Not Started', 'On Track', 'At Risk', 'Stuck', 'Completed']).optional(),
});

const CreateTaskSchema = z.object({
  keyResultId: z.number().int().positive('Key result ID must be a positive integer'),
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  assignedTo: z.number().int().positive().optional(),
  dueDate: flexibleDateString().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

const UpdateTaskSchema = z.object({
  id: z.number().int().positive('Task ID must be a positive integer'),
  title: z.string().min(3).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(['Not Started', 'On Track', 'Stuck', 'Completed']).optional(),
  dueDate: flexibleDateString().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

const CompleteTaskSchema = z.object({
  taskId: z.number().int().positive('Task ID must be a positive integer'),
});

const ListObjectivesSchema = z.object({
  status: z.string().optional(),
  limit: z.number().int().positive().max(50).optional(),
});

const ListKeyResultsSchema = z.object({
  objectiveId: z.number().int().positive('Objective ID must be a positive integer'),
});

const ListKeyResultTasksSchema = z.object({
  keyResultId: z.number().int().positive('Key result ID must be a positive integer'),
});

const ListWorkItemsSchema = z.object({
  status: z.string().optional(),
  assignedTo: z.number().int().positive().optional(),
  dueFrom: z.string().optional(),
  dueTo: z.string().optional(),
  limit: z.number().int().positive().max(50).optional(),
});

const CreateWorkItemSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255),
  description: z.string().optional(),
  dueDate: flexibleDateString().optional(),
  assignedTo: z.number().int().positive().optional(),
  status: z.enum(['Planning', 'Ready', 'In Progress', 'Stuck', 'Completed', 'Archived']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

const UpdateWorkItemSchema = z.object({
  id: z.number().int().positive('Work item ID must be a positive integer'),
  title: z.string().min(3).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['Planning', 'Ready', 'In Progress', 'Stuck', 'Completed', 'Archived']).optional(),
  dueDate: flexibleDateString().optional(),
  assignedTo: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

// ============================================================================
// KNOWLEDGE BASE SCHEMAS
// ============================================================================

const ListKnowledgeDocumentsSchema = z.object({
  category: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  search: z.string().optional(),
  limit: z.number().int().positive().max(50).optional(),
});

const CreateKnowledgeDocumentSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255),
  content: z.string().optional(),
  summary: z.string().optional(),
  categories: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published']).optional(),
  visibility: z.enum(['public', 'internal', 'private']).optional(),
});

const UpdateKnowledgeDocumentSchema = z.object({
  id: z.number().int().positive('Document ID must be a positive integer'),
  title: z.string().min(3).max(255).optional(),
  content: z.string().optional(),
  summary: z.string().optional(),
  categories: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  visibility: z.enum(['public', 'internal', 'private']).optional(),
});

// ============================================================================
// CHECK-IN MEETING SCHEMAS
// ============================================================================

const ListUpcomingMeetingsSchema = z.object({
  fromDate: flexibleDateString().optional(),
  toDate: flexibleDateString().optional(),
  teamId: z.number().int().positive().optional(),
  status: z.enum(['Planning', 'Planned', 'In Progress', 'Completed', 'Skipped']).optional(),
  limit: z.number().int().positive().max(50).optional(),
});

const GetMeetingAgendaSchema = z.object({
  meetingId: z.number().int().positive('Meeting ID must be a positive integer'),
});

const ExtractActionPointsSchema = z.object({
  transcript: z.string().min(50, 'Transcript must be at least 50 characters'),
  meetingId: z.number().int().positive().optional(),
});

const CreateMeetingActionItemsSchema = z.object({
  meetingId: z.number().int().positive('Meeting ID must be a positive integer'),
  actionItems: z.array(z.object({
    title: z.string().min(3).max(255),
    description: z.string().optional(),
    assignedTo: z.number().int().positive().optional(),
    dueDate: flexibleDateString().optional(),
  })).min(1, 'At least one action item is required'),
});

// ============================================================================
// VISION & MISSION SCHEMAS
// ============================================================================

const GetVisionMissionSchema = z.object({
  // No parameters needed - gets for current organization
});

const UpdateVisionMissionSchema = z.object({
  mission: z.string().optional(),
  vision: z.string().optional(),
  strategyStatementHtml: z.string().optional(),
}).refine(
  (data) => data.mission !== undefined || data.vision !== undefined || data.strategyStatementHtml !== undefined,
  { message: 'At least one field (mission, vision, or strategyStatementHtml) must be provided' }
);

// Helper function to provide user-friendly error suggestions
function getSuggestionForError(error: any): string {
  const message = error.message || '';
  
  if (message.includes('not found')) {
    return 'Try listing the available items first to get valid IDs.';
  }
  if (message.includes('access denied') || message.includes('permission')) {
    return 'You may not have permission for this action. Contact your administrator.';
  }
  if (message.includes('date') || message.includes('ISO 8601')) {
    return 'Make sure dates are in ISO 8601 format (e.g., "2025-12-31T23:59:59.000Z").';
  }
  if (message.includes('must be at least')) {
    return 'Please provide more detailed information.';
  }
  if (message.includes('positive integer')) {
    return 'Make sure the ID is a valid number greater than 0.';
  }
  if (message.includes('required')) {
    return 'Make sure all required fields are provided.';
  }
  
  return 'Please check your input and try again, or rephrase your request.';
}

async function executeAction(action: any, user: any): Promise<any> {
  const { actionType, actionPayload } = action;

  try {
    switch (actionType) {
    case 'query_customer_balance':
      return await queryCustomerBalance(actionPayload, user);
    
    case 'draft_objective_with_krs':
      return await draftObjectiveWithKRs(actionPayload, user);
    
    case 'list_objectives':
      return await listObjectives(actionPayload, user);
    
    case 'create_objective':
      return await createObjective(actionPayload, user);
    
    case 'update_objective':
      return await updateObjective(actionPayload, user);
    
    case 'list_key_results':
      return await listKeyResults(actionPayload, user);
    
    case 'create_key_result':
      return await createKeyResult(actionPayload, user);
    
    case 'update_key_result':
      return await updateKeyResult(actionPayload, user);
    
    case 'list_key_result_tasks':
      return await listKeyResultTasks(actionPayload, user);
    
    case 'create_task':
      return await createTask(actionPayload, user);
    
    case 'update_task':
      return await updateTask(actionPayload, user);
    
    case 'complete_task':
      return await completeTask(actionPayload, user);
    
    case 'list_work_items':
      return await listWorkItems(actionPayload, user);
    
    case 'create_work_item':
      return await createWorkItem(actionPayload, user);
    
    case 'update_work_item':
      return await updateWorkItem(actionPayload, user);
    
    // Knowledge Base functions
    case 'list_knowledge_documents':
      return await listKnowledgeDocuments(actionPayload, user);
    
    case 'create_knowledge_document':
      return await createKnowledgeDocument(actionPayload, user);
    
    case 'update_knowledge_document':
      return await updateKnowledgeDocument(actionPayload, user);
    
    // Check-in Meeting functions
    case 'list_upcoming_meetings':
      return await listUpcomingMeetings(actionPayload, user);
    
    case 'get_meeting_agenda':
      return await getMeetingAgenda(actionPayload, user);
    
    case 'extract_action_points_from_transcript':
      return await extractActionPointsFromTranscript(actionPayload, user);
    
    case 'create_meeting_action_items':
      return await createMeetingActionItems(actionPayload, user);
    
    // Vision & Mission functions
    case 'get_vision_mission':
      return await getVisionMission(actionPayload, user);
    
    case 'update_vision_mission':
      return await updateVisionMission(actionPayload, user);
    
    // Database Access functions
    case 'list_addresses':
      return await listAddresses(actionPayload, user);
    
    case 'get_recent_activity':
      return await getRecentActivity(actionPayload, user);
    
    // Workflow Builder functions
    case 'list_integration_capabilities':
      return await listIntegrationCapabilities(actionPayload, user);
    
    case 'list_workflow_step_types':
      return await listWorkflowStepTypes(actionPayload, user);
    
    case 'list_existing_workflows':
      return await listExistingWorkflows(actionPayload, user);
    
    case 'preview_agent_workflow':
      return await previewAgentWorkflow(actionPayload, user);
    
    case 'create_agent_workflow':
      return await createAgentWorkflow(actionPayload, user);
    
    case 'preview_workflow_template':
      return await previewWorkflowTemplate(actionPayload, user);
    
    case 'create_workflow_template':
      return await createWorkflowTemplate(actionPayload, user);
    
    case 'create_integration_trigger':
      return await createIntegrationTrigger(actionPayload, user);
    
    default:
      throw new Error(`Unknown action type: ${actionType}`);
    }
  } catch (error: any) {
    // ✅ Handle validation errors with user-friendly messages
    if (error instanceof z.ZodError) {
      const issues = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`❌ Validation failed: ${issues}. ${getSuggestionForError(error)}`);
    }
    
    // Re-throw with helpful suggestion
    throw new Error(`❌ Action failed: ${error.message}${getSuggestionForError(error) ? '\n\n💡 ' + getSuggestionForError(error) : ''}`);
  }
}

async function queryCustomerBalance(payload: any, user: any): Promise<any> {
  // NOTE: This is a demo implementation returning mock data for testing purposes.
  // In production, this should integrate with the Splynx integration to query real customer data.
  // 
  // Production implementation would:
  // 1. Check if Splynx integration exists for the organization
  // 2. Call the Splynx API via the integration service
  // 3. Return actual customer balance data
  //
  // For testing, use these mock customers: john@example.com, jane@example.com, bob@example.com
  
  const mockCustomers = [
    { email: 'john@example.com', name: 'John Doe', balance: 125.50 },
    { email: 'jane@example.com', name: 'Jane Smith', balance: -45.00 },
    { email: 'bob@example.com', name: 'Bob Johnson', balance: 0.00 },
  ];
  
  const searchTerm = payload.customerEmail?.toLowerCase() || payload.customerName?.toLowerCase() || '';
  const customer = mockCustomers.find(c => 
    c.email.toLowerCase().includes(searchTerm) || 
    c.name.toLowerCase().includes(searchTerm)
  );

  if (!customer) {
    return { 
      found: false, 
      isMockData: true,
      message: `Customer "${payload.customerEmail || payload.customerName}" not found in test data. Available test customers: john@example.com, jane@example.com, bob@example.com` 
    };
  }

  return {
    found: true,
    isMockData: true, // Flag to indicate this is test data
    customer: {
      name: customer.name,
      email: customer.email,
      balance: customer.balance,
      balanceFormatted: customer.balance >= 0 ? `$${customer.balance.toFixed(2)}` : `-$${Math.abs(customer.balance).toFixed(2)}`,
      status: customer.balance >= 0 ? 'Credit' : 'Debit'
    },
  };
}

async function draftObjectiveWithKRs(payload: any, user: any): Promise<any> {
  // Create actual database records when approved
  
  // Step 1: Create the objective
  const objectiveData = {
    title: payload.objective?.name || payload.objective?.title || payload.objectiveTitle || payload.title,
    description: payload.objective?.description || payload.description || '',
    organizationId: user.organizationId,
    ownerId: payload.ownerId || user.id,
    createdBy: user.id,
    status: 'Draft' as const,
    targetValue: payload.targetValue || null,
    targetDate: payload.targetDate ? new Date(payload.targetDate) : null,
    teamId: payload.teamId || null,
    assignedTo: payload.assignedTo || null,
    knowledgeDocumentId: payload.knowledgeDocumentId || null,
  };

  const createdObjective = await storage.createObjective(objectiveData);
  console.log('✅ Created objective:', createdObjective.id, createdObjective.title);

  // Step 2: Create key results linked to this objective
  const createdKeyResults = [];
  const keyResultsData = payload.keyResults || [];
  
  for (const kr of keyResultsData) {
    const krData = {
      title: kr.name || kr.title,
      description: kr.description || '',
      objectiveId: createdObjective.id,
      organizationId: user.organizationId,
      ownerId: payload.ownerId || user.id,
      createdBy: user.id,
      type: kr.type || 'Numeric Target',
      status: 'Not Started' as const,
      currentValue: kr.currentValue !== undefined ? String(kr.currentValue) : '0',
      targetValue: String(kr.targetValue || 0),
      teamId: payload.teamId || null,
      assignedTo: payload.assignedTo || null,
      knowledgeDocumentId: payload.knowledgeDocumentId || null,
      kpiType: kr.kpiType || 'Manual',
      unit: kr.unit || '',
      deadline: kr.deadline ? new Date(kr.deadline) : null,
    };

    const createdKR = await storage.createKeyResult(krData);
    console.log('✅ Created key result:', createdKR.id, createdKR.title);
    
    // Step 3: Create tasks for this key result
    const tasksData = kr.tasks || [];
    const createdTasks = [];
    
    for (const task of tasksData) {
      const taskData = {
        title: task.title,
        description: task.description || '',
        keyResultId: createdKR.id,
        organizationId: user.organizationId,
        assignedTo: task.assignedTo || user.id,
        createdBy: user.id,
        status: 'Not Started' as const,
        targetCompletion: task.dueDate ? new Date(task.dueDate) : null,
        teamId: payload.teamId || null,
        isRecurring: false,
        frequency: null,
        priority: task.priority || 'medium',
      };

      const createdTask = await storage.createKeyResultTask(taskData);
      console.log('✅ Created task:', createdTask.id, createdTask.title);
      createdTasks.push(createdTask);
    }
    
    createdKeyResults.push({
      ...createdKR,
      tasks: createdTasks,
    });
  }

  // Step 4: Also create any top-level tasks from payload
  const topLevelTasks = payload.tasks || [];
  const createdTopLevelTasks = [];
  
  for (const task of topLevelTasks) {
    // Top-level tasks need to be assigned to a key result
    // If there are KRs, assign to the first one, otherwise skip
    if (createdKeyResults.length > 0) {
      const taskData = {
        title: task.title,
        description: task.description || '',
        keyResultId: createdKeyResults[0].id,
        organizationId: user.organizationId,
        assignedTo: task.assignedTo || user.id,
        createdBy: user.id,
        status: 'Not Started' as const,
        targetCompletion: task.dueDate ? new Date(task.dueDate) : null,
        teamId: payload.teamId || null,
        isRecurring: false,
        frequency: null,
        priority: task.priority || 'medium',
      };

      const createdTask = await storage.createKeyResultTask(taskData);
      console.log('✅ Created top-level task:', createdTask.id, createdTask.title);
      createdTopLevelTasks.push(createdTask);
    }
  }

  const totalTasks = createdKeyResults.reduce((sum, kr) => sum + kr.tasks.length, 0) + createdTopLevelTasks.length;

  return {
    success: true,
    objective: createdObjective,
    keyResults: createdKeyResults,
    topLevelTasks: createdTopLevelTasks,
    summary: {
      objectiveCount: 1,
      keyResultCount: createdKeyResults.length,
      taskCount: totalTasks,
    },
    message: `✅ Successfully created 1 objective, ${createdKeyResults.length} key results, and ${totalTasks} tasks!`,
  };
}

async function listObjectives(payload: any, user: any): Promise<any> {
  const statusFilter = payload.status || 'active';
  const limit = Math.min(payload.limit || 10, 50); // Cap at 50

  // Query objectives from database
  const allObjectives = await storage.getObjectives(user.organizationId);
  
  // Filter by status if specified
  let filteredObjectives = allObjectives;
  if (statusFilter && statusFilter !== 'all') {
    filteredObjectives = allObjectives.filter((obj: any) => 
      obj.status?.toLowerCase() === statusFilter.toLowerCase()
    );
  }
  
  // Apply limit
  const objectives = filteredObjectives.slice(0, limit);

  // Get key results for each objective
  const objectivesWithKRs = await Promise.all(
    objectives.map(async (obj: any) => {
      const keyResults = await storage.getKeyResultsByObjective(obj.id);
      
      // Calculate objective progress from key results
      let objectiveProgress = 0;
      if (keyResults.length > 0) {
        const totalProgress = keyResults.reduce((sum: number, kr: any) => {
          const krProgress = kr.targetValue > 0 
            ? Math.min(100, (kr.currentValue / kr.targetValue) * 100)
            : 0;
          return sum + krProgress;
        }, 0);
        objectiveProgress = Math.round(totalProgress / keyResults.length);
      }
      
      return {
        id: obj.id,
        title: obj.title,
        description: obj.description,
        status: obj.status,
        targetDate: obj.targetDate,
        owner: obj.ownerName,
        keyResults: keyResults.map((kr: any) => {
          const progress = kr.targetValue > 0 
            ? Math.min(100, Math.round((kr.currentValue / kr.targetValue) * 100))
            : 0;
          return {
            id: kr.id,
            title: kr.title,
            currentValue: kr.currentValue,
            targetValue: kr.targetValue,
            progress,
            status: kr.status,
          };
        }),
        progress: objectiveProgress,
      };
    })
  );

  return {
    objectives: objectivesWithKRs,
    totalCount: objectives.length,
    statusFilter,
    summary: `Found ${objectivesWithKRs.length} ${statusFilter === 'all' ? '' : statusFilter + ' '}objectives`,
  };
}

// Get user context for AI Assistant
router.get('/context', async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get active objectives with progress
    const objectives = await storage.getObjectives(user.organizationId);
    const activeObjectives = objectives
      .filter((obj: any) => obj.status === 'active' || obj.status === 'Active')
      .slice(0, 3) // Top 3
      .map((obj: any) => ({
        id: obj.id,
        title: obj.title,
        progress: obj.progress || 0,
        status: obj.status,
        dueDate: obj.targetDate,
        category: obj.category,
      }));

    // Get work items
    const allWorkItems = await storage.getWorkItems(user.organizationId);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    // Filter for upcoming and overdue tasks
    const upcomingTasks = allWorkItems
      .filter((item: any) => {
        if (!item.dueDate) return false;
        const dueDate = new Date(item.dueDate);
        return dueDate >= today && dueDate <= weekFromNow && item.status !== 'completed';
      })
      .slice(0, 5)
      .map((item: any) => ({
        id: item.id,
        title: item.title,
        dueDate: item.dueDate,
        status: item.status,
        priority: item.priority,
      }));

    const overdueTasks = allWorkItems
      .filter((item: any) => {
        if (!item.dueDate) return false;
        const dueDate = new Date(item.dueDate);
        return dueDate < today && item.status !== 'completed';
      })
      .slice(0, 5)
      .map((item: any) => ({
        id: item.id,
        title: item.title,
        dueDate: item.dueDate,
        status: item.status,
        priority: item.priority,
      }));

    // Get recent activity (last 5 entries)
    const recentActivity = await db.select()
      .from(activityLogs)
      .where(eq(activityLogs.organizationId, user.organizationId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(5);

    const formattedActivity = recentActivity.map((log: any) => ({
      type: log.actionType,
      title: log.description || log.actionType,
      timestamp: log.createdAt,
      userId: log.userId,
    }));

    // Calculate alerts
    const alerts = [];
    
    if (overdueTasks.length > 0) {
      alerts.push({
        type: 'overdue_tasks',
        message: `${overdueTasks.length} work item${overdueTasks.length > 1 ? 's are' : ' is'} overdue`,
        severity: 'warning',
        count: overdueTasks.length,
      });
    }

    // Check for at-risk objectives (progress < 30% and due within 30 days)
    const atRiskObjectives = objectives.filter((obj: any) => {
      if (!obj.targetDate || obj.status !== 'active') return false;
      const progress = obj.progress || 0;
      const dueDate = new Date(obj.targetDate);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return progress < 30 && daysUntilDue <= 30 && daysUntilDue > 0;
    });

    if (atRiskObjectives.length > 0) {
      alerts.push({
        type: 'at_risk_objectives',
        message: `${atRiskObjectives.length} objective${atRiskObjectives.length > 1 ? 's are' : ' is'} at risk`,
        severity: 'warning',
        count: atRiskObjectives.length,
      });
    }

    // Check for stale objectives (not updated in 14+ days)
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const staleObjectives = objectives.filter((obj: any) => {
      if (obj.status !== 'active') return false;
      const updatedAt = obj.updatedAt ? new Date(obj.updatedAt) : null;
      return !updatedAt || updatedAt < twoWeeksAgo;
    });

    if (staleObjectives.length > 0) {
      alerts.push({
        type: 'stale_objectives',
        message: `${staleObjectives.length} objective${staleObjectives.length > 1 ? 's haven\'t' : ' hasn\'t'} been updated in 14+ days`,
        severity: 'info',
        count: staleObjectives.length,
      });
    }

    res.json({
      activeObjectives,
      upcomingTasks,
      overdueTasks,
      recentActivity: formattedActivity,
      alerts,
      summary: {
        totalObjectives: objectives.length,
        activeObjectives: activeObjectives.length,
        totalWorkItems: allWorkItems.length,
        upcomingCount: upcomingTasks.length,
        overdueCount: overdueTasks.length,
      },
    });
  } catch (error) {
    console.error('Error fetching user context:', error);
    res.status(500).json({ error: 'Failed to fetch user context' });
  }
});

// Get activity logs for AI Assistant
router.get('/activity-logs', async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    const actionType = req.query.actionType as string;

    let conditions = [eq(activityLogs.organizationId, user.organizationId)];
    
    // Filter by action type if provided, otherwise show all AI-related activities
    if (actionType && actionType !== 'all') {
      conditions.push(sql`${activityLogs.actionType} = ${actionType}`);
    } else {
      // Only show AI Assistant-specific activities (exclude general agent automation)
      conditions.push(sql`${activityLogs.actionType} IN ('openai_test', 'openai_key_saved', 'ai_chat')`);
    }

    const logs = await db.select()
      .from(activityLogs)
      .where(and(...conditions))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(activityLogs)
      .where(and(...conditions));

    res.json({ logs, total: Number(count) });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// Get function usage logs
router.get('/functions/usage-logs', async (req: any, res) => {
  try {
    const logs = await db.query.aiFunctionUsageLogs.findMany({
      where: eq(aiFunctionUsageLogs.organizationId, req.user.organizationId),
      orderBy: [desc(aiFunctionUsageLogs.createdAt)],
      limit: 100,
    });

    res.json(logs);
  } catch (error: any) {
    console.error('Error fetching function usage logs:', error);
    res.status(500).json({ error: 'Failed to fetch usage logs' });
  }
});

// ============================================================================
// NEW AI FUNCTION HANDLERS
// ============================================================================

async function createObjective(payload: any, user: any): Promise<any> {
  // ✅ Validate input
  const validated = CreateObjectiveSchema.parse(payload);
  
  const objectiveData = {
    title: validated.title,
    description: validated.description || '',
    organizationId: user.organizationId,
    ownerId: validated.ownerId || user.id,
    createdBy: user.id,
    status: validated.status || 'Active',
    category: payload.category || 'Business',
    targetDate: validated.targetDate ? new Date(validated.targetDate) : null,
    targetValue: payload.targetValue || null,
    kpiType: payload.kpiType || 'Derived from Key Results',
    primaryKpi: payload.primaryKpi || null,
    currentValue: payload.currentValue || null,
    priority: payload.priority || 'Medium',
  };

  const objective = await storage.createObjective(objectiveData);

  return {
    success: true,
    objective,
    message: formatObjectiveCreated(objective),
  };
}

async function updateObjective(payload: any, user: any): Promise<any> {
  // ✅ Validate input
  const validated = UpdateObjectiveSchema.parse(payload);
  
  const { id, ...updates } = validated;
  const updateData: any = {};
  
  if (updates.title) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.targetDate) updateData.targetDate = new Date(updates.targetDate);
  if (updates.status) updateData.status = updates.status;
  if (updates.progress !== undefined) updateData.progress = updates.progress;

  const objective = await storage.updateObjective(id, updateData);

  return {
    success: true,
    objective,
    message: formatObjectiveUpdated(objective),
  };
}

async function listKeyResults(payload: any, user: any): Promise<any> {
  // ✅ Validate input
  const validated = ListKeyResultsSchema.parse(payload);
  
  const keyResults = await storage.getKeyResultsByObjective(validated.objectiveId);

  return {
    keyResults,
    totalCount: keyResults.length,
    message: formatKeyResults(keyResults, validated.objectiveId),
  };
}

async function createKeyResult(payload: any, user: any): Promise<any> {
  // ✅ Validate input
  const validated = CreateKeyResultSchema.parse(payload);
  
  const krData = {
    title: validated.title,
    description: validated.description || '',
    objectiveId: validated.objectiveId,
    organizationId: user.organizationId,
    ownerId: payload.ownerId || user.id,
    createdBy: user.id,
    type: payload.type || 'Numeric Target',
    status: payload.status || 'Not Started',
    currentValue: validated.currentValue !== undefined ? String(validated.currentValue) : '0',
    targetValue: String(validated.targetValue),
    teamId: payload.teamId || null,
    assignedTo: payload.assignedTo || null,
    knowledgeDocumentId: payload.knowledgeDocumentId || null,
    kpiType: validated.kpiType,
    unit: validated.unit || '',
    deadline: validated.deadline ? new Date(validated.deadline) : null,
  };

  const keyResult = await storage.createKeyResult(krData);

  return {
    success: true,
    keyResult,
    message: formatKeyResultCreated(keyResult),
  };
}

async function updateKeyResult(payload: any, user: any): Promise<any> {
  // ✅ Validate input
  const validated = UpdateKeyResultSchema.parse(payload);
  
  const { id, ...updates } = validated;
  const updateData: any = {};
  
  if (updates.title) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.currentValue !== undefined) updateData.currentValue = updates.currentValue;
  if (updates.targetValue !== undefined) updateData.targetValue = updates.targetValue;
  if (updates.status) updateData.status = updates.status;

  const keyResult = await storage.updateKeyResult(id, updateData);

  return {
    success: true,
    keyResult,
    message: formatKeyResultUpdated(keyResult),
  };
}

async function listKeyResultTasks(payload: any, user: any): Promise<any> {
  // ✅ Validate input
  const validated = ListKeyResultTasksSchema.parse(payload);
  
  const tasks = await storage.getKeyResultTasks(validated.keyResultId);

  return {
    tasks,
    totalCount: tasks.length,
    message: formatTasks(tasks, validated.keyResultId),
  };
}

async function createTask(payload: any, user: any): Promise<any> {
  // ✅ Validate input
  const validated = CreateTaskSchema.parse(payload);
  
  const taskData = {
    title: validated.title,
    description: validated.description || '',
    keyResultId: validated.keyResultId,
    organizationId: user.organizationId,
    assignedTo: validated.assignedTo || user.id,
    createdBy: user.id,
    status: payload.status || 'Not Started',
    targetCompletion: validated.dueDate ? new Date(validated.dueDate) : null,
    teamId: payload.teamId || null,
    isRecurring: payload.isRecurring || false,
    frequency: payload.frequency || null,
    priority: validated.priority || 'medium',
  };

  const task = await storage.createKeyResultTask(taskData);

  return {
    success: true,
    task,
    message: formatTaskCreated(task),
  };
}

async function updateTask(payload: any, user: any): Promise<any> {
  // ✅ Validate input
  const validated = UpdateTaskSchema.parse(payload);
  
  const { id, ...updates } = validated;
  const updateData: any = {};
  
  if (updates.title) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.status) updateData.status = updates.status;
  if (updates.dueDate) updateData.targetCompletion = new Date(updates.dueDate);
  if (updates.priority) updateData.priority = updates.priority;

  const task = await storage.updateKeyResultTask(id, updateData);

  return {
    success: true,
    task,
    message: formatTaskUpdated(task),
  };
}

async function completeTask(payload: any, user: any): Promise<any> {
  // ✅ Validate input
  const validated = CompleteTaskSchema.parse(payload);
  
  const task = await storage.updateKeyResultTask(validated.taskId, { 
    status: 'Completed', 
    lastCompletedDate: new Date() 
  });

  if (!task) {
    throw new Error(`Task ${validated.taskId} not found`);
  }

  return {
    success: true,
    task,
    message: `✅ Task completed: "${task.title}"`,
  };
}

async function listWorkItems(payload: any, user: any): Promise<any> {
  // ✅ Validate input
  const validated = ListWorkItemsSchema.parse(payload);
  
  const limit = Math.min(validated.limit || 20, 50);
  
  // Build filter conditions
  const filters: any = {
    organizationId: user.organizationId,
  };
  
  if (validated.status) {
    filters.status = validated.status;
  }
  
  if (validated.assignedTo) {
    filters.assignedTo = validated.assignedTo;
  }
  
  // Query work items from database
  const conditions = [eq(workItems.organizationId, user.organizationId)];
  
  if (validated.status) {
    conditions.push(eq(workItems.status, validated.status as any));
  }
  
  if (validated.assignedTo) {
    conditions.push(eq(workItems.assignedTo, validated.assignedTo));
  }
  
  if (validated.dueFrom) {
    conditions.push(gte(workItems.dueDate, validated.dueFrom));
  }
  
  if (validated.dueTo) {
    conditions.push(lte(workItems.dueDate, validated.dueTo));
  }
  
  const items = await db
    .select({
      workItem: workItems,
      assignee: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      },
    })
    .from(workItems)
    .leftJoin(users, eq(workItems.assignedTo, users.id))
    .where(and(...conditions))
    .limit(limit)
    .orderBy(desc(workItems.createdAt));
  
  const formattedItems = items.map(item => ({
    ...item.workItem,
    assignee: item.assignee?.id ? item.assignee : null,
  }));
  
  return {
    workItems: formattedItems,
    count: formattedItems.length,
    summary: `Found ${formattedItems.length} work item${formattedItems.length !== 1 ? 's' : ''}${validated.status ? ` with status "${validated.status}"` : ''}`,
  };
}

async function createWorkItem(payload: any, user: any): Promise<any> {
  // ✅ Validate input
  const validated = CreateWorkItemSchema.parse(payload);
  
  const workItemData: any = {
    title: validated.title,
    description: validated.description || '',
    organizationId: user.organizationId,
    createdBy: user.id,
    assignedTo: validated.assignedTo || user.id,
    status: validated.status || 'Planning',
    dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
    ownerId: user.id,
  };
  
  const workItem = await storage.createWorkItem(workItemData);
  
  return {
    success: true,
    workItem,
    message: `✅ Created work item: "${workItem.title}"`,
  };
}

async function updateWorkItem(payload: any, user: any): Promise<any> {
  // ✅ Validate input
  const validated = UpdateWorkItemSchema.parse(payload);
  
  const updateData: any = {};
  
  if (validated.title) updateData.title = validated.title;
  if (validated.description !== undefined) updateData.description = validated.description;
  if (validated.status) updateData.status = validated.status;
  if (validated.dueDate !== undefined) updateData.dueDate = validated.dueDate ? new Date(validated.dueDate) : null;
  if (validated.assignedTo !== undefined) updateData.assignedTo = validated.assignedTo;
  if (validated.notes !== undefined) updateData.notes = validated.notes;
  
  const workItem = await storage.updateWorkItem(validated.id, updateData);
  
  if (!workItem) {
    throw new Error(`Work item ${validated.id} not found`);
  }
  
  return {
    success: true,
    workItem,
    message: `✅ Updated work item: "${workItem.title}"`,
  };
}

// ============================================================================
// KNOWLEDGE BASE FUNCTIONS
// ============================================================================

async function listKnowledgeDocuments(payload: any, user: any): Promise<any> {
  // ✅ Validate input
  const validated = ListKnowledgeDocumentsSchema.parse(payload);
  
  const limit = Math.min(validated.limit || 20, 50);
  
  // Build filters
  const filters: any = {};
  if (validated.category) {
    filters.categories = [validated.category];
  }
  if (validated.status) {
    filters.status = validated.status;
  }
  if (validated.search) {
    filters.search = validated.search;
  }
  
  // Query documents from coreStorage
  const documents = await coreStorage.getKnowledgeDocuments(user.organizationId, filters);
  
  // Limit results
  const limitedDocs = documents.slice(0, limit);
  
  return {
    documents: limitedDocs.map(doc => ({
      id: doc.id,
      title: doc.title,
      summary: doc.summary,
      categories: doc.categories,
      status: doc.status,
      visibility: doc.visibility,
      authorId: doc.authorId,
      updatedAt: doc.updatedAt,
    })),
    count: limitedDocs.length,
    summary: `Found ${limitedDocs.length} document${limitedDocs.length !== 1 ? 's' : ''}${validated.category ? ` in category "${validated.category}"` : ''}${validated.status ? ` with status "${validated.status}"` : ''}`,
  };
}

async function createKnowledgeDocument(payload: any, user: any): Promise<any> {
  // ✅ Validate input
  const validated = CreateKnowledgeDocumentSchema.parse(payload);
  
  const documentData: any = {
    title: validated.title,
    content: validated.content || '',
    summary: validated.summary || '',
    categories: validated.categories || [],
    status: validated.status || 'draft',
    visibility: validated.visibility || 'internal',
    organizationId: user.organizationId,
    authorId: user.id,
  };
  
  const document = await coreStorage.createKnowledgeDocument(documentData);
  
  // Log activity
  await coreStorage.logDocumentActivity(
    document.id,
    user.id,
    'ai_created',
    {
      actionType: 'creation',
      createdViaAI: true,
      title: document.title,
    }
  );
  
  return {
    success: true,
    document,
    message: `✅ Created knowledge base document: "${document.title}"`,
  };
}

async function updateKnowledgeDocument(payload: any, user: any): Promise<any> {
  // ✅ Validate input
  const validated = UpdateKnowledgeDocumentSchema.parse(payload);
  
  // Get the current document for activity tracking
  const currentDoc = await coreStorage.getKnowledgeDocument(validated.id);
  if (!currentDoc) {
    throw new Error(`Document ${validated.id} not found`);
  }
  
  const updateData: any = {};
  const changes: any = {};
  
  if (validated.title) {
    updateData.title = validated.title;
    if (validated.title !== currentDoc.title) changes.title = { from: currentDoc.title, to: validated.title };
  }
  if (validated.content !== undefined) {
    updateData.content = validated.content;
    changes.content = { updated: true };
  }
  if (validated.summary !== undefined) {
    updateData.summary = validated.summary;
    if (validated.summary !== currentDoc.summary) changes.summary = { from: currentDoc.summary, to: validated.summary };
  }
  if (validated.categories) {
    updateData.categories = validated.categories;
    changes.categories = { from: currentDoc.categories, to: validated.categories };
  }
  if (validated.status) {
    updateData.status = validated.status;
    if (validated.status !== currentDoc.status) changes.status = { from: currentDoc.status, to: validated.status };
  }
  if (validated.visibility) {
    updateData.visibility = validated.visibility;
    if (validated.visibility !== currentDoc.visibility) changes.visibility = { from: currentDoc.visibility, to: validated.visibility };
  }
  
  const document = await coreStorage.updateKnowledgeDocument(validated.id, updateData, user.id);
  
  if (!document) {
    throw new Error(`Failed to update document ${validated.id}`);
  }
  
  // Log activity with change details
  await coreStorage.logDocumentActivity(
    validated.id,
    user.id,
    'ai_edited',
    {
      actionType: 'update',
      editedViaAI: true,
      changes,
    }
  );
  
  return {
    success: true,
    document,
    message: `✅ Updated knowledge base document: "${document.title}"`,
  };
}

// ============================================================================
// CHECK-IN MEETING FUNCTIONS
// ============================================================================

async function listUpcomingMeetings(payload: any, user: any): Promise<any> {
  // ✅ Validate input
  const validated = ListUpcomingMeetingsSchema.parse(payload);
  
  const limit = Math.min(validated.limit || 20, 50);
  
  // Build filter conditions
  const conditions = [eq(checkInMeetings.organizationId, user.organizationId)];
  
  // Default to future meetings if no date range specified
  if (!validated.fromDate) {
    conditions.push(gte(checkInMeetings.scheduledDate, new Date()));
  } else {
    conditions.push(gte(checkInMeetings.scheduledDate, new Date(validated.fromDate)));
  }
  
  if (validated.toDate) {
    conditions.push(lte(checkInMeetings.scheduledDate, new Date(validated.toDate)));
  }
  
  if (validated.teamId) {
    conditions.push(eq(checkInMeetings.teamId, validated.teamId));
  }
  
  if (validated.status) {
    conditions.push(eq(checkInMeetings.status, validated.status as any));
  }
  
  const meetings = await db
    .select()
    .from(checkInMeetings)
    .where(and(...conditions))
    .limit(limit)
    .orderBy(checkInMeetings.scheduledDate);
  
  return {
    meetings: meetings.map(m => ({
      id: m.id,
      title: m.title,
      description: m.description,
      scheduledDate: m.scheduledDate,
      status: m.status,
      teamId: m.teamId,
    })),
    count: meetings.length,
    summary: `Found ${meetings.length} upcoming meeting${meetings.length !== 1 ? 's' : ''}`,
  };
}

async function getMeetingAgenda(payload: any, user: any): Promise<any> {
  // ✅ Validate input
  const validated = GetMeetingAgendaSchema.parse(payload);
  
  // Get meeting
  const meeting = await db.query.checkInMeetings.findFirst({
    where: and(
      eq(checkInMeetings.id, validated.meetingId),
      eq(checkInMeetings.organizationId, user.organizationId)
    ),
  });
  
  if (!meeting) {
    throw new Error(`Meeting ${validated.meetingId} not found`);
  }
  
  // Get meeting topics
  const topics = await db.query.meetingTopics.findMany({
    where: eq(meetingTopics.meetingId, validated.meetingId),
  });
  
  // Get related work items for this meeting
  const relatedWorkItems = await db
    .select()
    .from(workItems)
    .where(
      and(
        eq(workItems.organizationId, user.organizationId),
        eq(workItems.targetMeetingId, validated.meetingId)
      )
    )
    .limit(10);
  
  return {
    meeting: {
      id: meeting.id,
      title: meeting.title,
      description: meeting.description,
      scheduledDate: meeting.scheduledDate,
      status: meeting.status,
    },
    topics: topics.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status,
    })),
    relatedWorkItems: relatedWorkItems.map(wi => ({
      id: wi.id,
      title: wi.title,
      status: wi.status,
      assignedTo: wi.assignedTo,
    })),
    summary: `Meeting: "${meeting.title}" on ${meeting.scheduledDate.toLocaleDateString()}\nTopics: ${topics.length}\nRelated work items: ${relatedWorkItems.length}`,
  };
}

async function extractActionPointsFromTranscript(payload: any, user: any): Promise<any> {
  // ✅ Validate input
  const validated = ExtractActionPointsSchema.parse(payload);
  
  // Use OpenAI to extract action points from transcript
  const openaiService = new OpenAIService(user.organizationId);
  
  const extractionPrompt = `You are an expert at analyzing meeting transcripts and extracting actionable items.

Analyze this meeting transcript and extract:
1. Action items (things people committed to do)
2. Who is responsible for each action
3. Any mentioned deadlines or due dates
4. Key decisions made

Meeting Transcript:
${validated.transcript}

Return a JSON object with this structure:
{
  "actionItems": [
    {
      "title": "Brief action item title",
      "description": "More detailed description if available",
      "owner": "Person's name or null if not mentioned",
      "dueDate": "YYYY-MM-DD format or null if not mentioned",
      "type": "action_item"
    }
  ],
  "decisions": [
    {
      "title": "Decision made",
      "description": "Context or details"
    }
  ]
}`;

  const messages: ChatMessage[] = [
    { role: 'user', content: extractionPrompt },
  ];
  
  const completion = await openaiService.createChatCompletion(messages, {
    model: 'gpt-4o-mini',
    temperature: 0.3,
  });
  
  const result = JSON.parse(completion.choices[0].message.content || '{"actionItems": [], "decisions": []}');
  
  return {
    success: true,
    actionItems: result.actionItems || [],
    decisions: result.decisions || [],
    message: `✅ Extracted ${result.actionItems?.length || 0} action items and ${result.decisions?.length || 0} decisions from the transcript`,
  };
}

async function createMeetingActionItems(payload: any, user: any): Promise<any> {
  // ✅ Validate input
  const validated = CreateMeetingActionItemsSchema.parse(payload);
  
  // Verify meeting exists
  const meeting = await db.query.checkInMeetings.findFirst({
    where: and(
      eq(checkInMeetings.id, validated.meetingId),
      eq(checkInMeetings.organizationId, user.organizationId)
    ),
  });
  
  if (!meeting) {
    throw new Error(`Meeting ${validated.meetingId} not found`);
  }
  
  // Create work items for each action item
  const createdItems = [];
  for (const actionItem of validated.actionItems) {
    const workItemData: any = {
      title: actionItem.title,
      description: actionItem.description || '',
      organizationId: user.organizationId,
      createdBy: user.id,
      assignedTo: actionItem.assignedTo || user.id,
      status: 'Planning',
      dueDate: actionItem.dueDate ? new Date(actionItem.dueDate) : null,
      targetMeetingId: validated.meetingId,
      ownerId: user.id,
    };
    
    const workItem = await storage.createWorkItem(workItemData);
    createdItems.push(workItem);
  }
  
  return {
    success: true,
    workItems: createdItems,
    count: createdItems.length,
    message: `✅ Created ${createdItems.length} action item${createdItems.length !== 1 ? 's' : ''} from meeting "${meeting.title}"`,
  };
}

// ============================================================================
// VISION & MISSION FUNCTIONS
// ============================================================================

async function getVisionMission(payload: any, user: any): Promise<any> {
  // ✅ Validate input
  const validated = GetVisionMissionSchema.parse(payload);
  
  // Get organization's vision and mission
  const visionMission = await db.query.missionVision.findFirst({
    where: eq(missionVision.organizationId, user.organizationId),
  });
  
  if (!visionMission) {
    return {
      mission: null,
      vision: null,
      strategyStatementHtml: null,
      summary: 'No vision or mission statement has been set yet for this organization.',
    };
  }
  
  return {
    mission: visionMission.mission,
    vision: visionMission.vision,
    strategyStatementHtml: visionMission.strategyStatementHtml,
    summary: `Vision and Mission retrieved:\n${visionMission.mission ? `Mission: ${visionMission.mission.substring(0, 200)}${visionMission.mission.length > 200 ? '...' : ''}\n` : ''}${visionMission.vision ? `Vision: ${visionMission.vision.substring(0, 200)}${visionMission.vision.length > 200 ? '...' : ''}` : ''}`,
  };
}

async function updateVisionMission(payload: any, user: any): Promise<any> {
  // ✅ Validate input
  const validated = UpdateVisionMissionSchema.parse(payload);
  
  const updateData: any = {
    updatedBy: user.id,
  };
  
  if (validated.mission !== undefined) updateData.mission = validated.mission;
  if (validated.vision !== undefined) updateData.vision = validated.vision;
  if (validated.strategyStatementHtml !== undefined) updateData.strategyStatementHtml = validated.strategyStatementHtml;
  
  // Check if record exists
  const existing = await db.query.missionVision.findFirst({
    where: eq(missionVision.organizationId, user.organizationId),
  });
  
  let result;
  if (existing) {
    // Update existing record
    [result] = await db
      .update(missionVision)
      .set(updateData)
      .where(eq(missionVision.organizationId, user.organizationId))
      .returning();
  } else {
    // Create new record
    [result] = await db
      .insert(missionVision)
      .values({
        organizationId: user.organizationId,
        ...updateData,
      })
      .returning();
  }
  
  return {
    success: true,
    visionMission: result,
    message: `✅ Updated organization's vision and mission statement`,
  };
}

// ============================================================================
// DATABASE ACCESS FUNCTIONS
// ============================================================================

async function listAddresses(payload: any, user: any): Promise<any> {
  const limit = Math.min(Math.max(payload.limit || 20, 1), 100);
  const search = payload.search || '';
  const connectionId = payload.connectionId;
  const localStatus = payload.localStatus;
  
  // Query addresses from database
  const addresses = await storage.getAddressRecords(
    user.organizationId,
    connectionId
  );
  
  // Apply search filter if provided
  let filteredAddresses = addresses;
  if (search) {
    const searchLower = search.toLowerCase();
    filteredAddresses = addresses.filter((addr: any) => {
      const street = addr.airtableFields?.Street?.toLowerCase() || '';
      const area = addr.airtableFields?.Area?.toLowerCase() || '';
      const summary = addr.airtableFields?.summary?.toLowerCase() || '';
      return street.includes(searchLower) || area.includes(searchLower) || summary.includes(searchLower);
    });
  }
  
  // Apply status filter if provided
  if (localStatus) {
    filteredAddresses = filteredAddresses.filter((addr: any) => 
      addr.localStatus?.toLowerCase() === localStatus.toLowerCase()
    );
  }
  
  // Apply limit
  const limitedAddresses = filteredAddresses.slice(0, limit);
  
  // Format for response
  const formattedAddresses = limitedAddresses.map((addr: any) => ({
    id: addr.id,
    street: addr.airtableFields?.Street || 'N/A',
    area: addr.airtableFields?.Area || 'N/A',
    zone: addr.airtableFields?.Zone || 'N/A',
    tariff: addr.airtableFields?.Tariff || 'N/A',
    localStatus: addr.localStatus || 'N/A',
    localNotes: addr.localNotes || '',
    airtableRecordId: addr.airtableRecordId,
    lastSyncedAt: addr.lastSyncedAt,
  }));
  
  return {
    addresses: formattedAddresses,
    totalCount: limitedAddresses.length,
    totalAvailable: filteredAddresses.length,
    filters: {
      search: search || null,
      connectionId: connectionId || null,
      localStatus: localStatus || null,
    },
    summary: `Found ${limitedAddresses.length} address${limitedAddresses.length !== 1 ? 'es' : ''}${search ? ` matching "${search}"` : ''}`,
  };
}

async function getRecentActivity(payload: any, user: any): Promise<any> {
  const days = Math.min(Math.max(payload.days || 7, 1), 90);
  const entityType = payload.entityType || 'all';
  const actionType = payload.actionType || 'all';
  const userId = payload.userId;
  const limit = Math.min(Math.max(payload.limit || 50, 1), 200);
  
  // Calculate date range
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Build query conditions
  const conditions = [
    eq(activityLogs.organizationId, user.organizationId),
    gte(activityLogs.createdAt, startDate),
  ];
  
  if (entityType && entityType !== 'all') {
    conditions.push(eq(activityLogs.entityType, entityType));
  }
  
  if (actionType && actionType !== 'all') {
    conditions.push(eq(activityLogs.actionType, actionType as any));
  }
  
  if (userId) {
    conditions.push(eq(activityLogs.userId, userId));
  }
  
  // Query activity logs
  const activities = await db
    .select({
      id: activityLogs.id,
      actionType: activityLogs.actionType,
      entityType: activityLogs.entityType,
      entityId: activityLogs.entityId,
      description: activityLogs.description,
      metadata: activityLogs.metadata,
      createdAt: activityLogs.createdAt,
      userId: activityLogs.userId,
      userName: users.fullName,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);
  
  // Group activities by action type for summary
  const groupedByAction = activities.reduce((acc: any, activity: any) => {
    const action = activity.actionType || 'unknown';
    if (!acc[action]) {
      acc[action] = [];
    }
    acc[action].push(activity);
    return acc;
  }, {});
  
  // Format for response
  const formattedActivities = activities.map((activity: any) => ({
    id: activity.id,
    actionType: activity.actionType,
    entityType: activity.entityType,
    entityId: activity.entityId,
    description: activity.description,
    userName: activity.userName || 'System',
    createdAt: activity.createdAt,
    daysAgo: Math.floor((Date.now() - new Date(activity.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
  }));
  
  // Generate summary statistics
  const summary = {
    totalActivities: activities.length,
    byActionType: Object.entries(groupedByAction).map(([action, items]: [string, any]) => ({
      action,
      count: items.length,
    })),
    dateRange: {
      from: startDate.toISOString(),
      to: new Date().toISOString(),
      days,
    },
  };
  
  return {
    activities: formattedActivities,
    summary,
    totalCount: activities.length,
    filters: {
      days,
      entityType: entityType !== 'all' ? entityType : null,
      actionType: actionType !== 'all' ? actionType : null,
      userId: userId || null,
    },
    message: `Found ${activities.length} activit${activities.length !== 1 ? 'ies' : 'y'} in the last ${days} days`,
  };
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

function formatObjectiveCreated(objective: any): string {
  return `✅ Created objective: "${objective.title}"
• Status: ${objective.status}
• Category: ${objective.category}
${objective.targetDate ? `• Due: ${new Date(objective.targetDate).toLocaleDateString()}` : ''}
• ID: ${objective.id}`;
}

function formatObjectiveUpdated(objective: any): string {
  return `✅ Updated objective: "${objective.title}"
• Status: ${objective.status}
• Progress: ${objective.progress || 0}%`;
}

function formatKeyResults(keyResults: any[], objectiveId: number): string {
  if (keyResults.length === 0) {
    return `No key results found for objective ${objectiveId}`;
  }

  const formatted = keyResults.map((kr: any) => {
    const progress = kr.progress || 0;
    const statusEmoji = progress >= 70 ? '✅' : progress >= 30 ? '📊' : '⚠️';
    return `${statusEmoji} ${kr.title}
   • ${kr.currentValue || 0}/${kr.targetValue || 100} ${kr.unit || ''}
   • ${progress}% complete
   • Status: ${kr.status}`;
  }).join('\n\n');

  return `Found ${keyResults.length} key result${keyResults.length > 1 ? 's' : ''}:\n\n${formatted}`;
}

function formatKeyResultCreated(keyResult: any): string {
  return `✅ Created key result: "${keyResult.title}"
• Type: ${keyResult.type}
• Target: ${keyResult.targetValue} ${keyResult.unit || ''}
• Status: ${keyResult.status}
• ID: ${keyResult.id}`;
}

function formatKeyResultUpdated(keyResult: any): string {
  const progress = keyResult.progress || 0;
  const statusEmoji = progress >= 70 ? '✅' : progress >= 30 ? '📊' : '⚠️';
  
  return `${statusEmoji} Updated key result: "${keyResult.title}"
• Progress: ${keyResult.currentValue || 0}/${keyResult.targetValue || 100} ${keyResult.unit || ''} (${progress}%)
• Status: ${keyResult.status}`;
}

function formatTasks(tasks: any[], keyResultId: number): string {
  if (tasks.length === 0) {
    return `No tasks found for key result ${keyResultId}`;
  }

  const formatted = tasks.map((task: any) => {
    const statusEmoji = task.status === 'Completed' ? '✅' : task.status === 'In Progress' ? '🔄' : '⏸️';
    const priorityEmoji = task.priority === 'High' ? '🔴' : task.priority === 'Medium' ? '🟡' : '🟢';
    
    return `${statusEmoji} ${priorityEmoji} ${task.title}
   • Status: ${task.status}
   • Priority: ${task.priority}
   ${task.dueDate ? `• Due: ${new Date(task.dueDate).toLocaleDateString()}` : ''}
   ${task.assigneeName ? `• Assigned to: ${task.assigneeName}` : ''}`;
  }).join('\n\n');

  return `Found ${tasks.length} task${tasks.length > 1 ? 's' : ''}:\n\n${formatted}`;
}

function formatTaskCreated(task: any): string {
  return `✅ Created task: "${task.title}"
• Status: ${task.status}
• Priority: ${task.priority}
${task.dueDate ? `• Due: ${new Date(task.dueDate).toLocaleDateString()}` : ''}
• ID: ${task.id}`;
}

function formatTaskUpdated(task: any): string {
  const statusEmoji = task.status === 'Completed' ? '✅' : task.status === 'In Progress' ? '🔄' : '⏸️';
  
  return `${statusEmoji} Updated task: "${task.title}"
• Status: ${task.status}
• Priority: ${task.priority}`;
}

// Get grouped chat activity logs
router.get('/activity-logs/grouped', async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get chat sessions with activity
    const sessions = await db.select({
      sessionId: aiChatSessions.id,
      sessionTitle: aiChatSessions.title,
      startedAt: aiChatSessions.createdAt,
      lastMessageAt: aiChatSessions.lastMessageAt,
      totalMessages: aiChatSessions.totalMessages,
      totalTokensUsed: aiChatSessions.totalTokensUsed,
      estimatedCost: aiChatSessions.estimatedCost,
      userId: aiChatSessions.userId,
      userName: users.fullName,
    })
    .from(aiChatSessions)
    .leftJoin(users, eq(aiChatSessions.userId, users.id))
    .where(eq(aiChatSessions.organizationId, user.organizationId))
    .orderBy(desc(aiChatSessions.lastMessageAt))
    .limit(limit)
    .offset(offset);

    // For each session, get the conversation turns
    const sessionActivities = await Promise.all(sessions.map(async (session) => {
      // Get all messages for this session
      const messages = await db.select()
        .from(aiChatMessages)
        .where(eq(aiChatMessages.sessionId, session.sessionId))
        .orderBy(aiChatMessages.createdAt);

      // Group messages into turns (user message + assistant response)
      const turns: any[] = [];
      let turnIndex = 0;

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        
        if (msg.role === 'user') {
          // Look for the next assistant message
          const nextMsg = messages[i + 1];
          if (nextMsg && nextMsg.role === 'assistant') {
            turns.push({
              turnIndex: turnIndex++,
              timestamp: msg.createdAt,
              userMessage: msg.content,
              userMessageId: msg.id,
              assistantMessage: nextMsg.content,
              assistantMessageId: nextMsg.id,
              functionsCalled: nextMsg.functionCall ? [{
                name: (nextMsg.functionCall as any).name,
                parameters: (nextMsg.functionCall as any).arguments,
                result: nextMsg.functionResponse,
              }] : undefined,
              tokensUsed: nextMsg.tokensUsed || 0,
              executionTime: nextMsg.executionTime,
              modelUsed: nextMsg.modelUsed,
            });
            i++; // Skip the assistant message we just processed
          } else {
            // User message without response yet
            turns.push({
              turnIndex: turnIndex++,
              timestamp: msg.createdAt,
              userMessage: msg.content,
              userMessageId: msg.id,
              assistantMessage: 'Awaiting response...',
              assistantMessageId: null,
            });
          }
        } else if (msg.role === 'assistant' && (i === 0 || messages[i - 1]?.role !== 'user')) {
          // Standalone assistant message (shouldn't happen often)
          turns.push({
            turnIndex: turnIndex++,
            timestamp: msg.createdAt,
            userMessage: '[System]',
            userMessageId: null,
            assistantMessage: msg.content,
            assistantMessageId: msg.id,
            functionsCalled: msg.functionCall ? [{
              name: (msg.functionCall as any).name,
              parameters: (msg.functionCall as any).arguments,
              result: msg.functionResponse,
            }] : undefined,
            tokensUsed: msg.tokensUsed || 0,
            executionTime: msg.executionTime,
            modelUsed: msg.modelUsed,
          });
        }
      }

      return {
        sessionId: session.sessionId,
        sessionTitle: session.sessionTitle || `Chat Session ${session.sessionId}`,
        startedAt: session.startedAt,
        lastMessageAt: session.lastMessageAt,
        messageCount: session.totalMessages || 0,
        totalTokensUsed: session.totalTokensUsed || 0,
        estimatedCost: parseFloat(session.estimatedCost || '0'),
        userId: session.userId,
        userName: session.userName,
        turns,
      };
    }));

    res.json({
      sessions: sessionActivities,
      total: sessions.length,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Error fetching grouped chat activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch grouped activity logs' });
  }
});

// ============================================================================
// WORKFLOW BUILDER FUNCTIONS
// ============================================================================

async function listIntegrationCapabilities(payload: any, user: any): Promise<any> {
  const orgIntegrations = await db.query.integrations.findMany({
    where: eq(integrations.organizationId, user.organizationId),
  });

  const triggers = await db.query.integrationTriggers.findMany({
    where: eq(integrationTriggers.isActive, true),
  });

  const integrationCapabilities = {
    availableIntegrations: orgIntegrations.map(i => ({
      id: i.id,
      name: i.name,
      type: i.platformType,
      isEnabled: i.isEnabled,
      connectionStatus: i.connectionStatus,
    })),
    triggersByIntegration: triggers.reduce((acc: any, t) => {
      if (!acc[t.integrationId]) acc[t.integrationId] = [];
      acc[t.integrationId].push({
        id: t.id,
        key: t.triggerKey,
        name: t.name,
        description: t.description,
        category: t.category,
      });
      return acc;
    }, {}),
    agentWorkflowStepTypes: [
      { type: 'integration_action', description: 'Call an external API or service', example: '{"integrationType": "splynx", "action": "getCustomers"}' },
      { type: 'create_work_item', description: 'Create a work item with optional template', example: '{"title": "...", "templateId": "...", "status": "Planning"}' },
      { type: 'ai_draft_response', description: 'Use AI to generate a draft response', example: '{}' },
      { type: 'database_query', description: 'Query internal database', example: '{"table": "customers", "filters": {...}}' },
      { type: 'splynx_query', description: 'Query Splynx data', example: '{"entity": "customers", "filters": {...}}' },
      { type: 'condition', description: 'Branch based on conditions', example: '{"condition": "{{data.status}} === \"active\"", "thenSteps": [...], "elseSteps": [...]}' },
      { type: 'for_each', description: 'Loop over array data', example: '{"sourceArray": "{{data.items}}", "steps": [...]}' },
      { type: 'wait', description: 'Pause execution', example: '{"duration": 60, "unit": "seconds"}' },
      { type: 'notification', description: 'Send a notification', example: '{"type": "email", "to": "...", "subject": "...", "body": "..."}' },
      { type: 'log_event', description: 'Log an event for debugging', example: '{"message": "Processing complete", "level": "info"}' },
    ],
    integrationActions: {
      splynx: ['getCustomers', 'getTicket', 'addTicketMessage', 'updateTicketStatus', 'createTask', 'send_email_campaign'],
      pxc: ['getOrders', 'updateOrder'],
      xero: ['getInvoices', 'createInvoice'],
      openai: ['generateText', 'analyzeImage'],
    },
  };

  return {
    success: true,
    capabilities: integrationCapabilities,
    message: `Found ${orgIntegrations.length} configured integrations with ${triggers.length} available triggers.`,
  };
}

async function listWorkflowStepTypes(payload: any, user: any): Promise<any> {
  const workflowType = payload.workflow_type || 'both';

  const agentWorkflowSteps = [
    { type: 'integration_action', description: 'Execute an action on an external integration (Splynx, PXC, Xero, etc.)', requiresConfig: true },
    { type: 'create_work_item', description: 'Create a work item with optional workflow template', requiresConfig: true },
    { type: 'ai_draft_response', description: 'Generate an AI-powered draft response using configured AI agent', requiresConfig: false },
    { type: 'database_query', description: 'Query the internal database', requiresConfig: true },
    { type: 'splynx_query', description: 'Query data from Splynx integration', requiresConfig: true },
    { type: 'data_source_query', description: 'Query a configured data source', requiresConfig: true },
    { type: 'condition', description: 'Conditional branching based on data values', requiresConfig: true },
    { type: 'for_each', description: 'Iterate over an array of items', requiresConfig: true },
    { type: 'wait', description: 'Wait for a specified duration before continuing', requiresConfig: true },
    { type: 'notification', description: 'Send email or system notification', requiresConfig: true },
    { type: 'log_event', description: 'Log an event for debugging and audit', requiresConfig: true },
  ];

  const templateSteps = [
    { type: 'form', description: 'Data entry form with configurable fields', supportsOCR: false },
    { type: 'photo', description: 'Photo capture with optional OCR data extraction', supportsOCR: true },
    { type: 'file_upload', description: 'File upload step', supportsOCR: false },
    { type: 'checklist', description: 'Checkbox list for task completion', supportsOCR: false },
    { type: 'signature', description: 'Signature capture', supportsOCR: false },
    { type: 'notes', description: 'Free-form text notes', supportsOCR: false },
    { type: 'text_input', description: 'Single text input field', supportsOCR: false },
    { type: 'checkbox', description: 'Single checkbox', supportsOCR: false },
    { type: 'approval', description: 'Approval gate requiring sign-off', supportsOCR: false },
    { type: 'geolocation', description: 'GPS location capture', supportsOCR: false },
    { type: 'splynx_ticket', description: 'Splynx support ticket handling (view, respond, update)', supportsOCR: false },
    { type: 'audio_recording', description: 'Audio recording capture', supportsOCR: false },
    { type: 'splice_documentation', description: 'Fiber splice documentation interface', supportsOCR: false },
    { type: 'fiber_network_node', description: 'Fiber network node creation/selection', supportsOCR: false },
    { type: 'kb_link', description: 'Link to knowledge base document', supportsOCR: false },
    { type: 'comment', description: 'Comment/discussion thread', supportsOCR: false },
    { type: 'measurement', description: 'Numeric measurement input', supportsOCR: false },
  ];

  const result: any = { success: true };

  if (workflowType === 'agent_workflow' || workflowType === 'both') {
    result.agentWorkflowStepTypes = agentWorkflowSteps;
  }
  if (workflowType === 'workflow_template' || workflowType === 'both') {
    result.templateStepTypes = templateSteps;
  }

  result.message = `Listed step types for ${workflowType} workflows.`;
  return result;
}

async function listExistingWorkflows(payload: any, user: any): Promise<any> {
  const type = payload.type || 'both';
  const result: any = { success: true };

  if (type === 'agent_workflows' || type === 'both') {
    const workflows = await db.query.agentWorkflows.findMany({
      where: eq(agentWorkflows.organizationId, user.organizationId),
    });
    result.agentWorkflows = workflows.map(w => ({
      id: w.id,
      name: w.name,
      description: w.description,
      triggerType: w.triggerType,
      isEnabled: w.isEnabled,
      stepCount: Array.isArray(w.workflowDefinition) ? (w.workflowDefinition as any[]).length : 0,
    }));
  }

  if (type === 'workflow_templates' || type === 'both') {
    const templates = await db.query.workflowTemplates.findMany({
      where: eq(workflowTemplates.organizationId, user.organizationId),
    });
    result.workflowTemplates = templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      isActive: t.isActive,
      stepCount: Array.isArray(t.steps) ? (t.steps as any[]).length : 0,
      hasCallbacks: Array.isArray(t.completionCallbacks) && (t.completionCallbacks as any[]).length > 0,
    }));
  }

  result.message = `Found ${result.agentWorkflows?.length || 0} agent workflows and ${result.workflowTemplates?.length || 0} workflow templates.`;
  return result;
}

async function previewAgentWorkflow(payload: any, user: any): Promise<any> {
  const { name, description, trigger_type, trigger_config, steps } = payload;

  if (!name || !trigger_type || !steps || !Array.isArray(steps)) {
    return {
      success: false,
      error: 'Missing required fields: name, trigger_type, and steps array are required.',
    };
  }

  const validTriggerTypes = ['manual', 'webhook', 'schedule'];
  if (!validTriggerTypes.includes(trigger_type)) {
    return {
      success: false,
      error: `Invalid trigger_type. Must be one of: ${validTriggerTypes.join(', ')}`,
    };
  }

  const validStepTypes = ['integration_action', 'create_work_item', 'ai_draft_response', 'database_query', 
    'condition', 'for_each', 'wait', 'notification', 'log_event', 'splynx_query', 'data_source_query'];

  const invalidSteps = steps.filter(s => !validStepTypes.includes(s.type));
  if (invalidSteps.length > 0) {
    return {
      success: false,
      error: `Invalid step types: ${invalidSteps.map(s => s.type).join(', ')}. Valid types are: ${validStepTypes.join(', ')}`,
    };
  }

  const workflowPreview = {
    name,
    description: description || '',
    triggerType: trigger_type,
    triggerConfig: trigger_config || {},
    workflowDefinition: steps,
    organizationId: user.organizationId,
    isEnabled: false,
    createdBy: user.id,
  };

  return {
    success: true,
    preview: workflowPreview,
    validation: {
      isValid: true,
      stepCount: steps.length,
      triggerType: trigger_type,
    },
    message: `Preview generated for "${name}" workflow with ${steps.length} steps. Use create_agent_workflow to save it.`,
  };
}

const CreateAgentWorkflowSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(255),
  description: z.string().optional(),
  trigger_type: z.enum(['manual', 'webhook', 'schedule']),
  trigger_config: z.record(z.any()).optional(),
  workflow_definition: z.array(z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.enum(['integration_action', 'create_work_item', 'ai_draft_response', 'database_query', 
      'condition', 'for_each', 'wait', 'notification', 'log_event', 'splynx_query', 'data_source_query']),
    config: z.record(z.any()).optional(),
  })),
  is_enabled: z.boolean().optional(),
});

async function createAgentWorkflow(payload: any, user: any): Promise<any> {
  const validated = CreateAgentWorkflowSchema.parse(payload);
  const { name, description, trigger_type, trigger_config, workflow_definition, is_enabled } = validated;

  for (const step of workflow_definition) {
    if (step.type === 'create_work_item' && step.config?.templateId) {
      const template = await db.query.workflowTemplates.findFirst({
        where: and(
          eq(workflowTemplates.id, step.config.templateId),
          eq(workflowTemplates.organizationId, user.organizationId)
        ),
      });
      if (!template) {
        throw new Error(`Template "${step.config.templateId}" not found in your organization.`);
      }
    }
  }

  if (trigger_type === 'webhook' && trigger_config?.triggerId) {
    const trigger = await db.query.integrationTriggers.findFirst({
      where: eq(integrationTriggers.id, trigger_config.triggerId),
    });
    if (!trigger) {
      throw new Error(`Integration trigger with ID ${trigger_config.triggerId} not found.`);
    }
    const integration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.id, trigger.integrationId),
        eq(integrations.organizationId, user.organizationId)
      ),
    });
    if (!integration) {
      throw new Error(`Integration trigger ${trigger_config.triggerId} does not belong to your organization.`);
    }
  }

  const [workflow] = await db.insert(agentWorkflows).values({
    organizationId: user.organizationId,
    name,
    description: description || '',
    triggerType: trigger_type,
    triggerConfig: trigger_config || {},
    workflowDefinition: workflow_definition,
    isEnabled: is_enabled || false,
    createdBy: user.id,
    assignedUserId: user.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  return {
    success: true,
    workflow: {
      id: workflow.id,
      name: workflow.name,
      triggerType: workflow.triggerType,
      isEnabled: workflow.isEnabled,
    },
    message: `Successfully created agent workflow "${name}" (ID: ${workflow.id}). ${is_enabled ? 'The workflow is now active.' : 'Enable it in Agent Builder to start using it.'}`,
  };
}

async function previewWorkflowTemplate(payload: any, user: any): Promise<any> {
  const { id, name, description, steps, completion_callbacks } = payload;

  if (!id || !name || !steps || !Array.isArray(steps)) {
    return {
      success: false,
      error: 'Missing required fields: id, name, and steps array are required.',
    };
  }

  const validStepTypes = ['form', 'photo', 'file_upload', 'checklist', 'signature', 'notes', 'text_input',
    'checkbox', 'approval', 'geolocation', 'splynx_ticket', 'audio_recording', 'splice_documentation',
    'fiber_network_node', 'kb_link', 'comment', 'measurement'];

  const invalidSteps = steps.filter(s => !validStepTypes.includes(s.type));
  if (invalidSteps.length > 0) {
    return {
      success: false,
      error: `Invalid step types: ${invalidSteps.map(s => s.type).join(', ')}. Valid types are: ${validStepTypes.join(', ')}`,
    };
  }

  const existingTemplate = await db.query.workflowTemplates.findFirst({
    where: and(
      eq(workflowTemplates.id, id),
      eq(workflowTemplates.organizationId, user.organizationId)
    ),
  });

  if (existingTemplate) {
    return {
      success: false,
      error: `A template with ID "${id}" already exists. Choose a different ID.`,
    };
  }

  const templatePreview = {
    id,
    name,
    description: description || '',
    steps,
    completionCallbacks: completion_callbacks || [],
    organizationId: user.organizationId,
    isActive: true,
  };

  return {
    success: true,
    preview: templatePreview,
    validation: {
      isValid: true,
      stepCount: steps.length,
      hasCallbacks: (completion_callbacks?.length || 0) > 0,
    },
    message: `Preview generated for "${name}" template with ${steps.length} steps. Use create_workflow_template to save it.`,
  };
}

const validTemplateStepTypes = ['form', 'photo', 'file_upload', 'checklist', 'signature', 'notes', 'text_input',
  'checkbox', 'approval', 'geolocation', 'splynx_ticket', 'audio_recording', 'splice_documentation',
  'fiber_network_node', 'kb_link', 'comment', 'measurement'] as const;

const CreateWorkflowTemplateSchema = z.object({
  id: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/, 'ID must be lowercase with dashes only'),
  name: z.string().min(3, 'Name must be at least 3 characters').max(256),
  description: z.string().optional(),
  category: z.string().max(100).optional(),
  steps: z.array(z.object({
    id: z.string(),
    type: z.enum(validTemplateStepTypes),
    label: z.string().optional(),
    title: z.string().optional(),
    order: z.number(),
    required: z.boolean().optional(),
    description: z.string().optional(),
    config: z.record(z.any()).optional(),
  })),
  completion_callbacks: z.array(z.object({
    integrationName: z.string(),
    action: z.string(),
    fieldMappings: z.array(z.object({
      source: z.string(),
      target: z.string(),
    }).passthrough()).optional(),
  })).optional(),
  display_in_menu: z.boolean().optional(),
  menu_label: z.string().max(100).optional(),
  menu_icon: z.string().max(50).optional(),
  is_active: z.boolean().optional(),
});

async function createWorkflowTemplate(payload: any, user: any): Promise<any> {
  const validated = CreateWorkflowTemplateSchema.parse(payload);
  const { id, name, description, category, steps, completion_callbacks, display_in_menu, menu_label, menu_icon, is_active } = validated;

  const existingTemplate = await db.query.workflowTemplates.findFirst({
    where: and(
      eq(workflowTemplates.id, id),
      eq(workflowTemplates.organizationId, user.organizationId)
    ),
  });

  if (existingTemplate) {
    throw new Error(`A template with ID "${id}" already exists.`);
  }

  const [template] = await db.insert(workflowTemplates).values({
    id,
    organizationId: user.organizationId,
    name,
    description: description || '',
    category: category || 'General',
    steps,
    completionCallbacks: completion_callbacks || [],
    displayInMenu: display_in_menu || false,
    menuLabel: menu_label || null,
    menuIcon: menu_icon || null,
    isActive: is_active !== false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  return {
    success: true,
    template: {
      id: template.id,
      name: template.name,
      stepCount: steps.length,
      isActive: template.isActive,
    },
    message: `Successfully created workflow template "${name}" (ID: ${id}). It can now be attached to work items.`,
  };
}

const CreateIntegrationTriggerSchema = z.object({
  integration_id: z.number().int().positive('Integration ID must be a positive integer'),
  trigger_key: z.string().min(3).max(100).regex(/^[a-z0-9_]+$/, 'Trigger key must be lowercase with underscores only'),
  name: z.string().min(3, 'Name must be at least 3 characters').max(255),
  description: z.string().optional(),
  category: z.string().max(100).optional(),
  event_type: z.enum(['webhook', 'polling']).optional(),
});

async function createIntegrationTrigger(payload: any, user: any): Promise<any> {
  const validated = CreateIntegrationTriggerSchema.parse(payload);
  const { integration_id, trigger_key, name, description, category, event_type } = validated;

  const integration = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.id, integration_id),
      eq(integrations.organizationId, user.organizationId)
    ),
  });

  if (!integration) {
    throw new Error(`Integration with ID ${integration_id} not found or does not belong to your organization.`);
  }

  const existingTrigger = await db.query.integrationTriggers.findFirst({
    where: and(
      eq(integrationTriggers.integrationId, integration_id),
      eq(integrationTriggers.triggerKey, trigger_key)
    ),
  });

  if (existingTrigger) {
    return {
      success: true,
      trigger: {
        id: existingTrigger.id,
        triggerKey: existingTrigger.triggerKey,
        name: existingTrigger.name,
      },
      message: `Trigger "${trigger_key}" already exists for this integration (ID: ${existingTrigger.id}). You can use this trigger ID in your workflows.`,
      alreadyExists: true,
    };
  }

  const [trigger] = await db.insert(integrationTriggers).values({
    integrationId: integration_id,
    triggerKey: trigger_key,
    name,
    description: description || '',
    category: category || 'General',
    eventType: event_type || 'webhook',
    isActive: true,
    isConfigured: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  return {
    success: true,
    trigger: {
      id: trigger.id,
      triggerKey: trigger.triggerKey,
      name: trigger.name,
    },
    message: `Successfully created integration trigger "${name}" (ID: ${trigger.id}). Use this ID in your workflow's trigger_config.`,
  };
}

export default router;
