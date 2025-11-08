import { workItemGenerator } from './workItemGenerator';
import { storage } from '../storage';
import { db } from '../db';
import { organizations, strategySettings, users } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

// Track scheduled jobs per organization
const scheduledJobs = new Map<number, NodeJS.Timeout>();

// Run work item generation for a specific organization
async function runWorkItemGenerationForOrg(organizationId: number) {
  try {
    console.log(`[CRON] Starting work item generation for org ${organizationId}...`);
    
    // Get organization settings
    const settings = await storage.getStrategySettings(organizationId);
    
    if (!settings || !settings.autoGenerateWorkItems) {
      console.log(`[CRON] Auto-generation disabled for org ${organizationId}`);
      return;
    }
    
    // Generate work items for the configured lookahead period
    const lookaheadDays = settings.lookaheadDays || 7;
    const report = await workItemGenerator.generateUpcomingWorkItems(lookaheadDays, organizationId);
    
    console.log(`[CRON] Work item generation complete for org ${organizationId}:`, {
      created: report.created,
      skipped: report.skipped,
      errors: report.errors.length
    });
    
    // Update last execution time
    await storage.updateStrategySettings(organizationId, {
      lastCronExecution: new Date()
    });
    
    // Log the activity only if items were created
    if (report.created > 0) {
      try {
        // Get first admin user for the organization for system operations
        const [adminUser] = await db.select()
          .from(users)
          .where(
            and(
              eq(users.organizationId, organizationId),
              eq(users.role, 'admin')
            )
          )
          .limit(1);
        
        const systemUserId = adminUser?.id || 1;
        
        await storage.logActivity({
          organizationId,
          userId: systemUserId,
          actionType: 'agent_action',
          entityType: 'work_item',
          entityId: 0,
          description: `Automated generation: Created ${report.created} work items`,
          metadata: {
            source: 'cron',
            created: report.created,
            skipped: report.skipped,
            errorCount: report.errors.length,
            lookaheadDays,
            timestamp: new Date().toISOString()
          }
        });
      } catch (logError) {
        console.error(`[CRON] Failed to log activity for org ${organizationId}:`, logError);
      }
    }
    
    // Send notifications if configured
    if (settings.notifyOnGeneration && report.created > 0) {
      // TODO: Implement email notifications
      console.log(`[CRON] Would send notifications to: ${settings.notifyEmailRecipients?.join(', ')}`);
    }
    
    return report;
  } catch (error) {
    console.error(`[CRON] Error in work item generation for org ${organizationId}:`, error);
    
    // Log the error
    try {
      // Get first admin user for error logging
      const [adminUser] = await db.select()
        .from(users)
        .where(
          and(
            eq(users.organizationId, organizationId),
            eq(users.role, 'admin')
          )
        )
        .limit(1);
      
      const systemUserId = adminUser?.id || 1;
      
      await storage.logActivity({
        organizationId,
        userId: systemUserId, // Use actual admin user
        actionType: 'agent_action',
        entityType: 'cron_job',
        entityId: 0,
        description: 'Automated work item generation failed',
        metadata: {
          source: 'cron',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      });
    } catch (logError) {
      console.error(`[CRON] Failed to log error for org ${organizationId}:`, logError);
    }
  }
}

// Parse cron schedule string to milliseconds for setInterval
function parseCronToMs(cronSchedule: string | null): number {
  // Default: Every day (24 hours)
  const defaultMs = 24 * 60 * 60 * 1000;
  
  if (!cronSchedule) return defaultMs;
  
  // Simple parsing for common patterns
  const parts = cronSchedule.split(' ');
  if (parts.length !== 5) return defaultMs;
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  // Daily at specific time
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 24 * 60 * 60 * 1000; // 24 hours
  }
  
  // Hourly
  if (minute !== '*' && hour === '*') {
    return 60 * 60 * 1000; // 1 hour
  }
  
  // Every X minutes
  if (minute.includes('*/')) {
    const interval = parseInt(minute.split('/')[1]);
    if (!isNaN(interval)) {
      return interval * 60 * 1000;
    }
  }
  
  // Default to daily
  return defaultMs;
}

// Schedule jobs for a specific organization
export async function scheduleOrgCronJobs(organizationId: number) {
  try {
    // Remove existing job if any
    const existingJob = scheduledJobs.get(organizationId);
    if (existingJob) {
      clearInterval(existingJob);
      scheduledJobs.delete(organizationId);
      console.log(`[CRON] Stopped existing job for org ${organizationId}`);
    }
    
    // Get organization settings
    const settings = await storage.getStrategySettings(organizationId);
    
    if (!settings || !settings.cronEnabled) {
      console.log(`[CRON] Cron disabled for org ${organizationId}`);
      return;
    }
    
    // Parse schedule to milliseconds
    const intervalMs = parseCronToMs(settings.cronSchedule);
    
    // Create interval-based job
    const intervalId = setInterval(() => {
      runWorkItemGenerationForOrg(organizationId).catch(error => {
        console.error(`[CRON] Task failed for org ${organizationId}:`, error);
      });
    }, intervalMs);
    
    scheduledJobs.set(organizationId, intervalId);
    console.log(`[CRON] Scheduled job for org ${organizationId} with interval: ${intervalMs}ms`);
    
  } catch (error) {
    console.error(`[CRON] Failed to schedule jobs for org ${organizationId}:`, error);
  }
}

// Initialize cron jobs for all organizations
export async function initializeCronJobs() {
  console.log('[CRON] Initializing cron jobs...');
  
  try {
    // Get all organizations
    const orgs = await db.select().from(organizations);
    
    // Schedule jobs for each organization
    for (const org of orgs) {
      await scheduleOrgCronJobs(org.id);
    }
    
    // Run initial generation in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('[CRON] Development mode: Running initial generation...');
      for (const org of orgs) {
        await runWorkItemGenerationForOrg(org.id).catch(console.error);
      }
    }
    
    console.log(`[CRON] Cron jobs initialized for ${orgs.length} organizations`);
  } catch (error) {
    console.error('[CRON] Failed to initialize cron jobs:', error);
  }
}

// Stop all cron jobs
export function stopCronJobs() {
  scheduledJobs.forEach((intervalId, orgId) => {
    clearInterval(intervalId);
    console.log(`[CRON] Stopped job for org ${orgId}`);
  });
  scheduledJobs.clear();
  console.log('[CRON] All cron jobs stopped');
}

// Restart cron jobs for a specific organization (called when settings change)
export async function restartOrgCronJobs(organizationId: number) {
  console.log(`[CRON] Restarting jobs for org ${organizationId}...`);
  await scheduleOrgCronJobs(organizationId);
}

// Manual trigger for testing
export async function triggerWorkItemGeneration(
  lookaheadDays: number = 7,
  organizationId: number = 3
) {
  console.log(`[CRON] Manual trigger for org ${organizationId}: Generating work items for next ${lookaheadDays} days...`);
  return await workItemGenerator.generateUpcomingWorkItems(lookaheadDays, organizationId);
}