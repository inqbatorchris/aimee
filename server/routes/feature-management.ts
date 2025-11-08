import { Router } from "express";
import { eq, desc, and, or, isNull, isNotNull, sql } from "drizzle-orm";
import { db } from "../db";
import { coreStorage } from "../core-storage";
import { authenticateToken, requireRole } from "../auth";
import { z } from "zod";
import { 
  insertPlatformFeatureSchema
} from "../../shared/schema";

const router = Router();

// Get all features (simplified for table view)
router.get("/features", authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    console.log('Fetching features for org:', organizationId);
    const features = await coreStorage.getPlatformFeatures(organizationId);
    console.log('Features retrieved:', features.length);
    console.log('First 3 features:', features.slice(0,3).map(f => ({ id: f.id, name: f.name, parentId: f.parentFeatureId })));
    res.json(features);
  } catch (error) {
    console.error("Error fetching features:", error);
    res.status(500).json({ error: "Failed to fetch features" });
  }
});

// Get feature hierarchy - all features with their relationships
router.get("/features/hierarchy", authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const features = await coreStorage.getPlatformFeatures(organizationId);
    
    // Build hierarchy structure
    const featureMap = new Map(features.map((f: any) => [f.id, { ...f, children: [] }]));
    const rootFeatures: any[] = [];
    
    for (const feature of features) {
      if (!feature.parentFeatureId) {
        const featureWithChildren = featureMap.get(feature.id);
        if (featureWithChildren) {
          rootFeatures.push(featureWithChildren);
        }
      } else {
        const parent = featureMap.get(feature.parentFeatureId);
        const child = featureMap.get(feature.id);
        if (parent && child) {
          (parent as any).children.push(child);
        }
      }
    }
    
    res.json(rootFeatures);
  } catch (error) {
    console.error("Error fetching feature hierarchy:", error);
    res.status(500).json({ error: "Failed to fetch feature hierarchy" });
  }
});

// Update feature (admin only)  
router.patch("/features/:id", authenticateToken, async (req, res) => {
  try {
    const featureId = parseInt(req.params.id);
    if (isNaN(featureId)) {
      return res.status(400).json({ error: "Invalid feature ID" });
    }
    
    const updateData = {
      ...req.body,
      updatedBy: 7 // Default admin user for development
    };
    
    const feature = await coreStorage.updatePlatformFeature(featureId, updateData);
    if (feature) {
      res.json(feature);
    } else {
      res.status(404).json({ error: "Feature not found" });
    }
  } catch (error) {
    console.error("Error updating feature:", error);
    res.status(500).json({ error: "Failed to update feature" });
  }
});

// Feature-Page linking routes (JSON field approach)
// Get linked pages for a feature
router.get("/features/:id/pages", authenticateToken, async (req, res) => {
  try {
    const featureId = parseInt(req.params.id);
    
    if (isNaN(featureId)) {
      return res.status(400).json({ error: "Invalid feature ID" });
    }
    
    // Use the storage method
    const pages = await coreStorage.getFeatureLinkedPages(featureId);
    res.json(pages);
  } catch (error) {
    console.error("Error fetching linked pages:", error);
    res.status(500).json({ error: "Failed to fetch linked pages" });
  }
});

// Search pages for linking
router.get("/pages/search", authenticateToken, async (req, res) => {
  try {
    const { q = '', exclude = '' } = req.query;
    const organizationId = req.user!.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }
    
    const excludeIds = exclude ? (exclude as string).split(',').filter(id => id) : [];
    const pages = await coreStorage.searchPagesForLinking(
      organizationId,
      q as string,
      excludeIds
    );
    
    res.json(pages);
  } catch (error) {
    console.error("Error searching pages:", error);
    res.status(500).json({ error: "Failed to search pages" });
  }
});

// Link a page to a feature
router.post("/features/:featureId/pages/:pageId", authenticateToken, requireRole(["admin", "super_admin"]), async (req, res) => {
  try {
    const featureId = parseInt(req.params.featureId);
    const pageId = req.params.pageId;
    
    if (isNaN(featureId)) {
      return res.status(400).json({ error: "Invalid feature ID" });
    }
    
    const updatedFeature = await coreStorage.linkPageToFeature(featureId, pageId);
    if (!updatedFeature) {
      return res.status(404).json({ error: "Feature not found" });
    }
    
    res.json({ message: "Page linked successfully", feature: updatedFeature });
  } catch (error) {
    console.error("Error linking page to feature:", error);
    res.status(500).json({ error: "Failed to link page to feature" });
  }
});

