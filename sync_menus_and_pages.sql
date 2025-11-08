-- ========================================
-- SYNC MENU SECTIONS, MENU ITEMS, AND PAGES
-- ========================================
-- This script syncs menu and page data from production to development
-- - Adds new records that don't exist in dev
-- - Updates existing records if production version is newer
-- - Does NOT overwrite secrets
-- ========================================

-- Create foreign data wrapper extension
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- Drop existing server if it exists
DROP SERVER IF EXISTS prod_server CASCADE;

-- Create foreign server connection to production
CREATE SERVER prod_server
  FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (
    dbname 'neondb',
    host 'ep-mute-thunder-a6$azlou.c-2.us-east-2.aws.neon.tech',
    port '5432'
  );

-- Create user mapping with production credentials
CREATE USER MAPPING FOR CURRENT_USER
  SERVER prod_server
  OPTIONS (
    user 'neondb_owner',
    password 'npg_Q2MjAQKqBs5C'
  );

-- Create schema for production tables
CREATE SCHEMA IF NOT EXISTS prod_schema;

-- Import foreign schema from production
IMPORT FOREIGN SCHEMA public
  FROM SERVER prod_server
  INTO prod_schema;

-- ========================================
-- SYNC MENU SECTIONS
-- ========================================

INSERT INTO menu_sections SELECT * FROM prod_schema.menu_sections
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  order_index = EXCLUDED.order_index,
  is_visible = EXCLUDED.is_visible,
  updated_at = EXCLUDED.updated_at
WHERE menu_sections.updated_at < EXCLUDED.updated_at OR menu_sections.updated_at IS NULL;

-- ========================================
-- SYNC MENU ITEMS
-- ========================================

INSERT INTO menu_items SELECT * FROM prod_schema.menu_items
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  section_id = EXCLUDED.section_id,
  name = EXCLUDED.name,
  path = EXCLUDED.path,
  icon = EXCLUDED.icon,
  order_index = EXCLUDED.order_index,
  is_visible = EXCLUDED.is_visible,
  badge = EXCLUDED.badge,
  badge_variant = EXCLUDED.badge_variant,
  permissions_required = EXCLUDED.permissions_required,
  page_id = EXCLUDED.page_id,
  updated_at = EXCLUDED.updated_at
WHERE menu_items.updated_at < EXCLUDED.updated_at OR menu_items.updated_at IS NULL;

-- ========================================
-- SYNC PAGES
-- ========================================

INSERT INTO pages SELECT * FROM prod_schema.pages
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  slug = EXCLUDED.slug,
  path = EXCLUDED.path,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  unified_status = EXCLUDED.unified_status,
  status = EXCLUDED.status,
  build_status = EXCLUDED.build_status,
  functions = EXCLUDED.functions,
  is_core_page = EXCLUDED.is_core_page,
  owner_user_id = EXCLUDED.owner_user_id,
  page_content = EXCLUDED.page_content,
  theme_overrides = EXCLUDED.theme_overrides,
  layout_template_id = EXCLUDED.layout_template_id,
  visibility_rules = EXCLUDED.visibility_rules,
  page_metadata = EXCLUDED.page_metadata,
  component_config = EXCLUDED.component_config,
  updated_at = EXCLUDED.updated_at,
  deleted_at = EXCLUDED.deleted_at
WHERE pages.updated_at < EXCLUDED.updated_at OR pages.updated_at IS NULL;

-- ========================================
-- CLEANUP
-- ========================================
DROP SCHEMA IF EXISTS prod_schema CASCADE;
DROP SERVER IF EXISTS prod_server CASCADE;

-- ========================================
-- COMPLETION MESSAGE
-- ========================================
SELECT 
  'Sync completed!' as status,
  'Menu sections, menu items, and pages synced from production' as message,
  (SELECT COUNT(*) FROM menu_sections) as menu_sections_count,
  (SELECT COUNT(*) FROM menu_items) as menu_items_count,
  (SELECT COUNT(*) FROM pages) as pages_count,
  now() as completed_at;
