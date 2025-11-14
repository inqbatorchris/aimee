import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { authenticateToken, requireRole } from '../auth';

const router = Router();

// Schema validators
const createTenantSchema = z.object({
  organizationId: z.number(),
  subdomain: z.string().min(3).max(63).regex(/^[a-z0-9-]+$/),
  databaseUrl: z.string().optional().nullable(),
  settings: z.record(z.any()).optional().default({}),
});

const updateTenantSchema = z.object({
  subdomain: z.string().min(3).max(63).regex(/^[a-z0-9-]+$/).optional(),
  databaseUrl: z.string().optional().nullable(),
  settings: z.record(z.any()).optional(),
});

// Get all tenants (super admin only)
router.get('/', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const organizations = await storage.getOrganizations();
    const tenants = await Promise.all(
      organizations.map(async (org) => {
        const tenant = await storage.getTenant(org.id);
        return {
          ...tenant,
          organization: org,
        };
      })
    );
    
    res.json({ tenants: tenants.filter(t => t !== undefined) });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// Get tenant by organization ID
router.get('/org/:orgId', authenticateToken, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    
    // Check permission
    if (req.user.role !== 'super_admin' && req.user.organizationId !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const tenant = await storage.getTenant(orgId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.json({ tenant });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

// Create tenant (super admin only)
router.post('/', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const data = createTenantSchema.parse(req.body);
    
    // Check if subdomain is available
    const existing = await storage.getTenantBySubdomain(data.subdomain);
    if (existing) {
      return res.status(400).json({ error: 'Subdomain already taken' });
    }
    
    // Check if organization already has a tenant
    const orgTenant = await storage.getTenant(data.organizationId);
    if (orgTenant) {
      return res.status(400).json({ error: 'Organization already has a tenant' });
    }
    
    const tenant = await storage.createTenant(data);
    
    // Log activity
    await storage.logActivity({
      organizationId: data.organizationId,
      userId: req.user.id,
      action: 'tenant.created',
      entityType: 'tenant',
      entityId: tenant.id,
      metadata: { subdomain: data.subdomain },
    });
    
    res.status(201).json({ tenant });
  } catch (error) {
    console.error('Error creating tenant:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

// Update tenant
router.put('/:id', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const tenantId = req.params.id;
    const data = updateTenantSchema.parse(req.body);
    
    // Check subdomain availability if changing
    if (data.subdomain) {
      const existing = await storage.getTenantBySubdomain(data.subdomain);
      if (existing && existing.id !== tenantId) {
        return res.status(400).json({ error: 'Subdomain already taken' });
      }
    }
    
    const tenant = await storage.updateTenant(tenantId, data);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.json({ tenant });
  } catch (error) {
    console.error('Error updating tenant:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

// Check subdomain availability
router.get('/check-subdomain', async (req, res) => {
  try {
    const subdomain = req.query.subdomain as string;
    
    if (!subdomain || subdomain.length < 3) {
      return res.status(400).json({ error: 'Invalid subdomain' });
    }
    
    const existing = await storage.getTenantBySubdomain(subdomain);
    res.json({ 
      available: !existing,
      subdomain,
    });
  } catch (error) {
    console.error('Error checking subdomain:', error);
    res.status(500).json({ error: 'Failed to check subdomain' });
  }
});

// Provision database for tenant
router.post('/:id/provision-db', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const tenantId = req.params.id;
    
    // In production, this would:
    // 1. Create a new database
    // 2. Run migrations
    // 3. Set up connection pool
    // 4. Update tenant record with connection string
    
    // For now, we'll just simulate it
    const databaseUrl = `postgresql://tenant_${tenantId}:password@localhost:5432/tenant_${tenantId}`;
    
    const tenant = await storage.updateTenant(tenantId, {
      databaseUrl,
      settings: {
        dbProvisioned: true,
        dbProvisionedAt: new Date().toISOString(),
      },
    });
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.json({ 
      tenant,
      message: 'Database provisioned successfully',
    });
  } catch (error) {
    console.error('Error provisioning database:', error);
    res.status(500).json({ error: 'Failed to provision database' });
  }
});

export default router;