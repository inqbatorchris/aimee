import { Router } from 'express';
import { coreStorage } from '../core-storage';
import { authenticateToken } from '../auth';
import { insertOnboardingPlanSchema, insertUserOnboardingProgressSchema } from '@shared/schema';

const router = Router();

// Get all onboarding plans for organization
router.get("/plans", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user?.organizationId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const plans = await coreStorage.getOnboardingPlans(user.organizationId);
    res.json(plans);
  } catch (error) {
    console.error("Error fetching onboarding plans:", error);
    res.status(500).json({ error: "Failed to fetch onboarding plans" });
  }
});

// Get single onboarding plan
router.get("/plans/:id", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user?.organizationId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const planId = parseInt(req.params.id);
    if (isNaN(planId)) {
      return res.status(400).json({ error: "Invalid plan ID" });
    }

    const plan = await coreStorage.getOnboardingPlan(planId);
    if (!plan) {
      return res.status(404).json({ error: "Onboarding plan not found" });
    }

    if (plan.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(plan);
  } catch (error) {
    console.error("Error fetching onboarding plan:", error);
    res.status(500).json({ error: "Failed to fetch onboarding plan" });
  }
});

// Create onboarding plan
router.post("/plans", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user?.organizationId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!req.body.name || typeof req.body.name !== 'string') {
      return res.status(400).json({ error: "Plan name is required" });
    }

    const plan = await coreStorage.createOnboardingPlan({
      ...req.body,
      organizationId: user.organizationId,
      createdBy: user.id
    });
    res.status(201).json(plan);
  } catch (error) {
    console.error("Error creating onboarding plan:", error);
    res.status(500).json({ error: "Failed to create onboarding plan" });
  }
});

// Update onboarding plan
router.put("/plans/:id", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user?.organizationId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const planId = parseInt(req.params.id);
    if (isNaN(planId)) {
      return res.status(400).json({ error: "Invalid plan ID" });
    }

    const existingPlan = await coreStorage.getOnboardingPlan(planId);
    if (!existingPlan) {
      return res.status(404).json({ error: "Onboarding plan not found" });
    }

    if (existingPlan.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const plan = await coreStorage.updateOnboardingPlan(planId, req.body);
    res.json(plan);
  } catch (error) {
    console.error("Error updating onboarding plan:", error);
    res.status(500).json({ error: "Failed to update onboarding plan" });
  }
});

// Delete onboarding plan
router.delete("/plans/:id", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user?.organizationId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const planId = parseInt(req.params.id);
    if (isNaN(planId)) {
      return res.status(400).json({ error: "Invalid plan ID" });
    }

    const existingPlan = await coreStorage.getOnboardingPlan(planId);
    if (!existingPlan) {
      return res.status(404).json({ error: "Onboarding plan not found" });
    }

    if (existingPlan.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const success = await coreStorage.deleteOnboardingPlan(planId);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Onboarding plan not found" });
    }
  } catch (error) {
    console.error("Error deleting onboarding plan:", error);
    res.status(500).json({ error: "Failed to delete onboarding plan" });
  }
});

// Assign onboarding plan to users
router.post("/plans/:id/assign", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user?.organizationId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const planId = parseInt(req.params.id);
    if (isNaN(planId)) {
      return res.status(400).json({ error: "Invalid plan ID" });
    }

    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "User IDs array is required" });
    }

    const existingPlan = await coreStorage.getOnboardingPlan(planId);
    if (!existingPlan) {
      return res.status(404).json({ error: "Onboarding plan not found" });
    }

    if (existingPlan.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Verify all target users belong to the same organization
    for (const userId of userIds) {
      const targetUser = await coreStorage.getUser(userId);
      if (!targetUser || targetUser.organizationId !== user.organizationId) {
        return res.status(403).json({ error: `User ${userId} not found or not in your organization` });
      }
    }

    const assignments = await coreStorage.assignOnboardingPlan(planId, userIds);
    res.status(201).json({ 
      success: true, 
      assignmentsCreated: assignments.length,
      assignments 
    });
  } catch (error) {
    console.error("Error assigning onboarding plan:", error);
    res.status(500).json({ error: "Failed to assign onboarding plan" });
  }
});

// Get user's onboarding progress
router.get("/progress/user/:userId", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user?.organizationId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const targetUser = await coreStorage.getUser(userId);
    if (!targetUser || targetUser.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const progress = await coreStorage.getUserOnboardingProgress(userId);
    res.json(progress);
  } catch (error) {
    console.error("Error fetching user onboarding progress:", error);
    res.status(500).json({ error: "Failed to fetch user onboarding progress" });
  }
});

// Get current user's onboarding progress
router.get("/progress/me", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user?.id) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const progress = await coreStorage.getUserOnboardingProgress(user.id);
    res.json(progress);
  } catch (error) {
    console.error("Error fetching user onboarding progress:", error);
    res.status(500).json({ error: "Failed to fetch user onboarding progress" });
  }
});

// Get onboarding plan progress (all users)
router.get("/progress/plan/:planId", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user?.organizationId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const planId = parseInt(req.params.planId);
    if (isNaN(planId)) {
      return res.status(400).json({ error: "Invalid plan ID" });
    }

    const plan = await coreStorage.getOnboardingPlan(planId);
    if (!plan) {
      return res.status(404).json({ error: "Onboarding plan not found" });
    }

    if (plan.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const progress = await coreStorage.getOnboardingPlanProgress(planId);
    res.json(progress);
  } catch (error) {
    console.error("Error fetching onboarding plan progress:", error);
    res.status(500).json({ error: "Failed to fetch onboarding plan progress" });
  }
});

// Start onboarding for a user
router.post("/progress/start", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user?.organizationId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { userId, planId } = req.body;
    
    if (!userId || !planId) {
      return res.status(400).json({ error: "User ID and plan ID are required" });
    }

    const plan = await coreStorage.getOnboardingPlan(planId);
    if (!plan) {
      return res.status(404).json({ error: "Onboarding plan not found" });
    }

    if (plan.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied to this plan" });
    }

    const targetUser = await coreStorage.getUser(userId);
    if (!targetUser || targetUser.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied to this user" });
    }

    const progress = await coreStorage.startOnboardingPlan(userId, planId);
    res.status(201).json(progress);
  } catch (error) {
    console.error("Error starting onboarding:", error);
    res.status(500).json({ error: "Failed to start onboarding" });
  }
});

// Update onboarding progress
router.put("/progress/:id", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user?.organizationId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const progressId = parseInt(req.params.id);
    if (isNaN(progressId)) {
      return res.status(400).json({ error: "Invalid progress ID" });
    }

    // Need to get the progress record and verify the associated plan belongs to user's org
    // First, get all progress records for the organization by checking all plans
    const orgPlans = await coreStorage.getOnboardingPlans(user.organizationId);
    let progressRecord: any = null;
    
    for (const plan of orgPlans) {
      const planProgress = await coreStorage.getOnboardingPlanProgress(plan.id);
      const found = planProgress.find(p => p.id === progressId);
      if (found) {
        progressRecord = found;
        break;
      }
    }
    
    if (!progressRecord) {
      return res.status(403).json({ error: "Access denied - progress record not found in your organization" });
    }

    const progress = await coreStorage.updateOnboardingProgress(progressId, req.body);
    if (!progress) {
      return res.status(404).json({ error: "Onboarding progress not found" });
    }

    res.json(progress);
  } catch (error) {
    console.error("Error updating onboarding progress:", error);
    res.status(500).json({ error: "Failed to update onboarding progress" });
  }
});

export default router;
