#!/usr/bin/env node

/**
 * Documentation Lint Script
 * Prevents replit.md drift by enforcing canonical guidelines
 * Usage: node scripts/doclint.js
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BANNED_TOKENS = [
  'DeveloperMode',
  'DeveloperModeContext', 
  'devModeOnly',
  'SlidePanel',
  'bg-#',
  'text-#',
  '#00BFA6'
];

const REQUIRED_TOKENS_IN_REPLIT_MD = [
  'unified_status',
  'Sheet',
  'DynamicPageRenderer',
  'PageFactory'
];

const IGNORE_PATTERNS = [
  'README.md',
  'docs/industry/**',
  'node_modules/**',
  '.git/**'
];

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function findMarkdownFiles() {
  const pattern = '**/*.md';
  const files = await glob(pattern, { 
    ignore: IGNORE_PATTERNS,
    cwd: process.cwd()
  });
  
  return files.filter(file => {
    // Additional filtering for industry docs
    return !file.includes('docs/industry/');
  });
}

function checkBannedTokens(files) {
  const violations = [];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    
    for (const token of BANNED_TOKENS) {
      if (content.includes(token)) {
        violations.push({
          file,
          token,
          type: 'banned'
        });
      }
    }
  }
  
  return violations;
}

function checkRequiredTokens() {
  const replitMdPath = 'replit.md';
  const violations = [];
  
  if (!fs.existsSync(replitMdPath)) {
    violations.push({
      file: replitMdPath,
      token: 'FILE_NOT_FOUND',
      type: 'missing_file'
    });
    return violations;
  }
  
  const content = fs.readFileSync(replitMdPath, 'utf8');
  
  for (const token of REQUIRED_TOKENS_IN_REPLIT_MD) {
    if (!content.includes(token)) {
      violations.push({
        file: replitMdPath,
        token,
        type: 'required'
      });
    }
  }
  
  return violations;
}

function printViolations(violations) {
  if (violations.length === 0) {
    log('green', '✓ All documentation complies with canonical guidelines');
    return;
  }
  
  log('red', `\n${colors.bold}Documentation Lint Violations Found${colors.reset}`);
  log('red', '='.repeat(50));
  
  const bannedViolations = violations.filter(v => v.type === 'banned');
  const requiredViolations = violations.filter(v => v.type === 'required');
  const missingFileViolations = violations.filter(v => v.type === 'missing_file');
  
  if (bannedViolations.length > 0) {
    log('red', '\n❌ BANNED TOKENS FOUND:');
    bannedViolations.forEach(violation => {
      log('red', `   ${violation.file}: "${violation.token}"`);
    });
    
    log('yellow', '\n🔧 ACTION REQUIRED:');
    log('yellow', '   Remove banned tokens and replace with canonical alternatives:');
    log('yellow', '   • DeveloperMode → unified_status system');
    log('yellow', '   • SlidePanel → Sheet from shadcn/ui');
    log('yellow', '   • #00BFA6 → CSS custom properties (var(--primary))');
  }
  
  if (requiredViolations.length > 0) {
    log('red', '\n❌ MISSING REQUIRED TOKENS IN replit.md:');
    requiredViolations.forEach(violation => {
      log('red', `   Missing: "${violation.token}"`);
    });
    
    log('yellow', '\n🔧 ACTION REQUIRED:');
    log('yellow', '   Add missing canonical tokens to replit.md:');
    log('yellow', '   • unified_status: for visibility management');
    log('yellow', '   • Sheet: for side panel components');
    log('yellow', '   • DynamicPageRenderer: for page-driven architecture');
    log('yellow', '   • PageFactory: for page registration');
  }
  
  if (missingFileViolations.length > 0) {
    log('red', '\n❌ MISSING CRITICAL FILES:');
    missingFileViolations.forEach(violation => {
      log('red', `   File not found: ${violation.file}`);
    });
    
    log('yellow', '\n🔧 ACTION REQUIRED:');
    log('yellow', '   Ensure replit.md exists and contains canonical guidelines');
  }
  
  log('red', '\n' + '='.repeat(50));
  log('red', 'Commit blocked due to documentation violations.');
  log('cyan', 'Fix the issues above and try again.');
  log('cyan', '\nFor more information, see the canonical guidelines in replit.md');
}

async function main() {
  log('blue', 'Running documentation lint checks...');
  
  // Find all markdown files to check
  const files = await findMarkdownFiles();
  log('cyan', `Checking ${files.length} markdown files...`);
  
  // Check for banned tokens
  const bannedViolations = checkBannedTokens(files);
  
  // Check for required tokens in replit.md
  const requiredViolations = checkRequiredTokens();
  
  // Combine all violations
  const allViolations = [...bannedViolations, ...requiredViolations];
  
  // Print results
  printViolations(allViolations);
  
  // Exit with error code if violations found
  if (allViolations.length > 0) {
    process.exit(1);
  } else {
    log('green', '\n✅ Documentation lint checks passed!');
    process.exit(0);
  }
}

// Run the linter
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main, checkBannedTokens, checkRequiredTokens };