import express, { Request, Response } from 'express';
import { db } from '../db';
import { vapiCalls, vapiAssistants, keyResults } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { calculateMetricsForCall } from '../services/integrations/vapiMetricsCalculator';

const router = express.Router();

/**
 * Vapi Webhook Handler
 * Receives real-time events from Vapi.ai platform
 * 
 * Events:
 * - assistant-request: Triggered when call starts, used to dynamically select assistant
 * - function-call: Triggered when assistant needs to execute a tool
 * - status-update: Triggered when call status changes
 * - end-of-call-report: Triggered when call ends with full transcript and analysis
 * - hang: Triggered when call is hung up
 */

interface VapiWebhookPayload {
  message: {
    type: 'assistant-request' | 'function-call' | 'status-update' | 'end-of-call-report' | 'hang';
    call?: any;
    phoneNumber?: any;
    customer?: any;
    artifact?: any;
    functionCall?: {
      name: string;
      parameters: any;
    };
  };
}

// ============================================================================
// Webhook Endpoint - All Vapi events
// ============================================================================

router.post('/vapi/webhook', async (req: Request, res: Response) => {
  try {
    const payload: VapiWebhookPayload = req.body;
    const { message } = payload;

    console.log('📞 Vapi webhook received:', message.type);

    switch (message.type) {
      case 'assistant-request':
        await handleAssistantRequest(message, res);
        break;

      case 'function-call':
        await handleFunctionCall(message, res);
        break;

      case 'status-update':
        await handleStatusUpdate(message, res);
        break;

      case 'end-of-call-report':
        await handleEndOfCallReport(message, res);
        break;

      case 'hang':
        await handleHang(message, res);
        break;

      default:
        console.log('⚠️ Unknown webhook type:', message.type);
        res.status(200).json({ message: 'Event received' });
    }
  } catch (error) {
    console.error('❌ Vapi webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Handle assistant-request event
 * Dynamically select which assistant to use based on call context
 */
async function handleAssistantRequest(message: any, res: Response) {
  try {
    const { phoneNumber, customer } = message;
    
    // For now, default to Triage assistant
    // TODO: Add logic to select assistant based on:
    // - Phone number (different numbers for sales vs support)
    // - Time of day
    // - Customer type
    
    const triageAssistant = await db.select()
      .from(vapiAssistants)
      .where(and(
        eq(vapiAssistants.role, 'triage'),
        eq(vapiAssistants.isActive, true)
      ))
      .limit(1);

    if (triageAssistant.length > 0 && triageAssistant[0].vapiAssistantId) {
      res.status(200).json({
        assistantId: triageAssistant[0].vapiAssistantId
      });
    } else {
      // Fallback: let Vapi use the default assistant configured on the phone number
      res.status(200).json({});
    }
  } catch (error) {
    console.error('Error selecting assistant:', error);
    res.status(200).json({});
  }
}

/**
 * Handle function-call event
 * Execute tools when assistant requests them
 */
async function handleFunctionCall(message: any, res: Response) {
  try {
    const { functionCall, call } = message;
    const { name, parameters } = functionCall;

    console.log(`🔧 Tool called: ${name}`, parameters);

    let result: any;

    switch (name) {
      case 'send_sms_verification':
        result = await handleSmsVerification(parameters, call);
        break;

      case 'lookup_customer':
        result = await handleCustomerLookup(parameters, call);
        break;

      case 'create_support_ticket':
        result = await handleCreateTicket(parameters, call);
        break;

      case 'schedule_demo':
        result = await handleScheduleDemo(parameters, call);
        break;

      case 'transfer_to_business':
        result = await handleTransferToBusiness(parameters, call);
        break;

      default:
        console.log('⚠️ Unknown function call:', name);
        result = { error: 'Unknown function' };
    }

    res.status(200).json({ result });
  } catch (error) {
    console.error('Error executing function:', error);
    res.status(200).json({ 
      result: { 
        error: 'Function execution failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      } 
    });
  }
}

/**
 * Handle status-update event
 * Track call progress
 */
async function handleStatusUpdate(message: any, res: Response) {
  try {
    const { call } = message;
    
    if (!call || !call.id) {
      return res.status(200).json({ message: 'No call ID' });
    }

    // Update or create call record
    const existingCall = await db.select()
      .from(vapiCalls)
      .where(eq(vapiCalls.vapiCallId, call.id))
      .limit(1);

    if (existingCall.length > 0) {
      // Update existing call
      await db.update(vapiCalls)
        .set({
          status: call.status,
          updatedAt: new Date(),
        })
        .where(eq(vapiCalls.vapiCallId, call.id));
    } else {
      // Create new call record
      const organizationId = await getOrganizationFromCall(call);
      
      await db.insert(vapiCalls).values({
        organizationId,
        vapiCallId: call.id,
        assistantId: call.assistantId,
        status: call.status,
        customerPhoneNumber: call.customer?.number,
        customerIntent: 'unknown', // Will be updated when intent is determined
        rawCallData: call,
      });
    }

    res.status(200).json({ message: 'Status updated' });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(200).json({ message: 'Error' });
  }
}

/**
 * Handle end-of-call-report event
 * Process call completion, update metrics, create work items
 */
async function handleEndOfCallReport(message: any, res: Response) {
  try {
    const { call } = message;
    
    if (!call || !call.id) {
      return res.status(200).json({ message: 'No call ID' });
    }

    console.log('📊 Processing end-of-call report:', call.id);

    // Extract call data
    const organizationId = await getOrganizationFromCall(call);
    const durationSeconds = calculateDuration(call.startedAt, call.endedAt);
    const transcript = extractTranscript(call.messages || []);
    const toolsUsed = extractToolsCalls(call.messages || []);
    
    // Analyze call for metrics
    const analysis = {
      wasAutonomous: !toolsUsed.includes('transfer_to_human') && !toolsUsed.includes('transfer_to_business'),
      wasForwarded: toolsUsed.includes('transfer_to_human') || toolsUsed.includes('transfer_to_business'),
      customerIntent: extractIntent(call.messages || []),
      knowledgeFilesUsed: call.artifact?.knowledgeFilesUsed || [],
      knowledgeGaps: [], // TODO: Extract questions assistant couldn't answer
      smsCodeSent: toolsUsed.includes('send_sms_verification'),
      ticketCreated: toolsUsed.includes('create_support_ticket'),
      demoScheduled: toolsUsed.includes('schedule_demo'),
    };

    // Update or create call record
    const existingCall = await db.select()
      .from(vapiCalls)
      .where(eq(vapiCalls.vapiCallId, call.id))
      .limit(1);

    if (existingCall.length > 0) {
      // Update existing call
      await db.update(vapiCalls)
        .set({
          status: 'ended',
          endedAt: new Date(call.endedAt),
          durationSeconds,
          transcript,
          wasAutonomous: analysis.wasAutonomous,
          wasForwarded: analysis.wasForwarded,
          customerIntent: analysis.customerIntent,
          knowledgeFilesUsed: analysis.knowledgeFilesUsed,
          knowledgeGaps: analysis.knowledgeGaps,
          smsCodeSent: analysis.smsCodeSent,
          ticketCreated: analysis.ticketCreated,
          demoScheduled: analysis.demoScheduled,
          costCents: call.cost ? Math.round(call.cost * 100) : null,
          rawCallData: call,
          updatedAt: new Date(),
        })
        .where(eq(vapiCalls.vapiCallId, call.id));
    } else {
      // Create new call record
      await db.insert(vapiCalls).values({
        organizationId,
        vapiCallId: call.id,
        assistantId: call.assistantId,
        status: 'ended',
        customerPhoneNumber: call.customer?.number,
        startedAt: new Date(call.startedAt),
        endedAt: new Date(call.endedAt),
        durationSeconds,
        transcript,
        wasAutonomous: analysis.wasAutonomous,
        wasForwarded: analysis.wasForwarded,
        customerIntent: analysis.customerIntent,
        knowledgeFilesUsed: analysis.knowledgeFilesUsed,
        knowledgeGaps: analysis.knowledgeGaps,
        smsCodeSent: analysis.smsCodeSent,
        ticketCreated: analysis.ticketCreated,
        demoScheduled: analysis.demoScheduled,
        costCents: call.cost ? Math.round(call.cost * 100) : null,
        rawCallData: call,
      });
    }

    // Update Key Result metrics
    await calculateMetricsForCall(organizationId, call.id);

    console.log('✅ Call processed successfully:', call.id);

    res.status(200).json({ message: 'Call processed' });
  } catch (error) {
    console.error('Error processing end-of-call report:', error);
    res.status(200).json({ message: 'Error' });
  }
}

/**
 * Handle hang event
 * Mark call as ended
 */
async function handleHang(message: any, res: Response) {
  try {
    const { call } = message;
    
    if (!call || !call.id) {
      return res.status(200).json({ message: 'No call ID' });
    }

    await db.update(vapiCalls)
      .set({
        status: 'ended',
        endedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(vapiCalls.vapiCallId, call.id));

    res.status(200).json({ message: 'Call ended' });
  } catch (error) {
    console.error('Error handling hang:', error);
    res.status(200).json({ message: 'Error' });
  }
}

// ============================================================================
// Tool Implementations - Import from vapiTools service
// ============================================================================

import {
  sendSmsVerification,
  lookupCustomer,
  createSupportTicket,
  scheduleDemo,
  transferToBusiness,
} from '../services/integrations/vapiTools';

async function handleSmsVerification(parameters: any, call: any) {
  const organizationId = await getOrganizationFromCall(call);
  return await sendSmsVerification(parameters, {
    callId: call.id,
    customerPhoneNumber: call.customer?.number,
    organizationId,
  });
}

async function handleCustomerLookup(parameters: any, call: any) {
  const organizationId = await getOrganizationFromCall(call);
  return await lookupCustomer(parameters, {
    callId: call.id,
    customerPhoneNumber: call.customer?.number,
    organizationId,
  });
}

async function handleCreateTicket(parameters: any, call: any) {
  const organizationId = await getOrganizationFromCall(call);
  return await createSupportTicket(parameters, {
    callId: call.id,
    customerPhoneNumber: call.customer?.number,
    organizationId,
  });
}

async function handleScheduleDemo(parameters: any, call: any) {
  const organizationId = await getOrganizationFromCall(call);
  return await scheduleDemo(parameters, {
    callId: call.id,
    customerPhoneNumber: call.customer?.number,
    organizationId,
  });
}

async function handleTransferToBusiness(parameters: any, call: any) {
  const organizationId = await getOrganizationFromCall(call);
  return await transferToBusiness(parameters, {
    callId: call.id,
    customerPhoneNumber: call.customer?.number,
    organizationId,
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getOrganizationFromCall(call: any): Promise<number> {
  // For now, default to org 4 (Country Connect)
  // TODO: Map phone numbers to organizations
  return 4;
}

function calculateDuration(startedAt: string, endedAt: string): number {
  if (!startedAt || !endedAt) return 0;
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  return Math.round((end - start) / 1000);
}

function extractTranscript(messages: any[]): string {
  return messages
    .filter(m => ['user', 'assistant'].includes(m.role))
    .map(m => `${m.role}: ${m.message || m.content || ''}`)
    .join('\n');
}

function extractToolsCalls(messages: any[]): string[] {
  const tools: string[] = [];
  for (const msg of messages) {
    if (msg.role === 'tool_calls' && msg.toolCalls) {
      for (const toolCall of msg.toolCalls) {
        if (toolCall.function?.name) {
          tools.push(toolCall.function.name);
        }
      }
    }
  }
  return tools;
}

function extractIntent(messages: any[]): string {
  // Simple intent extraction from first user message
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (!firstUserMessage) return 'unknown';
  
  const message = (firstUserMessage.message || firstUserMessage.content || '').toLowerCase();
  
  if (message.includes('transfer') || message.includes('business')) return 'business_transfer';
  if (message.includes('demo') || message.includes('sales') || message.includes('package')) return 'sales';
  if (message.includes('support') || message.includes('help') || message.includes('problem')) return 'support';
  
  return 'general_inquiry';
}

function determineJourneyType(call: any): string {
  // Determine based on assistant used or tools called
  if (call.assistantId) {
    // TODO: Map assistant IDs to journey types
  }
  
  return 'unknown';
}

export default router;
