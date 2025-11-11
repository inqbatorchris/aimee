import { Router } from 'express';
import { CleanDatabaseStorage } from '../storage';
import { authenticateToken } from '../auth.js';
import { TABLE_REGISTRY } from '../services/workflow/tableRegistry.js';
import { db } from '../db.js';
import { eq, and, ne, gt, lt, gte, lte, like, notLike, sql, count, isNull, isNotNull } from 'drizzle-orm';

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

router.post('/test-query', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 0;
    const { sourceTable, queryConfig } = req.body;
    
    if (!sourceTable || !queryConfig) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'sourceTable and queryConfig are required' 
      });
    }
    
    const storage = new CleanDatabaseStorage();
    
    // Validate table access
    const dataTable = await storage.getDataTableByName(organizationId, sourceTable);
    if (!dataTable) {
      return res.status(404).json({ 
        error: 'Table not found',
        message: `Table '${sourceTable}' not found or not accessible` 
      });
    }
    
    // Get table schema from registry
    const tableSchema = TABLE_REGISTRY[sourceTable];
    if (!tableSchema) {
      return res.status(400).json({ 
        error: 'Table not registered',
        message: `Table '${sourceTable}' is not registered for data source queries` 
      });
    }
    
    const startTime = Date.now();
    
    // Execute test query
    const result = await executeTestQuery(tableSchema, organizationId, queryConfig);
    
    const duration = Date.now() - startTime;
    
    res.json({ 
      count: result,
      duration,
      sourceTable,
      filterCount: queryConfig.filters?.length || 0,
    });
  } catch (error: any) {
    console.error('Error executing test query:', error);
    res.status(500).json({ 
      error: 'Failed to execute test query',
      message: error.message 
    });
  }
});

async function executeTestQuery(tableSchema: any, organizationId: number, queryConfig: any): Promise<number> {
  const { filters = [], limit = 1000 } = queryConfig;
  
  const conditions: any[] = [];
  
  // Add organization isolation
  if (tableSchema.organizationId) {
    conditions.push(eq(tableSchema.organizationId, organizationId));
  }
  
  // Build filter conditions
  for (const filter of filters) {
    const { field, operator, value } = filter;
    
    // Handle JSONB fields (e.g., airtableFields.Network)
    if (field.includes('.')) {
      const parts = field.split('.');
      const jsonColumn = parts[0];
      const jsonField = parts.slice(1).join('.');
      
      const column = (tableSchema as any)[jsonColumn];
      if (!column) {
        throw new Error(`JSONB column '${jsonColumn}' not found in table`);
      }
      
      const jsonPath = sql`${column}->>${jsonField}`;
      conditions.push(buildJsonbCondition(jsonPath, operator, value));
    } else {
      // Handle regular columns
      const column = (tableSchema as any)[field];
      if (!column) {
        throw new Error(`Field '${field}' not found in table`);
      }
      
      conditions.push(buildCondition(column, operator, value));
    }
  }
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  // Execute count query
  const queryResult = await db
    .select({ value: count() })
    .from(tableSchema)
    .where(whereClause)
    .limit(limit);
  
  return queryResult[0]?.value || 0;
}

function buildCondition(column: any, operator: string, value: any): any {
  switch (operator) {
    case 'equals':
      return eq(column, value);
    case 'not_equals':
      return ne(column, value);
    case 'contains':
      return like(column, `%${value}%`);
    case 'not_contains':
      return notLike(column, `%${value}%`);
    case 'starts_with':
      return like(column, `${value}%`);
    case 'ends_with':
      return like(column, `%${value}`);
    case 'greater_than':
      return gt(column, value);
    case 'less_than':
      return lt(column, value);
    case 'greater_than_or_equal':
      return gte(column, value);
    case 'less_than_or_equal':
      return lte(column, value);
    case 'is_null':
      return isNull(column);
    case 'not_null':
      return isNotNull(column);
    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}

function buildJsonbCondition(jsonPath: any, operator: string, value: any): any {
  switch (operator) {
    case 'equals':
      return sql`${jsonPath} = ${value}`;
    case 'not_equals':
      return sql`${jsonPath} != ${value}`;
    case 'contains':
      return sql`${jsonPath} LIKE ${`%${value}%`}`;
    case 'not_contains':
      return sql`${jsonPath} NOT LIKE ${`%${value}%`}`;
    case 'starts_with':
      return sql`${jsonPath} LIKE ${`${value}%`}`;
    case 'ends_with':
      return sql`${jsonPath} LIKE ${`%${value}`}`;
    case 'is_null':
      return sql`${jsonPath} IS NULL`;
    case 'not_null':
      return sql`${jsonPath} IS NOT NULL`;
    default:
      throw new Error(`Unknown operator for JSONB: ${operator}`);
  }
}

export default router;
