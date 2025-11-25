import { Router } from 'express';
import { storage } from '../storage';
import { authenticateToken } from '../auth';
import { db } from '../db';
import { addressRecords, workItems, activityLogs } from '../../shared/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

const router = Router();

// Helper function to log activities
async function logActivity(
  organizationId: number,
  userId: number,
  actionType: 'creation' | 'status_change' | 'assignment' | 'comment' | 'file_upload' | 'kpi_update' | 'agent_action' | 'completion',
  entityType: string,
  entityId: number,
  description: string,
  metadata?: any
) {
  try {
    await db.insert(activityLogs).values({
      organizationId,
      userId,
      actionType,
      entityType,
      entityId,
      description,
      metadata: metadata || {}
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

// Get available columns metadata (dynamic discovery from schema + custom fields)
router.get('/metadata/columns', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    
    // Get schema-derived columns from address_records table
    // These are the real database columns we can query
    const schemaColumns = [
      { key: 'postcode', label: 'Postcode', category: 'airtable' },
      { key: 'summary', label: 'Summary', category: 'airtable' },
      { key: 'address', label: 'Address', category: 'airtable' },
      { key: 'premise', label: 'Premise', category: 'airtable' },
      { key: 'network', label: 'Network', category: 'airtable' },
      { key: 'udprn', label: 'UDPRN', category: 'airtable' },
      { key: 'statusId', label: 'Status', category: 'airtable' },
      { key: 'routerSerial', label: 'Router Serial', category: 'ocr' },
      { key: 'routerMac', label: 'Router MAC', category: 'ocr' },
      { key: 'routerModel', label: 'Router Model', category: 'ocr' },
      { key: 'onuSerial', label: 'ONU Serial', category: 'ocr' },
      { key: 'onuMac', label: 'ONU MAC', category: 'ocr' },
      { key: 'onuModel', label: 'ONU Model', category: 'ocr' },
    ];
    
    res.json({ columns: schemaColumns });
  } catch (error: any) {
    console.error('Error fetching column metadata:', error);
    res.status(500).json({ error: 'Failed to fetch column metadata' });
  }
});

// Get sync logs
router.get('/sync-logs', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { connectionId, limit } = req.query;
    
    const logs = await storage.getAddressSyncLogs(
      organizationId,
      connectionId ? parseInt(connectionId) : undefined,
      limit ? parseInt(limit) : 50
    );
    
    res.json({ logs });
  } catch (error: any) {
    console.error('Error fetching sync logs:', error);
    res.status(500).json({ error: 'Failed to fetch sync logs' });
  }
});

// Get single sync log
router.get('/sync-logs/:id', authenticateToken, async (req: any, res) => {
  try {
    const log = await storage.getAddressSyncLog(
      parseInt(req.params.id),
      req.user.organizationId
    );
    
    if (!log) {
      return res.status(404).json({ error: 'Sync log not found' });
    }
    
    res.json({ log });
  } catch (error: any) {
    console.error('Error fetching sync log:', error);
    res.status(500).json({ error: 'Failed to fetch sync log' });
  }
});

