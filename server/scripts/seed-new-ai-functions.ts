import { db } from '../db';
import { aiAssistantFunctions } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Seeds new Knowledge Base and Check-in AI functions for organization 4
 * Run with: npx tsx server/scripts/seed-new-ai-functions.ts
 */

const NEW_AI_FUNCTIONS = [
  // ============================================================================
  // KNOWLEDGE BASE FUNCTIONS
  // ============================================================================
  {
    organizationId: 4,
    functionName: 'list_knowledge_documents',
    displayName: 'List Knowledge Documents',
    description: 'Search and list knowledge base documents with filters',
    category: 'Knowledge Management',
    functionSchema: {
      name: 'list_knowledge_documents',
      description: 'Search and list knowledge base documents with optional filters for category, status, and text search',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Filter by category name'
          },
          status: {
            type: 'string',
            enum: ['draft', 'published', 'archived'],
            description: 'Filter by document status'
          },
          search: {
            type: 'string',
            description: 'Search in document titles and content'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of documents to return (max 50)',
            default: 20
          }
        }
      }
    },
    requiresApproval: false,
    isEnabled: true,
    isSystemFunction: false,
    dataScope: 'organization',
    minimumRole: 'team_member',
  },
  {
    organizationId: 4,
    functionName: 'create_knowledge_document',
    displayName: 'Create Knowledge Document',
    description: 'Create a new knowledge base document',
    category: 'Knowledge Management',
    functionSchema: {
      name: 'create_knowledge_document',
      description: 'Create a new knowledge base document with title, content, categories, and visibility settings',
      parameters: {
        type: 'object',
        required: ['title'],
        properties: {
          title: {
            type: 'string',
            description: 'Document title (3-255 characters)'
          },
          content: {
            type: 'string',
            description: 'Document content in markdown format'
          },
          summary: {
            type: 'string',
            description: 'Brief summary of the document'
          },
          categories: {
            type: 'array',
            items: { type: 'string' },
            description: 'Categories/tags for the document'
          },
          status: {
            type: 'string',
            enum: ['draft', 'published'],
            description: 'Document status',
            default: 'draft'
          },
          visibility: {
            type: 'string',
            enum: ['public', 'internal', 'private'],
            description: 'Who can view this document',
            default: 'internal'
          }
        }
      }
    },
    requiresApproval: true,
    isEnabled: true,
    isSystemFunction: false,
    dataScope: 'organization',
    minimumRole: 'team_member',
  },
  {
    organizationId: 4,
    functionName: 'update_knowledge_document',
    displayName: 'Update Knowledge Document',
    description: 'Update an existing knowledge base document',
    category: 'Knowledge Management',
    functionSchema: {
      name: 'update_knowledge_document',
      description: 'Update an existing knowledge base document. All changes are tracked in the activity feed.',
      parameters: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'number',
            description: 'Document ID to update'
          },
          title: {
            type: 'string',
            description: 'New document title'
          },
          content: {
            type: 'string',
            description: 'Updated content'
          },
          summary: {
            type: 'string',
            description: 'Updated summary'
          },
          categories: {
            type: 'array',
            items: { type: 'string' },
            description: 'Updated categories'
          },
          status: {
            type: 'string',
            enum: ['draft', 'published', 'archived'],
            description: 'Updated status'
          },
          visibility: {
            type: 'string',
            enum: ['public', 'internal', 'private'],
            description: 'Updated visibility'
          }
        }
      }
    },
    requiresApproval: true,
    isEnabled: true,
    isSystemFunction: false,
    dataScope: 'organization',
    minimumRole: 'team_member',
  },
  
  // ============================================================================
  // CHECK-IN MEETING FUNCTIONS
  // ============================================================================
  {
    organizationId: 4,
    functionName: 'list_upcoming_meetings',
    displayName: 'List Upcoming Meetings',
    description: 'List upcoming check-in meetings with filters',
    category: 'Meetings',
    functionSchema: {
      name: 'list_upcoming_meetings',
      description: 'List upcoming check-in meetings for the organization with optional filters',
      parameters: {
        type: 'object',
        properties: {
          fromDate: {
            type: 'string',
            description: 'Start date for the meeting range (ISO 8601 format)'
          },
          toDate: {
            type: 'string',
            description: 'End date for the meeting range (ISO 8601 format)'
          },
          teamId: {
            type: 'number',
            description: 'Filter by specific team'
          },
          status: {
            type: 'string',
            enum: ['Planning', 'Planned', 'In Progress', 'Completed', 'Skipped'],
            description: 'Filter by meeting status'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of meetings to return (max 50)',
            default: 20
          }
        }
      }
    },
    requiresApproval: false,
    isEnabled: true,
    isSystemFunction: false,
    dataScope: 'organization',
    minimumRole: 'team_member',
  },
  {
    organizationId: 4,
    functionName: 'get_meeting_agenda',
    displayName: 'Get Meeting Agenda',
    description: 'Retrieve the agenda for a specific meeting',
    category: 'Meetings',
    functionSchema: {
      name: 'get_meeting_agenda',
      description: 'Get the complete agenda for a specific check-in meeting including topics and related work items',
      parameters: {
        type: 'object',
        required: ['meetingId'],
        properties: {
          meetingId: {
            type: 'number',
            description: 'Meeting ID to retrieve agenda for'
          }
        }
      }
    },
    requiresApproval: false,
    isEnabled: true,
    isSystemFunction: false,
    dataScope: 'organization',
    minimumRole: 'team_member',
  },
  {
    organizationId: 4,
    functionName: 'extract_action_points_from_transcript',
    displayName: 'Extract Action Points from Transcript',
    description: 'Use AI to analyze meeting transcript and extract action items',
    category: 'Meetings',
    functionSchema: {
      name: 'extract_action_points_from_transcript',
      description: 'Analyze a meeting transcript using AI to extract action items, decisions, owners, and due dates',
      parameters: {
        type: 'object',
        required: ['transcript'],
        properties: {
          transcript: {
            type: 'string',
            description: 'Meeting transcript text (minimum 50 characters)'
          },
          meetingId: {
            type: 'number',
            description: 'Optional meeting ID to associate with extracted action points'
          }
        }
      }
    },
    requiresApproval: true,
    isEnabled: true,
    isSystemFunction: false,
    dataScope: 'organization',
    minimumRole: 'team_member',
  },
  {
    organizationId: 4,
    functionName: 'create_meeting_action_items',
    displayName: 'Create Meeting Action Items',
    description: 'Create work items from meeting action points',
    category: 'Meetings',
    functionSchema: {
      name: 'create_meeting_action_items',
      description: 'Create work items from a list of action items extracted from a meeting. All items will be linked to the meeting.',
      parameters: {
        type: 'object',
        required: ['meetingId', 'actionItems'],
        properties: {
          meetingId: {
            type: 'number',
            description: 'Meeting ID to link action items to'
          },
          actionItems: {
            type: 'array',
            description: 'List of action items to create as work items',
            items: {
              type: 'object',
              required: ['title'],
              properties: {
                title: {
                  type: 'string',
                  description: 'Action item title'
                },
                description: {
                  type: 'string',
                  description: 'Detailed description'
                },
                assignedTo: {
                  type: 'number',
                  description: 'User ID to assign to'
                },
                dueDate: {
                  type: 'string',
                  description: 'Due date (ISO 8601 format)'
                }
              }
            }
          }
        }
      }
    },
    requiresApproval: true,
    isEnabled: true,
    isSystemFunction: false,
    dataScope: 'organization',
    minimumRole: 'team_member',
  },
];

async function main() {
  console.log('🌱 Seeding new AI functions for Knowledge Base and Check-in features...\n');

  for (const func of NEW_AI_FUNCTIONS) {
    try {
      // Check if function already exists
      const existing = await db.query.aiAssistantFunctions.findFirst({
        where: and(
          eq(aiAssistantFunctions.organizationId, func.organizationId),
          eq(aiAssistantFunctions.functionName, func.functionName)
        ),
      });

      if (existing) {
        console.log(`⏭️  Skipping ${func.displayName} - already exists (ID: ${existing.id})`);
        continue;
      }

      // Insert new function
      const [created] = await db.insert(aiAssistantFunctions).values(func).returning();
      console.log(`✅ Created ${func.displayName} (ID: ${created.id})`);
    } catch (error: any) {
      console.error(`❌ Failed to create ${func.displayName}:`, error.message);
    }
  }

  console.log('\n🎉 Seeding complete!');
  console.log('\nSummary:');
  console.log('  Knowledge Base: 3 functions (list, create, update)');
  console.log('  Check-in Meetings: 4 functions (list meetings, get agenda, extract actions, create items)');
  console.log('\nTotal: 7 new AI functions added\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
