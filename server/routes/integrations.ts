import { Router } from 'express';
import { storage } from '../storage';
import { authenticateToken } from '../auth';
import { insertIntegrationSchema, insertDatabaseConnectionSchema, type InsertIntegration } from '../../shared/schema';
import { z } from 'zod';
import crypto from 'crypto';
import axios from 'axios';
import { triggerDiscovery } from '../services/integrations/TriggerDiscoveryService';
import { IntegrationCatalogImporter } from '../services/integrations/IntegrationCatalogImporter';
import { DatabaseService } from '../services/integrations/databaseService';

const router = Router();

// Encryption helpers
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16;

// Validate encryption key
if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required. Please set it in Replit Secrets.');
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

// Get all integrations for organization
router.get('/', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const integrations = await storage.getIntegrations(user.organizationId);
    
    // Process integrations to include decrypted baseUrl but not authHeader
    const safeIntegrations = integrations.map((integration) => {
      const { credentialsEncrypted, ...rest } = integration;
      let credentials = null;
      
      // Decrypt credentials to get baseUrl only
      if (credentialsEncrypted) {
        try {
          const decrypted = decrypt(credentialsEncrypted);
          const parsed = JSON.parse(decrypted);
          // Only include baseUrl, not authHeader
          credentials = {
            baseUrl: parsed.baseUrl,
            // Indicate that auth header exists without revealing it
            hasAuthHeader: !!parsed.authHeader
          };
        } catch (error) {
          console.error('Failed to decrypt credentials for integration:', integration.id, error);
        }
      }
      
      return {
        ...rest,
        hasCredentials: !!credentialsEncrypted,
        credentials
      };
    });
    
    res.json(safeIntegrations);
  } catch (error) {
    console.error('Error fetching integrations:', error);
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

// Get specific integration
router.get('/:platformType', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const integration = await storage.getIntegration(user.organizationId, req.params.platformType);
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    // Process integration to include decrypted baseUrl but not authHeader
    const { credentialsEncrypted, ...safeIntegration } = integration;
    let credentials = null;
    
    // Decrypt credentials to get baseUrl only
    if (credentialsEncrypted) {
      try {
        const decrypted = decrypt(credentialsEncrypted);
        const parsed = JSON.parse(decrypted);
        // Only include baseUrl, not authHeader
        credentials = {
          baseUrl: parsed.baseUrl,
          // Indicate that auth header exists without revealing it
          hasAuthHeader: !!parsed.authHeader
        };
      } catch (error) {
        console.error('Failed to decrypt credentials for integration:', integration.id, error);
      }
    }
    
    res.json({
      ...safeIntegration,
      hasCredentials: !!credentialsEncrypted,
      credentials
    });
  } catch (error) {
    console.error('Error fetching integration:', error);
    res.status(500).json({ error: 'Failed to fetch integration' });
  }
});

// Create or update integration
router.post('/', async (req, res) => {
  console.log('POST /api/integrations - Request body:', JSON.stringify(req.body, null, 2));
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const { platformType, name, connectionConfig, credentials } = req.body;
    console.log('Extracted credentials:', credentials);
    
    if (!platformType || !name) {
      return res.status(400).json({ error: 'Platform type and name are required' });
    }

    // Check if integration already exists
    console.log('Checking for existing integration for org:', user.organizationId, 'platform:', platformType);
    const existingIntegration = await storage.getIntegration(user.organizationId, platformType);
    console.log('Existing integration found:', existingIntegration ? 'YES' : 'NO');
    
    // Handle credential encryption
    let credentialsEncrypted = undefined;
    if (credentials) {
      // Check if we should keep existing auth header
      if (credentials.keepExistingAuthHeader && existingIntegration?.credentialsEncrypted) {
        try {
          // Decrypt existing credentials to get the auth header
          const existingDecrypted = decrypt(existingIntegration.credentialsEncrypted);
          const existingCreds = JSON.parse(existingDecrypted);
          
          // Merge new baseUrl with existing authHeader
          const mergedCredentials = {
            baseUrl: credentials.baseUrl,
            authHeader: existingCreds.authHeader // Keep existing auth header
          };
          
          credentialsEncrypted = encrypt(JSON.stringify(mergedCredentials));
        } catch (error) {
          console.error('Failed to merge credentials:', error);
          // Fall back to encrypting without merging
          credentialsEncrypted = encrypt(JSON.stringify(credentials));
        }
      } else {
        // Normal encryption for new credentials
        credentialsEncrypted = encrypt(JSON.stringify(credentials));
      }
    } else if (existingIntegration?.credentialsEncrypted) {
      // Keep existing credentials if not updating
      credentialsEncrypted = existingIntegration.credentialsEncrypted;
    }

    const integrationData: any = {
      organizationId: user.organizationId,
      platformType,
      name,
      connectionConfig: connectionConfig || {},
      credentialsEncrypted,
      connectionStatus: existingIntegration?.connectionStatus || 'disconnected',
      isEnabled: existingIntegration?.isEnabled || false,
    };

    let integration;
    try {
      if (existingIntegration) {
        console.log('Updating existing integration with ID:', existingIntegration.id);
        // If we have credentials, mark as active
        if (credentials) {
          integrationData.connectionStatus = 'active';
          integrationData.testResult = { status: 'Credentials saved successfully' };
        }
        integration = await storage.updateIntegration(existingIntegration.id, integrationData);
        console.log('Update result:', integration);
      } else {
        console.log('Creating new integration with data:', integrationData);
        // If we have credentials, mark as active
        if (credentials) {
          integrationData.connectionStatus = 'active';
          integrationData.testResult = { status: 'Credentials saved successfully' };
        }
        integration = await storage.createIntegration(integrationData);
        console.log('Create result:', integration);
        
        // Import catalog for new Splynx integration
        if (integration && platformType === 'splynx') {
          console.log('Importing Splynx catalog for new integration...');
          const catalogImporter = new IntegrationCatalogImporter(storage);
          const importResult = await catalogImporter.importCatalog(integration);
          console.log(`Imported ${importResult.triggersImported} triggers and ${importResult.actionsImported} actions`);
        }
      }
    } catch (dbError: any) {
      console.error('Database operation failed:', dbError);
      return res.status(500).json({ error: `Database error: ${dbError.message}` });
    }

    if (!integration) {
      console.error('Integration save returned null/undefined');
      return res.status(500).json({ error: 'Failed to save integration' });
    }

    // Log activity for integration save/update
    await storage.logActivity({
      organizationId: user.organizationId,
      userId: user.id,
      actionType: existingIntegration ? 'status_change' : 'creation',
      entityType: 'integration',
      entityId: integration.id,
      description: existingIntegration 
        ? `Updated ${platformType} integration configuration`
        : `Created ${platformType} integration`,
      metadata: {
        platformType,
        name,
        hasCredentials: !!credentials,
        baseUrl: credentials?.baseUrl
      }
    });

    // Return without the encrypted credentials
    const { credentialsEncrypted: _, ...safeIntegration } = integration;
    
    res.json({
      ...safeIntegration,
      hasCredentials: true,
    });
  } catch (error) {
    console.error('Error saving integration:', error);
    res.status(500).json({ error: 'Failed to save integration' });
  }
});

