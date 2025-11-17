import { db } from '../db';
import { integrations } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { storage } from '../storage';
import type { InsertIntegrationAction } from '@shared/schema';

/**
 * Register send_email_campaign action for Splynx integration
 * Run with: npx tsx server/scripts/register-email-campaign-action.ts
 */

async function registerEmailCampaignAction() {
  console.log('[EMAIL CAMPAIGN] Starting registration...');

  try {
    // Get Splynx integration for organization 1
    const splynxIntegration = await db.query.integrations.findFirst({
      where: eq(integrations.platformType, 'splynx')
    });

    if (!splynxIntegration) {
      console.error('[EMAIL CAMPAIGN] No Splynx integration found');
      process.exit(1);
    }

    console.log('[EMAIL CAMPAIGN] Found Splynx integration:', splynxIntegration.id);

    // Define the send_email_campaign action
    const emailCampaignAction: InsertIntegrationAction = {
      integrationId: splynxIntegration.id,
      actionKey: 'send_email_campaign',
      name: 'Send Email Campaign',
      description: 'Send templated email to filtered customers using Splynx email templates',
      category: 'Messaging',
      httpMethod: 'POST',
      endpoint: '/api/2.0/admin/messages/mass-sending',
      parameterSchema: {
        type: 'object',
        required: ['templateId'],
        properties: {
          templateId: {
            type: 'number',
            description: 'Splynx email template ID'
          },
          customerIds: {
            type: 'array',
            items: { type: 'number' },
            description: 'Array of customer IDs to send email to. If not provided, sends to all active customers.'
          },
          customVariables: {
            type: 'object',
            description: 'Custom template variables as key-value pairs (e.g., {"month": "November", "offer": "20% off"})'
          }
        }
      },
      responseSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          sentCount: { type: 'number', description: 'Number of emails sent successfully' },
          failedCount: { type: 'number', description: 'Number of failed email sends' },
          details: { type: 'object', description: 'Additional response details from Splynx' }
        }
      },
      requiredFields: ['templateId'],
      optionalFields: ['customerIds', 'customVariables'],
      docsUrl: 'https://splynx.docs.apiary.io/#reference/messages/mass-sending',
      resourceType: 'message',
      idempotent: false,
      isActive: true
    };

    // Upsert the action using storage method
    const actions = await storage.upsertIntegrationActions(
      splynxIntegration.id,
      [emailCampaignAction]
    );

    console.log('[EMAIL CAMPAIGN] Action registered successfully:', actions[0]);
    console.log('[EMAIL CAMPAIGN] Action ID:', actions[0].id);
    console.log('[EMAIL CAMPAIGN] Action Key:', actions[0].actionKey);

    process.exit(0);
  } catch (error) {
    console.error('[EMAIL CAMPAIGN] Registration failed:', error);
    process.exit(1);
  }
}

registerEmailCampaignAction();
