import { db } from '../db';
import { workflows, workflowSteps, keyResults, objectives, organizations } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export async function seedVapiWorkflows() {
  console.log('🌱 Seeding Vapi Voice AI Workflows...');

  // Get the first organization
  const [org] = await db.select().from(organizations).limit(1);
  
  if (!org) {
    console.error('❌ No organization found. Please seed organizations first.');
    return;
  }

  // Get the Vapi objective and its 6 Key Results
  const [vapiObjective] = await db
    .select()
    .from(objectives)
    .where(eq(objectives.title, 'Autonomous Voice Support System'))
    .limit(1);

  if (!vapiObjective) {
    console.error('❌ Vapi objective not found. Please run seedVapiObjective first.');
    return;
  }

  // Get all 6 Key Results by title
  const krs = await db
    .select()
    .from(keyResults)
    .where(eq(keyResults.objectiveId, vapiObjective.id));

  const krMap = {
    autonomousResolution: krs.find(kr => kr.title.includes('Autonomous Resolution'))?.id,
    callDuration: krs.find(kr => kr.title.includes('Call Duration'))?.id,
    smsVerification: krs.find(kr => kr.title.includes('SMS Verification'))?.id,
    demoConversion: krs.find(kr => kr.title.includes('Demo Conversion'))?.id,
    knowledgeCoverage: krs.find(kr => kr.title.includes('Knowledge Base Coverage'))?.id,
    ticketsCreated: krs.find(kr => kr.title.includes('Tickets Created'))?.id,
  };

  console.log('📊 Found Key Results:', krMap);

  // Check if workflows already exist
  const existingWorkflow = await db
    .select()
    .from(workflows)
    .where(eq(workflows.name, 'Daily Vapi Metrics Sync'))
    .limit(1);

  if (existingWorkflow.length > 0) {
    console.log('✅ Vapi workflows already exist. Skipping seed.');
    return;
  }

  // ========================================
  // WORKFLOW 1: Daily Vapi Metrics Sync
  // ========================================
  const [metricsWorkflow] = await db
    .insert(workflows)
    .values({
      organizationId: org.id,
      name: 'Daily Vapi Metrics Sync',
      description: 'Automatically calculates all 6 Vapi KR metrics from call data and updates Key Results daily at 9 AM',
      status: 'active',
      triggerType: 'schedule',
      scheduleExpression: '0 9 * * *', // Daily at 9 AM
    })
    .returning();

  console.log(`  ✅ Created workflow: ${metricsWorkflow.name}`);

  // Step 1: Calculate Autonomous Resolution Rate
  await db.insert(workflowSteps).values({
    workflowId: metricsWorkflow.id,
    stepType: 'data_source_query',
    stepOrder: 1,
    name: 'Calculate Autonomous Resolution Rate',
    description: 'Query vapiCalls to calculate percentage of autonomous resolutions',
    config: {
      sourceTable: 'vapiCalls',
      queryConfig: {
        aggregation: 'custom_sql',
        customAggregation: 'ROUND((SUM(CASE WHEN was_autonomous = true THEN 1 ELSE 0 END)::decimal / NULLIF(COUNT(*), 0)) * 100, 2)',
        filters: [
          {
            field: 'startedAt',
            operator: 'gte',
            value: '{dateRangeStart}' // Last 30 days
          }
        ]
      },
      resultVariable: 'autonomousRate',
      updateKeyResult: {
        keyResultId: krMap.autonomousResolution,
        updateType: 'set_value'
      }
    }
  });

  // Step 2: Calculate Average Call Duration
  await db.insert(workflowSteps).values({
    workflowId: metricsWorkflow.id,
    stepType: 'data_source_query',
    stepOrder: 2,
    name: 'Calculate Average Call Duration',
    description: 'Query vapiCalls to calculate average duration in seconds',
    config: {
      sourceTable: 'vapiCalls',
      queryConfig: {
        aggregation: 'avg',
        field: 'durationSeconds',
        filters: [
          {
            field: 'startedAt',
            operator: 'gte',
            value: '{dateRangeStart}'
          },
          {
            field: 'durationSeconds',
            operator: 'is_not_null'
          }
        ]
      },
      resultVariable: 'avgDuration',
      updateKeyResult: {
        keyResultId: krMap.callDuration,
        updateType: 'set_value'
      }
    }
  });

  // Step 3: Calculate SMS Verification Success Rate
  await db.insert(workflowSteps).values({
    workflowId: metricsWorkflow.id,
    stepType: 'data_source_query',
    stepOrder: 3,
    name: 'Calculate SMS Verification Success Rate',
    description: 'Query vapiCalls where SMS was sent to calculate success rate',
    config: {
      sourceTable: 'vapiCalls',
      queryConfig: {
        aggregation: 'custom_sql',
        customAggregation: 'ROUND((SUM(CASE WHEN sms_code_verified = true THEN 1 ELSE 0 END)::decimal / NULLIF(SUM(CASE WHEN sms_code_sent = true THEN 1 ELSE 0 END), 0)) * 100, 2)',
        filters: [
          {
            field: 'startedAt',
            operator: 'gte',
            value: '{dateRangeStart}'
          },
          {
            field: 'smsCodeSent',
            operator: 'equals',
            value: true
          }
        ]
      },
      resultVariable: 'smsSuccessRate',
      updateKeyResult: {
        keyResultId: krMap.smsVerification,
        updateType: 'set_value'
      }
    }
  });

  // Step 4: Calculate Demo Conversion Rate
  await db.insert(workflowSteps).values({
    workflowId: metricsWorkflow.id,
    stepType: 'data_source_query',
    stepOrder: 4,
    name: 'Calculate Demo Conversion Rate',
    description: 'Query vapiCalls with sales intent to calculate demo scheduling rate',
    config: {
      sourceTable: 'vapiCalls',
      queryConfig: {
        aggregation: 'custom_sql',
        customAggregation: 'ROUND((SUM(CASE WHEN demo_scheduled = true THEN 1 ELSE 0 END)::decimal / NULLIF(COUNT(*), 0)) * 100, 2)',
        filters: [
          {
            field: 'startedAt',
            operator: 'gte',
            value: '{dateRangeStart}'
          },
          {
            field: 'customerIntent',
            operator: 'equals',
            value: 'sales'
          }
        ]
      },
      resultVariable: 'demoConversionRate',
      updateKeyResult: {
        keyResultId: krMap.demoConversion,
        updateType: 'set_value'
      }
    }
  });

  // Step 5: Calculate Knowledge Base Coverage
  await db.insert(workflowSteps).values({
    workflowId: metricsWorkflow.id,
    stepType: 'data_source_query',
    stepOrder: 5,
    name: 'Calculate Knowledge Base Coverage',
    description: 'Query vapiCalls to calculate percentage without knowledge gaps',
    config: {
      sourceTable: 'vapiCalls',
      queryConfig: {
        aggregation: 'custom_sql',
        customAggregation: 'ROUND(((COUNT(*) - SUM(CASE WHEN jsonb_array_length(knowledge_gaps) > 0 THEN 1 ELSE 0 END))::decimal / NULLIF(COUNT(*), 0)) * 100, 2)',
        filters: [
          {
            field: 'startedAt',
            operator: 'gte',
            value: '{dateRangeStart}'
          }
        ]
      },
      resultVariable: 'kbCoverage',
      updateKeyResult: {
        keyResultId: krMap.knowledgeCoverage,
        updateType: 'set_value'
      }
    }
  });

  // Step 6: Count Tickets Created
  await db.insert(workflowSteps).values({
    workflowId: metricsWorkflow.id,
    stepType: 'data_source_query',
    stepOrder: 6,
    name: 'Count Tickets Created',
    description: 'Query vapiCalls to count support tickets created in last 30 days',
    config: {
      sourceTable: 'vapiCalls',
      queryConfig: {
        aggregation: 'count',
        filters: [
          {
            field: 'startedAt',
            operator: 'gte',
            value: '{dateRangeStart}'
          },
          {
            field: 'ticketCreated',
            operator: 'equals',
            value: true
          }
        ]
      },
      resultVariable: 'ticketCount',
      updateKeyResult: {
        keyResultId: krMap.ticketsCreated,
        updateType: 'set_value'
      }
    }
  });

  // ========================================
  // WORKFLOW 2: Real-Time Alert on Escalation Spike
  // ========================================
  const [alertWorkflow] = await db
    .insert(workflows)
    .values({
      organizationId: org.id,
      name: 'Vapi Escalation Spike Alert',
      description: 'Monitors for sudden spike in human escalations and creates work item for review',
      status: 'active',
      triggerType: 'webhook',
    })
    .returning();

  console.log(`  ✅ Created workflow: ${alertWorkflow.name}`);

  // Step 1: Count escalations in last hour
  await db.insert(workflowSteps).values({
    workflowId: alertWorkflow.id,
    stepType: 'data_source_query',
    stepOrder: 1,
    name: 'Count Recent Escalations',
    description: 'Count calls escalated to humans in last hour',
    config: {
      sourceTable: 'vapiCalls',
      queryConfig: {
        aggregation: 'count',
        filters: [
          {
            field: 'startedAt',
            operator: 'gte',
            value: '{oneHourAgo}'
          },
          {
            field: 'wasAutonomous',
            operator: 'equals',
            value: false
          }
        ]
      },
      resultVariable: 'escalationCount'
    }
  });

  // Step 2: Conditional check - if > 5 escalations, create work item
  await db.insert(workflowSteps).values({
    workflowId: alertWorkflow.id,
    stepType: 'conditional',
    stepOrder: 2,
    name: 'Check if Escalation Spike',
    description: 'If > 5 escalations in last hour, create alert work item',
    config: {
      condition: 'greater_than',
      leftValue: '{escalationCount}',
      rightValue: 5,
      trueSteps: [3],
      falseSteps: []
    }
  });

  // Step 3: Create work item for team review
  await db.insert(workflowSteps).values({
    workflowId: alertWorkflow.id,
    stepType: 'create_work_item',
    stepOrder: 3,
    name: 'Create Escalation Alert Work Item',
    description: 'Create work item alerting team to escalation spike',
    config: {
      title: 'ALERT: Vapi Escalation Spike Detected',
      description: 'Detected {escalationCount} escalations to humans in the last hour. Review Vapi call logs to identify systemic issues.',
      status: 'Ready',
      workItemType: 'vapi_support_ticket',
      dueDate: '{today}'
    }
  });

  // ========================================
  // WORKFLOW 3: Knowledge Gap Detection
  // ========================================
  const [knowledgeWorkflow] = await db
    .insert(workflows)
    .values({
      organizationId: org.id,
      name: 'Vapi Knowledge Gap Detection',
      description: 'Runs weekly to identify recurring knowledge gaps and creates work items to expand KB',
      status: 'active',
      triggerType: 'schedule',
      scheduleExpression: '0 10 * * 1', // Mondays at 10 AM
    })
    .returning();

  console.log(`  ✅ Created workflow: ${knowledgeWorkflow.name}`);

  // Step 1: Query for most common knowledge gaps
  await db.insert(workflowSteps).values({
    workflowId: knowledgeWorkflow.id,
    stepType: 'data_source_query',
    stepOrder: 1,
    name: 'Find Top Knowledge Gaps',
    description: 'Query vapiCalls to identify most common unanswered questions',
    config: {
      sourceTable: 'vapiCalls',
      queryConfig: {
        aggregation: 'count',
        filters: [
          {
            field: 'startedAt',
            operator: 'gte',
            value: '{sevenDaysAgo}'
          },
          {
            field: 'knowledgeGaps',
            operator: 'is_not_empty'
          }
        ]
      },
      resultVariable: 'gapCount'
    }
  });

  // Step 2: If gaps found, create work item
  await db.insert(workflowSteps).values({
    workflowId: knowledgeWorkflow.id,
    stepType: 'conditional',
    stepOrder: 2,
    name: 'Check if Gaps Detected',
    description: 'Create work item if knowledge gaps found',
    config: {
      condition: 'greater_than',
      leftValue: '{gapCount}',
      rightValue: 0,
      trueSteps: [3],
      falseSteps: []
    }
  });

  await db.insert(workflowSteps).values({
    workflowId: knowledgeWorkflow.id,
    stepType: 'create_work_item',
    stepOrder: 3,
    name: 'Create KB Expansion Work Item',
    description: 'Create work item to expand knowledge base',
    config: {
      title: 'Expand Vapi Knowledge Base - {gapCount} gaps detected',
      description: 'Review recent call transcripts and knowledge gaps to identify content that should be added to the Vapi knowledge base.',
      status: 'Ready',
      workItemType: 'vapi_support_ticket',
      dueDate: '{nextWeek}'
    }
  });

  console.log('');
  console.log('🎉 Vapi Voice AI Workflows seeded successfully!');
  console.log('');
  console.log('📊 Workflows Overview:');
  console.log('  1. Daily Vapi Metrics Sync - Updates all 6 KRs daily at 9 AM');
  console.log('  2. Vapi Escalation Spike Alert - Creates work item when escalations spike');
  console.log('  3. Vapi Knowledge Gap Detection - Weekly KB expansion work items');
  console.log('');
  console.log('💡 Next Steps:');
  console.log('  1. Workflows will run automatically on their schedules');
  console.log('  2. View workflow executions in Workflow Execution Log');
  console.log('  3. Monitor Key Results in Vapi Performance OKR Dashboard');
  console.log('  4. Review work items in My Day page');
  console.log('');
}

// Run if called directly
if (require.main === module) {
  seedVapiWorkflows()
    .then(() => {
      console.log('✅ Seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}
