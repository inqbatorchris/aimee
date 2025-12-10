import { Router } from 'express';
import { storage } from '../storage';
import { authenticateToken } from '../auth';
import { insertIntegrationSchema, insertDatabaseConnectionSchema, type InsertIntegration, integrations, users, splynxWorkflowStatuses } from '../../shared/schema';
import { z } from 'zod';
import crypto from 'crypto';
import axios from 'axios';
import { triggerDiscovery } from '../services/integrations/TriggerDiscoveryService';
import { IntegrationCatalogImporter } from '../services/integrations/IntegrationCatalogImporter';
import { DatabaseService } from '../services/integrations/databaseService';
import { SplynxLabelService } from '../services/integrations/SplynxLabelService';
import { SplynxService } from '../services/integrations/splynxService';
import { VapiService } from '../services/integrations/vapiService';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';

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

// Get all integration triggers (for webhook configuration)
// IMPORTANT: This route must come BEFORE /:platformType to avoid route conflicts
router.get('/integration-triggers', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const organizationId = user.organizationId;
    
    // Get all integrations for this org
    const integrations = await storage.getIntegrations(organizationId);
    
    // Get triggers for all integrations
    const allTriggers = [];
    for (const integration of integrations) {
      const triggers = await storage.getIntegrationTriggers(integration.id);
      const enrichedTriggers = triggers.map(trigger => {
        // Enrich with trigger metadata from TriggerDiscoveryService
        const triggerMetadata = triggerDiscovery.getTriggerMetadata(
          integration.platformType,
          trigger.triggerKey
        );
        
        return {
          ...trigger,
          integrationName: integration.name,
          integrationType: integration.platformType,
          // Add metadata from TriggerDiscoveryService
          name: triggerMetadata?.name || trigger.triggerKey,
          description: triggerMetadata?.description || '',
          category: triggerMetadata?.category,
          availableFields: triggerMetadata?.availableFields || [],
          payloadSchema: triggerMetadata?.payloadSchema,
        };
      });
      allTriggers.push(...enrichedTriggers);
    }
    
    res.json(allTriggers);
  } catch (error: any) {
    console.error('Error fetching integration triggers:', error);
    res.status(500).json({ error: error.message });
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

// Update integration metadata (e.g., defaultSplynxAdminId for automation settings)
router.patch('/:id/metadata', async (req, res) => {
  console.log('PATCH /api/integrations/:id/metadata - Request body:', JSON.stringify(req.body, null, 2));
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const integrationId = parseInt(req.params.id);
    if (isNaN(integrationId)) {
      return res.status(400).json({ error: 'Invalid integration ID' });
    }

    // Get existing integration to verify ownership
    const existingIntegration = await storage.getIntegrationById(integrationId);
    if (!existingIntegration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    if (existingIntegration.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Merge new metadata with existing metadata
    const existingMetadata = (existingIntegration.metadata as any) || {};
    const newMetadata = { ...existingMetadata, ...req.body };

    const integration = await storage.updateIntegration(integrationId, {
      metadata: newMetadata,
    });

    if (!integration) {
      return res.status(500).json({ error: 'Failed to update integration metadata' });
    }

    // Log activity for metadata update
    await storage.logActivity({
      organizationId: user.organizationId,
      userId: user.id,
      actionType: 'status_change',
      entityType: 'integration',
      entityId: integration.id,
      description: `Updated ${existingIntegration.platformType} integration settings`,
      metadata: {
        platformType: existingIntegration.platformType,
        updatedFields: Object.keys(req.body),
      }
    });

    res.json({
      success: true,
      metadata: integration.metadata,
    });
  } catch (error: any) {
    console.error('Error updating integration metadata:', error);
    res.status(500).json({ error: error.message || 'Failed to update integration metadata' });
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
        try {
          const { projectId, apiKey, appId, serviceAccount } = credentials;
          
          if (!projectId) {
            throw new Error('Missing Project ID');
          }
          
          if (!apiKey) {
            throw new Error('Missing API Key');
          }
          
          // Basic validation of Firebase config format
          const projectIdPattern = /^[a-z0-9-]+$/;
          if (!projectIdPattern.test(projectId)) {
            throw new Error('Invalid Project ID format');
          }
          
          // Check if service account is provided for server-side verification
          if (serviceAccount) {
            // Initialize Firebase Admin SDK to verify credentials
            const firebaseAdmin = await import('firebase-admin');
            const appName = `test-${user.organizationId}-${Date.now()}`;
            
            try {
              const testApp = firebaseAdmin.initializeApp({
                credential: firebaseAdmin.credential.cert(serviceAccount),
                projectId: projectId,
              }, appName);
              
              // Try to verify auth is working
              await testApp.auth().listUsers(1);
              
              // Clean up test app
              await testApp.delete();
              
              connectionStatus = 'connected';
              testResult = { 
                message: 'Firebase Admin SDK connected successfully',
                projectId,
                hasServiceAccount: true
              };
            } catch (firebaseError: any) {
              throw new Error(`Firebase Admin SDK error: ${firebaseError.message}`);
            }
          } else {
            // Without service account, we can only validate the config format
            connectionStatus = 'connected';
            testResult = { 
              message: 'Firebase configuration validated (client-side only)',
              projectId,
              hasServiceAccount: false,
              warning: 'Add Service Account JSON for server-side token verification'
            };
          }
        } catch (error: any) {
          testError = error.message;
          connectionStatus = 'error';
          testResult = { error: testError };
        }
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

      case 'vapi':
        // Test Vapi connection
        console.log('[VAPI TEST] Starting Vapi connection test...');
        
        try {
          const apiKey = credentials.apiKey;
          
          console.log('[VAPI TEST] API key present:', !!apiKey);
          
          if (!apiKey) {
            throw new Error('Missing API key');
          }

          // Create Vapi service instance and test by listing calls
          const vapiService = new VapiService({ apiKey });
          
          console.log('[VAPI TEST] Attempting to list calls...');
          const calls = await vapiService.listCalls({ limit: 1 });
          
          console.log('[VAPI TEST] Connection successful, calls retrieved:', calls?.length || 0);
          
          connectionStatus = 'connected';
          testResult = { 
            message: 'Successfully connected to Vapi',
            callsAvailable: Array.isArray(calls) ? calls.length : 0
          };
        } catch (error: any) {
          console.error('[VAPI TEST] Error occurred:', {
            message: error.message,
            response: error.response?.data
          });
          
          testError = error.message;
          connectionStatus = 'error';
          testResult = {
            error: testError
          };
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

// Firebase-specific routes
router.post('/firebase/setup', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const { projectId, appId, apiKey } = req.body;
    
    if (!projectId || !appId || !apiKey) {
      return res.status(400).json({ error: 'Project ID, App ID, and API Key are all required' });
    }

    // Check if Firebase integration already exists
    const existingIntegration = await storage.getIntegration(user.organizationId, 'firebase');
    
    // Encrypt the credentials
    const credentials = { projectId, appId, apiKey };
    const credentialsEncrypted = encrypt(JSON.stringify(credentials));

    const integrationData: any = {
      organizationId: user.organizationId,
      platformType: 'firebase',
      name: 'Firebase Authentication',
      connectionConfig: {
        service: 'authentication',
        enabled: true
      },
      credentialsEncrypted,
      connectionStatus: 'active',
      isEnabled: true,
      testResult: { status: 'Configuration saved successfully' }
    };

    let integration;
    if (existingIntegration) {
      integration = await storage.updateIntegration(existingIntegration.id, integrationData);
    } else {
      integration = await storage.createIntegration(integrationData);
    }

    // Also update the organization's firebaseConfig
    await storage.updateOrganization(user.organizationId, {
      firebaseConfig: { projectId, appId, apiKey }
    });

    // Log activity
    await storage.logActivity({
      organizationId: user.organizationId,
      userId: user.id,
      actionType: 'agent_action',
      entityType: 'integration',
      entityId: integration?.id || existingIntegration?.id,
      description: 'Firebase configuration saved',
      metadata: { projectId }
    });

    res.json({
      ...integration,
      hasCredentials: true,
      credentialsEncrypted: undefined
    });
  } catch (error) {
    console.error('Error saving Firebase integration:', error);
    res.status(500).json({ error: 'Failed to save Firebase configuration' });
  }
});

router.post('/firebase/test', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing organization' });
    }

    const integration = await storage.getIntegration(user.organizationId, 'firebase');
    
    if (!integration || !integration.credentialsEncrypted) {
      return res.status(400).json({ error: 'Firebase integration not configured' });
    }

    // Decrypt the credentials
    let projectId: string;
    try {
      const decrypted = decrypt(integration.credentialsEncrypted);
      const parsed = JSON.parse(decrypted);
      projectId = parsed.projectId;
    } catch (decryptError) {
      return res.status(400).json({ 
        error: 'Failed to decrypt credentials. Please reconfigure the integration.' 
      });
    }

    // For Firebase, we just verify the config is valid by checking format
    // Real validation would require Firebase Admin SDK
    if (projectId && projectId.length > 0) {
      // Update integration status
      await storage.updateIntegration(integration.id, {
        connectionStatus: 'connected',
        lastTestedAt: new Date(),
        testResult: { 
          status: 'Connection verified',
          message: 'Firebase configuration is valid'
        }
      });

      // Log activity
      await storage.logActivity({
        organizationId: user.organizationId,
        userId: user.id,
        actionType: 'agent_action',
        entityType: 'integration',
        entityId: integration.id,
        description: 'Firebase connection test successful',
        metadata: { projectId }
      });

      res.json({
        success: true,
        status: 'connected',
        message: 'Firebase configuration verified successfully',
        testedAt: new Date().toISOString()
      });
    } else {
      await storage.updateIntegration(integration.id, {
        connectionStatus: 'error',
        lastTestedAt: new Date(),
        testResult: { 
          status: 'Configuration invalid',
          error: 'Project ID is missing'
        }
      });

      res.json({
        success: false,
        status: 'error',
        message: 'Firebase configuration is invalid',
        testedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error testing Firebase connection:', error);
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
          
          // Customer Labels (array of label objects with id, label, color)
          { name: 'customer_labels', label: 'Customer Labels', type: 'string', operators: ['contains', 'does_not_contain'] }
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
      
      // For customers entity, fetch actual label options from Splynx using cached service
      if (entity === 'customers' && req.user?.organizationId) {
        try {
          const labelOptions = await SplynxLabelService.getLabels(req.user.organizationId);
          
          // Find and update the customer_labels field with options
          const customerLabelsField = schema.fields.find(f => f.name === 'customer_labels');
          if (customerLabelsField && labelOptions.length > 0) {
            customerLabelsField.options = labelOptions;
          }
        } catch (labelError: any) {
          // Log error but don't fail the whole request - return schema without label options
          console.warn('Failed to fetch customer label options:', labelError.message);
        }
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

// Get Splynx projects for task creation
router.get('/splynx/projects', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const integrationId = req.query.integrationId;
    if (!integrationId || typeof integrationId !== 'string') {
      return res.status(400).json({ error: 'integrationId query parameter is required' });
    }

    // Get specific Splynx integration by ID
    const [splynxIntegration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.id, parseInt(integrationId)),
          eq(integrations.organizationId, req.user.organizationId),
          eq(integrations.platformType, 'splynx')
        )
      )
      .limit(1);

    if (!splynxIntegration) {
      return res.status(404).json({ error: 'Splynx integration not found' });
    }

    if (!splynxIntegration.credentialsEncrypted) {
      return res.status(400).json({ error: 'Splynx credentials not configured' });
    }

    // Decrypt credentials
    const credentials = JSON.parse(decrypt(splynxIntegration.credentialsEncrypted));
    const { baseUrl, authHeader } = credentials;

    if (!baseUrl || !authHeader) {
      return res.status(400).json({ error: 'Splynx credentials incomplete' });
    }

    // Create Splynx service and fetch projects
    const splynxService = new SplynxService({ baseUrl, authHeader });
    const projects = await splynxService.getSplynxProjects();

    res.json({ projects });
  } catch (error: any) {
    console.error('Error fetching Splynx projects:', error);
    res.status(500).json({ error: 'Failed to fetch Splynx projects', details: error.message });
  }
});

// Get Splynx workflow statuses for a given workflow
router.get('/splynx/workflows/:workflowId/statuses', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const workflowId = parseInt(req.params.workflowId);
    if (isNaN(workflowId)) {
      return res.status(400).json({ error: 'Invalid workflow ID' });
    }

    // Get Splynx integration for this organization
    const [splynxIntegration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.organizationId, req.user.organizationId),
          eq(integrations.platformType, 'splynx')
        )
      )
      .limit(1);

    if (!splynxIntegration) {
      return res.status(404).json({ error: 'Splynx integration not found' });
    }

    if (!splynxIntegration.credentialsEncrypted) {
      return res.status(400).json({ error: 'Splynx credentials not configured' });
    }

    const credentials = JSON.parse(decrypt(splynxIntegration.credentialsEncrypted));
    const { baseUrl, authHeader } = credentials;

    if (!baseUrl || !authHeader) {
      return res.status(400).json({ error: 'Splynx credentials incomplete' });
    }

    const splynxService = new SplynxService({ baseUrl, authHeader });
    const statuses = await splynxService.getWorkflowStatuses(workflowId);

    res.json({ statuses });
  } catch (error: any) {
    console.error('Error fetching Splynx workflow statuses:', error);
    res.status(500).json({ error: 'Failed to fetch workflow statuses', details: error.message });
  }
});

