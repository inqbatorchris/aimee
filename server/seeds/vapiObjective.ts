import { db } from '../db';
import { objectives, keyResults, users, organizations } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export async function seedVapiObjective() {
  console.log('🌱 Seeding Vapi Voice AI Strategic Objective...');

  // Get the first organization and a user to own the objective
  const [org] = await db.select().from(organizations).limit(1);
  const [owner] = await db.select().from(users).where(eq(users.organizationId, org.id)).limit(1);

  if (!org || !owner) {
    console.error('❌ No organization or user found. Please seed organizations and users first.');
    return;
  }

  // Check if objective already exists
  const [existingObjective] = await db
    .select()
    .from(objectives)
    .where(eq(objectives.title, 'Autonomous Voice Support System'))
    .limit(1);

  if (existingObjective) {
    console.log('✅ Vapi objective already exists. Skipping seed.');
    return;
  }

  // Create the strategic objective
  const [objective] = await db
    .insert(objectives)
    .values({
      organizationId: org.id,
      title: 'Autonomous Voice Support System',
      description: 'Achieve 95% hands-free call resolution through intelligent voice AI that autonomously handles customer inquiries, verifies identities, creates support tickets, schedules demos, and seamlessly escalates complex issues to human agents when needed.',
      status: 'Active',
      ownerId: owner.id,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      displayOrder: 0,
      createdBy: owner.id,
    })
    .returning();

  console.log(`✅ Created objective: ${objective.title} (ID: ${objective.id})`);

  // Create 6 Key Results
  const keyResultsData = [
    {
      title: 'Autonomous Resolution Rate ≥95%',
      description: 'Percentage of calls resolved without human intervention (no forwarding to business/support team)',
      type: 'Percentage KPI' as const,
      targetValue: '95.00',
      currentValue: '0.00',
      status: 'Not Started' as const,
      objectiveId: objective.id,
      organizationId: org.id,
      ownerId: owner.id,
      createdBy: owner.id,
    },
    {
      title: 'Average Call Duration ≤3 minutes',
      description: 'Average duration of voice AI calls in seconds (target: 180 seconds)',
      type: 'Numeric Target' as const,
      targetValue: '180.00',
      currentValue: '0.00',
      status: 'Not Started' as const,
      objectiveId: objective.id,
      organizationId: org.id,
      ownerId: owner.id,
      createdBy: owner.id,
    },
    {
      title: 'SMS Verification Success Rate ≥95%',
      description: 'Percentage of SMS verification codes successfully verified by customers',
      type: 'Percentage KPI' as const,
      targetValue: '95.00',
      currentValue: '0.00',
      status: 'Not Started' as const,
      objectiveId: objective.id,
      organizationId: org.id,
      ownerId: owner.id,
      createdBy: owner.id,
    },
    {
      title: 'Demo Conversion Rate ≥40%',
      description: 'Percentage of residential sales calls that successfully schedule a demo appointment',
      type: 'Percentage KPI' as const,
      targetValue: '40.00',
      currentValue: '0.00',
      status: 'Not Started' as const,
      objectiveId: objective.id,
      organizationId: org.id,
      ownerId: owner.id,
      createdBy: owner.id,
    },
    {
      title: 'Knowledge Base Coverage ≥85%',
      description: 'Percentage of calls where assistant found answers in knowledge base (no knowledge gaps detected)',
      type: 'Percentage KPI' as const,
      targetValue: '85.00',
      currentValue: '0.00',
      status: 'Not Started' as const,
      objectiveId: objective.id,
      organizationId: org.id,
      ownerId: owner.id,
      createdBy: owner.id,
    },
    {
      title: 'Support Tickets Created ≥300/month',
      description: 'Total number of support tickets autonomously created from voice calls per month',
      type: 'Numeric Target' as const,
      targetValue: '300.00',
      currentValue: '0.00',
      status: 'Not Started' as const,
      objectiveId: objective.id,
      organizationId: org.id,
      ownerId: owner.id,
      createdBy: owner.id,
    },
  ];

  for (const krData of keyResultsData) {
    const [kr] = await db.insert(keyResults).values(krData).returning();
    console.log(`  ✅ Created Key Result: ${kr.title} (ID: ${kr.id})`);
  }

  console.log('🎉 Vapi Voice AI Strategic Objective seeded successfully!');
  console.log('');
  console.log('📊 Objective Overview:');
  console.log(`  Title: ${objective.title}`);
  console.log(`  Owner: ${owner.fullName || owner.username}`);
  console.log(`  Timeline: Jan 1, 2025 - Dec 31, 2025`);
  console.log(`  Key Results: 6`);
  console.log('');
  console.log('💡 Next Steps:');
  console.log('  1. Daily Vapi Metrics Sync workflow will automatically update all KRs');
  console.log('  2. View progress in Vapi Performance OKR Dashboard');
  console.log('  3. Work items will be created when alerts detected');
  console.log('');
}

// Run if called directly
if (require.main === module) {
  seedVapiObjective()
    .then(() => {
      console.log('✅ Seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}
