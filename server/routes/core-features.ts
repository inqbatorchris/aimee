import { Router } from "express";
import { eq, desc, and, or, isNull, isNotNull, sql } from "drizzle-orm";
import { db } from "../db";
import { coreStorage } from "../core-storage";
import { authenticateToken, requireRole } from "../auth";
import { z } from "zod";
import { insertPlatformFeatureSchema, insertFeatureCommentSchema, isItemVisible } from "../../shared/schema";

const router = Router();

// Get all platform features for organization
router.get("/features", authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1; // Default for demo
    const { visibilityStatus, isEnabled } = req.query;
    

    const filters: any = {};
    if (visibilityStatus && visibilityStatus !== 'All') filters.visibilityStatus = visibilityStatus as string;
    if (isEnabled !== undefined) filters.isEnabled = isEnabled === 'true';

    let features = await coreStorage.getPlatformFeatures(organizationId, filters);
    
    // Filter by visibility status based on user role
    // Super admins should see all features regardless of status
    if (!req.query.includeAll && req.user!.role !== 'super_admin') {
      const beforeFilter = features.length;
      features = features.filter(feature => 
        feature.visibilityStatus ? isItemVisible(feature.visibilityStatus, req.user!.role || 'team_member') : true
      );
      console.log('After visibility status filter:', beforeFilter, '->', features.length, 'features');
    }
    
    // Return features as flat array (not nested) for the table view
    res.json(features);
  } catch (error) {
    console.error("Error fetching platform features:", error);
    res.status(500).json({ error: "Failed to fetch platform features" });
  }
});

// Get single platform feature with all details
router.get("/features/:id", authenticateToken, async (req, res) => {
  try {
    const featureId = parseInt(req.params.id);
    if (isNaN(featureId)) {
      return res.status(400).json({ error: "Invalid feature ID" });
    }

    const featureWithDetails = await coreStorage.getFeatureWithDetails(featureId);
    if (!featureWithDetails) {
      return res.status(404).json({ error: "Feature not found" });
    }

    const comments = await coreStorage.getFeatureComments(featureId);
    
    res.json({
      ...featureWithDetails,
      comments
    });
  } catch (error) {
    console.error("Error fetching platform feature:", error);
    res.status(500).json({ error: "Failed to fetch platform feature" });
  }
});

// Create new platform feature (admin only)
router.post("/features", authenticateToken, requireRole(["admin", "super_admin"]), async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const validatedData = insertPlatformFeatureSchema.parse({
      ...req.body,
      organizationId,
      createdBy: req.user!.id,
      updatedBy: req.user!.id,
    });

    const feature = await coreStorage.createPlatformFeature(validatedData);
    res.status(201).json(feature);
  } catch (error) {
    console.error("Error creating platform feature:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid feature data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create platform feature" });
  }
});

// Update platform feature (admin only)
router.put("/features/:id", authenticateToken, requireRole(["admin", "super_admin"]), async (req, res) => {
  try {
    const featureId = parseInt(req.params.id);
    if (isNaN(featureId)) {
      return res.status(400).json({ error: "Invalid feature ID" });
    }

    const updates = {
      ...req.body,
      updatedBy: req.user!.id,
    };

    const feature = await coreStorage.updatePlatformFeature(featureId, updates);
    if (!feature) {
      return res.status(404).json({ error: "Feature not found" });
    }

    res.json(feature);
  } catch (error) {
    console.error("Error updating platform feature:", error);
    res.status(500).json({ error: "Failed to update platform feature" });
  }
});

// Patch platform feature (admin only) - supports partial updates
router.patch("/features/:id", authenticateToken, requireRole(["admin", "super_admin"]), async (req, res) => {
  try {
    const featureId = parseInt(req.params.id);
    if (isNaN(featureId)) {
      return res.status(400).json({ error: "Invalid feature ID" });
    }

    // Filter out read-only fields and handle timestamps properly
    const { id, organizationId, createdAt, createdBy, ...updateData } = req.body;
    
    const updates = {
      ...updateData,
      updatedBy: req.user!.id,
      updatedAt: new Date(),
    };

    const feature = await coreStorage.updatePlatformFeature(featureId, updates);
    if (!feature) {
      return res.status(404).json({ error: "Feature not found" });
    }

    res.json(feature);
  } catch (error) {
    console.error("Error updating platform feature:", error);
    res.status(500).json({ error: "Failed to update platform feature" });
  }
});

// Update feature unified status
router.patch("/features/:id/unified-status", authenticateToken, requireRole(["admin", "super_admin"]), async (req, res) => {
  try {
    const featureId = parseInt(req.params.id);
    if (isNaN(featureId)) {
      return res.status(400).json({ error: "Invalid feature ID" });
    }

    const { unifiedStatus } = req.body;
    const validStatuses = ['draft', 'dev', 'live', 'archived'];
    
    if (!validStatuses.includes(unifiedStatus)) {
      return res.status(400).json({ 
        error: "Invalid unified status", 
        validValues: validStatuses 
      });
    }

    const updates = {
      unifiedStatus,
      updatedBy: req.user!.id,
    };

    const feature = await coreStorage.updatePlatformFeature(featureId, updates);
    if (!feature) {
      return res.status(404).json({ error: "Feature not found" });
    }

    res.json(feature);
  } catch (error) {
    console.error("Error updating feature unified status:", error);
    res.status(500).json({ error: "Failed to update feature unified status" });
  }
});

