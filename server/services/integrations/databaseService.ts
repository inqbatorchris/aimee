import { Pool as PgPool } from 'pg';
import type { DatabaseConnection } from '@shared/schema';

interface QueryResult {
  rows: any[];
  rowCount: number;
  fields?: any[];
}

interface ConnectionPool {
  query: (sql: string, params?: any[]) => Promise<QueryResult>;
  end: () => Promise<void>;
}

export class DatabaseService {
  private pools: Map<number, ConnectionPool> = new Map();
  private connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  private async getOrCreatePool(): Promise<ConnectionPool> {
    if (this.pools.has(this.connection.id)) {
      return this.pools.get(this.connection.id)!;
    }

    const pool = await this.createPool();
    this.pools.set(this.connection.id, pool);
    return pool;
  }

  private async createPool(): Promise<ConnectionPool> {
    const { databaseType, host, port, database, username, passwordEncrypted, connectionString, poolConfig, schema } = this.connection;

    switch (databaseType) {
      case 'postgresql': {
        const poolSettings = poolConfig ? poolConfig as { min?: number; max?: number } : { min: 2, max: 10 };
        
        // Note: passwordEncrypted should already be decrypted by the routes layer
        // The routes decrypt before passing to this service
        const config: any = connectionString ? {
          connectionString,
          min: poolSettings.min,
          max: poolSettings.max,
        } : {
          host: host || undefined,
          port: port || 5432,
          database: database || undefined,
          user: username || undefined,
          password: passwordEncrypted || undefined, // Already decrypted by routes
          min: poolSettings.min,
          max: poolSettings.max,
        };

        const pgPool = new PgPool(config);

        // Set schema if provided
        if (schema) {
          await pgPool.query(`SET search_path TO ${schema}`);
        }

        return {
          query: async (sql: string, params?: any[]) => {
            const result = await pgPool.query(sql, params);
            return {
              rows: result.rows,
              rowCount: result.rowCount || 0,
              fields: result.fields,
            };
          },
          end: async () => {
            await pgPool.end();
          },
        };
      }

      case 'mysql':
      case 'mariadb': {
        // MySQL support - will require mysql2 package
        throw new Error(`${databaseType} support requires the 'mysql2' package. Please install it first.`);
      }

      case 'sqlite': {
        // SQLite support - will require better-sqlite3 package
        throw new Error('SQLite support requires the \'better-sqlite3\' package. Please install it first.');
      }

      case 'mssql': {
        // MS SQL Server support - will require mssql package
        throw new Error('MS SQL Server support requires the \'mssql\' package. Please install it first.');
      }

      default:
        throw new Error(`Unsupported database type: ${databaseType}`);
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const pool = await this.getOrCreatePool();
      
      let testQuery = 'SELECT 1';
      if (this.connection.databaseType === 'postgresql') {
        testQuery = 'SELECT 1 as test';
      }

      const result = await pool.query(testQuery);
      
      if (result.rows && result.rows.length > 0) {
        return {
          success: true,
          message: `Successfully connected to ${this.connection.databaseType} database '${this.connection.database}'`,
        };
      }

      return {
        success: false,
        message: 'Connection test failed: No response from database',
      };
    } catch (error: any) {
      console.error('[DatabaseService] Connection test failed:', error);
      return {
        success: false,
        message: 'Connection test failed',
        error: error.message,
      };
    }
  }

  async executeQuery(sql: string, params?: any[]): Promise<{
    success: boolean;
    rows?: any[];
    rowCount?: number;
    fields?: any[];
    error?: string;
    executionTime: number;
  }> {
    const startTime = Date.now();

    try {
      // Basic SQL injection prevention - block destructive operations in certain contexts
      const sanitizedSql = sql.trim().toLowerCase();
      const isDangerous = sanitizedSql.startsWith('drop ') || 
                         sanitizedSql.startsWith('truncate ') ||
                         sanitizedSql.includes(';drop ') ||
                         sanitizedSql.includes(';truncate ');

      if (isDangerous) {
        throw new Error('Potentially destructive SQL operations are not allowed through this interface');
      }

      const pool = await this.getOrCreatePool();
      const result = await pool.query(sql, params);
      
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields,
        executionTime,
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.error('[DatabaseService] Query execution failed:', error);
      
      return {
        success: false,
        error: error.message,
        executionTime,
      };
    }
  }

  async getTableList(): Promise<{ success: boolean; tables?: string[]; error?: string }> {
    try {
      let query = '';
      
      switch (this.connection.databaseType) {
        case 'postgresql':
          query = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = '${this.connection.schema || 'public'}'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
          `;
          break;
        
        case 'mysql':
        case 'mariadb':
          query = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = '${this.connection.database}'
            ORDER BY table_name
          `;
          break;
        
        case 'sqlite':
          query = `
            SELECT name as table_name 
            FROM sqlite_master 
            WHERE type='table'
            ORDER BY name
          `;
          break;
        
        default:
          throw new Error(`Table listing not implemented for ${this.connection.databaseType}`);
      }

      const result = await this.executeQuery(query);
      
      if (result.success && result.rows) {
        const tables = result.rows.map(row => row.table_name);
        return { success: true, tables };
      }

      return {
        success: false,
        error: result.error || 'Failed to retrieve table list',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getTableSchema(tableName: string): Promise<{
    success: boolean;
    columns?: Array<{ name: string; type: string; nullable: boolean }>;
    error?: string;
  }> {
    try {
      let query = '';
      
      switch (this.connection.databaseType) {
        case 'postgresql':
          query = `
            SELECT 
              column_name as name,
              data_type as type,
              is_nullable::boolean as nullable
            FROM information_schema.columns
            WHERE table_schema = '${this.connection.schema || 'public'}'
            AND table_name = '${tableName}'
            ORDER BY ordinal_position
          `;
          break;
        
        case 'mysql':
        case 'mariadb':
          query = `
            SELECT 
              column_name as name,
              data_type as type,
              is_nullable = 'YES' as nullable
            FROM information_schema.columns
            WHERE table_schema = '${this.connection.database}'
            AND table_name = '${tableName}'
            ORDER BY ordinal_position
          `;
          break;
        
        default:
          throw new Error(`Schema introspection not implemented for ${this.connection.databaseType}`);
      }

      const result = await this.executeQuery(query);
      
      if (result.success && result.rows) {
        return { success: true, columns: result.rows };
      }

      return {
        success: false,
        error: result.error || 'Failed to retrieve table schema',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async close(): Promise<void> {
    const pool = this.pools.get(this.connection.id);
    if (pool) {
      await pool.end();
      this.pools.delete(this.connection.id);
    }
  }

  static async closeAllPools(): Promise<void> {
    // This would be called during application shutdown
    // Implementation would iterate through all active pools and close them
  }
}
