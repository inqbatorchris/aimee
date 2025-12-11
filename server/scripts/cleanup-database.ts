#!/usr/bin/env tsx

import { db } from '../db';
import { sql } from 'drizzle-orm';

function quoteIdentifier(name: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid table name: ${name}`);
  }
  return `"${name}"`;
}

// List of tables that should be kept (have data or are core to the new architecture)
const TABLES_TO_KEEP = [
  // Core system tables
  'organizations',
  'users', 
  'theme_settings',
  'sessions',
  'activity_logs',
  'platform_features',
  'feature_comments',
  
  // Strategy Management (core feature)
  'objectives',
  'key_results', 
  'key_result_tasks',
  'check_in_cycles',
  
  // Knowledge Base (core feature) 
  'knowledge_documents',
  'knowledge_categories',
  
  // Legacy data to potentially migrate
  'splynx_administrators'
];

// Tables to remove (all empty legacy tables)
const TABLES_TO_REMOVE = [
  // ISP Services
  'addon_services', 'customer_cable_associations', 'customer_service_addons',
  'customer_services', 'cable_runs', 'service_areas', 'service_categories',
  'tariffs', 'invoices', 'invoice_items', 'payments', 'referrals',
  
  // AI Systems  
  'ai_agent_configurations', 'ai_agent_usage_metrics', 'ai_agent_versions',
  'ai_agents', 'ai_request_logs',
  
  // Managed Services
  'managed_services_audit_log', 'managed_services_change_requests',
  'managed_services_clients', 'managed_services_devices', 'managed_services_licenses',
  'managed_services_teams', 'managed_services_users',
  
  // Training System
  'training_activity_logs', 'training_assignments', 'training_completions',
  
  // HR/Scheduling  
  'shifts', 'shift_assignments', 'shift_requests', 'time_off_requests',
  'time_off_types', 'user_shift_permissions',
  
  // Sprint Management
  'sprints', 'sprint_roles', 'sprint_ticket_comments', 'sprint_ticket_votes',
  'sprint_tickets', 'backlog_items',
  
  // Help Desk/Tickets
  'tickets', 'ticket_messages', 'ticket_drafts',
  
  // VAPI Integration
  'vapi_assistant_tools', 'vapi_integrations', 'vapi_interaction_logs',
  'vapi_requests', 'vapi_tools',
  
  // Duplicate/Legacy Knowledge Base
  'kb_documents', 'knowledge_base_categories', 'knowledge_base_records',
  'enhanced_knowledge_documents', 'enhanced_document_sections',
  
  // Work Management (will be rebuilt modularly)  
  'work_item_attachments', 'work_item_assignments', 'habit_automation_agents',
  'habit_kpi_data_points', 'agent_execution_logs',
  
  // Task Management (will be rebuilt)
  'task_attachments', 'task_comments', 'task_habit_completions',
  
  // Misc Empty Tables
  'check_in_updates', 'checkin_meeting_instances', 'checkin_meeting_types',
  'cycle_transitions', 'invitations', 'invite_requests', 'mission_display',
  'objective_backlog_links', 'usage_data'
];

async function cleanupDatabase() {
  console.log('🧹 Starting database cleanup...\n');
  
  let totalRemoved = 0;
  let errors: string[] = [];
  
  // Remove legacy tables
  for (const tableName of TABLES_TO_REMOVE) {
    try {
      await db.execute(sql`DROP TABLE IF EXISTS ${sql.raw(quoteIdentifier(tableName))} CASCADE`);
      console.log(`✅ Removed table: ${tableName}`);
      totalRemoved++;
    } catch (error) {
      const errorMsg = `❌ Failed to remove ${tableName}: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }
  
  console.log(`\n📊 Cleanup Summary:`);
  console.log(`✅ Tables removed: ${totalRemoved}`);
  console.log(`❌ Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    errors.forEach(error => console.log(`  ${error}`));
  }
  
  // Show remaining tables
  console.log('\n📋 Remaining tables:');
  const result = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  
  const remainingTables = result.rows.map(row => row.table_name);
  remainingTables.forEach(table => {
    const isCore = TABLES_TO_KEEP.includes(table as string);
    console.log(`  ${isCore ? '✅' : '⚠️'} ${table}`);
  });
  
  console.log(`\nTotal remaining tables: ${remainingTables.length}`);
  console.log('\n🎯 Database cleanup completed!');
}

// Run cleanup
cleanupDatabase().catch(console.error);