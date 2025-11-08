import { db } from '../db';
import { workflowTemplates } from '../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Initialize the Chamber Record Workflow Template
 * This script creates a pre-configured workflow template for field engineers
 * to capture new chamber records in the fiber network
 */
export async function initChamberWorkflowTemplate(organizationId: number) {
  const templateId = 'chamber-record-workflow';
  
  // Check if template already exists
  const existing = await db
    .select()
    .from(workflowTemplates)
    .where(eq(workflowTemplates.id, templateId))
    .limit(1);
  
  if (existing.length > 0) {
    console.log('✅ Chamber workflow template already exists');
    return existing[0];
  }
  
  // Create the chamber record workflow template
  const chamberTemplate = {
    id: templateId,
    organizationId,
    name: 'New Chamber Record',
    description: 'Capture location and documentation for a new fiber network chamber',
    category: 'Fiber Network',
    applicableTypes: ['work_item', 'field_task'],
    isActive: true,
    isSystemTemplate: true,
    estimatedMinutes: 15,
    
    // UI Generation settings
    displayInMenu: true,
    menuLabel: 'New Chamber',
    menuIcon: 'MapPin',
    menuOrder: 1,
    
    // Steps for chamber record capture
    steps: [
      {
        id: 'capture-location',
        type: 'geolocation',
        label: 'Capture Location',
        description: 'Get the GPS coordinates of the chamber location',
        order: 0,
        required: true,
        config: {}
      },
      {
        id: 'chamber-details',
        type: 'form',
        label: 'Chamber Details',
        description: 'Enter the chamber identification and network details',
        order: 1,
        required: true,
        config: {
          fields: [
            {
              id: 'name',
              name: 'name',
              label: 'Chamber Name/ID',
              type: 'text',
              required: true,
              placeholder: 'e.g., CH-001 or Main St Chamber'
            },
            {
              id: 'network',
              name: 'network',
              label: 'Network',
              type: 'select',
              required: true,
              options: ['CCNet', 'FibreLtd', 'S&MFibre']
            },
            {
              id: 'nodeType',
              name: 'nodeType',
              label: 'Node Type',
              type: 'select',
              required: false,
              options: ['chamber', 'cabinet', 'pole', 'splice_closure']
            }
          ]
        }
      },
      {
        id: 'photo-exterior',
        type: 'photo',
        label: 'Chamber Exterior Photo',
        description: 'Take a photo of the chamber exterior and access point',
        order: 2,
        required: true,
        config: {
          minPhotos: 1,
          maxPhotos: 5,
          category: 'exterior'
        }
      },
      {
        id: 'photo-interior',
        type: 'photo',
        label: 'Chamber Interior Photo',
        description: 'Take photos of the chamber interior and cable layout',
        order: 3,
        required: true,
        config: {
          minPhotos: 1,
          maxPhotos: 5,
          category: 'interior'
        }
      },
      {
        id: 'fiber-details',
        type: 'form',
        label: 'Fiber Technical Details',
        description: 'Record technical fiber information (optional)',
        order: 4,
        required: false,
        config: {
          fields: [
            {
              id: 'fiberCount',
              name: 'fiberCount',
              label: 'Fiber Count',
              type: 'number',
              required: false,
              placeholder: 'Total number of fibers'
            },
            {
              id: 'cableType',
              name: 'cableType',
              label: 'Cable Type',
              type: 'text',
              required: false,
              placeholder: 'e.g., Single Mode, Multi Mode'
            },
            {
              id: 'bufferTubeColors',
              name: 'bufferTubeColors',
              label: 'Buffer Tube Colors',
              type: 'text',
              required: false,
              placeholder: 'Comma-separated colors'
            }
          ]
        }
      },
      {
        id: 'notes',
        type: 'text_input',
        label: 'Additional Notes',
        description: 'Add any additional observations or notes about this chamber',
        order: 5,
        required: false,
        config: {
          placeholder: 'Enter any additional notes, observations, or special conditions...',
          multiline: true
        }
      }
    ],
    
    // Completion callback to create fiber network node
    completionCallbacks: [
      {
        integrationName: 'fiber-network',
        action: 'create-node',
        fieldMappings: [
          { sourceStepId: 'capture-location', sourceField: 'latitude', targetField: 'latitude' },
          { sourceStepId: 'capture-location', sourceField: 'longitude', targetField: 'longitude' },
          { sourceStepId: 'capture-location', sourceField: 'what3words', targetField: 'what3words' },
          { sourceStepId: 'capture-location', sourceField: 'address', targetField: 'address' },
          { sourceStepId: 'chamber-details', sourceField: 'name', targetField: 'name' },
          { sourceStepId: 'chamber-details', sourceField: 'network', targetField: 'network' },
          { sourceStepId: 'chamber-details', sourceField: 'nodeType', targetField: 'nodeType' },
          { sourceStepId: 'notes', sourceField: 'notes', targetField: 'notes' }
        ],
        webhookUrl: '/api/fiber-network/nodes/from-workflow',
        webhookMethod: 'POST'
      }
    ]
  };
  
  // Insert the template
  const [created] = await db
    .insert(workflowTemplates)
    .values(chamberTemplate as any)
    .returning();
  
  console.log('✅ Chamber workflow template created:', created.id);
  return created;
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const organizationId = parseInt(process.argv[2] || '1');
  
  initChamberWorkflowTemplate(organizationId)
    .then(() => {
      console.log('Chamber workflow template initialization complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error initializing chamber workflow template:', error);
      process.exit(1);
    });
}