// Unlink a page from a feature
router.delete("/features/:featureId/pages/:pageId", authenticateToken, requireRole(["admin", "super_admin"]), async (req, res) => {
  try {
    const featureId = parseInt(req.params.featureId);
    const pageId = req.params.pageId;
    
    if (isNaN(featureId)) {
      return res.status(400).json({ error: "Invalid feature ID" });
    }
    
    const updatedFeature = await coreStorage.unlinkPageFromFeature(featureId, pageId);
    if (!updatedFeature) {
      return res.status(404).json({ error: "Feature not found" });
    }
    
    res.json({ message: "Page unlinked successfully", feature: updatedFeature });
  } catch (error) {
    console.error("Error unlinking page from feature:", error);
    res.status(500).json({ error: "Failed to unlink page from feature" });
  }
});

// Get feature feedback
router.get("/features/:id/feedback", authenticateToken, async (req, res) => {
  try {
    const featureId = parseInt(req.params.id);
    if (isNaN(featureId)) {
      return res.status(400).json({ error: "Invalid feature ID" });
    }
    
    const feedback = await coreStorage.getFeatureFeedback(featureId);
    res.json(feedback);
  } catch (error) {
    console.error("Error fetching feature feedback:", error);
    res.status(500).json({ error: "Failed to fetch feature feedback" });
  }
});

// Submit feature feedback
router.post("/features/:id/feedback", authenticateToken, async (req, res) => {
  try {
    const featureId = parseInt(req.params.id);
    if (isNaN(featureId)) {
      return res.status(400).json({ error: "Invalid feature ID" });
    }
    
    const feedbackData = {
      featureId,
      userId: req.user!.id,
      feedbackType: req.body.feedbackType || 'comment',
      message: req.body.message,
      status: 'new' as const
    };
    
    const feedback = await coreStorage.createFeatureFeedback(feedbackData);
    res.json(feedback);
  } catch (error) {
    console.error("Error creating feature feedback:", error);
    res.status(500).json({ error: "Failed to create feature feedback" });
  }
});

// Update feature feedback status (admin only)
router.patch("/feedback/:id/status", authenticateToken, requireRole(["admin", "super_admin"]), async (req, res) => {
  try {
    const feedbackId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (isNaN(feedbackId)) {
      return res.status(400).json({ error: "Invalid feedback ID" });
    }
    
    if (!['new', 'reviewed', 'addressed'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    const updated = await coreStorage.updateFeatureFeedbackStatus(feedbackId, status);
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ error: "Feedback not found" });
    }
  } catch (error) {
    console.error("Error updating feedback status:", error);
    res.status(500).json({ error: "Failed to update feedback status" });
  }
});

// Create feature hierarchy relationship
router.post("/features/:parentId/children/:childId", authenticateToken, requireRole(["admin", "super_admin"]), async (req, res) => {
  try {
    const parentId = parseInt(req.params.parentId);
    const childId = parseInt(req.params.childId);
    const { hierarchyLevel = 1, sortOrder = 0 } = req.body;
    
    if (isNaN(parentId) || isNaN(childId)) {
      return res.status(400).json({ error: "Invalid feature IDs" });
    }
    
    const hierarchy = await coreStorage.createFeatureHierarchy({
      parentFeatureId: parentId,
      childFeatureId: childId,
      hierarchyLevel,
      sortOrder
    });
    
    res.json(hierarchy);
  } catch (error) {
    console.error("Error creating feature hierarchy:", error);
    res.status(500).json({ error: "Failed to create feature hierarchy" });
  }
});

// Delete feature hierarchy relationship
router.delete("/features/:parentId/children/:childId", authenticateToken, requireRole(["admin", "super_admin"]), async (req, res) => {
  try {
    const parentId = parseInt(req.params.parentId);
    const childId = parseInt(req.params.childId);
    
    if (isNaN(parentId) || isNaN(childId)) {
      return res.status(400).json({ error: "Invalid feature IDs" });
    }
    
    const success = await coreStorage.deleteFeatureHierarchy(parentId, childId);
    if (success) {
      res.json({ message: "Feature hierarchy deleted successfully" });
    } else {
      res.status(404).json({ error: "Hierarchy relationship not found" });
    }
  } catch (error) {
    console.error("Error deleting feature hierarchy:", error);
    res.status(500).json({ error: "Failed to delete feature hierarchy" });
  }
});

// Bulk enable/disable features
router.post("/features/bulk-toggle", authenticateToken, requireRole(["admin", "super_admin"]), async (req, res) => {
  try {
    const { featureIds, enabled } = req.body;
    
    if (!Array.isArray(featureIds) || featureIds.length === 0) {
      return res.status(400).json({ error: "Invalid feature IDs" });
    }
    
    const results = await Promise.all(
      featureIds.map(id => coreStorage.toggleFeature(id, enabled))
    );
    
    res.json({ 
      message: `${results.filter(r => r).length} features ${enabled ? 'enabled' : 'disabled'}`,
      results 
    });
  } catch (error) {
    console.error("Error bulk toggling features:", error);
    res.status(500).json({ error: "Failed to toggle features" });
  }
});

export default router;