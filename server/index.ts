import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
console.log('📁 Loading API routes...');
import { apiRouter } from "./routes/index";
console.log('🚀 API routes loaded:', typeof apiRouter);
import { setupVite, serveStatic, log } from "./vite";
import { AuthService, authenticateToken, requireRole } from "./auth";
import { eq, and, sql } from "drizzle-orm";
import { db } from './db';
import { users, teams } from '@shared/schema';
import { storage } from './storage';
import { createHostnameRouter, buildReplitDomains, type HostnameConfig } from './middleware/hostname-router';

// Process-level error handling to prevent crashes
process.on('unhandledRejection', (reason: any, promise) => {
  console.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
  
  // Check if error is retryable database/network error
  const isRetryableError = 
    reason?.code === '57P01' || // admin shutdown
    reason?.code === '57P02' || // crash shutdown  
    reason?.code === '57P03' || // cannot connect now
    reason?.code === 'ECONNRESET' ||
    reason?.code === 'ETIMEDOUT' ||
    reason?.code === 'ENOTFOUND' ||
    reason?.message?.includes('terminating connection') ||
    reason?.message?.includes('connection terminated') ||
    reason?.message?.includes('Connection error') ||
    reason?.message?.includes('network error');
  
  if (isRetryableError) {
    console.error('Retryable error detected, continuing process...');
    // Log but don't exit on retryable errors
    return;
  }
  
  // For non-retryable errors, still exit in production
  if (process.env.NODE_ENV === 'development') {
    console.error('Continuing in development mode...');
  } else {
    console.error('Shutting down due to non-retryable unhandled promise rejection');
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Always exit on uncaught exceptions as they indicate critical issues
  process.exit(1);
});

const app = express();
app.set('trust proxy', true);

// Clean CORS configuration for application API
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // In production, allow Replit domains and custom domains
    if (process.env.NODE_ENV === 'production') {
      // Allow all Replit domains and custom domains
      const allowedPatterns = [
        /\.replit\.app$/,
        /\.repl\.co$/,
        /\.replit\.dev$/,
        /country-connect\.co\.uk$/,
      ];
      
      const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
      if (isAllowed) {
        return callback(null, true);
      }
      
      // Also allow if custom domains are configured
      if (process.env.ALLOWED_ORIGINS) {
        const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
      }
      
      // Reject other origins in production
      return callback(new Error('Not allowed by CORS'));
    }
    
    // In development, allow localhost and common dev ports
    const devOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://localhost:5000',
    ];
    
    if (devOrigins.includes(origin) || origin.includes('.replit.dev')) {
      return callback(null, true);
    }
    
    return callback(null, true); // Allow in dev mode by default
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Security middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Built-in Express middleware for JSON parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cookie parser for preview authentication
app.use(cookieParser());

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Serve website resources (images, fonts, etc.)
app.use('/assets', express.static(path.join(__dirname, '..', 'attached_assets', 'website-resources')));

// Serve menu icons
app.use('/menu-icons', express.static('public/menu-icons'));

// Serve service worker for offline app PWA
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Service-Worker-Allowed', '/offline-app');
  res.sendFile(path.join(__dirname, '..', 'public', 'sw.js'));
});

// Serve PWA manifest
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(path.join(__dirname, '..', 'public', 'manifest.json'));
});

// Serve PWA icons
app.use('/icons', express.static('public/icons'));

// Test route directly in main server
app.get('/api/test', (req, res) => {
  console.log('🎉 TEST ROUTE HIT!');
  res.json({ message: 'Test route works!', timestamp: new Date().toISOString() });
});

