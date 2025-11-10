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
  financialTransactions,
  profitCenters,
  financialMetricsCache,
  xeroSyncStatus,
} from '@shared/schema';
import crypto from 'crypto';
import axios from 'axios';

const router = Router();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'dev-key-do-not-use-in-production';
const IV_LENGTH = 16;

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
      limit = '100',
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

    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(financialTransactions)
      .where(eq(financialTransactions.organizationId, organizationId));

    res.json({ 
      transactions, 
      total: Number(countResult[0].count) 
    });
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

    res.json(results);
  } catch (error: any) {
    console.error('Error fetching profit centers:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/profit-centers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;
    const userId = req.user?.id;
    
    const data = insertProfitCenterSchema.parse({
      ...req.body,
      organizationId,
      createdBy: userId,
    });

    const result = await db
      .insert(profitCenters)
      .values(data)
      .returning() as any[];
    
    const profitCenter = result[0];

    res.json(profitCenter);
  } catch (error: any) {
    console.error('Error creating profit center:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/profit-centers/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;
    const { id } = req.params;

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

    res.json({
      profitCenter: profitCenterData[0] || null,
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

    const xeroData = await xeroService.syncAllTransactions(since, isFirstSync);

    console.log(`Xero sync fetched: ${xeroData.invoices.length} invoices, ${xeroData.bankTransactions.length} bank transactions, ${xeroData.payments.length} payments`);

    let syncedCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    for (const invoice of xeroData.invoices) {
      try {
        const existing = await db
          .select()
          .from(financialTransactions)
          .where(
            and(
              eq(financialTransactions.organizationId, organizationId),
              eq(financialTransactions.xeroTransactionId, invoice.InvoiceID),
              eq(financialTransactions.xeroTransactionType, 'invoice' as any)
            )!
          )
          .limit(1);

        if (existing[0]) {
          await db
            .update(financialTransactions)
            .set({
              amount: String(invoice.Total || 0),
              description: invoice.Reference || invoice.InvoiceNumber,
              contactName: invoice.Contact?.Name,
              xeroContactId: invoice.Contact?.ContactID,
              metadata: invoice,
              updatedAt: new Date(),
            })
            .where(eq(financialTransactions.id, existing[0].id));
        } else {
          await db
            .insert(financialTransactions)
            .values({
              organizationId,
              xeroTransactionId: invoice.InvoiceID,
              xeroTransactionType: 'invoice' as any,
              transactionDate: parseXeroDate(invoice.Date),
              amount: String(invoice.Total || 0),
              description: invoice.Reference || invoice.InvoiceNumber,
              contactName: invoice.Contact?.Name,
              xeroContactId: invoice.Contact?.ContactID,
              currency: invoice.CurrencyCode || 'USD',
              metadata: invoice,
            });
        }
        syncedCount++;
      } catch (error: any) {
        failedCount++;
        errors.push({ invoiceId: invoice.InvoiceID, error: error.message });
      }
    }

    for (const bankTx of xeroData.bankTransactions) {
      try {
        const existing = await db
          .select()
          .from(financialTransactions)
          .where(
            and(
              eq(financialTransactions.organizationId, organizationId),
              eq(financialTransactions.xeroTransactionId, bankTx.BankTransactionID),
              eq(financialTransactions.xeroTransactionType, 'bank_transaction' as any)
            )!
          )
          .limit(1);

        if (existing[0]) {
          await db
            .update(financialTransactions)
            .set({
              amount: String(bankTx.Total || 0),
              description: bankTx.Reference,
              contactName: bankTx.Contact?.Name,
              xeroContactId: bankTx.Contact?.ContactID,
              metadata: bankTx,
              updatedAt: new Date(),
            })
            .where(eq(financialTransactions.id, existing[0].id));
        } else {
          await db
            .insert(financialTransactions)
            .values({
              organizationId,
              xeroTransactionId: bankTx.BankTransactionID,
              xeroTransactionType: 'bank_transaction' as any,
              transactionDate: parseXeroDate(bankTx.Date),
              amount: String(bankTx.Total || 0),
              description: bankTx.Reference,
              contactName: bankTx.Contact?.Name,
              xeroContactId: bankTx.Contact?.ContactID,
              currency: bankTx.CurrencyCode || 'USD',
              metadata: bankTx,
            });
        }
        syncedCount++;
      } catch (error: any) {
        failedCount++;
        errors.push({ transactionId: bankTx.BankTransactionID, error: error.message });
      }
    }

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

    console.log(`Xero sync completed: ${syncedCount} synced, ${failedCount} failed`);

    res.json({
      success: true,
      recordsSynced: syncedCount,
      synced: syncedCount,
      failed: failedCount,
      errors: errors.slice(0, 10),
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

// Get Xero sync history
router.get('/xero/sync-history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 3;

    const history = await db
      .select()
      .from(xeroSyncStatus)
      .where(eq(xeroSyncStatus.organizationId, organizationId))
      .orderBy(desc(xeroSyncStatus.lastSyncAt))
      .limit(20);

    res.json(history);
  } catch (error: any) {
    console.error('Error fetching sync history:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