// Update integration by ID (PATCH endpoint)
router.patch('/:id', async (req, res) => {
  console.log('PATCH /api/integrations/:id - Request body:', JSON.stringify(req.body, null, 2));
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const integrationId = parseInt(req.params.id);
    if (isNaN(integrationId)) {
      return res.status(400).json({ error: 'Invalid integration ID' });
    }

    const { credentials, connectionStatus, isEnabled } = req.body;
    
    // Get existing integration to verify ownership
    const existingIntegration = await storage.getIntegrationById(integrationId);
    if (!existingIntegration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    if (existingIntegration.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Handle credential encryption
    let credentialsEncrypted = existingIntegration.credentialsEncrypted;
    if (credentials) {
      credentialsEncrypted = encrypt(JSON.stringify(credentials));
    }

    const updateData: any = {
      credentialsEncrypted,
      connectionStatus: connectionStatus || 'active',
      isEnabled: isEnabled !== undefined ? isEnabled : existingIntegration.isEnabled,
    };

    // If we have credentials, mark as active and successful test
    if (credentials) {
      updateData.connectionStatus = 'active';
      updateData.testResult = { status: 'Credentials saved successfully' };
    }

    const integration = await storage.updateIntegration(integrationId, updateData);

    if (!integration) {
      return res.status(500).json({ error: 'Failed to update integration' });
    }

    // Log activity for integration update
    await storage.logActivity({
      organizationId: user.organizationId,
      userId: user.id,
      actionType: 'status_change',
      entityType: 'integration',
      entityId: integration.id,
      description: `Updated ${existingIntegration.platformType} integration configuration`,
      metadata: {
        platformType: existingIntegration.platformType,
        hasCredentials: !!credentials,
      }
    });

    // Return without the encrypted credentials
    const { credentialsEncrypted: _, ...safeIntegration } = integration;
    
    res.json({
      ...safeIntegration,
      hasCredentials: true,
    });
  } catch (error: any) {
    console.error('Error updating integration:', error);
    res.status(500).json({ error: error.message || 'Failed to update integration' });
  }
});

// Test integration connection
router.post('/:platformType/test', async (req, res) => {
  console.log(`[TEST ENDPOINT] Hit for platform: ${req.params.platformType}`);
  
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      console.log('[TEST ENDPOINT] No user or organization ID');
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }
    
    console.log(`[TEST ENDPOINT] User ${user.id} testing ${req.params.platformType} for org ${user.organizationId}`);

    const integration = await storage.getIntegration(user.organizationId, req.params.platformType);
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    if (!integration.credentialsEncrypted) {
      return res.status(400).json({ error: 'No credentials configured. Please enter credentials and save first.' });
    }

    // Decrypt credentials for testing
    let credentials;
    try {
      console.log('[TEST ENDPOINT] 🔐 DECRYPTION DEBUG:');
      console.log('  ENCRYPTION_KEY defined:', ENCRYPTION_KEY !== undefined);
      console.log('  ENCRYPTION_KEY value:', ENCRYPTION_KEY);
      console.log('  ENCRYPTION_KEY type:', typeof ENCRYPTION_KEY);
      console.log('  process.env.ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY);
      console.log('  Encrypted creds preview:', integration.credentialsEncrypted.substring(0, 50) + '...');
      console.log('  Encrypted creds length:', integration.credentialsEncrypted.length);
      
      const decryptedData = decrypt(integration.credentialsEncrypted);
      credentials = JSON.parse(decryptedData);
      console.log('[TEST ENDPOINT] ✓ Credentials decrypted successfully');
      console.log('[TEST ENDPOINT] Credentials structure:', Object.keys(credentials));
    } catch (decryptError: any) {
      console.error('[TEST ENDPOINT] Credentials decryption failed:', decryptError);
      return res.status(400).json({ 
        error: 'Credentials decryption failed - the encryption key may have changed. Please clear and re-enter your credentials.',
        requiresClear: true,
        debug: {
          error: decryptError.message
        }
      });
    }

    // Test connection based on platform type
    let testResult: any = {};
    let connectionStatus: 'connected' | 'disconnected' | 'error' = 'error';
    let testError: string | null = null;

    switch (req.params.platformType) {
      case 'splynx':
        // Test Splynx connection
        console.log('[SPLYNX TEST] Starting Splynx connection test...');
        
        // Initialize debug info
        let debugInfo: any = {
          request: null,
          response: null
        };
        
        try {
          const baseUrl = credentials.baseUrl;
          const authHeader = credentials.authHeader;
          
          console.log('[SPLYNX TEST] Base URL:', baseUrl);
          console.log('[SPLYNX TEST] Auth header present:', !!authHeader);
          console.log('[SPLYNX TEST] Auth header length:', authHeader?.length);
          
          if (!baseUrl || !authHeader) {
            throw new Error(`Missing ${!baseUrl ? 'base URL' : 'auth header'}`);
          }

          // Ensure no double slashes in the URL
          // Using a simple endpoint that should work with Basic auth
          const testUrl = baseUrl.endsWith('/') 
            ? `${baseUrl}admin/customers/customer?limit=1`
            : `${baseUrl}/admin/customers/customer?limit=1`;
          console.log('[SPLYNX TEST] Test URL:', testUrl);
          
          // Capture request debug info
          debugInfo.request = {
            url: testUrl,
            method: 'GET',
            headers: {
              'Authorization': authHeader.startsWith('Basic ') ? 'Basic [REDACTED]' : '[REDACTED]',
              'Content-Type': 'application/json'
            }
          };
          
          console.log('[SPLYNX TEST] Making axios request...');
          
          // Make test API call to Splynx using axios
          const testResponse = await axios.get(testUrl, {
            headers: {
              'Authorization': authHeader, // Use the auth header directly (it already includes 'Basic ')
              'Content-Type': 'application/json',
            },
            validateStatus: () => true, // Don't throw on non-2xx status
            timeout: 10000 // 10 second timeout
          });
          
          console.log('[SPLYNX TEST] Response received:', {
            status: testResponse.status,
            statusText: testResponse.statusText,
            hasData: !!testResponse.data
          });
          
          // Capture response debug info
          debugInfo.response = {
            status: testResponse.status,
            statusText: testResponse.statusText,
            body: typeof testResponse.data === 'string' ? 
              testResponse.data.substring(0, 500) : 
              JSON.stringify(testResponse.data, null, 2).substring(0, 500)
          };

          if (testResponse.status >= 200 && testResponse.status < 300) {
            connectionStatus = 'connected';
            testResult = {
              ...testResponse.data,
              debug: debugInfo
            };
            console.log('[SPLYNX TEST] Connection successful');
          } else {
            const errorMsg = `HTTP ${testResponse.status}: ${testResponse.statusText || 'Request failed'}`;
            console.log('[SPLYNX TEST] Connection failed:', errorMsg);
            throw new Error(errorMsg);
          }
        } catch (error: any) {
          console.error('[SPLYNX TEST] Error occurred:', {
            message: error.message,
            code: error.code,
            response: error.response?.data,
            stack: error.stack?.split('\n').slice(0, 5).join('\n')
          });
          
          testError = error.message;
          connectionStatus = 'error';
          
          // Add error details to debug info
          if (error.response) {
            debugInfo.response = {
              status: error.response.status,
              statusText: error.response.statusText,
              body: typeof error.response.data === 'string' ? 
                error.response.data.substring(0, 500) : 
                JSON.stringify(error.response.data, null, 2).substring(0, 500),
              error: error.message
            };
          } else if (error.request) {
            debugInfo.response = {
              error: 'No response received',
              details: error.message,
              code: error.code
            };
          } else {
            debugInfo.response = {
              error: error.message,
              code: error.code
            };
          }
          
          testResult = {
            error: testError,
            debug: debugInfo
          };
        }
        break;

      case 'xero':
        // Test Xero connection - will implement after OAuth setup
        testResult = { message: 'Xero test connection not yet implemented' };
        connectionStatus = 'disconnected';
        break;

      case 'outlook':
        // Test Outlook connection - will use Replit connector
        testResult = { message: 'Outlook test connection not yet implemented' };
        connectionStatus = 'disconnected';
        break;

      case 'firebase':
        // Test Firebase connection
        testResult = { message: 'Firebase test connection not yet implemented' };
        connectionStatus = 'disconnected';
        break;

      case 'openai':
        // Test OpenAI connection
        try {
          const apiKey = credentials.apiKey;
          if (!apiKey) {
            throw new Error('Missing API key');
          }

          const testResponse = await axios.get('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            },
            validateStatus: () => true // Don't throw on non-2xx status
          });

          if (testResponse.status >= 200 && testResponse.status < 300) {
            connectionStatus = 'connected';
            testResult = { modelsAvailable: testResponse.data.data.length };
          } else {
            throw new Error(`HTTP ${testResponse.status}: ${testResponse.statusText || 'Request failed'}`);
          }
        } catch (error: any) {
          testError = error.message;
          connectionStatus = 'error';
        }
        break;

      default:
        return res.status(400).json({ error: `Unknown platform type: ${req.params.platformType}` });
    }

    // Update connection status and enable integration if successful
    await storage.updateIntegration(integration.id, {
      connectionStatus,
      isEnabled: connectionStatus === 'connected', // Enable integration when connection succeeds
      lastTestedAt: new Date(),
      testResult: {
        ...testResult,
        error: testError,
      },
    });

    // If connection is successful, populate triggers for this integration
    if (connectionStatus === 'connected') {
      console.log('Connection successful, populating triggers...');
      await triggerDiscovery.discoverAndPopulateTriggers(integration.id, req.params.platformType);
    }

    // Log activity for connection test
    const actionType = req.params.platformType === 'openai' ? 'openai_test' : 'status_change';
    await storage.logActivity({
      organizationId: user.organizationId,
      userId: user.id,
      actionType,
      entityType: 'integration',
      entityId: integration.id,
      description: `Tested ${req.params.platformType} connection: ${connectionStatus}`,
      metadata: {
        platformType: req.params.platformType,
        connectionStatus,
        error: testError,
        success: connectionStatus === 'connected'
      }
    });

    // Prepare the response with debug information
    const response = {
      success: connectionStatus === 'connected',
      connectionStatus,
      error: testError,
      testedAt: new Date().toISOString(),
      debug: testResult?.debug || null,
      message: connectionStatus === 'connected' ? 
        'Connection successful' : 
        testError || 'Connection failed',
      testResult: testResult
    };
    
    console.log('[TEST ENDPOINT] Sending response:', {
      success: response.success,
      connectionStatus: response.connectionStatus,
      hasDebug: !!response.debug,
      error: response.error
    });
    
    res.json(response);
  } catch (error: any) {
    console.error('[TEST ENDPOINT] Fatal error:', error);
    console.error('[TEST ENDPOINT] Stack trace:', error.stack);
    
    // Return detailed error information
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to test integration',
      debug: {
        request: { error: 'Failed before request' },
        response: { 
          error: error.message,
          stack: error.stack?.split('\n').slice(0, 5).join('\n')
        }
      },
      testedAt: new Date().toISOString(),
      message: `Internal error: ${error.message}`
    });
  }
});

