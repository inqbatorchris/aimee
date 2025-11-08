import fs from 'fs';
import path from 'path';
import { db } from '../db.js';
import { menuItems } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

// Cache to avoid repeated scans
let checkResultCache: { timestamp: number; results: string[] } | null = null;
const CACHE_DURATION = 60000; // 1 minute

export async function checkNavigationPaths(organizationId: number = 3): Promise<string[]> {
  // Return cached result if still valid
  if (checkResultCache && Date.now() - checkResultCache.timestamp < CACHE_DURATION) {
    return checkResultCache.results;
  }

  const results: string[] = [];
  
  try {
    // Get all menu paths from database
    const items = await db
      .select({ path: menuItems.path, title: menuItems.title })
      .from(menuItems)
      .where(eq(menuItems.organizationId, organizationId));
    
    // Read App.tsx to check routes
    // Handle both running from project root and server directory
    let appTsxPath = path.join(process.cwd(), 'client', 'src', 'App.tsx');
    if (!fs.existsSync(appTsxPath)) {
      appTsxPath = path.join(process.cwd(), '..', 'client', 'src', 'App.tsx');
    }
    const appContent = fs.readFileSync(appTsxPath, 'utf-8');
    
    // Check each menu path
    for (const item of items) {
      if (!item.path) continue;
      
      // Check if the path exists in App.tsx (as a Route path prop)
      const routePattern = `path="${item.path}"`;
      const exists = appContent.includes(routePattern);
      
      if (exists) {
        results.push(`✅ Menu path OK: ${item.path} (${item.title})`);
      } else {
        results.push(`❌ Menu path has no route: ${item.path} (${item.title})`);
      }
    }
    
    // Cache the results
    checkResultCache = { timestamp: Date.now(), results };
    
  } catch (error) {
    results.push(`❌ Error checking navigation paths: ${error}`);
  }
  
  return results;
}

// CLI runner
export async function runCliCheck() {
  console.log('Checking navigation paths...\n');
  const results = await checkNavigationPaths();
  
  // Print results
  for (const result of results) {
    console.log(result);
  }
  
  // Summary
  const errors = results.filter(r => r.startsWith('❌')).length;
  const success = results.filter(r => r.startsWith('✅')).length;
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Total: ${results.length} paths | ✅ OK: ${success} | ❌ Errors: ${errors}`);
  
  if (errors === 0) {
    console.log('\nAll navigation paths are correctly mapped! ✅');
    process.exit(0);
  } else {
    console.log('\nSome navigation paths need attention. ❌');
    process.exit(1);
  }
}