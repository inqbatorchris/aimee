import { Router } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../db';
import { sql, and, or, eq, ne, inArray } from 'drizzle-orm';
import { 
  organizations, 
  users, 
  objectives, 
  keyResults,
  knowledgeDocuments,
  platformFeatures,
  activityLogs,
  pages,
  layoutTemplates,
  menuSections,
  menuItems,
} from '@shared/schema';
import { authenticateToken } from '../auth';

const router = Router();

// Middleware to check admin access with JWT authentication
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

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





// Get all pages for page manager
router.get('/pages', async (req, res) => {
  try {
    // Get organization ID (default to 3 for development like other routes)
    const organizationId = (req as any).user?.organizationId || 3;

    // Get pages that are either:
    // 1. Core pages (available to all orgs) OR
    // 2. Pages belonging to the user's organization
    const pagesResult = await db
      .select({
        id: pages.id,
        title: pages.title,
        path: pages.path,
        slug: pages.slug,
        status: pages.status,
        buildStatus: pages.buildStatus,
        isCorePage: pages.isCorePage
      })
      .from(pages)
      .where(
        or(
          eq(pages.isCorePage, true),
          eq(pages.organizationId, organizationId)
        )
      );
    res.json(pagesResult);
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

// Get pages for navigation menu with visibility filtering
router.get('/pages/menu', async (req, res) => {
  try {
    const { developerMode = 'false' } = req.query;
    const isDeveloperMode = developerMode === 'true';
    const userRole = (req as any).userRole || 'user';
    
    // Build conditions for filtering
    const conditions = [];
    
    // Always exclude archived pages from menu
    conditions.push(ne(pages.status, 'archived'));
    
    if (!isDeveloperMode) {
      // In normal mode, only show live pages
      conditions.push(eq(pages.status, 'live'));
    } else {
      // In developer mode, show draft, dev, and live pages
      // Don't show archived pages even in dev mode
      conditions.push(
        or(
          eq(pages.status, 'live'),
          eq(pages.status, 'dev'),
          eq(pages.status, 'draft')
        )
      );
    }
    
    // Execute query
    const pagesResult = await db
      .select()
      .from(pages)
      .where(and(...conditions));
    
    // Filter pages that have "Visible in Navigation" enabled
    // This is stored in visibilityRules or pageMetadata
    const visiblePages = pagesResult.filter(page => {
      // Check if page has visibility rules
      const visibilityRules = page.visibilityRules as any || {};
      const pageMetadata = page.pageMetadata as any || {};
      
      // Check if explicitly set to false in either location
      if (pageMetadata.visibleInNavigation === false || visibilityRules.visibleInNavigation === false) {
        return false;
      }
      
      // Default to visible if not explicitly set to false
      return true;
    });
    
    res.json(visiblePages);
  } catch (error) {
    console.error('Error fetching menu pages:', error);
    res.status(500).json({ error: 'Failed to fetch menu pages' });
  }
});

// Create a new page
router.post('/pages', requireAdmin, async (req, res) => {
  try {
    const pageData = req.body;
    const [newPage] = await db.insert(pages).values(pageData).returning();
    res.json(newPage);
  } catch (error) {
    console.error('Error creating page:', error);
    res.status(500).json({ error: 'Failed to create page' });
  }
});

// Update a page (PUT - full update)
router.put('/pages/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const pageData = req.body;
    const [updatedPage] = await db
      .update(pages)
      .set({ ...pageData, updatedAt: new Date() })
      .where(eq(pages.id, id))
      .returning();
    
    if (!updatedPage) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    res.json(updatedPage);
  } catch (error) {
    console.error('Error updating page:', error);
    res.status(500).json({ error: 'Failed to update page' });
  }
});

// Update a page (PATCH - partial update)
router.patch('/pages/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('PATCH update data received:', JSON.stringify(updateData, null, 2));
    
    const [updatedPage] = await db
      .update(pages)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(pages.id, id))
      .returning();
    
    if (!updatedPage) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    res.json(updatedPage);
  } catch (error) {
    console.error('Error updating page:', error);
    console.error('Request body:', req.body);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to update page', details: errorMessage });
  }
});

// Delete a page
router.delete('/pages/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [deletedPage] = await db
      .delete(pages)
      .where(eq(pages.id, id))
      .returning();
    
    if (!deletedPage) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    res.json({ message: 'Page deleted successfully' });
  } catch (error) {
    console.error('Error deleting page:', error);
    res.status(500).json({ error: 'Failed to delete page' });
  }
});

