import axios from 'axios';
import crypto from 'crypto';
import { db } from './server/db';
import { integrations } from './shared/schema';
import { eq, and } from 'drizzle-orm';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

function decrypt(text: string): string {
  if (!text || !ENCRYPTION_KEY) {
    throw new Error('Decryption not configured');
  }
  const parts = text.split(':');
  if (parts.length !== 2) throw new Error('Invalid encrypted data format');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function testSplynxUpdate() {
  const TASK_ID = '10221';
  const ORG_ID = 4;
  
  const [splynxIntegration] = await db
    .select()
    .from(integrations)
    .where(and(
      eq(integrations.organizationId, ORG_ID),
      eq(integrations.platformType, 'splynx')
    ))
    .limit(1);
  
  if (!splynxIntegration?.credentialsEncrypted) {
    console.log('No Splynx integration found');
    process.exit(1);
  }
  
  const credentials = JSON.parse(decrypt(splynxIntegration.credentialsEncrypted));
  // Fix: baseUrl already has /api/2.0
  const baseUrl = credentials.baseUrl.replace(/\/$/, '');
  const authHeader = credentials.authHeader;
  
  console.log('Base URL:', baseUrl);
  
  const headers = {
    'Authorization': authHeader,
    'Content-Type': 'application/json',
  };
  
  // The baseUrl already includes /api/2.0, so just append the path
  const taskUrl = `${baseUrl}/admin/scheduling/tasks/${TASK_ID}`;
  console.log('Task URL:', taskUrl);
  
  console.log('=== STEP 1: Fetch current task state ===');
  const currentTask = await axios.get(taskUrl, { headers });
  console.log('Current task fields:');
  console.log('  scheduled_from:', currentTask.data.scheduled_from);
  console.log('  scheduled_to:', currentTask.data.scheduled_to);
  console.log('  formatted_duration:', currentTask.data.formatted_duration);
  console.log('');
  
  // Try different update payloads
  const testPayloads = [
    { name: 'Test 1: formatted_duration only', payload: { formatted_duration: '2h' } },
    { name: 'Test 2: scheduled_from + formatted_duration', payload: { scheduled_from: '2025-12-12 11:00:00', formatted_duration: '2h' } },
    { name: 'Test 3: scheduled_from + scheduled_to', payload: { scheduled_from: '2025-12-12 11:00:00', scheduled_to: '2025-12-12 13:00:00' } },
  ];
  
  for (const test of testPayloads) {
    console.log(`=== ${test.name} ===`);
    console.log('Payload:', JSON.stringify(test.payload));
    
    try {
      const updateResponse = await axios.put(taskUrl, test.payload, { headers });
      console.log('Update response:', JSON.stringify(updateResponse.data));
      
      await new Promise(r => setTimeout(r, 1000));
      
      const verifyTask = await axios.get(taskUrl, { headers });
      console.log('After update - formatted_duration:', verifyTask.data.formatted_duration);
      
      if (verifyTask.data.formatted_duration === '2h') {
        console.log('');
        console.log('✅ SUCCESS! Duration updated to 2h');
        console.log('Working payload:', JSON.stringify(test.payload));
        
        await axios.put(taskUrl, { formatted_duration: '1h' }, { headers });
        console.log('Reset to 1h');
        process.exit(0);
      } else {
        console.log('❌ Duration not changed, still:', verifyTask.data.formatted_duration);
      }
    } catch (error: any) {
      console.log('Error:', error.response?.status, JSON.stringify(error.response?.data) || error.message);
    }
    console.log('');
  }
  
  console.log('=== No working method found ===');
  process.exit(1);
}

testSplynxUpdate().catch(e => {
  console.error('Script error:', e.message);
  process.exit(1);
});
