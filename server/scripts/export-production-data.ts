#!/usr/bin/env tsx
/**
 * Production Data Export Script
 * 
 * Exports critical database records required for production deployment.
 * Run this in development environment to generate export data.
 * 
 * Usage: npm run export-production-data
 */

import { db } from '../db.js';
import { eq, and } from 'drizzle-orm';
import * as schema from '../../shared/schema.js';
import * as fs from 'fs';
import * as path from 'path';

const EXPORT_DIR = 'production-export';

interface ExportData {
  timestamp: string;
  organizationId: number;
  organizations: any[];
  users: any[];
  integrations: any[];
  agentWorkflows: any[];
  agentWorkflowSchedules: any[];
  menuSections: any[];
  menuItems: any[];
  pages: any[];
  knowledgeDocuments: any[];
  knowledgeCategories: any[];
  platformFeatures: any[];
  aiAssistantConfig: any[];
  aiAssistantFunctions: any[];
}

async function exportProductionData(organizationId: number): Promise<ExportData> {
  console.log(`\n📦 Exporting production data for Organization ID: ${organizationId}\n`);

  // 1. Organizations
  console.log('1️⃣  Exporting organizations...');
  const organizations = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, organizationId));
  console.log(`   ✅ ${organizations.length} organization(s) exported`);

  // 2. Users (including agent users - CRITICAL for workflows)
  console.log('2️⃣  Exporting users (including agent users)...');
  const users = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.organizationId, organizationId));
  
  const agentUsers = users.filter(u => u.userType === 'agent');
  const humanUsers = users.filter(u => u.userType === 'human');
  console.log(`   ✅ ${humanUsers.length} human user(s) + ${agentUsers.length} agent user(s) exported`);

  // 3. Integrations (CONTAINS ENCRYPTED CREDENTIALS)
  console.log('3️⃣  Exporting integrations (with encrypted credentials)...');
  const integrations = await db
    .select()
    .from(schema.integrations)
    .where(eq(schema.integrations.organizationId, organizationId));
  console.log(`   ✅ ${integrations.length} integration(s) exported`);
  integrations.forEach(int => {
    console.log(`      - ${int.platformType}: ${int.name} (${int.isEnabled ? 'enabled' : 'disabled'})`);
  });

  // 4. Agent Workflows (ALL AUTOMATION LOGIC)
  console.log('4️⃣  Exporting agent workflows...');
  const agentWorkflows = await db
    .select()
    .from(schema.agentWorkflows)
    .where(eq(schema.agentWorkflows.organizationId, organizationId));
  console.log(`   ✅ ${agentWorkflows.length} workflow(s) exported`);
  agentWorkflows.forEach(wf => {
    console.log(`      - ${wf.name} (${wf.triggerType}, ${wf.isEnabled ? 'enabled' : 'disabled'})`);
  });

  // 5. Agent Workflow Schedules
  console.log('5️⃣  Exporting workflow schedules...');
  const workflowIds = agentWorkflows.map(wf => wf.id);
  const agentWorkflowSchedules = await db
    .select()
    .from(schema.agentWorkflowSchedules);
  
  const filteredSchedules = agentWorkflowSchedules.filter(s => 
    workflowIds.includes(s.workflowId)
  );
  console.log(`   ✅ ${filteredSchedules.length} schedule(s) exported`);

  // 6. Menu Sections
  console.log('6️⃣  Exporting menu sections...');
  const menuSections = await db
    .select()
    .from(schema.menuSections)
    .where(eq(schema.menuSections.organizationId, organizationId));
  console.log(`   ✅ ${menuSections.length} menu section(s) exported`);

  // 7. Menu Items
  console.log('7️⃣  Exporting menu items...');
  const menuItems = await db
    .select()
    .from(schema.menuItems)
    .where(eq(schema.menuItems.organizationId, organizationId));
  console.log(`   ✅ ${menuItems.length} menu item(s) exported`);

  // 8. Pages (live and dev only)
  console.log('8️⃣  Exporting pages...');
  const pages = await db
    .select()
    .from(schema.pages)
    .where(eq(schema.pages.organizationId, organizationId));
  
  const livePages = pages.filter(p => ['live', 'dev'].includes(p.unifiedStatus || ''));
  console.log(`   ✅ ${livePages.length} page(s) exported (live/dev only)`);

  // 9. Knowledge Documents (published only)
  console.log('9️⃣  Exporting knowledge documents...');
  const knowledgeDocuments = await db
    .select()
    .from(schema.knowledgeDocuments)
    .where(
      and(
        eq(schema.knowledgeDocuments.organizationId, organizationId),
        eq(schema.knowledgeDocuments.status, 'published')
      )
    );
  console.log(`   ✅ ${knowledgeDocuments.length} knowledge document(s) exported`);

  // 10. Knowledge Categories
  console.log('🔟 Exporting knowledge categories...');
  const knowledgeCategories = await db
    .select()
    .from(schema.knowledgeCategories)
    .where(eq(schema.knowledgeCategories.organizationId, organizationId));
  console.log(`   ✅ ${knowledgeCategories.length} category/categories exported`);

  // 11. Platform Features (live only)
  console.log('1️⃣1️⃣  Exporting platform features...');
  const platformFeatures = await db
    .select()
    .from(schema.platformFeatures)
    .where(eq(schema.platformFeatures.unifiedStatus, 'live'));
  console.log(`   ✅ ${platformFeatures.length} platform feature(s) exported`);

  // 12. AI Assistant Config
  console.log('1️⃣2️⃣  Exporting AI assistant config...');
  const aiAssistantConfig = await db
    .select()
    .from(schema.aiAssistantConfig)
    .where(eq(schema.aiAssistantConfig.organizationId, organizationId));
  console.log(`   ✅ ${aiAssistantConfig.length} AI config(s) exported`);

  // 13. AI Assistant Functions
  console.log('1️⃣3️⃣  Exporting AI assistant functions...');
  const aiAssistantFunctions = await db
    .select()
    .from(schema.aiAssistantFunctions)
    .where(
      and(
        eq(schema.aiAssistantFunctions.organizationId, organizationId),
        eq(schema.aiAssistantFunctions.isEnabled, true)
      )
    );
  console.log(`   ✅ ${aiAssistantFunctions.length} AI function(s) exported\n`);

  return {
    timestamp: new Date().toISOString(),
    organizationId,
    organizations,
    users,
    integrations,
    agentWorkflows,
    agentWorkflowSchedules: filteredSchedules,
    menuSections,
    menuItems,
    pages: livePages,
    knowledgeDocuments,
    knowledgeCategories,
    platformFeatures,
    aiAssistantConfig,
    aiAssistantFunctions,
  };
}

