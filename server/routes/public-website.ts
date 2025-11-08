import { Router } from 'express';
import { db } from '../db';
import { websitePages } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

router.get('/:slug?', async (req, res, next) => {
  try {
    // Only serve website pages if hostname middleware flagged this as a website request
    if (!req.app.locals.isWebsiteRequest) {
      return next();
    }

    const slug = req.params.slug || 'home';
    const organizationId = req.app.locals.websiteOrgId || 4; // Default to Country Connect

    // Skip if this looks like an app route or static file
    if (req.path.startsWith('/api') || 
        req.path.startsWith('/core') || 
        req.path.startsWith('/admin') || 
        req.path.startsWith('/strategy') ||
        req.path.startsWith('/tools') ||
        req.path.startsWith('/helpdesk') ||
        req.path.startsWith('/features') ||
        req.path.startsWith('/integrations') ||
        req.path.startsWith('/super-admin') ||
        req.path.startsWith('/login') ||
        req.path.startsWith('/forgot-password') ||
        req.path.startsWith('/reset-password') ||
        req.path.startsWith('/health') ||
        req.path.includes('.')) { // Skip static files with extensions
      return next();
    }

    const page = await db.query.websitePages.findFirst({
      where: (pages, { eq, and }) => 
        and(
          eq(pages.organizationId, organizationId),
          eq(pages.slug, slug),
          eq(pages.status, 'published')
        )
    });

    if (!page) {
      // Page not found - pass to next middleware (React app)
      return next();
    }

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${page.title}</title>
          ${page.metaDescription ? `<meta name="description" content="${page.metaDescription}">` : ''}
          
          <!-- Open Graph tags -->
          <meta property="og:title" content="${page.title}">
          ${page.metaDescription ? `<meta property="og:description" content="${page.metaDescription}">` : ''}
          <meta property="og:type" content="website">
          
          <!-- Custom CSS -->
          ${page.cssOverrides ? `<style>${page.cssOverrides}</style>` : ''}
        </head>
        <body>
          ${page.htmlContent || '<p>No content available</p>'}
        </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    console.error('Error serving website page:', error);
    // Pass to next middleware on error
    next();
  }
});

export default router;