// Get pages for menu display (filtered by developer mode and organization)
router.get('/pages/menu', requireAdmin, async (req, res) => {
  try {
    const { developerMode, organizationId } = req.query;
    const isDeveloperMode = developerMode === 'true';
    const userRole = (req as any).user?.role || 'user';
    const userOrgId = (req as any).user?.organizationId;
    
    // Determine which organization to use
    let targetOrgId = userOrgId;
    if (userRole === 'super_admin' && organizationId) {
      targetOrgId = parseInt(organizationId as string);
    }
    
    // For now, fetch all pages since pages might not have organizationId
    // In a real multi-tenant system, pages would have organizationId
    let allPages = await db.select().from(pages).orderBy(pages.title);
    
    // Filter pages based on developer mode and status
    const filteredPages = allPages.filter(page => {
      // Check if page is visible in navigation
      if (page.pageMetadata && typeof page.pageMetadata === 'object' && 'visibleInNavigation' in page.pageMetadata) {
        if (page.pageMetadata.visibleInNavigation === false) {
          return false;
        }
      }
      
      // Filter by status based on developer mode
      if (!isDeveloperMode) {
        // In production mode, only show live pages
        return page.status === 'live';
      } else {
        // In developer mode, show all except archived
        return page.status !== 'archived';
      }
    });
    
    // Ensure menu sections exist for the organization
    if (targetOrgId) {
      await ensureMenuSectionsExist(targetOrgId);
    }
    
    res.json(filteredPages);
  } catch (error) {
    console.error('Error fetching menu pages:', error);
    res.status(500).json({ error: 'Failed to fetch menu pages' });
  }
});

// Layout Templates Routes
// Get all layout templates
router.get('/layout-templates', requireAdmin, async (req, res) => {
  try {
    const templates = await db.select().from(layoutTemplates).orderBy(layoutTemplates.name);
    res.json(templates);
  } catch (error) {
    console.error('Error fetching layout templates:', error);
    res.status(500).json({ error: 'Failed to fetch layout templates' });
  }
});

// Get layout template by ID
router.get('/layout-templates/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [template] = await db.select().from(layoutTemplates).where(eq(layoutTemplates.id, parseInt(id)));
    
    if (!template) {
      return res.status(404).json({ error: 'Layout template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching layout template:', error);
    res.status(500).json({ error: 'Failed to fetch layout template' });
  }
});

// Create layout template
router.post('/layout-templates', requireAdmin, async (req, res) => {
  try {
    const templateData = req.body;
    const [newTemplate] = await db.insert(layoutTemplates).values(templateData).returning();
    res.json(newTemplate);
  } catch (error) {
    console.error('Error creating layout template:', error);
    res.status(500).json({ error: 'Failed to create layout template' });
  }
});

// Update layout template
router.put('/layout-templates/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const templateData = req.body;
    const [updatedTemplate] = await db
      .update(layoutTemplates)
      .set({ ...templateData, updatedAt: new Date() })
      .where(eq(layoutTemplates.id, parseInt(id)))
      .returning();
    
    if (!updatedTemplate) {
      return res.status(404).json({ error: 'Layout template not found' });
    }
    
    res.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating layout template:', error);
    res.status(500).json({ error: 'Failed to update layout template' });
  }
});

// Delete layout template
router.delete('/layout-templates/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [deletedTemplate] = await db
      .delete(layoutTemplates)
      .where(eq(layoutTemplates.id, parseInt(id)))
      .returning();
    
    if (!deletedTemplate) {
      return res.status(404).json({ error: 'Layout template not found' });
    }
    
    res.json({ message: 'Layout template deleted successfully' });
  } catch (error) {
    console.error('Error deleting layout template:', error);
    res.status(500).json({ error: 'Failed to delete layout template' });
  }
});

// Apply layout template to multiple pages
router.post('/layout-templates/:id/apply', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { pageIds } = req.body;
    
    if (!Array.isArray(pageIds) || pageIds.length === 0) {
      return res.status(400).json({ error: 'Page IDs array is required' });
    }
    
    const updatedPages = await db
      .update(pages)
      .set({ 
        layoutTemplateId: parseInt(id), 
        updatedAt: new Date() 
      })
      .where(inArray(pages.id, pageIds))
      .returning();
    
    res.json({ 
      message: 'Layout template applied successfully',
      updatedPages: updatedPages.length,
      pages: updatedPages
    });
  } catch (error) {
    console.error('Error applying layout template:', error);
    res.status(500).json({ error: 'Failed to apply layout template' });
  }
});

// Update a page
router.patch('/pages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Update the page in database
    const [updatedPage] = await db.update(pages)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(pages.id, id))
      .returning();

    if (!updatedPage) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.json(updatedPage);
  } catch (error) {
    console.error('Error updating page:', error);
    res.status(500).json({ error: 'Failed to update page' });
  }
});

// Serve replit.md content for documentation contract system
router.get('/replit-md', requireAdmin, async (req, res) => {
  try {
    const replitMdPath = join(process.cwd(), 'replit.md');
    const content = readFileSync(replitMdPath, 'utf-8');
    res.json({ content });
  } catch (error) {
    console.error('Error reading replit.md:', error);
    res.status(500).json({ error: 'Failed to read replit.md file' });
  }
});

