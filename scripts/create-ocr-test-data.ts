import { db } from '../server/db.js';
import { organizations, addresses, workflowTemplates, workItems, users } from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';

async function createOCRTestData() {
  try {
    console.log('🔍 Creating OCR test data...');

    // Use organization 4
    const orgId = 4;

    // 1. Create a test address record
    console.log('📍 Creating test address...');
    const [address] = await db.insert(addresses).values({
      organizationId: orgId,
      streetAddress: '456 Equipment Installation Ave',
      city: 'Melbourne',
      state: 'VIC',
      postcode: '3000',
      country: 'Australia',
      isActive: true,
      extractedData: {},
    }).returning();
    
    console.log(`✅ Created address ID: ${address.id}`);

    // 2. Create workflow template with OCR configuration
    console.log('📋 Creating workflow template with OCR...');
    
    const templateId = 'router-installation-ocr-test';
    
    const workflowTemplate = {
      id: templateId,
      organizationId: orgId,
      name: 'Router Installation with OCR',
      description: 'Installation workflow that extracts serial numbers and model info from router photos',
      category: 'Field Work',
      applicableTypes: ['work_item'],
      steps: [
        {
          id: 'step-1',
          type: 'checklist',
          title: 'Pre-Installation Checks',
          description: 'Complete before installing equipment',
          required: true,
          order: 1,
          checklistItems: [
            'Verify power supply availability',
            'Check network port accessibility',
            'Confirm customer approval'
          ]
        },
        {
          id: 'step-2',
          type: 'photo',
          title: 'Equipment Photo - Serial Number',
          description: 'Take clear photos of the router label showing serial number, MAC address, and model number',
          required: true,
          order: 2,
          photoConfig: {
            minPhotos: 1,
            maxPhotos: 3,
            required: true
          },
          config: {
            enableOCR: true,
            extractionConfig: {
              fields: [
                {
                  name: 'router_serial_number',
                  label: 'Router Serial Number',
                  description: 'The unique serial number printed on the device label',
                  required: true
                },
                {
                  name: 'router_mac_address',
                  label: 'MAC Address',
                  description: 'The MAC address of the primary network interface',
                  required: false
                },
                {
                  name: 'router_model',
                  label: 'Router Model',
                  description: 'The model number/name of the router',
                  required: false
                }
              ]
            }
          },
          completionCallbacks: [
            {
              id: 'callback-1',
              action: 'database_integration',
              description: 'Write extracted router info to address record',
              databaseConfig: {
                targetTable: 'addresses',
                recordId: address.id.toString(),
                fieldMappings: [
                  {
                    sourceField: 'router_serial_number',
                    targetField: 'router_serial_number',
                    required: true
                  },
                  {
                    sourceField: 'router_mac_address',
                    targetField: 'router_mac_address',
                    required: false
                  },
                  {
                    sourceField: 'router_model',
                    targetField: 'router_model',
                    required: false
                  }
                ]
              }
            }
          ]
        },
        {
          id: 'step-3',
          type: 'form',
          title: 'Installation Notes',
          description: 'Additional installation details',
          required: false,
          order: 3,
          formFields: [
            {
              id: 'notes',
              type: 'textarea',
              label: 'Notes',
              required: false
            }
          ]
        }
      ],
      version: 1,
      isActive: true,
      isSystemTemplate: false,
      estimatedMinutes: 30,
      displayInMenu: true,
      menuLabel: 'Router Installation (OCR)',
      menuIcon: 'router',
      menuOrder: 100,
      defaultFilters: {
        status: ['Ready', 'In Progress']
      },
      unifiedStatus: 'live',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.insert(workflowTemplates).values(workflowTemplate);
    console.log(`✅ Created workflow template: ${templateId}`);

    // 3. Get a user for the work item
    const [user] = await db.select()
      .from(users)
      .where(eq(users.organizationId, orgId))
      .limit(1);

    if (!user) {
      console.log('⚠️  No users found for organization, skipping work item creation');
      return;
    }

    // 4. Create a work item using this template
    console.log('📝 Creating test work item...');
    const [workItem] = await db.insert(workItems).values({
      organizationId: orgId,
      type: 'work_item',
      title: `Router Installation - ${address.streetAddress}`,
      description: 'Install and configure customer router with automated equipment tracking',
      status: 'Ready',
      priority: 'medium',
      createdBy: user.id,
      assignedTo: user.id,
      sourceType: 'addresses',
      sourceRecordId: address.id.toString(),
      workflowTemplateId: templateId,
      workflowState: {
        templateId: templateId,
        currentStepIndex: 0,
        steps: workflowTemplate.steps.map(step => ({
          stepId: step.id,
          stepIndex: step.order,
          status: 'pending',
          evidence: null
        })),
        startedAt: null,
        completedAt: null
      }
    }).returning();

    console.log(`✅ Created work item ID: ${workItem.id}`);

    console.log('\n🎉 OCR Test Data Created Successfully!');
    console.log('\n📊 Summary:');
    console.log(`  Address ID: ${address.id} (${address.streetAddress})`);
    console.log(`  Template ID: ${templateId}`);
    console.log(`  Work Item ID: ${workItem.id}`);
    console.log('\n📱 Next Steps:');
    console.log('  1. Open the work item in desktop UI or field app');
    console.log('  2. Navigate to "Equipment Photo - Serial Number" step');
    console.log('  3. Upload/capture a photo of a router label');
    console.log('  4. OCR will extract: serial number, MAC address, model');
    console.log('  5. Check the address record for extracted data in extractedData field');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
    throw error;
  }
}

// Run the script
createOCRTestData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
