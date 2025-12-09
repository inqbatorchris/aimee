import { db } from '../db';
import { workflowTemplates } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const HOLIDAY_WORKFLOW_ID = 'holiday-approval-workflow';
const WORKFLOW_VERSION = 2;

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
    if ((existing[0].version || 1) >= WORKFLOW_VERSION) {
      console.log('[HOLIDAY-WORKFLOW] Template already exists with current version, skipping');
      return existing[0];
    }
    console.log('[HOLIDAY-WORKFLOW] Upgrading workflow template to version', WORKFLOW_VERSION);
    await db.delete(workflowTemplates).where(and(
      eq(workflowTemplates.id, HOLIDAY_WORKFLOW_ID),
      eq(workflowTemplates.organizationId, organizationId)
    ));
  }
  
  const holidayTemplate = {
    id: HOLIDAY_WORKFLOW_ID,
    organizationId,
    name: 'Holiday Approval Workflow',
    description: 'Workflow for reviewing and approving employee holiday/leave requests',
    category: 'hr',
    applicableTypes: ['holiday_request'],
    steps: [
      {
        id: 'verify-details',
        title: 'Verify Request Details',
        description: 'Confirm the holiday request information is correct',
        type: 'checklist' as const,
        required: true,
        order: 1,
        checklistItems: [
          { id: 'dates-correct', name: 'Dates and duration are correct', checked: false },
          { id: 'leave-type-appropriate', name: 'Leave type is appropriate for the request', checked: false },
          { id: 'sufficient-notice', name: 'Sufficient notice period has been given', checked: false },
        ]
      },
      {
        id: 'check-coverage',
        title: 'Assess Team Coverage',
        description: 'Evaluate team availability and project impact during the requested period',
        type: 'checklist' as const,
        required: true,
        order: 2,
        checklistItems: [
          { id: 'no-conflicts', name: 'No critical project deadlines during this period', checked: false },
          { id: 'team-coverage', name: 'Adequate team coverage will be available', checked: false },
          { id: 'handover-arranged', name: 'Work handover can be arranged if needed', checked: false },
        ]
      },
      {
        id: 'review-allowance',
        title: 'Check Leave Allowance',
        description: 'Verify the employee has sufficient leave balance',
        type: 'checklist' as const,
        required: true,
        order: 3,
        checklistItems: [
          { id: 'has-balance', name: 'Employee has sufficient leave balance for this request', checked: false },
          { id: 'policy-compliant', name: 'Request complies with company leave policy', checked: false },
        ]
      },
      {
        id: 'approval-decision',
        title: 'Make Decision',
        description: 'Approve or reject the holiday request with optional notes',
        type: 'approval' as const,
        required: true,
        order: 4,
        config: {
          approvalOptions: ['approve', 'reject'],
          requireComment: false,
          requireCommentOnReject: true,
        }
      }
    ],
    version: WORKFLOW_VERSION,
    isActive: true,
    isSystemTemplate: true,
    estimatedMinutes: 5,
    displayInMenu: false,
    completionCallbacks: [
      {
        integrationName: 'internal',
        action: 'holiday-approval-complete',
        fieldMappings: [
          { sourceStepId: 'approval-decision', sourceField: 'decision', targetField: 'approvalStatus' },
          { sourceStepId: 'approval-decision', sourceField: 'comment', targetField: 'approvalComment' }
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
  
  if (existing.length > 0 && (existing[0].version || 1) >= WORKFLOW_VERSION) {
    return existing[0];
  }
  
  return initHolidayWorkflowTemplate(organizationId);
}

export { HOLIDAY_WORKFLOW_ID };
