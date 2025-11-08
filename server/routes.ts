import { Router } from 'express';
import express from 'express';
import { storage } from './storage';
import jwt from 'jsonwebtoken';
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";

const apiRouter = Router();

// Apply JSON middleware to all routes
apiRouter.use(express.json());

// JWT Authentication Middleware
const authenticateJWT = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.userId = user.userId;
    next();
  });
};

// Mount auth routes
import authRoutes from './authRoutes';
apiRouter.use('/auth', authRoutes);

// Mount dev routes
import devRoutes from './routes/dev';
apiRouter.use('/dev', devRoutes);

// Mount multi-tenant routes
import organizationsRoutes from './routes/organizations';
import tenantsRoutes from './routes/tenants';
import subscriptionsRoutes from './routes/subscriptions';
import strategyRoutes from './routes/strategy';
import workItemsRoutes from './routes/work-items';
import fieldAppRoutes from './routes/field-app';

apiRouter.use('/organizations', organizationsRoutes);
apiRouter.use('/tenants', tenantsRoutes);
apiRouter.use('/subscriptions', subscriptionsRoutes);
apiRouter.use('/strategy', strategyRoutes);
apiRouter.use('/work-items', workItemsRoutes);
apiRouter.use('/field-app', fieldAppRoutes);

// Import authenticateToken from auth.ts
import { authenticateToken } from './auth';

// Object Storage Routes
// Upload route - get presigned URL for avatar uploads
apiRouter.post('/objects/upload', authenticateToken, async (req: any, res) => {
  try {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  } catch (error) {
    console.error('Error getting upload URL:', error);
    res.status(500).json({ error: 'Failed to get upload URL' });
  }
});

