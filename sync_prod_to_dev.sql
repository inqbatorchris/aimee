-- ========================================
-- PRODUCTION TO DEVELOPMENT SYNC SCRIPT
-- ========================================
-- This script syncs data from production to development database
-- - Adds new records that don't exist in dev
-- - Updates existing records if production version is newer
-- - Does NOT overwrite secrets or menu items
--
-- IMPORTANT: Before running this script:
-- 1. Set up PROD_DATABASE_URL environment variable with your production connection string
-- 2. The format should be: postgresql://user:password@host:port/database
-- 3. Run this in the Replit database tab
-- ========================================

-- Create foreign data wrapper extension
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- Drop existing server if it exists
DROP SERVER IF EXISTS prod_server CASCADE;

-- Parse production connection from environment variable
-- Note: This requires the PROD_DATABASE_URL to be in format:
-- postgresql://user:password@host:port/database
DO $$
DECLARE
  prod_url TEXT;
BEGIN
  -- Get production URL from environment (you'll need to set this up in Replit Secrets)
  prod_url := current_setting('myapp.prod_database_url', true);
  
  IF prod_url IS NULL THEN
    RAISE EXCEPTION 'PROD_DATABASE_URL environment variable not set. Please configure it in Replit Secrets as PROD_DATABASE_URL';
  END IF;
END $$;

-- Create foreign server connection to production
-- WARNING: You must manually update these values or use a connection management tool
CREATE SERVER prod_server
  FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (
    -- REPLACE THESE WITH YOUR PRODUCTION DATABASE DETAILS:
    dbname 'your_prod_database_name',
    host 'your_prod_host',
    port '5432'
  );

-- Create user mapping
-- REPLACE THESE WITH YOUR PRODUCTION CREDENTIALS:
CREATE USER MAPPING FOR CURRENT_USER
  SERVER prod_server
  OPTIONS (
    user 'your_prod_username',
    password 'your_prod_password'
  );

-- Create schema for production tables
CREATE SCHEMA IF NOT EXISTS prod_schema;

-- Import foreign schema from production
IMPORT FOREIGN SCHEMA public
  FROM SERVER prod_server
  INTO prod_schema;

-- ========================================
-- SYNC CORE TABLES
-- ========================================

-- Sync organizations (no secrets)
INSERT INTO organizations (
  id, name, domain, subscription_tier, is_active, max_users, logo_url, square_logo_url, 
  contact_email, contact_phone, address, industry, company_size, time_zone, currency, 
  subscription_start, subscription_end, billing_email, settings, features, created_at, updated_at
)
SELECT 
  id, name, domain, subscription_tier, is_active, max_users, logo_url, square_logo_url, 
  contact_email, contact_phone, address, industry, company_size, time_zone, currency, 
  subscription_start, subscription_end, billing_email, settings, features, created_at, updated_at
FROM prod_schema.organizations
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  domain = EXCLUDED.domain,
  subscription_tier = EXCLUDED.subscription_tier,
  is_active = EXCLUDED.is_active,
  max_users = EXCLUDED.max_users,
  logo_url = EXCLUDED.logo_url,
  square_logo_url = EXCLUDED.square_logo_url,
  contact_email = EXCLUDED.contact_email,
  contact_phone = EXCLUDED.contact_phone,
  address = EXCLUDED.address,
  industry = EXCLUDED.industry,
  company_size = EXCLUDED.company_size,
  time_zone = EXCLUDED.time_zone,
  currency = EXCLUDED.currency,
  subscription_start = EXCLUDED.subscription_start,
  subscription_end = EXCLUDED.subscription_end,
  billing_email = EXCLUDED.billing_email,
  settings = EXCLUDED.settings,
  features = EXCLUDED.features,
  updated_at = EXCLUDED.updated_at
WHERE organizations.updated_at < EXCLUDED.updated_at;

-- Sync tenants (excluding dbPasswordEncrypted - SECURITY)
INSERT INTO tenants (
  id, organization_id, db_host, db_name, db_user, db_port, subdomain, status, created_at, updated_at
)
SELECT 
  id, organization_id, db_host, db_name, db_user, db_port, subdomain, status, created_at, updated_at
FROM prod_schema.tenants
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  db_host = EXCLUDED.db_host,
  db_name = EXCLUDED.db_name,
  db_user = EXCLUDED.db_user,
  db_port = EXCLUDED.db_port,
  subdomain = EXCLUDED.subdomain,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at
WHERE tenants.updated_at < EXCLUDED.updated_at;

-- Sync plans
INSERT INTO plans (
  id, name, type, max_users, max_storage_gb, features, price_monthly, created_at, updated_at
)
SELECT 
  id, name, type, max_users, max_storage_gb, features, price_monthly, created_at, updated_at
FROM prod_schema.plans
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  max_users = EXCLUDED.max_users,
  max_storage_gb = EXCLUDED.max_storage_gb,
  features = EXCLUDED.features,
  price_monthly = EXCLUDED.price_monthly,
  updated_at = EXCLUDED.updated_at
WHERE plans.updated_at < EXCLUDED.updated_at;

-- Sync subscriptions
INSERT INTO subscriptions (
  id, organization_id, plan_id, status, trial_ends_at, current_period_start, 
  current_period_end, created_at, updated_at
)
SELECT 
  id, organization_id, plan_id, status, trial_ends_at, current_period_start, 
  current_period_end, created_at, updated_at
FROM prod_schema.subscriptions
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  plan_id = EXCLUDED.plan_id,
  status = EXCLUDED.status,
  trial_ends_at = EXCLUDED.trial_ends_at,
  current_period_start = EXCLUDED.current_period_start,
  current_period_end = EXCLUDED.current_period_end,
  updated_at = EXCLUDED.updated_at
WHERE subscriptions.updated_at < EXCLUDED.updated_at;

-- Sync users (excluding passwordHash, vapiApiKey, twoFactorSecret - SECURITY)
INSERT INTO users (
  id, organization_id, username, email, role, user_type, permissions, is_active, 
  is_email_verified, invitation_accepted, last_login_at, customer_id, splynx_admin_id, 
  splynx_customer_id, full_name, phone, address, city, postcode, can_assign_tickets, 
  firebase_uid, two_factor_enabled, avatar_url, created_at, updated_at
)
SELECT 
  id, organization_id, username, email, role, user_type, permissions, is_active, 
  is_email_verified, invitation_accepted, last_login_at, customer_id, splynx_admin_id, 
  splynx_customer_id, full_name, phone, address, city, postcode, can_assign_tickets, 
  firebase_uid, two_factor_enabled, avatar_url, created_at, updated_at
FROM prod_schema.users
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  user_type = EXCLUDED.user_type,
  permissions = EXCLUDED.permissions,
  is_active = EXCLUDED.is_active,
  is_email_verified = EXCLUDED.is_email_verified,
  invitation_accepted = EXCLUDED.invitation_accepted,
  last_login_at = EXCLUDED.last_login_at,
  customer_id = EXCLUDED.customer_id,
  splynx_admin_id = EXCLUDED.splynx_admin_id,
  splynx_customer_id = EXCLUDED.splynx_customer_id,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  postcode = EXCLUDED.postcode,
  can_assign_tickets = EXCLUDED.can_assign_tickets,
  firebase_uid = EXCLUDED.firebase_uid,
  two_factor_enabled = EXCLUDED.two_factor_enabled,
  avatar_url = EXCLUDED.avatar_url,
  updated_at = EXCLUDED.updated_at
WHERE users.updated_at < EXCLUDED.updated_at;

-- Sync theme_settings
INSERT INTO theme_settings (
  id, organization_id, light_theme, dark_theme, brand_settings, layout_settings, 
  active_theme, created_at, updated_at
)
SELECT 
  id, organization_id, light_theme, dark_theme, brand_settings, layout_settings, 
  active_theme, created_at, updated_at
FROM prod_schema.theme_settings
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  light_theme = EXCLUDED.light_theme,
  dark_theme = EXCLUDED.dark_theme,
  brand_settings = EXCLUDED.brand_settings,
  layout_settings = EXCLUDED.layout_settings,
  active_theme = EXCLUDED.active_theme,
  updated_at = EXCLUDED.updated_at
WHERE theme_settings.updated_at < EXCLUDED.updated_at;

-- Sync platform_features
INSERT INTO platform_features (
  id, organization_id, parent_feature_id, name, visibility_status, is_enabled,
  scope_definition, icon, route, overview, database_tables, user_documentation, 
  implementation_details, technical_specifications, linked_page_ids, created_by, 
  updated_by, created_at, updated_at
)
SELECT 
  id, organization_id, parent_feature_id, name, visibility_status, is_enabled,
  scope_definition, icon, route, overview, database_tables, user_documentation, 
  implementation_details, technical_specifications, linked_page_ids, created_by, 
  updated_by, created_at, updated_at
FROM prod_schema.platform_features
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  parent_feature_id = EXCLUDED.parent_feature_id,
  name = EXCLUDED.name,
  visibility_status = EXCLUDED.visibility_status,
  is_enabled = EXCLUDED.is_enabled,
  scope_definition = EXCLUDED.scope_definition,
  icon = EXCLUDED.icon,
  route = EXCLUDED.route,
  overview = EXCLUDED.overview,
  database_tables = EXCLUDED.database_tables,
  user_documentation = EXCLUDED.user_documentation,
  implementation_details = EXCLUDED.implementation_details,
  technical_specifications = EXCLUDED.technical_specifications,
  linked_page_ids = EXCLUDED.linked_page_ids,
  created_by = EXCLUDED.created_by,
  updated_by = EXCLUDED.updated_by,
  updated_at = EXCLUDED.updated_at
WHERE platform_features.updated_at < EXCLUDED.updated_at;

-- Sync objectives
INSERT INTO objectives (
  id, organization_id, title, description, primary_kpi, calculation_formula,
  last_calculated_at, category, priority, status, target_value, current_value, 
  kpi_type, target_date, owner_id, is_owner_only, display_order, created_by, 
  created_at, updated_at
)
SELECT 
  id, organization_id, title, description, primary_kpi, calculation_formula,
  last_calculated_at, category, priority, status, target_value, current_value, 
  kpi_type, target_date, owner_id, is_owner_only, display_order, created_by, 
  created_at, updated_at
FROM prod_schema.objectives
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  primary_kpi = EXCLUDED.primary_kpi,
  calculation_formula = EXCLUDED.calculation_formula,
  last_calculated_at = EXCLUDED.last_calculated_at,
  category = EXCLUDED.category,
  priority = EXCLUDED.priority,
  status = EXCLUDED.status,
  target_value = EXCLUDED.target_value,
  current_value = EXCLUDED.current_value,
  kpi_type = EXCLUDED.kpi_type,
  target_date = EXCLUDED.target_date,
  owner_id = EXCLUDED.owner_id,
  is_owner_only = EXCLUDED.is_owner_only,
  display_order = EXCLUDED.display_order,
  created_by = EXCLUDED.created_by,
  updated_at = EXCLUDED.updated_at
WHERE objectives.updated_at < EXCLUDED.updated_at;

-- Sync key_results
INSERT INTO key_results (
  id, organization_id, objective_id, title, description, target_value, current_value,
  type, status, knowledge_document_id, team_id, assigned_to, owner_id, created_by, 
  created_at, updated_at
)
SELECT 
  id, organization_id, objective_id, title, description, target_value, current_value,
  type, status, knowledge_document_id, team_id, assigned_to, owner_id, created_by, 
  created_at, updated_at
FROM prod_schema.key_results
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  objective_id = EXCLUDED.objective_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  target_value = EXCLUDED.target_value,
  current_value = EXCLUDED.current_value,
  type = EXCLUDED.type,
  status = EXCLUDED.status,
  knowledge_document_id = EXCLUDED.knowledge_document_id,
  team_id = EXCLUDED.team_id,
  assigned_to = EXCLUDED.assigned_to,
  owner_id = EXCLUDED.owner_id,
  created_by = EXCLUDED.created_by,
  updated_at = EXCLUDED.updated_at
WHERE key_results.updated_at < EXCLUDED.updated_at;

-- Sync pages
INSERT INTO pages (
  id, organization_id, slug, path, title, description, unified_status, status, 
  build_status, functions, is_core_page, owner_user_id, page_content, theme_overrides, 
  layout_template_id, visibility_rules, page_metadata, component_config, created_at, 
  updated_at, deleted_at
)
SELECT 
  id, organization_id, slug, path, title, description, unified_status, status, 
  build_status, functions, is_core_page, owner_user_id, page_content, theme_overrides, 
  layout_template_id, visibility_rules, page_metadata, component_config, created_at, 
  updated_at, deleted_at
FROM prod_schema.pages
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
WHERE pages.updated_at < EXCLUDED.updated_at;

-- Sync integrations (excluding credentialsEncrypted - SECURITY)
INSERT INTO integrations (
  id, organization_id, platform_type, name, connection_config, connection_status,
  last_tested_at, test_result, is_enabled, created_at, updated_at
)
SELECT 
  id, organization_id, platform_type, name, connection_config, connection_status,
  last_tested_at, test_result, is_enabled, created_at, updated_at
FROM prod_schema.integrations
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  platform_type = EXCLUDED.platform_type,
  name = EXCLUDED.name,
  connection_config = EXCLUDED.connection_config,
  connection_status = EXCLUDED.connection_status,
  last_tested_at = EXCLUDED.last_tested_at,
  test_result = EXCLUDED.test_result,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = EXCLUDED.updated_at
WHERE integrations.updated_at < EXCLUDED.updated_at;

-- ========================================
-- EXCLUDED TABLES (NOT SYNCED)
-- ========================================
-- The following tables are INTENTIONALLY SKIPPED:
-- 1. menu_sections - Per requirements
-- 2. menu_items - Per requirements
-- 3. sessions - Development-specific
-- 
-- Secrets are excluded from synced tables:
-- - users.passwordHash, users.vapiApiKey, users.twoFactorSecret
-- - tenants.dbPasswordEncrypted
-- - integrations.credentialsEncrypted
-- - databaseConnections.passwordEncrypted

-- ========================================
-- ADDITIONAL TABLES TO SYNC
-- ========================================
-- Add more tables following this pattern:
--
-- INSERT INTO table_name (columns...)
-- SELECT columns...
-- FROM prod_schema.table_name
-- ON CONFLICT (id) DO UPDATE SET
--   column = EXCLUDED.column,
--   updated_at = EXCLUDED.updated_at
-- WHERE table_name.updated_at < EXCLUDED.updated_at;

-- ========================================
-- CLEANUP (Optional)
-- ========================================
-- Uncomment to remove foreign server after sync:
-- DROP SCHEMA IF EXISTS prod_schema CASCADE;
-- DROP SERVER IF EXISTS prod_server CASCADE;

-- ========================================
-- COMPLETION MESSAGE
-- ========================================
SELECT 
  'Sync completed!' as status,
  'Tables synced (excluding secrets and menus)' as message,
  now() as completed_at;
