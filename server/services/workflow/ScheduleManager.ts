import { CronJob } from 'cron';
import { db } from '../../db';
import { eq, and, lte, or, sql } from 'drizzle-orm';
import { agentWorkflowSchedules, agentWorkflows, agentWorkflowRuns } from '@shared/schema';
import { WorkflowExecutor } from './WorkflowExecutor';

export class ScheduleManager {
  private jobs: Map<number, CronJob> = new Map();
  private executor: WorkflowExecutor;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.executor = new WorkflowExecutor();
  }

  async initialize(organizationId: string) {
    console.log(`[ScheduleManager] Initializing for organization ${organizationId}...`);
    
    // Load all active schedules for the organization
    const schedules = await db
      .select()
      .from(agentWorkflowSchedules)
      .where(
        and(
          eq(agentWorkflowSchedules.organizationId, organizationId),
          eq(agentWorkflowSchedules.isActive, true)
        )
      );

    for (const schedule of schedules) {
      await this.registerSchedule(schedule);
    }

    // Start polling for missed schedules every minute
    this.startPolling();
    
    console.log(`[ScheduleManager] Initialized ${schedules.length} schedules`);
  }

  async registerSchedule(schedule: any) {
    // Stop existing job if any
    if (this.jobs.has(schedule.id)) {
      this.stopSchedule(schedule.id);
    }

    try {
      const job = new CronJob(
        schedule.cronExpression,
        async () => {
          await this.executeScheduledWorkflow(schedule);
        },
        null,
        true,
        schedule.timezone || 'UTC'
      );

      this.jobs.set(schedule.id, job);
      console.log(`[ScheduleManager] Registered schedule ${schedule.id} with cron: ${schedule.cronExpression}`);
      
      // Update next run time
      const nextDate = job.nextDate();
      if (nextDate) {
        await db
          .update(agentWorkflowSchedules)
          .set({ 
            nextRunAt: nextDate.toJSDate(),
            updatedAt: new Date()
          })
          .where(eq(agentWorkflowSchedules.id, schedule.id));
      }
    } catch (error) {
      console.error(`[ScheduleManager] Failed to register schedule ${schedule.id}:`, error);
    }
  }

  async executeScheduledWorkflow(schedule: any) {
    console.log(`[ScheduleManager] Executing scheduled workflow ${schedule.workflowId}`);

    try {
      // Get the workflow
      const workflow = await db
        .select()
        .from(agentWorkflows)
        .where(eq(agentWorkflows.id, schedule.workflowId))
        .limit(1);

      if (!workflow[0] || !workflow[0].isEnabled) {
        console.log(`[ScheduleManager] Workflow ${schedule.workflowId} is not enabled, skipping`);
        return;
      }

      // Map workflowDefinition to configuration.steps format expected by WorkflowExecutor
      const workflowWithConfig = {
        ...workflow[0],
        configuration: {
          steps: workflow[0].workflowDefinition || []
        }
      };

      // Execute the workflow
      const runId = await this.executor.executeWorkflow(workflowWithConfig, {
        triggerSource: 'schedule',
        scheduleId: schedule.id,
        organizationId: schedule.organizationId
      });

      // Update last run time and calculate next run
      const job = this.jobs.get(schedule.id);
      const nextDate = job?.nextDate();
      
      await db
        .update(agentWorkflowSchedules)
        .set({
          lastRunAt: new Date(),
          nextRunAt: nextDate ? nextDate.toJSDate() : null,
          updatedAt: new Date()
        })
        .where(eq(agentWorkflowSchedules.id, schedule.id));

      console.log(`[ScheduleManager] Successfully executed scheduled workflow, run ID: ${runId}`);
    } catch (error) {
      console.error(`[ScheduleManager] Failed to execute scheduled workflow:`, error);
    }
  }

  stopSchedule(scheduleId: number) {
    const job = this.jobs.get(scheduleId);
    if (job) {
      job.stop();
      this.jobs.delete(scheduleId);
      console.log(`[ScheduleManager] Stopped schedule ${scheduleId}`);
    }
  }

  async updateSchedule(scheduleId: number, updates: Partial<any>) {
    // Update database
    await db
      .update(agentWorkflowSchedules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(agentWorkflowSchedules.id, scheduleId));

    // If schedule is active, re-register it
    if (updates.isActive !== false) {
      const schedule = await db
        .select()
        .from(agentWorkflowSchedules)
        .where(eq(agentWorkflowSchedules.id, scheduleId))
        .limit(1);
      
      if (schedule[0]) {
        await this.registerSchedule(schedule[0]);
      }
    } else {
      // If deactivated, stop it
      this.stopSchedule(scheduleId);
    }
  }

  private startPolling() {
    // Poll every minute for missed schedules
    this.pollingInterval = setInterval(async () => {
      await this.checkMissedSchedules();
    }, 60000); // 1 minute
  }

  private async checkMissedSchedules() {
    const now = new Date();
    
    // Find schedules that should have run but didn't
    const missedSchedules = await db
      .select()
      .from(agentWorkflowSchedules)
      .where(
        and(
          eq(agentWorkflowSchedules.isActive, true),
          lte(agentWorkflowSchedules.nextRunAt, now),
          or(
            eq(agentWorkflowSchedules.lastRunAt, null),
            sql`${agentWorkflowSchedules.lastRunAt} <= ${agentWorkflowSchedules.nextRunAt}`
          )
        )
      );

    for (const schedule of missedSchedules) {
      console.log(`[ScheduleManager] Found missed schedule ${schedule.id}, executing now`);
      await this.executeScheduledWorkflow(schedule);
    }
  }

  shutdown() {
    // Stop all jobs
    for (const [id, job] of Array.from(this.jobs)) {
      job.stop();
    }
    this.jobs.clear();

    // Stop polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    console.log('[ScheduleManager] Shutdown complete');
  }

  getActiveSchedules(): Array<{ id: number; cronExpression: string; nextRun: Date | null }> {
    const schedules = [];
    for (const [id, job] of Array.from(this.jobs)) {
      schedules.push({
        id,
        cronExpression: job.cronTime.toString(),
        nextRun: job.nextDate()?.toJSDate() || null
      });
    }
    return schedules;
  }
}