console.log('🔥 ROUTES INDEX START - This should appear in logs');
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../auth.js';
import storage from '../storage.js';
console.log('🔥 Router imported successfully');

// Import core route modules (simplified for debugging)
console.log('📦 Starting route imports...');
import authRoutes from '../authRoutes.js';
console.log('✅ Auth routes loaded:', typeof authRoutes);
import coreRoutes from './core.js';
console.log('✅ Core routes loaded:', typeof coreRoutes);
import strategyRoutes from './strategy.js';
console.log('✅ Strategy routes loaded:', typeof strategyRoutes);
// Import additional route modules
import coreFeatureRoutes from './core-features.js';
console.log('✅ Core-feature routes loaded:', typeof coreFeatureRoutes);
import knowledgeBaseRoutes from './knowledge-base.js';
console.log('✅ Knowledge-base routes loaded:', typeof knowledgeBaseRoutes);
import onboardingRoutes from './onboarding.js';
console.log('✅ Onboarding routes loaded:', typeof onboardingRoutes);
import { router as pagesRoutes } from './pages.js';
console.log('✅ Pages routes loaded:', typeof pagesRoutes);
import devRoutes from './dev.js';
console.log('✅ Dev routes loaded:', typeof devRoutes);
import menuRoutes from './menu.js';
console.log('✅ Menu routes loaded:', typeof menuRoutes);
import workItemsRoutes from './work-items.js';
console.log('✅ Work-items routes loaded:', typeof workItemsRoutes);
import teamsRoutes from './teams.js';
console.log('✅ Teams routes loaded:', typeof teamsRoutes);
import organizationsRoutes from './organizations.js';
console.log('✅ Organizations routes loaded:', typeof organizationsRoutes);
import subscriptionsRoutes from './subscriptions.js';
console.log('✅ Subscriptions routes loaded:', typeof subscriptionsRoutes);
import integrationsRoutes from './integrations.js';
console.log('✅ Integrations routes loaded:', typeof integrationsRoutes);
import agentsRoutes from './agents.js';
console.log('✅ Agents routes loaded:', typeof agentsRoutes);
import webhooksRoutes from './webhooks.js';
console.log('✅ Webhooks routes loaded:', typeof webhooksRoutes);
import workflowsRoutes from './workflows.js';
console.log('✅ Workflows routes loaded:', typeof workflowsRoutes);
import fieldEngineeringRoutes from './field-engineering.js';
console.log('✅ Field engineering routes loaded:', typeof fieldEngineeringRoutes);
import fiberNetworkRoutes from './fiber-network.js';
console.log('✅ Fiber network routes loaded:', typeof fiberNetworkRoutes);
import splynxRoutes from './splynx.js';
console.log('✅ Splynx routes loaded:', typeof splynxRoutes);
import emailTemplatesRoutes from './emailTemplates.js';
console.log('✅ Email templates routes loaded:', typeof emailTemplatesRoutes);
import airtableRoutes from './airtable.js';
console.log('✅ Airtable routes loaded:', typeof airtableRoutes);
import addressRoutes from './addresses.js';
console.log('✅ Address routes loaded:', typeof addressRoutes);
import aiChatRoutes from './ai-chat.js';
console.log('✅ AI Chat routes loaded:', typeof aiChatRoutes);
import aiDraftingRoutes from './ai-drafting.js';
console.log('✅ AI Drafting routes loaded:', typeof aiDraftingRoutes);
import fieldAppRoutes from './field-app.js';
console.log('✅ Field app routes loaded:', typeof fieldAppRoutes);
import financeRoutes from './finance.js';
console.log('✅ Finance routes loaded:', typeof financeRoutes);
import dataExplorerRoutes from './data-explorer.js';
console.log('✅ Data explorer routes loaded:', typeof dataExplorerRoutes);
import vapiRoutes from './vapi.js';
console.log('✅ Vapi routes loaded:', typeof vapiRoutes);
import vapiWebhooksRoutes from './vapiWebhooks.js';
console.log('✅ Vapi webhooks routes loaded:', typeof vapiWebhooksRoutes);
import fieldsRoutes from './fields.js';
console.log('✅ Fields routes loaded:', typeof fieldsRoutes);
import bookingsRoutes from './bookings.js';
console.log('✅ Bookings routes loaded:', typeof bookingsRoutes);

