import crypto from 'crypto';
import storage from '../storage';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;

function encrypt(text: string): string {
  if (!text) return '';
  
  try {
    const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

async function updateGoogleMapsKey() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GOOGLE_MAPS_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  const organizationId = 4;
  
  console.log('🔍 Checking for existing Google Maps integration...');
  const existingIntegration = await storage.getIntegration(organizationId, 'google_maps');
  
  if (!existingIntegration) {
    console.error('❌ Google Maps integration not found for organization', organizationId);
    process.exit(1);
  }
  
  console.log('✅ Found integration:', existingIntegration.id);
  console.log('📦 Encrypting API key...');
  
  const credentials = { apiKey: apiKey.trim() };
  const credentialsEncrypted = encrypt(JSON.stringify(credentials));
  
  console.log('💾 Updating integration with encrypted credentials...');
  const updated = await storage.updateIntegration(existingIntegration.id, {
    credentialsEncrypted,
    connectionStatus: 'active',
    isEnabled: true,
    testResult: { status: 'API key configured successfully', timestamp: new Date().toISOString() }
  });
  
  if (!updated) {
    console.error('❌ Failed to update integration');
    process.exit(1);
  }
  
  console.log('✅ Google Maps integration updated successfully!');
  console.log('✅ API key has been encrypted and stored');
  console.log('✅ Integration ID:', updated.id);
  
  process.exit(0);
}

updateGoogleMapsKey().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
