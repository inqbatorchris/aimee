import { Router } from 'express';
import { storage } from '../storage';
import { authenticateToken } from '../auth';
import { z } from 'zod';
import { 
  insertAirtableConnectionSchema, 
  insertAirtableWorkflowTemplateSchema,
  insertAirtableRecordLinkSchema 
} from '../../shared/schema';
import { workItemWorkflowService } from '../services/WorkItemWorkflowService';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Helper function to get API key for organization
async function getAirtableApiKey(organizationId: number): Promise<string> {
  // First, try to get from environment variable (persists across deployments)
  if (process.env.AIRTABLE_API_KEY) {
    console.log('🔑 [AIRTABLE] Using API key from environment variable');
    return process.env.AIRTABLE_API_KEY;
  }

  // Fallback to database-stored credentials
  const integration = await storage.getIntegration(organizationId, 'airtable');
  
  if (!integration || !integration.credentialsEncrypted) {
    throw new Error('Airtable integration not configured. Please add your API key in the integration settings or set AIRTABLE_API_KEY environment variable.');
  }

  // Decrypt the credentials
  const crypto = await import('crypto');
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'dev-key-do-not-use-in-production';
  
  try {
    const parts = integration.credentialsEncrypted.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    const credentials = JSON.parse(decrypted);
    console.log('🔑 [AIRTABLE] Using API key from database');
    return credentials.apiKey;
  } catch (error) {
    console.error('Failed to decrypt Airtable API key:', error);
    throw new Error('Failed to decrypt API key. Please reconfigure your Airtable integration.');
  }
}

// Helper function to call Airtable API
async function callAirtableAPI(organizationId: number, endpoint: string, method: string = 'GET', body?: any) {
  const apiKey = await getAirtableApiKey(organizationId);

  const response = await fetch(`https://api.airtable.com/v0${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Airtable API error: ${response.statusText}`);
  }

  return response.json();
}

// Helper function to ensure the "Data" menu section exists
async function ensureDataSection(organizationId: number): Promise<number> {
  // Check if Data section exists
  const sections = await storage.getMenuSections(organizationId);
  const dataSection = sections.find(s => s.name === 'Data');
  
  if (dataSection) {
    return dataSection.id;
  }
  
  // Create Data section if it doesn't exist
  const newSection = await storage.createMenuSection({
    organizationId,
    name: 'Data',
    description: 'Data sources and integrations',
    icon: 'Database',
    orderIndex: 100, // Place it after core sections
    isVisible: true,
    isCollapsible: true,
    isDefaultExpanded: true,
    rolePermissions: [],
  });
  
  return newSection.id;
}

// List all accessible Airtable bases
router.get('/bases', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const data = await callAirtableAPI(user.organizationId, '/meta/bases');
    
    res.json({
      bases: data.bases || []
    });
  } catch (error: any) {
    console.error('Error fetching Airtable bases:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch Airtable bases' });
  }
});

// Get tables from a specific base
router.get('/bases/:baseId/tables', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const { baseId } = req.params;
    const data = await callAirtableAPI(user.organizationId, `/meta/bases/${baseId}/tables`);
    
    res.json({
      tables: data.tables || []
    });
  } catch (error: any) {
    console.error('Error fetching Airtable tables:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch Airtable tables' });
  }
});

// Get table schema
router.get('/bases/:baseId/tables/:tableId/schema', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const { baseId, tableId } = req.params;
    const data = await callAirtableAPI(user.organizationId, `/meta/bases/${baseId}/tables/${tableId}`);
    
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching table schema:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch table schema' });
  }
});

// Fetch records from a table with pagination
router.get('/bases/:baseId/tables/:tableIdOrName/records', async (req, res) => {
  try {
    console.log('📊 [AIRTABLE] GET /bases/:baseId/tables/:tableIdOrName/records');
    console.log('📊 [AIRTABLE] baseId:', req.params.baseId);
    console.log('📊 [AIRTABLE] tableIdOrName:', req.params.tableIdOrName);
    
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const { baseId, tableIdOrName } = req.params;
    const { offset, pageSize = '25', filterByFormula, fields, sort } = req.query;

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (pageSize) queryParams.append('pageSize', pageSize.toString());
    if (offset) queryParams.append('offset', offset.toString());
    if (filterByFormula) queryParams.append('filterByFormula', filterByFormula.toString());
    if (fields && typeof fields === 'string') {
      fields.split(',').forEach(field => queryParams.append('fields[]', field.trim()));
    }
    if (sort && typeof sort === 'string') {
      const sortParts = sort.split(':');
      if (sortParts.length === 2) {
        queryParams.append('sort[0][field]', sortParts[0]);
        queryParams.append('sort[0][direction]', sortParts[1]);
      }
    }

    const endpoint = `/${baseId}/${encodeURIComponent(tableIdOrName)}?${queryParams.toString()}`;
    console.log('📊 [AIRTABLE] Calling Airtable API endpoint:', endpoint);
    const data = await callAirtableAPI(user.organizationId, endpoint);
    
    console.log('📊 [AIRTABLE] Received', data.records?.length || 0, 'records from Airtable');
    
    res.json({
      records: data.records || [],
      offset: data.offset
    });
  } catch (error: any) {
    console.error('Error fetching Airtable records:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch Airtable records' });
  }
});

