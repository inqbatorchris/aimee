import { SplynxService } from './splynxService';
import { db } from '../../db';
import { integrations } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

interface LabelCacheEntry {
  labels: string[];
  timestamp: number;
  organizationId: number;
}

interface SplynxCredentials {
  baseUrl: string;
  authHeader: string;
}

export class SplynxLabelService {
  private static cache: Map<number, LabelCacheEntry> = new Map();
  private static readonly CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
  
  private static decrypt(text: string): string {
    if (!text) return '';
    
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    if (!ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }
    
    try {
      const parts = text.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = parts[1];
      const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }
  
  private static async getSplynxCredentials(organizationId: number): Promise<SplynxCredentials | null> {
    const [splynxIntegration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.organizationId, organizationId),
          eq(integrations.platformType, 'splynx')
        )
      )
      .limit(1);

    if (!splynxIntegration || !splynxIntegration.credentialsEncrypted) {
      return null;
    }

    const credentials = JSON.parse(this.decrypt(splynxIntegration.credentialsEncrypted));
    const { baseUrl, authHeader } = credentials;
    
    if (!baseUrl || !authHeader) {
      return null;
    }
    
    return { baseUrl, authHeader };
  }
  
  private static async fetchAllLabelsFromSplynx(splynxService: SplynxService): Promise<string[]> {
    const uniqueLabels = new Set<string>();
    
    console.log('[SplynxLabelService] Starting full label fetch (up to 50,000 customers)...');
    
    try {
      // Fetch all customers with high limit to capture all labels
      const result = await splynxService.queryEntities({
        entity: 'customers',
        mode: 'list',
        filters: [],
        limit: 50000 // High limit to get all customers and their labels
      });
      
      if (!result.records || result.records.length === 0) {
        console.log('[SplynxLabelService] No customer records returned');
        return [];
      }
      
      // Extract all unique labels
      for (const record of result.records) {
        const labels = record.attributes?.customer_labels || [];
        if (Array.isArray(labels)) {
          for (const labelObj of labels) {
            if (labelObj.label) {
              uniqueLabels.add(labelObj.label);
            }
          }
        }
      }
      
      console.log(`[SplynxLabelService] Processed ${result.records.length} customers, found ${uniqueLabels.size} unique labels`);
    } catch (error: any) {
      console.error('[SplynxLabelService] Error fetching labels:', error.message);
      throw error;
    }
    
    const sortedLabels = Array.from(uniqueLabels).sort();
    console.log(`[SplynxLabelService] Fetch complete. Total labels: ${sortedLabels.length}`);
    
    return sortedLabels;
  }
  
  static async getLabels(organizationId: number): Promise<string[]> {
    // Check cache first
    const cached = this.cache.get(organizationId);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.CACHE_TTL_MS) {
      console.log(`[SplynxLabelService] Returning cached labels for org ${organizationId} (${cached.labels.length} labels)`);
      return cached.labels;
    }
    
    // Cache miss or expired - fetch from Splynx
    console.log(`[SplynxLabelService] Cache ${cached ? 'expired' : 'miss'} for org ${organizationId}, fetching from Splynx...`);
    
    try {
      const credentials = await this.getSplynxCredentials(organizationId);
      
      if (!credentials) {
        console.warn(`[SplynxLabelService] No Splynx credentials found for org ${organizationId}`);
        return [];
      }
      
      const splynxService = new SplynxService(credentials);
      const labels = await this.fetchAllLabelsFromSplynx(splynxService);
      
      // Update cache
      this.cache.set(organizationId, {
        labels,
        timestamp: now,
        organizationId
      });
      
      return labels;
    } catch (error: any) {
      console.error(`[SplynxLabelService] Failed to fetch labels for org ${organizationId}:`, error.message);
      
      // Return stale cache if available
      if (cached) {
        console.log(`[SplynxLabelService] Returning stale cache for org ${organizationId}`);
        return cached.labels;
      }
      
      return [];
    }
  }
  
  static clearCache(organizationId?: number): void {
    if (organizationId !== undefined) {
      this.cache.delete(organizationId);
      console.log(`[SplynxLabelService] Cleared cache for org ${organizationId}`);
    } else {
      this.cache.clear();
      console.log('[SplynxLabelService] Cleared all label cache');
    }
  }
  
  static getCacheStats(): { size: number; entries: Array<{ organizationId: number; labelCount: number; age: string }> } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([orgId, entry]) => ({
      organizationId: orgId,
      labelCount: entry.labels.length,
      age: `${Math.round((now - entry.timestamp) / 1000)}s ago`
    }));
    
    return {
      size: this.cache.size,
      entries
    };
  }
}
