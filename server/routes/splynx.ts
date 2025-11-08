import { Router } from 'express';
import { storage } from '../storage';
import { authenticateToken } from '../auth';
import { z } from 'zod';
import crypto from 'crypto';
import { GeocodingService } from '../services/geocoding.js';

const router = Router();

// Inline validation schema for Splynx installation
const insertSplynxInstallationSchema = z.object({
  organizationId: z.number(),
  baseUrl: z.string().url(),
  tokenEncrypted: z.string().optional(),
  agents: z.array(z.any()).optional(),
});

// Encryption helpers - REQUIRE stable key for production
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16;

// Check for encryption key and provide clear guidance
if (!ENCRYPTION_KEY) {
  console.error('❌ CRITICAL ERROR: ENCRYPTION_KEY environment variable is not set!');
  console.error('Please set ENCRYPTION_KEY to a stable 32-character string.');
  console.error('Example: ENCRYPTION_KEY=your-32-char-secret-key-here!!');
  console.error('You can generate one with: openssl rand -hex 16');
  
  // Use a fallback key for development ONLY
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Using default development key - DO NOT use in production!');
    // Use a stable default for development only
    const devKey = 'dev-key-do-not-use-in-production';
    process.env.ENCRYPTION_KEY = devKey;
  } else {
    throw new Error('ENCRYPTION_KEY environment variable is required for production');
  }
}

function encrypt(text: string): string {
  if (!text) return '';
  
  try {
    const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

function decrypt(text: string): string {
  if (!text) return '';
  
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
  } catch (error: any) {
    console.error('Decryption failed:', error?.message || 'Unknown error');
    throw new Error('Token decryption failed - the token may be corrupted or the encryption key has changed');
  }
}

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get Splynx installation for organization
router.get('/installation', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const integration = await storage.getIntegration(user.organizationId, 'splynx');
    
    if (!integration) {
      return res.status(404).json({ error: 'No Splynx installation found' });
    }

    // Extract baseUrl from encrypted credentials
    let baseUrl = '';
    if (integration.credentialsEncrypted) {
      try {
        const decrypted = decrypt(integration.credentialsEncrypted);
        const credentials = JSON.parse(decrypted);
        baseUrl = credentials.baseUrl || '';
      } catch (error) {
        console.error('Error decrypting credentials:', error);
      }
    }

    // Fallback to connectionConfig if available
    const config = integration.connectionConfig as any || {};
    if (!baseUrl && config.baseUrl) {
      baseUrl = config.baseUrl;
    }
    
    res.json({
      id: integration.id,
      organizationId: integration.organizationId,
      baseUrl: baseUrl,
      agents: config.agents || [],
      connectionStatus: integration.connectionStatus,
      isEnabled: integration.isEnabled,
      lastTestedAt: integration.lastTestedAt,
      hasToken: !!integration.credentialsEncrypted,
    });
  } catch (error) {
    console.error('Error fetching Splynx installation:', error);
    res.status(500).json({ error: 'Failed to fetch installation' });
  }
});

// Create or update Splynx installation
router.post('/installation', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    // Validate request body
    const validationResult = insertSplynxInstallationSchema.safeParse({
      ...req.body,
      organizationId: user.organizationId,
    });

    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid input data', 
        details: validationResult.error.issues 
      });
    }

    const { baseUrl, tokenEncrypted: rawToken, agents } = validationResult.data;

    // Check if installation exists
    const existing = await storage.getIntegration(user.organizationId, 'splynx');

    // Build connectionConfig
    const connectionConfig = {
      baseUrl,
      agents: agents || [],
    };

    // Handle credentials
    let credentialsEncrypted = existing?.credentialsEncrypted;
    if (rawToken && rawToken.trim() === 'CLEAR_TOKEN') {
      credentialsEncrypted = encrypt('');
    } else if (rawToken && rawToken.trim() !== '') {
      credentialsEncrypted = encrypt(rawToken);
    } else if (!credentialsEncrypted && !existing) {
      return res.status(400).json({ error: 'Authorization header is required for new installations' });
    }

    const integrationData = {
      organizationId: user.organizationId,
      platformType: 'splynx',
      name: 'Splynx',
      connectionConfig,
      credentialsEncrypted,
      connectionStatus: existing?.connectionStatus || 'disconnected',
      isEnabled: existing?.isEnabled || false,
      lastTestedAt: existing?.lastTestedAt,
    };
    
    let integration;
    if (existing) {
      integration = await storage.updateIntegration(existing.id, integrationData);
    } else {
      integration = await storage.createIntegration(integrationData);
    }

    if (!integration) {
      return res.status(500).json({ error: 'Failed to save installation' });
    }

    // Return in expected format
    const config = integration.connectionConfig as any || {};
    res.json({
      id: integration.id,
      organizationId: integration.organizationId,
      baseUrl: config.baseUrl || '',
      agents: config.agents || [],
      connectionStatus: integration.connectionStatus,
      isEnabled: integration.isEnabled,
      lastTestedAt: integration.lastTestedAt,
      hasToken: !!integration.credentialsEncrypted,
    });
  } catch (error) {
    console.error('Error saving Splynx installation:', error);
    res.status(500).json({ error: 'Failed to save installation' });
  }
});

