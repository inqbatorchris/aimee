import { storage } from '../storage';
import { db } from '../db';
import { 
  type KeyResultTask,
  type WorkItem,
  type InsertWorkItem,
  type KeyResult,
  users
} from '@shared/schema';
import { addDays, addWeeks, addMonths, startOfDay, isAfter, isBefore, parseISO } from 'date-fns';
import { and, eq } from 'drizzle-orm';

interface GenerationReport {
  created: number;
  skipped: number;
  errors: string[];
  items: WorkItem[];
}

interface FrequencyParams {
  dayOfWeek?: number[];  // 0-6 (Sun-Sat)
  dayOfMonth?: number;   // 1-31
  weekOfMonth?: number;  // 1-4
  monthOfQuarter?: number; // 1-3
}

export class WorkItemGenerator {
  
  // Generate work item from one-time task
  async generateOneTimeWorkItem(
    taskId: number,
    userId: number
  ): Promise<WorkItem> {
    const task = await storage.getKeyResultTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    if (task.isRecurring) {
      throw new Error(`Task ${taskId} is recurring, use generateNextRecurringWorkItem instead`);
    }
    
    // Create the work item immediately
    const workItem = await storage.createWorkItemFromTask(task, {
      createdBy: userId,
      status: 'Planning',
      dueDate: task.targetCompletion 
        ? new Date(task.targetCompletion).toISOString().split('T')[0]
        : undefined
    });
    
    // Log activity
    await storage.logActivity({
      organizationId: task.organizationId,
      userId,
      actionType: 'creation',
      entityType: 'work_item',
      entityId: workItem.id,
      description: `Generated work item from task: ${task.title}`,
      metadata: { taskId: task.id, workItemId: workItem.id }
    });
    
    return workItem;
  }
  
  // Calculate next due date based on frequency
  private calculateNextDueDate(task: KeyResultTask): Date | null {
    if (!task.frequency || !task.nextDueDate) return null;
    
    const currentDue = new Date(task.nextDueDate);
    const frequencyParams = task.frequencyParams as FrequencyParams || {};
    
    switch (task.frequency) {
      case 'daily':
        return addDays(currentDue, 1);
        
      case 'weekly':
        // If specific days of week are specified, find the next one
        if (frequencyParams.dayOfWeek?.length) {
          const currentDay = currentDue.getDay();
          const targetDays = frequencyParams.dayOfWeek.sort();
          
          // Find next day that's after current day
          let nextDay = targetDays.find(d => d > currentDay);
          if (!nextDay) {
            // Wrap to next week
            nextDay = targetDays[0];
            return addDays(currentDue, 7 - currentDay + nextDay);
          }
          return addDays(currentDue, nextDay - currentDay);
        }
        // Default to 7 days later
        return addWeeks(currentDue, 1);
        
      case 'monthly':
        // If specific day of month is specified
        if (frequencyParams.dayOfMonth) {
          const nextMonth = addMonths(currentDue, 1);
          nextMonth.setDate(frequencyParams.dayOfMonth);
          return nextMonth;
        }
        // Default to 1 month later
        return addMonths(currentDue, 1);
        
      case 'quarterly':
        return addMonths(currentDue, 3);
        
      default:
        return null;
    }
  }
  
