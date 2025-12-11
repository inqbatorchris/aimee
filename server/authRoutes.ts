import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { users, organizations } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { AuthService, authenticateToken } from './auth';
import { storage } from './storage';

const router = express.Router();

// Note: Rate limiting removed - using Cloudflare for protection instead

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters').optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = loginSchema.parse(req.body);
    
    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, validatedData.email));
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Verify password
    if (!user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(validatedData.password, user.passwordHash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid password. Please check your password and try again.' });
    }

    // Update last login
    await db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Generate JWT token
    const token = AuthService.generateToken(user.id);
    
    // Set auth cookie for preview functionality
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // Get user's organization (simplified for launch)
    let organization = null;
    if (user.organizationId) {
      try {
        const [org] = await db.select({
          id: organizations.id,
          name: organizations.name,
          subscriptionTier: organizations.subscriptionTier,
          isActive: organizations.isActive
        }).from(organizations).where(eq(organizations.id, user.organizationId));
        organization = org;
      } catch (error) {
        console.warn('Failed to fetch organization:', error);
      }
    }
    
    // Return success response
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        organizationId: user.organizationId,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        avatarUrl: user.avatarUrl,
      },
      organization,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Register endpoint
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = registerSchema.parse(req.body);
    
    // Check if user already exists
    const [existingUser] = await db.select().from(users).where(eq(users.email, validatedData.email));
    
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validatedData.password, 12);
    
    // Create organization if provided
    let organizationId = null;
    if (validatedData.organizationName) {
      const [organization] = await db.insert(organizations).values({
        name: validatedData.organizationName,
        subscriptionTier: 'basic',
        isActive: true,
      }).returning();
      organizationId = organization.id;
    }

    // Create user
    const [user] = await db.insert(users).values({
      email: validatedData.email,
      passwordHash,
      fullName: validatedData.fullName,
      username: validatedData.email, // Use email as username for now
      role: organizationId ? 'admin' : 'team_member', // First user in org becomes admin
      organizationId,
      isActive: true,
      isEmailVerified: false, // Will be verified via email later
      invitationAccepted: true,
    }).returning();

    // Generate JWT token
    const token = AuthService.generateToken(user.id);
    
    // Return success response
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        organizationId: user.organizationId,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Get current user endpoint
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user's organization (simplified for launch)
    let organization = null;
    if (req.user.organizationId) {
      try {
        const [org] = await db.select({
          id: organizations.id,
          name: organizations.name,
          subscriptionTier: organizations.subscriptionTier,
          isActive: organizations.isActive
        }).from(organizations).where(eq(organizations.id, req.user.organizationId));
        organization = org;
      } catch (error) {
        console.warn('Failed to fetch organization:', error);
      }
    }

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        fullName: req.user.fullName,
        role: req.user.role,
        organizationId: req.user.organizationId,
        isActive: req.user.isActive,
        isEmailVerified: req.user.isEmailVerified,
        avatarUrl: req.user.avatarUrl,
      },
      organization,
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

// Get theme settings for authenticated user's organization
router.get('/theme-settings', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.organizationId) {
      return res.status(401).json({ error: 'Not authenticated or no organization' });
    }

    const settings = await storage.getThemeSettings(req.user.organizationId);
    res.json(settings);
  } catch (error) {
    console.error('Error fetching theme settings:', error);
    res.status(500).json({ error: 'Failed to fetch theme settings' });
  }
});

// Save theme settings for authenticated user's organization
router.post('/theme-settings', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.organizationId) {
      return res.status(401).json({ error: 'Not authenticated or no organization' });
    }

    const themeData = req.body;
    
    // Try to update existing settings first
    const updatedSettings = await storage.updateThemeSettings(req.user.organizationId, themeData);
    
    if (updatedSettings) {
      res.json(updatedSettings);
    } else {
      // If no settings exist yet, create new ones
      const newSettings = await storage.createThemeSettings({
        organizationId: req.user.organizationId,
        ...themeData
      });
      res.json(newSettings);
    }
  } catch (error) {
    console.error('Error saving theme settings:', error);
    res.status(500).json({ error: 'Failed to save theme settings' });
  }
});

// Change password endpoint (for authenticated users changing their own password)
router.post('/change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Get the current user from database
    const [user] = await db.select().from(users).where(eq(users.id, req.user.id));

    if (!user || !user.passwordHash) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update the password
    await db.update(users)
      .set({ passwordHash: newPasswordHash })
      .where(eq(users.id, req.user.id));

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Logout endpoint (client-side token removal, server-side could blacklist)
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    // In a production app, you might want to blacklist the token
    // For now, we'll rely on client-side token removal
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Forgot password endpoint
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const validatedData = forgotPasswordSchema.parse(req.body);
    
    // Check if user exists
    const [user] = await db.select().from(users).where(eq(users.email, validatedData.email));
    
    if (!user) {
      // Don't reveal whether user exists or not
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    // Generate reset token with JWT
    const resetToken = await AuthService.generatePasswordResetToken(validatedData.email);
    
    // In development mode, return the reset link for testing
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const resetLink = `/reset-password/${resetToken}`;
    
    if (isDevelopment) {
      console.log('=== Password Reset Link (Development Mode) ===');
      console.log(`Reset Link: ${resetLink}`);
      console.log('==============================================');
      
      // In development, return the link for testing
      return res.json({ 
        message: 'Password reset link generated',
        devMode: {
          resetLink,
          note: 'In production, this would be sent via email'
        }
      });
    }
    
    // TODO: Implement email sending via SendGrid or Resend
    // Required: Configure email service API key and create password reset email template
    // Example email content:
    // Subject: Reset Your Password
    // Body: Click this link to reset your password: https://yourdomain.com/reset-password/{resetToken}
    
    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Reset password endpoint
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const validatedData = resetPasswordSchema.parse(req.body);
    
    // Reset the password using the token
    const success = await AuthService.resetPassword(validatedData.token, validatedData.password);
    
    if (!success) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    res.json({ message: 'Password has been successfully reset' });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Verify token endpoint
router.post('/verify-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = AuthService.verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get user to ensure they still exist and are active
    const user = await AuthService.getUserById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    res.json({ valid: true, userId: decoded.userId });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Token verification failed' });
  }
});

// Public theme endpoint (no auth required for login page)
router.get('/public-theme', async (req: Request, res: Response) => {
  try {
    // Return default theme for login page
    res.json({
      logoUrl: '',
      companyName: 'aimee.works',
      primaryColor: '#00BFA6'
    });
  } catch (error) {
    console.error('Error fetching public theme:', error);
    res.status(500).json({ error: 'Failed to fetch public theme' });
  }
});

// Theme settings endpoint - requires authentication
router.get('/theme-settings', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const [user] = await db.select().from(users).where(eq(users.id, decoded.userId));
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Get theme settings using storage
    const storage = await import('./storage').then(m => m.storage);
    const themeSettings = await storage.getThemeSettings(user.organizationId || 1);
    res.json(themeSettings || {});
  } catch (error) {
    console.error('Error fetching theme settings:', error);
    res.status(500).json({ error: 'Failed to fetch theme settings' });
  }
});

export default router;