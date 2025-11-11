import { Router } from 'express';
import { CleanDatabaseStorage } from '../storage';
import { authenticateToken } from '../auth.js';

const router = Router();

router.get('/tables', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 0;
    const storage = new CleanDatabaseStorage();
    
    let tables = await storage.getDataTables(organizationId);
    
    // Auto-seed tables if empty (first-time setup)
    if (tables.length === 0) {
      console.log(`[DataExplorer] No tables found for org ${organizationId}, auto-seeding from registry...`);
      tables = await storage.ensureDataTablesSeeded(organizationId);
    }
    
    res.json({ tables });
  } catch (error: any) {
    console.error('Error fetching data tables:', error);
    res.status(500).json({ 
      error: 'Failed to fetch data tables',
      message: error.message 
    });
  }
});

router.get('/fields/:tableName', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 0;
    const { tableName } = req.params;
    const storage = new CleanDatabaseStorage();
    
    const dataTable = await storage.getDataTableByName(organizationId, tableName);
    
    if (!dataTable) {
      return res.status(404).json({ 
        error: 'Table not found',
        message: `Table '${tableName}' not found or not accessible` 
      });
    }
    
    const fields = await storage.getDataFieldsByTableName(organizationId, tableName);
    
    res.json({ fields });
  } catch (error: any) {
    console.error('Error fetching data fields:', error);
    res.status(500).json({ 
      error: 'Failed to fetch data fields',
      message: error.message 
    });
  }
});

export default router;
