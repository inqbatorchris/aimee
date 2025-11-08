import { storage } from '../storage';
import crypto from 'crypto';

// Encryption helpers (same as in integrations.ts)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16;

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

async function initializeGoogleMapsIntegration() {
  try {
    const API_KEY = 'AIzaSyA85ztbpqolTz2wu1h_cnX-bAJikgzDVgc';
    const ORGANIZATION_ID = 3; // Default organization ID
    
    console.log('🗺️  Initializing Google Maps integration...');
    
    // Check if integration already exists
    const existing = await storage.getIntegration(ORGANIZATION_ID, 'google_maps');
    
    if (existing) {
      console.log('✓ Google Maps integration already exists (ID:', existing.id, ')');
      console.log('  Updating with new API key...');
      
      const credentials = { apiKey: API_KEY };
      const credentialsEncrypted = encrypt(JSON.stringify(credentials));
      
      await storage.updateIntegration(existing.id, {
        credentialsEncrypted,
        connectionStatus: 'active',
        isEnabled: true,
        testResult: { status: 'API key configured via script' },
        lastTestedAt: new Date()
      });
      
      console.log('✓ Google Maps integration updated successfully');
    } else {
      console.log('  Creating new Google Maps integration...');
      
      const credentials = { apiKey: API_KEY };
      const credentialsEncrypted = encrypt(JSON.stringify(credentials));
      
      const integration = await storage.createIntegration({
        organizationId: ORGANIZATION_ID,
        platformType: 'google_maps',
        name: 'Google Maps Geocoding',
        connectionConfig: {
          service: 'geocoding',
          enabled: true
        },
        credentialsEncrypted,
        connectionStatus: 'active',
        isEnabled: true,
        testResult: { status: 'API key configured via script' }
      });
      
      if (integration) {
        console.log('✓ Google Maps integration created successfully (ID:', integration.id, ')');
        
        // Log activity
        await storage.logActivity({
          organizationId: ORGANIZATION_ID,
          userId: 1, // System user
          actionType: 'creation',
          entityType: 'integration',
          entityId: integration.id,
          description: 'Initialized Google Maps integration for geocoding',
          metadata: {
            platformType: 'google_maps',
            service: 'geocoding',
            source: 'initialization_script'
          }
        });
        
        console.log('✓ Activity logged');
      } else {
        console.error('✗ Failed to create Google Maps integration');
      }
    }
    
    console.log('🎉 Google Maps integration setup complete!');
  } catch (error) {
    console.error('Error initializing Google Maps integration:', error);
    throw error;
  }
}

// Run if executed directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Auto-execute when run directly
initializeGoogleMapsIntegration()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });

export { initializeGoogleMapsIntegration };
