import { db } from '../../db';
import { vapiCalls, keyResults, objectives } from '@shared/schema';
import { and, eq, gte, lte, sql, count as drizzleCount } from 'drizzle-orm';

export interface VapiMetrics {
  autonomousResolutionRate: number; // Percentage of calls resolved without human intervention
  averageCallDuration: number; // In seconds
  smsVerificationSuccessRate: number; // Percentage of SMS verifications successful
  demoConversionRate: number; // Percentage of sales calls that scheduled a demo
  knowledgeBaseCoverage: number; // Percentage of calls that found answers in KB
  ticketsCreatedCount: number; // Total tickets created from voice calls
}

export class VapiMetricsCalculator {
  private organizationId: number;

  constructor(organizationId: number) {
    this.organizationId = organizationId;
  }

  async calculateAutonomousResolutionRate(startDate?: Date, endDate?: Date): Promise<number> {
    const conditions = [eq(vapiCalls.organizationId, this.organizationId)];
    
    if (startDate) conditions.push(gte(vapiCalls.startedAt, startDate));
    if (endDate) conditions.push(lte(vapiCalls.startedAt, endDate));

    const result = await db
      .select({
        totalCalls: drizzleCount(),
        autonomousCalls: sql<number>`SUM(CASE WHEN ${vapiCalls.wasAutonomous} = true THEN 1 ELSE 0 END)::int`,
      })
      .from(vapiCalls)
      .where(and(...conditions));

    if (!result[0] || result[0].totalCalls === 0) {
      return 0;
    }

    const rate = (result[0].autonomousCalls / result[0].totalCalls) * 100;
    return Math.round(rate * 100) / 100; // Round to 2 decimal places
  }

  async calculateAverageCallDuration(startDate?: Date, endDate?: Date): Promise<number> {
    const conditions = [
      eq(vapiCalls.organizationId, this.organizationId),
      sql`${vapiCalls.durationSeconds} IS NOT NULL`,
    ];
    
    if (startDate) conditions.push(gte(vapiCalls.startedAt, startDate));
    if (endDate) conditions.push(lte(vapiCalls.startedAt, endDate));

    const result = await db
      .select({
        avgDuration: sql<number>`AVG(${vapiCalls.durationSeconds})::int`,
      })
      .from(vapiCalls)
      .where(and(...conditions));

    if (!result[0] || result[0].avgDuration === null) {
      return 0;
    }

    return result[0].avgDuration;
  }

  async calculateSmsVerificationSuccessRate(startDate?: Date, endDate?: Date): Promise<number> {
    const conditions = [
      eq(vapiCalls.organizationId, this.organizationId),
      eq(vapiCalls.smsCodeSent, true), // Only count calls where SMS was sent
    ];
    
    if (startDate) conditions.push(gte(vapiCalls.startedAt, startDate));
    if (endDate) conditions.push(lte(vapiCalls.startedAt, endDate));

    const result = await db
      .select({
        totalSmsSent: drizzleCount(),
        successfulVerifications: sql<number>`SUM(CASE WHEN ${vapiCalls.smsCodeVerified} = true THEN 1 ELSE 0 END)::int`,
      })
      .from(vapiCalls)
      .where(and(...conditions));

    if (!result[0] || result[0].totalSmsSent === 0) {
      return 0;
    }

    const rate = (result[0].successfulVerifications / result[0].totalSmsSent) * 100;
    return Math.round(rate * 100) / 100;
  }

  async calculateDemoConversionRate(startDate?: Date, endDate?: Date): Promise<number> {
    const conditions = [
      eq(vapiCalls.organizationId, this.organizationId),
      eq(vapiCalls.customerIntent, 'sales'), // Only count sales calls
    ];
    
    if (startDate) conditions.push(gte(vapiCalls.startedAt, startDate));
    if (endDate) conditions.push(lte(vapiCalls.startedAt, endDate));

    const result = await db
      .select({
        totalSalesCalls: drizzleCount(),
        demosScheduled: sql<number>`SUM(CASE WHEN ${vapiCalls.demoScheduled} = true THEN 1 ELSE 0 END)::int`,
      })
      .from(vapiCalls)
      .where(and(...conditions));

    if (!result[0] || result[0].totalSalesCalls === 0) {
      return 0;
    }

    const rate = (result[0].demosScheduled / result[0].totalSalesCalls) * 100;
    return Math.round(rate * 100) / 100;
  }