// Get all addresses with work item counts (and optionally full work items)
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { connectionId, includeWorkItems } = req.query;
    
    const addresses = await storage.getAddressRecords(
      organizationId, 
      connectionId ? parseInt(connectionId) : undefined
    );
    
    // Always get work item counts
    const workItemCounts = await db
      .select({
        addressId: sql<number>`CAST((workflow_metadata->>'addressRecordId') AS INTEGER)`,
        status: workItems.status,
        count: sql<number>`COUNT(*)::int`
      })
      .from(workItems)
      .where(
        and(
          eq(workItems.organizationId, organizationId),
          sql`workflow_metadata->>'addressRecordId' IS NOT NULL`
        )
      )
      .groupBy(
        sql`workflow_metadata->>'addressRecordId'`,
        workItems.status
      );
    
    // Aggregate counts
    const countsByAddress = new Map();
    workItemCounts.forEach(row => {
      if (!countsByAddress.has(row.addressId)) {
        countsByAddress.set(row.addressId, { pending: 0, completed: 0, total: 0 });
      }
      const counts = countsByAddress.get(row.addressId);
      counts.total += row.count;
      if (row.status === 'Completed') {
        counts.completed += row.count;
      } else {
        counts.pending += row.count;
      }
    });
    
    // Optionally fetch full work item details
    let workItemsByAddress = new Map();
    if (includeWorkItems === 'true') {
      const addressIds = addresses.map(a => a.id);
      
      // Fetch lightweight work item summaries for all addresses
      const fullWorkItems = await db
        .select({
          id: workItems.id,
          title: workItems.title,
          status: workItems.status,
          assignedTo: workItems.assignedTo,
          dueDate: workItems.dueDate,
          addressId: sql<number>`CAST((workflow_metadata->>'addressRecordId') AS INTEGER)`,
        })
        .from(workItems)
        .where(
          and(
            eq(workItems.organizationId, organizationId),
            sql`workflow_metadata->>'addressRecordId' IS NOT NULL`
          )
        );
      
      // Group work items by address
      fullWorkItems.forEach(item => {
        if (!workItemsByAddress.has(item.addressId)) {
          workItemsByAddress.set(item.addressId, []);
        }
        workItemsByAddress.get(item.addressId).push({
          id: item.id,
          title: item.title,
          status: item.status,
          assignedTo: item.assignedTo,
          dueDate: item.dueDate,
        });
      });
    }
    
    // Attach counts (and optionally work items) to addresses
    const addressesWithCounts = addresses.map(addr => ({
      ...addr,
      workItemCounts: countsByAddress.get(addr.id) || { pending: 0, completed: 0, total: 0 },
      ...(includeWorkItems === 'true' && { workItems: workItemsByAddress.get(addr.id) || [] })
    }));
    
    res.json({ addresses: addressesWithCounts });
  } catch (error: any) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

// Get single address
router.get('/:id', authenticateToken, async (req: any, res) => {
  try {
    const address = await storage.getAddressRecord(
      parseInt(req.params.id),
      req.user.organizationId
    );
    
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }
    
    // Log the view activity
    await logActivity(
      req.user.organizationId,
      req.user.userId,
      'creation', // Using 'creation' as it's the closest to 'view'
      'address',
      address.id,
      `Viewed address ${address.summary || address.address || address.airtableRecordId}`,
      { action: 'view', airtableRecordId: address.airtableRecordId }
    );
    
    // Build extracted data from OCR columns
    const extractedData: Record<string, any> = {};
    if (address.routerSerial) extractedData.routerSerial = address.routerSerial;
    if (address.routerMac) extractedData.routerMac = address.routerMac;
    if (address.routerModel) extractedData.routerModel = address.routerModel;
    if (address.onuSerial) extractedData.onuSerial = address.onuSerial;
    if (address.onuMac) extractedData.onuMac = address.onuMac;
    if (address.onuModel) extractedData.onuModel = address.onuModel;
    
    res.json({ 
      address,
      extractedData
    });
  } catch (error: any) {
    console.error('Error fetching address:', error);
    res.status(500).json({ error: 'Failed to fetch address' });
  }
});

// Update local-only fields
router.patch('/:id', authenticateToken, async (req: any, res) => {
  try {
    const { localStatus, localNotes } = req.body;
    
    const address = await storage.updateAddressRecord(
      parseInt(req.params.id),
      req.user.organizationId,
      { localStatus, localNotes }
    );
    
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }
    
    // Log status change if status was updated
    if (localStatus !== undefined) {
      await logActivity(
        req.user.organizationId,
        req.user.userId,
        'status_change',
        'address',
        address.id,
        `Changed status to "${localStatus}" for address ${address.summary || address.address || address.airtableRecordId}`,
        { 
          previousStatus: address.localStatus,
          newStatus: localStatus,
          airtableRecordId: address.airtableRecordId
        }
      );
    }
    
    res.json({ address });
  } catch (error: any) {
    console.error('Error updating address:', error);
    res.status(500).json({ error: 'Failed to update address' });
  }
});

