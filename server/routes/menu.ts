/**
 * Menu API routes for database-driven navigation
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { db } from '../db.js';
import { menuSections, menuItems, pages } from '../../shared/schema.js';
import { eq, and, asc, sql } from 'drizzle-orm';
import { authenticateToken } from '../auth';
import { checkNavigationPaths } from '../utils/navSelfCheck.js';

const router = Router();

// Flag to track if we've run the nav check
let hasRunNavCheck = false;

// Helper function to ensure menu sections exist for an organization
async function ensureMenuSectionsExist(organizationId: number) {
  try {
    // Check if menu sections already exist for this organization
    const existingSections = await db
      .select()
      .from(menuSections)
      .where(eq(menuSections.organizationId, organizationId));

    if (existingSections.length === 0) {
      // Create default menu sections
      const defaultSections = [
        {
          organizationId,
          name: 'Core',
          icon: 'Home',
          orderIndex: 0,
          isVisible: true,
          isCollapsible: true,
          isDefaultExpanded: true
        },
        {
          organizationId,
          name: 'Strategy & OKRs',
          icon: 'Target',
          orderIndex: 1,
          isVisible: true,
          isCollapsible: true,
          isDefaultExpanded: true
        },
        {
          organizationId,
          name: 'Tools & Agents',
          icon: 'Package',
          orderIndex: 2,
          isVisible: true,
          isCollapsible: true,
          isDefaultExpanded: true
        },
        {
          organizationId,
          name: 'Administration',
          icon: 'Shield',
          orderIndex: 3,
          isVisible: true,
          isCollapsible: true,
          isDefaultExpanded: false
        }
      ];

      await db.insert(menuSections).values(defaultSections);
      console.log(`Created default menu sections for organization ${organizationId}`);
    }
  } catch (error) {
    console.error('Error ensuring menu sections exist:', error);
  }
}

// Get all menu sections with items for navigation (with JWT authentication)
router.get('/navigation', authenticateToken, async (req, res) => {
  try {
    const { organizationId = 1 } = req.query;
    
    // Run navigation check on first hit (non-blocking)
    if (!hasRunNavCheck) {
      hasRunNavCheck = true;
      checkNavigationPaths(Number(organizationId)).then((results) => {
        console.log('\n📍 Navigation Self-Check Results:');
        results.forEach(r => console.log(r));
      }).catch(err => {
        console.error('Navigation check failed:', err);
      });
    }
    
    // Get user role from authenticated JWT token
    const userRole = req.user?.role || 'user';
    console.log('Navigation API - Authenticated user:', { id: req.user?.id, email: req.user?.email, role: userRole });

    // Fetch sections with their items
    const sections = await db
      .select()
      .from(menuSections)
      .where(
        and(
          eq(menuSections.organizationId, Number(organizationId)),
          eq(menuSections.isVisible, true)
        )
      )
      .orderBy(asc(menuSections.orderIndex));

    // Fetch items for each section
    const sectionsWithItems = await Promise.all(
      sections.map(async (section) => {
        const items = await db
          .select({
            menuItem: menuItems,
            page: pages
          })
          .from(menuItems)
          .leftJoin(pages, eq(menuItems.pageId, pages.id))
          .where(
            and(
              eq(menuItems.sectionId, section.id),
              eq(menuItems.isVisible, true)
            )
          )
          .orderBy(asc(menuItems.orderIndex));

        const filteredItems = items.filter(({ page, menuItem }) => {
          // Only show items where:
          // 1. It's not linked to a page (manual menu item)
          // 2. It's linked to a page with appropriate status
          // 3. For admin/super_admin users, show all statuses
          const isAdminUser = userRole === 'admin' || userRole === 'super_admin';
          const visibleStatuses = isAdminUser 
            ? ['draft', 'dev', 'live', 'archived'] 
            : ['live'];
          return !page || visibleStatuses.includes(page.status);
        });

        const sectionItems = filteredItems.map(({ menuItem, page }) => ({
          ...menuItem,
          iconType: menuItem.iconType || 'lucide',
          iconUrl: menuItem.iconUrl,
          pageStatus: page?.status || null,
          children: []
        }));

        return {
          ...section,
          iconType: section.iconType || 'lucide',
          iconUrl: section.iconUrl,
          items: sectionItems
        };
      })
    );

    res.json({ sections: sectionsWithItems });
  } catch (error) {
    console.error('Error fetching navigation menu:', error);
    res.status(500).json({ error: 'Failed to fetch navigation menu' });
  }
});

// Get all menu sections with items (for menu builder)
router.get('/sections', async (req, res) => {
  try {
    const { organizationId = 1 } = req.query;
    const orgId = Number(organizationId);

    // Ensure menu sections exist for this organization
    await ensureMenuSectionsExist(orgId);

    const sections = await db
      .select()
      .from(menuSections)
      .where(eq(menuSections.organizationId, orgId))
      .orderBy(asc(menuSections.orderIndex));

    const sectionsWithItems = await Promise.all(
      sections.map(async (section) => {
        const items = await db
          .select()
          .from(menuItems)
          .where(eq(menuItems.sectionId, section.id))
          .orderBy(asc(menuItems.orderIndex));

        return {
          ...section,
          items
        };
      })
    );

    res.json(sectionsWithItems);
  } catch (error) {
    console.error('Error fetching menu sections:', error);
    res.status(500).json({ error: 'Failed to fetch menu sections' });
  }
});

// Create new menu section
router.post('/sections', async (req, res) => {
  try {
    const sectionData = req.body;
    
    const [newSection] = await db
      .insert(menuSections)
      .values({
        organizationId: sectionData.organizationId || 1,
        name: sectionData.name,
        description: sectionData.description,
        icon: sectionData.icon || 'Menu',
        iconType: sectionData.iconType || 'lucide',
        iconUrl: sectionData.iconUrl || null,
        orderIndex: sectionData.orderIndex || 0,
        isVisible: sectionData.isVisible ?? true,
        isCollapsible: sectionData.isCollapsible ?? true,
        isDefaultExpanded: sectionData.isDefaultExpanded ?? true,
        rolePermissions: sectionData.rolePermissions || [],
      })
      .returning();

    res.json(newSection);
  } catch (error) {
    console.error('Error creating menu section:', error);
    res.status(500).json({ error: 'Failed to create menu section' });
  }
});

// Update menu section
router.patch('/sections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const [updatedSection] = await db
      .update(menuSections)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(menuSections.id, Number(id)))
      .returning();

    if (!updatedSection) {
      return res.status(404).json({ error: 'Menu section not found' });
    }

    res.json(updatedSection);
  } catch (error) {
    console.error('Error updating menu section:', error);
    res.status(500).json({ error: 'Failed to update menu section' });
  }
});

// Delete menu section
router.delete('/sections/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First, delete all menu items in this section
    await db
      .delete(menuItems)
      .where(eq(menuItems.sectionId, Number(id)));

    // Then delete the section
    const deletedSection = await db
      .delete(menuSections)
      .where(eq(menuSections.id, Number(id)))
      .returning();

    const result = deletedSection as any[];
    if (!result[0]) {
      return res.status(404).json({ error: 'Menu section not found' });
    }

    res.json({ message: 'Menu section deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu section:', error);
    res.status(500).json({ error: 'Failed to delete menu section' });
  }
});

// Create new menu item
router.post('/items', async (req, res) => {
  try {
    const itemData = req.body;
    
    const newItem = await db
      .insert(menuItems)
      .values({
        organizationId: itemData.organizationId || 1,
        sectionId: itemData.sectionId,
        pageId: itemData.pageId,
        parentId: itemData.parentId,
        title: itemData.title,
        path: itemData.path,
        icon: itemData.icon || 'FileText',
        iconType: itemData.iconType || 'lucide',
        iconUrl: itemData.iconUrl || null,
        description: itemData.description,
        orderIndex: itemData.orderIndex || 0,
        isVisible: itemData.isVisible ?? true,
        isExternal: itemData.isExternal ?? false,
        openInNewTab: itemData.openInNewTab ?? false,
        badge: itemData.badge,
        badgeColor: itemData.badgeColor,
        status: itemData.status || 'active',
        rolePermissions: itemData.rolePermissions || [],
        customPermissions: itemData.customPermissions || {},
      })
      .returning();

    const result = newItem as any[];
    res.json(result[0]);
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// Add page to menu
router.post('/items/from-page', async (req, res) => {
  try {
    const { pageId, sectionId, customTitle, customIcon, organizationId } = req.body;

    // Get page details
    const [page] = await db
      .select()
      .from(pages)
      .where(eq(pages.id, pageId));

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Get current max order index in section
    const maxOrderResult = await db
      .select({ maxOrder: menuItems.orderIndex })
      .from(menuItems)
      .where(eq(menuItems.sectionId, Number(sectionId)))
      .orderBy(asc(menuItems.orderIndex));
    
    const nextOrderIndex = maxOrderResult.length > 0 
      ? Math.max(...maxOrderResult.map(r => r.maxOrder || 0)) + 1 
      : 0;

    // Create menu item from page
    const newItem = await db
      .insert(menuItems)
      .values({
        organizationId: organizationId || 1,
        sectionId: Number(sectionId),
        pageId: page.id,
        title: customTitle || page.title,
        path: page.path || (page.slug.startsWith('/') ? page.slug : `/${page.slug}`),
        icon: customIcon || 'FileText',
        description: page.description,
        orderIndex: nextOrderIndex,
        isVisible: true,
        status: page.status === 'live' ? 'active' : 'draft',
        rolePermissions: [],
      })
      .returning();

    const result = newItem as any[];
    res.json(result[0]);
  } catch (error) {
    console.error('Error adding page to menu:', error);
    res.status(500).json({ error: 'Failed to add page to menu' });
  }
});

// Update menu item
router.patch('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const [updatedItem] = await db
      .update(menuItems)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(menuItems.id, Number(id)))
      .returning();

    if (!updatedItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// Reorder menu item
router.patch('/items/:id/reorder', async (req, res) => {
  try {
    const { id } = req.params;
    const { orderIndex } = req.body;

    // Get the current item to find its section
    const [currentItem] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, Number(id)));

    if (!currentItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Get all items in the same section ordered by orderIndex
    const sectionItems = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.sectionId, Number(currentItem.sectionId)))
      .orderBy(asc(menuItems.orderIndex));

    // Remove the current item from the list
    const otherItems = sectionItems.filter(item => item.id !== Number(id));

    // Insert the current item at the new position
    otherItems.splice(orderIndex, 0, currentItem);

    // Update all items with their new order indices
    const updatePromises = otherItems.map((item, index) =>
      db
        .update(menuItems)
        .set({ 
          orderIndex: index,
          updatedAt: new Date()
        })
        .where(eq(menuItems.id, item.id))
    );

    await Promise.all(updatePromises);

    res.json({ message: 'Menu items reordered successfully' });
  } catch (error) {
    console.error('Error reordering menu items:', error);
    res.status(500).json({ error: 'Failed to reorder menu items' });
  }
});

// Delete menu item (remove page from menu)
router.delete('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedItem = await db
      .delete(menuItems)
      .where(eq(menuItems.id, Number(id)))
      .returning();

    const result = deletedItem as any[];
    if (!result[0]) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json({ message: 'Page removed from menu successfully' });
  } catch (error) {
    console.error('Error removing page from menu:', error);
    res.status(500).json({ error: 'Failed to remove page from menu' });
  }
});

// Route validation endpoint for flag-gated enforcement
router.post('/validate-route', authenticateToken, async (req, res) => {
  try {
    const { path } = req.body;
    const userId = req.user?.id;
    const organizationId = req.user?.organizationId;
    const userRole = req.user?.role;

    if (!userId || !organizationId) {
      return res.status(400).json({ 
        canRender: false, 
        error: 'authentication_required',
        message: 'User ID and organization ID required from token'
      });
    }

    if (!path || typeof path !== 'string') {
      return res.status(400).json({ 
        canRender: false, 
        error: 'invalid_request',
        message: 'Path is required and must be a string'
      });
    }

    // Path normalization
    let normalizedPath = path;
    
    // Strip query params and hash
    normalizedPath = normalizedPath.split('?')[0].split('#')[0];
    
    // Collapse multiple slashes
    normalizedPath = normalizedPath.replace(/\/+/g, '/');
    
    // Trim trailing slash except for root
    if (normalizedPath !== '/' && normalizedPath.endsWith('/')) {
      normalizedPath = normalizedPath.slice(0, -1);
    }

    // If normalized path differs from input, reject
    if (normalizedPath !== path) {
      const result = {
        canRender: false,
        error: 'invalid_path',
        message: 'Path normalization failed',
        normalizedPath,
        originalPath: path
      };
      
      console.log('Route validation:', { userId, organizationId, path, canRender: false, failedAt: 'normalization' });
      return res.json(result);
    }

    // Validation chain - stop on first failure
    let failedAt = null;
    
    // 1. hasMenuLink (org-scoped)
    const menuLinkResult = await db.execute(
      sql`SELECT mi.id 
          FROM menu_items mi 
          WHERE mi.organization_id = ${organizationId} 
            AND mi.path = ${normalizedPath} 
            AND mi.is_visible = true 
            AND mi.status = 'active'
          LIMIT 1`
    );
    
    if (menuLinkResult.rows.length === 0) {
      failedAt = 'hasMenuLink';
    }

    // 2. hasPageRecord (if menu link passed)
    let pageRecord = null;
    if (!failedAt) {
      const pageResult = await db.execute(
        sql`SELECT p.id, p.slug, p.unified_status, p.status
            FROM pages p
            WHERE p.organization_id = ${organizationId}
              AND p.path = ${normalizedPath}
            LIMIT 1`
      );
      
      if (pageResult.rows.length === 0) {
        failedAt = 'hasPageRecord';
      } else {
        pageRecord = pageResult.rows[0];
      }
    }

    // 3. hasFeatureLink (join via platform_features for org scoping)
    if (!failedAt && pageRecord) {
      const featureLinkResult = await db.execute(
        sql`SELECT fp.id
            FROM feature_pages fp
            JOIN platform_features pf ON fp.feature_id = pf.id
            WHERE fp.page_id = ${(pageRecord as any).id}
              AND pf.organization_id = ${organizationId}
            LIMIT 1`
      );
      
      if (featureLinkResult.rows.length === 0) {
        failedAt = 'hasFeatureLink';
      }
    }

    // 4. statusAllowed (admins may bypass status, not the chain)
    if (!failedAt && pageRecord) {
      const pageStatus = (pageRecord as any).unified_status || (pageRecord as any).status;
      const isAdmin = userRole === 'super_admin' || userRole === 'admin';
      
      if (!isAdmin && pageStatus !== 'live') {
        failedAt = 'statusAllowed';
      }
    }

    // 5. roleAllowed (basic check - could be expanded)
    if (!failedAt) {
      // For now, all authenticated users with valid org access are allowed
      // This can be expanded with role-specific page permissions later
    }

    const canRender = !failedAt;
    
    // Observability logging (no PII)
    console.log('Route validation:', { userId, organizationId, path: normalizedPath, canRender, failedAt });

    const result = {
      canRender,
      path: normalizedPath,
      ...(failedAt && { 
        error: 'validation_failed',
        failedAt,
        message: `Route validation failed at: ${failedAt}`
      })
    };

    res.json(result);
  } catch (error) {
    console.error('Error validating route:', error);
    res.status(500).json({ 
      canRender: false, 
      error: 'internal_error',
      message: 'Route validation failed due to internal error'
    });
  }
});

// Configure multer for icon uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/menu-icons/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'icon-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg\+xml/;
    const mimeType = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimeType && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Upload menu icon endpoint
router.post('/upload-icon', upload.single('icon'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const url = `/menu-icons/${req.file.filename}`;
    res.json({ 
      url,
      filename: req.file.filename 
    });
  } catch (error) {
    console.error('Icon upload error:', error);
    res.status(500).json({ error: 'Failed to upload icon' });
  }
});

export default router;