// Get integration activity logs
router.get('/:platformType/activities', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const integration = await storage.getIntegration(user.organizationId, req.params.platformType);
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Get activity logs for this integration
    const activities = await storage.getActivityLogs(user.organizationId, {
      entityType: 'integration',
      limit: 100
    });

    // Filter for this specific integration
    const integrationActivities = activities.filter(a => a.entityId === integration.id);

    res.json(integrationActivities);
  } catch (error) {
    console.error('Error fetching integration activities:', error);
    res.status(500).json({ error: 'Failed to fetch integration activities' });
  }
});

// Delete integration
router.delete('/:platformType', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const integration = await storage.getIntegration(user.organizationId, req.params.platformType);
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    await storage.deleteIntegration(integration.id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting integration:', error);
    res.status(500).json({ error: 'Failed to delete integration' });
  }
});

// ========================================
// DATABASE CONNECTION ROUTES
// ========================================

// Get database connections for an integration
router.get('/:integrationId/databases', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const integrationId = parseInt(req.params.integrationId);
    
    // Verify integration belongs to user's organization
    const integration = await storage.getIntegrationById(integrationId);
    if (!integration || integration.organizationId !== user.organizationId) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    const connections = await storage.getDatabaseConnections(integrationId);
    
    // Don't send passwords to frontend
    const safeConnections = connections.map(conn => {
      const { passwordEncrypted, ...safe } = conn;
      return {
        ...safe,
        hasPassword: !!passwordEncrypted,
      };
    });
    
    res.json(safeConnections);
  } catch (error) {
    console.error('Error fetching database connections:', error);
    res.status(500).json({ error: 'Failed to fetch database connections' });
  }
});

