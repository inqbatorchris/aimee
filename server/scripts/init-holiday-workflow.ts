import { db } from '../db';
import { workflowTemplates } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const HOLIDAY_WORKFLOW_ID = 'holiday-approval-workflow';

export async function initHolidayWorkflowTemplate(organizationId: number) {
  console.log(`[HOLIDAY-WORKFLOW] Initializing holiday approval workflow for org ${organizationId}`);
  
  const existing = await db
    .select()
    .from(workflowTemplates)
    .where(and(
      eq(workflowTemplates.id, HOLIDAY_WORKFLOW_ID),
      eq(workflowTemplates.organizationId, organizationId)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    console.log('[HOLIDAY-WORKFLOW] Template already exists, skipping creation');
    return existing[0];
  }
  
  const holidayTemplate = {
    id: HOLIDAY_WORKFLOW_ID,
    organizationId,
    name: 'Holiday Approval Workflow',
    description: 'Workflow for approving or rejecting employee holiday requests',
    category: 'hr',
    applicableTypes: ['holiday_request'],
    steps: [
      {
        id: 'review-request',
        title: 'Review Holiday Request',
        description: 'Review the holiday request details and approve or reject',
        type: 'approval' as const,
        required: true,
        order: 1,
        config: {
          approvalOptions: ['approve', 'reject'],
          requireComment: false,
          requireCommentOnReject: true,
        }
      }
    ],
    version: 1,
    isActive: true,
    isSystemTemplate: true,
    estimatedMinutes: 5,
    displayInMenu: false,
    completionCallbacks: [
      {
        integrationName: 'internal',
        action: 'holiday-approval-complete',
        fieldMappings: [
          { sourceStepId: 'review-request', sourceField: 'decision', targetField: 'approvalStatus' },
          { sourceStepId: 'review-request', sourceField: 'comment', targetField: 'approvalComment' }
        ]
      }
    ]
  };
  
  const [created] = await db
    .insert(workflowTemplates)
    .values(holidayTemplate as any)
    .returning();
  
  console.log('[HOLIDAY-WORKFLOW] Created holiday approval workflow template:', created.id);
  return created;
}

export async function getOrCreateHolidayWorkflowTemplate(organizationId: number) {
  const existing = await db
    .select()
    .from(workflowTemplates)
    .where(and(
      eq(workflowTemplates.id, HOLIDAY_WORKFLOW_ID),
      eq(workflowTemplates.organizationId, organizationId)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  return initHolidayWorkflowTemplate(organizationId);
}

export { HOLIDAY_WORKFLOW_ID };
