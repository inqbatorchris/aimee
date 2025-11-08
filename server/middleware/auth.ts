import { Request, Response, NextFunction } from 'express';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
      organization?: any;
      tenant?: any;
    }
  }
}

// Require authentication
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.user = req.session.user;
  next();
};

// Require super admin role
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
};

// Require admin role (admin or super_admin)
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Require specific role
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Required role: ${roles.join(' or ')}` });
    }
    next();
  };
};

// Organization context middleware
export const organizationContext = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next();
  }
  
  // Super admin can access any organization via header
  if (req.user.role === 'super_admin') {
    const orgIdHeader = req.headers['x-organization-id'];
    if (orgIdHeader) {
      req.organization = { id: parseInt(orgIdHeader as string) };
    }
  } else {
    // Regular users use their assigned organization
    req.organization = { id: req.user.organizationId };
  }
  
  next();
};