async function generateInsertStatements(data: ExportData): Promise<string> {
  let sql = `-- Production Data Import SQL\n`;
  sql += `-- Generated: ${data.timestamp}\n`;
  sql += `-- Organization ID: ${data.organizationId}\n\n`;
  sql += `-- ⚠️ IMPORTANT: Ensure ENCRYPTION_KEY environment variable matches development!\n\n`;

  sql += `-- ==================================================\n`;
  sql += `-- 1. ORGANIZATIONS\n`;
  sql += `-- ==================================================\n`;
  data.organizations.forEach(org => {
    sql += `INSERT INTO organizations (id, name, domain, contact_email, is_active, subscription_tier, created_at)\n`;
    sql += `VALUES (${org.id}, '${org.name}', '${org.domain}', '${org.contactEmail}', ${org.isActive}, '${org.subscriptionTier}', '${org.createdAt?.toISOString()}');\n\n`;
  });

  sql += `-- ==================================================\n`;
  sql += `-- 2. USERS (including agent users)\n`;
  sql += `-- ==================================================\n`;
  data.users.forEach(user => {
    sql += `INSERT INTO users (id, email, organization_id, role, user_type, full_name, is_active, password_hash, created_at)\n`;
    sql += `VALUES (${user.id}, '${user.email}', ${user.organizationId}, '${user.role}', '${user.userType}', '${user.fullName?.replace(/'/g, "''")}', ${user.isActive}, ${user.passwordHash ? `'${user.passwordHash}'` : 'NULL'}, '${user.createdAt?.toISOString()}');\n`;
  });
  sql += `\n`;

  sql += `-- ==================================================\n`;
  sql += `-- 3. INTEGRATIONS (encrypted credentials)\n`;
  sql += `-- ==================================================\n`;
  data.integrations.forEach(int => {
    const config = JSON.stringify(int.connectionConfig).replace(/'/g, "''");
    const creds = int.credentialsEncrypted?.replace(/'/g, "''") || '';
    sql += `INSERT INTO integrations (id, organization_id, platform_type, name, connection_config, credentials_encrypted, connection_status, is_enabled, created_at)\n`;
    sql += `VALUES (${int.id}, ${int.organizationId}, '${int.platformType}', '${int.name}', '${config}'::jsonb, '${creds}', '${int.connectionStatus}', ${int.isEnabled}, '${int.createdAt?.toISOString()}');\n`;
  });
  sql += `\n`;

  sql += `-- ==================================================\n`;
  sql += `-- 4. AGENT WORKFLOWS\n`;
  sql += `-- ==================================================\n`;
  data.agentWorkflows.forEach(wf => {
    const triggerConfig = JSON.stringify(wf.triggerConfig).replace(/'/g, "''");
    const workflowDef = JSON.stringify(wf.workflowDefinition).replace(/'/g, "''");
    const retryConfig = JSON.stringify(wf.retryConfig).replace(/'/g, "''");
    
    sql += `INSERT INTO agent_workflows (id, organization_id, name, description, trigger_type, trigger_config, workflow_definition, is_enabled, assigned_user_id, retry_config, webhook_token, last_successful_run_at, created_at)\n`;
    sql += `VALUES (${wf.id}, ${wf.organizationId}, '${wf.name}', ${wf.description ? `'${wf.description.replace(/'/g, "''")}'` : 'NULL'}, '${wf.triggerType}', '${triggerConfig}'::jsonb, '${workflowDef}'::jsonb, ${wf.isEnabled}, ${wf.assignedUserId}, '${retryConfig}'::jsonb, ${wf.webhookToken ? `'${wf.webhookToken}'` : 'NULL'}, ${wf.lastSuccessfulRunAt ? `'${wf.lastSuccessfulRunAt?.toISOString()}'` : 'NULL'}, '${wf.createdAt?.toISOString()}');\n`;
  });
  sql += `\n`;

  return sql;
}

async function main() {
  const args = process.argv.slice(2);
  const organizationId = args[0] ? parseInt(args[0]) : 4; // Default to org 4

  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   Production Data Export Tool                     ║');
  console.log('║   Aimee.works Strategy OS                         ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  try {
    // Export data
    const data = await exportProductionData(organizationId);

    // Create export directory
    if (!fs.existsSync(EXPORT_DIR)) {
      fs.mkdirSync(EXPORT_DIR, { recursive: true });
    }

    // Save JSON export
    const jsonPath = path.join(EXPORT_DIR, `production-data-${organizationId}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    console.log(`✅ JSON export saved: ${jsonPath}`);

    // Generate SQL insert statements
    const sqlStatements = await generateInsertStatements(data);
    const sqlPath = path.join(EXPORT_DIR, `production-import-${organizationId}.sql`);
    fs.writeFileSync(sqlPath, sqlStatements);
    console.log(`✅ SQL import script saved: ${sqlPath}`);

    // Generate summary report
    const summary = `
PRODUCTION DATA EXPORT SUMMARY
==============================
Timestamp: ${data.timestamp}
Organization ID: ${data.organizationId}

RECORDS EXPORTED:
- Organizations: ${data.organizations.length}
- Users (human): ${data.users.filter(u => u.userType === 'human').length}
- Users (agent): ${data.users.filter(u => u.userType === 'agent').length}
- Integrations: ${data.integrations.length}
- Agent Workflows: ${data.agentWorkflows.length}
- Workflow Schedules: ${data.agentWorkflowSchedules.length}
- Menu Sections: ${data.menuSections.length}
- Menu Items: ${data.menuItems.length}
- Pages: ${data.pages.length}
- Knowledge Documents: ${data.knowledgeDocuments.length}
- Knowledge Categories: ${data.knowledgeCategories.length}
- Platform Features: ${data.platformFeatures.length}
- AI Assistant Config: ${data.aiAssistantConfig.length}
- AI Assistant Functions: ${data.aiAssistantFunctions.length}

CRITICAL INTEGRATIONS:
${data.integrations.map(int => `- ${int.platformType}: ${int.name} (${int.isEnabled ? 'enabled' : 'disabled'})`).join('\n')}

AGENT WORKFLOWS:
${data.agentWorkflows.map(wf => `- ${wf.name} (${wf.triggerType})`).join('\n')}

⚠️  IMPORTANT NOTES:
1. Ensure production ENCRYPTION_KEY matches development
2. Import organization record FIRST
3. Import users (including agent users) SECOND
4. Then import integrations, workflows, and other tables
5. Verify all foreign key relationships match

NEXT STEPS:
1. Review generated SQL file: ${sqlPath}
2. Test in production database pane
3. Verify integrations decrypt correctly
4. Test workflow execution end-to-end
`;

    const summaryPath = path.join(EXPORT_DIR, `export-summary-${organizationId}.txt`);
    fs.writeFileSync(summaryPath, summary);
    console.log(`✅ Summary report saved: ${summaryPath}`);

    console.log('\n' + summary);

    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║   Export Complete! ✅                             ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');

  } catch (error: any) {
    console.error('\n❌ Export failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  process.exit(0);
}

main();
