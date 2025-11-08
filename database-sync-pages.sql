-- ============================================================================
-- PAGES TABLE SYNCHRONIZATION SCRIPT
-- ============================================================================
-- Purpose: Sync pages from development database to production database
-- Date: 2025-10-15
-- 
-- INSTRUCTIONS:
-- 1. First, run STEP 1 on your DEVELOPMENT database to export the data
-- 2. Copy the INSERT statements generated
-- 3. Then run STEP 2 on your PRODUCTION database to import the pages
-- ============================================================================

-- ============================================================================
-- STEP 1: RUN THIS ON DEVELOPMENT DATABASE TO EXPORT PAGES
-- ============================================================================
-- This will generate INSERT statements with the current pages data

SELECT 
  'INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, functions, is_core_page, owner_user_id, category, template_id, layout_config, custom_css, meta_tags, page_content, theme_overrides, layout_template_id, visibility_rules, page_metadata, component_config, unified_status, created_at, updated_at) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  COALESCE(organization_id::text, 'NULL') || ', ' ||
  quote_literal(slug) || ', ' ||
  quote_literal(path) || ', ' ||
  quote_literal(title) || ', ' ||
  COALESCE(quote_literal(description), 'NULL') || ', ' ||
  quote_literal(status::text) || '::page_status, ' ||
  quote_literal(build_status::text) || '::build_status, ' ||
  quote_literal(functions::text) || '::jsonb, ' ||
  is_core_page || ', ' ||
  COALESCE(owner_user_id::text, 'NULL') || ', ' ||
  COALESCE(quote_literal(category), 'NULL') || ', ' ||
  COALESCE(quote_literal(template_id), 'NULL') || ', ' ||
  COALESCE(quote_literal(layout_config::text), 'NULL') || '::jsonb, ' ||
  COALESCE(quote_literal(custom_css), 'NULL') || ', ' ||
  COALESCE(quote_literal(meta_tags::text), 'NULL') || '::jsonb, ' ||
  COALESCE(quote_literal(page_content::text), 'NULL') || '::jsonb, ' ||
  COALESCE(quote_literal(theme_overrides::text), 'NULL') || '::jsonb, ' ||
  COALESCE(layout_template_id::text, 'NULL') || ', ' ||
  COALESCE(quote_literal(visibility_rules::text), 'NULL') || '::jsonb, ' ||
  COALESCE(quote_literal(page_metadata::text), 'NULL') || '::jsonb, ' ||
  COALESCE(quote_literal(component_config::text), 'NULL') || '::jsonb, ' ||
  COALESCE(quote_literal(unified_status::text), '''draft''') || '::unified_status, ' ||
  quote_literal(created_at::text) || '::timestamp, ' ||
  quote_literal(updated_at::text) || '::timestamp' ||
  ') ON CONFLICT (organization_id, slug) DO UPDATE SET ' ||
  'path = EXCLUDED.path, ' ||
  'title = EXCLUDED.title, ' ||
  'description = EXCLUDED.description, ' ||
  'status = EXCLUDED.status, ' ||
  'build_status = EXCLUDED.build_status, ' ||
  'functions = EXCLUDED.functions, ' ||
  'is_core_page = EXCLUDED.is_core_page, ' ||
  'owner_user_id = EXCLUDED.owner_user_id, ' ||
  'category = EXCLUDED.category, ' ||
  'template_id = EXCLUDED.template_id, ' ||
  'layout_config = EXCLUDED.layout_config, ' ||
  'custom_css = EXCLUDED.custom_css, ' ||
  'meta_tags = EXCLUDED.meta_tags, ' ||
  'page_content = EXCLUDED.page_content, ' ||
  'theme_overrides = EXCLUDED.theme_overrides, ' ||
  'layout_template_id = EXCLUDED.layout_template_id, ' ||
  'visibility_rules = EXCLUDED.visibility_rules, ' ||
  'page_metadata = EXCLUDED.page_metadata, ' ||
  'component_config = EXCLUDED.component_config, ' ||
  'unified_status = EXCLUDED.unified_status, ' ||
  'updated_at = EXCLUDED.updated_at;'
FROM pages
WHERE deleted_at IS NULL
ORDER BY created_at;


-- ============================================================================
-- STEP 2: ALTERNATIVE - DIRECT UPSERT QUERY FOR PRODUCTION
-- ============================================================================
-- Copy the generated INSERT statements from STEP 1 output and run them here
-- OR use the template below and fill in the data manually

-- Example template (DO NOT RUN THIS - use actual data from STEP 1):
/*
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, functions, is_core_page, owner_user_id, category, template_id, layout_config, custom_css, meta_tags, page_content, theme_overrides, layout_template_id, visibility_rules, page_metadata, component_config, unified_status, created_at, updated_at) 
VALUES 
  -- Paste generated INSERT VALUES here from STEP 1
ON CONFLICT (organization_id, slug) DO UPDATE SET 
  path = EXCLUDED.path,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  build_status = EXCLUDED.build_status,
  functions = EXCLUDED.functions,
  is_core_page = EXCLUDED.is_core_page,
  owner_user_id = EXCLUDED.owner_user_id,
  category = EXCLUDED.category,
  template_id = EXCLUDED.template_id,
  layout_config = EXCLUDED.layout_config,
  custom_css = EXCLUDED.custom_css,
  meta_tags = EXCLUDED.meta_tags,
  page_content = EXCLUDED.page_content,
  theme_overrides = EXCLUDED.theme_overrides,
  layout_template_id = EXCLUDED.layout_template_id,
  visibility_rules = EXCLUDED.visibility_rules,
  page_metadata = EXCLUDED.page_metadata,
  component_config = EXCLUDED.component_config,
  unified_status = EXCLUDED.unified_status,
  updated_at = NOW();
*/


-- ============================================================================
-- STEP 3: VERIFICATION QUERIES (Run on PRODUCTION after sync)
-- ============================================================================

-- Check total pages synced
SELECT COUNT(*) as total_pages FROM pages WHERE deleted_at IS NULL;

-- Check pages by organization
SELECT organization_id, COUNT(*) as page_count 
FROM pages 
WHERE deleted_at IS NULL 
GROUP BY organization_id;

-- Check pages by status
SELECT unified_status, COUNT(*) as page_count 
FROM pages 
WHERE deleted_at IS NULL 
GROUP BY unified_status;

-- List all synced pages
SELECT 
  id,
  organization_id,
  slug,
  path,
  title,
  unified_status,
  is_core_page,
  created_at
FROM pages
WHERE deleted_at IS NULL
ORDER BY organization_id, slug;


-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- If you get foreign key errors for organization_id:
-- First check which organizations exist:
SELECT id, name FROM organizations;

-- If you get foreign key errors for owner_user_id:
-- Check which users exist:
SELECT id, full_name, email FROM users;

-- If you need to update organization_id for all pages:
-- UPDATE pages SET organization_id = 1 WHERE organization_id IS NULL;

-- If you need to clear owner_user_id references:
-- UPDATE pages SET owner_user_id = NULL WHERE owner_user_id NOT IN (SELECT id FROM users);