  async calculateKnowledgeBaseCoverage(startDate?: Date, endDate?: Date): Promise<number> {
    const conditions = [eq(vapiCalls.organizationId, this.organizationId)];
    
    if (startDate) conditions.push(gte(vapiCalls.startedAt, startDate));
    if (endDate) conditions.push(lte(vapiCalls.startedAt, endDate));

    const result = await db
      .select({
        totalCalls: drizzleCount(),
        callsWithKnowledgeGaps: sql<number>`SUM(CASE WHEN jsonb_array_length(${vapiCalls.knowledgeGaps}) > 0 THEN 1 ELSE 0 END)::int`,
      })
      .from(vapiCalls)
      .where(and(...conditions));

    if (!result[0] || result[0].totalCalls === 0) {
      return 0;
    }

    // Coverage = calls WITHOUT knowledge gaps
    const callsWithCoverage = result[0].totalCalls - result[0].callsWithKnowledgeGaps;
    const rate = (callsWithCoverage / result[0].totalCalls) * 100;
    return Math.round(rate * 100) / 100;
  }

  async calculateTicketsCreatedCount(startDate?: Date, endDate?: Date): Promise<number> {
    const conditions = [
      eq(vapiCalls.organizationId, this.organizationId),
      eq(vapiCalls.ticketCreated, true),
    ];
    
    if (startDate) conditions.push(gte(vapiCalls.startedAt, startDate));
    if (endDate) conditions.push(lte(vapiCalls.startedAt, endDate));

    const result = await db
      .select({
        count: drizzleCount(),
      })
      .from(vapiCalls)
      .where(and(...conditions));

    return result[0]?.count || 0;
  }

  async calculateAllMetrics(startDate?: Date, endDate?: Date): Promise<VapiMetrics> {
    const [
      autonomousResolutionRate,
      averageCallDuration,
      smsVerificationSuccessRate,
      demoConversionRate,
      knowledgeBaseCoverage,
      ticketsCreatedCount,
    ] = await Promise.all([
      this.calculateAutonomousResolutionRate(startDate, endDate),
      this.calculateAverageCallDuration(startDate, endDate),
      this.calculateSmsVerificationSuccessRate(startDate, endDate),
      this.calculateDemoConversionRate(startDate, endDate),
      this.calculateKnowledgeBaseCoverage(startDate, endDate),
      this.calculateTicketsCreatedCount(startDate, endDate),
    ]);

    return {
      autonomousResolutionRate,
      averageCallDuration,
      smsVerificationSuccessRate,
      demoConversionRate,
      knowledgeBaseCoverage,
      ticketsCreatedCount,
    };
  }

  async getTrendData(days: number = 30): Promise<Array<{ date: string; metrics: VapiMetrics }>> {
    const trends: Array<{ date: string; metrics: VapiMetrics }> = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const metrics = await this.calculateAllMetrics(startOfDay, endOfDay);
      
      trends.push({
        date: startOfDay.toISOString().split('T')[0],
        metrics,
      });
    }

    return trends.reverse(); // Return oldest to newest
  }
}

/**
 * Calculate and update Key Results after a call completes
 * This function is called from the webhook handler
 */
export async function calculateMetricsForCall(organizationId: number, vapiCallId: string): Promise<void> {
  console.log(`📊 Updating metrics for call ${vapiCallId}`);
  
  try {
    // Get the Vapi objective
    const [vapiObjective] = await db
      .select()
      .from(objectives)
      .where(and(
        eq(objectives.organizationId, organizationId),
        eq(objectives.title, 'Autonomous Voice Support System')
      ))
      .limit(1);
    
    if (!vapiObjective) {
      console.log('⚠️ Vapi objective not found for organization', organizationId);
      return;
    }
    
    // Get all Key Results for this objective
    const krs = await db
      .select()
      .from(keyResults)
      .where(eq(keyResults.objectiveId, vapiObjective.id));
    
    if (krs.length === 0) {
      console.log('⚠️ No Key Results found for Vapi objective');
      return;
    }
    
    // Calculate current month metrics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    const calculator = new VapiMetricsCalculator(organizationId);
    const metrics = await calculator.calculateAllMetrics(startOfMonth, endOfMonth);
    
    // Update each Key Result
    for (const kr of krs) {
      let newActual: number | null = null;
      
      if (kr.title.includes('Autonomous Resolution Rate')) {
        newActual = metrics.autonomousResolutionRate;
      } else if (kr.title.includes('Average Call Duration')) {
        newActual = metrics.averageCallDuration;
      } else if (kr.title.includes('Demo Conversion Rate')) {
        newActual = metrics.demoConversionRate;
      } else if (kr.title.includes('SMS Verification Success')) {
        newActual = metrics.smsVerificationSuccessRate;
      } else if (kr.title.includes('Support Tickets Created')) {
        newActual = metrics.ticketsCreatedCount;
      } else if (kr.title.includes('Knowledge Base Coverage')) {
        newActual = metrics.knowledgeBaseCoverage;
      }
      
      if (newActual !== null) {
        // Update Key Result
        await db.update(keyResults)
          .set({
            actualValue: newActual,
            updatedAt: new Date(),
          })
          .where(eq(keyResults.id, kr.id));
        
        console.log(`✅ Updated KR "${kr.title}": ${newActual}`);
      }
    }
    
    console.log('✅ All Key Results updated successfully');
  } catch (error) {
    console.error('❌ Error updating metrics:', error);
  }
}
