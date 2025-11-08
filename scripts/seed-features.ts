import { db } from '../server/db';
import { platformFeatures, pages } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function seedFeatures() {
  console.log('Starting feature seeding...');
  
  try {
    // Check if features already exist
    const existingFeatures = await db.select().from(platformFeatures).limit(1);
    if (existingFeatures.length > 0) {
      console.log('Features already exist, skipping seed');
      return;
    }

    // Core features
    const coreFeatureData = [
      {
        name: 'Strategy & OKRs',
        featureKey: 'strategy_okrs',
        description: 'Strategic planning with Objectives and Key Results',
        category: 'core',
        status: 'live' as const,
        isEnabled: true,
        isVisible: true,
        organizationId: 1,
        route: '/strategy',
        icon: 'Target',
        color: '#00BFA6',
        settings: {},
        features: ['objectives', 'key_results', 'check_ins', 'cycles'],
        developmentProgress: 100,
        createdBy: 1,
        updatedBy: 1,
      },
      {
        name: 'Project Management',
        featureKey: 'project_management',
        description: 'Task and project tracking with board and calendar views',
        category: 'core',
        status: 'live' as const,
        isEnabled: true,
        isVisible: true,
        organizationId: 1,
        route: '/projects',
        icon: 'Briefcase',
        color: '#00BFA6',
        settings: {},
        features: ['tasks', 'projects', 'board_view', 'calendar_view'],
        developmentProgress: 100,
        createdBy: 1,
        updatedBy: 1,
      },
      {
        name: 'Tools & Agents',
        featureKey: 'tools_agents',
        description: 'Automation tools and AI agents',
        category: 'automation',
        status: 'dev' as const,
        isEnabled: true,
        isVisible: true,
        organizationId: 1,
        route: '/tools',
        icon: 'Bot',
        color: '#FFA500',
        developmentProgress: 60,
        expectedRelease: 'Q2 2025',
        settings: {},
        features: ['automation', 'ai_agents', 'routines', 'observability'],
        createdBy: 1,
        updatedBy: 1,
      },
      {
        name: 'Help Desk',
        featureKey: 'help_desk',
        description: 'Support ticket management and knowledge base',
        category: 'support',
        status: 'live' as const,
        isEnabled: true,
        isVisible: true,
        organizationId: 1,
        route: '/helpdesk',
        icon: 'HeadphonesIcon',
        color: '#00BFA6',
        settings: {},
        features: ['tickets', 'knowledge_base', 'ai_assistant'],
        developmentProgress: 100,
        createdBy: 1,
        updatedBy: 1,
      }
    ];

    // Addon features
    const addonFeatureData = [
      {
        name: 'AI Site Builder',
        featureKey: 'ai_site_builder',
        description: 'Build websites with AI assistance',
        category: 'addons',
        status: 'dev' as const,
        isEnabled: true,
        isVisible: true,
        organizationId: 1,
        route: '/ai-site-builder',
        icon: 'Globe',
        color: '#FFA500',
        developmentProgress: 45,
        expectedRelease: 'Q2 2025',
        settings: {},
        features: ['page_builder', 'ai_content', 'templates'],
        createdBy: 1,
        updatedBy: 1,
      },
      {
        name: 'CRM',
        featureKey: 'crm',
        description: 'Customer relationship management',
        category: 'addons',
        status: 'draft' as const,
        isEnabled: false,
        isVisible: false,
        organizationId: 1,
        route: '/crm',
        icon: 'Users',
        color: '#808080',
        developmentProgress: 15,
        expectedRelease: 'Q3 2025',
        settings: {},
        features: ['contacts', 'deals', 'pipeline', 'activities'],
        createdBy: 1,
        updatedBy: 1,
      },
      {
        name: 'E-Commerce',
        featureKey: 'ecommerce',
        description: 'Online store and payment processing',
        category: 'addons',
        status: 'draft' as const,
        isEnabled: false,
        isVisible: false,
        organizationId: 1,
        route: '/ecommerce',
        icon: 'ShoppingCart',
        color: '#808080',
        developmentProgress: 10,
        expectedRelease: 'Q4 2025',
        settings: {},
        features: ['products', 'cart', 'checkout', 'payments'],
        createdBy: 1,
        updatedBy: 1,
      },
      {
        name: 'Content Library',
        featureKey: 'content_library',
        description: 'Digital asset management',
        category: 'content',
        status: 'dev' as const,
        isEnabled: true,
        isVisible: true,
        organizationId: 1,
        route: '/content',
        icon: 'BookOpen',
        color: '#FFA500',
        developmentProgress: 55,
        expectedRelease: 'Q1 2025',
        settings: {},
        features: ['uploads', 'folders', 'sharing', 'versioning'],
        createdBy: 1,
        updatedBy: 1,
      }
    ];

    // Admin features
    const adminFeatureData = [
      {
        name: 'Organization Settings',
        featureKey: 'org_settings',
        description: 'Organization management and configuration',
        category: 'administration',
        status: 'live' as const,
        isEnabled: true,
        isVisible: true,
        adminOnly: true,
        organizationId: 1,
        route: '/admin/organization',
        icon: 'Building2',
        color: '#00BFA6',
        developmentProgress: 100,
        settings: {},
        features: ['profile', 'billing', 'security', 'audit'],
        createdBy: 1,
        updatedBy: 1,
      },
      {
        name: 'User Management',
        featureKey: 'user_management',
        description: 'User and role management',
        category: 'administration',
        status: 'live' as const,
        isEnabled: true,
        isVisible: true,
        adminOnly: true,
        organizationId: 1,
        route: '/admin/users',
        icon: 'Users',
        color: '#00BFA6',
        developmentProgress: 100,
        settings: {},
        features: ['users', 'roles', 'permissions', 'invites'],
        createdBy: 1,
        updatedBy: 1,
      },
      {
        name: 'Theme Editor',
        featureKey: 'theme_editor',
        description: 'Customize platform appearance',
        category: 'customization',
        status: 'live' as const,
        isEnabled: true,
        isVisible: true,
        adminOnly: true,
        organizationId: 1,
        route: '/admin/theme',
        icon: 'Palette',
        color: '#00BFA6',
        developmentProgress: 100,
        settings: {},
        features: ['colors', 'fonts', 'layout', 'presets'],
        createdBy: 1,
        updatedBy: 1,
      },
      {
        name: 'Integrations Hub',
        featureKey: 'integrations',
        description: 'Connect with external services',
        category: 'integrations',
        status: 'dev' as const,
        isEnabled: true,
        isVisible: true,
        adminOnly: true,
        organizationId: 1,
        route: '/admin/integrations',
        icon: 'Zap',
        color: '#FFA500',
        developmentProgress: 70,
        expectedRelease: 'Q1 2025',
        settings: {},
        features: ['oauth', 'webhooks', 'api_keys', 'marketplace'],
        createdBy: 1,
        updatedBy: 1,
      }
    ];

    // Insert all features
    const allFeatureData = [...coreFeatureData, ...addonFeatureData, ...adminFeatureData];
    const insertedFeatures = await db.insert(platformFeatures).values(allFeatureData).returning();
    console.log(`Inserted ${insertedFeatures.length} features`);

    // Note: Feature hierarchy table has been removed.
    // Parent-child relationships can be managed through parentFeatureId field directly
    const strategyFeature = insertedFeatures.find(f => f.name === 'Strategy & OKRs');
    const projectFeature = insertedFeatures.find(f => f.name === 'Project Management');
    
    if (strategyFeature && projectFeature) {
      // Update project management to have strategy as parent
      await db.update(platformFeatures)
        .set({ parentFeatureId: strategyFeature.id })
        .where(eq(platformFeatures.id, projectFeature.id));
      console.log('Updated feature parent relationship');
    }

    // Link features to existing pages
    const existingPages = await db.select().from(pages).limit(10);
    
    if (existingPages.length > 0 && insertedFeatures.length > 0) {
      const featurePageLinks = [];
      
      // Link strategy feature to strategy pages
      const strategyPages = existingPages.filter(p => p.path?.includes('/strategy'));
      for (const page of strategyPages) {
        if (strategyFeature) {
          featurePageLinks.push({
            featureId: strategyFeature.id,
            pageId: page.id,
            pageRole: 'main',
            isPrimary: true,
            sortOrder: 0
          });
        }
      }
      
      // Link help desk feature to support pages
      const helpFeature = insertedFeatures.find(f => f.name === 'Help Desk');
      const supportPages = existingPages.filter(p => p.path?.includes('/helpdesk') || p.path?.includes('/support'));
      for (const page of supportPages) {
        if (helpFeature) {
          featurePageLinks.push({
            featureId: helpFeature.id,
            pageId: page.id,
            pageRole: 'main',
            isPrimary: true,
            sortOrder: 0
          });
        }
      }
      
      // Note: Feature-page linking via junction table removed.
      // Pages now linked via JSON field in platform_features table.
      if (featurePageLinks.length > 0) {
        console.log(`Skipping ${featurePageLinks.length} feature-page links (junction table removed)`);
      }
    }

    console.log('Feature seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding features:', error);
    throw error;
  }
}

// Run the seeding function
seedFeatures()
  .then(() => {
    console.log('✅ Feature seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Feature seeding failed:', error);
    process.exit(1);
  });

export { seedFeatures };