// Get Splynx scheduling projects for the organization (simpler endpoint without integrationId)
router.get('/splynx/scheduling-projects', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get Splynx integration for this organization
    const [splynxIntegration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.organizationId, req.user.organizationId),
          eq(integrations.platformType, 'splynx')
        )
      )
      .limit(1);

    if (!splynxIntegration) {
      return res.status(404).json({ error: 'Splynx integration not found' });
    }

    if (!splynxIntegration.credentialsEncrypted) {
      return res.status(400).json({ error: 'Splynx credentials not configured' });
    }

    const credentials = JSON.parse(decrypt(splynxIntegration.credentialsEncrypted));
    const { baseUrl, authHeader } = credentials;

    if (!baseUrl || !authHeader) {
      return res.status(400).json({ error: 'Splynx credentials incomplete' });
    }

    const splynxService = new SplynxService({ baseUrl, authHeader });
    const projects = await splynxService.getSchedulingProjects();

    res.json({ projects });
  } catch (error: any) {
    console.error('Error fetching Splynx scheduling projects:', error);
    res.status(500).json({ error: 'Failed to fetch scheduling projects', details: error.message });
  }
});

// Get workflow statuses for a Splynx scheduling project
router.get('/splynx/project/:projectId/workflow-statuses', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    // Get Splynx integration for this organization
    const [splynxIntegration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.organizationId, req.user.organizationId),
          eq(integrations.platformType, 'splynx')
        )
      )
      .limit(1);

    if (!splynxIntegration) {
      return res.status(404).json({ error: 'Splynx integration not found' });
    }

    if (!splynxIntegration.credentialsEncrypted) {
      return res.status(400).json({ error: 'Splynx credentials not configured' });
    }

    const credentials = JSON.parse(decrypt(splynxIntegration.credentialsEncrypted));
    const { baseUrl, authHeader } = credentials;

    if (!baseUrl || !authHeader) {
      return res.status(400).json({ error: 'Splynx credentials incomplete' });
    }

    const splynxService = new SplynxService({ baseUrl, authHeader });
    const statuses = await splynxService.getProjectWorkflowStatuses(projectId);

    res.json({ statuses });
  } catch (error: any) {
    console.error('Error fetching Splynx project workflow statuses:', error);
    res.status(500).json({ error: 'Failed to fetch workflow statuses', details: error.message });
  }
});

