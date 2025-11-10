import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { authenticateToken } from '../auth';
import { Request, Response } from 'express';
import XeroService from '../services/integrations/xeroService';
import { eq, and, or, gte, lte, inArray, isNull, desc, asc, sql, ilike } from 'drizzle-orm';
import { db } from '../db';
import { 
  insertFinancialTransactionSchema, 
  insertProfitCenterSchema,
  type FinancialTransaction,
  type ProfitCenter,
  type XeroChartOfAccount,
  financialTransactions,
  profitCenters,
  financialMetricsCache,
  xeroSyncStatus,
  xeroSyncLogs,
  xeroChartOfAccounts,
  objectives,
  keyResults,
  keyResultTasks,
} from '@shared/schema';
import crypto from 'crypto';
import axios from 'axios';

const router = Router();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'dev-key-do-not-use-in-production';
const IV_LENGTH = 16;

// ========================================
// PROFIT CENTER OKR LINKAGE VALIDATION
// ========================================

/**
 * Validates profit center OKR linkage:
 * - Requires exactly ONE OKR reference (objective, key result, or task)
 * - Ensures linkedOkrType matches the provided ID
 * - Verifies the referenced OKR entity exists in the organization
 */
const validateProfitCenterOkrLink = insertProfitCenterSchema.superRefine((data, ctx) => {
  const { linkedOkrType, objectiveId, keyResultId, keyResultTaskId } = data;

  // Count how many OKR IDs are provided
  const providedIds = [objectiveId, keyResultId, keyResultTaskId].filter(id => id !== null && id !== undefined);

  // Require exactly one OKR reference
  if (providedIds.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Profit center must link to exactly one OKR (objective, key result, or task). No OKR reference provided.',
      path: ['linkedOkrType'],
    });
    return;
  }

  if (providedIds.length > 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Profit center must link to exactly one OKR. Multiple OKR references provided (only one allowed).',
      path: ['linkedOkrType'],
    });
    return;
  }

  // Ensure linkedOkrType matches the provided ID
  if (linkedOkrType === 'objective' && !objectiveId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'linkedOkrType is "objective" but objectiveId is not provided.',
      path: ['objectiveId'],
    });
  } else if (linkedOkrType === 'objective' && (keyResultId || keyResultTaskId)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'linkedOkrType is "objective" but keyResultId or keyResultTaskId is also provided. Only objectiveId should be set.',
      path: ['linkedOkrType'],
    });
  }

  if (linkedOkrType === 'key_result' && !keyResultId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'linkedOkrType is "key_result" but keyResultId is not provided.',
      path: ['keyResultId'],
    });
  } else if (linkedOkrType === 'key_result' && (objectiveId || keyResultTaskId)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'linkedOkrType is "key_result" but objectiveId or keyResultTaskId is also provided. Only keyResultId should be set.',
      path: ['linkedOkrType'],
    });
  }

  if (linkedOkrType === 'task' && !keyResultTaskId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'linkedOkrType is "task" but keyResultTaskId is not provided.',
      path: ['keyResultTaskId'],
    });
  } else if (linkedOkrType === 'task' && (objectiveId || keyResultId)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'linkedOkrType is "task" but objectiveId or keyResultId is also provided. Only keyResultTaskId should be set.',
      path: ['linkedOkrType'],
    });
  }
});

/**
 * Verifies the referenced OKR entity exists in the database within the organization
 */