// Create a new Airtable connection
router.post('/connections', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    // Validate request body
    const validationResult = insertAirtableConnectionSchema.safeParse({
      ...req.body,
      organizationId: user.organizationId,
      createdBy: user.id
    });

    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationResult.error.issues 
      });
    }

    // Check if connection already exists
    const existingConnections = await storage.getAirtableConnections(user.organizationId);
    const existingConnection = existingConnections.find(c => 
      c.baseId === validationResult.data.baseId && 
      c.tableId === validationResult.data.tableId
    );

    let connection;
    if (existingConnection) {
      // Connection exists - return it
      return res.status(200).json(existingConnection);
    } else {
      // Create new connection (without automatic menu item generation)
      connection = await storage.createAirtableConnection(validationResult.data);
      res.status(201).json(connection);
    }
  } catch (error: any) {
    console.error('Error creating Airtable connection:', error);
    res.status(500).json({ error: error.message || 'Failed to create connection' });
  }
});

// Get all Airtable connections for organization
router.get('/connections', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const connections = await storage.getAirtableConnections(user.organizationId);
    
    res.json({ connections });
  } catch (error: any) {
    console.error('Error fetching Airtable connections:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch connections' });
  }
});

// Get a specific connection
router.get('/connections/:connectionId', async (req, res) => {
  try {
    console.log('🔍 [AIRTABLE] GET /connections/:connectionId - ID:', req.params.connectionId);
    
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const connection = await storage.getAirtableConnection(
      parseInt(req.params.connectionId),
      user.organizationId
    );

    console.log('🔍 [AIRTABLE] Connection found:', connection ? 'YES' : 'NO');
    if (connection) {
      console.log('🔍 [AIRTABLE] Connection data:', JSON.stringify(connection, null, 2));
    }

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    res.json(connection);
  } catch (error: any) {
    console.error('❌ [AIRTABLE] Error fetching connection:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch connection' });
  }
});

// Update a connection
router.patch('/connections/:connectionId', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const connection = await storage.updateAirtableConnection(
      parseInt(req.params.connectionId),
      user.organizationId,
      req.body
    );

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    res.json(connection);
  } catch (error: any) {
    console.error('Error updating Airtable connection:', error);
    res.status(500).json({ error: error.message || 'Failed to update connection' });
  }
});

// Delete a connection
router.delete('/connections/:connectionId', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    await storage.deleteAirtableConnection(
      parseInt(req.params.connectionId),
      user.organizationId
    );
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting Airtable connection:', error);
    res.status(500).json({ error: error.message || 'Failed to delete connection' });
  }
});

// Create workflow template
router.post('/workflow-templates', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const validationResult = insertAirtableWorkflowTemplateSchema.safeParse({
      ...req.body,
      organizationId: user.organizationId,
      createdBy: user.id
    });

    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationResult.error.issues 
      });
    }

    const template = await storage.createAirtableWorkflowTemplate(validationResult.data);
    
    res.status(201).json(template);
  } catch (error: any) {
    console.error('Error creating workflow template:', error);
    res.status(500).json({ error: error.message || 'Failed to create workflow template' });
  }
});

// Get workflow templates for a connection
router.get('/connections/:connectionId/workflow-templates', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const templates = await storage.getAirtableWorkflowTemplates(
      parseInt(req.params.connectionId),
      user.organizationId
    );
    
    res.json({ templates });
  } catch (error: any) {
    console.error('Error fetching workflow templates:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch workflow templates' });
  }
});