// Avatar update route - set ACL policy and update user avatar URL
apiRouter.put('/user/avatar', authenticateToken, async (req: any, res) => {
  const { avatarURL } = req.body;
  
  if (!avatarURL) {
    return res.status(400).json({ error: 'avatarURL is required' });
  }

  try {
    const objectStorageService = new ObjectStorageService();
    const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
      avatarURL,
      {
        owner: req.user.id.toString(),
        visibility: "public", // Avatar images should be publicly accessible
      }
    );

    // Update user avatar in database
    await storage.updateUser(req.user.id, { avatarUrl: objectPath });

    res.json({ success: true, avatarUrl: objectPath });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

// Mount menu routes
import menuRoutes from './routes/menu';
apiRouter.use('/menu', menuRoutes);

// Mount Splynx integration routes
import splynxRoutes from './routes/splynx';
apiRouter.use('/splynx', splynxRoutes);

// Mount Airtable integration routes
import airtableRoutes from './routes/airtable';
apiRouter.use('/airtable', airtableRoutes);

// Mount SQL Direct integration routes
import sqlDirectRoutes from './routes/sql-direct';
apiRouter.use('/sql-direct', sqlDirectRoutes);

// Mount fiber network routes
import fiberNetworkRoutes from './routes/fiber-network';
apiRouter.use('/fiber-network', fiberNetworkRoutes);

// Mount workflow routes
import workflowRoutes from './routes/workflows';
apiRouter.use('/workflows', workflowRoutes);

// Mount website pages routes
import websitePagesRoutes from './routes/website-pages';
apiRouter.use('/website-pages', websitePagesRoutes);

// Mount AI Chat routes
import aiChatRoutes from './routes/ai-chat';
apiRouter.use('/ai-chat', aiChatRoutes);

// Mount feature management routes
(async () => {
  try {
    const featureManagementRoutes = (await import('./routes/feature-management.js')).default;
    console.log('Feature management routes type:', typeof featureManagementRoutes);
    if (featureManagementRoutes) {
      apiRouter.use('/', featureManagementRoutes);
      console.log('✅ Feature management routes mounted at /');
    } else {
      console.error('❌ Feature management routes not loaded');
    }
  } catch (error) {
    console.error('❌ Error loading feature management routes:', error);
  }
})();

// Strategy routes (using clean storage)
apiRouter.get('/strategy/objectives', async (req, res) => {
  try {
    // Get org ID from authenticated user (simplified for now)
    const organizationId = 1; // Default to first org
    const objectives = await storage.getObjectives(organizationId);
    res.json(objectives);
  } catch (error) {
    console.error('Error fetching objectives:', error);
    res.status(500).json({ error: 'Failed to fetch objectives' });
  }
});

apiRouter.get('/strategy/check-in-cycles/current', async (req, res) => {
  try {
    const organizationId = 1;
    const cycles = await storage.getCheckInCycles(organizationId);
    res.json(cycles);
  } catch (error) {
    console.error('Error fetching check-in cycles:', error);
    res.status(500).json({ error: 'Failed to fetch check-in cycles' });
  }
});

// Theme settings routes
apiRouter.get('/theme-settings', async (req, res) => {
  try {
    const organizationId = 1;
    const themeSettings = await storage.getThemeSettings(organizationId);
    res.json(themeSettings);
  } catch (error) {
    console.error('Error fetching theme settings:', error);
    res.status(500).json({ error: 'Failed to fetch theme settings' });
  }
});

apiRouter.post('/theme-settings', async (req, res) => {
  try {
    const organizationId = 1;
    const themeData = req.body;
    
    // Update theme settings in database
    const updatedSettings = await storage.updateThemeSettings(organizationId, themeData);
    
    if (updatedSettings) {
      res.json(updatedSettings);
    } else {
      // If no settings exist yet, create new ones
      const newSettings = await storage.createThemeSettings({
        organizationId,
        ...themeData
      });
      res.json(newSettings);
    }
  } catch (error) {
    console.error('Error saving theme settings:', error);
    res.status(500).json({ error: 'Failed to save theme settings' });
  }
});

// User profile routes
apiRouter.get('/user/profile', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

apiRouter.patch('/user/profile', authenticateToken, async (req: any, res) => {
  try {
    const { fullName, email, emailNotifications, pushNotifications, securityAlerts, avatarUrl } = req.body;
    const userId = req.user.id;

    // Update user profile in database
    const updateData: any = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    const updatedUser = await storage.updateUser(userId, updateData);
    
    res.json({ 
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

apiRouter.post('/user/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    // For now, just return success - in real implementation would validate and update password
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

apiRouter.get('/user/activity', async (req, res) => {
  try {
    // Return sample activity data for now
    const activities = [
      {
        id: 1,
        action: 'Profile Updated',
        details: 'Updated personal information',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        action: 'Login',
        details: 'Successful login from Chrome browser',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        action: 'Theme Changed',
        details: 'Updated theme settings',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    res.json(activities);
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

// User info route (legacy)
apiRouter.get('/users/me', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get users for organization (for dropdowns, assignment, etc)
apiRouter.get('/users', authenticateToken, async (req: any, res) => {
  try {
    // Get organization ID from authenticated user
    const organizationId = req.user?.organizationId || 3; // Default to org 3 for current user
    
    // Fetch users for the organization
    const users = await storage.getUsers(organizationId);
    
    // Return users
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Pages API routes
apiRouter.get('/pages', async (req, res) => {
  try {
    const organizationId = 1; // Default to first org for now
    const { status, buildStatus, isCore, includeDeleted } = req.query;
    
    const filters: any = {};
    if (status) filters.status = status;
    if (buildStatus) filters.buildStatus = buildStatus;
    if (isCore !== undefined) filters.isCore = isCore === 'true';
    if (includeDeleted) filters.includeDeleted = includeDeleted === 'true';
    
    const pages = await storage.getPages(organizationId, filters);
    res.json(pages);
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

// Get page by path for dynamic rendering - MUST come before /pages/:id
apiRouter.get('/pages/by-path', async (req, res) => {
  try {
    const { path } = req.query;
    console.log('Fetching page by path:', path);
    
    if (!path) {
      return res.status(400).json({ error: 'Path parameter is required' });
    }
    
    const organizationId = 1; // Default to first org for now
    const page = await storage.getPageByPath(organizationId, path as string);
    
    if (!page) {
      console.log('Page not found for path:', path);
      return res.status(404).json({ error: 'Page not found' });
    }
    
    console.log('Page found:', { path: page.path, title: page.title });
    res.json(page);
  } catch (error) {
    console.error('Error fetching page by path:', error);
    res.status(500).json({ error: 'Failed to fetch page' });
  }
});

apiRouter.get('/pages/:id', async (req, res) => {
  try {
    const page = await storage.getPage(req.params.id);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json(page);
  } catch (error) {
    console.error('Error fetching page:', error);
    res.status(500).json({ error: 'Failed to fetch page' });
  }
});

apiRouter.post('/pages', async (req, res) => {
  try {
    const organizationId = 1; // Default to first org for now
    const pageData = { ...req.body, organizationId };
    const newPage = await storage.createPage(pageData);
    res.status(201).json(newPage);
  } catch (error) {
    console.error('Error creating page:', error);
    res.status(500).json({ error: 'Failed to create page' });
  }
});

apiRouter.put('/pages/:id', async (req, res) => {
  try {
    const updatedPage = await storage.updatePage(req.params.id, req.body);
    if (!updatedPage) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json(updatedPage);
  } catch (error) {
    console.error('Error updating page:', error);
    res.status(500).json({ error: 'Failed to update page' });
  }
});

apiRouter.delete('/pages/:id', async (req, res) => {
  try {
    const { hard } = req.query;
    const deleted = await storage.deletePage(req.params.id, hard === 'true');
    if (!deleted) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json({ message: 'Page deleted successfully' });
  } catch (error) {
    console.error('Error deleting page:', error);
    res.status(500).json({ error: 'Failed to delete page' });
  }
});

// Note: Page-Feature linking route has been removed.
// Features now store linked pages directly in a JSON field.

// Get page content for dynamic rendering
apiRouter.get('/pages/:id/content', async (req, res) => {
  try {
    const page = await storage.getPage(req.params.id);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    // Return structured content for dynamic rendering
    res.json({
      id: page.id,
      title: page.title,
      description: page.description,
      content: page.pageContent || [],
      metadata: page.pageMetadata || {},
      config: page.componentConfig || {},
      status: page.status,
      functions: page.functions || [],
      themeOverrides: page.themeOverrides || {}
    });
  } catch (error) {
    console.error('Error fetching page content:', error);
    res.status(500).json({ error: 'Failed to fetch page content' });
  }
});

export { apiRouter };
export default apiRouter;