async function verifyOkrEntityExists(
  organizationId: number, 
  linkedOkrType: string, 
  objectiveId?: number | null, 
  keyResultId?: number | null, 
  keyResultTaskId?: number | null
): Promise<{ valid: boolean; error?: string }> {
  try {
    if (linkedOkrType === 'objective' && objectiveId) {
      const [objective] = await db
        .select()
        .from(objectives)
        .where(
          and(
            eq(objectives.id, objectiveId),
            eq(objectives.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!objective) {
        return { valid: false, error: `Objective with ID ${objectiveId} not found in organization` };
      }
    } else if (linkedOkrType === 'key_result' && keyResultId) {
      const [keyResult] = await db
        .select()
        .from(keyResults)
        .where(
          and(
            eq(keyResults.id, keyResultId),
            eq(keyResults.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!keyResult) {
        return { valid: false, error: `Key Result with ID ${keyResultId} not found in organization` };
      }
    } else if (linkedOkrType === 'task' && keyResultTaskId) {
      const [task] = await db
        .select()
        .from(keyResultTasks)
        .where(
          and(
            eq(keyResultTasks.id, keyResultTaskId),
            eq(keyResultTasks.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!task) {
        return { valid: false, error: `Task with ID ${keyResultTaskId} not found in organization` };
      }
    }

    return { valid: true };
  } catch (error: any) {
    console.error('Error verifying OKR entity:', error);
    return { valid: false, error: 'Failed to verify OKR linkage' };
  }
}

/**
 * Enriches multiple profit centers with linked OKR details and Xero account information
 * Uses batch loading to avoid N+1 queries and includes organizationId filters for security
 */
async function enrichProfitCenters(profitCenters: any[], organizationId: number) {
  if (profitCenters.length === 0) return [];

  // Collect all unique IDs for batch loading
  const objectiveIds = profitCenters
    .filter(pc => pc.linkedOkrType === 'objective' && pc.objectiveId)
    .map(pc => pc.objectiveId);
  
  const keyResultIds = profitCenters
    .filter(pc => pc.linkedOkrType === 'key_result' && pc.keyResultId)
    .map(pc => pc.keyResultId);
  
  const taskIds = profitCenters
    .filter(pc => pc.linkedOkrType === 'task' && pc.keyResultTaskId)
    .map(pc => pc.keyResultTaskId);
  
  const xeroAccountIds = profitCenters
    .filter(pc => pc.xeroAccountId)
    .map(pc => pc.xeroAccountId);

  // Batch fetch all related data with organizationId filters for security
  const [objectivesData, keyResultsData, tasksData, xeroAccountsData] = await Promise.all([
    objectiveIds.length > 0
      ? db.select().from(objectives).where(
          and(
            inArray(objectives.id, objectiveIds),
            eq(objectives.organizationId, organizationId)
          )
        )
      : Promise.resolve([]),
    
    keyResultIds.length > 0
      ? db.select().from(keyResults).where(
          and(
            inArray(keyResults.id, keyResultIds),
            eq(keyResults.organizationId, organizationId)
          )
        )
      : Promise.resolve([]),
    
    taskIds.length > 0
      ? db.select().from(keyResultTasks).where(
          and(
            inArray(keyResultTasks.id, taskIds),
            eq(keyResultTasks.organizationId, organizationId)
          )
        )
      : Promise.resolve([]),
    
    xeroAccountIds.length > 0
      ? db.select().from(xeroChartOfAccounts).where(
          and(
            inArray(xeroChartOfAccounts.xeroAccountId, xeroAccountIds),
            eq(xeroChartOfAccounts.organizationId, organizationId)
          )
        )
      : Promise.resolve([]),
  ]);

  // Build lookup maps for O(1) access
  const objectivesMap = new Map(objectivesData.map(obj => [obj.id, obj]));
  const keyResultsMap = new Map(keyResultsData.map(kr => [kr.id, kr]));
  const tasksMap = new Map(tasksData.map(task => [task.id, task]));
  const xeroAccountsMap = new Map(xeroAccountsData.map(acc => [acc.xeroAccountId, acc]));

  // Enrich each profit center using the lookup maps
  return profitCenters.map(profitCenter => {
    const enriched: any = { ...profitCenter };

    // Add OKR details
    if (profitCenter.linkedOkrType === 'objective' && profitCenter.objectiveId) {
      const objective = objectivesMap.get(profitCenter.objectiveId);
      enriched.okrDetails = objective ? {
        type: 'objective',
        id: objective.id,
        name: objective.name,
        description: objective.description,
      } : null;
    } else if (profitCenter.linkedOkrType === 'key_result' && profitCenter.keyResultId) {
      const keyResult = keyResultsMap.get(profitCenter.keyResultId);
      enriched.okrDetails = keyResult ? {
        type: 'key_result',
        id: keyResult.id,
        name: keyResult.description,
        objectiveId: keyResult.objectiveId,
      } : null;
    } else if (profitCenter.linkedOkrType === 'task' && profitCenter.keyResultTaskId) {
      const task = tasksMap.get(profitCenter.keyResultTaskId);
      enriched.okrDetails = task ? {
        type: 'task',
        id: task.id,
        name: task.title,
        keyResultId: task.keyResultId,
      } : null;
    }

    // Add Xero account details
    if (profitCenter.xeroAccountId) {
      const xeroAccount = xeroAccountsMap.get(profitCenter.xeroAccountId);
      enriched.xeroAccountDetails = xeroAccount ? {
        accountCode: xeroAccount.accountCode,
        accountName: xeroAccount.accountName,
        accountType: xeroAccount.accountType,
        status: xeroAccount.status,
      } : null;
    }

    return enriched;
  });
}

function encrypt(text: string): string {
  const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function parseXeroDate(dateValue: any): Date {
  if (!dateValue) {
    return new Date();
  }

  if (typeof dateValue === 'string') {
    const dotNetMatch = dateValue.match(/\/Date\((\d+)([+-]\d{4})?\)\//);
    if (dotNetMatch) {
      const timestamp = parseInt(dotNetMatch[1], 10);
      return new Date(timestamp);
    }
  }

  const parsed = new Date(dateValue);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return new Date();
}

// Helper function to process transactions in batches with upsert
async function upsertTransactionsBatch(
  organizationId: number,
  transactions: any[],
  batchSize: number = 250
): Promise<{ synced: number; failed: number; errors: any[] }> {
  let syncedCount = 0;
  let failedCount = 0;
  const errors: any[] = [];

  // Process in batches
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    
    try {
      // Batch upsert using onConflictDoUpdate
      await db.insert(financialTransactions)
        .values(batch)
        .onConflictDoUpdate({
          target: [
            financialTransactions.organizationId,
            financialTransactions.xeroTransactionId,
            financialTransactions.xeroTransactionType
          ],
          set: {
            transactionDate: sql`EXCLUDED.transaction_date`,
            amount: sql`EXCLUDED.amount`,
            description: sql`EXCLUDED.description`,
            contactName: sql`EXCLUDED.contact_name`,
            xeroContactId: sql`EXCLUDED.xero_contact_id`,
            currency: sql`EXCLUDED.currency`,
            metadata: sql`EXCLUDED.metadata`,
            updatedAt: new Date(),
          }
        });
      
      syncedCount += batch.length;
      console.log(`[BATCH] Processed ${syncedCount}/${transactions.length} transactions`);
    } catch (error: any) {
      failedCount += batch.length;
      errors.push({ 
        batch: `${i}-${i + batch.length}`, 
        error: error.message,
        count: batch.length
      });
      console.error(`[BATCH ERROR] Failed to process batch ${i}-${i + batch.length}:`, error.message);
    }
  }

  return { synced: syncedCount, failed: failedCount, errors };
}

// ========================================
// XERO OAUTH & CONNECTION MANAGEMENT
// ========================================

router.post('/xero/oauth/start', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { clientId, clientSecret, redirectUri } = req.body;

    const authUrl = `https://login.xero.com/identity/connect/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=offline_access accounting.transactions accounting.contacts accounting.reports.read accounting.settings`;

    res.json({ authUrl });
  } catch (error: any) {
    console.error('Error starting Xero OAuth:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/xero/oauth/callback', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      console.error('OAuth callback called without organizationId');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    console.log(`Starting Xero OAuth callback for organization ${organizationId}`);
    const { code, clientId, clientSecret, redirectUri } = req.body;
    
    const tokenResponse = await axios.post('https://identity.xero.com/connect/token', 
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    const tenantsResponse = await axios.get('https://api.xero.com/connections', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    const tenants = tenantsResponse.data;
    const tenantId = tenants[0]?.tenantId;
    
    const expiresInSeconds = expires_in || 1800;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    const credentialsEncrypted = encrypt(JSON.stringify({
      accessToken: access_token,
      refreshToken: refresh_token,
      tenantId,
      expiresAt: expiresAt.toISOString(),
    }));

    const existing = await storage.getIntegration(organizationId, 'xero');
    
    if (existing) {
      console.log(`Updating existing Xero integration for organization ${organizationId}`);
      await storage.updateIntegration(existing.id, {
        isEnabled: true,
        connectionStatus: 'connected',
        credentialsEncrypted,
        connectionConfig: {
          clientId,
          clientSecret,
          tenantId,
          tenantName: tenants[0]?.tenantName,
        },
      });
    } else {
      console.log(`Creating new Xero integration for organization ${organizationId}`);
      await storage.createIntegration({
        organizationId,
        platformType: 'xero',
        name: 'Xero Accounting',
        isEnabled: true,
        connectionStatus: 'connected',
        credentialsEncrypted,
        connectionConfig: {
          clientId,
          clientSecret,
          tenantId,
          tenantName: tenants[0]?.tenantName,
        },
      });
    }

    console.log(`Xero OAuth callback completed successfully for organization ${organizationId}`);
    res.json({ 
      success: true, 
      tenants,
      message: 'Xero connected successfully' 
    });
  } catch (error: any) {
    console.error('Error in Xero OAuth callback:', error.response?.data || error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/xero/disconnect', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const integration = await storage.getIntegration(organizationId, 'xero');
    
    if (!integration) {
      return res.json({ success: true, message: 'No Xero connection found' });
    }

    await storage.updateIntegration(integration.id, {
      isEnabled: false,
      connectionConfig: {},
    });

    console.log(`Xero disconnected for organization ${organizationId}`);
    res.json({ success: true, message: 'Disconnected from Xero successfully' });
  } catch (error: any) {
    console.error('Error disconnecting from Xero:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/xero/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;
    
    const integration = await storage.getIntegration(organizationId, 'xero');
    
    if (!integration) {
      return res.json({ connected: false });
    }

    const lastSyncData = await db
      .select()
      .from(xeroSyncStatus)
      .where(eq(xeroSyncStatus.organizationId, organizationId))
      .orderBy(desc(xeroSyncStatus.lastSyncAt))
      .limit(1);

    // Consider connection active only if both enabled AND status is connected
    const isConnected = integration.isEnabled && integration.connectionStatus === 'connected';

    res.json({
      connected: isConnected,
      connectionStatus: integration.connectionStatus,
      isEnabled: integration.isEnabled,
      tenantName: (integration.connectionConfig as any)?.tenantName,
      lastSync: lastSyncData[0] || null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/xero/activity', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const integration = await storage.getIntegration(organizationId, 'xero');
    
    if (!integration) {
      return res.json({ 
        connected: false,
        syncHistory: [],
        statistics: {}
      });
    }

    const syncHistory = await db
      .select()
      .from(xeroSyncStatus)
      .where(eq(xeroSyncStatus.organizationId, organizationId))
      .orderBy(desc(xeroSyncStatus.lastSyncAt))
      .limit(10);

    const totalTransactions = await db
      .select({ count: sql<number>`count(*)` })
      .from(financialTransactions)
      .where(eq(financialTransactions.organizationId, organizationId));

    const categorizedTransactions = await db
      .select({ count: sql<number>`count(*)` })
      .from(financialTransactions)
      .where(
        and(
          eq(financialTransactions.organizationId, organizationId),
          sql`${financialTransactions.categorizationStatus} IN ('manually_categorized', 'approved')`
        )
      );

    const uncategorizedTransactions = await db
      .select({ count: sql<number>`count(*)` })
      .from(financialTransactions)
      .where(
        and(
          eq(financialTransactions.organizationId, organizationId),
          eq(financialTransactions.categorizationStatus, 'uncategorized')
        )
      );

    const lastFullSync = syncHistory[0] || null;
    
    res.json({
      connected: integration.isEnabled,
      connectionStatus: integration.connectionStatus,
      tenantName: (integration.connectionConfig as any)?.tenantName,
      tenantId: (integration.connectionConfig as any)?.tenantId,
      lastTestedAt: integration.lastTestedAt,
      syncHistory: syncHistory,
      statistics: {
        totalTransactions: totalTransactions[0]?.count || 0,
        categorized: categorizedTransactions[0]?.count || 0,
        uncategorized: uncategorizedTransactions[0]?.count || 0,
        categorizationRate: totalTransactions[0]?.count 
          ? Math.round((categorizedTransactions[0]?.count / totalTransactions[0]?.count) * 100)
          : 0,
        lastFullSync: lastFullSync?.lastSyncAt || null,
        lastSyncTransactionCount: lastFullSync?.recordsSynced || 0,
      }
    });
  } catch (error: any) {
    console.error('Error fetching Xero activity:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// TRANSACTION MANAGEMENT
// ========================================

router.get('/transactions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;
    const { 
      status, 
      dateFrom, 
      dateTo, 
      search, 
      profitCenterId,
      limit = '5000',
      offset = '0' 
    } = req.query;

    const conditions = [eq(financialTransactions.organizationId, organizationId)];

    if (status) {
      conditions.push(eq(financialTransactions.categorizationStatus, status as any));
    }

    if (dateFrom) {
      conditions.push(gte(financialTransactions.transactionDate, new Date(dateFrom as string)));
    }

    if (dateTo) {
      conditions.push(lte(financialTransactions.transactionDate, new Date(dateTo as string)));
    }

    if (search) {
      conditions.push(
        or(
          ilike(financialTransactions.description, `%${search}%`),
          ilike(financialTransactions.contactName, `%${search}%`)
        )!
      );
    }

    const transactions = await db
      .select()
      .from(financialTransactions)
      .where(and(...conditions)!)
      .orderBy(desc(financialTransactions.transactionDate))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json(transactions);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/transactions/:id/categorize', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id;
    const { id } = req.params;
    const { primaryCategory, primaryCategoryName, profitCenterTags, notes } = req.body;

    const transaction = await db
      .select()
      .from(financialTransactions)
      .where(
        and(
          eq(financialTransactions.id, parseInt(id)),
          eq(financialTransactions.organizationId, organizationId)
        )!
      )
      .limit(1);

    if (!transaction[0]) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const [updated] = await db
      .update(financialTransactions)
      .set({
        primaryCategory,
        primaryCategoryName,
        profitCenterTags,
        notes,
        categorizationStatus: 'manually_categorized' as any,
        categorizedBy: userId,
        categorizedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(financialTransactions.id, parseInt(id)))
      .returning();

    res.json(updated);
  } catch (error: any) {
    console.error('Error categorizing transaction:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/transactions/bulk-categorize', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id;
    const { transactionIds, primaryCategory, primaryCategoryName, profitCenterTags } = req.body;

    await db
      .update(financialTransactions)
      .set({
        primaryCategory,
        primaryCategoryName,
        profitCenterTags,
        categorizationStatus: 'manually_categorized' as any,
        categorizedBy: userId,
        categorizedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          inArray(financialTransactions.id, transactionIds),
          eq(financialTransactions.organizationId, organizationId)
        )!
      );

    res.json({ success: true, count: transactionIds.length });
  } catch (error: any) {
    console.error('Error bulk categorizing transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// PROFIT CENTER MANAGEMENT
// ========================================

router.get('/profit-centers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;

    const results = await db
      .select()
      .from(profitCenters)
      .where(eq(profitCenters.organizationId, organizationId))
      .orderBy(asc(profitCenters.displayOrder));

    // Enrich profit centers with OKR details and Xero account information using batch loading
    const enriched = await enrichProfitCenters(results, organizationId);

    res.json(enriched);
  } catch (error: any) {
    console.error('Error fetching profit centers:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/profit-centers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id;
    
    // Validate profit center data including OKR linkage
    const data = validateProfitCenterOkrLink.parse({
      ...req.body,
      organizationId,
      createdBy: userId,
    });

    // Verify the referenced OKR entity exists
    const verification = await verifyOkrEntityExists(
      organizationId,
      data.linkedOkrType as string,
      data.objectiveId,
      data.keyResultId,
      data.keyResultTaskId
    );

    if (!verification.valid) {
      return res.status(404).json({ error: verification.error });
    }

    const result = await db
      .insert(profitCenters)
      .values(data)
      .returning() as any[];
    
    const profitCenter = result[0];

    res.json(profitCenter);
  } catch (error: any) {
    console.error('Error creating profit center:', error);
    
    // Return Zod validation errors with status 400
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

router.put('/profit-centers/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;
    const { id } = req.params;

    // Load existing profit center
    const [existing] = await db
      .select()
      .from(profitCenters)
      .where(
        and(
          eq(profitCenters.id, parseInt(id)),
          eq(profitCenters.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Profit center not found' });
    }

    // Merge existing data with incoming changes
    const mergedData = {
      ...existing,
      ...req.body,
      organizationId, // Ensure organizationId is preserved
      createdBy: existing.createdBy, // Preserve original creator
    };

    // Validate merged data including OKR linkage
    const data = validateProfitCenterOkrLink.parse(mergedData);

    // Verify the referenced OKR entity exists
    const verification = await verifyOkrEntityExists(
      organizationId,
      data.linkedOkrType as string,
      data.objectiveId,
      data.keyResultId,
      data.keyResultTaskId
    );

    if (!verification.valid) {
      return res.status(404).json({ error: verification.error });
    }

    const [updated] = await db
      .update(profitCenters)
      .set({
        ...req.body,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(profitCenters.id, parseInt(id)),
          eq(profitCenters.organizationId, organizationId)
        )!
      )
      .returning();

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating profit center:', error);
    
    // Return Zod validation errors with status 400
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

router.get('/profit-centers/:id/performance', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;
    const { id } = req.params;
    const { period = 'current_month' } = req.query;

    const metrics = await db
      .select()
      .from(financialMetricsCache)
      .where(
        and(
          eq(financialMetricsCache.organizationId, organizationId),
          eq(financialMetricsCache.profitCenterId, parseInt(id)),
          eq(financialMetricsCache.period, period as string)
        )!
      );

    const profitCenterData = await db
      .select()
      .from(profitCenters)
      .where(eq(profitCenters.id, parseInt(id)))
      .limit(1);

    // Enrich profit center with OKR and Xero account details using batch loading
    const enriched = profitCenterData[0] 
      ? await enrichProfitCenters([profitCenterData[0]], organizationId)
      : [];

    res.json({
      profitCenter: enriched[0] || null,
      metrics,
    });
  } catch (error: any) {
    console.error('Error fetching profit center performance:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// DASHBOARD METRICS
// ========================================

router.get('/dashboard/metrics', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;
    const { period = 'current_month' } = req.query;

    const metrics = await db
      .select()
      .from(financialMetricsCache)
      .where(
        and(
          eq(financialMetricsCache.organizationId, organizationId),
          eq(financialMetricsCache.period, period as string),
          isNull(financialMetricsCache.profitCenterId)
        )!
      );

    const metricsMap = metrics.reduce((acc, metric) => {
      acc[metric.metricType] = metric;
      return acc;
    }, {} as Record<string, any>);

    res.json(metricsMap);
  } catch (error: any) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// SYNC OPERATIONS
// ========================================

router.post('/sync/run', authenticateToken, async (req: Request, res: Response) => {
  try {
    console.log('[SYNC] Starting sync request');
    const organizationId = req.user?.organizationId || 3;
    console.log('[SYNC] Organization ID:', organizationId);

    // Verify Xero integration exists and is connected
    console.log('[SYNC] Fetching Xero integration...');
    const integration = await storage.getIntegration(organizationId, 'xero');
    console.log('[SYNC] Integration fetched:', integration ? 'found' : 'not found');
    
    if (!integration) {
      return res.status(404).json({ 
        error: 'Xero integration not found. Please set up Xero integration first.' 
      });
    }

    if (!integration.credentialsEncrypted) {
      return res.status(400).json({ 
        error: 'Xero not connected. Please connect your Xero account.' 
      });
    }

    if (integration.connectionStatus === 'disconnected') {
      return res.status(400).json({ 
        error: 'Xero connection lost. Please reconnect your Xero account.' 
      });
    }

    console.log('[SYNC] Creating XeroService instance...');
    const xeroService = new XeroService(organizationId);
    console.log('[SYNC] Initializing XeroService...');
    await xeroService.initialize();
    console.log('[SYNC] XeroService initialized successfully');

    const lastSyncData = await db
      .select()
      .from(xeroSyncStatus)
      .where(
        and(
          eq(xeroSyncStatus.organizationId, organizationId),
          eq(xeroSyncStatus.syncType, 'transactions')
        )!
      )
      .limit(1);

    // Determine if this is the first sync
    const isFirstSync = !lastSyncData[0]?.lastSuccessfulSyncAt;
    
    // For first sync: default to 90 days ago to prevent fetching all historical data
    // For subsequent syncs: use last successful sync time
    const default90DaysAgo = new Date();
    default90DaysAgo.setDate(default90DaysAgo.getDate() - 90);

    const since = lastSyncData[0]?.lastSuccessfulSyncAt || default90DaysAgo;

    console.log(`Starting Xero sync for organization ${organizationId} from ${since.toISOString()} (isFirstSync: ${isFirstSync})`);

    // Log sync start with in_progress status
    const syncStartTime = new Date();
    if (lastSyncData[0]) {
      await db
        .update(xeroSyncStatus)
        .set({
          lastSyncAt: syncStartTime,
          status: 'in_progress',
        })
        .where(eq(xeroSyncStatus.id, lastSyncData[0].id));
    } else {
      await db
        .insert(xeroSyncStatus)
        .values({
          organizationId,
          syncType: 'transactions',
          lastSyncAt: syncStartTime,
          status: 'in_progress',
          recordsSynced: 0,
          recordsFailed: 0,
        });
    }

    // Insert sync log record (historical tracking)
    const syncLogResult = await db
      .insert(xeroSyncLogs)
      .values({
        organizationId,
        syncType: 'transactions',
        startedAt: syncStartTime,
        triggeredBy: req.user?.id,
        triggerType: 'manual',
        status: 'in_progress' as any, // Will update to 'completed' or 'failed' later
      })
      .returning({ id: xeroSyncLogs.id });
    
    const syncLogId = syncLogResult[0].id;

    const xeroData = await xeroService.syncAllTransactions(since, isFirstSync);

    const totalRecords = xeroData.invoices.length + xeroData.bankTransactions.length + xeroData.payments.length;
    console.log(`Xero sync fetched: ${xeroData.invoices.length} invoices, ${xeroData.bankTransactions.length} bank transactions, ${xeroData.payments.length} payments (Total: ${totalRecords})`);

    // Update total records count for progress tracking
    await db
      .update(xeroSyncStatus)
      .set({
        totalRecordsToSync: totalRecords,
        lastProgressAt: new Date(),
      })
      .where(
        and(
          eq(xeroSyncStatus.organizationId, organizationId),
          eq(xeroSyncStatus.syncType, 'transactions')
        )!
      );

    let syncedCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    // Transform invoices to database format
    const invoiceRecords = xeroData.invoices.map((invoice: any) => ({
      organizationId,
      xeroTransactionId: invoice.InvoiceID,
      xeroTransactionType: 'invoice' as const,
      transactionDate: parseXeroDate(invoice.Date),
      amount: String(invoice.Total || 0),
      description: invoice.Reference || invoice.InvoiceNumber || '',
      contactName: invoice.Contact?.Name,
      xeroContactId: invoice.Contact?.ContactID,
      currency: invoice.CurrencyCode || 'USD',
      metadata: invoice,
    }));

    // Transform bank transactions to database format
    const bankTxRecords = xeroData.bankTransactions.map((bankTx: any) => ({
      organizationId,
      xeroTransactionId: bankTx.BankTransactionID,
      xeroTransactionType: 'bank_transaction' as const,
      transactionDate: parseXeroDate(bankTx.Date),
      amount: String(bankTx.Total || 0),
      description: bankTx.Reference || '',
      contactName: bankTx.Contact?.Name,
      xeroContactId: bankTx.Contact?.ContactID,
      currency: bankTx.CurrencyCode || 'USD',
      metadata: bankTx,
    }));

    // Transform payments to database format
    const paymentRecords = xeroData.payments.map((payment: any) => ({
      organizationId,
      xeroTransactionId: payment.PaymentID,
      xeroTransactionType: 'payment' as const,
      transactionDate: parseXeroDate(payment.Date),
      amount: String(payment.Amount || 0),
      description: payment.Reference || `Payment for ${payment.Invoice?.InvoiceNumber || 'invoice'}`,
      contactName: payment.Invoice?.Contact?.Name,
      xeroContactId: payment.Invoice?.Contact?.ContactID,
      currency: payment.CurrencyCode || 'USD',
      metadata: payment,
    }));

    // Process invoices in batches
    console.log('[SYNC] Processing invoices...');
    const invoiceResult = await upsertTransactionsBatch(organizationId, invoiceRecords, 250);
    syncedCount += invoiceResult.synced;
    failedCount += invoiceResult.failed;
    errors.push(...invoiceResult.errors);

    // Update progress after invoices
    await db
      .update(xeroSyncStatus)
      .set({
        recordsSynced: syncedCount,
        recordsFailed: failedCount,
        lastProgressAt: new Date(),
      })
      .where(
        and(
          eq(xeroSyncStatus.organizationId, organizationId),
          eq(xeroSyncStatus.syncType, 'transactions')
        )!
      );

    // Process bank transactions in batches
    console.log('[SYNC] Processing bank transactions...');
    const bankTxResult = await upsertTransactionsBatch(organizationId, bankTxRecords, 250);
    syncedCount += bankTxResult.synced;
    failedCount += bankTxResult.failed;
    errors.push(...bankTxResult.errors);

    // Update progress after bank transactions
    await db
      .update(xeroSyncStatus)
      .set({
        recordsSynced: syncedCount,
        recordsFailed: failedCount,
        lastProgressAt: new Date(),
      })
      .where(
        and(
          eq(xeroSyncStatus.organizationId, organizationId),
          eq(xeroSyncStatus.syncType, 'transactions')
        )!
      );

    // Process payments in batches
    console.log('[SYNC] Processing payments...');
    const paymentResult = await upsertTransactionsBatch(organizationId, paymentRecords, 250);
    syncedCount += paymentResult.synced;
    failedCount += paymentResult.failed;
    errors.push(...paymentResult.errors);

    // Update progress after payments
    await db
      .update(xeroSyncStatus)
      .set({
        recordsSynced: syncedCount,
        recordsFailed: failedCount,
        lastProgressAt: new Date(),
      })
      .where(
        and(
          eq(xeroSyncStatus.organizationId, organizationId),
          eq(xeroSyncStatus.syncType, 'transactions')
        )!
      );

    // Refresh sync data to get the ID if we just created it
    const finalSyncData = await db
      .select()
      .from(xeroSyncStatus)
      .where(
        and(
          eq(xeroSyncStatus.organizationId, organizationId),
          eq(xeroSyncStatus.syncType, 'transactions')
        )!
      )
      .orderBy(desc(xeroSyncStatus.lastSyncAt))
      .limit(1);

    const syncEndTime = new Date();
    const durationMs = syncEndTime.getTime() - syncStartTime.getTime();

    if (finalSyncData[0]) {
      await db
        .update(xeroSyncStatus)
        .set({
          lastSuccessfulSyncAt: failedCount === 0 ? new Date() : finalSyncData[0].lastSuccessfulSyncAt,
          recordsSynced: syncedCount,
          recordsFailed: failedCount,
          errors: errors.length > 0 ? errors : undefined,
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(eq(xeroSyncStatus.id, finalSyncData[0].id));
    }

    // Update sync log record with completion details
    await db
      .update(xeroSyncLogs)
      .set({
        completedAt: syncEndTime,
        durationMs,
        recordsSynced: syncedCount,
        recordsFailed: failedCount,
        totalRecordsToSync: totalRecords,
        errors: errors.length > 0 ? errors : undefined,
        status: failedCount === 0 ? 'completed' : (syncedCount > 0 ? 'partial' : 'failed'),
      })
      .where(eq(xeroSyncLogs.id, syncLogId));

    console.log(`Xero sync completed: ${syncedCount} synced, ${failedCount} failed in ${durationMs}ms`);

    res.json({
      success: true,
      recordsSynced: syncedCount,
      synced: syncedCount,
      failed: failedCount,
      errors: errors.slice(0, 10),
      durationMs,
    });
  } catch (error: any) {
    console.error('Error running Xero sync:', error);
    
    const organizationId = req.user?.organizationId || 3;
    
    // Mark sync as failed in database
    try {
      const failedSyncData = await db
        .select()
        .from(xeroSyncStatus)
        .where(
          and(
            eq(xeroSyncStatus.organizationId, organizationId),
            eq(xeroSyncStatus.syncType, 'transactions')
          )!
        )
        .orderBy(desc(xeroSyncStatus.lastSyncAt))
        .limit(1);

      if (failedSyncData[0]) {
        await db
          .update(xeroSyncStatus)
          .set({
            status: 'failed',
            errors: [{ message: error.message }],
            updatedAt: new Date(),
          })
          .where(eq(xeroSyncStatus.id, failedSyncData[0].id));
      }

      // Update sync log with failure details
      // Note: syncLogId might not be available if error happened before log creation
      // In that case, we'll skip updating the log
    } catch (dbError) {
      console.error('Failed to update sync status:', dbError);
    }
    
    // Provide specific error message based on the error type
    let errorMessage = error.message || 'Failed to sync transactions from Xero';
    let statusCode = 500;
    
    // Check if it's an auth-related error
    if (errorMessage.includes('refresh token') || errorMessage.includes('reconnect')) {
      statusCode = 401;
    } else if (errorMessage.includes('not found') || errorMessage.includes('not configured')) {
      statusCode = 400;
    }
    
    res.status(statusCode).json({ error: errorMessage });
  }
});

// Get Xero sync history from logs table
router.get('/xero/sync-history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;

    const history = await db
      .select()
      .from(xeroSyncLogs)
      .where(eq(xeroSyncLogs.organizationId, organizationId))
      .orderBy(desc(xeroSyncLogs.startedAt))
      .limit(50);

    res.json(history);
  } catch (error: any) {
    console.error('Error fetching sync history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// CHART OF ACCOUNTS ENDPOINTS
// ========================================

// Sync Chart of Accounts from Xero
router.post('/xero/sync/chart-of-accounts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;

    const xeroService = new XeroService(organizationId);
    await xeroService.initialize();
    
    const results = await xeroService.syncChartOfAccounts();
    
    res.json({
      success: true,
      message: `Synced ${results.synced} accounts (${results.created} created, ${results.updated} updated)`,
      ...results,
    });
  } catch (error: any) {
    console.error('Error syncing Chart of Accounts:', error);
    res.status(500).json({ error: error.message });
  }
});

// List Chart of Accounts with filters
router.get('/xero/chart-of-accounts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;
    const { 
      type, 
      status, 
      search,
      unmapped, // Filter for accounts not linked to profit centers
    } = req.query;

    let query = db
      .select()
      .from(xeroChartOfAccounts)
      .where(eq(xeroChartOfAccounts.organizationId, organizationId));

    // Apply filters
    const conditions: any[] = [eq(xeroChartOfAccounts.organizationId, organizationId)];

    if (type) {
      conditions.push(eq(xeroChartOfAccounts.accountType, type as string));
    }

    if (status) {
      conditions.push(eq(xeroChartOfAccounts.status, status as string));
    }

    if (search) {
      conditions.push(
        or(
          ilike(xeroChartOfAccounts.accountCode, `%${search}%`),
          ilike(xeroChartOfAccounts.accountName, `%${search}%`)
        )
      );
    }

    // If unmapped filter is set, find accounts not in profit_centers.xeroAccountId
    if (unmapped === 'true') {
      // Get all xeroAccountIds that ARE mapped to profit centers (NOT NULL)
      const mappedAccountIds = await db
        .selectDistinct({ xeroAccountId: profitCenters.xeroAccountId })
        .from(profitCenters)
        .where(
          and(
            eq(profitCenters.organizationId, organizationId),
            sql`${profitCenters.xeroAccountId} IS NOT NULL`
          )
        );

      const mappedIds = mappedAccountIds
        .map(row => row.xeroAccountId)
        .filter(Boolean);

      if (mappedIds.length > 0) {
        // Exclude mapped account IDs
        const accounts = await db
          .select()
          .from(xeroChartOfAccounts)
          .where(
            and(
              ...conditions,
              sql`${xeroChartOfAccounts.xeroAccountId} NOT IN (${sql.join(mappedIds.map(id => sql`${id}`), sql`, `)})`
            )
          )
          .orderBy(xeroChartOfAccounts.accountCode);

        return res.json(accounts);
      }
    }

    const accounts = await db
      .select()
      .from(xeroChartOfAccounts)
      .where(and(...conditions))
      .orderBy(xeroChartOfAccounts.accountCode);

    res.json(accounts);
  } catch (error: any) {
    console.error('Error listing Chart of Accounts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get unmapped accounts (not linked to profit centers) grouped by type
router.get('/xero/chart-of-accounts/unmapped', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;

    // Get all account IDs that are mapped to profit centers
    const mappedAccounts = await db
      .selectDistinct({ xeroAccountId: profitCenters.xeroAccountId })
      .from(profitCenters)
      .where(
        and(
          eq(profitCenters.organizationId, organizationId),
          sql`${profitCenters.xeroAccountId} IS NOT NULL`
        )
      );

    const mappedIds = mappedAccounts.map(row => row.xeroAccountId).filter(Boolean);

    // Get all accounts not in the mapped list
    let unmappedAccounts;
    
    if (mappedIds.length > 0) {
      unmappedAccounts = await db
        .select()
        .from(xeroChartOfAccounts)
        .where(
          and(
            eq(xeroChartOfAccounts.organizationId, organizationId),
            sql`${xeroChartOfAccounts.xeroAccountId} NOT IN (${sql.join(mappedIds.map(id => sql`${id}`), sql`, `)})`
          )
        )
        .orderBy(
          xeroChartOfAccounts.accountType,
          xeroChartOfAccounts.accountCode
        );
    } else {
      unmappedAccounts = await db
        .select()
        .from(xeroChartOfAccounts)
        .where(eq(xeroChartOfAccounts.organizationId, organizationId))
        .orderBy(
          xeroChartOfAccounts.accountType,
          xeroChartOfAccounts.accountCode
        );
    }

    // Group by account type
    const byType: Record<string, XeroChartOfAccount[]> = {};
    for (const account of unmappedAccounts) {
      const type = account.accountType || 'OTHER';
      if (!byType[type]) {
        byType[type] = [];
      }
      byType[type].push(account);
    }

    res.json({ 
      total: unmappedAccounts.length,
      byType,
    });
  } catch (error: any) {
    console.error('Error fetching unmapped accounts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single Chart of Account by ID
router.get('/xero/chart-of-accounts/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;
    const accountId = parseInt(req.params.id);

    const [account] = await db
      .select()
      .from(xeroChartOfAccounts)
      .where(
        and(
          eq(xeroChartOfAccounts.id, accountId),
          eq(xeroChartOfAccounts.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json(account);
  } catch (error: any) {
    console.error('Error fetching account:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
