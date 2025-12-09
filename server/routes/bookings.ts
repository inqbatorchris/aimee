import { Router } from 'express';
import { db } from '../db';
import { eq, and, gte, sql } from 'drizzle-orm';
import { bookableTaskTypes, bookingTokens, bookings, workItems, organizations, activityLogs, integrations, users } from '@shared/schema';
import { SplynxService } from '../services/integrations/splynxService';
import { authenticateToken } from '../auth';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Encryption helpers for Splynx credentials
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16;

// Validate encryption key on module load
if (!ENCRYPTION_KEY) {
  console.warn('[BOOKINGS] WARNING: ENCRYPTION_KEY environment variable is not set. Booking confirmations will fail.');
}

class DecryptionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'DecryptionError';
  }
}

function decrypt(text: string): string {
  if (!text) {
    throw new DecryptionError('No encrypted data provided');
  }
  
  if (!ENCRYPTION_KEY) {
    throw new DecryptionError('ENCRYPTION_KEY environment variable is not configured');
  }
  
  try {
    const parts = text.split(':');
    if (parts.length !== 2) {
      throw new DecryptionError('Invalid encrypted data format - expected IV:ciphertext');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error: any) {
    if (error instanceof DecryptionError) {
      throw error;
    }
    console.error('[BOOKINGS] Decryption failed:', error?.message || 'Unknown error');
    throw new DecryptionError(`Credential decryption failed: ${error?.message || 'Unknown error'}`, error);
  }
}

class SplynxServiceError extends Error {
  constructor(message: string, public readonly errorType: 'not_configured' | 'decryption_failed' | 'invalid_credentials' | 'missing_fields') {
    super(message);
    this.name = 'SplynxServiceError';
  }
}

/**
 * Helper to get Splynx service for an organization
 * Returns the service or throws a specific error for troubleshooting
 */
async function getSplynxServiceForOrg(organizationId: number): Promise<SplynxService> {
  const [splynxIntegration] = await db
    .select()
    .from(integrations)
    .where(and(
      eq(integrations.organizationId, organizationId),
      eq(integrations.platformType, 'splynx')
    ))
    .limit(1);
  
  if (!splynxIntegration) {
    throw new SplynxServiceError(
      'Splynx integration not configured for this organization',
      'not_configured'
    );
  }
  
  if (!splynxIntegration.credentialsEncrypted) {
    throw new SplynxServiceError(
      'Splynx integration exists but credentials are not configured',
      'not_configured'
    );
  }
  
  let credentials: any;
  try {
    const decrypted = decrypt(splynxIntegration.credentialsEncrypted);
    credentials = JSON.parse(decrypted);
  } catch (error: any) {
    if (error instanceof DecryptionError) {
      throw new SplynxServiceError(
        `Splynx credential decryption failed: ${error.message}`,
        'decryption_failed'
      );
    }
    throw new SplynxServiceError(
      `Failed to parse Splynx credentials: ${error.message}`,
      'invalid_credentials'
    );
  }
  
  const { baseUrl, authHeader } = credentials;
  
  if (!baseUrl) {
    throw new SplynxServiceError(
      'Splynx baseUrl is missing from credentials',
      'missing_fields'
    );
  }
  
  if (!authHeader) {
    throw new SplynxServiceError(
      'Splynx authHeader is missing from credentials',
      'missing_fields'
    );
  }
  
  return new SplynxService({ baseUrl, authHeader });
}

const router = Router();

/**
 * Generate a URL-friendly slug from a name
 * Ensures uniqueness by appending a short random suffix
 */
function generateSlug(name: string): string {
  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  // Add short random suffix for uniqueness
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${baseSlug}-${suffix}`;
}

/**
 * Helper function to validate booking tokens
 * Checks expiry, usage limits, and organization scoping
 */
async function validateBookingToken(token: string, expectedOrgId?: number) {
  const [booking] = await db
    .select({
      booking: bookingTokens,
      taskType: bookableTaskTypes,
    })
    .from(bookingTokens)
    .innerJoin(bookableTaskTypes, eq(bookingTokens.bookableTaskTypeId, bookableTaskTypes.id))
    .where(eq(bookingTokens.token, token))
    .limit(1);
  
  if (!booking) {
    return { valid: false, error: 'Booking not found', status: 404 };
  }
  
  // Validate organization scoping if provided
  if (expectedOrgId && booking.booking.organizationId !== expectedOrgId) {
    return { valid: false, error: 'Unauthorized access', status: 403 };
  }
  
  // Check if expired
  if (booking.booking.expiresAt && new Date() > booking.booking.expiresAt) {
    await db
      .update(bookingTokens)
      .set({ status: 'expired' })
      .where(eq(bookingTokens.id, booking.booking.id));
    
    return { valid: false, error: 'Booking link has expired', status: 410 };
  }
  
  // Check usage limits
  if (booking.booking.usageCount >= booking.booking.maxUses) {
    return { 
      valid: false, 
      error: 'Booking link has been used the maximum number of times', 
      status: 410 
    };
  }
  
  // Check if already confirmed (special case for single-use tokens)
  if (booking.booking.status === 'confirmed' && booking.booking.maxUses === 1) {
    return { 
      valid: false, 
      error: 'Booking already confirmed',
      status: 410,
      confirmedAt: booking.booking.confirmedAt,
      selectedDatetime: booking.booking.selectedDatetime
    };
  }
  
  return { valid: true, booking };
}

/**
 * Get bookable task types for an organization (with booking URLs)
 */
router.get('/bookable-task-types', authenticateToken, async (req, res) => {
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
    
    // Add booking URLs to each type
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const typesWithUrls = types.map(type => ({
      ...type,
      bookingUrl: type.slug ? `${baseUrl}/book/${type.slug}` : null
    }));
    
    res.json(typesWithUrls);
  } catch (error: any) {
    console.error('Error fetching bookable task types:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get bookable task types that match a work item's ticket type
 */
router.get('/work-items/:workItemId/available-bookings', authenticateToken, async (req, res) => {
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
router.post('/work-items/:workItemId/create-booking', authenticateToken, async (req, res) => {
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
    
    // Validate token
    const validation = await validateBookingToken(token);
    if (!validation.valid) {
      return res.status(validation.status).json({ 
        error: validation.error,
        confirmedAt: validation.confirmedAt,
        selectedDatetime: validation.selectedDatetime
      });
    }
    
    // Get additional work item data
    const [workItem] = await db
      .select()
      .from(workItems)
      .where(eq(workItems.id, validation.booking!.booking.workItemId))
      .limit(1);
    
    res.json({
      customerName: validation.booking!.booking.customerName,
      serviceAddress: validation.booking!.booking.serviceAddress,
      taskTypeName: validation.booking!.taskType.name,
      taskCategory: validation.booking!.taskType.taskCategory,
      duration: validation.booking!.taskType.defaultDuration,
      ticketNumber: workItem?.sourceEntityId || 'N/A',
      ticketSubject: workItem?.title || 'N/A',
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
    
    // Validate token
    const validation = await validateBookingToken(token);
    if (!validation.valid) {
      return res.status(validation.status).json({ error: validation.error });
    }
    
    // Get Splynx service for this organization
    let splynxService: SplynxService;
    try {
      splynxService = await getSplynxServiceForOrg(validation.booking!.booking.organizationId);
    } catch (error: any) {
      // All SplynxServiceError types indicate configuration issues - return 503 Service Unavailable
      const isConfigError = error instanceof SplynxServiceError;
      const statusCode = isConfigError ? 503 : 500;
      const errorTypeLabel = isConfigError ? `Splynx ${error.errorType}` : 'Splynx service error';
      console.error(`[BOOKINGS] ${errorTypeLabel}:`, error.message);
      return res.status(statusCode).json({ 
        error: isConfigError ? 'Splynx service unavailable - configuration issue' : 'Unexpected server error',
        errorType: isConfigError ? error.errorType : 'unknown',
        details: error.message 
      });
    }
    
    // Get team configuration from task type
    const defaultAssigneeTeamId = (validation.booking!.taskType as any).defaultAssigneeTeamId;
    const taskType = validation.booking!.taskType;
    
    let slots: any[];
    
    // Use team availability when a team is configured (same method as calendar)
    if (defaultAssigneeTeamId) {
      console.log(`[BOOKINGS] Using team availability for team ${defaultAssigneeTeamId}`);
      const teamAvailability = await splynxService.getTeamAvailability({
        teamId: defaultAssigneeTeamId,
        projectId: taskType.splynxProjectId,
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        duration: taskType.defaultDuration || '2h 30m',
        travelTime: taskType.defaultTravelTimeTo || 0
      });
      slots = teamAvailability.slots;
    } else {
      // Fallback to project-level availability
      slots = await splynxService.getAvailableSlots({
        projectId: taskType.splynxProjectId,
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        duration: taskType.defaultDuration || '2h 30m',
        travelTime: taskType.defaultTravelTimeTo || 0
      });
    }
    
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
    
    // Validate token (no DB changes - cheap validation first)
    const validation = await validateBookingToken(token);
    if (!validation.valid) {
      return res.status(validation.status).json({ error: validation.error });
    }
    
    // Get work item BEFORE any external calls
    const [workItem] = await db
      .select()
      .from(workItems)
      .where(eq(workItems.id, validation.booking!.booking.workItemId))
      .limit(1);
    
    if (!workItem) {
      return res.status(500).json({ error: 'Work item not found' });
    }
    
    // Get Splynx service for this organization
    let splynxService: SplynxService;
    try {
      splynxService = await getSplynxServiceForOrg(validation.booking!.booking.organizationId);
    } catch (error: any) {
      // All SplynxServiceError types indicate configuration issues - return 503 Service Unavailable
      const isConfigError = error instanceof SplynxServiceError;
      const statusCode = isConfigError ? 503 : 500;
      const errorTypeLabel = isConfigError ? `Splynx ${error.errorType}` : 'Splynx service error';
      console.error(`[BOOKINGS] ${errorTypeLabel} during confirmation:`, error.message);
      return res.status(statusCode).json({ 
        error: isConfigError ? 'Splynx service unavailable - configuration issue' : 'Unexpected server error',
        errorType: isConfigError ? error.errorType : 'unknown',
        details: error.message 
      });
    }
    
    // Create Splynx task FIRST (if this fails, token remains usable for retry)
    // Get assignee and team configuration from the task type
    const defaultAssigneeUserId = (validation.booking!.taskType as any).defaultAssigneeUserId;
    const defaultAssigneeTeamId = (validation.booking!.taskType as any).defaultAssigneeTeamId;
    
    const splynxTask = await splynxService.createSplynxTask({
      taskName: `${validation.booking!.taskType.name} - ${validation.booking!.booking.customerName}`,
      projectId: validation.booking!.taskType.splynxProjectId,
      workflowStatusId: validation.booking!.taskType.splynxWorkflowStatusId,
      customerId: validation.booking!.booking.customerId,
      description: `${workItem.title}\n\nTicket #${(workItem as any).sourceEntityId || 'N/A'}\n\n${additionalNotes || ''}`,
      address: validation.booking!.booking.serviceAddress || undefined,
      isScheduled: true,
      scheduledFrom: selectedDatetime,
      duration: validation.booking!.taskType.defaultDuration || undefined,
      travelTimeTo: validation.booking!.taskType.defaultTravelTimeTo || undefined,
      travelTimeFrom: validation.booking!.taskType.defaultTravelTimeFrom || undefined,
      assignee: defaultAssigneeUserId || undefined,
      teamId: defaultAssigneeTeamId || undefined,
    });
    
    // ATOMIC TOKEN CONFIRMATION: Only claim token after successful Splynx task creation
    // This single UPDATE both increments usage_count AND sets all confirmation fields atomically
    // The WHERE clause ensures only ONE request can successfully claim the token (race-safe)
    const [confirmedToken] = await db
      .update(bookingTokens)
      .set({
        status: 'confirmed',
        selectedDatetime: new Date(selectedDatetime),
        contactNumber: contactNumber || null,
        additionalNotes: additionalNotes || null,
        splynxTaskId: splynxTask.id,
        confirmedAt: new Date(),
        redeemedAt: new Date(),
        usageCount: sql`${bookingTokens.usageCount} + 1`,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(bookingTokens.id, validation.booking!.booking.id),
          sql`${bookingTokens.usageCount} < ${bookingTokens.maxUses}`
        )
      )
      .returning();
    
    // If no rows returned, another request already claimed this token (race condition)
    if (!confirmedToken) {
      // Note: Splynx task was created but token claim failed due to race
      // The Splynx task may need manual cleanup, but customer can't confirm twice
      return res.status(410).json({ 
        error: 'Booking link has already been used. If you just confirmed, please check your email for confirmation details.' 
      });
    }
    
    // Update work item metadata
    const updatedMetadata = {
      ...(workItem.workflowMetadata as any || {}),
      bookedAppointment: {
        taskId: splynxTask.id,
        datetime: selectedDatetime,
        taskType: validation.booking!.taskType.name,
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
      .where(eq(workItems.id, workItem.id));
    
    // Log activity
    await db.insert(activityLogs).values({
      organizationId: validation.booking!.booking.organizationId,
      userId: null,
      actionType: 'completion',
      entityType: 'booking_token',
      entityId: validation.booking!.booking.id,
      description: `Customer confirmed ${validation.booking!.taskType.name} for ${selectedDatetime}`,
      metadata: {
        splynxTaskId: splynxTask.id,
        customerName: validation.booking!.booking.customerName,
        workItemId: workItem.id
      }
    });
    
    res.json({
      success: true,
      splynxTaskId: splynxTask.id,
      selectedDatetime,
      confirmationMessage: validation.booking!.taskType.confirmationMessage
    });
  } catch (error: any) {
    console.error('Error confirming booking:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// NEW SLUG-BASED PUBLIC BOOKING ENDPOINTS
// These endpoints allow anyone with the link to book appointments
// ========================================

/**
 * PUBLIC ENDPOINT: Get appointment type details by slug
 * Returns public info needed to display the booking page
 */
router.get('/public/appointment-types/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Find appointment type by slug (must be active)
    const [appointmentType] = await db
      .select({
        appointmentType: bookableTaskTypes,
        organization: {
          id: organizations.id,
          name: organizations.name,
          logoUrl: organizations.logoUrl,
        }
      })
      .from(bookableTaskTypes)
      .innerJoin(organizations, eq(bookableTaskTypes.organizationId, organizations.id))
      .where(and(
        eq(bookableTaskTypes.slug, slug),
        eq(bookableTaskTypes.isActive, true)
      ))
      .limit(1);
    
    if (!appointmentType) {
      return res.status(404).json({ error: 'Appointment type not found' });
    }
    
    // Return public booking info
    res.json({
      id: appointmentType.appointmentType.id,
      name: appointmentType.appointmentType.name,
      slug: appointmentType.appointmentType.slug,
      description: appointmentType.appointmentType.description,
      taskCategory: appointmentType.appointmentType.taskCategory,
      accessMode: appointmentType.appointmentType.accessMode,
      requireCustomerAccount: appointmentType.appointmentType.requireCustomerAccount,
      duration: appointmentType.appointmentType.defaultDuration,
      buttonLabel: appointmentType.appointmentType.buttonLabel,
      confirmationMessage: appointmentType.appointmentType.confirmationMessage,
      organization: appointmentType.organization
    });
  } catch (error: any) {
    console.error('Error fetching appointment type:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUBLIC ENDPOINT: Get available slots for a slug-based appointment
 */
router.post('/public/appointment-types/:slug/available-slots', async (req, res) => {
  try {
    const { slug } = req.params;
    const { startDate, endDate } = req.body;
    
    // Find appointment type by slug
    const [appointmentType] = await db
      .select()
      .from(bookableTaskTypes)
      .where(and(
        eq(bookableTaskTypes.slug, slug),
        eq(bookableTaskTypes.isActive, true)
      ))
      .limit(1);
    
    if (!appointmentType) {
      return res.status(404).json({ error: 'Appointment type not found' });
    }
    
    // Get Splynx service
    let splynxService: SplynxService;
    try {
      splynxService = await getSplynxServiceForOrg(appointmentType.organizationId);
    } catch (error: any) {
      const isConfigError = error instanceof SplynxServiceError;
      const statusCode = isConfigError ? 503 : 500;
      console.error(`[BOOKINGS] Splynx error:`, error.message);
      return res.status(statusCode).json({ 
        error: 'Unable to fetch available slots',
        details: isConfigError ? error.message : 'Internal error'
      });
    }
    
    // Get team configuration
    const defaultAssigneeTeamId = appointmentType.defaultAssigneeTeamId;
    
    let slots: any[];
    
    // Use team availability when a team is configured (same method as calendar)
    if (defaultAssigneeTeamId) {
      console.log(`[BOOKINGS] Using team availability for team ${defaultAssigneeTeamId}`);
      const teamAvailability = await splynxService.getTeamAvailability({
        teamId: defaultAssigneeTeamId,
        projectId: appointmentType.splynxProjectId,
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        duration: appointmentType.defaultDuration || '2h 30m',
        travelTime: appointmentType.defaultTravelTimeTo || 0
      });
      slots = teamAvailability.slots;
    } else {
      // Fallback to project-level availability
      slots = await splynxService.getAvailableSlots({
        projectId: appointmentType.splynxProjectId,
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        duration: appointmentType.defaultDuration || '2h 30m',
        travelTime: appointmentType.defaultTravelTimeTo || 0
      });
    }
    
    res.json({ slots });
  } catch (error: any) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUBLIC ENDPOINT: Create a booking (slug-based)
 * Supports both open bookings (anyone) and authenticated bookings (logged-in customers)
 */
router.post('/public/appointment-types/:slug/book', async (req, res) => {
  try {
    const { slug } = req.params;
    const { 
      selectedDatetime, 
      customerName, 
      customerEmail, 
      customerPhone,
      serviceAddress,
      additionalNotes,
      authToken // Optional - for authenticated bookings
    } = req.body;
    
    // Validate required fields
    if (!selectedDatetime) {
      return res.status(400).json({ error: 'Selected datetime is required' });
    }
    if (!customerName) {
      return res.status(400).json({ error: 'Customer name is required' });
    }
    if (!customerEmail) {
      return res.status(400).json({ error: 'Customer email is required' });
    }
    
    // Find appointment type by slug
    const [appointmentType] = await db
      .select()
      .from(bookableTaskTypes)
      .where(and(
        eq(bookableTaskTypes.slug, slug),
        eq(bookableTaskTypes.isActive, true)
      ))
      .limit(1);
    
    if (!appointmentType) {
      return res.status(404).json({ error: 'Appointment type not found' });
    }
    
    // Handle access control
    let authenticatedUserId: number | null = null;
    let splynxCustomerId: number | null = null;
    
    if (appointmentType.accessMode === 'authenticated') {
      // Require valid auth token
      if (!authToken) {
        return res.status(401).json({ 
          error: 'Authentication required',
          requiresLogin: true 
        });
      }
      
      try {
        const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'fallback-secret') as any;
        authenticatedUserId = decoded.userId;
        
        // Get user and check for Splynx customer ID
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, authenticatedUserId as number))
          .limit(1);
        
        if (!user) {
          return res.status(401).json({ error: 'User not found' });
        }
        
        // Use splynxCustomerId field directly from users table
        splynxCustomerId = user.splynxCustomerId || null;
        
        if (appointmentType.requireCustomerAccount && !splynxCustomerId) {
          return res.status(403).json({ 
            error: 'This appointment type requires a linked customer account' 
          });
        }
      } catch (error) {
        return res.status(401).json({ error: 'Invalid authentication token' });
      }
    }
    
    // Get Splynx service
    let splynxService: SplynxService;
    try {
      splynxService = await getSplynxServiceForOrg(appointmentType.organizationId);
    } catch (error: any) {
      const isConfigError = error instanceof SplynxServiceError;
      const statusCode = isConfigError ? 503 : 500;
      console.error(`[BOOKINGS] Splynx error during booking:`, error.message);
      return res.status(statusCode).json({ 
        error: 'Unable to create booking - service unavailable',
        details: isConfigError ? error.message : 'Internal error'
      });
    }
    
    // If no Splynx customer ID, try to find customer by email
    let leadCreated = false;
    let leadId: number | null = null;
    
    if (!splynxCustomerId && customerEmail) {
      console.log(`[BOOKINGS] No Splynx customer ID, searching by email: ${customerEmail}`);
      
      const customerByEmail = await splynxService.searchCustomerByEmail(customerEmail);
      
      if (customerByEmail) {
        console.log(`[BOOKINGS] Found customer by email: ${customerByEmail.id} - ${customerByEmail.name}`);
        splynxCustomerId = customerByEmail.id;
      } else {
        // No customer found, create a lead
        console.log(`[BOOKINGS] No customer found, creating lead for: ${customerEmail}`);
        
        const defaultAssigneeUserId = (appointmentType as any).defaultAssigneeUserId;
        const fallbackAssigneeUserId = (appointmentType as any).fallbackAssigneeUserId;
        const assigneeForLead = fallbackAssigneeUserId || defaultAssigneeUserId;
        
        const leadResult = await splynxService.createLead({
          name: customerName,
          email: customerEmail,
          phone: customerPhone || undefined,
          address: serviceAddress || undefined,
          notes: `Created from booking: ${appointmentType.name}\n\n${additionalNotes || ''}`,
          assignedUserId: assigneeForLead || undefined,
        });
        
        if (leadResult) {
          leadCreated = true;
          leadId = leadResult.id;
          console.log(`[BOOKINGS] Lead created with ID: ${leadId}`);
        }
      }
    }
    
    // Get assignee and team configuration
    const defaultAssigneeUserId = (appointmentType as any).defaultAssigneeUserId;
    const defaultAssigneeTeamId = (appointmentType as any).defaultAssigneeTeamId;
    
    // Create Splynx task
    const splynxTask = await splynxService.createSplynxTask({
      taskName: `${appointmentType.name} - ${customerName}`,
      projectId: appointmentType.splynxProjectId,
      workflowStatusId: appointmentType.splynxWorkflowStatusId,
      customerId: splynxCustomerId || undefined,
      description: `Booking: ${appointmentType.name}\n\nCustomer: ${customerName}\nEmail: ${customerEmail}\nPhone: ${customerPhone || 'Not provided'}${leadCreated ? `\n\n⚠️ Lead created (ID: ${leadId}) - customer not found in Splynx` : ''}\n\n${additionalNotes || ''}`,
      address: serviceAddress || undefined,
      isScheduled: true,
      scheduledFrom: selectedDatetime,
      duration: appointmentType.defaultDuration || undefined,
      travelTimeTo: appointmentType.defaultTravelTimeTo || undefined,
      travelTimeFrom: appointmentType.defaultTravelTimeFrom || undefined,
      assignee: defaultAssigneeUserId || undefined,
      teamId: defaultAssigneeTeamId || undefined,
    });
    
    // Create booking record
    const [booking] = await db
      .insert(bookings)
      .values({
        organizationId: appointmentType.organizationId,
        bookableTaskTypeId: appointmentType.id,
        userId: authenticatedUserId,
        customerId: splynxCustomerId,
        customerEmail,
        customerName,
        customerPhone,
        serviceAddress,
        status: 'confirmed',
        selectedDatetime: new Date(selectedDatetime),
        additionalNotes,
        splynxTaskId: splynxTask.id,
      })
      .returning();
    
    // Log activity
    await db.insert(activityLogs).values({
      organizationId: appointmentType.organizationId,
      userId: authenticatedUserId,
      actionType: 'creation',
      entityType: 'booking',
      entityId: booking.id,
      description: `New booking: ${appointmentType.name} for ${customerName}`,
      metadata: {
        splynxTaskId: splynxTask.id,
        appointmentType: appointmentType.name,
        selectedDatetime,
        accessMode: appointmentType.accessMode
      }
    });
    
    res.json({
      success: true,
      bookingId: booking.id,
      splynxTaskId: splynxTask.id,
      selectedDatetime,
      confirmationMessage: appointmentType.confirmationMessage || `Your ${appointmentType.name} has been scheduled.`
    });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUBLIC ENDPOINT: Inline login for authenticated bookings
 * Returns auth token if credentials are valid
 */
router.post('/public/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Verify password using passwordHash field
    if (!user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const bcrypt = await import('bcrypt');
    const valid = await bcrypt.compare(password, user.passwordHash);
    
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });
  } catch (error: any) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ========================================
// ADMIN ENDPOINTS
// ========================================

/**
 * CRUD for bookable task types (Admin only)
 */
router.post('/bookable-task-types', authenticateToken, async (req, res) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;
    const data = req.body;
    
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Auto-generate slug if not provided
    const slug = data.slug || generateSlug(data.name);
    
    const [taskType] = await db
      .insert(bookableTaskTypes)
      .values({
        ...data,
        slug,
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

router.patch('/bookable-task-types/:id', authenticateToken, async (req, res) => {
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

/**
 * Get a single bookable task type with booking URL
 */
router.get('/bookable-task-types/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const [taskType] = await db
      .select()
      .from(bookableTaskTypes)
      .where(and(
        eq(bookableTaskTypes.id, parseInt(id)),
        eq(bookableTaskTypes.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!taskType) {
      return res.status(404).json({ error: 'Bookable task type not found' });
    }
    
    // Generate booking URL
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const bookingUrl = `${baseUrl}/book/${taskType.slug}`;
    
    res.json({
      ...taskType,
      bookingUrl
    });
  } catch (error: any) {
    console.error('Error fetching bookable task type:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all bookings for the organization
 */
router.get('/all-bookings', authenticateToken, async (req, res) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const allBookings = await db
      .select({
        booking: bookings,
        appointmentType: {
          id: bookableTaskTypes.id,
          name: bookableTaskTypes.name,
          slug: bookableTaskTypes.slug,
          taskCategory: bookableTaskTypes.taskCategory,
        }
      })
      .from(bookings)
      .innerJoin(bookableTaskTypes, eq(bookings.bookableTaskTypeId, bookableTaskTypes.id))
      .where(eq(bookings.organizationId, organizationId))
      .orderBy(sql`${bookings.selectedDatetime} DESC`)
      .limit(100);
    
    res.json(allBookings);
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Cancel/Update a booking
 */
router.patch('/all-bookings/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;
    const { status, additionalNotes } = req.body;
    
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get existing booking to verify ownership
    const [existingBooking] = await db
      .select()
      .from(bookings)
      .where(and(
        eq(bookings.id, parseInt(id)),
        eq(bookings.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!existingBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Build update object
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (status) {
      updateData.status = status;
      if (status === 'cancelled') {
        updateData.cancelledAt = new Date();
      }
    }
    
    if (additionalNotes !== undefined) {
      updateData.additionalNotes = additionalNotes;
    }
    
    const [updated] = await db
      .update(bookings)
      .set(updateData)
      .where(eq(bookings.id, parseInt(id)))
      .returning();
    
    // Log activity
    await db.insert(activityLogs).values({
      organizationId,
      userId,
      actionType: status === 'cancelled' ? 'deletion' : 'update',
      entityType: 'booking',
      entityId: updated.id,
      description: status === 'cancelled' 
        ? `Cancelled booking for ${existingBooking.customerName}` 
        : `Updated booking for ${existingBooking.customerName}`,
      metadata: { 
        previousStatus: existingBooking.status, 
        newStatus: status,
        customerName: existingBooking.customerName,
        customerEmail: existingBooking.customerEmail
      }
    });
    
    res.json({ success: true, booking: updated });
  } catch (error: any) {
    console.error('Error updating booking:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete a booking permanently
 */
router.delete('/all-bookings/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;
    
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get existing booking for logging
    const [existingBooking] = await db
      .select()
      .from(bookings)
      .where(and(
        eq(bookings.id, parseInt(id)),
        eq(bookings.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!existingBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const [deleted] = await db
      .delete(bookings)
      .where(eq(bookings.id, parseInt(id)))
      .returning();
    
    // Log activity
    await db.insert(activityLogs).values({
      organizationId,
      userId,
      actionType: 'deletion',
      entityType: 'booking',
      entityId: deleted.id,
      description: `Deleted booking for ${existingBooking.customerName}`,
      metadata: { 
        customerName: existingBooking.customerName,
        customerEmail: existingBooking.customerEmail,
        selectedDatetime: existingBooking.selectedDatetime
      }
    });
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/bookable-task-types/:id', authenticateToken, async (req, res) => {
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
