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

    // Create field definition
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

// Check if field exists
router.post('/verify', authenticateToken, async (req: any, res) => {
  try {
    const { tableName, fieldName } = req.body;
    const organizationId = req.user.organizationId;

    const fields = await fieldManager.getFieldDefinitionsForTable(organizationId, tableName);
    const exists = fields.some(f => f.fieldName === fieldName);

    res.json({ exists, fields });
  } catch (error: any) {
    console.error('Error verifying field:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
