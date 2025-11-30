import { db } from '../db';
import { workItems, workItemWorkflowExecutions } from '@shared/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { WorkItemWorkflowService } from '../services/WorkItemWorkflowService';

async function backfillSupportTicketWorkflows() {
  console.log('🔧 Starting backfill of support ticket workflow executions...\n');
  
  const workflowService = new WorkItemWorkflowService();
  
  // Find all support ticket work items without workflow executions
  const workItemsWithoutExecution = await db
    .select({
      id: workItems.id,
      title: workItems.title,
      organizationId: workItems.organizationId,
      workflowTemplateId: workItems.workflowTemplateId,
    })
    .from(workItems)
    .leftJoin(
      workItemWorkflowExecutions,
      eq(workItems.id, workItemWorkflowExecutions.workItemId)
    )
    .where(
      and(
        eq(workItems.workflowTemplateId, 'splynx-support-ticket'),
        isNull(workItemWorkflowExecutions.id)
      )
    );
  
  console.log(`Found ${workItemsWithoutExecution.length} support ticket work items without workflow executions\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const workItem of workItemsWithoutExecution) {
    try {
      console.log(`  Initializing workflow for work item ${workItem.id}: ${workItem.title.substring(0, 50)}...`);
      
      await workflowService.startWorkflowExecution({
        workItemId: workItem.id,
        organizationId: workItem.organizationId,
      });
      
      console.log(`    ✅ Success`);
      successCount++;
    } catch (error: any) {
      console.error(`    ❌ Error: ${error.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Backfill complete:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📋 Total: ${workItemsWithoutExecution.length}`);
}

backfillSupportTicketWorkflows()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
