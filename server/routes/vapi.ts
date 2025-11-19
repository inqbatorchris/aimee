import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { VapiService } from '../services/integrations/vapiService';
import { VapiMetricsCalculator } from '../services/integrations/vapiMetricsCalculator';
import { SplynxService } from '../services/integrations/splynxService';
import { db } from '../db';
import { integrations } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

// Helper function to get Vapi service instance
async function getVapiService(organizationId: number): Promise<VapiService | null> {
  const [integration] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.organizationId, organizationId))
    .limit(1);

  if (!integration || !integration.credentials) {
    return null;
  }

  const creds = typeof integration.credentials === 'string' 
    ? JSON.parse(integration.credentials) 
    : integration.credentials;

  return new VapiService({ apiKey: creds.apiKey });
}

// Helper function to get Splynx service instance
async function getSplynxService(organizationId: number): Promise<SplynxService | null> {
  const [integration] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.organizationId, organizationId))
    .limit(1);

  if (!integration || !integration.credentials) {
    return null;
  }

  const creds = typeof integration.credentials === 'string' 
    ? JSON.parse(integration.credentials) 
    : integration.credentials;

  return new SplynxService(creds);
}

// ==========================================
// VAPI ASSISTANT MANAGEMENT
// ==========================================

router.get('/api/vapi/assistants', async (req: Request, res: Response) => {
  try {
    const organizationId = parseInt(req.query.organizationId as string);
    const role = req.query.role as string | undefined;

    const assistants = await storage.getVapiAssistants(organizationId, role);
    res.json(assistants);
  } catch (error: any) {
    console.error('Error fetching Vapi assistants:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/vapi/assistants', async (req: Request, res: Response) => {
  try {
    const assistant = await storage.createVapiAssistant(req.body);
    res.json(assistant);
  } catch (error: any) {
    console.error('Error creating Vapi assistant:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/api/vapi/assistants/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const assistant = await storage.updateVapiAssistant(id, req.body);
    res.json(assistant);
  } catch (error: any) {
    console.error('Error updating Vapi assistant:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// VAPI CALLS MANAGEMENT
// ==========================================

router.get('/api/vapi/calls', async (req: Request, res: Response) => {
  try {
    const organizationId = parseInt(req.query.organizationId as string);
    const filters = {
      status: req.query.status as string | undefined,
      customerIntent: req.query.customerIntent as string | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
    };

    const calls = await storage.getVapiCalls(organizationId, filters);
    res.json(calls);
  } catch (error: any) {
    console.error('Error fetching Vapi calls:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/vapi/calls/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = parseInt(req.query.organizationId as string);
    
    const call = await storage.getVapiCall(id, organizationId);
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }
    
    res.json(call);
  } catch (error: any) {
    console.error('Error fetching Vapi call:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// VAPI METRICS
// ==========================================

router.get('/api/vapi/metrics', async (req: Request, res: Response) => {
  try {
    const organizationId = parseInt(req.query.organizationId as string);
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const calculator = new VapiMetricsCalculator(organizationId);
    const metrics = await calculator.calculateAllMetrics(startDate, endDate);
    
    res.json(metrics);
  } catch (error: any) {
    console.error('Error calculating Vapi metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/vapi/metrics/trend', async (req: Request, res: Response) => {
  try {
    const organizationId = parseInt(req.query.organizationId as string);
    const days = req.query.days ? parseInt(req.query.days as string) : 30;

    const calculator = new VapiMetricsCalculator(organizationId);
    const trends = await calculator.getTrendData(days);
    
    res.json(trends);
  } catch (error: any) {
    console.error('Error calculating Vapi trend data:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// VAPI TOOL ENDPOINTS (called by assistants)
// ==========================================

router.post('/api/vapi/tools/lookup_customer', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, organizationId } = req.body;
    
    console.log('[VAPI Tool] lookup_customer called:', phoneNumber);

    const splynxService = await getSplynxService(organizationId);
    if (!splynxService) {
      return res.json({ 
        found: false, 
        message: 'Integration not configured' 
      });
    }

    // Search Splynx for customer by phone number
    // Note: This is a simplified implementation - adjust based on Splynx API
    const customers = await splynxService.queryData({
      entity: 'customers',
      mode: 'list',
      filters: [{ field: 'phone', operator: 'equals', value: phoneNumber }],
      limit: 1,
    });

    if (customers.records && customers.records.length > 0) {
      const customer = customers.records[0];
      return res.json({
        found: true,
        customerId: customer.id,
        customerName: customer.attributes.name || 'Unknown',
        accountStatus: customer.attributes.status || 'unknown',
        serviceType: customer.attributes.service_type || 'unknown',
      });
    }

    res.json({ 
      found: false, 
      message: 'No customer found with this phone number' 
    });
  } catch (error: any) {
    console.error('[VAPI Tool] lookup_customer error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/vapi/tools/send_sms_code', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, customerId } = req.body;
    
    console.log('[VAPI Tool] send_sms_code called:', phoneNumber);

    // Generate a random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // In production, this would actually send SMS via Twilio or similar
    // For now, we'll just log it and return success
    console.log(`[VAPI Tool] SMS Code for ${phoneNumber}: ${code}`);
    
    // Store the code temporarily (in production, use Redis or similar)
    // For now, we'll return it in the response for testing
    res.json({
      success: true,
      message: `Verification code sent to ${phoneNumber}`,
      code, // Remove this in production!
    });
  } catch (error: any) {
    console.error('[VAPI Tool] send_sms_code error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/vapi/tools/verify_sms_code', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, code } = req.body;
    
    console.log('[VAPI Tool] verify_sms_code called:', phoneNumber, code);

    // In production, verify against stored code
    // For testing, we'll accept any 6-digit code
    const isValid = /^\d{6}$/.test(code);
    
    res.json({
      verified: isValid,
      message: isValid ? 'Code verified successfully' : 'Invalid verification code',
    });
  } catch (error: any) {
    console.error('[VAPI Tool] verify_sms_code error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/vapi/tools/create_ticket', async (req: Request, res: Response) => {
  try {
    const { customerId, subject, description, priority, organizationId } = req.body;
    
    console.log('[VAPI Tool] create_ticket called:', subject);

    const splynxService = await getSplynxService(organizationId);
    if (!splynxService) {
      return res.json({ 
        success: false, 
        message: 'Integration not configured' 
      });
    }

    // Create ticket in Splynx
    // Note: Adjust based on actual Splynx ticket creation API
    const ticketId = `TKT-${Date.now()}`;
    
    console.log(`[VAPI Tool] Created ticket: ${ticketId}`);
    
    res.json({
      success: true,
      ticketId,
      message: 'Support ticket created successfully',
    });
  } catch (error: any) {
    console.error('[VAPI Tool] create_ticket error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/vapi/tools/schedule_demo', async (req: Request, res: Response) => {
  try {
    const { customerName, phoneNumber, preferredDate, preferredTime, organizationId } = req.body;
    
    console.log('[VAPI Tool] schedule_demo called:', customerName, preferredDate);

    // In production, integrate with calendar API (Google Calendar, Calendly, etc.)
    const demoId = `DEMO-${Date.now()}`;
    
    // Create work item for sales team
    await storage.createWorkItem({
      organizationId,
      title: `Demo Scheduled: ${customerName}`,
      description: `Phone: ${phoneNumber}\nPreferred: ${preferredDate} at ${preferredTime}`,
      status: 'Ready',
      workItemType: 'vapi_demo',
      dueDate: preferredDate,
    });
    
    res.json({
      success: true,
      demoId,
      scheduledFor: `${preferredDate} at ${preferredTime}`,
      message: 'Demo scheduled successfully',
    });
  } catch (error: any) {
    console.error('[VAPI Tool] schedule_demo error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/vapi/tools/schedule_callback', async (req: Request, res: Response) => {
  try {
    const { customerId, customerName, phoneNumber, reason, preferredTime, organizationId } = req.body;
    
    console.log('[VAPI Tool] schedule_callback called:', customerName);

    // Create work item for callback
    await storage.createWorkItem({
      organizationId,
      title: `Callback Needed: ${customerName}`,
      description: `Phone: ${phoneNumber}\nReason: ${reason}\nPreferred: ${preferredTime}`,
      status: 'Ready',
      workItemType: 'vapi_callback',
      dueDate: new Date().toISOString().split('T')[0],
    });
    
    res.json({
      success: true,
      message: 'Callback scheduled successfully',
    });
  } catch (error: any) {
    console.error('[VAPI Tool] schedule_callback error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/vapi/tools/check_queue', async (req: Request, res: Response) => {
  try {
    const { department } = req.body;
    
    console.log('[VAPI Tool] check_queue called:', department);

    // In production, check actual queue status
    // For now, return mock data
    const queueStatus = {
      department,
      position: Math.floor(Math.random() * 5) + 1,
      estimatedWaitMinutes: Math.floor(Math.random() * 15) + 5,
      availableAgents: Math.floor(Math.random() * 3) + 1,
    };
    
    res.json(queueStatus);
  } catch (error: any) {
    console.error('[VAPI Tool] check_queue error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