// Create database connection
router.post('/:integrationId/databases', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const integrationId = parseInt(req.params.integrationId);
    
    // Verify integration belongs to user's organization
    const integration = await storage.getIntegrationById(integrationId);
    if (!integration || integration.organizationId !== user.organizationId) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    // Validate request body - force organizationId to match user's org
    const validatedData = insertDatabaseConnectionSchema.parse({
      ...req.body,
      integrationId,
      organizationId: user.organizationId, // Always use authenticated user's org
    });

    // Encrypt password if provided
    if (validatedData.passwordEncrypted && validatedData.passwordEncrypted.length > 0) {
      validatedData.passwordEncrypted = encrypt(validatedData.passwordEncrypted);
    }

    const connection = await storage.createDatabaseConnection(validatedData);
    
    const { passwordEncrypted, ...safeConnection } = connection;
    res.json({
      ...safeConnection,
      hasPassword: !!passwordEncrypted,
    });
  } catch (error: any) {
    console.error('Error creating database connection:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create database connection' });
  }
});

// Update database connection
router.patch('/databases/:connectionId', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const connectionId = parseInt(req.params.connectionId);
    const connection = await storage.getDatabaseConnection(connectionId);
    
    if (!connection || connection.organizationId !== user.organizationId) {
      return res.status(404).json({ error: 'Database connection not found' });
    }

    // Only allow updating specific fields - prevent changing integrationId, organizationId
    const allowedFields = [
      'displayName', 'databaseType', 'host', 'port', 'database', 
      'username', 'passwordEncrypted', 'schema', 'connectionString', 
      'sslConfig', 'poolConfig'
    ];
    
    const updates: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    
    // Encrypt password if provided
    if (updates.passwordEncrypted && updates.passwordEncrypted.length > 0) {
      updates.passwordEncrypted = encrypt(updates.passwordEncrypted);
    }

    const updated = await storage.updateDatabaseConnection(connectionId, updates);
    
    const { passwordEncrypted, ...safeConnection } = updated;
    res.json({
      ...safeConnection,
      hasPassword: !!passwordEncrypted,
    });
  } catch (error) {
    console.error('Error updating database connection:', error);
    res.status(500).json({ error: 'Failed to update database connection' });
  }
});