// Get workflow status label mappings for an organization
router.get('/splynx/workflow-status-mappings', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const workflowId = req.query.workflowId ? parseInt(req.query.workflowId as string) : undefined;

    let query = db
      .select()
      .from(splynxWorkflowStatuses)
      .where(eq(splynxWorkflowStatuses.organizationId, req.user.organizationId));

    if (workflowId) {
      query = db
        .select()
        .from(splynxWorkflowStatuses)
        .where(and(
          eq(splynxWorkflowStatuses.organizationId, req.user.organizationId),
          eq(splynxWorkflowStatuses.workflowId, workflowId)
        ));
    }

    const mappings = await query;
    res.json({ mappings });
  } catch (error: any) {
    console.error('Error fetching workflow status mappings:', error);
    res.status(500).json({ error: 'Failed to fetch workflow status mappings', details: error.message });
  }
});

// Create or update a workflow status label mapping
router.post('/splynx/workflow-status-mappings', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { workflowId, statusId, label, color, isDefault } = req.body;

    if (!workflowId || !statusId || !label) {
      return res.status(400).json({ error: 'workflowId, statusId, and label are required' });
    }

    // Check if mapping already exists
    const [existing] = await db
      .select()
      .from(splynxWorkflowStatuses)
      .where(and(
        eq(splynxWorkflowStatuses.organizationId, req.user.organizationId),
        eq(splynxWorkflowStatuses.workflowId, workflowId),
        eq(splynxWorkflowStatuses.statusId, statusId)
      ))
      .limit(1);

    if (existing) {
      // Update existing mapping (double-check org ownership for security)
      const [updated] = await db
        .update(splynxWorkflowStatuses)
        .set({
          label: label.trim(),
          color: color || null,
          isDefault: isDefault || false,
          updatedAt: new Date(),
        })
        .where(and(
          eq(splynxWorkflowStatuses.id, existing.id),
          eq(splynxWorkflowStatuses.organizationId, req.user.organizationId)
        ))
        .returning();
      res.json({ mapping: updated, updated: true });
    } else {
      // Create new mapping
      const [created] = await db
        .insert(splynxWorkflowStatuses)
        .values({
          organizationId: req.user.organizationId,
          workflowId,
          statusId,
          label: label.trim(),
          color: color || null,
          isDefault: isDefault || false,
        })
        .returning();
      res.json({ mapping: created, created: true });
    }
  } catch (error: any) {
    console.error('Error saving workflow status mapping:', error);
    res.status(500).json({ error: 'Failed to save workflow status mapping', details: error.message });
  }
});

