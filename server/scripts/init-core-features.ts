import { db } from '../db';
import { coreStorage } from '../core-storage';
import { eq } from 'drizzle-orm';

// Initialize core platform features for an organization
async function initializeCoreFeatures() {
  console.log('Initializing core platform features...');
  
  try {
    const organizationId = 1; // Default organization
    const adminUserId = 1; // Default admin user
    
    // Define core platform features
    const coreFeatures = [
      {
        featureKey: 'strategy_okrs',
        name: 'Strategy & OKRs',
        description: 'Comprehensive objective and key results management with progress tracking, check-ins, and alignment mapping',
        category: 'platform_features',
        status: 'live',
        isEnabled: true,
        isVisible: true,
        developmentProgress: 100,
        icon: 'Target',
        route: '/strategy',
        features: ['Key Results Tracking', 'Progress Check-ins', 'Habit Generation', 'Cycle Management'],
        settings: {
          allowPublicObjectives: false,
          requireKeyResults: true,
          autoGenerateHabits: true,
          cycleDuration: 'monthly'
        },
        developerDocs: {
          overview: "The Strategy & OKRs module is the core strategic planning feature of aimee.works, providing comprehensive objective and key results management.",
          databaseTables: [
            { name: "objectives", description: "Core objectives table storing strategic goals" },
            { name: "key_results", description: "Measurable outcomes linked to objectives" },
            { name: "key_result_tasks", description: "Work items generated from key results" },
            { name: "check_in_cycles", description: "Time-based cycles for progress tracking" },
            { name: "check_in_updates", description: "Progress updates within cycles" }
          ]
        },
        organizationId,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        featureKey: 'work_management',
        name: 'Work Management',
        description: 'Task and project management with Kanban boards, calendar views, and team collaboration',
        category: 'platform_features',
        status: 'live',
        isEnabled: true,
        isVisible: true,
        developmentProgress: 100,
        icon: 'CheckSquare',
        route: '/work',
        features: ['Task Tracking', 'Kanban Boards', 'Calendar Integration', 'Team Assignments'],
        settings: {
          defaultView: 'kanban',
          allowTimeTracking: true,
          enableNotifications: true
        },
        developerDocs: {
          overview: "Work Management provides task tracking, project organization, and team collaboration tools."
        },
        organizationId,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        featureKey: 'knowledge_base',
        name: 'Knowledge Base',
        description: 'Centralized knowledge management with AI-powered search and content organization',
        category: 'platform_features',
        status: 'live',
        isEnabled: true,
        isVisible: true,
        developmentProgress: 100,
        icon: 'BookOpen',
        route: '/knowledge',
        features: ['Document Management', 'AI Search', 'Content Organization', 'Team Knowledge Sharing'],
        settings: {
          allowPublicDocuments: false,
          enableVersionControl: true,
          aiSearchEnabled: false
        },
        developerDocs: {
          overview: "Knowledge Base provides centralized document management with search and organization capabilities.",
          databaseTables: [
            { name: "knowledge_documents", description: "Core documents table for knowledge base content" },
            { name: "knowledge_categories", description: "Document categorization and organization" }
          ]
        },
        organizationId,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        featureKey: 'ai_assistant',
        name: 'AI Assistant',
        description: 'Intelligent AI chat assistant with contextual understanding and action execution',
        category: 'platform_features',
        status: 'coming_soon',
        isEnabled: false,
        isVisible: true,
        developmentProgress: 25,
        expectedRelease: 'Q2 2025',
        icon: 'Bot',
        route: '/ai-chat',
        features: ['Natural Language Processing', 'Contextual Responses', 'Action Execution', 'Learning Capabilities'],
        settings: {
          maxConversationLength: 50,
          enableActionExecution: false,
          learningMode: 'passive'
        },
        adminOnly: false,
        organizationId,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        featureKey: 'tools_agents',
        name: 'Tools & Agents',
        description: 'Automation tools, AI agents, routines, and observability features for business optimization',
        category: 'platform_features',
        status: 'dev',
        isEnabled: false,
        isVisible: true,
        developmentProgress: 45,
        expectedRelease: 'Q2 2025',
        icon: 'Wrench',
        route: '/tools',
        devModeOnly: true,
        features: ['AI Agents', 'Automation Rules', 'Business Routines', 'Performance Monitoring'],
        settings: {
          maxAgents: 10,
          allowScheduledTasks: true,
          enableWebhooks: false
        },
        organizationId,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      // Aimee Addons
      {
        featureKey: 'help_desk',
        name: 'Splynx Support Assistant',
        description: 'AI-powered help desk with ticket management and customer support automation',
        category: 'aimee_addons',
        status: 'coming_soon',
        isEnabled: false,
        isVisible: true,
        developmentProgress: 30,
        expectedRelease: 'Q3 2025',
        icon: 'HeadphonesIcon',
        features: ['Ticket Management', 'AI Responses', 'Customer Analytics', 'Integration Hub'],
        settings: {
          autoAssignTickets: false,
          aiResponsesEnabled: false,
          splynxIntegration: false
        },
        organizationId,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        featureKey: 'ai_site_builder',
        name: 'AI Site Builder',
        description: 'Intelligent website builder with AI-powered design suggestions and content generation',
        category: 'aimee_addons',
        status: 'coming_soon',
        isEnabled: false,
        isVisible: true,
        developmentProgress: 15,
        expectedRelease: 'Q4 2025',
        icon: 'Globe',
        features: ['AI Design Generation', 'Content Creation', 'Template Library', 'SEO Optimization'],
        settings: {
          templateCount: 50,
          aiContentGeneration: false,
          seoOptimization: false
        },
        organizationId,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        featureKey: 'crm',
        name: 'CRM',
        description: 'Customer relationship management with lead tracking and sales pipeline automation',
        category: 'aimee_addons',
        status: 'coming_soon',
        isEnabled: false,
        isVisible: true,
        developmentProgress: 20,
        expectedRelease: 'Q3 2025',
        icon: 'Users',
        features: ['Lead Management', 'Sales Pipeline', 'Contact Organization', 'Activity Tracking'],
        settings: {
          pipelineStages: 5,
          autoLeadCapture: false,
          emailIntegration: false
        },
        organizationId,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        featureKey: 'ecommerce',
        name: 'E-Commerce',
        description: 'Online store management with product catalog, order processing, and payment integration',
        category: 'aimee_addons',
        status: 'coming_soon',
        isEnabled: false,
        isVisible: true,
        developmentProgress: 10,
        expectedRelease: 'Q4 2025',
        icon: 'ShoppingCart',
        features: ['Product Catalog', 'Order Management', 'Payment Processing', 'Inventory Tracking'],
        settings: {
          maxProducts: 1000,
          paymentGateways: ['stripe'],
          inventoryTracking: false
        },
        organizationId,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        featureKey: 'splynx_email_campaigns',
        name: 'Splynx Email Campaigns',
        description: 'Automated email campaign deployment with template management and customer filtering through Splynx integration',
        category: 'integrations',
        status: 'live',
        isEnabled: true,
        isVisible: true,
        developmentProgress: 100,
        icon: 'Mail',
        route: '/integrations/splynx/setup',
        features: ['Email Template Management', 'Campaign Deployment', 'Customer Filtering', 'Workflow Integration'],
        settings: {
          maxTemplates: 100,
          enableVariableSubstitution: true,
          requiresSplynxConnection: true
        },
        developerDocs: {
          overview: "Splynx Email Campaigns enables users to create, manage, and deploy email campaigns to filtered customer segments. Templates are managed through Splynx Setup page, campaigns are deployed via Agent Builder workflows.",
          databaseTables: [
            { name: "integration_actions", description: "Stores send_email_campaign action definition (ID: 52)" }
          ],
          apiEndpoints: [
            "/api/splynx/templates - Email template CRUD operations",
            "/api/splynx/templates/:id - Get/update/delete specific template"
          ]
        },
        organizationId,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      }
    ];

    // Check and create features
    for (const featureData of coreFeatures) {
      try {
        const feature = await coreStorage.createPlatformFeature(featureData);
        console.log(`✓ Created feature: ${feature.name}`);
      } catch (error: any) {
        // Feature might already exist
        console.log(`ℹ Feature "${featureData.name}" may already exist, skipping...`);
      }
    }

    // Initialize default knowledge base categories
    const knowledgeCategories = [
      {
        name: 'Getting Started',
        description: 'Basic guides and tutorials for new users',
        icon: 'BookOpen',
        sortOrder: 1,
        organizationId,
      },
      {
        name: 'Features & How-to',
        description: 'Detailed feature documentation and tutorials',
        icon: 'Settings',
        sortOrder: 2,
        organizationId,
      },
      {
        name: 'Best Practices',
        description: 'Recommended approaches and workflows',
        icon: 'Target',
        sortOrder: 3,
        organizationId,
      },
      {
        name: 'Troubleshooting',
        description: 'Common issues and solutions',
        icon: 'AlertCircle',
        sortOrder: 4,
        organizationId,
      }
    ];

    for (const categoryData of knowledgeCategories) {
      try {
        const category = await coreStorage.createKnowledgeCategory(categoryData);
        console.log(`✓ Created knowledge category: ${category.name}`);
      } catch (error: any) {
        console.error(`✗ Failed to create category ${categoryData.name}:`, error.message);
      }
    }

    // Create welcome knowledge document
    const welcomeDoc = {
      title: 'Welcome to aimee.works',
      content: `# Welcome to aimee.works

## Your Business Management Platform

aimee.works is a comprehensive business management platform designed to help you unify your operations, strategy, and team collaboration.

### Getting Started

1. **Set up your organization settings** - Configure your company profile and preferences
2. **Explore Strategy & OKRs** - Create objectives and track your progress
3. **Manage your work** - Organize tasks and projects
4. **Build your knowledge base** - Document your processes and procedures

### Key Features

- **Strategy & OKRs**: Define and track your business objectives
- **Work Management**: Organize tasks with Kanban boards and calendar views  
- **Knowledge Base**: Centralize your documentation and knowledge
- **Team Collaboration**: Work together seamlessly across all features

### Need Help?

Browse through the knowledge base categories or contact your administrator for additional support.

---

*Welcome to your business management journey with aimee.works!*`,
      summary: 'Introduction to aimee.works platform and getting started guide',
      category: 'Getting Started',
      tags: ['welcome', 'introduction', 'getting-started'],
      status: 'published' as 'published',
      visibility: 'internal' as 'internal',
      authorId: adminUserId,
      estimatedReadingTime: 3,
      organizationId,
    };

    try {
      const document = await coreStorage.createKnowledgeDocument(welcomeDoc);
      console.log(`✓ Created welcome document: ${document.title}`);
    } catch (error: any) {
      console.error(`✗ Failed to create welcome document:`, error.message);
    }

    console.log('\n✅ Core features initialization completed successfully!');
    console.log('\nInitialized features:');
    console.log('- Strategy & OKRs (Live)');
    console.log('- Work Management (Live)');
    console.log('- Knowledge Base (Live)');
    console.log('- AI Assistant (Coming Soon)');
    console.log('- Tools & Agents (In Development)');
    console.log('- Splynx Support Assistant (Coming Soon)');
    console.log('- AI Site Builder (Coming Soon)');
    console.log('- CRM (Coming Soon)');
    console.log('- E-Commerce (Coming Soon)');
    console.log('- Splynx Email Campaigns (Live)');

  } catch (error) {
    console.error('❌ Core features initialization failed:', error);
    throw error;
  }
}

// Run initialization if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeCoreFeatures()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { initializeCoreFeatures };