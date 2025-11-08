import { db } from '../db';
import { aiAssistantFunctions } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Seeds database access AI functions for read-only operations
 * Run with: npx tsx server/scripts/seed-database-access-functions.ts
 */

const DATABASE_ACCESS_FUNCTIONS = [
  // ============================================================================
  // ADDRESS DATABASE ACCESS
  // ============================================================================
  {
    organizationId: 4,
    functionName: 'list_addresses',
    displayName: 'List Addresses',
    description: 'Look up addresses from the database with optional filters',
    category: 'Database Access',
    functionSchema: {
      name: 'list_addresses',
      description: 'Search and retrieve addresses from the database. Use this to look up addresses by street name, area, status, or connection.',
      parameters: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description: 'Search text to find in street name, area, or address fields'
          },
          connectionId: {
            type: 'number',
            description: 'Filter by Airtable connection ID'
          },
          localStatus: {
            type: 'string',
            description: 'Filter by local status (e.g., "ready", "pending", "completed")'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of addresses to return (max 100)',
            default: 20
          }
        }
      }
    },
    requiresApproval: false,
    isEnabled: true,
    isSystemFunction: false,
    dataScope: 'organization',
    minimumRole: 'team_member',
  },
  
  // ============================================================================
  // ACTIVITY LOG ACCESS
  // ============================================================================
  {
    organizationId: 4,
    functionName: 'get_recent_activity',
    displayName: 'Get Recent Activity',
    description: 'Review recent activity logs for objectives, key results, and work items',
    category: 'Database Access',
    functionSchema: {
      name: 'get_recent_activity',
      description: 'Retrieve recent activity logs to see what has been accomplished, updated, or changed. Use this to answer questions like "What did we accomplish this week?" or "Show me updates on objective X".',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Number of days to look back (default 7, max 90)',
            default: 7
          },
          entityType: {
            type: 'string',
            enum: ['objective', 'key_result', 'key_result_task', 'work_item', 'all'],
            description: 'Filter by entity type, or "all" for everything',
            default: 'all'
          },
          actionType: {
            type: 'string',
            enum: ['creation', 'status_change', 'assignment', 'comment', 'completion', 'kpi_update', 'all'],
            description: 'Filter by action type',
            default: 'all'
          },
          userId: {
            type: 'number',
            description: 'Filter by specific user ID'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of activity entries to return (max 200)',
            default: 50
          }
        }
      }
    },
    requiresApproval: false,
    isEnabled: true,
    isSystemFunction: false,
    dataScope: 'organization',
    minimumRole: 'team_member',
  },
];

async function seedDatabaseAccessFunctions() {
  console.log('🌱 Starting database access functions seed...\n');
  
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const func of DATABASE_ACCESS_FUNCTIONS) {
    try {
      // Check if function already exists
      const existing = await db.query.aiAssistantFunctions.findFirst({
        where: and(
          eq(aiAssistantFunctions.organizationId, func.organizationId),
          eq(aiAssistantFunctions.functionName, func.functionName)
        )
      });

      if (existing) {
        // Update existing function
        await db.update(aiAssistantFunctions)
          .set({
            displayName: func.displayName,
            description: func.description,
            category: func.category,
            functionSchema: func.functionSchema,
            requiresApproval: func.requiresApproval,
            isEnabled: func.isEnabled,
            dataScope: func.dataScope,
            minimumRole: func.minimumRole,
            updatedAt: new Date(),
          })
          .where(eq(aiAssistantFunctions.id, existing.id));
        
        console.log(`✅ Updated: ${func.displayName}`);
        updated++;
      } else {
        // Create new function
        await db.insert(aiAssistantFunctions).values(func);
        console.log(`✨ Created: ${func.displayName}`);
        created++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${func.displayName}:`, error);
      skipped++;
    }
  }

  console.log('\n📊 Seed Summary:');
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log('✅ Database access functions seed complete!\n');
  
  process.exit(0);
}

seedDatabaseAccessFunctions().catch(error => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