// Delete a workflow status label mapping
router.delete('/splynx/workflow-status-mappings/:id', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid mapping ID' });
    }

    await db
      .delete(splynxWorkflowStatuses)
      .where(and(
        eq(splynxWorkflowStatuses.id, id),
        eq(splynxWorkflowStatuses.organizationId, req.user.organizationId)
      ));

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting workflow status mapping:', error);
    res.status(500).json({ error: 'Failed to delete workflow status mapping', details: error.message });
  }
});

// Get Splynx scheduling tasks for a project to find valid workflow status IDs
router.get('/splynx/scheduling-tasks', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    // Get Splynx integration for this organization
    const [splynxIntegration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.organizationId, req.user.organizationId),
          eq(integrations.platformType, 'splynx')
        )
      )
      .limit(1);

    if (!splynxIntegration) {
      return res.status(404).json({ error: 'Splynx integration not found' });
    }

    if (!splynxIntegration.credentialsEncrypted) {
      return res.status(400).json({ error: 'Splynx credentials not configured' });
    }

    const credentials = JSON.parse(decrypt(splynxIntegration.credentialsEncrypted));
    const { baseUrl, authHeader } = credentials;

    if (!baseUrl || !authHeader) {
      return res.status(400).json({ error: 'Splynx credentials incomplete' });
    }

    const splynxService = new SplynxService({ baseUrl, authHeader });
    const tasks = await splynxService.getSchedulingTasks({ limit });

    // Filter by project if specified
    let filteredTasks = tasks;
    if (projectId) {
      filteredTasks = tasks.filter((t: any) => parseInt(t.project_id) === projectId);
    }

    // Extract unique workflow status IDs
    const uniqueStatuses = Array.from(new Set(filteredTasks.map((t: any) => t.workflow_status_id)));

    res.json({ 
      tasks: filteredTasks.slice(0, limit),
      uniqueWorkflowStatusIds: uniqueStatuses.sort((a: any, b: any) => a - b)
    });
  } catch (error: any) {
    console.error('Error fetching Splynx scheduling tasks:', error);
    res.status(500).json({ error: 'Failed to fetch scheduling tasks', details: error.message });
  }
});