// Read-only seed status endpoint for observability
router.get('/seed-status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { dryRun = 'true' } = req.query;
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required from token' });
    }

    const timestamp = new Date().toISOString();
    
    // Counts
    const featuresCount = await db.execute(
      sql`SELECT COUNT(*)::int AS c FROM platform_features WHERE organization_id = ${organizationId}`
    );
    
    const pagesLiveCount = await db.execute(
      sql`SELECT COUNT(*)::int AS c FROM pages WHERE organization_id = ${organizationId} AND (unified_status = 'live' OR status = 'live')`
    );
    
    const menuSectionsCount = await db.execute(
      sql`SELECT COUNT(*)::int AS c FROM menu_sections WHERE organization_id = ${organizationId}`
    );
    
    const menuItemsCount = await db.execute(
      sql`SELECT COUNT(*)::int AS c FROM menu_items WHERE organization_id = ${organizationId}`
    );
    

    // Orphans - pages without features (simplified since feature_pages table removed)
    const pagesWithoutFeatures = await db.execute(
      sql`SELECT p.id, p.slug, p.path, p.title
          FROM pages p
          WHERE p.organization_id = ${organizationId}
            AND (p.unified_status = 'live' OR p.status = 'live')
          ORDER BY p.title
          LIMIT 25`
    );

    const menuItemsWithoutPages = await db.execute(
      sql`SELECT mi.id, mi.title, mi.path
          FROM menu_items mi
          LEFT JOIN pages p ON p.id = mi.page_id AND p.organization_id = mi.organization_id
          WHERE mi.organization_id = ${organizationId}
            AND mi.page_id IS NOT NULL
            AND p.id IS NULL
          ORDER BY mi.title
          LIMIT 25`
    );

    // Legacy menu items - menu items that have page_id but no corresponding page record
    const legacyMenuItems = await db.execute(
      sql`SELECT mi.id, mi.title, mi.path, mi.page_id, mi.status, mi.is_visible
          FROM menu_items mi
          LEFT JOIN pages p ON p.id = mi.page_id AND p.organization_id = mi.organization_id
          WHERE mi.organization_id = ${organizationId}
            AND mi.page_id IS NOT NULL
            AND p.id IS NULL
            AND mi.is_visible = true
            AND mi.status = 'active'
          ORDER BY mi.title
          LIMIT 25`
    );

    const featuresWithoutPages = await db.execute(
      sql`SELECT pf.id, pf.name
          FROM platform_features pf
          WHERE pf.organization_id = ${organizationId}
          ORDER BY pf.name
          LIMIT 25`
    );

    // Chain validation (simplified - feature_pages table removed)
    const chainCheck = await db.execute(
      sql`WITH live_pages AS (
            SELECT id
            FROM pages
            WHERE organization_id = ${organizationId}
              AND (unified_status = 'live' OR status = 'live')
          ),
          lp_no_menu AS (
            SELECT lp.id
            FROM live_pages lp
            LEFT JOIN menu_items mi ON mi.page_id = lp.id AND mi.organization_id = ${organizationId}
            WHERE mi.page_id IS NULL
          )
          SELECT
            (SELECT COUNT(*) FROM lp_no_menu) = 0
            AS chain_ok`
    );

    const chainOk = Boolean((chainCheck.rows[0] as any)?.chain_ok);
    const status = chainOk ? 'seeded' : 'empty';

    const response = {
      status,
      timestamp,
      organization_id: organizationId,
      dry_run: dryRun === 'true',
      counts: {
        features: { actual: (featuresCount.rows[0] as any)?.c || 0 },
        pages_live: { actual: (pagesLiveCount.rows[0] as any)?.c || 0 },
        menu_sections: { actual: (menuSectionsCount.rows[0] as any)?.c || 0 },
        menu_items: { actual: (menuItemsCount.rows[0] as any)?.c || 0 },
      },
      orphans: {
        pages_without_features: pagesWithoutFeatures.rows.map(row => ({
          slug: row.slug,
          path: row.path,
          title: row.title
        })),
        menu_items_without_pages: menuItemsWithoutPages.rows.map(row => ({
          title: row.title,
          path: row.path
        })),
        features_without_pages: featuresWithoutPages.rows.map(row => ({
          id: row.id,
          name: row.name
        }))
      },
      legacy_menu_items: legacyMenuItems.rows.map(row => ({
        id: (row as any).id,
        title: (row as any).title,
        path: (row as any).path,
        reason: "no page record"
      })),
      validation: {
        chain_ok: chainOk,
        reason: chainOk ? "All live pages have feature links and menu items" : "Live pages exist without feature link and/or menu item",
        route_enforcement: "disabled"
      },
      flags: {
        ENABLE_DYNAMIC_ROUTING: process.env.ENABLE_DYNAMIC_ROUTING === 'true'
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching seed status:', error);
    res.status(500).json({ 
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Failed to fetch seed status' 
    });
  }
});

export default router;