// Test database connection
router.post('/databases/:connectionId/test', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const connectionId = parseInt(req.params.connectionId);
    const connection = await storage.getDatabaseConnection(connectionId);
    
    if (!connection || connection.organizationId !== user.organizationId) {
      return res.status(404).json({ error: 'Database connection not found' });
    }

    // Decrypt password
    const decryptedConnection = {
      ...connection,
      passwordEncrypted: connection.passwordEncrypted ? decrypt(connection.passwordEncrypted) : null,
    };

    const dbService = new DatabaseService(decryptedConnection);
    const testResult = await dbService.testConnection();
    
    // Update connection status
    await storage.updateDatabaseConnection(connectionId, {
      connectionStatus: testResult.success ? 'connected' : 'failed',
      lastTestedAt: new Date(),
      lastTestError: testResult.error || null,
    });

    res.json(testResult);
  } catch (error: any) {
    console.error('Error testing database connection:', error);
    res.status(500).json({
      success: false,
      message: 'Connection test failed',
      error: error.message,
    });
  }
});

// Execute query on database connection
router.post('/databases/:connectionId/query', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const connectionId = parseInt(req.params.connectionId);
    const { sql, params } = req.body;

    if (!sql) {
      return res.status(400).json({ error: 'SQL query is required' });
    }

    const connection = await storage.getDatabaseConnection(connectionId);
    
    if (!connection || connection.organizationId !== user.organizationId) {
      return res.status(404).json({ error: 'Database connection not found' });
    }

    // Decrypt password
    const decryptedConnection = {
      ...connection,
      passwordEncrypted: connection.passwordEncrypted ? decrypt(connection.passwordEncrypted) : null,
    };

    const dbService = new DatabaseService(decryptedConnection);
    const result = await dbService.executeQuery(sql, params);
    
    // Log the query execution
    await storage.logSqlAudit({
      organizationId: user.organizationId,
      query: sql,
      parameters: params ? JSON.stringify(params) : null,
      executionTime: result.executionTime,
      rowCount: result.rowCount || 0,
      success: result.success,
      error: result.error || null,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error executing query:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      executionTime: 0,
    });
  }
});