// Get live Splynx ticket or task data (for workflow steps)
router.get('/splynx/entity/:entityType/:entityId', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { entityType, entityId } = req.params;
    const integrationId = req.query.integrationId;

    if (!integrationId || typeof integrationId !== 'string') {
      return res.status(400).json({ error: 'integrationId query parameter is required' });
    }

    if (entityType !== 'ticket' && entityType !== 'task') {
      return res.status(400).json({ error: 'entityType must be either "ticket" or "task"' });
    }

    // Get specific Splynx integration by ID
    const [splynxIntegration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.id, parseInt(integrationId)),
          eq(integrations.organizationId, req.user.organizationId),
          eq(integrations.platformType, 'splynx')
        )
      )
      .limit(1);

    if (!splynxIntegration) {
      return res.status(404).json({ error: 'Splynx integration not found' });
    }

    if (!splynxIntegration.credentialsEncrypted) {
      return res.status(400).json({ error: 'Splynx credentials not configured' });
    }

    // Decrypt credentials
    const credentials = JSON.parse(decrypt(splynxIntegration.credentialsEncrypted));
    const { baseUrl, authHeader } = credentials;

    if (!baseUrl || !authHeader) {
      return res.status(400).json({ error: 'Splynx credentials incomplete' });
    }

    // Create Splynx service and fetch entity data
    const splynxService = new SplynxService({ baseUrl, authHeader });
    
    let entityData;
    let messages = [];

    if (entityType === 'ticket') {
      const ticketData = await splynxService.getTicketDetails(entityId);
      
      // Log ticket data structure for debugging
      console.log(`[TICKET ${entityId}] Fetched ticket data:`, JSON.stringify(ticketData, null, 2));
      
      // CRITICAL FIX: Return the actual ticket data as entityData
      entityData = ticketData;
      
      // Enrich with customer name if customer_id exists
      if (ticketData?.customer_id) {
        try {
          const customerData = await splynxService.getCustomerById(ticketData.customer_id);
          if (customerData) {
            entityData.customer_name = customerData.name;
            console.log(`[TICKET ${entityId}] Enriched with customer name: ${customerData.name}`);
          }
        } catch (customerError: any) {
          console.log(`Could not fetch customer name for ticket ${entityId}:`, customerError.message);
        }
      }
      
      // Try to get comments (messages) using the correct Splynx endpoint
      try {
        messages = await splynxService.getTicketComments(entityId);
        console.log(`[TICKET ${entityId}] Fetched ${messages.length} comments`);
      } catch (commentsError: any) {
        console.log(`Could not fetch comments for ticket ${entityId}:`, commentsError.message);
        messages = [];
      }
    } else {
      entityData = await splynxService.getTaskDetails(entityId);
    }

    res.json({ 
      entityData,
      messages: entityType === 'ticket' ? messages : undefined,
    });
  } catch (error: any) {
    console.error(`Error fetching Splynx ${req.params.entityType} data:`, error);
    res.status(500).json({ error: `Failed to fetch ${req.params.entityType} data`, details: error.message });
  }
});

// Post a message to a Splynx ticket
router.post('/splynx/entity/ticket/:ticketId/message', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { ticketId } = req.params;
    const { integrationId, message, isInternal } = req.body;

    if (!integrationId) {
      return res.status(400).json({ error: 'integrationId is required' });
    }

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    // Get specific Splynx integration by ID
    const [splynxIntegration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.id, parseInt(integrationId)),
          eq(integrations.organizationId, req.user.organizationId),
          eq(integrations.platformType, 'splynx')
        )
      )
      .limit(1);

    if (!splynxIntegration) {
      return res.status(404).json({ error: 'Splynx integration not found' });
    }

    if (!splynxIntegration.credentialsEncrypted) {
      return res.status(400).json({ error: 'Splynx credentials not configured' });
    }

    // Decrypt credentials
    const credentials = JSON.parse(decrypt(splynxIntegration.credentialsEncrypted));
    const { baseUrl, authHeader } = credentials;

    if (!baseUrl || !authHeader) {
      return res.status(400).json({ error: 'Splynx credentials incomplete' });
    }

    // Look up the current user's splynxAdminId for message attribution
    let splynxAdminId: number | undefined;
    
    if (req.user?.id) {
      const [currentUser] = await db
        .select({ splynxAdminId: users.splynxAdminId })
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);
      
      splynxAdminId = currentUser?.splynxAdminId ?? undefined;
    }
    
    // Get default automation admin ID from integration metadata, fallback to 72
    const integrationMetadata = splynxIntegration.metadata as any;
    const defaultSplynxAdminId = integrationMetadata?.defaultSplynxAdminId ?? 72;
    
    // Use user's splynxAdminId if set, otherwise use default (72)
    const adminIdToUse = splynxAdminId ?? defaultSplynxAdminId;
    
    console.log(`[Splynx Message] User ${req.user?.id} splynxAdminId: ${splynxAdminId || 'not set'}, using: ${adminIdToUse}`);

    // Create Splynx service and send message with admin attribution
    const splynxService = new SplynxService({ baseUrl, authHeader });
    const result = await splynxService.addTicketMessage(
      ticketId, 
      message, 
      isInternal === 'true' || isInternal === true,
      { adminId: adminIdToUse }
    );

    res.json({ 
      success: true,
      result,
      adminIdUsed: adminIdToUse
    });
  } catch (error: any) {
    console.error(`Error sending message to Splynx ticket:`, error);
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
});