const router = Router();
console.log('🔥 Express Router created');

// Mount auth routes FIRST (highest priority)
console.log('🔗 Mounting auth routes:', typeof authRoutes);
router.use('/auth', authRoutes);

// Mount core routes (simplified)
console.log('🔗 Mounting core routes:', typeof coreRoutes);
router.use('/core', coreRoutes);
console.log('🔗 Mounting strategy routes:', typeof strategyRoutes);
router.use('/strategy', strategyRoutes);
console.log('🔗 Mounting core-features routes');
router.use('/core-features', coreFeatureRoutes);
console.log('🔗 Mounting knowledge-base routes');
router.use('/knowledge-base', knowledgeBaseRoutes);
console.log('🔗 Mounting onboarding routes');
router.use('/onboarding', onboardingRoutes);
console.log('🔗 Mounting pages routes');
router.use('/pages', pagesRoutes);
console.log('🔗 Mounting dev routes');
router.use('/dev', devRoutes);
console.log('🔗 Mounting menu routes');
router.use('/menu', menuRoutes);
console.log('🔗 Mounting work-items routes');
router.use('/work-items', workItemsRoutes);
console.log('🔗 Mounting teams routes');
router.use('/teams', teamsRoutes);
console.log('🔗 Mounting organizations routes');
router.use('/organizations', organizationsRoutes);
console.log('🔗 Mounting subscriptions routes');
router.use('/subscriptions', subscriptionsRoutes);
console.log('🔗 Mounting integrations routes');
router.use('/integrations', integrationsRoutes);
console.log('🔗 Mounting agents routes');
router.use('/agents', agentsRoutes);
console.log('🔗 Mounting webhooks routes');
router.use('/webhooks', webhooksRoutes);
console.log('🔗 Mounting workflows routes');
router.use('/workflows', workflowsRoutes);
console.log('🔗 Mounting field-engineering routes');
router.use('/field-engineering', fieldEngineeringRoutes);
console.log('🔗 Mounting fiber-network routes');
router.use('/fiber-network', fiberNetworkRoutes);
console.log('🔗 Mounting splynx routes');
router.use('/splynx', splynxRoutes);
console.log('🔗 Mounting email-templates routes');
router.use('/email-templates', emailTemplatesRoutes);
console.log('🔗 Mounting airtable routes');
router.use('/airtable', airtableRoutes);
console.log('🔗 Mounting address routes');
router.use('/addresses', addressRoutes);
console.log('🔗 Mounting ai-chat routes');
router.use('/ai-chat', aiChatRoutes);
console.log('🔗 Mounting ai-drafting routes');
router.use('/ai-drafting', aiDraftingRoutes);
console.log('🔗 Mounting field-app routes');
router.use('/field-app', fieldAppRoutes);
console.log('🔗 Mounting finance routes');
router.use('/finance', financeRoutes);
console.log('🔗 Mounting data-explorer routes');
router.use('/data-explorer', dataExplorerRoutes);
console.log('🔗 Mounting vapi routes');
router.use('/vapi', vapiRoutes);
console.log('🔗 Mounting vapi-webhooks routes');
router.use('/', vapiWebhooksRoutes); // Mount at root for /vapi/webhook endpoint
console.log('🔗 Mounting fields routes');
router.use('/fields', fieldsRoutes);
console.log('🔗 Mounting bookings routes (authenticated endpoints at /bookings, public at /public/bookings)');
router.use('/', bookingsRoutes); // Mount at root since routes include full paths

// Direct feature routes
router.use('/', coreFeatureRoutes);

// Activity logs endpoint
router.get('/activity-logs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.query;
    const organizationId = req.user?.organizationId || 3;
    
    const logs = await storage.getActivityLogs(organizationId, {
      entityType: entityType as string,
      limit: 50
    });
    
    // Filter by entityId if provided
    const filtered = entityId 
      ? logs.filter((log: any) => log.entityId === parseInt(entityId as string))
      : logs;
    
    res.json(filtered);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

export { router };
export { router as apiRouter };
export default router;