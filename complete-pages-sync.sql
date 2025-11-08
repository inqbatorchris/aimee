-- ============================================================================
-- PAGES TABLE SYNCHRONIZATION - Development to Production
-- Generated: 2025-10-15
-- Total Pages to Sync: 48
-- ============================================================================
-- INSTRUCTIONS FOR PRODUCTION DATABASE:
-- 1. **BACKUP YOUR PRODUCTION PAGES TABLE FIRST!**
--    Run: pg_dump -t pages > pages_backup_$(date +%Y%m%d).sql
-- 2. Review this file to ensure data looks correct
-- 3. Run this entire file on your PRODUCTION database
-- 4. The script uses UPSERT (ON CONFLICT) - safe to run multiple times
-- 5. Verify results with the queries at the end
-- ============================================================================

-- Start transaction for safety
BEGIN;

-- Disable triggers temporarily for faster import (optional)
-- ALTER TABLE pages DISABLE TRIGGER ALL;


-- ============================================================================
-- PAGE SYNC STATEMENTS
-- ============================================================================
-- The following INSERT statements will sync all pages from development
-- Each statement uses ON CONFLICT to update existing pages or insert new ones
-- ============================================================================