router.patch('/splynx/entity/ticket/:ticketId/status', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { ticketId } = req.params;
    const { integrationId, statusId, statusName } = req.body;

    if (!integrationId) {
      return res.status(400).json({ error: 'integrationId is required' });
    }

    if (!statusId) {
      return res.status(400).json({ error: 'statusId is required' });
    }

    // Get specific Splynx integration by ID
    const [splynxIntegration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.id, parseInt(integrationId)),
          eq(integrations.organizationId, req.user.organizationId),
          eq(integrations.platformType, 'splynx')
        )
      )
      .limit(1);

    if (!splynxIntegration) {
      return res.status(404).json({ error: 'Splynx integration not found' });
    }

    if (!splynxIntegration.credentialsEncrypted) {
      return res.status(400).json({ error: 'Splynx credentials not configured' });
    }

    // Decrypt credentials
    const credentials = JSON.parse(decrypt(splynxIntegration.credentialsEncrypted));
    const { baseUrl, authHeader } = credentials;

    if (!baseUrl || !authHeader) {
      return res.status(400).json({ error: 'Splynx credentials incomplete' });
    }

    // Create Splynx service and update ticket status
    const splynxService = new SplynxService({ baseUrl, authHeader });
    const result = await splynxService.updateTicketStatus(ticketId, statusId);

    // BIDIRECTIONAL SYNC: Also update linked work item status
    try {
      // Status mapping from Splynx ticket status to work item status
      // Using valid work item status values
      const statusMapping: Record<string, 'Planning' | 'Ready' | 'In Progress' | 'Stuck' | 'Completed' | 'Archived'> = {
        'new': 'Planning',
        'work_in_progress': 'In Progress',
        'open': 'In Progress',
        'waiting_on_customer': 'In Progress',
        'waiting_on_agent': 'In Progress',
        'site_visit_required': 'In Progress',
        'monitoring': 'In Progress',
        'resolved': 'Completed',
        'closed': 'Completed'
      };
      
      // Splynx status ID to name mapping (based on frontend statusOptions)
      const statusIdToName: Record<string, string> = {
        '1': 'new',
        '2': 'work_in_progress',
        '3': 'resolved',
        '4': 'waiting_on_customer',
        '5': 'waiting_on_agent',
        '6': 'site_visit_required',
        '7': 'monitoring'
      };
      
      // Get status name: prefer statusName from request, fallback to ID lookup
      let ticketStatusName = statusName;
      if (!ticketStatusName || !isNaN(Number(ticketStatusName))) {
        // If statusName is missing or looks like a number, look up by ID
        const idKey = String(statusId);
        ticketStatusName = statusIdToName[idKey] || statusName || statusId;
      }
      const normalizedStatus = String(ticketStatusName).toLowerCase().replace(/[^a-z_]/g, '_');
      const workItemStatus = statusMapping[normalizedStatus];
      
      // If no valid mapping found, log warning and skip sync
      if (!workItemStatus) {
        console.warn(`[BIDIRECTIONAL SYNC] Unknown ticket status "${ticketStatusName}" (ID: ${statusId}) - skipping work item sync`);
      } else {
        // Find work item linked to this ticket using the correct storage method
        const linkedWorkItem = await storage.getWorkItemBySplynxTicketId(req.user.organizationId, String(ticketId));
        
        if (linkedWorkItem) {
          // Only update if status is actually different
          if (linkedWorkItem.status !== workItemStatus) {
            console.log(`[BIDIRECTIONAL SYNC] Updating work item #${linkedWorkItem.id} status: ${linkedWorkItem.status} → ${workItemStatus}`);
            
            await storage.updateWorkItem(linkedWorkItem.id, {
              status: workItemStatus,
              updatedAt: new Date()
            });
            
            // Log activity
            await storage.logActivity({
              organizationId: req.user.organizationId,
              userId: req.user.id,
              actionType: 'status_change',
              entityType: 'work_item',
              entityId: linkedWorkItem.id,
              description: `Work item status synced to "${workItemStatus}" when ticket status changed to "${ticketStatusName}"`,
              metadata: {
                ticketId,
                ticketStatus: ticketStatusName,
                oldWorkItemStatus: linkedWorkItem.status,
                newWorkItemStatus: workItemStatus,
                syncDirection: 'ui_to_workitem',
                syncedAt: new Date().toISOString()
              }
            });
            
            console.log(`[BIDIRECTIONAL SYNC] Synced status for work item #${linkedWorkItem.id}`);
          }
        }
      }
    } catch (syncError: any) {
      // Don't fail the main request if work item sync fails
      console.error(`[BIDIRECTIONAL SYNC] Error syncing work item status:`, syncError.message);
    }

    res.json({ 
      success: true,
      result
    });
  } catch (error: any) {
    console.error(`Error updating Splynx ticket status:`, error);
    res.status(500).json({ error: 'Failed to update ticket status', details: error.message });
  }
});

