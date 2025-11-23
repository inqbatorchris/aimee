import { db } from '../db';
import { platformFeatures, menuSections, menuItems } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Initialize AI Ticket Drafting feature
 * Creates platform feature, menu items, and initial documentation
 */
async function initializeAITicketDrafting() {
  console.log('🤖 Initializing AI Ticket Drafting feature...');
  
  try {
    const organizationId = 1; // Default organization (Country Connect)
    const adminUserId = 1; // Default admin user
    
    console.log('Creating platform feature record...');
    
    // Create platform feature
    const [feature] = await db.insert(platformFeatures).values({
      organizationId,
      name: 'AI Ticket Response Drafting',
      scopeDefinition: 'AI-powered support ticket response drafting system that automatically generates draft responses when Splynx webhooks create support ticket work items, with performance tracking through OKRs',
      icon: 'BotMessageSquare',
      route: '/integrations/ai-drafting',
      visibilityStatus: 'live',
      isEnabled: true,
      
      // Comprehensive overview
      overview: `
# AI Ticket Response Drafting

An intelligent support automation system that generates AI-powered draft responses for incoming support tickets, dramatically reducing response time and agent workload.

## Key Capabilities

1. **Automatic Draft Generation**: When a Splynx webhook creates a support ticket work item, the system automatically generates a contextual draft response using AI
2. **Knowledge Base Integration**: Uses organization-specific knowledge base documents to ensure responses follow established guidelines and include accurate information
3. **Performance Tracking via OKRs**: Leverages the existing Objectives and Key Results system to track acceptance rate, edit percentage, drafts generated, and time saved
4. **Multi-Organization Support**: Each organization can configure their own AI drafting setup with custom knowledge base documents and settings
5. **Human-in-the-Loop**: All AI drafts require human review and approval before sending, with easy editing capabilities

## Business Value

- **Reduced Response Time**: Support agents start with high-quality drafts instead of blank responses
- **Consistent Quality**: AI follows documented guidelines and best practices from the knowledge base
- **Continuous Improvement**: Edit tracking identifies areas where knowledge base needs updates
- **Measurable Performance**: OKR integration provides clear metrics on system effectiveness
- **Scalable Across Organizations**: Simple setup wizard enables deployment to any organization
      `.trim(),
      
      // Database tables documentation
      databaseTables: {
        primary: [
          {
            name: 'ticket_draft_responses',
            description: 'Stores AI-generated drafts and final responses for support tickets',
            fields: [
              { name: 'originalDraft', type: 'text', description: 'AI-generated draft response' },
              { name: 'finalResponse', type: 'text', description: 'Human-edited response (null until sent)' },
              { name: 'generationMetadata', type: 'jsonb', description: 'Metadata about AI generation (model, tokens, KB docs used)' },
              { name: 'editPercentage', type: 'decimal', description: 'Percentage of text changed by human editor' },
              { name: 'sentAt', type: 'timestamp', description: 'When response was sent to customer' }
            ]
          },
          {
            name: 'ai_agent_configurations',
            description: 'Configuration for AI features per organization',
            fields: [
              { name: 'featureType', type: 'varchar', description: 'Type of AI feature (ticket_drafting)' },
              { name: 'agentWorkflowId', type: 'integer', description: 'Links to agent workflow that generates drafts' },
              { name: 'knowledgeDocumentIds', type: 'jsonb', description: 'Array of KB document IDs to use for context' },
              { name: 'modelConfig', type: 'jsonb', description: 'AI model settings (model, temperature, max tokens)' },
              { name: 'linkedObjectiveId', type: 'integer', description: 'OKR objective tracking this feature performance' }
            ]
          }
        ],
        supporting: [
          {
            name: 'agent_workflows',
            description: 'Existing: Two workflows created (Draft Generator + KPI Calculator)',
            usage: 'Webhook-triggered draft generation and scheduled KPI updates'
          },
          {
            name: 'objectives',
            description: 'Existing: Stores the AI Drafting performance objective',
            usage: 'Tracks overall acceptance rate target'
          },
          {
            name: 'key_results',
            description: 'Existing: Four key results for performance metrics',
            usage: 'Draft Acceptance Rate, Avg Edit %, Drafts Generated, Time Saved'
          },
          {
            name: 'work_items',
            description: 'Existing: Support ticket work items from Splynx',
            usage: 'Each work item can have one associated draft response'
          },
          {
            name: 'knowledge_documents',
            description: 'Existing: Organization knowledge base',
            usage: 'Provides context and guidelines for AI draft generation'
          }
        ]
      },
      
      // User-facing documentation
      userDocumentation: `
# Using AI Ticket Response Drafting

## Setup (Admin Only)

1. Navigate to **Integrations → AI Ticket Drafting**
2. Click **Enable AI Drafting** to start the setup wizard
3. The wizard will:
   - Create a performance tracking objective with 4 key results
   - Prompt you to select knowledge base documents (support guidelines, troubleshooting docs, tone guides)
   - Create an AI agent user for the organization
   - Configure two agent workflows (Draft Generator + KPI Calculator)

4. Configure settings:
   - **Auto-generate on arrival**: Generate drafts automatically when tickets arrive (recommended)
   - **Model**: Choose AI model (GPT-4 recommended for best quality)
   - **Response tone**: Adjust temperature slider for formal vs. casual tone

## Using Drafts (Support Agents)

1. When a support ticket work item is created from Splynx:
   - AI automatically generates a draft response (if auto-generate is enabled)
   - Notification appears that draft is ready

2. Open the work item to see:
   - Original ticket details at top
   - AI-generated draft in blue highlighted section
   - Editable response field below

3. Review and edit the draft:
   - Read the AI draft carefully
   - Make any necessary changes in the response field
   - Click **Send Response** when ready
   - System tracks edits to improve future drafts

4. If draft needs regeneration:
   - Click **Regenerate Draft** button
   - AI creates a new version using updated knowledge

## Viewing Performance (Managers)

1. Navigate to **Strategy → Objectives**
2. Find the "Effective AI Support Response Drafting" objective
3. View key results:
   - **Draft Acceptance Rate**: % of drafts sent with minimal edits
   - **Average Edit Percentage**: How much agents modify drafts
   - **Drafts Generated**: Total count of drafts created
   - **Time Saved**: Estimated minutes saved by starting with drafts

4. KPIs update automatically every night at 2am

## Improving Draft Quality

- If drafts consistently need editing in specific areas, update the knowledge base documents
- The system tracks common edit patterns
- Admins can review suggestions and update guidelines
- Future drafts will use the improved knowledge
      `.trim(),
      
      // Implementation details
      implementationDetails: {
        apiEndpoints: [
          {
            path: '/api/ticket-drafts',
            method: 'GET',
            description: 'Fetch draft for a work item',
            params: { workItemId: 'number' }
          },
          {
            path: '/api/ticket-drafts',
            method: 'POST',
            description: 'Generate new draft',
            body: { workItemId: 'number', regenerate: 'boolean' }
          },
          {
            path: '/api/ticket-drafts/:id',
            method: 'PATCH',
            description: 'Update draft with edits and send',
            body: { finalResponse: 'string', sentBy: 'number' }
          },
          {
            path: '/api/ai-agent-config',
            method: 'GET',
            description: 'Get AI configuration for organization'
          },
          {
            path: '/api/ai-agent-config',
            method: 'POST',
            description: 'Create or update AI configuration',
            body: { featureType: 'ticket_drafting', knowledgeDocumentIds: 'number[]', modelConfig: 'object' }
          }
        ],
        components: [
          {
            path: 'client/src/pages/integrations/AITicketDrafting.tsx',
            description: 'Setup wizard UI component'
          },
          {
            path: 'client/src/components/work-items/DraftResponseSection.tsx',
            description: 'Draft display and editing in work item panel'
          },
          {
            path: 'server/services/AITicketDraftService.ts',
            description: 'Business logic for draft generation and text comparison'
          },
          {
            path: 'server/services/workflow/ActionHandlers.ts',
            description: 'OpenAI integration action handler (generate_draft)'
          }
        ],
        workflows: [
          {
            name: 'Support Ticket - AI Draft Generator',
            triggerType: 'webhook',
            description: 'Triggered when Splynx webhook creates ticket work item. Calls OpenAI with KB context and stores draft.'
          },
          {
            name: 'AI Drafting - KPI Calculator',
            triggerType: 'schedule',
            schedule: 'Daily at 2am',
            description: 'Calculates performance metrics and updates key results via data_source_query steps'
          }
        ]
      },
      
      // Technical specifications
      technicalSpecifications: {
        authentication: {
          required: true,
          roles: ['admin', 'manager', 'team_member'],
          description: 'Admins can configure, all authenticated users can view/edit drafts'
        },
        permissions: {
          setup: ['admin'],
          viewDrafts: ['admin', 'manager', 'team_member'],
          editDrafts: ['admin', 'manager', 'team_member'],
          viewAnalytics: ['admin', 'manager']
        },
        performance: {
          draftGenerationTime: '2-5 seconds',
          caching: 'Knowledge base documents cached per organization',
          rateLimit: 'OpenAI API rate limits apply (60 requests/minute for GPT-4)'
        },
        security: {
          encryption: 'OpenAI API keys encrypted in integrations table',
          dataIsolation: 'All queries filtered by organizationId',
          auditTrail: 'All draft generations and edits logged in activity_logs'
        },
        dependencies: {
          internal: [
            'OpenAI integration configured',
            'Knowledge base with at least 1 document',
            'Splynx integration for ticket webhooks',
            'Agent workflows system'
          ],
          external: [
            'OpenAI API (GPT-4 or GPT-3.5-turbo)',
            'Splynx webhook endpoint'
          ]
        },
        infrastructure: {
          textComparison: 'Levenshtein distance algorithm for edit percentage calculation',
          scheduling: 'Uses existing agent workflow scheduler (cron-based)',
          storage: 'PostgreSQL JSONB for flexible metadata storage'
        }
      },
      
      createdBy: adminUserId,
      updatedBy: adminUserId,
    }).returning();
    
    console.log(`✅ Platform feature created: ${feature.name} (ID: ${feature.id})`);
    
    // Find or create Integrations menu section
    console.log('Finding Integrations menu section...');
    let integrationSection = await db
      .select()
      .from(menuSections)
      .where(
        and(
          eq(menuSections.organizationId, organizationId),
          eq(menuSections.name, 'Integrations')
        )
      )
      .limit(1);
    
    if (!integrationSection.length) {
      console.log('Creating Integrations menu section...');
      integrationSection = await db.insert(menuSections).values({
        organizationId,
        name: 'Integrations',
        description: 'Third-party integrations and automation',
        icon: 'Plug',
        orderIndex: 5,
        isVisible: true,
        isCollapsible: true,
        isDefaultExpanded: false,
        rolePermissions: [],
      }).returning();
    }
    
    const sectionId = integrationSection[0].id;
    console.log(`✅ Using menu section: ${integrationSection[0].name} (ID: ${sectionId})`);
    
    // Check if menu item already exists
    const existingMenuItem = await db
      .select()
      .from(menuItems)
      .where(
        and(
          eq(menuItems.organizationId, organizationId),
          eq(menuItems.path, '/integrations/ai-drafting')
        )
      )
      .limit(1);
    
    if (!existingMenuItem.length) {
      console.log('Creating menu item...');
      const [menuItem] = await db.insert(menuItems).values({
        organizationId,
        sectionId,
        title: 'AI Ticket Drafting',
        path: '/integrations/ai-drafting',
        icon: 'BotMessageSquare',
        description: 'AI-powered support ticket response drafting',
        orderIndex: 10,
        isVisible: true,
        status: 'active',
        badge: 'NEW',
        badgeColor: 'blue',
        rolePermissions: [],
      }).returning();
      
      console.log(`✅ Menu item created: ${menuItem.title} (ID: ${menuItem.id})`);
    } else {
      console.log('⚠️  Menu item already exists, skipping...');
    }
    
    console.log('\n✅ AI Ticket Drafting feature initialization complete!');
    console.log('\nNext steps:');
    console.log('1. Navigate to /integrations/ai-drafting to configure the feature');
    console.log('2. Run the setup wizard to create objectives and workflows');
    console.log('3. Select knowledge base documents for draft context');
    console.log('4. Enable auto-generation for incoming tickets');
    console.log('\n📊 Performance metrics will be tracked in Strategy → Objectives');
    
  } catch (error) {
    console.error('❌ Error initializing AI Ticket Drafting:', error);
    throw error;
  }
}

// Run if executed directly
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  initializeAITicketDrafting()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed:', error);
      process.exit(1);
    });
}

export { initializeAITicketDrafting };