// Toggle feature enabled status
router.patch("/features/:id/toggle", authenticateToken, requireRole(["admin", "super_admin"]), async (req, res) => {
  try {
    const featureId = parseInt(req.params.id);
    if (isNaN(featureId)) {
      return res.status(400).json({ error: "Invalid feature ID" });
    }

    const { isEnabled } = req.body;
    if (typeof isEnabled !== 'boolean') {
      return res.status(400).json({ error: "isEnabled must be a boolean" });
    }

    const feature = await coreStorage.toggleFeature(featureId, isEnabled);
    if (!feature) {
      return res.status(404).json({ error: "Feature not found" });
    }

    res.json(feature);
  } catch (error) {
    console.error("Error toggling feature:", error);
    res.status(500).json({ error: "Failed to toggle feature" });
  }
});

// Also support POST for toggle (for compatibility)
router.post("/features/:id/toggle", authenticateToken, requireRole(["admin", "super_admin"]), async (req, res) => {
  try {
    const featureId = parseInt(req.params.id);
    if (isNaN(featureId)) {
      return res.status(400).json({ error: "Invalid feature ID" });
    }

    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: "enabled must be a boolean" });
    }

    const feature = await coreStorage.toggleFeature(featureId, enabled);
    if (!feature) {
      return res.status(404).json({ error: "Feature not found" });
    }

    res.json(feature);
  } catch (error) {
    console.error("Error toggling feature:", error);
    res.status(500).json({ error: "Failed to toggle feature" });
  }
});

// Update a specific field of a platform feature (admin only)
router.patch("/features/:id/field", authenticateToken, requireRole(["admin", "super_admin"]), async (req, res) => {
  try {
    const featureId = parseInt(req.params.id);
    if (isNaN(featureId)) {
      return res.status(400).json({ error: "Invalid feature ID" });
    }

    const { field, value } = req.body;
    if (!field) {
      return res.status(400).json({ error: "Field name is required" });
    }

    // Validate allowed fields for inline editing
    const allowedFields = [
      'name', 'description', 'featureKey', 'category', 'status', 'unifiedStatus',
      'developmentProgress', 'expectedRelease', 'route', 'isEnabled', 'databases',
      'overview', 'databaseTables', 'userDocumentation', 'implementationDetails', 'technicalSpecifications'
    ];
    
    if (!allowedFields.includes(field)) {
      return res.status(400).json({ error: `Field '${field}' is not allowed for inline editing` });
    }

    const updates = {
      [field]: value,
      updatedBy: req.user!.id,
    };

    const feature = await coreStorage.updatePlatformFeature(featureId, updates);
    if (!feature) {
      return res.status(404).json({ error: "Feature not found" });
    }

    res.json(feature);
  } catch (error) {
    console.error("Error updating platform feature field:", error);
    res.status(500).json({ error: "Failed to update platform feature field" });
  }
});

// Delete platform feature (admin only)
router.delete("/features/:id", authenticateToken, requireRole(["admin", "super_admin"]), async (req, res) => {
  try {
    const featureId = parseInt(req.params.id);
    if (isNaN(featureId)) {
      return res.status(400).json({ error: "Invalid feature ID" });
    }

    const success = await coreStorage.deletePlatformFeature(featureId);
    if (!success) {
      return res.status(404).json({ error: "Feature not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting platform feature:", error);
    res.status(500).json({ error: "Failed to delete platform feature" });
  }
});

// Add comment to feature
router.post("/features/:id/comments", authenticateToken, async (req, res) => {
  try {
    const featureId = parseInt(req.params.id);
    if (isNaN(featureId)) {
      return res.status(400).json({ error: "Invalid feature ID" });
    }

    const validatedData = insertFeatureCommentSchema.parse({
      featureId,
      authorId: req.user!.id,
      message: req.body.message,
      isAdminMessage: req.user!.role === 'admin' || req.user!.role === 'super_admin',
    });

    const comment = await coreStorage.createFeatureComment(validatedData);
    res.status(201).json(comment);
  } catch (error) {
    console.error("Error creating feature comment:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid comment data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create feature comment" });
  }
});

// Delete comment (admin or author only)
router.delete("/features/:featureId/comments/:commentId", authenticateToken, async (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId);
    if (isNaN(commentId)) {
      return res.status(400).json({ error: "Invalid comment ID" });
    }

    // TODO: Check if user is admin or comment author
    const success = await coreStorage.deleteFeatureComment(commentId);
    if (!success) {
      return res.status(404).json({ error: "Comment not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting feature comment:", error);
    res.status(500).json({ error: "Failed to delete feature comment" });
  }
});

// Get feature hierarchy (required by Feature Manager)
router.get("/features/hierarchy", authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    
    // Get all features and build hierarchy
    let features = await coreStorage.getPlatformFeatures(organizationId, {});
    
    // Filter by unified status visibility based on user role
    features = features.filter(feature => 
      feature.unifiedStatus ? isItemVisible(feature.unifiedStatus, req.user!.role || 'team_member') : true
    );
    
    // Build hierarchy structure
    const hierarchy = features.map(feature => ({
      ...feature,
      children: [] // Simple flat structure for now, can be enhanced later
    }));
    
    res.json(hierarchy);
  } catch (error) {
    console.error("Error fetching feature hierarchy:", error);
    res.status(500).json({ error: "Failed to fetch feature hierarchy" });
  }
});

