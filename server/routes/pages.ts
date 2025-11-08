import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { pages } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

// Get page content by ID
router.get('/:pageId/content', async (req, res) => {
  try {
    const { pageId } = req.params;
    
    // Validate pageId is a UUID
    if (!pageId || !pageId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({ error: 'Invalid page ID format' });
    }

    // Fetch page data from database
    const page = await db
      .select()
      .from(pages)
      .where(eq(pages.id, pageId))
      .limit(1);

    if (!page || page.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const pageData = page[0];

    // Check if user has permission to view the page
    // For now, we'll allow all authenticated users to view pages
    // TODO: Add proper role-based access control based on page visibility rules

    // Return page content
    res.json({
      id: pageData.id,
      title: pageData.title,
      description: pageData.description,
      content: pageData.pageContent || [],
      metadata: pageData.pageMetadata || {},
      config: pageData.componentConfig || {},
      layoutConfig: pageData.layoutTemplateId || {},
      status: pageData.status,
      functions: pageData.functions || [],
      themeOverrides: pageData.themeOverrides || {}
    });

  } catch (error) {
    console.error('Error fetching page content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get page metadata by ID (lighter endpoint for navigation)
router.get('/:pageId/metadata', async (req, res) => {
  try {
    const { pageId } = req.params;
    
    if (!pageId || !pageId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({ error: 'Invalid page ID format' });
    }

    const page = await db
      .select({
        id: pages.id,
        title: pages.title,
        description: pages.description,
        status: pages.status,
        path: pages.path,
        metadata: pages.pageMetadata
      })
      .from(pages)
      .where(eq(pages.id, pageId))
      .limit(1);

    if (!page || page.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.json(page[0]);

  } catch (error) {
    console.error('Error fetching page metadata:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get page names by multiple IDs
router.post('/by-ids', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid or missing page IDs' });
    }

    // Validate all IDs are UUIDs
    const validIds = ids.filter(id => 
      id && id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    );

    if (validIds.length === 0) {
      return res.status(400).json({ error: 'No valid page IDs provided' });
    }

    // Fetch pages from database
    const pageList = await db
      .select({
        id: pages.id,
        title: pages.title
      })
      .from(pages);

    // Filter to only requested IDs
    const requestedPages = pageList.filter(page => validIds.includes(page.id));

    // Return as object with ID as key for easy lookup
    const pageMap = requestedPages.reduce((acc, page) => {
      acc[page.id] = page.title;
      return acc;
    }, {} as Record<string, string>);

    res.json(pageMap);

  } catch (error) {
    console.error('Error fetching page names:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router };
export default router;