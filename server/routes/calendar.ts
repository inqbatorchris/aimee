import { Router, Request, Response } from 'express';
import { db } from '../db';
import { eq, and, gte, lte, desc, sql, between, inArray } from 'drizzle-orm';
import { 
  splynxTeams, 
  splynxAdministrators,
  userCalendarSettings, 
  holidayAllowances, 
  holidayRequests, 
  publicHolidays, 
  calendarBlocks,
  integrations,
  users,
  workItems,
  organizations,
  teamMembers,
  teams
} from '@shared/schema';
import { SplynxService } from '../services/integrations/splynxService';
import { authenticateToken } from '../auth';
import crypto from 'crypto';

const router = Router();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

function decrypt(text: string): string {
  if (!text || !ENCRYPTION_KEY) {
    throw new Error('Decryption not configured');
  }
  
  const parts = text.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function getSplynxServiceForOrg(organizationId: number): Promise<SplynxService> {
  const [splynxIntegration] = await db
    .select()
    .from(integrations)
    .where(and(
      eq(integrations.organizationId, organizationId),
      eq(integrations.platformType, 'splynx')
    ))
    .limit(1);
  
  if (!splynxIntegration?.credentialsEncrypted) {
    throw new Error('Splynx integration not configured');
  }
  
  const credentials = JSON.parse(decrypt(splynxIntegration.credentialsEncrypted));
  return new SplynxService({ baseUrl: credentials.baseUrl, authHeader: credentials.authHeader });
}

// ========================================
// SPLYNX SYNC ENDPOINTS
// ========================================

router.get('/calendar/splynx/teams', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const splynxService = await getSplynxServiceForOrg(organizationId);
    
    const teams = await splynxService.getSchedulingTeams();
    
    console.log(`[CALENDAR] Fetched ${teams.length} teams from Splynx`);
    
    res.json({ 
      success: true, 
      teams,
      count: teams.length 
    });
  } catch (error: any) {
    console.error('[CALENDAR] Error fetching teams:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/calendar/splynx/sync-teams', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const splynxService = await getSplynxServiceForOrg(organizationId);
    
    const teams = await splynxService.getSchedulingTeams();
    
    for (const team of teams) {
      const existing = await db
        .select()
        .from(splynxTeams)
        .where(and(
          eq(splynxTeams.organizationId, organizationId),
          eq(splynxTeams.splynxTeamId, team.id)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        await db
          .update(splynxTeams)
          .set({
            title: team.title,
            partnerId: team.partnerId,
            color: team.color,
            memberIds: team.memberIds,
            lastFetchedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(splynxTeams.id, existing[0].id));
      } else {
        await db.insert(splynxTeams).values({
          organizationId,
          splynxTeamId: team.id,
          title: team.title,
          partnerId: team.partnerId,
          color: team.color,
          memberIds: team.memberIds,
        });
      }
    }
    
    console.log(`[CALENDAR] Synced ${teams.length} teams from Splynx`);
    
    res.json({ 
      success: true, 
      message: `Synced ${teams.length} teams`,
      teams 
    });
  } catch (error: any) {
    console.error('[CALENDAR] Error syncing teams:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/calendar/splynx/sync-admins', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const splynxService = await getSplynxServiceForOrg(organizationId);
    
    const admins = await splynxService.getAdministrators();
    
    for (const admin of admins) {
      const existing = await db
        .select()
        .from(splynxAdministrators)
        .where(and(
          eq(splynxAdministrators.organizationId, organizationId),
          eq(splynxAdministrators.splynxAdminId, parseInt(admin.id))
        ))
        .limit(1);
      
      if (existing.length > 0) {
        await db
          .update(splynxAdministrators)
          .set({
            login: admin.login,
            fullName: admin.name || admin.full_name,
            email: admin.email,
            partnerId: admin.partner_id ? parseInt(admin.partner_id) : null,
            role: admin.role || admin.role_id?.toString(),
            isActive: admin.is_active !== false && admin.is_active !== 0,
            lastFetchedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(splynxAdministrators.id, existing[0].id));
      } else {
        await db.insert(splynxAdministrators).values({
          organizationId,
          splynxAdminId: parseInt(admin.id),
          login: admin.login,
          fullName: admin.name || admin.full_name,
          email: admin.email,
          partnerId: admin.partner_id ? parseInt(admin.partner_id) : null,
          role: admin.role || admin.role_id?.toString(),
          isActive: admin.is_active !== false && admin.is_active !== 0,
        });
      }
    }
    
    console.log(`[CALENDAR] Synced ${admins.length} administrators from Splynx`);
    
    res.json({ 
      success: true, 
      message: `Synced ${admins.length} administrators`,
      count: admins.length 
    });
  } catch (error: any) {
    console.error('[CALENDAR] Error syncing admins:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/calendar/splynx/admins', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    
    const admins = await db
      .select()
      .from(splynxAdministrators)
      .where(eq(splynxAdministrators.organizationId, organizationId));
    
    res.json({ success: true, admins, count: admins.length });
  } catch (error: any) {
    console.error('[CALENDAR] Error fetching cached admins:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/calendar/splynx/tasks', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { assigneeId, dateFrom, dateTo, projectId } = req.query;
    
    const splynxService = await getSplynxServiceForOrg(organizationId);
    
    const tasks = await splynxService.getSchedulingTasks({
      assignedAdminId: assigneeId ? parseInt(assigneeId as string) : undefined,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      project_id: projectId ? parseInt(projectId as string) : undefined,
    });
    
    console.log(`[CALENDAR] Fetched ${tasks.length} tasks from Splynx`);
    
    res.json({ success: true, tasks, count: tasks.length });
  } catch (error: any) {
    console.error('[CALENDAR] Error fetching tasks:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/calendar/splynx/tasks/:taskId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { taskId } = req.params;
    
    const splynxService = await getSplynxServiceForOrg(organizationId);
    const task = await splynxService.getSchedulingTask(taskId);
    
    let customer = null;
    if (task.related_customer_id || task.customer_id) {
      try {
        customer = await splynxService.getCustomerById(parseInt(task.related_customer_id || task.customer_id));
      } catch (e) {
        console.log(`[CALENDAR] Could not fetch customer for task ${taskId}`);
      }
    }
    
    res.json({ success: true, task, customer });
  } catch (error: any) {
    console.error('[CALENDAR] Error fetching single task:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/calendar/splynx/tasks/:taskId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { taskId } = req.params;
    const updates = req.body;
    
    const splynxService = await getSplynxServiceForOrg(organizationId);
    const result = await splynxService.updateSchedulingTask(taskId, updates);
    
    res.json({ success: true, task: result });
  } catch (error: any) {
    console.error('[CALENDAR] Error updating task:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/calendar/splynx/customers/:customerId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { customerId } = req.params;
    
    const splynxService = await getSplynxServiceForOrg(organizationId);
    const customer = await splynxService.getCustomerById(parseInt(customerId));
    
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    
    res.json({ success: true, customer });
  } catch (error: any) {
    console.error('[CALENDAR] Error fetching customer:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// AVAILABILITY ENDPOINTS
// ========================================

router.get('/calendar/availability/assignee/:assigneeId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { assigneeId } = req.params;
    const { startDate, endDate, duration, travelTime, projectId } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        error: 'startDate and endDate are required' 
      });
    }
    
    const splynxService = await getSplynxServiceForOrg(organizationId);
    
    const slots = await splynxService.getAvailableSlotsByAssignee({
      assigneeId: parseInt(assigneeId),
      projectId: projectId ? parseInt(projectId as string) : undefined,
      startDate: startDate as string,
      endDate: endDate as string,
      duration: (duration as string) || '1h',
      travelTime: travelTime ? parseInt(travelTime as string) : 0,
    });
    
    console.log(`[CALENDAR] Generated ${slots.length} available slots for assignee ${assigneeId}`);
    
    res.json({ success: true, slots, count: slots.length });
  } catch (error: any) {
    console.error('[CALENDAR] Error getting assignee availability:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/calendar/availability/team/:teamId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { teamId } = req.params;
    const { startDate, endDate, duration, travelTime, projectId } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        error: 'startDate and endDate are required' 
      });
    }
    
    const splynxService = await getSplynxServiceForOrg(organizationId);
    
    const result = await splynxService.getTeamAvailability({
      teamId: parseInt(teamId),
      projectId: projectId ? parseInt(projectId as string) : undefined,
      startDate: startDate as string,
      endDate: endDate as string,
      duration: (duration as string) || '1h',
      travelTime: travelTime ? parseInt(travelTime as string) : 0,
    });
    
    console.log(`[CALENDAR] Generated ${result.slots.length} team availability slots`);
    
    res.json({ 
      success: true, 
      slots: result.slots, 
      memberAvailability: result.memberAvailability,
      count: result.slots.length 
    });
  } catch (error: any) {
    console.error('[CALENDAR] Error getting team availability:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// USER CALENDAR SETTINGS
// ========================================

router.get('/calendar/settings', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const [settings] = await db
      .select()
      .from(userCalendarSettings)
      .where(eq(userCalendarSettings.userId, userId))
      .limit(1);
    
    if (!settings) {
      return res.json({ success: true, settings: null });
    }
    
    res.json({ success: true, settings });
  } catch (error: any) {
    console.error('[CALENDAR] Error fetching user settings:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/calendar/settings', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const organizationId = (req as any).user.organizationId;
    const { 
      splynxAdminId, 
      workingHours, 
      timezone, 
      emergencyContact1, 
      emergencyContact2,
      medicalNotes,
      preferredCommunication,
      outOfHoursContact,
      outOfHoursConditions,
      meetingPreference
    } = req.body;
    
    const [existing] = await db
      .select()
      .from(userCalendarSettings)
      .where(eq(userCalendarSettings.userId, userId))
      .limit(1);
    
    if (existing) {
      await db
        .update(userCalendarSettings)
        .set({
          splynxAdminId,
          workingHours,
          timezone,
          emergencyContact1,
          emergencyContact2,
          medicalNotes,
          preferredCommunication,
          outOfHoursContact,
          outOfHoursConditions,
          meetingPreference,
          updatedAt: new Date(),
        })
        .where(eq(userCalendarSettings.id, existing.id));
      
      res.json({ success: true, message: 'Settings updated' });
    } else {
      await db.insert(userCalendarSettings).values({
        userId,
        organizationId,
        splynxAdminId,
        workingHours,
        timezone,
        emergencyContact1,
        emergencyContact2,
        medicalNotes,
        preferredCommunication,
        outOfHoursContact,
        outOfHoursConditions,
        meetingPreference,
      });
      
      res.json({ success: true, message: 'Settings created' });
    }
  } catch (error: any) {
    console.error('[CALENDAR] Error saving user settings:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// HOLIDAY ALLOWANCES
// ========================================

router.get('/calendar/holidays/allowance', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    
    const [allowance] = await db
      .select()
      .from(holidayAllowances)
      .where(and(
        eq(holidayAllowances.userId, userId),
        eq(holidayAllowances.year, year)
      ))
      .limit(1);
    
    if (!allowance) {
      return res.json({ 
        success: true, 
        allowance: null,
        message: 'No allowance configured for this year'
      });
    }
    
    const totalAvailable = parseFloat(allowance.annualAllowance as any) + parseFloat(allowance.carriedOver as any || '0');
    const remaining = totalAvailable - parseFloat(allowance.usedDays as any || '0') - parseFloat(allowance.pendingDays as any || '0');
    
    res.json({ 
      success: true, 
      allowance: {
        ...allowance,
        totalAvailable,
        remaining,
        percentUsed: Math.round((parseFloat(allowance.usedDays as any || '0') / totalAvailable) * 100)
      }
    });
  } catch (error: any) {
    console.error('[CALENDAR] Error fetching allowance:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/calendar/holidays/allowance', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { userId, year, annualAllowance, carriedOver, maxCarryover, carryoverExpiry } = req.body;
    
    const [existing] = await db
      .select()
      .from(holidayAllowances)
      .where(and(
        eq(holidayAllowances.userId, userId),
        eq(holidayAllowances.year, year)
      ))
      .limit(1);
    
    if (existing) {
      await db
        .update(holidayAllowances)
        .set({
          annualAllowance: annualAllowance?.toString(),
          carriedOver: carriedOver?.toString(),
          maxCarryover: maxCarryover?.toString(),
          carryoverExpiry,
          updatedAt: new Date(),
        })
        .where(eq(holidayAllowances.id, existing.id));
      
      res.json({ success: true, message: 'Allowance updated' });
    } else {
      await db.insert(holidayAllowances).values({
        userId,
        organizationId,
        year,
        annualAllowance: annualAllowance?.toString() || '25',
        carriedOver: carriedOver?.toString() || '0',
        maxCarryover: maxCarryover?.toString() || '5',
        carryoverExpiry,
      });
      
      res.json({ success: true, message: 'Allowance created' });
    }
  } catch (error: any) {
    console.error('[CALENDAR] Error saving allowance:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// HOLIDAY REQUESTS
// ========================================

router.get('/calendar/holidays/requests', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const userId = (req as any).user.id;
    const { status, startDate, endDate, myRequests } = req.query;
    
    let query = db
      .select({
        request: holidayRequests,
        user: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
        }
      })
      .from(holidayRequests)
      .leftJoin(users, eq(holidayRequests.userId, users.id))
      .where(eq(holidayRequests.organizationId, organizationId))
      .$dynamic();
    
    if (myRequests === 'true') {
      query = query.where(eq(holidayRequests.userId, userId));
    }
    
    if (status) {
      query = query.where(eq(holidayRequests.status, status as any));
    }
    
    const requests = await query.orderBy(desc(holidayRequests.createdAt));
    
    res.json({ success: true, requests, count: requests.length });
  } catch (error: any) {
    console.error('[CALENDAR] Error fetching holiday requests:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/calendar/holidays/requests', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const organizationId = (req as any).user.organizationId;
    const { startDate, endDate, daysCount, holidayType, notes, isHalfDayStart, isHalfDayEnd } = req.body;
    
    const [newRequest] = await db.insert(holidayRequests).values({
      userId,
      organizationId,
      startDate,
      endDate,
      daysCount: daysCount.toString(),
      holidayType: holidayType || 'annual',
      notes,
      isHalfDayStart: isHalfDayStart || false,
      isHalfDayEnd: isHalfDayEnd || false,
      status: 'pending',
    }).returning();
    
    const year = new Date(startDate).getFullYear();
    await db
      .update(holidayAllowances)
      .set({
        pendingDays: sql`pending_days + ${daysCount}`,
        updatedAt: new Date(),
      })
      .where(and(
        eq(holidayAllowances.userId, userId),
        eq(holidayAllowances.year, year)
      ));
    
    res.json({ success: true, request: newRequest });
  } catch (error: any) {
    console.error('[CALENDAR] Error creating holiday request:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/calendar/holidays/requests/:id/approve', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const approverId = (req as any).user.id;
    
    const [request] = await db
      .select()
      .from(holidayRequests)
      .where(eq(holidayRequests.id, parseInt(id)))
      .limit(1);
    
    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }
    
    await db
      .update(holidayRequests)
      .set({
        status: 'approved',
        approverId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(holidayRequests.id, parseInt(id)));
    
    const year = new Date(request.startDate).getFullYear();
    await db
      .update(holidayAllowances)
      .set({
        pendingDays: sql`pending_days - ${request.daysCount}`,
        usedDays: sql`used_days + ${request.daysCount}`,
        updatedAt: new Date(),
      })
      .where(and(
        eq(holidayAllowances.userId, request.userId),
        eq(holidayAllowances.year, year)
      ));
    
    res.json({ success: true, message: 'Request approved' });
  } catch (error: any) {
    console.error('[CALENDAR] Error approving request:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/calendar/holidays/requests/:id/reject', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const approverId = (req as any).user.id;
    const { rejectionReason } = req.body;
    
    const [request] = await db
      .select()
      .from(holidayRequests)
      .where(eq(holidayRequests.id, parseInt(id)))
      .limit(1);
    
    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }
    
    await db
      .update(holidayRequests)
      .set({
        status: 'rejected',
        approverId,
        rejectedAt: new Date(),
        rejectionReason,
        updatedAt: new Date(),
      })
      .where(eq(holidayRequests.id, parseInt(id)));
    
    const year = new Date(request.startDate).getFullYear();
    await db
      .update(holidayAllowances)
      .set({
        pendingDays: sql`pending_days - ${request.daysCount}`,
        updatedAt: new Date(),
      })
      .where(and(
        eq(holidayAllowances.userId, request.userId),
        eq(holidayAllowances.year, year)
      ));
    
    res.json({ success: true, message: 'Request rejected' });
  } catch (error: any) {
    console.error('[CALENDAR] Error rejecting request:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// PUBLIC HOLIDAYS
// ========================================

router.get('/calendar/public-holidays', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { year } = req.query;
    
    let query = db
      .select()
      .from(publicHolidays)
      .where(eq(publicHolidays.organizationId, organizationId))
      .$dynamic();
    
    if (year) {
      const startOfYear = `${year}-01-01`;
      const endOfYear = `${year}-12-31`;
      query = query.where(
        and(
          gte(publicHolidays.date, startOfYear),
          lte(publicHolidays.date, endOfYear)
        )
      );
    }
    
    const holidays = await query.orderBy(publicHolidays.date);
    
    res.json({ success: true, holidays, count: holidays.length });
  } catch (error: any) {
    console.error('[CALENDAR] Error fetching public holidays:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/calendar/public-holidays', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { name, date, isRecurring, locationId, country, region } = req.body;
    
    const [holiday] = await db.insert(publicHolidays).values({
      organizationId,
      name,
      date,
      isRecurring: isRecurring ?? true,
      locationId,
      country,
      region,
    }).returning();
    
    res.json({ success: true, holiday });
  } catch (error: any) {
    console.error('[CALENDAR] Error creating public holiday:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/calendar/public-holidays/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await db.delete(publicHolidays).where(eq(publicHolidays.id, parseInt(id)));
    
    res.json({ success: true, message: 'Holiday deleted' });
  } catch (error: any) {
    console.error('[CALENDAR] Error deleting public holiday:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// CALENDAR BLOCKS
// ========================================

router.get('/calendar/blocks', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const userId = (req as any).user.id;
    const { startDate, endDate, userIds } = req.query;
    
    let query = db
      .select({
        block: calendarBlocks,
        user: {
          id: users.id,
          fullName: users.fullName,
        }
      })
      .from(calendarBlocks)
      .leftJoin(users, eq(calendarBlocks.userId, users.id))
      .where(eq(calendarBlocks.organizationId, organizationId))
      .$dynamic();
    
    if (startDate && endDate) {
      query = query.where(
        and(
          gte(calendarBlocks.startDatetime, new Date(startDate as string)),
          lte(calendarBlocks.endDatetime, new Date(endDate as string))
        )
      );
    }
    
    const blocks = await query.orderBy(calendarBlocks.startDatetime);
    
    res.json({ success: true, blocks, count: blocks.length });
  } catch (error: any) {
    console.error('[CALENDAR] Error fetching blocks:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/calendar/blocks', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const organizationId = (req as any).user.organizationId;
    const { 
      title, 
      description, 
      blockType, 
      startDatetime, 
      endDatetime, 
      isAllDay, 
      isRecurring,
      recurrenceRule,
      recurrenceEndDate,
      isPrivate,
      blocksAvailability,
      color
    } = req.body;
    
    const [block] = await db.insert(calendarBlocks).values({
      userId,
      organizationId,
      title,
      description,
      blockType: blockType || 'other',
      startDatetime: new Date(startDatetime),
      endDatetime: new Date(endDatetime),
      isAllDay: isAllDay || false,
      isRecurring: isRecurring || false,
      recurrenceRule,
      recurrenceEndDate,
      isPrivate: isPrivate || false,
      blocksAvailability: blocksAvailability ?? true,
      color,
      createdBy: userId,
    }).returning();
    
    res.json({ success: true, block });
  } catch (error: any) {
    console.error('[CALENDAR] Error creating block:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/calendar/blocks/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      blockType, 
      startDatetime, 
      endDatetime, 
      isAllDay,
      isPrivate,
      blocksAvailability,
      color
    } = req.body;
    
    await db
      .update(calendarBlocks)
      .set({
        title,
        description,
        blockType,
        startDatetime: startDatetime ? new Date(startDatetime) : undefined,
        endDatetime: endDatetime ? new Date(endDatetime) : undefined,
        isAllDay,
        isPrivate,
        blocksAvailability,
        color,
        updatedAt: new Date(),
      })
      .where(eq(calendarBlocks.id, parseInt(id)));
    
    res.json({ success: true, message: 'Block updated' });
  } catch (error: any) {
    console.error('[CALENDAR] Error updating block:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/calendar/blocks/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await db.delete(calendarBlocks).where(eq(calendarBlocks.id, parseInt(id)));
    
    res.json({ success: true, message: 'Block deleted' });
  } catch (error: any) {
    console.error('[CALENDAR] Error deleting block:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// WORK ITEMS OVERLAY
// ========================================

router.get('/calendar/work-items', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { startDate, endDate, assigneeIds, status } = req.query;
    
    let query = db
      .select({
        id: workItems.id,
        title: workItems.title,
        status: workItems.status,
        dueDate: workItems.dueDate,
        assignedTo: workItems.assignedTo,
      })
      .from(workItems)
      .where(eq(workItems.organizationId, organizationId))
      .$dynamic();
    
    if (startDate && endDate) {
      query = query.where(
        and(
          gte(workItems.dueDate, startDate as string),
          lte(workItems.dueDate, endDate as string)
        )
      );
    }
    
    if (status) {
      query = query.where(eq(workItems.status, status as any));
    }
    
    const items = await query.orderBy(workItems.dueDate);
    
    res.json({ success: true, workItems: items, count: items.length });
  } catch (error: any) {
    console.error('[CALENDAR] Error fetching work items:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// CALENDAR FILTERS (teams, users, sources)
// ========================================

router.get('/calendar/filters', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    
    const localTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
      })
      .from(teams)
      .where(eq(teams.organizationId, organizationId));
    
    const splynxTeamsData = await db
      .select({
        id: splynxTeams.id,
        splynxTeamId: splynxTeams.splynxTeamId,
        title: splynxTeams.title,
        color: splynxTeams.color,
        memberIds: splynxTeams.memberIds,
        lastFetchedAt: splynxTeams.lastFetchedAt,
      })
      .from(splynxTeams)
      .where(eq(splynxTeams.organizationId, organizationId));
    
    const localUsers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.organizationId, organizationId));
    
    const splynxAdmins = await db
      .select({
        id: splynxAdministrators.id,
        splynxAdminId: splynxAdministrators.splynxAdminId,
        fullName: splynxAdministrators.fullName,
        email: splynxAdministrators.email,
        isActive: splynxAdministrators.isActive,
        lastFetchedAt: splynxAdministrators.lastFetchedAt,
      })
      .from(splynxAdministrators)
      .where(eq(splynxAdministrators.organizationId, organizationId));
    
    const localTeamMemberships = await db
      .select({
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teams.organizationId, organizationId));
    
    const userCalSettings = await db
      .select({
        userId: userCalendarSettings.userId,
        splynxAdminId: userCalendarSettings.splynxAdminId,
      })
      .from(userCalendarSettings)
      .where(eq(userCalendarSettings.organizationId, organizationId));
    
    const userToSplynxMap: Record<number, number> = {};
    for (const setting of userCalSettings) {
      if (setting.splynxAdminId) {
        userToSplynxMap[setting.userId] = setting.splynxAdminId;
      }
    }
    
    res.json({
      success: true,
      filters: {
        localTeams: localTeams.map(t => ({ id: t.id, name: t.name, source: 'local' })),
        splynxTeams: splynxTeamsData.map(t => ({ 
          id: t.id, 
          splynxTeamId: t.splynxTeamId,
          name: t.title,
          color: t.color,
          memberIds: t.memberIds,
          source: 'splynx',
          lastSynced: t.lastFetchedAt,
        })),
        localUsers: localUsers.map(u => ({ 
          id: u.id, 
          name: u.fullName || u.email, 
          email: u.email,
          isActive: u.isActive,
          source: 'local',
          splynxAdminId: userToSplynxMap[u.id],
        })),
        splynxAdmins: splynxAdmins.map(a => ({
          id: a.id,
          splynxAdminId: a.splynxAdminId,
          name: a.fullName,
          email: a.email,
          isActive: a.isActive,
          source: 'splynx',
          lastSynced: a.lastFetchedAt,
        })),
        teamMemberships: localTeamMemberships,
        dataSources: ['splynx_tasks', 'work_items', 'holidays', 'blocks'],
      }
    });
  } catch (error: any) {
    console.error('[CALENDAR] Error fetching filters:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// COMBINED CALENDAR DATA
// ========================================

interface NormalizedCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  type: 'splynx_task' | 'work_item' | 'holiday' | 'public_holiday' | 'block';
  color: string;
  userId?: number;
  userName?: string;
  splynxAdminId?: number;
  status?: string;
  source: string;
  metadata?: any;
}

router.get('/calendar/combined', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const userId = (req as any).user.id;
    const { 
      startDate, 
      endDate, 
      userIds, 
      teamIds,
      splynxTeamIds,
      splynxAdminIds,
      sources,
      includeWorkItems = 'true', 
      includeSplynxTasks = 'true',
      includeHolidays = 'true',
      includeBlocks = 'true',
    } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        error: 'startDate and endDate are required' 
      });
    }
    
    const events: NormalizedCalendarEvent[] = [];
    const errors: string[] = [];
    const metadata: any = {
      range: { startDate, endDate },
      lastSync: new Date().toISOString(),
      counts: { splynxTasks: 0, workItems: 0, holidays: 0, publicHolidays: 0, blocks: 0 },
      filtersApplied: { userIds, teamIds, splynxTeamIds, splynxAdminIds, sources },
    };
    
    const parsedUserIds = userIds ? (userIds as string).split(',').map(Number).filter(n => !isNaN(n)) : [];
    const parsedTeamIds = teamIds ? (teamIds as string).split(',').map(Number).filter(n => !isNaN(n)) : [];
    const parsedSplynxAdminIds = splynxAdminIds ? (splynxAdminIds as string).split(',').map(Number).filter(n => !isNaN(n)) : [];
    
    let userIdsFromTeams: number[] = [];
    if (parsedTeamIds.length > 0) {
      const memberships = await db
        .select({ userId: teamMembers.userId })
        .from(teamMembers)
        .where(inArray(teamMembers.teamId, parsedTeamIds));
      userIdsFromTeams = memberships.map(m => m.userId);
    }
    
    const effectiveUserIds = Array.from(new Set([...parsedUserIds, ...userIdsFromTeams]));
    
    const userCalSettings = await db
      .select()
      .from(userCalendarSettings)
      .where(eq(userCalendarSettings.organizationId, organizationId));
    const userToSplynxMap: Record<number, number> = {};
    const splynxToUserMap: Record<number, number> = {};
    for (const s of userCalSettings) {
      if (s.splynxAdminId) {
        userToSplynxMap[s.userId] = s.splynxAdminId;
        splynxToUserMap[s.splynxAdminId] = s.userId;
      }
    }
    
    let effectiveSplynxAdminIds = [...parsedSplynxAdminIds];
    if (effectiveUserIds.length > 0) {
      for (const uid of effectiveUserIds) {
        if (userToSplynxMap[uid]) {
          effectiveSplynxAdminIds.push(userToSplynxMap[uid]);
        }
      }
      effectiveSplynxAdminIds = Array.from(new Set(effectiveSplynxAdminIds));
    }
    
    const usersMap: Record<number, { fullName: string; email: string }> = {};
    const allUsers = await db.select().from(users).where(eq(users.organizationId, organizationId));
    for (const u of allUsers) {
      usersMap[u.id] = { fullName: u.fullName || '', email: u.email };
    }
    
    const adminsMap: Record<number, { fullName: string; email: string }> = {};
    const allAdmins = await db.select().from(splynxAdministrators).where(eq(splynxAdministrators.organizationId, organizationId));
    for (const a of allAdmins) {
      adminsMap[a.splynxAdminId] = { fullName: a.fullName || '', email: a.email || '' };
    }
    
    if (includeBlocks === 'true') {
      try {
        let blocksQuery = db
          .select()
          .from(calendarBlocks)
          .where(and(
            eq(calendarBlocks.organizationId, organizationId),
            gte(calendarBlocks.startDatetime, new Date(startDate as string)),
            lte(calendarBlocks.endDatetime, new Date(endDate as string))
          ))
          .$dynamic();
        
        if (effectiveUserIds.length > 0) {
          blocksQuery = blocksQuery.where(inArray(calendarBlocks.userId, effectiveUserIds));
        }
        
        const blocks = await blocksQuery;
        for (const b of blocks) {
          events.push({
            id: `block-${b.id}`,
            title: b.title || b.blockType,
            start: b.startDatetime.toISOString(),
            end: b.endDatetime.toISOString(),
            allDay: b.isAllDay || false,
            type: 'block',
            color: '#F97316',
            userId: b.userId,
            userName: usersMap[b.userId]?.fullName || usersMap[b.userId]?.email,
            source: 'local',
            metadata: { blockType: b.blockType, isRecurring: b.isRecurring, description: b.description },
          });
        }
        metadata.counts.blocks = blocks.length;
      } catch (e: any) {
        errors.push(`Blocks: ${e.message}`);
      }
    }
    
    if (includeHolidays === 'true') {
      try {
        let requestsQuery = db
          .select()
          .from(holidayRequests)
          .where(and(
            eq(holidayRequests.organizationId, organizationId),
            eq(holidayRequests.status, 'approved'),
            lte(holidayRequests.startDate, endDate as string),
            gte(holidayRequests.endDate, startDate as string)
          ))
          .$dynamic();
        
        if (effectiveUserIds.length > 0) {
          requestsQuery = requestsQuery.where(inArray(holidayRequests.userId, effectiveUserIds));
        }
        
        const requests = await requestsQuery;
        for (const r of requests) {
          events.push({
            id: `holiday-${r.id}`,
            title: `${usersMap[r.userId]?.fullName || 'User'} - ${r.holidayType || 'Leave'}`,
            start: r.startDate,
            end: r.endDate,
            allDay: true,
            type: 'holiday',
            color: '#22C55E',
            userId: r.userId,
            userName: usersMap[r.userId]?.fullName || usersMap[r.userId]?.email,
            status: r.status,
            source: 'local',
            metadata: { holidayType: r.holidayType, daysCount: r.daysCount, notes: r.notes },
          });
        }
        metadata.counts.holidays = requests.length;
        
        const publicHols = await db
          .select()
          .from(publicHolidays)
          .where(and(
            eq(publicHolidays.organizationId, organizationId),
            gte(publicHolidays.date, startDate as string),
            lte(publicHolidays.date, endDate as string)
          ));
        
        for (const h of publicHols) {
          events.push({
            id: `public-holiday-${h.id}`,
            title: h.name,
            start: h.date,
            end: h.date,
            allDay: true,
            type: 'public_holiday',
            color: '#10B981',
            source: 'local',
            metadata: { region: h.region, country: h.country },
          });
        }
        metadata.counts.publicHolidays = publicHols.length;
      } catch (e: any) {
        errors.push(`Holidays: ${e.message}`);
      }
    }
    
    if (includeWorkItems === 'true') {
      try {
        let wiQuery = db
          .select()
          .from(workItems)
          .where(and(
            eq(workItems.organizationId, organizationId),
            gte(workItems.dueDate, startDate as string),
            lte(workItems.dueDate, endDate as string)
          ))
          .$dynamic();
        
        if (effectiveUserIds.length > 0) {
          wiQuery = wiQuery.where(inArray(workItems.assignedTo, effectiveUserIds));
        }
        if (parsedTeamIds.length > 0) {
          wiQuery = wiQuery.where(inArray(workItems.teamId, parsedTeamIds));
        }
        
        const workItemsData = await wiQuery;
        for (const wi of workItemsData) {
          events.push({
            id: `work-item-${wi.id}`,
            title: wi.title,
            start: wi.dueDate || '',
            end: wi.dueDate || '',
            allDay: true,
            type: 'work_item',
            color: '#8B5CF6',
            userId: wi.assignedTo || undefined,
            userName: wi.assignedTo ? (usersMap[wi.assignedTo]?.fullName || usersMap[wi.assignedTo]?.email) : undefined,
            status: wi.status,
            source: 'local',
            metadata: { 
              workItemId: wi.id,
              teamId: wi.teamId, 
              workItemType: wi.workItemType,
              workflowTemplateId: wi.workflowTemplateId,
              description: wi.description,
            },
          });
        }
        metadata.counts.workItems = workItemsData.length;
      } catch (e: any) {
        errors.push(`Work Items: ${e.message}`);
      }
    }
    
    if (includeSplynxTasks === 'true') {
      try {
        const splynxService = await getSplynxServiceForOrg(organizationId);
        const tasks = await splynxService.getSchedulingTasks({
          assignedAdminId: effectiveSplynxAdminIds.length === 1 ? effectiveSplynxAdminIds[0] : undefined,
        });
        
        const startDateObj = new Date(startDate as string);
        const endDateObj = new Date(endDate as string);
        endDateObj.setHours(23, 59, 59, 999);
        
        console.log(`[CALENDAR] Filtering ${tasks.length} Splynx tasks for date range: ${startDate} to ${endDate}`);
        
        let filteredTasks = tasks.filter((t: any) => {
          const taskDate = t.scheduled_date || t.scheduled_from?.split(' ')[0];
          if (!taskDate) return false;
          const taskDateObj = new Date(taskDate);
          return taskDateObj >= startDateObj && taskDateObj <= endDateObj;
        });
        
        console.log(`[CALENDAR] After date filtering: ${filteredTasks.length} tasks`);
        
        if (effectiveSplynxAdminIds.length > 1) {
          filteredTasks = filteredTasks.filter((t: any) => 
            effectiveSplynxAdminIds.includes(parseInt(t.assigned_to || t.assigned_admin_id || '0'))
          );
        } else if (effectiveSplynxAdminIds.length === 0 && effectiveUserIds.length > 0) {
          filteredTasks = [];
        }
        
        for (const t of filteredTasks) {
          const adminId = parseInt(t.assigned_to || t.assigned_admin_id || '0');
          const taskStart = t.scheduled_date ? `${t.scheduled_date}T${t.scheduled_time || '09:00'}:00` : '';
          const duration = parseInt(t.scheduled_duration_hours || '1') * 60 + parseInt(t.scheduled_duration_minutes || '0');
          const taskEnd = taskStart ? new Date(new Date(taskStart).getTime() + duration * 60000).toISOString() : '';
          
          events.push({
            id: `splynx-task-${t.id}`,
            title: t.title || t.description || 'Splynx Task',
            start: taskStart,
            end: taskEnd,
            allDay: false,
            type: 'splynx_task',
            color: '#3B82F6',
            splynxAdminId: adminId,
            userName: adminsMap[adminId]?.fullName || `Admin ${adminId}`,
            userId: splynxToUserMap[adminId],
            status: t.status || t.workflow_status_id?.toString(),
            source: 'splynx',
            metadata: {
              projectId: t.project_id,
              customerId: t.customer_id,
              location: t.location,
              workflowStatusId: t.workflow_status_id,
            },
          });
        }
        metadata.counts.splynxTasks = filteredTasks.length;
        metadata.splynxLastSync = new Date().toISOString();
      } catch (e: any) {
        errors.push(`Splynx Tasks: ${e.message}`);
        metadata.splynxError = e.message;
      }
    }
    
    res.json({
      success: true,
      events,
      metadata: {
        ...metadata,
        totalEvents: events.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error: any) {
    console.error('[CALENDAR] Error fetching combined data:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// TEST ENDPOINT
// ========================================

router.get('/calendar/test', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const tests: { name: string; status: 'pass' | 'fail'; message: string }[] = [];
    
    try {
      const splynxService = await getSplynxServiceForOrg(organizationId);
      const admins = await splynxService.getAdministrators();
      tests.push({ 
        name: 'Splynx Administrators', 
        status: 'pass', 
        message: `Found ${admins.length} administrators` 
      });
    } catch (e: any) {
      tests.push({ name: 'Splynx Administrators', status: 'fail', message: e.message });
    }
    
    try {
      const splynxService = await getSplynxServiceForOrg(organizationId);
      const teams = await splynxService.getSchedulingTeams();
      tests.push({ 
        name: 'Splynx Teams', 
        status: 'pass', 
        message: `Found ${teams.length} teams` 
      });
    } catch (e: any) {
      tests.push({ name: 'Splynx Teams', status: 'fail', message: e.message });
    }
    
    try {
      const splynxService = await getSplynxServiceForOrg(organizationId);
      const tasks = await splynxService.getSchedulingTasks({
        dateFrom: new Date().toISOString().split('T')[0],
        dateTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      tests.push({ 
        name: 'Splynx Tasks', 
        status: 'pass', 
        message: `Found ${tasks.length} tasks for next 7 days` 
      });
    } catch (e: any) {
      tests.push({ name: 'Splynx Tasks', status: 'fail', message: e.message });
    }
    
    try {
      const cachedTeams = await db.select().from(splynxTeams).where(eq(splynxTeams.organizationId, organizationId));
      tests.push({ 
        name: 'Cached Teams Table', 
        status: 'pass', 
        message: `Table exists with ${cachedTeams.length} cached teams` 
      });
    } catch (e: any) {
      tests.push({ name: 'Cached Teams Table', status: 'fail', message: e.message });
    }
    
    try {
      const settings = await db.select().from(userCalendarSettings).limit(1);
      tests.push({ 
        name: 'Calendar Settings Table', 
        status: 'pass', 
        message: 'Table exists and accessible' 
      });
    } catch (e: any) {
      tests.push({ name: 'Calendar Settings Table', status: 'fail', message: e.message });
    }
    
    try {
      const allowances = await db.select().from(holidayAllowances).limit(1);
      tests.push({ 
        name: 'Holiday Allowances Table', 
        status: 'pass', 
        message: 'Table exists and accessible' 
      });
    } catch (e: any) {
      tests.push({ name: 'Holiday Allowances Table', status: 'fail', message: e.message });
    }
    
    try {
      const requests = await db.select().from(holidayRequests).limit(1);
      tests.push({ 
        name: 'Holiday Requests Table', 
        status: 'pass', 
        message: 'Table exists and accessible' 
      });
    } catch (e: any) {
      tests.push({ name: 'Holiday Requests Table', status: 'fail', message: e.message });
    }
    
    try {
      const holidays = await db.select().from(publicHolidays).limit(1);
      tests.push({ 
        name: 'Public Holidays Table', 
        status: 'pass', 
        message: 'Table exists and accessible' 
      });
    } catch (e: any) {
      tests.push({ name: 'Public Holidays Table', status: 'fail', message: e.message });
    }
    
    try {
      const blocks = await db.select().from(calendarBlocks).limit(1);
      tests.push({ 
        name: 'Calendar Blocks Table', 
        status: 'pass', 
        message: 'Table exists and accessible' 
      });
    } catch (e: any) {
      tests.push({ name: 'Calendar Blocks Table', status: 'fail', message: e.message });
    }
    
    const passCount = tests.filter(t => t.status === 'pass').length;
    const failCount = tests.filter(t => t.status === 'fail').length;
    
    res.json({
      success: failCount === 0,
      summary: `${passCount} passed, ${failCount} failed`,
      tests,
    });
  } catch (error: any) {
    console.error('[CALENDAR] Test endpoint error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