// Team Members API
app.get('/api/core/teams/:teamId/members', authenticateToken, async (req: any, res: Response) => {
  console.log('📍 Core /teams/:teamId/members endpoint hit');
  try {
    const teamId = parseInt(req.params.teamId);
    const { teamMembers } = await import('@shared/schema');
    
    const members = await db
      .select({
        userId: users.id,
        fullName: users.fullName,
        email: users.email,
        role: teamMembers.role
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));
    
    res.json(members);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

app.post('/api/core/teams/:teamId/members', authenticateToken, async (req: any, res: Response) => {
  console.log('📍 Core POST /teams/:teamId/members endpoint hit', req.body);
  try {
    const { userId, role } = req.body;
    const teamId = parseInt(req.params.teamId);
    
    // Import team_members table
    const { teamMembers } = await import('@shared/schema');
    
    // Insert the team member
    const [newMember] = await db
      .insert(teamMembers)
      .values({
        teamId,
        userId,
        role: role || 'Member'
      })
      .onConflictDoUpdate({
        target: [teamMembers.teamId, teamMembers.userId],
        set: { role: role || 'Member' }
      })
      .returning();
    
    res.json({ success: true, member: newMember });
  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

app.patch('/api/core/teams/:teamId/members/:userId', authenticateToken, async (req: any, res: Response) => {
  console.log('📍 Core PATCH /teams/:teamId/members/:userId endpoint hit');
  try {
    const { role } = req.body;
    res.json({ success: true, role });
  } catch (error) {
    console.error('Error updating team member:', error);
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

app.delete('/api/core/teams/:teamId/members/:userId', authenticateToken, async (req: any, res: Response) => {
  console.log('📍 Core DELETE /teams/:teamId/members/:userId endpoint hit');
  try {
    const teamId = parseInt(req.params.teamId);
    const userId = parseInt(req.params.userId);
    const { teamMembers } = await import('@shared/schema');
    
    await db
      .delete(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({ error: 'Failed to remove team member' });
  }
});

// User role update API
app.patch('/api/core/users/:userId/role', authenticateToken, async (req: any, res: Response) => {
  console.log('📍 Core PATCH /users/:userId/role endpoint hit');
  try {
    const userId = parseInt(req.params.userId);
    const { role } = req.body;
    
    if (req.user!.role !== 'super_admin' && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    await db
      .update(users)
      .set({ role })
      .where(and(
        eq(users.id, userId),
        eq(users.organizationId, req.user!.organizationId)
      ));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});




// Mount API routes
console.log('🔗 Mounting API routes at /api');
app.use('/api', apiRouter);
console.log('✅ API routes mounted successfully');

// Mount feature management routes directly
import featureManagementRoutes from './routes/feature-management';
app.use('/api', featureManagementRoutes);
console.log('✅ Feature management routes mounted directly at /api');

// Mount CSS proxy routes for WordPress assets
import cssProxyRoutes from './routes/css-proxy';
app.use('/', cssProxyRoutes);
console.log('✅ CSS proxy routes mounted');

// Serve objects route (outside API namespace)
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
app.get('/objects/:objectPath(*)', async (req, res) => {
  const objectStorageService = new ObjectStorageService();
  try {
    const objectFile = await objectStorageService.getObjectEntityFile(
      req.path,
    );
    objectStorageService.downloadObject(objectFile, res);
  } catch (error) {
    console.error('Error serving object:', error);
    if (error instanceof ObjectNotFoundError) {
      return res.sendStatus(404);
    }
    return res.sendStatus(500);
  }
});

// Authentication check endpoint
app.get('/api/auth/check', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await AuthService.getUserById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ 
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        organizationId: user.organizationId,
        isActive: user.isActive,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({ error: 'Authentication check failed' });
  }
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Configure hostname-based routing for app vs public website
const replitDomains = buildReplitDomains();

const hostnameConfig: HostnameConfig = {
  appHostnames: [
    ...replitDomains.appDomains,
    ...(process.env.APP_HOSTNAMES?.split(',').map(h => h.trim()) || [])
  ],
  websiteHostnames: [
    ...replitDomains.websiteDomains,
    ...(process.env.WEBSITE_HOSTNAMES?.split(',').map(h => h.trim()) || [])
  ],
  previewHostnames: [
    ...replitDomains.previewDomains,
    ...(process.env.PREVIEW_HOSTNAMES?.split(',').map(h => h.trim()) || [])
  ],
  hostnameToOrg: new Map([
    // Map website hostnames to organization IDs
    ...replitDomains.websiteDomains.map(h => [h, 4] as [string, number]),
    // Map preview hostnames to organization IDs (same as website)
    ...replitDomains.previewDomains.map(h => [h, 4] as [string, number]),
    // Custom hostname mappings from environment
    ...(process.env.WEBSITE_HOSTNAME_ORG_MAP?.split(';').map(mapping => {
      const [hostname, orgId] = mapping.split(':');
      return [hostname.trim(), parseInt(orgId)] as [string, number];
    }) || [])
  ])
};

console.log('🌐 Hostname routing configured:');
console.log('  App hostnames:', hostnameConfig.appHostnames);
console.log('  Website hostnames:', hostnameConfig.websiteHostnames);
console.log('  Preview hostnames:', hostnameConfig.previewHostnames);

// Apply hostname routing middleware
app.use(createHostnameRouter(hostnameConfig));

// Mount public website routes for public website hostnames
// These serve published pages at root-level URLs like /residential, /business
import publicWebsiteRoutes from './routes/public-website.js';
app.use('/', publicWebsiteRoutes);

// 404 handler for API routes (moved here before server.listen)
app.use('/api/*', (req: Request, res: Response) => {
  console.log('🚫 404 handler hit for:', req.originalUrl);
  res.status(404).json({ error: 'API endpoint not found' });
});

const PORT = parseInt(process.env.PORT || '5000');

// Create HTTP server without listening yet
import { createServer } from 'http';
const server = createServer(app);

// Setup Vite BEFORE server starts listening
async function startServer() {
  // Setup Vite middleware first
  if (process.env.NODE_ENV !== "production") {
    try {
      await setupVite(app, server);
      log('Vite development server setup complete');
    } catch (error) {
      console.error('Failed to setup Vite development server:', error);
      // Fallback to static file serving
      const staticPath = path.join(__dirname, "../dist/public");
      app.use(express.static(staticPath));
      
      // SPA fallback for client-side routing
      app.get('*', (req, res) => {
        const indexPath = path.join(staticPath, 'index.html');
        if (require('fs').existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).json({ error: 'Frontend not built. Run: npm run build' });
        }
      });
    }
  } else {
    serveStatic(app);
  }

  // Now start the server
  server.listen(PORT, "0.0.0.0", async () => {
    log(`Server running on http://0.0.0.0:${PORT}`);
    log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    log(`Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
    
    // Initialize cron jobs for recurring task generation
    try {
      const { initializeCronJobs } = await import('./services/cronJobs');
      initializeCronJobs();
      log('Cron jobs initialized for work item generation');
    } catch (error) {
      console.error('Failed to initialize cron jobs:', error);
    }
    
    // Initialize workflow scheduler for all organizations
    try {
      const { ScheduleManager } = await import('./services/workflow/ScheduleManager');
      const { organizations } = await import('@shared/schema');
      
      // Get all active organizations
      const orgs = await db.select().from(organizations).where(eq(organizations.isActive, true));
      
      // Initialize scheduler for each organization
      for (const org of orgs) {
        const scheduleManager = new ScheduleManager();
        await scheduleManager.initialize(String(org.id));
        log(`Workflow scheduler initialized for organization ${org.id}`);
      }
    } catch (error) {
      console.error('Failed to initialize workflow schedulers:', error);
    }
  });
}

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Global error handler
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Global error handler:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler moved above server.listen()



export default app;