import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { authenticateToken, requireRole } from '../auth';

const router = Router();

// Schema validators
const createSubscriptionSchema = z.object({
  organizationId: z.number(),
  planId: z.number(),
  status: z.enum(['active', 'cancelled', 'past_due', 'trialing']).default('active'),
  currentPeriodStart: z.string().transform(s => new Date(s)),
  currentPeriodEnd: z.string().transform(s => new Date(s)),
  metadata: z.record(z.any()).optional().default({}),
});

const updateSubscriptionSchema = z.object({
  planId: z.number().optional(),
  status: z.enum(['active', 'cancelled', 'past_due', 'trialing']).optional(),
  currentPeriodEnd: z.string().transform(s => new Date(s)).optional(),
  metadata: z.record(z.any()).optional(),
});

// Get all plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await storage.getPlans();
    res.json({ plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// Get plan details
router.get('/plans/:id', async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    const plan = await storage.getPlan(planId);
    
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    res.json({ plan });
  } catch (error) {
    console.error('Error fetching plan:', error);
    res.status(500).json({ error: 'Failed to fetch plan' });
  }
});

// Get organization subscription
router.get('/org/:orgId', authenticateToken, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    
    // Check permission
    if (req.user.role !== 'super_admin' && req.user.organizationId !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const subscription = await storage.getSubscription(orgId);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    // Get plan details
    const plan = await storage.getPlan(subscription.planId);
    
    res.json({ 
      subscription,
      plan,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Create subscription (super admin only)
router.post('/', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const data = createSubscriptionSchema.parse(req.body);
    
    // Check if organization already has a subscription
    const existing = await storage.getSubscription(data.organizationId);
    if (existing) {
      return res.status(400).json({ error: 'Organization already has a subscription' });
    }
    
    const subscription = await storage.createSubscription(data);
    
    // Log activity
    await storage.logActivity({
      organizationId: data.organizationId,
      userId: req.user.id,
      action: 'subscription.created',
      entityType: 'subscription',
      entityId: subscription.id.toString(),
      metadata: { planId: data.planId },
    });
    
    res.status(201).json({ subscription });
  } catch (error) {
    console.error('Error creating subscription:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Update subscription
router.put('/:id', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const subscriptionId = parseInt(req.params.id);
    const data = updateSubscriptionSchema.parse(req.body);
    
    const subscription = await storage.updateSubscription(subscriptionId, data);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    // Check permission
    if (req.user.role !== 'super_admin' && req.user.organizationId !== subscription.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Log activity
    await storage.logActivity({
      organizationId: subscription.organizationId,
      userId: req.user.id,
      action: 'subscription.updated',
      entityType: 'subscription',
      entityId: subscriptionId.toString(),
      metadata: data,
    });
    
    res.json({ subscription });
  } catch (error) {
    console.error('Error updating subscription:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// Upgrade subscription plan
router.post('/:id/upgrade', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const subscriptionId = parseInt(req.params.id);
    const { planId } = req.body;
    
    if (!planId) {
      return res.status(400).json({ error: 'Plan ID required' });
    }
    
    const subscription = await storage.getSubscription(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    // Check permission
    if (req.user.role !== 'super_admin' && req.user.organizationId !== subscription.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get plan details
    const newPlan = await storage.getPlan(planId);
    const oldPlan = await storage.getPlan(subscription.planId);
    
    if (!newPlan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    // Update subscription
    const updated = await storage.updateSubscription(subscriptionId, {
      planId,
      metadata: {
        ...subscription.metadata,
        upgradedFrom: oldPlan?.name,
        upgradedTo: newPlan.name,
        upgradedAt: new Date().toISOString(),
      },
    });
    
    // Log activity
    await storage.logActivity({
      organizationId: subscription.organizationId,
      userId: req.user.id,
      action: 'subscription.upgraded',
      entityType: 'subscription',
      entityId: subscriptionId.toString(),
      metadata: {
        oldPlanId: subscription.planId,
        newPlanId: planId,
        oldPlanName: oldPlan?.name,
        newPlanName: newPlan.name,
      },
    });
    
    res.json({ 
      subscription: updated,
      message: `Successfully upgraded to ${newPlan.name} plan`,
    });
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    res.status(500).json({ error: 'Failed to upgrade subscription' });
  }
});

// Cancel subscription
router.post('/:id/cancel', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const subscriptionId = parseInt(req.params.id);
    
    const subscription = await storage.getSubscription(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    // Check permission
    if (req.user.role !== 'super_admin' && req.user.organizationId !== subscription.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Cancel subscription
    const updated = await storage.updateSubscription(subscriptionId, {
      status: 'cancelled',
      cancelledAt: new Date(),
    });
    
    // Log activity
    await storage.logActivity({
      organizationId: subscription.organizationId,
      userId: req.user.id,
      action: 'subscription.cancelled',
      entityType: 'subscription',
      entityId: subscriptionId.toString(),
      metadata: {},
    });
    
    res.json({ 
      subscription: updated,
      message: 'Subscription cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

export default router;