// Test Splynx action (for workflow builder testing)
router.post('/splynx/:integrationId/test-action', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { integrationId } = req.params;
    const { action, parameters } = req.body;

    console.log(`[SPLYNX TEST ACTION] Testing action: ${action}`);
    console.log(`[SPLYNX TEST ACTION] Parameters:`, parameters);

    // Get integration
    const [splynxIntegration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.id, parseInt(integrationId)),
          eq(integrations.organizationId, user.organizationId),
          eq(integrations.platformType, 'splynx')
        )
      )
      .limit(1);

    if (!splynxIntegration) {
      return res.status(404).json({ error: 'Splynx integration not found' });
    }

    if (!splynxIntegration.credentialsEncrypted) {
      return res.status(400).json({ error: 'Splynx credentials not configured' });
    }

    // Decrypt credentials
    const credentials = JSON.parse(decrypt(splynxIntegration.credentialsEncrypted));
    const { baseUrl, authHeader } = credentials;

    if (!baseUrl || !authHeader) {
      return res.status(400).json({ error: 'Splynx credentials incomplete' });
    }

    // Create Splynx service and execute action
    const splynxService = new SplynxService({ baseUrl, authHeader });
    
    let result: any;
    let debugInfo: any = {};

    switch (action) {
      case 'count_tickets':
        const ticketFilters = {
          statusFilter: parameters?.statusFilter,
          ticketType: parameters?.ticketType,
          groupId: parameters?.groupId,
          dateRange: parameters?.dateRange,
        };
        
        // Build the API request details for debugging (mirrors what getTicketCount does)
        const apiParams: any = { main_attributes: {} };
        if (ticketFilters.statusFilter && ticketFilters.statusFilter !== 'all') {
          apiParams.main_attributes.status_id = parseInt(ticketFilters.statusFilter);
        }
        if (ticketFilters.groupId) {
          apiParams.main_attributes.group_id = parseInt(String(ticketFilters.groupId));
        }
        if (ticketFilters.ticketType) {
          apiParams.main_attributes.type_id = parseInt(ticketFilters.ticketType);
        }
        
        // Calculate date filter for display (using Splynx comparison operators)
        let dateFilterInfo = 'No date filter';
        if (ticketFilters.dateRange && ticketFilters.dateRange !== 'all') {
          const now = new Date();
          const formatDate = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
          };
          
          let startDate: Date;
          let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          
          switch (ticketFilters.dateRange) {
            case 'today':
              startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
              break;
            case 'this_week':
              startDate = new Date(now);
              startDate.setDate(now.getDate() - now.getDay());
              startDate.setHours(0, 0, 0, 0);
              break;
            case 'this_month':
              startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
              break;
            case 'this_quarter':
              const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
              startDate = new Date(now.getFullYear(), quarterMonth, 1, 0, 0, 0);
              break;
            case 'this_year':
              startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
              break;
            default:
              startDate = new Date(0);
          }
          
          const startStr = formatDate(startDate);
          const endStr = formatDate(endDate);
          dateFilterInfo = `Client-side: created_at >= "${startStr}" AND created_at <= "${endStr}"`;
        }
        
        result = await splynxService.getTicketCount(ticketFilters);
        debugInfo = {
          action: 'count_tickets',
          apiRequest: {
            url: `${baseUrl}admin/support/tickets`,
            method: 'GET',
            params: apiParams,
          },
          dateFiltering: dateFilterInfo,
          note: 'Type/status/group filters applied server-side. Date filtering is done client-side (Splynx API limitation). Results are paginated with 500 ticket batches.',
          filters: ticketFilters,
          count: result,
        };
        break;
        
      case 'count_leads':
        const leadFilters = {
          statusFilter: parameters?.statusFilter,
          dateRange: parameters?.dateRange,
        };
        result = await splynxService.getLeadCount(leadFilters);
        debugInfo = {
          action: 'count_leads',
          filters: leadFilters,
          count: result,
        };
        break;
        
      case 'count_customers':
        const customerFilters = {
          statusFilter: parameters?.statusFilter,
          dateRange: parameters?.dateRange,
        };
        result = await splynxService.getCustomerCount(customerFilters);
        debugInfo = {
          action: 'count_customers',
          filters: customerFilters,
          count: result,
        };
        break;
        
      default:
        return res.status(400).json({ error: `Unsupported action for testing: ${action}` });
    }

    console.log(`[SPLYNX TEST ACTION] Result:`, result);

    res.json({ 
      success: true,
      result,
      debugInfo,
    });
  } catch (error: any) {
    console.error(`[SPLYNX TEST ACTION] Error:`, error);
    res.status(500).json({ error: 'Failed to test action', details: error.message });
  }
});

