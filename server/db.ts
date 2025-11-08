import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon in Node.js environment
if (typeof globalThis.WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

// Configure Neon for better connection handling
neonConfig.fetchConnectionCache = true;
neonConfig.pipelineConnect = false;
neonConfig.useSecureWebSocket = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with improved configuration for connection stability
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Reduced from 10 for better connection management
  maxUses: 5000, // Reduced from 7500 to prevent connection staleness
  idleTimeoutMillis: 20000, // Reduced from 30000 to close idle connections faster
  connectionTimeoutMillis: 10000, // Increased from 5000 for better reliability
  allowExitOnIdle: true
});

// Add error handling for the pool
pool.on('error', (err) => {
  console.error('Database pool error:', err);
  // Don't crash the process, just log the error
});

pool.on('connect', (client) => {
  console.log('Database client connected');
});

pool.on('acquire', () => {
  console.log('Database client acquired from pool');
});

pool.on('remove', () => {
  console.log('Database client removed from pool');
});

export const db = drizzle({ client: pool, schema });

// Database retry wrapper for transient errors
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if error is retryable (connection termination, timeout, etc.)
      const isRetryable = 
        error.code === '57P01' || // admin shutdown
        error.code === '57P02' || // crash shutdown  
        error.code === '57P03' || // cannot connect now
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.message?.includes('terminating connection') ||
        error.message?.includes('connection terminated');
      
      if (!isRetryable || attempt === maxRetries) {
        console.error(`Database operation failed after ${attempt} attempts:`, error);
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 50;
      console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Add a health check function
export async function checkDatabaseHealth() {
  return withDatabaseRetry(async () => {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } finally {
      client.release();
    }
  }, 2, 50).catch(() => false);
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing database pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing database pool...');
  await pool.end();
  process.exit(0);
});