// Get table list from database
router.get('/databases/:connectionId/tables', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const connectionId = parseInt(req.params.connectionId);
    const connection = await storage.getDatabaseConnection(connectionId);
    
    if (!connection || connection.organizationId !== user.organizationId) {
      return res.status(404).json({ error: 'Database connection not found' });
    }

    // Decrypt password
    const decryptedConnection = {
      ...connection,
      passwordEncrypted: connection.passwordEncrypted ? decrypt(connection.passwordEncrypted) : null,
    };

    const dbService = new DatabaseService(decryptedConnection);
    const result = await dbService.getTableList();
    
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching table list:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get table schema
router.get('/databases/:connectionId/tables/:tableName/schema', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const connectionId = parseInt(req.params.connectionId);
    const { tableName } = req.params;
    
    const connection = await storage.getDatabaseConnection(connectionId);
    
    if (!connection || connection.organizationId !== user.organizationId) {
      return res.status(404).json({ error: 'Database connection not found' });
    }

    // Decrypt password
    const decryptedConnection = {
      ...connection,
      passwordEncrypted: connection.passwordEncrypted ? decrypt(connection.passwordEncrypted) : null,
    };

    const dbService = new DatabaseService(decryptedConnection);
    const result = await dbService.getTableSchema(tableName);
    
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching table schema:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Delete database connection
router.delete('/databases/:connectionId', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const connectionId = parseInt(req.params.connectionId);
    const connection = await storage.getDatabaseConnection(connectionId);
    
    if (!connection || connection.organizationId !== user.organizationId) {
      return res.status(404).json({ error: 'Database connection not found' });
    }

    await storage.deleteDatabaseConnection(connectionId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting database connection:', error);
    res.status(500).json({ error: 'Failed to delete database connection' });
  }
});

// Import action catalog for an integration
router.post('/:id/import-catalog', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const integrationId = parseInt(req.params.id);
    
    // Verify integration belongs to user's organization
    const integration = await storage.getIntegrationById(integrationId);
    if (!integration || integration.organizationId !== user.organizationId) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    const importer = new IntegrationCatalogImporter(storage);
    const result = await importer.importCatalog(integration);
    
    res.json(result);
  } catch (error: any) {
    console.error('Error importing catalog:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// GOOGLE MAPS INTEGRATION SETUP
// ========================================

// Set up or update Google Maps integration
router.post('/google-maps/setup', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const { apiKey } = req.body;
    
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return res.status(400).json({ error: 'Google Maps API key is required' });
    }

    // Check if Google Maps integration already exists
    const existingIntegration = await storage.getIntegration(user.organizationId, 'google_maps');
    
    // Encrypt the API key
    const credentials = { apiKey: apiKey.trim() };
    const credentialsEncrypted = encrypt(JSON.stringify(credentials));

    const integrationData: any = {
      organizationId: user.organizationId,
      platformType: 'google_maps',
      name: 'Google Maps Geocoding',
      connectionConfig: {
        service: 'geocoding',
        enabled: true
      },
      credentialsEncrypted,
      connectionStatus: 'active',
      isEnabled: true,
      testResult: { status: 'API key saved successfully' }
    };

    let integration;
    if (existingIntegration) {
      integration = await storage.updateIntegration(existingIntegration.id, integrationData);
    } else {
      integration = await storage.createIntegration(integrationData);
    }

    if (!integration) {
      return res.status(500).json({ error: 'Failed to create or update integration' });
    }

    // Log activity
    await storage.logActivity({
      organizationId: user.organizationId,
      userId: user.id,
      actionType: existingIntegration ? 'status_change' : 'creation',
      entityType: 'integration',
      entityId: integration.id,
      description: existingIntegration 
        ? 'Updated Google Maps integration API key'
        : 'Set up Google Maps integration for geocoding',
      metadata: {
        platformType: 'google_maps',
        service: 'geocoding'
      }
    });

    res.json({
      success: true,
      message: 'Google Maps integration configured successfully',
      integration: {
        id: integration.id,
        platformType: integration.platformType,
        name: integration.name,
        connectionStatus: integration.connectionStatus,
        isEnabled: integration.isEnabled
      }
    });
  } catch (error) {
    console.error('Error setting up Google Maps integration:', error);
    res.status(500).json({ error: 'Failed to set up Google Maps integration' });
  }
});

