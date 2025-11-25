import { Router } from 'express';
import { authenticateToken } from '../auth';
import { FieldManagerService } from '../services/ocr/FieldManagerService';

const router = Router();
const fieldManager = new FieldManagerService();

// Create field definition immediately during template configuration
router.post('/create', authenticateToken, async (req: any, res) => {
  try {
    const { tableName, fieldName, displayLabel, extractionPrompt } = req.body;
    const organizationId = req.user.organizationId;
    const createdBy = req.user.userId;

    // Validate required fields
    if (!tableName || !fieldName || !displayLabel) {
      return res.status(400).json({ 
        error: 'Missing required fields: tableName, fieldName, displayLabel' 
      });
    }

    // SECURITY: Only allow address_records table (not 'addresses' - that's the legacy table)
    const allowedTables = ['address_records'];
    if (!allowedTables.includes(tableName)) {
      return res.status(403).json({ 
        error: `Table "${tableName}" not allowed. Only 'address_records' is supported for OCR field configuration.`
      });
    }

    // SECURITY: Validate field name format (alphanumeric and underscores only)
    if (!fieldManager.validateFieldName(fieldName)) {
      return res.status(400).json({ 
        error: 'Invalid field name. Use lowercase letters, numbers, and underscores only.' 
      });
    }

    // SECURITY: Limit extraction prompt length
    if (extractionPrompt && extractionPrompt.length > 500) {
      return res.status(400).json({ 
        error: 'Extraction prompt too long (max 500 characters)' 
      });
    }

    // CRITICAL: Validate that field maps to an existing physical column
    const columnName = fieldManager.getColumnName(tableName, fieldName);
    if (!columnName) {
      const knownColumns = fieldManager.getKnownColumns(tableName);
      return res.status(400).json({ 
        error: `Field "${fieldName}" does not map to an existing column on table "${tableName}". ` +
          `Available columns: ${knownColumns.join(', ')}. ` +
          `Only pre-defined schema columns can be configured for OCR extraction.`
      });
    }

    // Create field definition (metadata tracking for OCR configuration)
    const fieldDef = await fieldManager.createOrUpdateFieldDefinition({
      organizationId,
      tableName,
      fieldName,
      displayLabel,
      fieldType: 'text',
      description: `OCR extraction field`,
      extractionPrompt,
      createdBy,
    });

    res.json({ 
      success: true,
      field: fieldDef,
      message: `Field "${displayLabel}" created successfully`
    });
  } catch (error: any) {
    console.error('Error creating field:', error);
    res.status(500).json({ error: error.message || 'Failed to create field' });
  }
});

// Get available tables and their columns for callback configuration
router.get('/tables', authenticateToken, async (req: any, res) => {
  try {
    // Return list of available tables with their writable columns
    const tables = [
      {
        id: 'work_item_source',
        name: 'Same as Work Item Source (Dynamic)',
        description: 'Writes to whatever table the work item is linked to',
        isDynamic: true,
        columns: [] // Columns determined at runtime based on actual source
      },
      {
        id: 'address_records',
        name: 'Address Records',
        description: 'Equipment installation and address data',
        isDynamic: false,
        columns: fieldManager.getKnownColumns('address_records').map(col => ({
          id: col,
          name: col,
          label: formatColumnLabel(col)
        }))
      }
    ];

    res.json({ tables });
  } catch (error: any) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get columns for a specific table
router.get('/tables/:tableName/columns', authenticateToken, async (req: any, res) => {
  try {
    const { tableName } = req.params;
    
    if (tableName === 'work_item_source') {
      // Dynamic - return all possible columns from all supported tables
      const columns = fieldManager.getKnownColumns('address_records').map(col => ({
        id: col,
        name: col,
        label: formatColumnLabel(col)
      }));
      res.json({ columns, isDynamic: true });
    } else {
      const columns = fieldManager.getKnownColumns(tableName).map(col => ({
        id: col,
        name: col,
        label: formatColumnLabel(col)
      }));
      res.json({ columns, isDynamic: false });
    }
  } catch (error: any) {
    console.error('Error fetching columns:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper to format column names nicely
function formatColumnLabel(columnName: string): string {
  // routerSerial → Router Serial
  return columnName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

// Check if field exists
router.post('/verify', authenticateToken, async (req: any, res) => {
  try {
    const { tableName, fieldName } = req.body;
    const organizationId = req.user.organizationId;

    // SECURITY: Only allow address_records table (not 'addresses' - that's the legacy table)
    const allowedTables = ['address_records'];
    if (!allowedTables.includes(tableName)) {
      return res.status(403).json({ 
        error: `Table "${tableName}" not allowed. Only 'address_records' is supported for OCR field configuration.`
      });
    }

    const fields = await fieldManager.getFieldDefinitionsForTable(organizationId, tableName);
    const exists = fields.some(f => f.fieldName === fieldName);

    res.json({ exists, fields });
  } catch (error: any) {
    console.error('Error verifying field:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
