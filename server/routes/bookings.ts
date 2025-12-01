import { Router } from 'express';
import { db } from '../db';
import { eq, and, gte } from 'drizzle-orm';
import { bookableTaskTypes, bookingTokens, workItems, organizations, activityLogs } from '@shared/schema';
import { SplynxService } from '../services/integrations/splynxService';
import crypto from 'crypto';

const router = Router();

/**
 * Get bookable task types for an organization
 */
router.get('/bookable-task-types', async (req, res) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const types = await db
      .select()
      .from(bookableTaskTypes)
      .where(eq(bookableTaskTypes.organizationId, organizationId))
      .orderBy(bookableTaskTypes.displayOrder);
    
    res.json(types);
  } catch (error: any) {
    console.error('Error fetching bookable task types:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get bookable task types that match a work item's ticket type
 */
router.get('/work-items/:workItemId/available-bookings', async (req, res) => {
  try {
    const { workItemId } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get work item with ticket metadata
    const [workItem] = await db
      .select()
      .from(workItems)
      .where(and(
        eq(workItems.id, parseInt(workItemId)),
        eq(workItems.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!workItem) {
      return res.status(404).json({ error: 'Work item not found' });
    }
    
    const metadata = workItem.workflowMetadata as any || {};
    const ticketType = metadata.ticketType || metadata.ticket_type;
    const ticketLabels = metadata.ticketLabels || metadata.labels || [];
    
    // Get all active bookable task types
    const allTypes = await db
      .select()
      .from(bookableTaskTypes)
      .where(and(
        eq(bookableTaskTypes.organizationId, organizationId),
        eq(bookableTaskTypes.isActive, true)
      ));
    
    // Filter by trigger conditions
    const matchingTypes = allTypes.filter(type => {
      const conditions = type.triggerConditions as any || {};
      
      // Check ticket type match
      if (conditions.ticketTypes?.length > 0 && ticketType) {
        if (!conditions.ticketTypes.includes(ticketType)) {
          return false;
        }
      }
      
      // Check label match
      if (conditions.ticketLabels?.length > 0) {
        const hasMatchingLabel = conditions.ticketLabels.some((label: string) => 
          ticketLabels.includes(label)
        );
        if (!hasMatchingLabel) {
          return false;
        }
      }
      
      return true;
    });
    
    res.json(matchingTypes);
  } catch (error: any) {
    console.error('Error fetching available bookings:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create booking token and return URL
 */
router.post('/work-items/:workItemId/create-booking', async (req, res) => {
  try {
    const { workItemId } = req.params;
    const { bookableTaskTypeId } = req.body;
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;
    
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get work item
    const [workItem] = await db
      .select()
      .from(workItems)
      .where(and(
        eq(workItems.id, parseInt(workItemId)),
        eq(workItems.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!workItem) {
      return res.status(404).json({ error: 'Work item not found' });
    }
    
    // Get bookable task type
    const [taskType] = await db
      .select()
      .from(bookableTaskTypes)
      .where(and(
        eq(bookableTaskTypes.id, bookableTaskTypeId),
        eq(bookableTaskTypes.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!taskType) {
      return res.status(404).json({ error: 'Bookable task type not found' });
    }
    
    // Extract customer info from work item metadata
    const metadata = workItem.workflowMetadata as any || {};
    const customerId = metadata.customerId || metadata.customer_id;
    const customerEmail = metadata.customerEmail || metadata.email;
    const customerName = metadata.customerName || metadata.name;
    const serviceAddress = metadata.address;
    
    if (!customerId) {
      return res.status(400).json({ error: 'Work item missing customer ID' });
    }
    
    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Create booking token record
    const [bookingToken] = await db
      .insert(bookingTokens)
      .values({
        organizationId,
        token,
        workItemId: workItem.id,
        bookableTaskTypeId: taskType.id,
        customerId,
        customerEmail,
        customerName,
        serviceAddress,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      })
      .returning();
    
    // Generate booking URL
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const bookingUrl = `${baseUrl}/book/${token}`;
    
    // Log activity
    await db.insert(activityLogs).values({
      organizationId,
      userId,
      actionType: 'generation',
      entityType: 'booking_token',
      entityId: bookingToken.id,
      description: `Generated booking link for ${taskType.name}`,
      metadata: {
        workItemId: workItem.id,
        bookingUrl,
        customerName,
        customerEmail
      }
    });
    
    res.json({
      success: true,
      bookingToken,
      bookingUrl,
      expiresAt: bookingToken.expiresAt
    });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUBLIC ENDPOINT: Get booking details by token
 */
router.get('/public/bookings/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const [booking] = await db
      .select({
        booking: bookingTokens,
        taskType: bookableTaskTypes,
        workItem: workItems,
      })
      .from(bookingTokens)
      .innerJoin(bookableTaskTypes, eq(bookingTokens.bookableTaskTypeId, bookableTaskTypes.id))
      .innerJoin(workItems, eq(bookingTokens.workItemId, workItems.id))
      .where(eq(bookingTokens.token, token))
      .limit(1);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Check if expired
    if (booking.booking.expiresAt && new Date() > booking.booking.expiresAt) {
      return res.status(410).json({ error: 'Booking link has expired' });
    }
    
    // Check if already confirmed
    if (booking.booking.status === 'confirmed') {
      return res.status(410).json({ 
        error: 'Booking already confirmed',
        confirmedAt: booking.booking.confirmedAt,
        selectedDatetime: booking.booking.selectedDatetime
      });
    }
    
    res.json({
      customerName: booking.booking.customerName,
      serviceAddress: booking.booking.serviceAddress,
      taskTypeName: booking.taskType.name,
      taskCategory: booking.taskType.taskCategory,
      duration: booking.taskType.defaultDuration,
      ticketNumber: booking.workItem.sourceEntityId,
      ticketSubject: booking.workItem.title,
    });
  } catch (error: any) {
    console.error('Error fetching booking details:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUBLIC ENDPOINT: Get available slots for booking
 */
router.post('/public/bookings/:token/available-slots', async (req, res) => {
  try {
    const { token } = req.params;
    const { startDate, endDate } = req.body;
    
    const [booking] = await db
      .select({
        booking: bookingTokens,
        taskType: bookableTaskTypes,
        org: organizations
      })
      .from(bookingTokens)
      .innerJoin(bookableTaskTypes, eq(bookingTokens.bookableTaskTypeId, bookableTaskTypes.id))
      .innerJoin(organizations, eq(bookingTokens.organizationId, organizations.id))
      .where(eq(bookingTokens.token, token))
      .limit(1);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Get Splynx credentials
    if (!booking.org.splynxUrl || !booking.org.splynxApiKey || !booking.org.splynxApiSecret) {
      return res.status(500).json({ error: 'Splynx credentials not configured' });
    }
    
    const splynxService = new SplynxService({
      url: booking.org.splynxUrl,
      apiKey: booking.org.splynxApiKey,
      apiSecret: booking.org.splynxApiSecret
    });
    
    // Fetch available slots
    const slots = await splynxService.getAvailableSlots({
      projectId: booking.taskType.splynxProjectId,
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      duration: booking.taskType.defaultDuration || '2h 30m',
      travelTime: booking.taskType.defaultTravelTimeTo || 0
    });
    
    res.json({ slots });
  } catch (error: any) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUBLIC ENDPOINT: Confirm booking
 */
router.post('/public/bookings/:token/confirm', async (req, res) => {
  try {
    const { token } = req.params;
    const { selectedDatetime, contactNumber, additionalNotes } = req.body;
    
    if (!selectedDatetime) {
      return res.status(400).json({ error: 'Selected datetime is required' });
    }
    
    const [booking] = await db
      .select({
        booking: bookingTokens,
        taskType: bookableTaskTypes,
        workItem: workItems,
        org: organizations
      })
      .from(bookingTokens)
      .innerJoin(bookableTaskTypes, eq(bookingTokens.bookableTaskTypeId, bookableTaskTypes.id))
      .innerJoin(workItems, eq(bookingTokens.workItemId, workItems.id))
      .innerJoin(organizations, eq(bookingTokens.organizationId, organizations.id))
      .where(eq(bookingTokens.token, token))
      .limit(1);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (booking.booking.status === 'confirmed') {
      return res.status(400).json({ error: 'Booking already confirmed' });
    }
    
    // Create Splynx task
    if (!booking.org.splynxUrl || !booking.org.splynxApiKey || !booking.org.splynxApiSecret) {
      return res.status(500).json({ error: 'Splynx credentials not configured' });
    }
    
    const splynxService = new SplynxService({
      url: booking.org.splynxUrl,
      apiKey: booking.org.splynxApiKey,
      apiSecret: booking.org.splynxApiSecret
    });
    
    const splynxTask = await splynxService.createSplynxTask({
      taskName: `${booking.taskType.name} - ${booking.booking.customerName}`,
      projectId: booking.taskType.splynxProjectId,
      workflowStatusId: booking.taskType.splynxWorkflowStatusId,
      customerId: booking.booking.customerId,
      description: `${booking.workItem.title}\n\nTicket #${booking.workItem.sourceEntityId}\n\n${additionalNotes || ''}`,
      address: booking.booking.serviceAddress,
      isScheduled: true,
      scheduledFrom: selectedDatetime,
      duration: booking.taskType.defaultDuration,
      travelTimeTo: booking.taskType.defaultTravelTimeTo,
      travelTimeFrom: booking.taskType.defaultTravelTimeFrom,
      priority: 'normal'
    });
    
    // Update booking token
    await db
      .update(bookingTokens)
      .set({
        status: 'confirmed',
        selectedDatetime: new Date(selectedDatetime),
        contactNumber,
        additionalNotes,
        splynxTaskId: splynxTask.id,
        confirmedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(bookingTokens.id, booking.booking.id));
    
    // Update work item metadata
    const updatedMetadata = {
      ...(booking.workItem.workflowMetadata as any || {}),
      bookedAppointment: {
        taskId: splynxTask.id,
        datetime: selectedDatetime,
        taskType: booking.taskType.name,
        confirmedAt: new Date().toISOString()
      }
    };
    
    await db
      .update(workItems)
      .set({
        workflowMetadata: updatedMetadata,
        status: 'In Progress',
        updatedAt: new Date()
      })
      .where(eq(workItems.id, booking.workItem.id));
    
    // Log activity
    await db.insert(activityLogs).values({
      organizationId: booking.booking.organizationId,
      userId: null, // Customer action
      actionType: 'completion',
      entityType: 'booking_token',
      entityId: booking.booking.id,
      description: `Customer confirmed ${booking.taskType.name} for ${selectedDatetime}`,
      metadata: {
        splynxTaskId: splynxTask.id,
        customerName: booking.booking.customerName,
        workItemId: booking.workItem.id
      }
    });
    
    res.json({
      success: true,
      splynxTaskId: splynxTask.id,
      selectedDatetime,
      confirmationMessage: booking.taskType.confirmationMessage
    });
  } catch (error: any) {
    console.error('Error confirming booking:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * CRUD for bookable task types (Admin only)
 */
router.post('/bookable-task-types', async (req, res) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;
    const data = req.body;
    
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const [taskType] = await db
      .insert(bookableTaskTypes)
      .values({
        ...data,
        organizationId,
      })
      .returning();
    
    // Log activity
    await db.insert(activityLogs).values({
      organizationId,
      userId,
      actionType: 'creation',
      entityType: 'bookable_task_type',
      entityId: taskType.id,
      description: `Created bookable task type: ${taskType.name}`,
      metadata: { taskType }
    });
    
    res.json(taskType);
  } catch (error: any) {
    console.error('Error creating bookable task type:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/bookable-task-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;
    const updates = req.body;
    
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const [updated] = await db
      .update(bookableTaskTypes)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(bookableTaskTypes.id, parseInt(id)),
        eq(bookableTaskTypes.organizationId, organizationId)
      ))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: 'Bookable task type not found' });
    }
    
    // Log activity
    await db.insert(activityLogs).values({
      organizationId,
      userId,
      actionType: 'status_change',
      entityType: 'bookable_task_type',
      entityId: updated.id,
      description: `Updated bookable task type: ${updated.name}`,
      metadata: { updates }
    });
    
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating bookable task type:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/bookable-task-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;
    
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const [deleted] = await db
      .delete(bookableTaskTypes)
      .where(and(
        eq(bookableTaskTypes.id, parseInt(id)),
        eq(bookableTaskTypes.organizationId, organizationId)
      ))
      .returning();
    
    if (!deleted) {
      return res.status(404).json({ error: 'Bookable task type not found' });
    }
    
    // Log activity
    await db.insert(activityLogs).values({
      organizationId,
      userId,
      actionType: 'deletion',
      entityType: 'bookable_task_type',
      entityId: deleted.id,
      description: `Deleted bookable task type: ${deleted.name}`,
      metadata: { taskType: deleted }
    });
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting bookable task type:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