// Test Splynx connection
router.post('/test-connection', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const installation = await storage.getIntegration(user.organizationId, 'splynx');
    
    if (!installation) {
      return res.status(404).json({ error: 'No Splynx installation found' });
    }

    const config = installation.connectionConfig as any || {};
    
    if (!config.baseUrl) {
      return res.status(400).json({ error: 'Missing base URL' });
    }

    if (!installation.credentialsEncrypted) {
      return res.status(400).json({ error: 'No token configured. Please enter a token and save first.' });
    }

    // Decrypt the token for testing
    let rawToken;
    try {
      rawToken = decrypt(installation.credentialsEncrypted);
    } catch (decryptError: any) {
      console.error('Token decryption failed:', decryptError);
      return res.status(400).json({ 
        error: 'Token decryption failed - the encryption key may have changed. Please clear and re-enter your authentication token.',
        requiresClear: true,
        debug: {
          request: {
            url: 'N/A - Token decryption failed',
            method: 'GET',
            headers: {}
          },
          response: {
            status: 0,
            statusText: 'Decryption Error',
            body: `Token decryption failed: ${decryptError?.message || 'Unknown decryption error'}. This usually happens when the server encryption key changes. Clear the token and re-enter it to fix this issue.`
          }
        }
      });
    }
    
    // Use the token exactly as provided (should already be in "Basic ..." format)
    const authHeader = rawToken.trim();

    // Test the connection to Splynx API using the correct admin endpoint
    // Ensure baseUrl doesn't end with slash and construct proper URL
    const cleanBaseUrl = config.baseUrl.replace(/\/+$/, '');
    const testUrl = `${cleanBaseUrl}/admin/api/check?code=code&checkAuth=checkAuth`;
    
    console.log('=== SPLYNX CONNECTION TEST ===');
    console.log('Base URL:', cleanBaseUrl);
    console.log('Full URL:', testUrl);
    console.log('Auth Header (first 30 chars):', authHeader.substring(0, 30) + '...');
    console.log('Headers being sent:', {
      'Authorization': authHeader.substring(0, 30) + '...',
      'Content-Type': 'application/json'
    });
    
    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });

      const isSuccess = response.ok;
      let testError = null;
      let responseText = '';
      
      try {
        responseText = await response.text();
      } catch (e) {
        responseText = 'Could not read response body';
      }
      
      console.log('Response Status:', response.status);
      console.log('Response Status Text:', response.statusText);
      console.log('Response Body:', responseText);
      
      if (!isSuccess) {
        testError = `HTTP ${response.status}: ${response.statusText}${responseText ? ` - ${responseText}` : ''}`;
        console.log('Splynx connection failed:', testError);
      } else {
        console.log('Splynx connection successful');
      }

      // Update installation status
      await storage.updateIntegration(installation.id, {
        connectionStatus: isSuccess ? 'connected' : 'error',
        lastTestedAt: new Date(),
        testResult: testError ? { error: testError } : { success: true },
        isEnabled: isSuccess,
      });

      res.json({
        success: isSuccess,
        status: isSuccess ? 'connected' : 'error',
        message: isSuccess ? 'Connection successful' : 'Connection failed',
        error: testError,
        testedAt: new Date().toISOString(),
        debug: {
          request: {
            url: testUrl,
            method: 'GET',
            headers: {
              'Authorization': authHeader.substring(0, 20) + '...[REDACTED]',
              'Content-Type': 'application/json',
              'User-Agent': 'aimee.works/1.0'
            }
          },
          response: {
            status: response.status,
            statusText: response.statusText,
            body: responseText,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (fetchError: any) {
      const errorMessage = fetchError.message || 'Unknown connection error';
      
      console.log('Fetch error occurred:', errorMessage);
      
      // Update installation status
      await storage.updateIntegration(installation.id, {
        connectionStatus: 'error',
        lastTestedAt: new Date(),
        testResult: { error: errorMessage },
        isEnabled: false,
      });

      res.json({
        success: false,
        status: 'error',
        message: 'Connection failed',
        error: errorMessage,
        testedAt: new Date().toISOString(),
        debug: {
          request: {
            url: testUrl,
            method: 'GET',
            headers: {
              'Authorization': authHeader.substring(0, 20) + '...[REDACTED]',
              'Content-Type': 'application/json',
              'User-Agent': 'aimee.works/1.0'
            }
          },
          response: {
            status: 0,
            statusText: 'Network Error',
            body: errorMessage,
            timestamp: new Date().toISOString()
          }
        }
      });
    }
  } catch (error) {
    console.error('Error testing Splynx connection:', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

// Run agent manually
router.post('/agents/:agentId/run', async (req, res) => {
  try {
    const user = req.user;
    const { agentId } = req.params;
    
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const installation = await storage.getIntegration(user.organizationId, 'splynx');
    
    if (!installation || !installation.isEnabled) {
      return res.status(400).json({ error: 'Splynx integration not enabled' });
    }

    // Find the agent in the agents array
    const config = installation.connectionConfig as any || {};
    const agents = config.agents as any[] || [];
    const agentIndex = agents.findIndex(agent => agent.id === agentId);
    
    if (agentIndex === -1) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = agents[agentIndex];

    if (agent.type === 'leads_counter') {
      // Execute the leads counter agent
      const bearerToken = decrypt(installation.credentialsEncrypted || '');
      
      // Build query parameters for Splynx API
      const params = new URLSearchParams();
      if (agent.filters?.dateFrom) params.append('main_attributes[date_add]', agent.filters.dateFrom);
      if (agent.filters?.status) params.append('main_attributes[status]', agent.filters.status);
      if (agent.filters?.source) params.append('main_attributes[source]', agent.filters.source);
      
      const apiUrl = `${config.baseUrl}/admin/crm/leads?${params.toString()}`;
      
      try {
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Basic ${bearerToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const count = Array.isArray(data) ? data.length : 0;

          // Update the agent's last run info
          agents[agentIndex] = {
            ...agent,
            lastRunAt: new Date().toISOString(),
            lastRunResult: { count, success: true },
            lastRunError: null,
          };

          // Update the installation with new agent data
          const updatedConfig = { ...config, agents };
          await storage.updateIntegration(installation.id, { connectionConfig: updatedConfig });

          // TODO: Update Key Result Task with the collected data
          // This would require implementing the Key Result Task update logic

          res.json({
            success: true,
            agentId,
            count,
            lastRunAt: agents[agentIndex].lastRunAt,
          });
        } else {
          const error = `HTTP ${response.status}: ${response.statusText}`;
          
          // Update agent with error
          agents[agentIndex] = {
            ...agent,
            lastRunAt: new Date().toISOString(),
            lastRunResult: { count: 0, success: false },
            lastRunError: error,
          };

          const updatedConfig = { ...config, agents };
          await storage.updateIntegration(installation.id, { connectionConfig: updatedConfig });

          res.status(400).json({
            success: false,
            error,
            agentId,
            lastRunAt: agents[agentIndex].lastRunAt,
          });
        }
      } catch (fetchError: any) {
        const error = fetchError.message || 'Unknown API error';
        
        // Update agent with error
        agents[agentIndex] = {
          ...agent,
          lastRunAt: new Date().toISOString(),
          lastRunResult: { count: 0, success: false },
          lastRunError: error,
        };

        const updatedConfig = { ...config, agents };
        await storage.updateIntegration(installation.id, { connectionConfig: updatedConfig });

        res.status(500).json({
          success: false,
          error,
          agentId,
          lastRunAt: agents[agentIndex].lastRunAt,
        });
      }
    } else {
      res.status(400).json({ error: 'Unsupported agent type' });
    }
  } catch (error) {
    console.error('Error running Splynx agent:', error);
    res.status(500).json({ error: 'Failed to run agent' });
  }
});

// Update agents configuration
router.put('/agents', async (req, res) => {
  try {
    const user = req.user;
    
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const { agents } = req.body;
    
    if (!Array.isArray(agents)) {
      return res.status(400).json({ error: 'Agents must be an array' });
    }

    const installation = await storage.getIntegration(user.organizationId, 'splynx');
    if (!installation) {
      return res.status(404).json({ error: 'Installation not found' });
    }

    const config = installation.connectionConfig as any || {};
    const updatedConfig = { ...config, agents };
    const updated = await storage.updateIntegration(installation.id, { connectionConfig: updatedConfig });
    
    if (!updated) {
      return res.status(500).json({ error: 'Failed to update agents' });
    }

    const updatedAgents = (updated.connectionConfig as any)?.agents || [];
    res.json({ success: true, agents: updatedAgents });
  } catch (error) {
    console.error('Error updating Splynx agents:', error);
    res.status(500).json({ error: 'Failed to update agents' });
  }
});

// ========================================
// CUSTOMER MAPPING ENDPOINTS
// ========================================

// Sync locations from Splynx
router.post('/locations/sync', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const installation = await storage.getIntegration(user.organizationId, 'splynx');
    if (!installation || !installation.isEnabled) {
      return res.status(400).json({ error: 'Splynx integration not enabled' });
    }

    // Decrypt and parse API credentials
    if (!installation.credentialsEncrypted) {
      return res.status(400).json({ error: 'No credentials configured' });
    }
    const decrypted = decrypt(installation.credentialsEncrypted);
    const credentials = JSON.parse(decrypted);
    
    if (!credentials.baseUrl || !credentials.authHeader) {
      return res.status(400).json({ error: 'Invalid Splynx credentials configuration' });
    }
    
    const baseUrl = credentials.baseUrl.replace(/\/+$/, ''); // Remove trailing slash
    const authHeader = credentials.authHeader;

    // Fetch tariffs/locations from Splynx
    const tariffsUrl = `${baseUrl}/admin/tariffs/internet`;
    const response = await fetch(tariffsUrl, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return res.status(400).json({ error: 'Failed to fetch locations from Splynx' });
    }

    const tariffs = await response.json();
    const synced: any[] = [];

    // Sync each location
    for (const tariff of tariffs) {
      const locationData = {
        organizationId: user.organizationId,
        splynxLocationId: tariff.id.toString(),
        name: tariff.title || tariff.name,
        locationType: 'tariff',
        metadata: {
          price: tariff.price,
          speed_download: tariff.speed_download,
          speed_upload: tariff.speed_upload,
        },
        lastSyncedAt: new Date(),
        isActive: true
      };

      const location = await storage.upsertSplynxLocation(locationData);
      synced.push(location);
    }

    // Log activity
    await storage.logActivity({
      organizationId: user.organizationId,
      userId: user.id,
      actionType: 'agent_action',
      entityType: 'integration',
      entityId: installation.id,
      description: `Synchronized ${synced.length} locations from Splynx`,
      metadata: {
        service: 'customer_mapping',
        action: 'sync_locations',
        count: synced.length
      }
    });

    res.json({
      success: true,
      synced: synced.length,
      locations: synced
    });
  } catch (error) {
    console.error('Error syncing Splynx locations:', error);
    res.status(500).json({ error: 'Failed to sync locations' });
  }
});

// Get synced locations (service areas/tariffs)
router.get('/locations', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const locations = await storage.getSplynxLocations(user.organizationId);
    res.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Get locations from Splynx locations table
router.get('/customer-locations', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    console.log('[CUSTOMER LOCATIONS] Fetching for org:', user.organizationId);

    const installation = await storage.getIntegration(user.organizationId, 'splynx');
    if (!installation || !installation.isEnabled) {
      console.log('[CUSTOMER LOCATIONS] Splynx integration not enabled');
      return res.status(400).json({ error: 'Splynx integration not enabled' });
    }

    if (!installation.credentialsEncrypted) {
      return res.status(400).json({ error: 'No credentials configured' });
    }
    const decrypted = decrypt(installation.credentialsEncrypted);
    const credentials = JSON.parse(decrypted);
    
    if (!credentials.baseUrl || !credentials.authHeader) {
      console.log('[CUSTOMER LOCATIONS] Invalid credentials');
      return res.status(400).json({ error: 'Invalid Splynx credentials configuration' });
    }
    
    const baseUrl = credentials.baseUrl.replace(/\/+$/, '');
    const authHeader = credentials.authHeader;

    // Fetch locations from Splynx locations table
    const locationsUrl = `${baseUrl}/admin/administration/locations`;
    console.log('[CUSTOMER LOCATIONS] 📡 Fetching locations from:', locationsUrl);
    
    const response = await fetch(locationsUrl, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    console.log('[CUSTOMER LOCATIONS] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('[CUSTOMER LOCATIONS] ❌ Error response:', errorText);
      return res.status(400).json({ error: `Failed to fetch locations from Splynx: ${response.status} ${response.statusText}` });
    }

    const locations = await response.json();
    console.log('[CUSTOMER LOCATIONS] ✅ Retrieved locations:', Array.isArray(locations) ? locations.length : 'object');

    // Log first location for debugging
    if (Array.isArray(locations) && locations.length > 0) {
      console.log('[CUSTOMER LOCATIONS] 🔍 Sample location record:');
      console.log(JSON.stringify(locations[0], null, 2));
    }
    
    // Transform to simple id/name format
    const formattedLocations = (Array.isArray(locations) ? locations : []).map((loc: any) => ({
      id: loc.id.toString(),
      name: loc.name || loc.title || `Location ${loc.id}`
    }));

    console.log('[CUSTOMER LOCATIONS] ✅ Returning', formattedLocations.length, 'locations');
    res.json(formattedLocations);
  } catch (error) {
    console.error('[CUSTOMER LOCATIONS] ❌ Exception:', error);
    res.status(500).json({ error: 'Failed to fetch customer locations' });
  }
});

// Customer location search with geocoding (by service area)
router.get('/customers/location-search', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const { locationId, filterType, statusValue } = req.query;
    
    console.log('[CUSTOMER SEARCH] Filter params:', { locationId, filterType, statusValue });

    // Validate based on filter type
    if (filterType === 'customer_status' || filterType === 'lead_status') {
      if (!statusValue) {
        return res.status(400).json({ error: `${filterType === 'customer_status' ? 'Customer' : 'Lead'} status is required` });
      }
    } else if (filterType === 'customer_location' || filterType === 'service_area') {
      if (!locationId) {
        return res.status(400).json({ error: 'Location ID is required' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid filter type. Must be customer_location, service_area, customer_status, or lead_status' });
    }

    const installation = await storage.getIntegration(user.organizationId, 'splynx');
    if (!installation || !installation.isEnabled) {
      return res.status(400).json({ error: 'Splynx integration not enabled' });
    }

    // Decrypt and parse API credentials
    if (!installation.credentialsEncrypted) {
      return res.status(400).json({ error: 'No credentials configured' });
    }
    const decrypted = decrypt(installation.credentialsEncrypted);
    const credentials = JSON.parse(decrypted);
    
    if (!credentials.baseUrl || !credentials.authHeader) {
      return res.status(400).json({ error: 'Invalid Splynx credentials configuration' });
    }
    
    const baseUrl = credentials.baseUrl.replace(/\/+$/, ''); // Remove trailing slash
    const authHeader = credentials.authHeader;

    // Build query based on filter type
    // NOTE: Splynx API requires main_attributes[field] format for filtering
    let customersUrl: string;
    let isLeadsEndpoint = false;
    
    if (filterType === 'customer_location') {
      // Filter by customer's location field using main_attributes
      customersUrl = `${baseUrl}/admin/customers/customer?main_attributes[location_id]=${locationId}`;
      console.log('[CUSTOMER SEARCH] Using customer location filter:', customersUrl);
    } else if (filterType === 'service_area') {
      // Filter by tariff/service area using main_attributes
      customersUrl = `${baseUrl}/admin/customers/customer?main_attributes[tariff_id]=${locationId}`;
      console.log('[CUSTOMER SEARCH] Using service area filter:', customersUrl);
    } else if (filterType === 'customer_status') {
      // Filter by customer status using main_attributes
      customersUrl = `${baseUrl}/admin/customers/customer?main_attributes[status]=${statusValue}`;
      console.log('[CUSTOMER SEARCH] Using customer status filter:', customersUrl);
    } else if (filterType === 'lead_status') {
      // Filter by lead pipeline status - different endpoint, uses direct status param
      customersUrl = `${baseUrl}/admin/crm/leads?main_attributes[status]=${statusValue}`;
      isLeadsEndpoint = true;
      console.log('[CUSTOMER SEARCH] Using lead status filter:', customersUrl);
    } else {
      // This should never happen due to validation above
      return res.status(400).json({ error: 'Invalid filter type' });
    }
    
    const response = await fetch(customersUrl, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return res.status(400).json({ error: 'Failed to fetch customers from Splynx' });
    }

    const customers = await response.json();

    // Initialize geocoding service
    const geocoder = new GeocodingService(user.organizationId);
    await geocoder.initialize();

    // Process customers in batches to prevent connection pool exhaustion
    // Small batch size to limit concurrent DB connections (3 customers × ~4 queries = ~12 connections)
    const BATCH_SIZE = 3;
    const geocodedCustomers: any[] = [];
    const unmappableCustomers: any[] = [];

    // Helper function to process a single customer or lead
    const processCustomer = async (customer: any) => {
      // Handle different field names for leads vs customers
      const isLead = isLeadsEndpoint;
      const customerData = {
        id: customer.id.toString(),
        gps_lat: customer.gps_lat || customer.gps_latitude,
        gps_lng: customer.gps_lng || customer.gps_longitude,
        street1: customer.street_1 || customer.address_street,
        street2: customer.street_2 || customer.address_street_2,
        city: customer.city || customer.address_city,
        zip_code: customer.zip_code || customer.address_zip,
        country: customer.country || customer.address_country,
        location_id: (Array.isArray(locationId) ? locationId[0] : locationId) as string || '0'
      };

      const geocodeResult = await geocoder.geocodeCustomer(customerData);

      // For leads, combine first_name and last_name; for customers use name and surname
      const fullName = isLead 
        ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
        : `${customer.name || ''} ${customer.surname || ''}`.trim();

      return {
        id: customer.id,
        name: fullName || 'Unknown',
        email: customer.email || customer.email_address || '',
        status: customer.status || customer.lead_status || 'unknown',
        address: {
          full: [
            customerData.street1,
            customerData.street2,
            customerData.city,
            customerData.zip_code,
            customerData.country
          ].filter(p => p).join(', '),
          street1: customerData.street1 || '',
          street2: customerData.street2 || '',
          city: customerData.city || '',
          zipCode: customerData.zip_code || '',
          country: customerData.country || ''
        },
        coordinates: {
          lat: geocodeResult.latitude || 0,
          lng: geocodeResult.longitude || 0
        },
        hasCoordinates: geocodeResult.status === 'success',
        geocodeMethod: geocodeResult.method,
        geocodeStatus: geocodeResult.status,
        labels: customer.tags || customer.labels || []
      };
    };

    // Process in batches
    for (let i = 0; i < customers.length; i += BATCH_SIZE) {
      const batch = customers.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(processCustomer));
      
      results.forEach(enrichedCustomer => {
        if (enrichedCustomer.hasCoordinates) {
          geocodedCustomers.push(enrichedCustomer);
        } else {
          unmappableCustomers.push(enrichedCustomer);
        }
      });
    }

    // Log activity
    await storage.logActivity({
      organizationId: user.organizationId,
      userId: user.id,
      actionType: 'agent_action',
      entityType: 'integration',
      entityId: installation.id,
      description: `Customer location search: ${geocodedCustomers.length} mappable, ${unmappableCustomers.length} unmappable`,
      metadata: {
        service: 'customer_mapping',
        action: 'location_search',
        locationId,
        totalCustomers: customers.length,
        mappable: geocodedCustomers.length,
        unmappable: unmappableCustomers.length
      }
    });

    res.json({
      success: true,
      customers: geocodedCustomers,
      unmappable: unmappableCustomers,
      summary: {
        total: customers.length,
        mappable: geocodedCustomers.length,
        unmappable: unmappableCustomers.length,
        hasGps: geocodedCustomers.filter(c => c.geocodeMethod === 'gps').length,
        geocoded: geocodedCustomers.filter(c => c.geocodeMethod === 'google_maps').length
      }
    });
  } catch (error) {
    console.error('Error searching customers by location:', error);
    res.status(500).json({ error: 'Failed to search customers' });
  }
});

// Hardcoded Splynx labels (manually updated by developers)
const SPLYNX_LABELS = [
  { id: "5", title: "1 Month and Less Contract End Date", color: "#808080" },
  { id: "4", title: "3-1 Month Contract End", color: "#808080" },
  { id: "53", title: "ABC Grant", color: "#808080" },
  { id: "38", title: "Annual Payer", color: "#808080" },
  { id: "36", title: "Billingchange", color: "#808080" },
  { id: "63", title: "Bordon - new phase", color: "#808080" },
  { id: "56", title: "Broken cable 20.8", color: "#808080" },
  { id: "48", title: "Build Location Only", color: "#808080" },
  { id: "50", title: "Caerleon - Lodge", color: "#808080" },
  { id: "19", title: "Cancelled Services", color: "#808080" },
  { id: "45", title: "Deactivated due to non-payment", color: "#808080" },
  { id: "43", title: "FOC - Staff", color: "#808080" },
  { id: "41", title: "FOC services", color: "#808080" },
  { id: "42", title: "FOC services - prize winner", color: "#808080" },
  { id: "40", title: "FOC Wayleave / Poles / Hub site etc", color: "#808080" },
  { id: "61", title: "Free til 26'", color: "#808080" },
  { id: "47", title: "FreePeriod", color: "#808080" },
  { id: "51", title: "FTTP Net Lodge 1", color: "#808080" },
  { id: "59", title: "FWA fault 12/09", color: "#808080" },
  { id: "33", title: "Hirwaun pre order", color: "#808080" },
  { id: "55", title: "Legacy Bordon", color: "#808080" },
  { id: "52", title: "Network - L", color: "#808080" },
  { id: "64", title: "No Reminders / Auto-Blocking Enabled", color: "#808080" },
  { id: "28", title: "No_AutoSuspend", color: "#808080" },
  { id: "1", title: "Out of contract", color: "#808080" },
  { id: "62", title: "Outage 1st Oct 25", color: "#808080" },
  { id: "46", title: "Packaged Living", color: "#808080" },
  { id: "60", title: "Pending", color: "#808080" },
  { id: "25", title: "Penywaun Preorder", color: "#808080" },
  { id: "44", title: "Plume swap required", color: "#808080" },
  { id: "21", title: "PPP_NoRecordOFFLINE", color: "#808080" },
  { id: "54", title: "Pro-router customer", color: "#808080" },
  { id: "58", title: "PXC Customer", color: "#808080" },
  { id: "17", title: "Renewal: Customer contacted", color: "#808080" },
  { id: "6", title: "Rolling Contract", color: "#808080" },
  { id: "57", title: "Sent referral", color: "#808080" },
  { id: "65", title: "Test", color: "#808080" },
  { id: "49", title: "Usk - Lady Hill", color: "#808080" },
  { id: "30", title: "Usk preorder", color: "#808080" }
];

// Get customer labels (hardcoded list - manually updated by developers)
router.get('/customer-labels', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    // Return hardcoded label list sorted by title
    const sortedLabels = [...SPLYNX_LABELS].sort((a, b) => a.title.localeCompare(b.title));
    res.json(sortedLabels);
  } catch (error) {
    console.error('Error fetching customer labels:', error);
    res.status(500).json({ error: 'Failed to fetch labels' });
  }
});

// Bulk add labels to customers
router.post('/customers/bulk-labels', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const { customerIds, labelId } = req.body;

    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return res.status(400).json({ error: 'Customer IDs array is required' });
    }

    if (!labelId) {
      return res.status(400).json({ error: 'Label ID is required' });
    }

    const installation = await storage.getIntegration(user.organizationId, 'splynx');
    if (!installation || !installation.isEnabled) {
      return res.status(400).json({ error: 'Splynx integration not enabled' });
    }

    // Decrypt and parse API credentials
    if (!installation.credentialsEncrypted) {
      return res.status(400).json({ error: 'No credentials configured' });
    }
    const decrypted = decrypt(installation.credentialsEncrypted);
    const credentials = JSON.parse(decrypted);
    
    if (!credentials.baseUrl || !credentials.authHeader) {
      return res.status(400).json({ error: 'Invalid Splynx credentials configuration' });
    }
    
    const baseUrl = credentials.baseUrl.replace(/\/+$/, ''); // Remove trailing slash
    const authHeader = credentials.authHeader;

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    // Add label to each customer with rate limiting
    // Note: Label ID must be integer in array format per Splynx API requirements
    const labelIdInt = parseInt(labelId, 10);
    
    for (const customerId of customerIds) {
      try {
        const updateUrl = `${baseUrl}/admin/customers/customer/${customerId}`;
        const response = await fetch(updateUrl, {
          method: 'PUT',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customer_labels: [labelIdInt] // Label ID as integer in array
          })
        });

        if (response.ok) {
          results.success++;
        } else {
          const errorText = await response.text();
          results.failed++;
          results.errors.push({ customerId, error: `Update failed: ${errorText}` });
        }

        // Rate limit: 100ms delay between requests to prevent API throttling
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        results.failed++;
        results.errors.push({ customerId, error: error.message });
      }
    }

    // Log activity
    await storage.logActivity({
      organizationId: user.organizationId,
      userId: user.id,
      actionType: 'bulk_update',
      entityType: 'integration',
      entityId: installation.id,
      description: `Bulk label operation: ${results.success} successful, ${results.failed} failed`,
      metadata: {
        service: 'customer_mapping',
        action: 'bulk_labels',
        labelId,
        totalCustomers: customerIds.length,
        success: results.success,
        failed: results.failed
      }
    });

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error performing bulk label operation:', error);
    res.status(500).json({ error: 'Failed to perform bulk operation' });
  }
});

