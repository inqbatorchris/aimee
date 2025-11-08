/**
 * Utility to fetch external CSS and inline it into HTML
 * This bypasses CORS issues for static website hosting
 * 
 * Security: Implements timeouts, size limits, and basic sanitization
 * Reliability: Falls back to original link tags when download fails
 */

const MAX_CSS_SIZE = 5 * 1024 * 1024; // 5MB max per CSS file
const FETCH_TIMEOUT = 10000; // 10 seconds timeout
const ALLOWED_DOMAINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'country-connect.co.uk', // User's WordPress site - allowed to download all resources
  'www.country-connect.co.uk',
  // Add more trusted CDNs as needed
];

function sanitizeCSS(css: string): string {
  // Remove @import directives (potential SSRF/XSS vector)
  css = css.replace(/@import\s+[^;]+;/gi, '/* @import removed for security */');
  
  // Remove javascript: URLs
  css = css.replace(/javascript:/gi, '');
  
  return css;
}

function isDomainAllowed(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // Allow same-origin or trusted domains
    return ALLOWED_DOMAINS.some(domain => urlObj.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/css,*/*',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function inlineExternalCSS(html: string): Promise<string> {
  const linkMatches: Array<{ fullTag: string; url: string }> = [];
  
  // Extract all stylesheet URLs with their full tags
  const linkRegex = /<link[^>]*rel=['"]stylesheet['"][^>]*href=['"]([^'"]+)['"][^>]*>/gi;
  let match;
  
  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1];
    if (url.startsWith('http')) {
      linkMatches.push({ fullTag: match[0], url });
    }
  }
  
  if (linkMatches.length === 0) {
    return html;
  }
  
  console.log(`[CSS Inliner] Found ${linkMatches.length} external CSS files`);
  
  // Fetch CSS files from allowed domains
  const cssContents: string[] = [];
  const successfulUrls: string[] = [];
  let allowedCount = 0;
  let blockedCount = 0;
  
  for (const { url } of linkMatches) {
    // Only fetch from allowed domains
    if (!isDomainAllowed(url)) {
      console.log(`[CSS Inliner] ✗ Domain not allowed: ${url.substring(0, 80)}...`);
      blockedCount++;
      continue;
    }
    
    allowedCount++;
    try {
      const response = await fetchWithTimeout(url, FETCH_TIMEOUT);
      
      if (response.ok) {
        // Check content size
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > MAX_CSS_SIZE) {
          console.log(`[CSS Inliner] ✗ File too large: ${url.substring(0, 80)}...`);
          continue;
        }
        
        const css = await response.text();
        
        // Check actual size
        if (css.length > MAX_CSS_SIZE) {
          console.log(`[CSS Inliner] ✗ File too large: ${url.substring(0, 80)}...`);
          continue;
        }
        
        const sanitized = sanitizeCSS(css);
        cssContents.push(`/* Source: ${url} */\n${sanitized}`);
        successfulUrls.push(url);
        console.log(`[CSS Inliner] ✓ Fetched: ${url.substring(0, 80)}...`);
      } else {
        console.log(`[CSS Inliner] ✗ Failed (${response.status}): ${url.substring(0, 80)}...`);
      }
    } catch (error) {
      console.log(`[CSS Inliner] ✗ Error: ${url.substring(0, 80)}...`);
    }
  }
  
  console.log(`[CSS Inliner] Results: ${cssContents.length} inlined, ${blockedCount} blocked (security), ${allowedCount - cssContents.length} failed`);
  
  // If no CSS was successfully fetched, keep original HTML with link tags
  if (cssContents.length === 0) {
    console.log(`[CSS Inliner] ⚠️  No CSS could be inlined - keeping original link tags`);
    return html;
  }
  
  // Only remove link tags for successfully fetched CSS
  let inlinedHtml = html;
  for (const url of successfulUrls) {
    const linkRegex = new RegExp(`<link[^>]*href=['"]${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"][^>]*>`, 'gi');
    inlinedHtml = inlinedHtml.replace(linkRegex, '');
  }
  
  // Add combined inline style block
  const combinedCSS = cssContents.join('\n\n');
  const styleBlock = `<style id="inlined-external-css">\n${combinedCSS}\n</style>`;
  
  // Insert before closing </head>, or after <head> if </head> not found
  if (inlinedHtml.includes('</head>')) {
    inlinedHtml = inlinedHtml.replace('</head>', `${styleBlock}\n</head>`);
  } else if (inlinedHtml.includes('<head>')) {
    inlinedHtml = inlinedHtml.replace('<head>', `<head>\n${styleBlock}`);
  }
  
  console.log(`[CSS Inliner] ✅ Successfully inlined ${cssContents.length} CSS files`);
  
  return inlinedHtml;
}