  // Generate next work item for recurring task
  async generateNextRecurringWorkItem(
    task: KeyResultTask
  ): Promise<WorkItem | null> {
    if (!task.isRecurring) {
      throw new Error(`Task ${task.id} is not recurring`);
    }
    
    // Check if task has reached its limit
    if (task.totalOccurrences && task.completedCount >= task.totalOccurrences) {
      // Mark task as completed
      await storage.updateKeyResultTask(task.id, {
        generationStatus: 'completed'
      });
      return null;
    }
    
    // Check if task has passed end date
    if (task.endDate && isAfter(new Date(), new Date(task.endDate))) {
      await storage.updateKeyResultTask(task.id, {
        generationStatus: 'completed'
      });
      return null;
    }
    
    const nextDueDate = task.nextDueDate ? new Date(task.nextDueDate) : new Date();
    
    // Check if work item already exists for this due date
    const existingItems = await storage.getWorkItemsByTaskAndDate(
      task.id,
      startOfDay(nextDueDate).toISOString()
    );
    
    if (existingItems.length > 0) {
      console.log(`Work item already exists for task ${task.id} on ${nextDueDate}`);
      return null;
    }
    
    // Get count of existing work items for this task to get accurate sequence
    const existingWorkItems = await storage.getWorkItemCountByTask(task.id);
    const sequenceNumber = existingWorkItems + 1;
    const title = `${task.title} (#${sequenceNumber})`;
    
    const workItem = await storage.createWorkItemFromTask(task, {
      title,
      dueDate: nextDueDate.toISOString().split('T')[0], // YYYY-MM-DD format
      status: 'Planning'
    });
    
    // Update task's next due date
    const newNextDue = this.calculateNextDueDate(task);
    if (newNextDue) {
      await storage.updateKeyResultTask(task.id, {
        nextDueDate: newNextDue,
        lastGeneratedDate: new Date()
      });
    }
    
    // Get admin user for system operations
    const [adminUser] = await db.select()
      .from(users)
      .where(
        and(
          eq(users.organizationId, task.organizationId),
          eq(users.role, 'admin')
        )
      )
      .limit(1);
    
    const systemUserId = adminUser?.id || task.createdBy || 1;
    
    // Log activity
    await storage.logActivity({
      organizationId: task.organizationId,
      userId: systemUserId, // Use actual admin user
      actionType: 'creation',
      entityType: 'work_item',
      entityId: workItem.id,
      description: `Generated recurring work item #${sequenceNumber} from task: ${task.title}`,
      metadata: {
        taskId: task.id,
        workItemId: workItem.id,
        sequenceNumber,
        dueDate: nextDueDate
      }
    });
    
    return workItem;
  }
  
  // Daily job to generate upcoming work items
  async generateUpcomingWorkItems(
    lookaheadDays: number = 7,
    organizationId?: number
  ): Promise<GenerationReport> {
    const report: GenerationReport = {
      created: 0,
      skipped: 0,
      errors: [],
      items: []
    };
    
    if (!organizationId) {
      throw new Error('Organization ID is required for work item generation');
    }
    
    try {
      // Get all active recurring tasks
      const activeTasks = await storage.getActiveRecurringTasks(organizationId);
      const lookaheadDate = addDays(new Date(), lookaheadDays);
      
      for (const task of activeTasks) {
        try {
          // Skip if no next due date
          if (!task.nextDueDate) {
            console.log(`Task ${task.id} has no next due date, skipping`);
            report.skipped++;
            continue;
          }
          
          const nextDue = new Date(task.nextDueDate);
          
          // Check if due date is within lookahead window
          if (isBefore(nextDue, lookaheadDate)) {
            const workItem = await this.generateNextRecurringWorkItem(task);
            if (workItem) {
              report.created++;
              report.items.push(workItem);
            } else {
              report.skipped++;
            }
          } else {
            report.skipped++;
          }
        } catch (error: any) {
          console.error(`Error generating work item for task ${task.id}:`, error);
          report.errors.push(`Task ${task.id}: ${error.message}`);
        }
      }
      
      console.log(`Generation complete: ${report.created} created, ${report.skipped} skipped`);
    } catch (error: any) {
      console.error('Error in generateUpcomingWorkItems:', error);
      report.errors.push(`General error: ${error.message}`);
    }
    
    return report;
  }
  
  // Handle work item completion
  async handleWorkItemCompletion(
    workItemId: number,
    userId?: number
  ): Promise<void> {
    const workItem = await storage.getWorkItem(workItemId);
    if (!workItem || !workItem.keyResultTaskId) {
      return;
    }
    
    const task = await storage.getKeyResultTask(workItem.keyResultTaskId);
    if (!task) {
      return;
    }
    
    // Update completion metrics (this also updates activityLog)
    await storage.updateTaskCompletionMetrics(
      workItem.keyResultTaskId,
      true // completed
    );
    
    // Get admin user for system operations if userId not provided
    let systemUserId = userId;
    if (!systemUserId) {
      const [adminUser] = await db.select()
        .from(users)
        .where(
          and(
            eq(users.organizationId, task.organizationId),
            eq(users.role, 'admin')
          )
        )
        .limit(1);
      
      systemUserId = adminUser?.id || task.createdBy || 1;
    }
    
    // Log completion activity
    await storage.logActivity({
      organizationId: task.organizationId,
      userId: systemUserId, // Use actual user
      actionType: 'completion',
      entityType: 'work_item',
      entityId: workItemId,
      description: `Completed work item: ${workItem.title}`,
      metadata: {
        taskId: task.id,
        workItemId,
        completedCount: task.completedCount + 1
      }
    });
  }
}

// Export singleton instance
export const workItemGenerator = new WorkItemGenerator();