import { Router } from 'express';
import { CleanDatabaseStorage } from '../storage';
import { authenticateToken } from '../auth.js';
import { TABLE_REGISTRY, TABLE_RELATIONSHIPS } from '../services/workflow/tableRegistry.js';
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

router.get('/relationships', authenticateToken, async (req, res) => {
  try {
    const { tableName } = req.query;
    
    if (tableName) {
      // Return relationships for a specific table
      const relationships = TABLE_RELATIONSHIPS.filter(
        rel => rel.parentTable === tableName || rel.childTable === tableName
      );
      res.json({ relationships });
    } else {
      // Return all relationships
      res.json({ relationships: TABLE_RELATIONSHIPS });
    }
  } catch (error: any) {
    console.error('Error fetching relationships:', error);
    res.status(500).json({ 
      error: 'Failed to fetch relationships',
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

// Endpoint to fetch records from a table for selection in filters
router.get('/records/:tableName', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user!.organizationId || 0;
    const { tableName } = req.params;
    const { limit = 100 } = req.query;
    
    // Validate table name
    if (!tableName || typeof tableName !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid table name',
        message: 'Table name is required and must be a string' 
      });
    }
    
    // Get table schema from registry
    const tableSchema = TABLE_REGISTRY[tableName];
    if (!tableSchema) {
      return res.status(400).json({ 
        error: 'Table not registered',
        message: `Table '${tableName}' is not registered for data source queries` 
      });
    }
    
    // Define display field mapping for each table
    const displayFieldMap: Record<string, string> = {
      'objectives': 'title',
      'key_results': 'title',
      'key_result_tasks': 'title',
      'profit_centers': 'name',
      'work_items': 'title',
      'address_records': 'fullAddress',
      'field_tasks': 'title',
      'rag_status_records': 'ragStatus',
      'tariff_records': 'name',
    };
    
    const displayField = displayFieldMap[tableName] || 'name';
    
    // Build query conditions
    const conditions: any[] = [];
    
    // Add organization isolation if the table has organizationId column
    if ('organizationId' in tableSchema) {
      conditions.push(eq((tableSchema as any).organizationId, organizationId));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Fetch records - use try/catch for ordering since not all tables have id
    let records: any[] = [];
    try {
      records = await db
        .select()
        .from(tableSchema)
        .where(whereClause)
        .limit(Number(limit))
        .orderBy((tableSchema as any).id);
    } catch (orderError) {
      // If ordering by id fails, try without ordering
      records = await db
        .select()
        .from(tableSchema)
        .where(whereClause)
        .limit(Number(limit));
    }
    
    // Format records for dropdown display
    const formattedRecords = records.map((record: any) => {
      let displayValue = record[displayField] || `Record ${record.id || record.ID || 'Unknown'}`;
      
      // Add additional context for specific tables
      if (tableName === 'objectives') {
        displayValue = `${record.title} (${record.status || 'draft'})`;
      } else if (tableName === 'key_results') {
        displayValue = `${record.title} (${record.currentValue || 0}/${record.targetValue || 0})`;
      } else if (tableName === 'profit_centers') {
        displayValue = `${record.name}${record.type ? ` - ${record.type}` : ''}`;
      }
      
      return {
        id: record.id || record.ID,
        displayValue,
        rawData: {
          title: record.title || record.name,
          status: record.status,
          type: record.type,
        }
      };
    });
    
    res.json({ 
      records: formattedRecords,
      tableName,
      count: formattedRecords.length,
    });
  } catch (error: any) {
    console.error('Error fetching table records:', error);
    res.status(500).json({ 
      error: 'Failed to fetch table records',
      message: error.message 
    });
  }
});

export default router;