// TEST ENDPOINT: Inspect customer data structure (small sample)
router.get('/test/customer-structure', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const installation = await storage.getIntegration(user.organizationId, 'splynx');
    if (!installation || !installation.isEnabled) {
      return res.status(400).json({ error: 'Splynx integration not enabled' });
    }

    if (!installation.credentialsEncrypted) {
      return res.status(400).json({ error: 'No credentials configured' });
    }

    const decrypted = decrypt(installation.credentialsEncrypted);
    const credentials = JSON.parse(decrypted);
    
    if (!credentials.baseUrl || !credentials.authHeader) {
      return res.status(400).json({ error: 'Invalid credentials configuration' });
    }

    const baseUrl = credentials.baseUrl.replace(/\/+$/, '');
    
    // Fetch 100 customers to inspect all status values
    const testUrl = `${baseUrl}/admin/customers/customer?limit=100`;
    
    console.log('[TEST] Fetching customer structure from:', testUrl);
    
    const response = await fetch(testUrl, {
      headers: {
        'Authorization': credentials.authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return res.status(400).json({ 
        error: `Splynx API error: ${response.status} ${response.statusText}` 
      });
    }

    const data = await response.json();
    
    // Check response structure
    let customers = Array.isArray(data) ? data : (data.items || data.data || []);
    let responseMetadata = null;
    
    // If response is an object, it might have metadata
    if (!Array.isArray(data)) {
      responseMetadata = {
        hasTotal: 'total' in data,
        hasCount: 'count' in data,
        hasMetadata: 'metadata' in data,
        hasPagination: 'page' in data || 'pagination' in data,
        keys: Object.keys(data)
      };
    }
    
    // Extract unique statuses from the sample
    let statuses: Set<string> = new Set();
    let statusField = 'unknown';
    let sampleCustomer = null;
    
    if (Array.isArray(customers) && customers.length > 0) {
      sampleCustomer = customers[0];
      
      // Check for status field
      customers.forEach((customer: any) => {
        if (customer.status) {
          statuses.add(customer.status);
          statusField = typeof customer.status === 'number' ? 'id' : 'string';
        }
      });
    }

    res.json({
      success: true,
      sampleCount: customers.length,
      sampleCustomer,
      statusInfo: {
        field: statusField,
        uniqueStatuses: Array.from(statuses),
        statusesFound: statuses.size
      },
      responseMetadata,
      note: 'This is a test endpoint to inspect customer data structure. Use the status info to configure filters correctly.'
    });
    
  } catch (error: any) {
    console.error('[TEST] Error inspecting customer structure:', error);
    res.status(500).json({ error: error.message || 'Failed to inspect customer structure' });
  }
});

export default router;