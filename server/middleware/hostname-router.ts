import { Request, Response, NextFunction } from 'express';

export interface HostnameConfig {
  appHostnames: string[];
  websiteHostnames: string[];
  previewHostnames: string[];
  hostnameToOrg: Map<string, number>;
}

export function createHostnameRouter(config: HostnameConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const hostname = normalizeHostname(req);
    
    // Check if this is a preview hostname
    if (config.previewHostnames.some(h => matchesHostname(hostname, h))) {
      req.app.locals.isPreviewRequest = true;
      req.app.locals.isWebsiteRequest = false;
      
      // Store organization ID for preview routes
      const orgId = config.hostnameToOrg.get(hostname);
      if (orgId) {
        req.app.locals.previewOrgId = orgId;
      }
    }
    // Check if this is a website-specific hostname
    else if (config.websiteHostnames.some(h => matchesHostname(hostname, h))) {
      req.app.locals.isWebsiteRequest = true;
      req.app.locals.isPreviewRequest = false;
      
      // Store organization ID for website routes
      const orgId = config.hostnameToOrg.get(hostname);
      if (orgId) {
        req.app.locals.websiteOrgId = orgId;
      }
    } else {
      req.app.locals.isWebsiteRequest = false;
      req.app.locals.isPreviewRequest = false;
    }
    
    next();
  };
}

function normalizeHostname(req: Request): string {
  // Respect X-Forwarded-Host if proxy is trusted
  const forwardedHost = req.get('x-forwarded-host');
  let hostname = forwardedHost || req.hostname || req.get('host') || '';
  
  // Strip port if present
  hostname = hostname.split(':')[0];
  
  return hostname.toLowerCase();
}

function matchesHostname(actual: string, pattern: string): boolean {
  // Exact match
  if (actual === pattern) return true;
  
  // No wildcard - no match if not exact
  if (!pattern.includes('*')) return false;
  
  // Convert wildcard pattern to regex
  // Escape special regex characters except *
  const regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')  // Escape regex special chars
    .replace(/\*/g, '.*');  // Replace * with .* (match any chars)
  
  // Create regex with anchors to match entire hostname
  const regex = new RegExp(`^${regexPattern}$`);
  
  return regex.test(actual);
}

export function buildReplitDomains(): { appDomains: string[], websiteDomains: string[], previewDomains: string[] } {
  const replSlug = process.env.REPL_SLUG;
  const replOwner = process.env.REPL_OWNER;
  
  const appDomains: string[] = [];
  const websiteDomains: string[] = [];
  const previewDomains: string[] = [];
  
  if (replSlug && replOwner) {
    // Main Replit domains (for app)
    appDomains.push(
      `${replSlug}.${replOwner}.repl.co`,
      `${replSlug}.${replOwner}.repl.dev`,
      `${replSlug}-${replOwner}.replit.dev`
    );
    
    // Website subdomain pattern (if configured)
    const websiteSubdomain = process.env.WEBSITE_SUBDOMAIN || 'website';
    websiteDomains.push(
      `${websiteSubdomain}-${replSlug}.${replOwner}.repl.co`,
      `${websiteSubdomain}-${replSlug}.${replOwner}.repl.dev`
    );
    
    // Preview subdomain pattern
    const previewSubdomain = process.env.PREVIEW_SUBDOMAIN || 'preview';
    previewDomains.push(
      `${previewSubdomain}-${replSlug}.${replOwner}.repl.co`,
      `${previewSubdomain}-${replSlug}.${replOwner}.repl.dev`
    );
  }
  
  // Add localhost for development
  appDomains.push('localhost', '127.0.0.1', '0.0.0.0');
  
  // Add wildcard patterns for Replit preview URLs
  appDomains.push('*.replit.dev', '*.worf.replit.dev');
  
  // Add wildcard patterns for preview subdomains on all Replit domains
  previewDomains.push('preview-*.replit.dev', 'preview-*.worf.replit.dev');
  
  return { appDomains, websiteDomains, previewDomains };
}
