import { Router } from 'express';
import { z } from 'zod';
import { insertEmailTemplateSchema } from '../../shared/schema';
import { emailTemplateService } from '../services/emailTemplateService';

const router = Router();

/**
 * GET /api/email-templates
 * List all email templates for the organization
 */
router.get('/', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const templates = await (req as any).storage.getEmailTemplates(user.organizationId);
    res.json(templates);
  } catch (error: any) {
    console.error('[EmailTemplates API] Error fetching templates:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/email-templates/:id
 * Get a single email template
 */
router.get('/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }

    const template = await (req as any).storage.getEmailTemplate(user.organizationId, id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error: any) {
    console.error('[EmailTemplates API] Error fetching template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/email-templates
 * Create a new email template
 */
router.post('/', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate request body
    const templateData = insertEmailTemplateSchema.parse({
      ...req.body,
      organizationId: user.organizationId,
    });

    const created = await (req as any).storage.createEmailTemplate(templateData);
    res.status(201).json(created);
  } catch (error: any) {
    console.error('[EmailTemplates API] Error creating template:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/email-templates/:id
 * Update an existing email template
 */
router.patch('/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }

    const updated = await (req as any).storage.updateEmailTemplate(
      user.organizationId,
      id,
      req.body
    );

    if (!updated) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(updated);
  } catch (error: any) {
    console.error('[EmailTemplates API] Error updating template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/email-templates/:id
 * Delete an email template
 */
router.delete('/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }

    const deleted = await (req as any).storage.deleteEmailTemplate(user.organizationId, id);
    if (!deleted) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('[EmailTemplates API] Error deleting template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/email-templates/:id/preview
 * Preview email template with variable replacement
 */
router.post('/:id/preview', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }

    const template = await (req as any).storage.getEmailTemplate(user.organizationId, id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Get variables from request body
    const variables = req.body.variables || {};

    // Render template with variables
    const rendered = emailTemplateService.renderTemplate(template, variables);

    res.json({
      subject: rendered.subject,
      html: rendered.html,
      unresolvedVariables: rendered.unresolvedVariables,
    });
  } catch (error: any) {
    console.error('[EmailTemplates API] Error previewing template:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
