#!/usr/bin/env tsx

import bcrypt from 'bcrypt';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

const SALT_ROUNDS = 12;

async function resetPassword() {
  const email = 'chris.gibbons@country-connect.co.uk';
  const newPassword = 'Chris91880!';
  
  try {
    // Hash the new password
    console.log('Hashing password...');
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    // Update the user's password
    console.log(`Updating password for user: ${email}`);
    const result = await db.update(users)
      .set({ 
        passwordHash,
        updatedAt: new Date()
      })
      .where(eq(users.email, email))
      .returning();
    
    if (result.length > 0) {
      console.log('✓ Password successfully reset for:', email);
      console.log('User details:', {
        id: result[0].id,
        email: result[0].email,
        fullName: result[0].fullName,
        role: result[0].role,
        isActive: result[0].isActive
      });
    } else {
      console.error('✗ User not found:', email);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Error resetting password:', error);
    process.exit(1);
  }
}

resetPassword();