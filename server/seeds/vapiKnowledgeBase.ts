/**
 * Seed script: Vapi Voice AI Knowledge Base Documents
 * Creates 6 comprehensive KB articles documenting the Vapi integration
 * Run: tsx server/seeds/vapiKnowledgeBase.ts
 */

import { db } from '../db';
import { knowledgeDocuments, knowledgeCategories } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

const ORGANIZATION_ID = 3; // Default organization

const articles = [
  {
    title: 'Vapi Voice AI System Overview',
    slug: 'vapi-voice-ai-system-overview',
    content: '# Vapi Voice AI System Overview\n\nComprehensive autonomous support desk solution achieving 95% hands-free call resolution. Integrates with OKR/strategy infrastructure, automatically updates Key Results from call metrics, and creates work items for human actions.\n\n## Architecture\n- Triage Assistant (main entry point)\n- Residential Sales Assistant (demo conversion)\n- Residential Support Assistant (technical support)\n\n## Key Features\n- 95% autonomous resolution\n- SMS verification\n- Knowledge base integration\n- Real-time metrics tracking',
    excerpt: 'Comprehensive overview of the Vapi Voice AI system architecture, integration points, and key features.',
    isFeatured: true,
  },
  {
    title: 'Customer Journey - Business Transfer',
    slug: 'customer-journey-business-transfer',
    content: '# Customer Journey: Business Transfer\n\nHandles inbound calls from business customers. Triage Assistant identifies intent and forwards to business team.\n\n## Journey Steps\n1. Greeting (0-10 seconds)\n2. Information collection\n3. Lookup & route\n4. Create work item\n5. Transfer call\n\n## Success Criteria\n- Intent identified < 10 seconds\n- Work item created with complete details\n- Successful transfer',
    excerpt: 'Complete workflow for handling business customer calls from triage through transfer.',
    isFeatured: false,
  },
  {
    title: 'Customer Journey - Residential Sales & Demo Scheduling',
    slug: 'customer-journey-residential-sales-demo-scheduling',
    content: '# Customer Journey: Residential Sales & Demo Scheduling\n\nConverts prospective customers into demo appointments. Target: 40% demo conversion rate.\n\n## Journey Steps\n1. Warm greeting & context\n2. Service availability check\n3. Needs assessment\n4. Package presentation (Basic, Standard, Premium, Ultra)\n5. Demo scheduling\n6. Confirmation\n\n## Success Metrics\n- 40% demo conversion rate\n- Average call duration: 2-4 minutes',
    excerpt: 'Sales journey from greeting through demo scheduling with objection handling and conversion optimization.',
    isFeatured: false,
  },
  {
    title: 'Customer Journey - Residential Support with SMS Verification',
    slug: 'customer-journey-residential-support-sms-verification',
    content: '# Customer Journey: Residential Support with SMS Verification\n\nTechnical support with 95% autonomous resolution target. All interactions require SMS verification.\n\n## Journey Steps\n1. Greeting & issue identification\n2. SMS identity verification (6-digit code)\n3. Issue troubleshooting (slow speeds, connection drops, WiFi coverage, billing)\n4. Resolution or ticket creation\n5. Callback scheduling (if needed)\n\n## Success Metrics\n- 95% autonomous resolution\n- 95% SMS verification success\n- Average call duration: 2-4 minutes',
    excerpt: 'Technical support journey with SMS verification, autonomous troubleshooting, and ticket creation.',
    isFeatured: false,
  },
  {
    title: 'Managing Vapi Assistants',
    slug: 'managing-vapi-assistants',
    content: '# Managing Vapi Assistants\n\nConfiguration guide for Vapi voice AI assistants.\n\n## Assistant Types\n- Triage Assistant (routing)\n- Residential Sales (demos)\n- Residential Support (technical)\n\n## Configuration\n- Model: GPT-4\n- Voice: ElevenLabs\n- Tools: lookup_customer, send_sms_code, verify_sms_code, create_ticket, schedule_demo\n- Knowledge Base: Package details, troubleshooting guides, billing FAQ\n\n## System Prompts\nClear instructions defining goals, constraints, tools, conversation flow, rules, escalation scenarios, and tone.',
    excerpt: 'Guide to creating, configuring, and optimizing Vapi voice AI assistants.',
    isFeatured: false,
  },
  {
    title: 'Vapi OKR Metrics & Performance Tracking',
    slug: 'vapi-okr-metrics-performance-tracking',
    content: '# Vapi OKR Metrics & Performance Tracking\n\n## Strategic Objective\nAutonomous Voice Support System - Achieve 95% hands-free call resolution (Jan 1 - Dec 31, 2025)\n\n## 6 Key Results\n1. Autonomous Resolution Rate ≥95%\n2. Average Call Duration ≤180 seconds\n3. SMS Verification Success ≥95%\n4. Demo Conversion Rate ≥40%\n5. Knowledge Base Coverage ≥85%\n6. Support Tickets Created ≥300/month\n\n## Automated Updates\nDaily workflow at 9 AM updates all KRs using data_source_query steps on vapiCalls table.\n\n## Dashboard\nView at /vapi/performance showing all 6 KRs, trends, call history, and insights.',
    excerpt: 'Complete guide to the 6 OKR metrics tracking Vapi performance with automated workflows.',
    isFeatured: true,
  },
];

async function seedVapiKnowledgeBase() {
  console.log('🚀 Starting Vapi Knowledge Base seed...');

  try {
    // Create Voice AI category (skip if exists)
    try {
      const [vapiCategory] = await db.insert(knowledgeCategories).values({
        organizationId: ORGANIZATION_ID,
        name: 'Voice AI',
        slug: 'voice-ai',
        description: 'Vapi voice AI integration documentation',
        icon: '📞',
        sortOrder: 100,
        isActive: true,
      }).returning();
      console.log('✅ Created Voice AI category:', vapiCategory.id);
    } catch (error: any) {
      if (error.code !== '23505') { // Not a duplicate key error
        throw error;
      }
      console.log('✅ Voice AI category already exists');
    }

    // Create articles
    for (const article of articles) {
      const [created] = await db.insert(knowledgeDocuments).values({
        organizationId: ORGANIZATION_ID,
        title: article.title,
        content: article.content,
        summary: article.excerpt,
        status: 'published',
        visibility: 'internal',
        categories: ['voice-ai'],
        tags: ['vapi', 'voice-ai', 'automation'],
        authorId: 1,
      }).returning();
      
      console.log(`✅ Created KB article: ${created.title}`);
    }

    console.log('\n🎉 Successfully created all 6 Vapi KB articles!');

  } catch (error) {
    console.error('❌ Error seeding Vapi Knowledge Base:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedVapiKnowledgeBase()
    .then(() => {
      console.log('\n✅ Vapi Knowledge Base seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Vapi Knowledge Base seed failed:', error);
      process.exit(1);
    });
}

export { seedVapiKnowledgeBase };