// Create work items from selected Airtable records
router.post('/connections/:connectionId/create-work-items', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const { recordIds, templateId, assigneeId, dueDate } = req.body;

    if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
      return res.status(400).json({ error: 'recordIds array is required' });
    }

    const connectionId = parseInt(req.params.connectionId);
    const connection = await storage.getAirtableConnection(connectionId, user.organizationId);

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Fetch the Airtable records to get their data
    const records: any[] = [];
    for (const recordId of recordIds) {
      try {
        const recordData = await callAirtableAPI(
          user.organizationId,
          `/${connection.baseId}/${connection.tableId}/${recordId}`
        );
        records.push(recordData);
      } catch (error) {
        console.error(`Failed to fetch record ${recordId}:`, error);
      }
    }

    // Get workflow template if provided
    let workflowTemplate = null;
    if (templateId) {
      try {
        workflowTemplate = await storage.getWorkflowTemplate(user.organizationId, templateId);
      } catch (error) {
        console.error('Failed to fetch workflow template:', error);
      }
    }

    // Create work items for each record
    const createdWorkItems = [];
    for (const record of records) {
      const fields = record.fields || {};
      
      // Determine title from record - use summary field
      const title = fields.summary || fields.Summary || `Record ${record.id}`;

      const workItemData = {
        organizationId: user.organizationId,
        title: `${title}`,
        description: JSON.stringify(fields, null, 2),
        status: 'Planning' as const,
        assignedTo: assigneeId || user.id,
        dueDate: dueDate || null,
        createdBy: user.id,
        workflowSource: 'airtable' as const,
        workflowTemplateId: templateId || null,
        workItemType: workflowTemplate?.name || `airtable_${connection.id}`,
        workflowMetadata: {
          airtableConnectionId: connectionId,
          airtableRecordId: record.id,
          airtableFields: fields,
          templateName: workflowTemplate?.name || null
        }
      };

      const workItem = await storage.createWorkItem(workItemData);
      
      // Create record link
      await storage.createAirtableRecordLink({
        connectionId,
        workItemId: workItem.id,
        airtableRecordId: record.id,
        airtableRecordData: fields,
        linkedBy: user.id
      });

      // Auto-initialize workflow execution if template is assigned
      if (templateId) {
        try {
          await workItemWorkflowService.startWorkflowExecution({
            workItemId: workItem.id,
            organizationId: user.organizationId,
            userId: user.id
          });
          console.log(`✅ Workflow initialized for work item ${workItem.id} from Airtable record ${record.id}`);
        } catch (error) {
          console.error(`❌ Failed to initialize workflow for work item ${workItem.id}:`, error);
          // Don't fail the work item creation if workflow init fails
        }
      }

      createdWorkItems.push(workItem);
    }
    
    res.status(201).json({ 
      success: true, 
      count: createdWorkItems.length,
      workItems: createdWorkItems 
    });
  } catch (error: any) {
    console.error('Error creating work items from Airtable records:', error);
    res.status(500).json({ error: error.message || 'Failed to create work items' });
  }
});