// Get activity logs
router.get("/activity", authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 1;
    const { userId, entityType, limit } = req.query;

    const filters: any = {};
    if (userId) filters.userId = parseInt(userId as string);
    if (entityType) filters.entityType = entityType as string;
    if (limit) filters.limit = parseInt(limit as string);

    const activities = await coreStorage.getActivityLogs(organizationId, filters);
    res.json(activities);
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
});

// Search pages endpoint
router.get("/pages/search", authenticateToken, async (req, res) => {
  try {
    const { q = '' } = req.query;
    const user = req.user!;
    
    // Get all pages for the organization (use 1 as default if not set)
    const pages = await coreStorage.getPages(user.organizationId || 1);
    
    // Filter by search query if provided
    let filteredPages = pages;
    if (q && typeof q === 'string') {
      const searchTerm = q.toLowerCase();
      filteredPages = pages.filter(page => 
        page.title.toLowerCase().includes(searchTerm) ||
        page.path.toLowerCase().includes(searchTerm) ||
        (page.description && page.description.toLowerCase().includes(searchTerm))
      );
    }
    
    // Sort to show live pages first, then dev, then draft
    filteredPages.sort((a, b) => {
      const statusOrder: Record<string, number> = { 'live': 0, 'dev': 1, 'draft': 2, 'archived': 3 };
      const aOrder = statusOrder[a.unifiedStatus || a.status || 'draft'] ?? 4;
      const bOrder = statusOrder[b.unifiedStatus || b.status || 'draft'] ?? 4;
      return aOrder - bOrder;
    });
    
    res.json(filteredPages);
  } catch (error) {
    console.error("Error searching pages:", error);
    res.status(500).json({ error: "Failed to search pages" });
  }
});

// NOTE: Get linked pages route is now in feature-management.ts
// to avoid conflicts and properly handle the linkedPageIds JSONB field

// Link a page to a feature
router.post("/features/:id/pages", authenticateToken, requireRole(["admin", "super_admin"]), async (req, res) => {
  try {
    const featureId = parseInt(req.params.id);
    if (isNaN(featureId)) {
      return res.status(400).json({ error: "Invalid feature ID" });
    }

    const { pageId, role, isPrimary } = req.body;
    if (!pageId) {
      return res.status(400).json({ error: "Page ID is required" });
    }

    const result = await coreStorage.linkPageToFeature(featureId, pageId, role || 'main', isPrimary || false);
    res.json(result);
  } catch (error) {
    console.error("Error linking page to feature:", error);
    res.status(500).json({ error: "Failed to link page to feature" });
  }
});

// Unlink a page from a feature
router.delete("/features/:id/pages/:pageId", authenticateToken, requireRole(["admin", "super_admin"]), async (req, res) => {
  try {
    const featureId = parseInt(req.params.id);
    if (isNaN(featureId)) {
      return res.status(400).json({ error: "Invalid feature ID" });
    }

    const { pageId } = req.params;
    if (!pageId) {
      return res.status(400).json({ error: "Page ID is required" });
    }

    const result = await coreStorage.unlinkPageFromFeature(featureId, pageId);
    res.json({ success: true, result });
  } catch (error) {
    console.error("Error unlinking page from feature:", error);
    res.status(500).json({ error: "Failed to unlink page from feature" });
  }
});

// Set primary page for a feature
router.patch("/features/:id/primary-page", authenticateToken, requireRole(["admin", "super_admin"]), async (req, res) => {
  try {
    const featureId = parseInt(req.params.id);
    if (isNaN(featureId)) {
      return res.status(400).json({ error: "Invalid feature ID" });
    }

    const { pageId } = req.body;
    if (!pageId) {
      return res.status(400).json({ error: "Page ID is required" });
    }

    // Update the feature with the new primary page
    const updatedFeature = await coreStorage.updatePlatformFeature(featureId, {
      primaryPageId: pageId,
      updatedBy: req.user!.id
    });

    if (!updatedFeature) {
      return res.status(404).json({ error: "Feature not found" });
    }

    // Get the full feature with details
    const featureWithDetails = await coreStorage.getFeatureWithDetails(featureId);
    res.json(featureWithDetails);
  } catch (error) {
    console.error("Error setting primary page:", error);
    res.status(500).json({ error: "Failed to set primary page" });
  }
});



export default router;