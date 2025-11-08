#!/usr/bin/env tsx

import bcrypt from 'bcrypt';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';

const API_URL = 'http://localhost:5000';

async function testAuth() {
  console.log('🔐 Testing authentication for chris.gibbons@country-connect.co.uk...\n');
  
  const email = 'chris.gibbons@country-connect.co.uk';
  const password = 'Chris91880!';
  
  try {
    // Test 1: Verify password in database
    console.log('1. Checking password hash in database...');
    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user) {
      console.error('   ❌ User not found');
      return false;
    }
    
    if (!user.passwordHash) {
      console.error('   ❌ User has no password hash');
      return false;
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (isValid) {
      console.log('   ✅ Password hash is valid');
    } else {
      console.error('   ❌ Password hash does not match');
      return false;
    }
    
    // Test 2: Test login endpoint
    console.log('\n2. Testing login endpoint...');
    try {
      const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password
      });
      
      if (loginResponse.data.token) {
        console.log('   ✅ Login successful');
        console.log(`   Token: ${loginResponse.data.token.substring(0, 50)}...`);
        
        // Test 3: Test preview endpoint with token
        console.log('\n3. Testing preview endpoint with authentication...');
        const previewResponse = await axios.get(`${API_URL}/preview/home`, {
          headers: {
            'Authorization': `Bearer ${loginResponse.data.token}`,
            'Cookie': `authToken=${loginResponse.data.token}`
          }
        });
        
        if (previewResponse.status === 200) {
          console.log('   ✅ Preview endpoint accessible');
          console.log(`   Response length: ${previewResponse.data.length} characters`);
          console.log(`   Page title: ${previewResponse.data.match(/<title>(.*?)<\/title>/)?.[1] || 'Not found'}`);
        }
        
        return true;
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.error('   ❌ Login failed: Invalid credentials');
        console.error(`   Error: ${error.response?.data?.error || 'Unknown error'}`);
      } else {
        console.error('   ❌ Login request failed:', error.message);
      }
      return false;
    }
    
  } catch (error) {
    console.error('Error during testing:', error);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('AUTH & PREVIEW FUNCTIONALITY TEST');
  console.log('='.repeat(60));
  
  const success = await testAuth();
  
  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('✅ ALL TESTS PASSED');
    console.log('\nCredentials are working correctly:');
    console.log('Email: chris.gibbons@country-connect.co.uk');
    console.log('Password: Chris91880!');
    console.log('\nPreview functionality is working at: /preview');
  } else {
    console.log('❌ TESTS FAILED');
    console.log('Please check the error messages above.');
  }
  console.log('='.repeat(60));
  
  process.exit(success ? 0 : 1);
}

main();