// Sync addresses from Airtable - now syncs RAGStatus, Tariff, and Addresses with relationship resolution
router.post('/connections/:connectionId/sync-addresses', async (req, res) => {
  const startTime = Date.now();
  let syncLogId: number | undefined;
  
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const connectionId = parseInt(req.params.connectionId);
    const connection = await storage.getAirtableConnection(connectionId, user.organizationId);
    
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    // Create sync log at start
    const syncLog = await storage.createAddressSyncLog({
      organizationId: user.organizationId,
      airtableConnectionId: connectionId,
      startedAt: new Date(),
      status: 'in_progress',
      initiatedBy: user.id
    });
    syncLogId = syncLog.id;
    
    const BATCH_SIZE = 100;
    let totalCreated = 0;
    let totalUpdated = 0;
    
    // PHASE 1: Sync RAGStatus table (optional - only if connection exists)
    console.log('=== PHASE 1: Syncing RAGStatus (optional) ===');
    const ragStatusMap = new Map<string, string>(); // airtableRecordId -> status name
    
    // Check if RAGStatus connection exists
    const ragStatusConnection = await storage.getAirtableConnectionByTableName(user.organizationId, 'RAGStatus');
    
    if (ragStatusConnection) {
      console.log('Found RAGStatus connection, syncing...');
      let ragStatusRecords: any[] = [];
      let ragStatusOffset: string | undefined = undefined;
      
      do {
        const endpoint = `/${ragStatusConnection.baseId}/${ragStatusConnection.tableId}${ragStatusOffset ? `?offset=${ragStatusOffset}` : ''}`;
        const data = await callAirtableAPI(user.organizationId, endpoint);
        ragStatusRecords = ragStatusRecords.concat(data.records || []);
        ragStatusOffset = data.offset;
      } while (ragStatusOffset);
    
      console.log(`Fetched ${ragStatusRecords.length} RAGStatus records`);
      
      // Build RAGStatus lookup map
      for (let i = 0; i < ragStatusRecords.length; i += BATCH_SIZE) {
        const batch = ragStatusRecords.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (record) => {
            const result = await storage.upsertRagStatusFromAirtable(
              user.organizationId,
              ragStatusConnection.id,
              record.id,
              record.fields
            );
            // Store status field value in map
            if (record.fields.status) {
              ragStatusMap.set(record.id, record.fields.status);
            }
          })
        );
      }
      console.log(`✓ Synced ${ragStatusRecords.length} RAGStatus records`);
    } else {
      console.log('⊘ No RAGStatus connection found, skipping RAGStatus sync');
    }
    
    // PHASE 2: Sync Tariff table (optional - only if connection exists)
    console.log('=== PHASE 2: Syncing Tariffs (optional) ===');
    const tariffMap = new Map<string, string>(); // airtableRecordId -> description
    
    // Check if Tariff/Tariffs connection exists (support both singular and plural)
    let tariffConnection = await storage.getAirtableConnectionByTableName(user.organizationId, 'Tariff');
    if (!tariffConnection) {
      tariffConnection = await storage.getAirtableConnectionByTableName(user.organizationId, 'Tariffs');
    }
    
    if (tariffConnection) {
      console.log('Found Tariff connection, syncing...');
      let tariffRecords: any[] = [];
      let tariffOffset: string | undefined = undefined;
      
      do {
        const endpoint = `/${tariffConnection.baseId}/${tariffConnection.tableId}${tariffOffset ? `?offset=${tariffOffset}` : ''}`;
        const data = await callAirtableAPI(user.organizationId, endpoint);
        tariffRecords = tariffRecords.concat(data.records || []);
        tariffOffset = data.offset;
      } while (tariffOffset);
    
      console.log(`Fetched ${tariffRecords.length} Tariff records`);
      
      // Build Tariff lookup map
      for (let i = 0; i < tariffRecords.length; i += BATCH_SIZE) {
        const batch = tariffRecords.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (record) => {
            const result = await storage.upsertTariffFromAirtable(
              user.organizationId,
              tariffConnection.id,
              record.id,
              record.fields
            );
            // Store description field value in map
            if (record.fields.description) {
              tariffMap.set(record.id, record.fields.description);
            }
          })
        );
      }
      console.log(`✓ Synced ${tariffRecords.length} Tariff records`);
    } else {
      console.log('⊘ No Tariff connection found, skipping Tariff sync');
    }
    
    // PHASE 3: Sync Addresses with relationship resolution
    console.log('=== PHASE 3: Syncing Addresses (with relationship resolution) ===');
    let allRecords: any[] = [];
    let offset: string | undefined = undefined;
    
    do {
      const endpoint = `/${connection.baseId}/${connection.tableId}${offset ? `?offset=${offset}` : ''}`;
      const data = await callAirtableAPI(user.organizationId, endpoint);
      allRecords = allRecords.concat(data.records || []);
      offset = data.offset;
    } while (offset);
    
    console.log(`Fetched ${allRecords.length} Address records`);
    
    // Process addresses in batches
    let created = 0;
    let updated = 0;
    
    for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
      const batch = allRecords.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(allRecords.length / BATCH_SIZE);
      
      console.log(`Processing address batch ${batchNum}/${totalBatches} (${batch.length} records)...`);
      
      // Process batch with relationship resolution
      const results = await Promise.all(
        batch.map(async (record) => {
          // Resolve linked fields
          const fieldsWithResolved = { ...record.fields };
          
          // Resolve status_ID/status_id field (can be single or array) - case insensitive
          const statusField = record.fields.status_ID || record.fields.status_id || record.fields.Status_ID;
          if (statusField && ragStatusMap.size > 0) {
            const statusIds = Array.isArray(statusField) 
              ? statusField 
              : [statusField];
            
            const resolvedStatuses = statusIds
              .map(id => ragStatusMap.get(id))
              .filter(Boolean);
            
            if (resolvedStatuses.length > 0) {
              fieldsWithResolved._resolved_status = resolvedStatuses.join(', ');
            }
          }
          
          // Resolve tariff/tariffs field (can be single or array) - case insensitive, plural support
          const tariffField = record.fields.tariff || record.fields.tariffs || record.fields.Tariff || record.fields.Tariffs;
          if (tariffField && tariffMap.size > 0) {
            const tariffIds = Array.isArray(tariffField)
              ? tariffField
              : [tariffField];
            
            const resolvedTariffs = tariffIds
              .map(id => tariffMap.get(id))
              .filter(Boolean);
            
            if (resolvedTariffs.length > 0) {
              fieldsWithResolved._resolved_tariff = resolvedTariffs.join(', ');
            }
          }
          
          return storage.upsertAddressFromAirtable(
            user.organizationId,
            connectionId,
            record.id,
            fieldsWithResolved
          );
        })
      );
      
      // Count created vs updated
      const now = new Date();
      for (const result of results) {
        const syncedAt = new Date(result.lastSyncedAt!);
        const diff = now.getTime() - syncedAt.getTime();
        
        if (diff < 1000) {
          const createdDiff = now.getTime() - new Date(result.createdAt).getTime();
          if (createdDiff < 2000) {
            created++;
          } else {
            updated++;
          }
        } else {
          updated++;
        }
      }
      
      // Update sync log progress periodically
      if (batchNum % 10 === 0 || batchNum === totalBatches) {
        await storage.updateAddressSyncLog(syncLogId, {
          recordsCreated: created,
          recordsUpdated: updated,
          recordsTotal: allRecords.length
        });
        console.log(`Progress: ${created} created, ${updated} updated (${i + batch.length}/${allRecords.length})`);
      }
    }
    
    console.log(`✓ Sync complete: ${created} created, ${updated} updated out of ${allRecords.length} addresses`);
    
    totalCreated = created;
    totalUpdated = updated;
    
    // Update sync log with completion details
    const duration = Date.now() - startTime;
    await storage.updateAddressSyncLog(syncLogId, {
      completedAt: new Date(),
      duration,
      recordsCreated: totalCreated,
      recordsUpdated: totalUpdated,
      recordsTotal: allRecords.length,
      status: 'completed'
    });
    
    // Build response with warnings if reference tables weren't synced
    const warnings: string[] = [];
    if (!ragStatusConnection) {
      warnings.push('RAGStatus table not connected - status IDs will not be resolved to names. Create a connection named "RAGStatus" to enable status name resolution.');
    }
    if (!tariffConnection) {
      warnings.push('Tariff table not connected - tariff IDs will not be resolved to names. Create a connection named "Tariff" to enable tariff name resolution.');
    }
    
    res.json({
      success: true,
      addresses: { total: allRecords.length, created: totalCreated, updated: totalUpdated },
      ragStatus: ragStatusConnection ? { synced: ragStatusMap.size } : null,
      tariff: tariffConnection ? { synced: tariffMap.size } : null,
      warnings: warnings.length > 0 ? warnings : undefined,
      syncedAt: new Date(),
      syncLogId
    });
  } catch (error: any) {
    console.error('Error syncing addresses:', error);
    
    // Update sync log with error if it was created
    if (syncLogId) {
      const duration = Date.now() - startTime;
      await storage.updateAddressSyncLog(syncLogId, {
        completedAt: new Date(),
        duration,
        status: 'failed',
        errorMessage: error.message
      });
    }
    
    res.status(500).json({ error: error.message || 'Failed to sync addresses' });
  }
});

// Export addresses to CSV
router.get('/connections/:connectionId/export-addresses-csv', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const connectionId = parseInt(req.params.connectionId);
    
    // Get all addresses for this connection
    const addresses = await storage.getAddressRecords(user.organizationId, connectionId);
    
    if (addresses.length === 0) {
      return res.status(404).json({ error: 'No addresses found' });
    }
    
    // Export using real columns (searchable Airtable fields + OCR fields)
    const headers = [
      'id', 'postcode', 'summary', 'address', 'premise', 'network', 'udprn', 
      'statusId', 'routerSerial', 'routerMac', 'routerModel', 
      'onuSerial', 'onuMac', 'onuModel', 'localStatus', 'localNotes'
    ];
    const csvRows = [headers.join(',')];
    
    for (const addr of addresses) {
      const values = headers.map(h => {
        const val = (addr as any)[h];
        // Escape commas and quotes
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvRows.push(values.join(','));
    }
    
    const csv = csvRows.join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="addresses-export-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error: any) {
    console.error('Error exporting addresses:', error);
    res.status(500).json({ error: 'Failed to export addresses' });
  }
});

export default router;
