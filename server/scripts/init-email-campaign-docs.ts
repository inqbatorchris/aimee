import { coreStorage } from '../core-storage';

async function initializeEmailCampaignDocs() {
  console.log('Initializing Email Campaign knowledge base documents...');
  
  try {
    const organizationId = 1;
    const adminUserId = 1;
    
    const emailCampaignDocs = [
      {
        title: 'Getting Started with Email Campaigns',
        content: `# Getting Started with Splynx Email Campaigns

## Overview

Splynx Email Campaigns allows you to create, manage, and deploy targeted email campaigns to your customers directly from aimee.works. This feature integrates seamlessly with your Splynx instance to leverage customer data and send personalized emails at scale.

## Prerequisites

Before using Email Campaigns, ensure you have:
1. **Active Splynx Integration** - Your Splynx instance must be connected in the Splynx Setup page
2. **Valid API Credentials** - Splynx API key with permissions to access customers and send emails
3. **Agent Builder Access** - Ability to create and execute workflows

## Quick Start Guide

### Step 1: Create an Email Template

1. Navigate to **Integrations → Splynx Setup**
2. Click on the **Email Templates** tab
3. Click **New Template** button
4. Fill in the template details:
   - **Name**: Give your template a descriptive name
   - **Subject**: Write your email subject (supports variables)
   - **Body**: Compose your email content (HTML supported)
5. Click **Create Template**

### Step 2: Build a Campaign Workflow

1. Go to **Agent Builder** (or Tools & Agents)
2. Create a new workflow or edit an existing one
3. Add a **Data Source Query** step to filter customers:
   - Select your data source
   - Apply filters (e.g., active customers, specific location)
   - Store result as a variable (e.g., \`targetCustomers\`)
4. Add an **Integration Action** step:
   - Select **Splynx** integration
   - Choose **Send Email Campaign** action
   - Select your email template
   - Leave Customer IDs empty to use query results
   - (Optional) Add custom variables as JSON

### Step 3: Deploy Your Campaign

1. Save your workflow
2. Test with a small customer segment first
3. Review execution logs to verify delivery
4. Schedule or trigger the workflow as needed

## Best Practices

- **Start Small**: Test campaigns with a small group before sending to all customers
- **Use Variables**: Personalize emails with customer data variables
- **Monitor Results**: Check workflow logs to track sent/failed emails
- **Template Testing**: Preview templates before creating campaigns

## Need Help?

- See **Email Template Variables Reference** for available placeholders
- Check **Troubleshooting Email Campaigns** for common issues
- Contact your administrator for additional support

---

*Ready to engage your customers with targeted email campaigns!*`,
        summary: 'Complete guide to setting up and deploying email campaigns using Splynx integration',
        category: 'Getting Started',
        tags: ['email', 'campaigns', 'splynx', 'marketing', 'getting-started'],
        status: 'published' as 'published',
        visibility: 'internal' as 'internal',
        authorId: adminUserId,
        estimatedReadingTime: 5,
        organizationId,
      },
      {
        title: 'Email Template Variables Reference',
        content: `# Email Template Variables Reference

## Available Variables

Email templates support dynamic variable substitution to personalize messages for each recipient. Variables are enclosed in double curly braces: \`{{variable.name}}\`

## Customer Variables

These variables are automatically populated from Splynx customer data:

| Variable | Description | Example |
|----------|-------------|---------|
| \`{{customer.name}}\` | Customer's full name | John Smith |
| \`{{customer.email}}\` | Customer's email address | john@example.com |
| \`{{customer.login}}\` | Customer's login username | jsmith |
| \`{{customer.id}}\` | Customer's ID in Splynx | 12345 |
| \`{{customer.status}}\` | Customer status | Active |
| \`{{customer.phone}}\` | Customer's phone number | +1-555-0123 |

## Company Variables

These variables reflect your company information from Splynx:

| Variable | Description | Example |
|----------|-------------|---------|
| \`{{company.name}}\` | Your company name | Acme Internet Services |
| \`{{company.email}}\` | Company support email | support@acme-isp.com |
| \`{{company.phone}}\` | Company phone number | 1-800-ACME-ISP |
| \`{{company.website}}\` | Company website URL | https://acme-isp.com |

## Custom Variables

You can pass custom variables through the workflow configuration:

### Example Custom Variables (JSON):
\`\`\`json
{
  "month": "January",
  "offer": "50% off first month",
  "deadline": "2025-01-31",
  "coupon_code": "WINTER2025"
}
\`\`\`

### Usage in Template:
\`\`\`html
Dear {{customer.name}},

This {{month}} only, get {{offer}}!
Use code {{coupon_code}} before {{deadline}}.

Thanks,
{{company.name}}
\`\`\`

## Workflow Result Variables

If your workflow includes Data Source Query steps, you can reference their results:

| Variable Pattern | Description |
|-----------------|-------------|
| \`{{queryResult.count}}\` | Number of records from query |
| \`{{queryResult.field_name}}\` | Specific field from query result |

## HTML Support

Email templates support full HTML formatting:

\`\`\`html
<h1>Welcome {{customer.name}}!</h1>
<p>Thank you for being a valued customer of <strong>{{company.name}}</strong>.</p>
<a href="{{company.website}}">Visit our website</a>
\`\`\`

## Best Practices

1. **Always include fallbacks**: Some variables may be empty for certain customers
2. **Test thoroughly**: Send test emails to verify variable substitution
3. **Escape special characters**: In HTML templates, use proper HTML entities
4. **Keep it simple**: Don't overuse variables - maintain readability
5. **Preview before sending**: Check how templates look with real data

## Troubleshooting

- **Variable not replaced**: Check spelling and ensure data exists in Splynx
- **HTML not rendering**: Verify your HTML syntax is valid
- **Missing customer data**: Ensure Splynx sync is up to date

---

*Use variables effectively to create personalized, engaging email campaigns!*`,
        summary: 'Complete reference guide for all available email template variables and their usage',
        category: 'Features & How-to',
        tags: ['email', 'templates', 'variables', 'reference', 'personalization'],
        status: 'published' as 'published',
        visibility: 'internal' as 'internal',
        authorId: adminUserId,
        estimatedReadingTime: 6,
        organizationId,
      },
      {
        title: 'Troubleshooting Email Campaigns',
        content: `# Troubleshooting Email Campaigns

## Common Issues and Solutions

### Emails Not Sending

**Symptom**: Campaign workflow completes but no emails are delivered

**Possible Causes**:
1. **Splynx Connection Issue**
   - Solution: Test your Splynx connection in Setup page
   - Verify API credentials are valid
   - Check Splynx instance is accessible

2. **No Template Selected**
   - Solution: Ensure you selected a template in the workflow
   - Verify template ID is valid

3. **Empty Customer List**
   - Solution: Check your Data Source Query results
   - Verify customer filter isn't too restrictive
   - Ensure customer IDs are passed correctly

4. **Invalid Email Addresses**
   - Solution: Check customer records in Splynx
   - Verify email field is populated and valid

### Template Variables Not Replacing

**Symptom**: Emails show \`{{variable.name}}\` instead of actual values

**Possible Causes**:
1. **Incorrect Variable Syntax**
   - Solution: Use exactly \`{{variable.name}}\` with double curly braces
   - Check for typos in variable names

2. **Missing Customer Data**
   - Solution: Verify data exists in Splynx
   - Update customer records if needed

3. **Custom Variables Not Passed**
   - Solution: Check workflow configuration
   - Verify JSON format is valid in custom variables field

### Workflow Execution Fails

**Symptom**: Email campaign step shows error in workflow logs

**Possible Causes**:
1. **API Rate Limiting**
   - Solution: Reduce batch size
   - Add delay between workflow runs
   - Contact Splynx support for rate limit increase

2. **Invalid Template ID**
   - Solution: Sync templates from Splynx Setup
   - Select valid template from dropdown

3. **Missing Permissions**
   - Solution: Verify Splynx API key has email permissions
   - Check with Splynx administrator

### Partial Delivery

**Symptom**: Some emails send, others fail

**Possible Causes**:
1. **Invalid Email Addresses**
   - Solution: Review failed customer list in logs
   - Clean up customer data in Splynx

2. **Splynx Service Interruption**
   - Solution: Check Splynx status
   - Retry failed sends after service restoration

### Template Management Issues

**Symptom**: Cannot create/edit/delete templates

**Possible Causes**:
1. **Sync Not Working**
   - Solution: Click "Sync from Splynx" button
   - Verify connection status

2. **Permission Issues**
   - Solution: Verify your user has admin access
   - Check Splynx API permissions

## Debugging Steps

1. **Check Workflow Logs**
   - Navigate to workflow execution history
   - Review step-by-step execution details
   - Look for error messages

2. **Test Connection**
   - Go to Splynx Setup → Connection tab
   - Click "Test Connection"
   - Review debug log output

3. **Verify Template**
   - Go to Splynx Setup → Email Templates
   - Edit template and preview
   - Test with sample data

4. **Check Customer Data**
   - Run Data Source Query separately
   - Verify customer IDs and email addresses
   - Ensure customer list is not empty

## Getting Additional Help

If you continue experiencing issues:

1. **Check Activity Logs**
   - Splynx Setup → Activities tab
   - Review recent actions and errors

2. **Review Integration Status**
   - Verify Splynx connection is "Active"
   - Check last sync timestamp

3. **Contact Administrator**
   - Provide workflow ID
   - Include error messages from logs
   - Describe expected vs actual behavior

---

*Most email campaign issues can be resolved by verifying connection, templates, and customer data!*`,
        summary: 'Solutions to common email campaign issues and debugging guide',
        category: 'Troubleshooting',
        tags: ['email', 'campaigns', 'troubleshooting', 'debugging', 'errors'],
        status: 'published' as 'published',
        visibility: 'internal' as 'internal',
        authorId: adminUserId,
        estimatedReadingTime: 7,
        organizationId,
      }
    ];

    for (const docData of emailCampaignDocs) {
      try {
        const document = await coreStorage.createKnowledgeDocument(docData);
        console.log(`✓ Created knowledge document: ${document.title}`);
      } catch (error: any) {
        console.error(`✗ Failed to create document ${docData.title}:`, error.message);
      }
    }

    console.log('\n✅ Email Campaign documentation initialized successfully!');
    console.log('\nCreated documents:');
    console.log('- Getting Started with Email Campaigns');
    console.log('- Email Template Variables Reference');
    console.log('- Troubleshooting Email Campaigns');

  } catch (error) {
    console.error('❌ Email Campaign documentation initialization failed:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  initializeEmailCampaignDocs()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { initializeEmailCampaignDocs };
