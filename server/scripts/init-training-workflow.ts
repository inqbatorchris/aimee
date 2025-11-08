import { db } from '../db';
import { workflowTemplates } from '../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Initialize the Training Document Completion Workflow Template
 * This script creates a workflow template for completing assigned training documents
 * with acknowledgment and notes functionality
 */
export async function initTrainingWorkflowTemplate(organizationId: number) {
  const templateId = 'training-document-completion';
  
  // Check if template already exists
  const existing = await db
    .select()
    .from(workflowTemplates)
    .where(eq(workflowTemplates.id, templateId))
    .limit(1);
  
  if (existing.length > 0) {
    console.log('✅ Training workflow template already exists');
    return existing[0];
  }
  
  // Create the training document completion workflow template
  const trainingTemplate = {
    id: templateId,
    organizationId,
    name: 'Training Document Completion',
    description: 'Standard workflow for completing assigned training documents with acknowledgment',
    category: 'Training',
    applicableTypes: ['training'],
    isActive: true,
    isSystemTemplate: true,
    estimatedMinutes: 30,
    
    // UI Generation settings - not displayed in menu (training is assigned, not manually created)
    displayInMenu: false,
    menuLabel: null,
    menuIcon: null,
    menuOrder: 999,
    
    // Steps for training completion
    steps: [
      {
        id: 'view_document',
        type: 'kb_document',
        label: 'Review Training Document',
        description: 'Click the button below to open and read the training document. Once you have finished reading, return here to acknowledge your understanding.',
        order: 0,
        required: true,
        config: {
          documentId: null, // Will be set dynamically via workflowMetadata
          buttonLabel: 'View Training Document'
        }
      },
      {
        id: 'acknowledgment',
        type: 'checkbox',
        label: 'Acknowledge Understanding',
        description: 'I confirm that I have read, understood, and will comply with this training content',
        order: 1,
        required: true,
        config: {
          checkboxLabel: 'I acknowledge that I have read and understood this training material'
        }
      },
      {
        id: 'notes',
        type: 'text_input',
        label: 'Training Feedback (Optional)',
        description: 'Share any questions, feedback, or comments about the training material',
        order: 2,
        required: false,
        config: {
          placeholder: 'Enter any questions, feedback, or comments you have about this training...',
          multiline: true
        }
      }
    ],
    
    // Completion callback to update documentAssignment
    completionCallbacks: [
      {
        integrationName: 'training',
        action: 'mark_training_complete',
        webhookUrl: '/api/knowledge-base/assignments/complete-from-workflow',
        webhookMethod: 'POST',
        webhookHeaders: {
          'X-Internal-Webhook': 'true'
        },
        fieldMappings: [
          {
            sourceStepId: 'view_document',
            sourceField: 'documentViewed',
            targetField: 'documentViewed'
          },
          {
            sourceStepId: 'acknowledgment',
            sourceField: 'checked',
            targetField: 'acknowledgedUnderstanding'
          },
          {
            sourceStepId: 'notes',
            sourceField: 'text',
            targetField: 'completionNotes'
          }
        ]
      }
    ]
  };
  
  // Insert the template
  const [template] = await db
    .insert(workflowTemplates)
    .values(trainingTemplate as any)
    .returning();
  
  console.log('✅ Training workflow template created successfully');
  console.log(`   Template ID: ${template.id}`);
  console.log(`   Steps: ${trainingTemplate.steps.length}`);
  console.log(`   Completion callbacks: ${trainingTemplate.completionCallbacks.length}`);
  
  return template;
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const organizationId = parseInt(process.argv[2] || '1');
  
  initTrainingWorkflowTemplate(organizationId)
    .then(() => {
      console.log('\n✅ Training workflow initialization complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error initializing training workflow:', error);
      process.exit(1);
    });
}