// Get work items for an address
router.get('/:id/work-items', authenticateToken, async (req: any, res) => {
  try {
    const addressId = parseInt(req.params.id);
    
    const items = await db
      .select()
      .from(workItems)
      .where(
        and(
          eq(workItems.organizationId, req.user.organizationId),
          sql`workflow_metadata->>'addressRecordId' = ${addressId.toString()}`
        )
      )
      .orderBy(sql`${workItems.createdAt} DESC`);
    
    res.json({ workItems: items });
  } catch (error: any) {
    console.error('Error fetching work items:', error);
    res.status(500).json({ error: 'Failed to fetch work items' });
  }
});

// Get activity logs for an address
router.get('/:id/activity', authenticateToken, async (req: any, res) => {
  try {
    const addressId = parseInt(req.params.id);
    
    // Verify address exists and belongs to organization
    const address = await storage.getAddressRecord(addressId, req.user.organizationId);
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }
    
    const activities = await db
      .select()
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.organizationId, req.user.organizationId),
          eq(activityLogs.entityType, 'address'),
          eq(activityLogs.entityId, addressId)
        )
      )
      .orderBy(desc(activityLogs.createdAt));
    
    res.json({ activities });
  } catch (error: any) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// Update equipment data fields with activity logging
const EQUIPMENT_FIELDS = {
  routerSerial: 'Router Serial',
  routerMac: 'Router MAC',
  routerModel: 'Router Model',
  onuSerial: 'ONU Serial',
  onuMac: 'ONU MAC',
  onuModel: 'ONU Model',
} as const;

type EquipmentFieldKey = keyof typeof EQUIPMENT_FIELDS;

router.patch('/:id/equipment-data', authenticateToken, async (req: any, res) => {
  try {
    const addressId = parseInt(req.params.id);
    const { fieldName, value } = req.body;
    
    // Validate field name is an allowed equipment field
    if (!fieldName || !(fieldName in EQUIPMENT_FIELDS)) {
      return res.status(400).json({ 
        error: `Invalid field name. Allowed fields: ${Object.keys(EQUIPMENT_FIELDS).join(', ')}` 
      });
    }
    
    // Get current address to capture old value
    const currentAddress = await storage.getAddressRecord(addressId, req.user.organizationId);
    if (!currentAddress) {
      return res.status(404).json({ error: 'Address not found' });
    }
    
    const oldValue = currentAddress[fieldName as EquipmentFieldKey] || null;
    const newValue = value?.trim() || null;
    
    // Skip update if value hasn't changed
    if (oldValue === newValue) {
      return res.json({ address: currentAddress, message: 'No change detected' });
    }
    
    // Update the field
    const updateData: Partial<typeof currentAddress> = {
      [fieldName]: newValue
    };
    
    const updated = await storage.updateAddressRecord(
      addressId,
      req.user.organizationId,
      updateData
    );
    
    if (!updated) {
      return res.status(500).json({ error: 'Failed to update address' });
    }
    
    // Log the activity
    const fieldLabel = EQUIPMENT_FIELDS[fieldName as EquipmentFieldKey];
    const addressLabel = currentAddress.summary || currentAddress.address || currentAddress.airtableRecordId || `Address #${addressId}`;
    
    await logActivity(
      req.user.organizationId,
      req.user.userId,
      'kpi_update', // Using kpi_update as a general "field update" type
      'address',
      addressId,
      `Manually updated ${fieldLabel} for "${addressLabel}"`,
      {
        editType: 'equipment_manual_edit',
        fieldName,
        fieldLabel,
        oldValue: oldValue || '(empty)',
        newValue: newValue || '(empty)',
        addressLabel,
        airtableRecordId: currentAddress.airtableRecordId
      }
    );
    
    res.json({ 
      address: updated,
      message: `${fieldLabel} updated successfully`
    });
  } catch (error: any) {
    console.error('Error updating equipment data:', error);
    res.status(500).json({ error: 'Failed to update equipment data' });
  }
});

// Delete an address
router.delete('/:id', authenticateToken, async (req: any, res) => {
  try {
    const deleted = await storage.deleteAddressRecord(
      parseInt(req.params.id),
      req.user.organizationId
    );
    
    if (!deleted) {
      return res.status(404).json({ error: 'Address not found' });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting address:', error);
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

export default router;
