import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { authenticateToken } from '../auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Ensure upload directory exists
const uploadDir = 'uploads/logos';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for logo uploads
const logoStorage = multer.diskStorage({
  destination: 'uploads/logos/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `logo-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|svg/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, svg) are allowed'));
    }
  }
});

// Schema validators
const createOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  adminEmail: z.string().email(),
  subdomain: z.string().min(3).max(63).regex(/^[a-z0-9-]+$/).optional(),
});

const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  domain: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  logoUrl: z.string().optional(),
  subscriptionTier: z.string().optional(),
  maxUsers: z.number().optional(),
  isActive: z.boolean().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  timeZone: z.string().optional(),
  currency: z.string().optional(),
  billingEmail: z.string().email().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  settings: z.record(z.any()).optional(),
});

// Get all organizations (super admin only)
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is super admin
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }
    
    const organizations = await storage.getOrganizations();
    
    // Return organizations directly without tenant/subscription enrichment
    const enrichedOrgs = organizations;
    
    res.json({ organizations: enrichedOrgs });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Create new organization (super admin only)
router.post('/', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is super admin
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }
    
    const data = createOrganizationSchema.parse(req.body);
    
    // Subdomain is optional for MVP
    
    // Create organization
    const organization = await storage.createOrganization({
      name: data.name,
      domain: data.subdomain ? `${data.subdomain}.aimee.works` : null,
      isActive: true,
      settings: {},
    });
    
    // Create admin user for the organization
    const adminUser = await storage.createUser({
      email: data.adminEmail,
      username: data.adminEmail.split('@')[0], // Generate username from email
      fullName: `Admin - ${data.name}`,
      role: 'admin',
      organizationId: organization.id,
      isActive: true,
      // Password will be set via invitation email
    });
    
    // No tenant or subscription needed for MVP
    
    // Activity logging can be added later
    
    res.status(201).json({
      organization,
      adminUser: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      },
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// Get organization details
router.get('/:id', authenticateToken, async (req: any, res) => {
  try {
    const orgId = parseInt(req.params.id);
    
    // Check permission
    if (req.user.role !== 'super_admin' && req.user.organizationId !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const organization = await storage.getOrganization(orgId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    const users = await storage.getUsers(orgId);
    
    res.json({
      organization,
      stats: {
        userCount: users.length,
        activeUsers: users.filter(u => u.isActive).length,
      },
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Update organization
router.patch('/:id', authenticateToken, async (req: any, res) => {
  try {
    const orgId = parseInt(req.params.id);
    const data = updateOrganizationSchema.parse(req.body);
    
    // Check permission
    if (req.user.role !== 'super_admin' && 
        (req.user.organizationId !== orgId || req.user.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const organization = await storage.updateOrganization(orgId, data);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Activity logging can be added later
    
    res.json({ organization });
  } catch (error) {
    console.error('Error updating organization:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// Upload organization logo
router.post('/:id/logo', authenticateToken, upload.single('logo'), async (req: any, res) => {
  try {
    const orgId = parseInt(req.params.id);
    
    // Check permission
    if (req.user.role !== 'super_admin' && 
        (req.user.organizationId !== orgId || req.user.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Generate URL for uploaded file
    const logoUrl = `/uploads/logos/${req.file.filename}`;
    
    // Update organization with logo URL
    const organization = await storage.updateOrganization(orgId, {
      logoUrl
    });
    
    if (!organization) {
      // Clean up uploaded file if organization not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    res.json({ organization });
  } catch (error) {
    console.error('Error uploading logo:', error);
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('Error deleting uploaded file:', e);
      }
    }
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// Upload square logo
router.post('/:id/square-logo', authenticateToken, upload.single('squareLogo'), async (req: any, res) => {
  try {
    const orgId = parseInt(req.params.id);
    
    // Check permission
    if (req.user.role !== 'super_admin' && 
        (req.user.organizationId !== orgId || req.user.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Generate URL for uploaded file - use square-logo prefix
    const squareLogoUrl = `/uploads/logos/${req.file.filename.replace(/^logo-/, 'square-logo-')}`;
    
    // Rename the file to have square-logo prefix
    const oldPath = req.file.path;
    const newFilename = req.file.filename.replace(/^logo-/, 'square-logo-');
    const newPath = `uploads/logos/${newFilename}`;
    
    try {
      fs.renameSync(oldPath, newPath);
    } catch (renameError) {
      console.error('Error renaming square logo file:', renameError);
      // If rename fails, use original filename
      const squareLogoUrl = `/uploads/logos/${req.file.filename}`;
    }
    
    // Update organization with square logo URL
    const organization = await storage.updateOrganization(orgId, {
      squareLogoUrl: `/uploads/logos/${newFilename}`
    });
    
    if (!organization) {
      // Clean up uploaded file if organization not found
      try {
        fs.unlinkSync(newPath);
      } catch (e) {
        // Try original path if rename failed
        try {
          fs.unlinkSync(oldPath);
        } catch (e2) {
          console.error('Error deleting uploaded file:', e2);
        }
      }
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    res.json({ organization });
  } catch (error) {
    console.error('Error uploading square logo:', error);
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('Error deleting uploaded file:', e);
      }
    }
    res.status(500).json({ error: 'Failed to upload square logo' });
  }
});

// Upload dark mode logo
router.post('/:id/dark-logo', authenticateToken, upload.single('darkLogo'), async (req: any, res) => {
  try {
    const orgId = parseInt(req.params.id);
    
    // Check permission
    if (req.user.role !== 'super_admin' && 
        (req.user.organizationId !== orgId || req.user.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Generate URL for uploaded file - use dark-logo prefix
    const oldPath = req.file.path;
    const newFilename = req.file.filename.replace(/^logo-/, 'dark-logo-');
    const newPath = `uploads/logos/${newFilename}`;
    
    try {
      fs.renameSync(oldPath, newPath);
    } catch (renameError) {
      console.error('Error renaming dark logo file:', renameError);
    }
    
    // Update organization with dark logo URL
    const organization = await storage.updateOrganization(orgId, {
      darkLogoUrl: `/uploads/logos/${newFilename}`
    });
    
    if (!organization) {
      try {
        fs.unlinkSync(newPath);
      } catch (e) {
        try {
          fs.unlinkSync(oldPath);
        } catch (e2) {
          console.error('Error deleting uploaded file:', e2);
        }
      }
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    res.json({ organization });
  } catch (error) {
    console.error('Error uploading dark logo:', error);
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('Error deleting uploaded file:', e);
      }
    }
    res.status(500).json({ error: 'Failed to upload dark logo' });
  }
});

// Upload dark mode square logo
router.post('/:id/dark-square-logo', authenticateToken, upload.single('darkSquareLogo'), async (req: any, res) => {
  try {
    const orgId = parseInt(req.params.id);
    
    // Check permission
    if (req.user.role !== 'super_admin' && 
        (req.user.organizationId !== orgId || req.user.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Generate URL for uploaded file - use dark-square-logo prefix
    const oldPath = req.file.path;
    const newFilename = req.file.filename.replace(/^logo-/, 'dark-square-logo-');
    const newPath = `uploads/logos/${newFilename}`;
    
    try {
      fs.renameSync(oldPath, newPath);
    } catch (renameError) {
      console.error('Error renaming dark square logo file:', renameError);
    }
    
    // Update organization with dark square logo URL
    const organization = await storage.updateOrganization(orgId, {
      darkSquareLogoUrl: `/uploads/logos/${newFilename}`
    });
    
    if (!organization) {
      try {
        fs.unlinkSync(newPath);
      } catch (e) {
        try {
          fs.unlinkSync(oldPath);
        } catch (e2) {
          console.error('Error deleting uploaded file:', e2);
        }
      }
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    res.json({ organization });
  } catch (error) {
    console.error('Error uploading dark square logo:', error);
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('Error deleting uploaded file:', e);
      }
    }
    res.status(500).json({ error: 'Failed to upload dark square logo' });
  }
});

// Delete organization (super admin only)
router.delete('/:id', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is super admin
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }
    
    const orgId = parseInt(req.params.id);
    const hardDelete = req.query.hard === 'true';
    
    const organization = await storage.getOrganization(orgId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    if (hardDelete) {
      // Hard delete - remove all data
      // Note: In production, this should be a background job
      // and should handle all related data carefully
      
      // For now, just mark as deleted
      await storage.updateOrganization(orgId, {
        isActive: false,
      });
    } else {
      // Soft delete - just suspend
      await storage.updateOrganization(orgId, {
        isActive: false,
      });
    }
    
    // Activity logging can be added later
    
    res.json({ 
      success: true,
      message: hardDelete ? 'Organization deleted' : 'Organization suspended',
    });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({ error: 'Failed to delete organization' });
  }
});

// Activate organization
router.post('/:id/activate', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is super admin
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }
    
    const orgId = parseInt(req.params.id);
    
    const organization = await storage.updateOrganization(orgId, {
      isActive: true,
    });
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Activity logging can be added later
    
    res.json({ organization });
  } catch (error) {
    console.error('Error activating organization:', error);
    res.status(500).json({ error: 'Failed to activate organization' });
  }
});

// Suspend organization
router.post('/:id/suspend', authenticateToken, async (req: any, res) => {
  try {
    // Check if user is super admin
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }
    
    const orgId = parseInt(req.params.id);
    
    const organization = await storage.updateOrganization(orgId, {
      isActive: false,
    });
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Activity logging can be added later
    
    res.json({ organization });
  } catch (error) {
    console.error('Error suspending organization:', error);
    res.status(500).json({ error: 'Failed to suspend organization' });
  }
});

export default router;