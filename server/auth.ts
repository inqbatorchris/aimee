import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { users, organizations } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { User, Role } from '@shared/schema';

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  throw new Error('JWT_SECRET environment variable is required');
})();
const SALT_ROUNDS = 12;

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateToken(userId: number): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
  }

  static verifyToken(token: string): { userId: number } | null {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: number };
    } catch {
      return null;
    }
  }

  static generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static async getUserById(id: number): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || null;
  }

  static async createUser(userData: {
    email: string;
    password: string;
    fullName: string;
    role: any;
    organizationId?: number;
    permissions?: any[];
  }): Promise<User> {
    const passwordHash = await this.hashPassword(userData.password);
    
    const [user] = await db.insert(users).values({
      email: userData.email,
      username: userData.email, // Use email as username
      passwordHash,
      fullName: userData.fullName,
      role: userData.role,
      organizationId: userData.organizationId || 1,
      permissions: userData.permissions ? JSON.stringify(userData.permissions) : null,
      isEmailVerified: true,
      isActive: true,
    }).returning();

    return user;
  }

  static async login(email: string, password: string): Promise<{ user: User; token: string } | null> {
    const user = await this.getUserByEmail(email);
    if (!user || !user.passwordHash || !user.isActive) {
      return null;
    }

    const isValidPassword = await this.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return null;
    }

    // Update last login
    await db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    const token = this.generateToken(user.id);
    return { user, token };
  }

  // Invitation system removed for clean architecture
  static async validateInvitation(token: string): Promise<any> {
    return null;
  }

  // Invitation system removed for clean architecture
  static async acceptInvitation(token: string, userData: any): Promise<any> {
    return null;
  }

  // Invitation system removed for clean architecture
  static async sendInvitation(): Promise<string> {
    return '';
  }

  static async createInviteRequest(): Promise<void> {
    return;
  }

  static hasPermission(user: User, permission: string): boolean {
    if (user.role === 'super_admin') return true;
    
    const rolePermissions = ['view_own_data']; // Simplified permissions
    return rolePermissions.includes(permission) || user.role === 'admin';
  }

  static async generatePasswordResetToken(email: string): Promise<string> {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    // Store reset token in database (you may need to create a password_reset_tokens table)
    // For now, we'll use a simple in-memory approach with JWT
    const payload = {
      email,
      purpose: 'password_reset',
      exp: Math.floor(expiresAt.getTime() / 1000)
    };

    return jwt.sign(payload, JWT_SECRET);
  }

  static async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      if (decoded.purpose !== 'password_reset') {
        return false;
      }

      const user = await this.getUserByEmail(decoded.email);
      if (!user) {
        return false;
      }

      const passwordHash = await this.hashPassword(newPassword);
      
      await db.update(users)
        .set({ passwordHash })
        .where(eq(users.email, decoded.email));

      return true;
    } catch (error) {
      console.error('Reset password error:', error);
      return false;
    }
  }
}

// Middleware functions
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  // Try to get token from Authorization header first
  const authHeader = req.headers.authorization;
  let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  // Fall back to cookie if no Authorization header
  if (!token && req.cookies?.authToken) {
    token = req.cookies.authToken;
  }

  // Debug auth in development
  if (req.path.includes('/api/features') && process.env.NODE_ENV === 'development') {
    console.log('Feature API Auth:', req.path, token ? 'Token present' : 'No token');
  }

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  // Handle demo authentication token
  if (token === 'demo-auth-token') {
    req.user = {
      id: 1,
      organizationId: 1,
      username: 'admin',
      passwordHash: null,
      email: 'admin@test.com',
      role: 'admin',
      userType: 'human',
      permissions: null,
      isActive: true,
      isEmailVerified: true,
      invitationAccepted: true,
      lastLoginAt: new Date(),
      customerId: null,
      splynxAdminId: 51,
      splynxCustomerId: null,
      fullName: 'Admin User',
      phone: null,
      address: null,
      city: null,
      postcode: null,
      canAssignTickets: true,
      firebaseUid: null,
      vapiApiKey: null,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return next();
  }

  const decoded = AuthService.verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  const user = await AuthService.getUserById(decoded.userId);
  console.log('Authenticated user from DB:', { id: user?.id, email: user?.email, role: user?.role, organizationId: user?.organizationId });
  
  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'User not found or inactive' });
  }

  req.user = user;
  next();
};

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!AuthService.hasPermission(req.user, permission)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireRole = (roles: Role | Role[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    console.log('requireRole check - User role:', req.user.role);
    console.log('requireRole check - Allowed roles:', allowedRoles);
    console.log('requireRole check - Role type:', typeof req.user.role);
    console.log('requireRole check - Includes result:', allowedRoles.includes(req.user.role as Role));

    if (!allowedRoles.includes(req.user.role as Role)) {
      return res.status(403).json({ message: 'Insufficient role permissions' });
    }

    next();
  };
};