// Test Google Maps connection
router.post('/google-maps/test', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const integration = await storage.getIntegration(user.organizationId, 'google_maps');
    
    if (!integration || !integration.credentialsEncrypted) {
      return res.status(400).json({ error: 'Google Maps integration not configured' });
    }

    // Decrypt the API key
    let apiKey: string;
    try {
      const decrypted = decrypt(integration.credentialsEncrypted);
      const parsed = JSON.parse(decrypted);
      apiKey = parsed.apiKey;
    } catch (decryptError) {
      return res.status(400).json({ 
        error: 'Failed to decrypt API key. Please reconfigure the integration.' 
      });
    }

    // Test the API key with a simple geocoding request
    const testAddress = '1600 Amphitheatre Parkway, Mountain View, CA';
    const testUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(testAddress)}&key=${apiKey}`;
    
    try {
      const response = await fetch(testUrl);
      const data = await response.json();
      
      if (data.status === 'OK') {
        // Update integration status
        await storage.updateIntegration(integration.id, {
          connectionStatus: 'connected',
          lastTestedAt: new Date(),
          testResult: { 
            status: 'Connection successful',
            message: 'Successfully geocoded test address'
          }
        });

        // Log activity
        await storage.logActivity({
          organizationId: user.organizationId,
          userId: user.id,
          actionType: 'agent_action',
          entityType: 'integration',
          entityId: integration.id,
          description: 'Google Maps connection test successful',
          metadata: {
            testAddress,
            status: data.status
          }
        });

        res.json({
          success: true,
          status: 'connected',
          message: 'Google Maps API connection successful'
        });
      } else {
        // API key might be invalid or quota exceeded
        await storage.updateIntegration(integration.id, {
          connectionStatus: 'error',
          lastTestedAt: new Date(),
          testResult: { 
            status: 'Connection failed',
            error: data.error_message || data.status
          }
        });

        res.json({
          success: false,
          status: 'error',
          message: data.error_message || `Geocoding failed: ${data.status}`
        });
      }
    } catch (fetchError: any) {
      res.status(500).json({
        success: false,
        status: 'error',
        message: fetchError.message || 'Failed to test Google Maps connection'
      });
    }
  } catch (error) {
    console.error('Error testing Google Maps connection:', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

// OpenAI-specific routes
router.get('/openai', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    // Get OpenAI integration
    const integration = await storage.getIntegration(user.organizationId, 'openai');
    
    if (!integration) {
      return res.status(404).json({ error: 'OpenAI integration not configured' });
    }

    // Return integration without exposing encrypted credentials
    res.json({
      ...integration,
      hasCredentials: !!integration.credentialsEncrypted,
      credentialsEncrypted: undefined // Don't send encrypted data
    });
  } catch (error) {
    console.error('Error fetching OpenAI integration:', error);
    res.status(500).json({ error: 'Failed to fetch OpenAI integration' });
  }
});

router.post('/openai', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const { apiKey } = req.body;
    
    if (!apiKey || !apiKey.startsWith('sk-')) {
      return res.status(400).json({ error: 'Valid OpenAI API key is required' });
    }

    // Check if OpenAI integration already exists
    const existingIntegration = await storage.getIntegration(user.organizationId, 'openai');
    
    // Encrypt the API key
    const credentialsEncrypted = encrypt(JSON.stringify({ apiKey }));

    let integration;
    if (existingIntegration) {
      // Update existing integration
      integration = await storage.updateIntegration(existingIntegration.id, {
        credentialsEncrypted,
        connectionStatus: 'disconnected',
        isEnabled: true,
      });
    } else {
      // Create new integration
      const integrationData: InsertIntegration = {
        organizationId: user.organizationId,
        platformType: 'openai',
        name: 'OpenAI',
        connectionConfig: {},
        credentialsEncrypted,
        connectionStatus: 'disconnected',
        isEnabled: true,
      };
      integration = await storage.createIntegration(integrationData);
    }

    res.json({
      ...integration,
      hasCredentials: true,
      credentialsEncrypted: undefined // Don't send encrypted data back
    });
  } catch (error) {
    console.error('Error saving OpenAI API key:', error);
    res.status(500).json({ error: 'Failed to save OpenAI API key' });
  }
});

router.post('/openai/test', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    // Get OpenAI integration
    const integration = await storage.getIntegration(user.organizationId, 'openai');
    
    if (!integration || !integration.credentialsEncrypted) {
      return res.status(404).json({ error: 'OpenAI integration not configured' });
    }

    // Decrypt credentials
    const decrypted = decrypt(integration.credentialsEncrypted);
    const { apiKey } = JSON.parse(decrypted);

    // Test the API key with a simple request
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      // Update integration status
      await storage.updateIntegration(integration.id, {
        connectionStatus: 'connected',
        lastTestedAt: new Date(),
        testResult: { success: true, message: 'Connection successful' }
      });

      res.json({
        success: true,
        status: 'connected',
        message: 'OpenAI connection successful'
      });
    } catch (testError: any) {
      // Update integration with error
      await storage.updateIntegration(integration.id, {
        connectionStatus: 'failed',
        lastTestedAt: new Date(),
        testResult: { 
          success: false, 
          error: testError.response?.data?.error?.message || testError.message 
        }
      });

      res.status(400).json({
        success: false,
        status: 'failed',
        message: testError.response?.data?.error?.message || 'Failed to connect to OpenAI'
      });
    }
  } catch (error: any) {
    console.error('Error testing OpenAI connection:', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

// Get Splynx entity schema metadata
router.get('/splynx/schema/:entity?', async (req, res) => {
  try {
    const { entity } = req.params;
    
    // Define field schemas for each Splynx entity
    const schemas = {
      customers: {
        entity: 'customers',
        label: 'Customers',
        fields: [
          // Basic Identification
          { name: 'id', label: 'Customer ID', type: 'number', operators: ['equals', 'not_equals', 'greater_than', 'less_than'] },
          { name: 'login', label: 'Login', type: 'string', operators: ['equals', 'not_equals', 'contains'] },
          { name: 'name', label: 'Name', type: 'string', operators: ['equals', 'not_equals', 'contains'] },
          
          // Contact Information
          { name: 'email', label: 'Email', type: 'string', operators: ['equals', 'not_equals', 'contains'] },
          { name: 'billing_email', label: 'Billing Email', type: 'string', operators: ['equals', 'not_equals', 'contains'] },
          { name: 'phone', label: 'Phone', type: 'string', operators: ['equals', 'contains'] },
          
          // Status & Category
          { name: 'status', label: 'Status', type: 'string', operators: ['equals', 'not_equals'], options: ['new', 'active', 'inactive', 'blocked', 'disabled'] },
          { name: 'category', label: 'Category', type: 'string', operators: ['equals', 'not_equals'], options: ['individual', 'business'] },
          
          // Relationships
          { name: 'partner_id', label: 'Partner ID', type: 'number', operators: ['equals', 'not_equals', 'is_null', 'not_null'] },
          { name: 'location_id', label: 'Location ID', type: 'number', operators: ['equals', 'not_equals'] },
          
          // Dates
          { name: 'date_add', label: 'Date Added', type: 'date', operators: ['equals', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal'] },
          { name: 'date_of_birth', label: 'Date of Birth', type: 'date', operators: ['equals', 'greater_than', 'less_than'] },
          
          // Address Fields
          { name: 'street_1', label: 'Street 1', type: 'string', operators: ['contains'] },
          { name: 'street_2', label: 'Street 2', type: 'string', operators: ['contains'] },
          { name: 'city', label: 'City', type: 'string', operators: ['equals', 'contains'] },
          { name: 'zip_code', label: 'ZIP Code', type: 'string', operators: ['equals', 'contains'] },
          
          // Additional Fields
          { name: 'identification', label: 'Identification Number', type: 'string', operators: ['equals', 'contains'] },
          { name: 'geo_data', label: 'Geo Coordinates', type: 'string', operators: ['contains'] },
          { name: 'added_by', label: 'Added By', type: 'string', operators: ['equals', 'contains'] },
          
          // Labels (Customer Tags)
          { name: 'labels', label: 'Customer Labels', type: 'string', operators: ['contains'] }
        ],
        dateField: 'date_add'
      },
      leads: {
        entity: 'leads',
        label: 'Leads',
        fields: [
          { name: 'id', label: 'Lead ID', type: 'number', operators: ['equals', 'not_equals', 'greater_than', 'less_than'] },
          { name: 'name', label: 'Name', type: 'string', operators: ['equals', 'not_equals', 'contains'] },
          { name: 'email', label: 'Email', type: 'string', operators: ['equals', 'not_equals', 'contains'] },
          { name: 'phone', label: 'Phone', type: 'string', operators: ['equals', 'contains'] },
          { name: 'status', label: 'Status', type: 'string', operators: ['equals', 'not_equals'], options: ['new', 'in_progress', 'qualified', 'converted', 'lost'] },
          { name: 'source', label: 'Source', type: 'string', operators: ['equals', 'contains'] },
          { name: 'date_add', label: 'Date Added', type: 'date', operators: ['equals', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal'] }
        ],
        dateField: 'date_add'
      },
      support_tickets: {
        entity: 'support_tickets',
        label: 'Support Tickets',
        fields: [
          { name: 'id', label: 'Ticket ID', type: 'number', operators: ['equals', 'not_equals', 'greater_than', 'less_than'] },
          { name: 'subject', label: 'Subject', type: 'string', operators: ['equals', 'contains'] },
          { name: 'description', label: 'Description', type: 'string', operators: ['contains'] },
          { name: 'status', label: 'Status', type: 'string', operators: ['equals', 'not_equals'], options: ['open', 'pending', 'solved', 'closed'] },
          { name: 'priority', label: 'Priority', type: 'string', operators: ['equals'], options: ['low', 'normal', 'high', 'critical'] },
          { name: 'customer_id', label: 'Customer ID', type: 'number', operators: ['equals', 'not_equals'] },
          { name: 'date_created', label: 'Date Created', type: 'date', operators: ['equals', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal'] }
        ],
        dateField: 'date_created'
      },
      scheduling_tasks: {
        entity: 'scheduling_tasks',
        label: 'Scheduling Tasks',
        fields: [
          { name: 'id', label: 'Task ID', type: 'number', operators: ['equals', 'not_equals', 'greater_than', 'less_than'] },
          { name: 'subject', label: 'Subject', type: 'string', operators: ['equals', 'contains'] },
          { name: 'description', label: 'Description', type: 'string', operators: ['contains'] },
          { name: 'status', label: 'Status', type: 'string', operators: ['equals', 'not_equals'], options: ['new', 'in_progress', 'done', 'postponed', 'canceled'] },
          { name: 'assigned_id', label: 'Assigned To (Admin ID)', type: 'number', operators: ['equals', 'not_equals'] },
          { name: 'customer_id', label: 'Customer ID', type: 'number', operators: ['equals', 'not_equals'] },
          { name: 'date', label: 'Task Date', type: 'date', operators: ['equals', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal'] },
          { name: 'time_from', label: 'Start Time', type: 'time', operators: ['equals', 'greater_than', 'less_than'] },
          { name: 'time_to', label: 'End Time', type: 'time', operators: ['equals', 'greater_than', 'less_than'] }
        ],
        dateField: 'date'
      }
    };
    
    // If specific entity requested, return only that schema
    if (entity) {
      const schema = schemas[entity as keyof typeof schemas];
      if (!schema) {
        return res.status(404).json({ error: `Unknown entity: ${entity}` });
      }
      return res.json(schema);
    }
    
    // Return all schemas
    res.json(schemas);
  } catch (error: any) {
    console.error('Error fetching Splynx schema:', error);
    res.status(500).json({ error: 'Failed to fetch schema' });
  }
});

// TEST ENDPOINT: Fetch a sample customer to show labels field format
router.get('/splynx/test-customer', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const integration = await storage.getIntegration(user.organizationId, 'splynx');
    if (!integration) {
      return res.status(404).json({ error: 'Splynx integration not found' });
    }

    // Decrypt credentials
    let credentials = null;
    if (integration.credentialsEncrypted) {
      try {
        const decrypted = decrypt(integration.credentialsEncrypted);
        credentials = JSON.parse(decrypted);
      } catch (error) {
        return res.status(500).json({ error: 'Failed to decrypt credentials' });
      }
    }

    if (!credentials) {
      return res.status(404).json({ error: 'No credentials found for Splynx integration' });
    }

    const SplynxService = (await import('../services/integrations/splynxService.js')).SplynxService;
    const service = new SplynxService(credentials);

    // Fetch first 5 customers
    const result = await service.queryEntities({
      entity: 'customers',
      mode: 'list',
      filters: [],
      limit: 5
    });

    res.json({
      count: result.count,
      customers: result.records,
      message: 'Showing first 5 customers with all fields including labels'
    });
  } catch (error: any) {
    console.error('Error fetching test customer:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;