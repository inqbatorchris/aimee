/**
 * Initialize Fiber Network Survey Workflow Template
 * This workflow is designed for field workers to survey multiple network node locations
 */

import { db } from '../db';
import { workflowTemplates } from '@shared/schema';
import { eq } from 'drizzle-orm';

export async function initFiberSurveyWorkflow(organizationId: number = 1) {
  const templateId = 'fiber-network-survey';
  
  // Check if template already exists
  const existing = await db
    .select()
    .from(workflowTemplates)
    .where(eq(workflowTemplates.id, templateId))
    .limit(1);
  
  if (existing.length > 0) {
    console.log('✅ Fiber network survey workflow template already exists');
    return existing[0];
  }
  
  // Create the fiber network survey workflow template
  const surveyTemplate = {
    id: templateId,
    organizationId,
    name: 'Fiber Network Survey',
    description: 'Survey and document multiple fiber network nodes in a specific area. Add nodes as you visit each location.',
    category: 'Fiber Network',
    applicableTypes: ['work_item', 'field_task'],
    isActive: true,
    isSystemTemplate: true,
    estimatedMinutes: 60,
    
    // UI Generation settings
    displayInMenu: true,
    menuLabel: 'Network Survey',
    menuIcon: 'Network',
    menuOrder: 2,
    
    // Steps for network survey
    steps: [
      {
        id: 'instructions',
        type: 'notes',
        label: 'Survey Instructions',
        description: 'Read the survey area details and requirements',
        order: 0,
        required: true,
        config: {
          placeholder: 'Enter the survey area name and any specific requirements or constraints...',
          multiline: true
        }
      },
      {
        id: 'add-nodes',
        type: 'fiber_network_node',
        label: 'Add Network Nodes',
        description: 'Visit each node location and add it to the survey. You can add multiple nodes.',
        order: 1,
        required: true,
        config: {
          minNodes: 1,
          allowMultiple: true
        }
      },
      {
        id: 'survey-photos',
        type: 'photo',
        label: 'Area Overview Photos',
        description: 'Capture photos showing the overall survey area and any notable features',
        order: 2,
        required: false,
        config: {
          minPhotos: 0,
          maxPhotos: 10
        }
      },
      {
        id: 'survey-notes',
        type: 'notes',
        label: 'Survey Notes',
        description: 'Add any general observations about the survey area, access issues, or recommendations',
        order: 3,
        required: false,
        config: {
          placeholder: 'Enter general survey notes, access conditions, or recommendations for future work...',
          multiline: true
        }
      }
    ],
    
    // No completion callbacks needed - nodes are synced separately
    completionCallbacks: [],
    
    // Help content
    helpContent: {
      overview: 'This workflow guides you through surveying and documenting multiple fiber network nodes in a specific area.',
      steps: [
        'Review the survey area instructions and requirements',
        'Visit each node location and add it using the "Add Network Node" step',
        'Capture current GPS coordinates for each node',
        'Take overview photos of the survey area',
        'Add any general observations or notes about the area'
      ],
      tips: [
        'Enable high-accuracy GPS for best location precision',
        'Add multiple nodes during a single survey session',
        'Each node will be synced to the server independently',
        'Use What3Words for precise location references',
        'Include notes about access conditions or hazards'
      ]
    }
  };
  
  // Insert the template
  const [result] = await db
    .insert(workflowTemplates)
    .values(surveyTemplate as any)
    .returning();
  
  console.log('✅ Fiber network survey workflow template created:', result.id);
  return result;
}

// Run if called directly
if (require.main === module) {
  initFiberSurveyWorkflow()
    .then(() => {
      console.log('Done');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}
