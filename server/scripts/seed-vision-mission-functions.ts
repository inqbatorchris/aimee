import { db } from '../db';
import { aiAssistantFunctions } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Seeds Vision & Mission AI functions for organization 4
 * Run with: npx tsx server/scripts/seed-vision-mission-functions.ts
 */

const VISION_MISSION_FUNCTIONS = [
  // ============================================================================
  // VISION & MISSION FUNCTIONS
  // ============================================================================
  {
    organizationId: 4,
    functionName: 'get_vision_mission',
    displayName: 'Get Vision & Mission',
    description: 'View the organization\'s vision and mission statements',
    category: 'Strategy',
    functionSchema: {
      name: 'get_vision_mission',
      description: 'Retrieve the organization\'s vision and mission statements and strategy statement',
      parameters: {
        type: 'object',
        properties: {}
      }
    },
    requiresApproval: false,
    isEnabled: true,
    isSystemFunction: false,
    dataScope: 'organization',
    minimumRole: 'team_member',
  },
  {
    organizationId: 4,
    functionName: 'update_vision_mission',
    displayName: 'Update Vision & Mission',
    description: 'Update the organization\'s vision and mission statements',
    category: 'Strategy',
    functionSchema: {
      name: 'update_vision_mission',
      description: 'Update the organization\'s vision statement, mission statement, or strategy statement. At least one field must be provided.',
      parameters: {
        type: 'object',
        properties: {
          mission: {
            type: 'string',
            description: 'The organization\'s mission statement - what we do and who we serve'
          },
          vision: {
            type: 'string',
            description: 'The organization\'s vision statement - where we\'re going and what we aspire to achieve'
          },
          strategyStatementHtml: {
            type: 'string',
            description: 'The organization\'s strategy statement in HTML format - how we will achieve our vision'
          }
        }
      }
    },
    requiresApproval: true,
    isEnabled: true,
    isSystemFunction: false,
    dataScope: 'organization',
    minimumRole: 'manager',
  },
];

async function main() {
  console.log('🌱 Seeding Vision & Mission AI functions...\n');

  for (const func of VISION_MISSION_FUNCTIONS) {
    try {
      // Check if function already exists
      const existing = await db.query.aiAssistantFunctions.findFirst({
        where: and(
          eq(aiAssistantFunctions.organizationId, func.organizationId),
          eq(aiAssistantFunctions.functionName, func.functionName)
        ),
      });

      if (existing) {
        console.log(`⏭️  Skipping ${func.displayName} - already exists (ID: ${existing.id})`);
        continue;
      }

      // Insert new function
      const [created] = await db.insert(aiAssistantFunctions).values(func).returning();
      console.log(`✅ Created ${func.displayName} (ID: ${created.id})`);
    } catch (error: any) {
      console.error(`❌ Failed to create ${func.displayName}:`, error.message);
    }
  }

  console.log('\n🎉 Seeding complete!');
  console.log('\nSummary:');
  console.log('  Vision & Mission: 2 functions (get, update)');
  console.log('\nTotal: 2 new AI functions added\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