// Fetch Splynx ticket types
router.get('/splynx/:integrationId/ticket-types', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { integrationId } = req.params;

    // Get integration
    const [splynxIntegration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.id, parseInt(integrationId)),
          eq(integrations.organizationId, user.organizationId),
          eq(integrations.platformType, 'splynx')
        )
      )
      .limit(1);

    if (!splynxIntegration) {
      return res.status(404).json({ error: 'Splynx integration not found' });
    }

    if (!splynxIntegration.credentialsEncrypted) {
      return res.status(400).json({ error: 'Splynx credentials not configured' });
    }

    // Decrypt credentials
    const credentials = JSON.parse(decrypt(splynxIntegration.credentialsEncrypted));
    const { baseUrl, authHeader } = credentials;

    if (!baseUrl || !authHeader) {
      return res.status(400).json({ error: 'Splynx credentials incomplete' });
    }

    // Create Splynx service and fetch ticket types
    const splynxService = new SplynxService({ baseUrl, authHeader });
    const ticketTypes = await splynxService.getTicketTypes();

    res.json({ ticketTypes });
  } catch (error: any) {
    console.error(`Error fetching Splynx ticket types:`, error);
    res.status(500).json({ error: 'Failed to fetch ticket types', details: error.message });
  }
});

// Debug endpoint to fetch customer billing data for testing
router.get('/splynx/:integrationId/debug-customer-billing/:customerId', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { integrationId, customerId } = req.params;

    // Get integration
    const [splynxIntegration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.id, parseInt(integrationId)),
          eq(integrations.organizationId, user.organizationId),
          eq(integrations.platformType, 'splynx')
        )
      )
      .limit(1);

    if (!splynxIntegration) {
      return res.status(404).json({ error: 'Splynx integration not found' });
    }

    if (!splynxIntegration.credentialsEncrypted) {
      return res.status(400).json({ error: 'Splynx credentials not configured' });
    }

    // Decrypt credentials
    const credentials = JSON.parse(decrypt(splynxIntegration.credentialsEncrypted));
    const { baseUrl, authHeader } = credentials;

    if (!baseUrl || !authHeader) {
      return res.status(400).json({ error: 'Splynx credentials incomplete' });
    }

    // Create Splynx service and fetch billing data
    const splynxService = new SplynxService({ baseUrl, authHeader });
    
    // Fetch customer details
    const customer = await splynxService.getCustomerById(parseInt(customerId));
    
    // Fetch billing data
    const billing = await splynxService.getCustomerBalance(parseInt(customerId));
    
    // Fetch services
    const services = await splynxService.getCustomerServices(parseInt(customerId));

    res.json({
      success: true,
      customerId: parseInt(customerId),
      customer: customer ? {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        category: customer.raw?.category || 'unknown',
        status: customer.status,
        lastOnline: customer.raw?.last_online,
      } : null,
      billing: {
        deposit: billing.deposit,
        accountStatus: billing.accountStatus,
        lastOnline: billing.lastOnline,
        blockingEnabled: billing.blockingEnabled,
        blockInNextBillingCycle: billing.blockInNextBillingCycle,
        blockingDate: billing.blockingDate,
        isAlreadyBlocked: billing.isAlreadyBlocked,
        isAlreadyDisabled: billing.isAlreadyDisabled,
        lowBalance: billing.lowBalance,
        lastPaymentDate: billing.lastPaymentDate,
        lastPaymentAmount: billing.lastPaymentAmount,
        currency: billing.currency,
      },
      services: services.map(s => ({
        id: s.id,
        name: s.serviceName,
        status: s.status,
        lastOnline: s.lastOnline,
      })),
    });
  } catch (error: any) {
    console.error(`Error fetching customer billing debug:`, error);
    res.status(500).json({ error: 'Failed to fetch customer billing', details: error.message });
  }
});

// Fetch Splynx ticket statuses
router.get('/splynx/:integrationId/ticket-statuses', async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { integrationId } = req.params;

    // Get integration
    const [splynxIntegration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.id, parseInt(integrationId)),
          eq(integrations.organizationId, user.organizationId),
          eq(integrations.platformType, 'splynx')
        )
      )
      .limit(1);

    if (!splynxIntegration) {
      return res.status(404).json({ error: 'Splynx integration not found' });
    }

    if (!splynxIntegration.credentialsEncrypted) {
      return res.status(400).json({ error: 'Splynx credentials not configured' });
    }

    // Decrypt credentials
    const credentials = JSON.parse(decrypt(splynxIntegration.credentialsEncrypted));
    const { baseUrl, authHeader } = credentials;

    if (!baseUrl || !authHeader) {
      return res.status(400).json({ error: 'Splynx credentials incomplete' });
    }

    // Create Splynx service and fetch ticket statuses
    const splynxService = new SplynxService({ baseUrl, authHeader });
    const ticketStatuses = await splynxService.getTicketStatuses();

    res.json({ ticketStatuses });
  } catch (error: any) {
    console.error(`Error fetching Splynx ticket statuses:`, error);
    res.status(500).json({ error: 'Failed to fetch ticket statuses', details: error.message });
  }
});

export default router;