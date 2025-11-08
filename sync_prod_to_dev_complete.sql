-- ========================================
-- COMPREHENSIVE PRODUCTION TO DEVELOPMENT SYNC SCRIPT
-- ========================================
-- This script syncs ALL data from production to development database
-- - Adds new records that don't exist in dev
-- - Updates existing records if production version is newer
-- - Does NOT overwrite secrets or menu items
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
-- CORE MULTI-TENANT SYSTEM TABLES
-- ========================================

-- Organizations
INSERT INTO organizations SELECT * FROM prod_schema.organizations
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, domain = EXCLUDED.domain, subscription_tier = EXCLUDED.subscription_tier,
  is_active = EXCLUDED.is_active, max_users = EXCLUDED.max_users, logo_url = EXCLUDED.logo_url,
  square_logo_url = EXCLUDED.square_logo_url, contact_email = EXCLUDED.contact_email,
  contact_phone = EXCLUDED.contact_phone, address = EXCLUDED.address, industry = EXCLUDED.industry,
  company_size = EXCLUDED.company_size, time_zone = EXCLUDED.time_zone, currency = EXCLUDED.currency,
  subscription_start = EXCLUDED.subscription_start, subscription_end = EXCLUDED.subscription_end,
  billing_email = EXCLUDED.billing_email, settings = EXCLUDED.settings, features = EXCLUDED.features,
  updated_at = EXCLUDED.updated_at
WHERE organizations.updated_at < EXCLUDED.updated_at OR organizations.updated_at IS NULL;

-- Tenants (excluding dbPasswordEncrypted)
INSERT INTO tenants (id, organization_id, db_host, db_name, db_user, db_port, subdomain, status, created_at, updated_at)
SELECT id, organization_id, db_host, db_name, db_user, db_port, subdomain, status, created_at, updated_at
FROM prod_schema.tenants
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, db_host = EXCLUDED.db_host, db_name = EXCLUDED.db_name,
  db_user = EXCLUDED.db_user, db_port = EXCLUDED.db_port, subdomain = EXCLUDED.subdomain,
  status = EXCLUDED.status, updated_at = EXCLUDED.updated_at
WHERE tenants.updated_at < EXCLUDED.updated_at OR tenants.updated_at IS NULL;

-- Plans
INSERT INTO plans SELECT * FROM prod_schema.plans
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, type = EXCLUDED.type, max_users = EXCLUDED.max_users,
  max_storage_gb = EXCLUDED.max_storage_gb, features = EXCLUDED.features,
  price_monthly = EXCLUDED.price_monthly, updated_at = EXCLUDED.updated_at
WHERE plans.updated_at < EXCLUDED.updated_at OR plans.updated_at IS NULL;

-- Subscriptions
INSERT INTO subscriptions SELECT * FROM prod_schema.subscriptions
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, plan_id = EXCLUDED.plan_id, status = EXCLUDED.status,
  trial_ends_at = EXCLUDED.trial_ends_at, current_period_start = EXCLUDED.current_period_start,
  current_period_end = EXCLUDED.current_period_end, updated_at = EXCLUDED.updated_at
WHERE subscriptions.updated_at < EXCLUDED.updated_at OR subscriptions.updated_at IS NULL;

-- Users (excluding passwordHash, vapiApiKey, twoFactorSecret)
INSERT INTO users (id, organization_id, username, email, role, user_type, permissions, is_active,
  is_email_verified, invitation_accepted, last_login_at, customer_id, splynx_admin_id, splynx_customer_id,
  full_name, phone, address, city, postcode, can_assign_tickets, firebase_uid, two_factor_enabled,
  avatar_url, created_at, updated_at)
SELECT id, organization_id, username, email, role, user_type, permissions, is_active,
  is_email_verified, invitation_accepted, last_login_at, customer_id, splynx_admin_id, splynx_customer_id,
  full_name, phone, address, city, postcode, can_assign_tickets, firebase_uid, two_factor_enabled,
  avatar_url, created_at, updated_at
FROM prod_schema.users
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, username = EXCLUDED.username, email = EXCLUDED.email,
  role = EXCLUDED.role, user_type = EXCLUDED.user_type, permissions = EXCLUDED.permissions,
  is_active = EXCLUDED.is_active, is_email_verified = EXCLUDED.is_email_verified,
  invitation_accepted = EXCLUDED.invitation_accepted, last_login_at = EXCLUDED.last_login_at,
  customer_id = EXCLUDED.customer_id, splynx_admin_id = EXCLUDED.splynx_admin_id,
  splynx_customer_id = EXCLUDED.splynx_customer_id, full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone, address = EXCLUDED.address, city = EXCLUDED.city, postcode = EXCLUDED.postcode,
  can_assign_tickets = EXCLUDED.can_assign_tickets, firebase_uid = EXCLUDED.firebase_uid,
  two_factor_enabled = EXCLUDED.two_factor_enabled, avatar_url = EXCLUDED.avatar_url,
  updated_at = EXCLUDED.updated_at
WHERE users.updated_at < EXCLUDED.updated_at OR users.updated_at IS NULL;

-- Theme Settings
INSERT INTO theme_settings SELECT * FROM prod_schema.theme_settings
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, light_theme = EXCLUDED.light_theme,
  dark_theme = EXCLUDED.dark_theme, brand_settings = EXCLUDED.brand_settings,
  layout_settings = EXCLUDED.layout_settings, active_theme = EXCLUDED.active_theme,
  updated_at = EXCLUDED.updated_at
WHERE theme_settings.updated_at < EXCLUDED.updated_at OR theme_settings.updated_at IS NULL;

-- Activity Logs
INSERT INTO activity_logs SELECT * FROM prod_schema.activity_logs ON CONFLICT (id) DO NOTHING;

-- ========================================
-- FEATURE MANAGEMENT
-- ========================================

-- Platform Features
INSERT INTO platform_features SELECT * FROM prod_schema.platform_features
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, parent_feature_id = EXCLUDED.parent_feature_id,
  name = EXCLUDED.name, visibility_status = EXCLUDED.visibility_status, is_enabled = EXCLUDED.is_enabled,
  scope_definition = EXCLUDED.scope_definition, icon = EXCLUDED.icon, route = EXCLUDED.route,
  overview = EXCLUDED.overview, database_tables = EXCLUDED.database_tables,
  user_documentation = EXCLUDED.user_documentation, implementation_details = EXCLUDED.implementation_details,
  technical_specifications = EXCLUDED.technical_specifications, linked_page_ids = EXCLUDED.linked_page_ids,
  created_by = EXCLUDED.created_by, updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at
WHERE platform_features.updated_at < EXCLUDED.updated_at OR platform_features.updated_at IS NULL;

-- Feature Comments
INSERT INTO feature_comments SELECT * FROM prod_schema.feature_comments
ON CONFLICT (id) DO UPDATE SET
  feature_id = EXCLUDED.feature_id, author_id = EXCLUDED.author_id, message = EXCLUDED.message,
  is_admin_message = EXCLUDED.is_admin_message, updated_at = EXCLUDED.updated_at
WHERE feature_comments.updated_at < EXCLUDED.updated_at OR feature_comments.updated_at IS NULL;

-- Feature Feedback
INSERT INTO feature_feedback SELECT * FROM prod_schema.feature_feedback
ON CONFLICT (id) DO UPDATE SET
  feature_id = EXCLUDED.feature_id, user_id = EXCLUDED.user_id, feedback_type = EXCLUDED.feedback_type,
  message = EXCLUDED.message, status = EXCLUDED.status, upvotes = EXCLUDED.upvotes,
  updated_at = EXCLUDED.updated_at
WHERE feature_feedback.updated_at < EXCLUDED.updated_at OR feature_feedback.updated_at IS NULL;

-- ========================================
-- STRATEGY MANAGEMENT
-- ========================================

-- Mission Vision
INSERT INTO mission_vision SELECT * FROM prod_schema.mission_vision
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, mission = EXCLUDED.mission, vision = EXCLUDED.vision,
  strategy_statement_html = EXCLUDED.strategy_statement_html, updated_by = EXCLUDED.updated_by,
  updated_at = EXCLUDED.updated_at
WHERE mission_vision.updated_at < EXCLUDED.updated_at OR mission_vision.updated_at IS NULL;

-- Objectives
INSERT INTO objectives SELECT * FROM prod_schema.objectives
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, title = EXCLUDED.title, description = EXCLUDED.description,
  primary_kpi = EXCLUDED.primary_kpi, calculation_formula = EXCLUDED.calculation_formula,
  last_calculated_at = EXCLUDED.last_calculated_at, category = EXCLUDED.category, priority = EXCLUDED.priority,
  status = EXCLUDED.status, target_value = EXCLUDED.target_value, current_value = EXCLUDED.current_value,
  kpi_type = EXCLUDED.kpi_type, target_date = EXCLUDED.target_date, owner_id = EXCLUDED.owner_id,
  is_owner_only = EXCLUDED.is_owner_only, display_order = EXCLUDED.display_order,
  created_by = EXCLUDED.created_by, updated_at = EXCLUDED.updated_at
WHERE objectives.updated_at < EXCLUDED.updated_at OR objectives.updated_at IS NULL;

-- Key Results
INSERT INTO key_results SELECT * FROM prod_schema.key_results
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, objective_id = EXCLUDED.objective_id, title = EXCLUDED.title,
  description = EXCLUDED.description, target_value = EXCLUDED.target_value, current_value = EXCLUDED.current_value,
  type = EXCLUDED.type, status = EXCLUDED.status, knowledge_document_id = EXCLUDED.knowledge_document_id,
  team_id = EXCLUDED.team_id, assigned_to = EXCLUDED.assigned_to, owner_id = EXCLUDED.owner_id,
  created_by = EXCLUDED.created_by, updated_at = EXCLUDED.updated_at
WHERE key_results.updated_at < EXCLUDED.updated_at OR key_results.updated_at IS NULL;

-- Key Result Tasks
INSERT INTO key_result_tasks SELECT * FROM prod_schema.key_result_tasks
ON CONFLICT (id) DO UPDATE SET
  key_result_id = EXCLUDED.key_result_id, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, assigned_to = EXCLUDED.assigned_to, updated_at = EXCLUDED.updated_at
WHERE key_result_tasks.updated_at < EXCLUDED.updated_at OR key_result_tasks.updated_at IS NULL;

-- Key Result Comments
INSERT INTO key_result_comments SELECT * FROM prod_schema.key_result_comments ON CONFLICT (id) DO NOTHING;

-- Routines
INSERT INTO routines SELECT * FROM prod_schema.routines
ON CONFLICT (id) DO UPDATE SET
  objective_id = EXCLUDED.objective_id, key_result_id = EXCLUDED.key_result_id, title = EXCLUDED.title,
  description = EXCLUDED.description, frequency = EXCLUDED.frequency, scheduled_day = EXCLUDED.scheduled_day,
  scheduled_time = EXCLUDED.scheduled_time, is_active = EXCLUDED.is_active, assigned_to = EXCLUDED.assigned_to,
  updated_at = EXCLUDED.updated_at
WHERE routines.updated_at < EXCLUDED.updated_at OR routines.updated_at IS NULL;

-- Work Items
INSERT INTO work_items SELECT * FROM prod_schema.work_items
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, key_result_id = EXCLUDED.key_result_id,
  objective_id = EXCLUDED.objective_id, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, team_id = EXCLUDED.team_id, assigned_to = EXCLUDED.assigned_to,
  due_date = EXCLUDED.due_date, completed_at = EXCLUDED.completed_at, updated_at = EXCLUDED.updated_at
WHERE work_items.updated_at < EXCLUDED.updated_at OR work_items.updated_at IS NULL;

-- Teams
INSERT INTO teams SELECT * FROM prod_schema.teams
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, name = EXCLUDED.name, description = EXCLUDED.description,
  default_cadence = EXCLUDED.default_cadence, meeting_day = EXCLUDED.meeting_day,
  meeting_time = EXCLUDED.meeting_time, updated_at = EXCLUDED.updated_at
WHERE teams.updated_at < EXCLUDED.updated_at OR teams.updated_at IS NULL;

-- Team Members
INSERT INTO team_members SELECT * FROM prod_schema.team_members
ON CONFLICT (id) DO UPDATE SET
  team_id = EXCLUDED.team_id, user_id = EXCLUDED.user_id, role = EXCLUDED.role,
  is_active = EXCLUDED.is_active
WHERE team_members.id = EXCLUDED.id;

-- Check-in Cycles
INSERT INTO check_in_cycles SELECT * FROM prod_schema.check_in_cycles
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, team_id = EXCLUDED.team_id, title = EXCLUDED.title,
  description = EXCLUDED.description, status = EXCLUDED.status, start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date, updated_at = EXCLUDED.updated_at
WHERE check_in_cycles.updated_at < EXCLUDED.updated_at OR check_in_cycles.updated_at IS NULL;

-- Check-in Cycle Participants
INSERT INTO check_in_cycle_participants SELECT * FROM prod_schema.check_in_cycle_participants ON CONFLICT (id) DO NOTHING;

-- Objectives Snapshots
INSERT INTO objectives_snapshots SELECT * FROM prod_schema.objectives_snapshots ON CONFLICT (id) DO NOTHING;

-- Work Items Snapshots
INSERT INTO work_items_snapshots SELECT * FROM prod_schema.work_items_snapshots ON CONFLICT (id) DO NOTHING;

-- Check-in Meetings
INSERT INTO check_in_meetings SELECT * FROM prod_schema.check_in_meetings
ON CONFLICT (id) DO UPDATE SET
  cycle_id = EXCLUDED.cycle_id, scheduled_at = EXCLUDED.scheduled_at, status = EXCLUDED.status,
  notes = EXCLUDED.notes, updated_at = EXCLUDED.updated_at
WHERE check_in_meetings.updated_at < EXCLUDED.updated_at OR check_in_meetings.updated_at IS NULL;

-- Meeting Topics
INSERT INTO meeting_topics SELECT * FROM prod_schema.meeting_topics ON CONFLICT (id) DO NOTHING;

-- Meeting Attendees
INSERT INTO meeting_attendees SELECT * FROM prod_schema.meeting_attendees ON CONFLICT (id) DO NOTHING;

-- Meeting Item Updates
INSERT INTO meeting_item_updates SELECT * FROM prod_schema.meeting_item_updates ON CONFLICT (id) DO NOTHING;

-- Team Feedback
INSERT INTO team_feedback SELECT * FROM prod_schema.team_feedback
ON CONFLICT (id) DO UPDATE SET
  team_id = EXCLUDED.team_id, user_id = EXCLUDED.user_id, feedback_type = EXCLUDED.feedback_type,
  content = EXCLUDED.content, updated_at = EXCLUDED.updated_at
WHERE team_feedback.updated_at < EXCLUDED.updated_at OR team_feedback.updated_at IS NULL;

-- Key Result Snapshots
INSERT INTO key_result_snapshots SELECT * FROM prod_schema.key_result_snapshots ON CONFLICT (id) DO NOTHING;

-- ========================================
-- KNOWLEDGE BASE
-- ========================================

-- Knowledge Categories
INSERT INTO knowledge_categories SELECT * FROM prod_schema.knowledge_categories
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, name = EXCLUDED.name, description = EXCLUDED.description,
  parent_id = EXCLUDED.parent_id, icon = EXCLUDED.icon, color = EXCLUDED.color, order_index = EXCLUDED.order_index,
  updated_at = EXCLUDED.updated_at
WHERE knowledge_categories.updated_at < EXCLUDED.updated_at OR knowledge_categories.updated_at IS NULL;

-- Knowledge Documents
INSERT INTO knowledge_documents SELECT * FROM prod_schema.knowledge_documents
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, title = EXCLUDED.title, content = EXCLUDED.content,
  summary = EXCLUDED.summary, categories = EXCLUDED.categories, tags = EXCLUDED.tags,
  status = EXCLUDED.status, visibility = EXCLUDED.visibility, featured_image = EXCLUDED.featured_image,
  estimated_reading_time = EXCLUDED.estimated_reading_time, author_id = EXCLUDED.author_id,
  last_edited_by = EXCLUDED.last_edited_by, version = EXCLUDED.version, view_count = EXCLUDED.view_count,
  helpful_count = EXCLUDED.helpful_count, updated_at = EXCLUDED.updated_at
WHERE knowledge_documents.updated_at < EXCLUDED.updated_at OR knowledge_documents.updated_at IS NULL;

-- Knowledge Document Versions
INSERT INTO knowledge_document_versions SELECT * FROM prod_schema.knowledge_document_versions ON CONFLICT (id) DO NOTHING;

-- Knowledge Document Attachments
INSERT INTO knowledge_document_attachments SELECT * FROM prod_schema.knowledge_document_attachments ON CONFLICT (id) DO NOTHING;

-- Knowledge Document Activity
INSERT INTO knowledge_document_activity SELECT * FROM prod_schema.knowledge_document_activity ON CONFLICT (id) DO NOTHING;

-- ========================================
-- PAGE MANAGEMENT
-- ========================================

-- Layout Templates
INSERT INTO layout_templates SELECT * FROM prod_schema.layout_templates
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, layout_rules = EXCLUDED.layout_rules, section_templates = EXCLUDED.section_templates,
  component_guidelines = EXCLUDED.component_guidelines, responsive_breakpoints = EXCLUDED.responsive_breakpoints,
  design_principles = EXCLUDED.design_principles, code_patterns = EXCLUDED.code_patterns,
  accessibility = EXCLUDED.accessibility, is_active = EXCLUDED.is_active, is_global = EXCLUDED.is_global,
  usage_count = EXCLUDED.usage_count, created_by = EXCLUDED.created_by, updated_by = EXCLUDED.updated_by,
  updated_at = EXCLUDED.updated_at
WHERE layout_templates.updated_at < EXCLUDED.updated_at OR layout_templates.updated_at IS NULL;

-- Strategy Settings
INSERT INTO strategy_settings SELECT * FROM prod_schema.strategy_settings
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, cron_enabled = EXCLUDED.cron_enabled,
  cron_schedule = EXCLUDED.cron_schedule, lookahead_days = EXCLUDED.lookahead_days,
  last_cron_execution = EXCLUDED.last_cron_execution, auto_generate_work_items = EXCLUDED.auto_generate_work_items,
  generate_on_task_creation = EXCLUDED.generate_on_task_creation, notify_on_generation = EXCLUDED.notify_on_generation,
  notify_email_recipients = EXCLUDED.notify_email_recipients, updated_at = EXCLUDED.updated_at,
  updated_by = EXCLUDED.updated_by
WHERE strategy_settings.updated_at < EXCLUDED.updated_at OR strategy_settings.updated_at IS NULL;

-- Pages
INSERT INTO pages SELECT * FROM prod_schema.pages
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, slug = EXCLUDED.slug, path = EXCLUDED.path, title = EXCLUDED.title,
  description = EXCLUDED.description, unified_status = EXCLUDED.unified_status, status = EXCLUDED.status,
  build_status = EXCLUDED.build_status, functions = EXCLUDED.functions, is_core_page = EXCLUDED.is_core_page,
  owner_user_id = EXCLUDED.owner_user_id, page_content = EXCLUDED.page_content,
  theme_overrides = EXCLUDED.theme_overrides, layout_template_id = EXCLUDED.layout_template_id,
  visibility_rules = EXCLUDED.visibility_rules, page_metadata = EXCLUDED.page_metadata,
  component_config = EXCLUDED.component_config, updated_at = EXCLUDED.updated_at, deleted_at = EXCLUDED.deleted_at
WHERE pages.updated_at < EXCLUDED.updated_at OR pages.updated_at IS NULL;

-- New Page Requests
INSERT INTO new_page_requests SELECT * FROM prod_schema.new_page_requests
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, title = EXCLUDED.title, description = EXCLUDED.description,
  use_case = EXCLUDED.use_case, target_roles = EXCLUDED.target_roles, org_scope = EXCLUDED.org_scope,
  org_list = EXCLUDED.org_list, functions_expected = EXCLUDED.functions_expected, status = EXCLUDED.status,
  requested_by = EXCLUDED.requested_by, approved_by = EXCLUDED.approved_by, updated_at = EXCLUDED.updated_at
WHERE new_page_requests.updated_at < EXCLUDED.updated_at OR new_page_requests.updated_at IS NULL;

-- ========================================
-- DATABASE EXPLORER
-- ========================================

-- Data Tables
INSERT INTO data_tables SELECT * FROM prod_schema.data_tables
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, table_name = EXCLUDED.table_name, label = EXCLUDED.label,
  description = EXCLUDED.description, doc_url = EXCLUDED.doc_url, row_count = EXCLUDED.row_count,
  size_bytes = EXCLUDED.size_bytes, last_analyzed = EXCLUDED.last_analyzed, updated_at = EXCLUDED.updated_at
WHERE data_tables.updated_at < EXCLUDED.updated_at OR data_tables.updated_at IS NULL;

-- Data Fields
INSERT INTO data_fields SELECT * FROM prod_schema.data_fields ON CONFLICT (id) DO NOTHING;

-- Data Relationships
INSERT INTO data_relationships SELECT * FROM prod_schema.data_relationships ON CONFLICT (id) DO NOTHING;

-- ERD Layouts
INSERT INTO erd_layouts SELECT * FROM prod_schema.erd_layouts
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, user_id = EXCLUDED.user_id, name = EXCLUDED.name,
  layout_data = EXCLUDED.layout_data, is_default = EXCLUDED.is_default, updated_at = EXCLUDED.updated_at
WHERE erd_layouts.updated_at < EXCLUDED.updated_at OR erd_layouts.updated_at IS NULL;

-- ========================================
-- INTEGRATIONS & AGENTS
-- ========================================

-- Integrations (excluding credentialsEncrypted)
INSERT INTO integrations (id, organization_id, platform_type, name, connection_config, connection_status,
  last_tested_at, test_result, is_enabled, created_at, updated_at)
SELECT id, organization_id, platform_type, name, connection_config, connection_status,
  last_tested_at, test_result, is_enabled, created_at, updated_at
FROM prod_schema.integrations
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, platform_type = EXCLUDED.platform_type, name = EXCLUDED.name,
  connection_config = EXCLUDED.connection_config, connection_status = EXCLUDED.connection_status,
  last_tested_at = EXCLUDED.last_tested_at, test_result = EXCLUDED.test_result,
  is_enabled = EXCLUDED.is_enabled, updated_at = EXCLUDED.updated_at
WHERE integrations.updated_at < EXCLUDED.updated_at OR integrations.updated_at IS NULL;

-- SQL Direct Audit Logs
INSERT INTO sql_direct_audit_logs SELECT * FROM prod_schema.sql_direct_audit_logs ON CONFLICT (id) DO NOTHING;

-- Database Connections (excluding passwordEncrypted)
INSERT INTO database_connections (id, integration_id, organization_id, database_type, display_name, host, port,
  database, username, schema, connection_string, ssl_config, pool_config, connection_status, last_tested_at,
  last_test_error, created_at, updated_at)
SELECT id, integration_id, organization_id, database_type, display_name, host, port,
  database, username, schema, connection_string, ssl_config, pool_config, connection_status, last_tested_at,
  last_test_error, created_at, updated_at
FROM prod_schema.database_connections
ON CONFLICT (id) DO UPDATE SET
  integration_id = EXCLUDED.integration_id, organization_id = EXCLUDED.organization_id,
  database_type = EXCLUDED.database_type, display_name = EXCLUDED.display_name, host = EXCLUDED.host,
  port = EXCLUDED.port, database = EXCLUDED.database, username = EXCLUDED.username,
  schema = EXCLUDED.schema, connection_string = EXCLUDED.connection_string, ssl_config = EXCLUDED.ssl_config,
  pool_config = EXCLUDED.pool_config, connection_status = EXCLUDED.connection_status,
  last_tested_at = EXCLUDED.last_tested_at, last_test_error = EXCLUDED.last_test_error,
  updated_at = EXCLUDED.updated_at
WHERE database_connections.updated_at < EXCLUDED.updated_at OR database_connections.updated_at IS NULL;

-- Splynx Locations
INSERT INTO splynx_locations SELECT * FROM prod_schema.splynx_locations
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, splynx_location_id = EXCLUDED.splynx_location_id,
  name = EXCLUDED.name, location_type = EXCLUDED.location_type, default_lat = EXCLUDED.default_lat,
  default_lng = EXCLUDED.default_lng, last_synced_at = EXCLUDED.last_synced_at, is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata, updated_at = EXCLUDED.updated_at
WHERE splynx_locations.updated_at < EXCLUDED.updated_at OR splynx_locations.updated_at IS NULL;

-- Customer Geocoding Cache
INSERT INTO customer_geocoding_cache SELECT * FROM prod_schema.customer_geocoding_cache
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, splynx_customer_id = EXCLUDED.splynx_customer_id,
  address_hash = EXCLUDED.address_hash, full_address = EXCLUDED.full_address, latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude, geocode_method = EXCLUDED.geocode_method, geocode_status = EXCLUDED.geocode_status,
  geocode_response = EXCLUDED.geocode_response, geocoded_at = EXCLUDED.geocoded_at, updated_at = EXCLUDED.updated_at
WHERE customer_geocoding_cache.updated_at < EXCLUDED.updated_at OR customer_geocoding_cache.updated_at IS NULL;

-- Agent Workflows
INSERT INTO agent_workflows SELECT * FROM prod_schema.agent_workflows
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, name = EXCLUDED.name, description = EXCLUDED.description,
  trigger_type = EXCLUDED.trigger_type, trigger_config = EXCLUDED.trigger_config,
  workflow_definition = EXCLUDED.workflow_definition, target_key_result_id = EXCLUDED.target_key_result_id,
  target_objective_id = EXCLUDED.target_objective_id, assigned_team_id = EXCLUDED.assigned_team_id,
  retry_config = EXCLUDED.retry_config, execution_timeout = EXCLUDED.execution_timeout,
  webhook_token = EXCLUDED.webhook_token, is_enabled = EXCLUDED.is_enabled, last_run_at = EXCLUDED.last_run_at,
  last_run_status = EXCLUDED.last_run_status, last_successful_run_at = EXCLUDED.last_successful_run_at,
  created_by = EXCLUDED.created_by, assigned_user_id = EXCLUDED.assigned_user_id, updated_at = EXCLUDED.updated_at
WHERE agent_workflows.updated_at < EXCLUDED.updated_at OR agent_workflows.updated_at IS NULL;

-- Agent Workflow Runs
INSERT INTO agent_workflow_runs SELECT * FROM prod_schema.agent_workflow_runs ON CONFLICT (id) DO NOTHING;

-- Integration Triggers (excluding webhookSecret)
INSERT INTO integration_triggers (id, integration_id, trigger_key, name, description, category, event_type,
  webhook_endpoint, payload_schema, available_fields, configuration, parameter_schema, response_schema,
  sample_payload, docs_url, auth_scope, resource_type, webhook_url, last_webhook_at, webhook_event_count,
  is_active, is_configured, last_triggered_at, created_at, updated_at)
SELECT id, integration_id, trigger_key, name, description, category, event_type,
  webhook_endpoint, payload_schema, available_fields, configuration, parameter_schema, response_schema,
  sample_payload, docs_url, auth_scope, resource_type, webhook_url, last_webhook_at, webhook_event_count,
  is_active, is_configured, last_triggered_at, created_at, updated_at
FROM prod_schema.integration_triggers
ON CONFLICT (id) DO UPDATE SET
  integration_id = EXCLUDED.integration_id, trigger_key = EXCLUDED.trigger_key, name = EXCLUDED.name,
  description = EXCLUDED.description, category = EXCLUDED.category, event_type = EXCLUDED.event_type,
  webhook_endpoint = EXCLUDED.webhook_endpoint, payload_schema = EXCLUDED.payload_schema,
  available_fields = EXCLUDED.available_fields, configuration = EXCLUDED.configuration,
  parameter_schema = EXCLUDED.parameter_schema, response_schema = EXCLUDED.response_schema,
  sample_payload = EXCLUDED.sample_payload, docs_url = EXCLUDED.docs_url, auth_scope = EXCLUDED.auth_scope,
  resource_type = EXCLUDED.resource_type, webhook_url = EXCLUDED.webhook_url,
  last_webhook_at = EXCLUDED.last_webhook_at, webhook_event_count = EXCLUDED.webhook_event_count,
  is_active = EXCLUDED.is_active, is_configured = EXCLUDED.is_configured,
  last_triggered_at = EXCLUDED.last_triggered_at, updated_at = EXCLUDED.updated_at
WHERE integration_triggers.updated_at < EXCLUDED.updated_at OR integration_triggers.updated_at IS NULL;

-- Integration Actions
INSERT INTO integration_actions SELECT * FROM prod_schema.integration_actions
ON CONFLICT (id) DO UPDATE SET
  integration_id = EXCLUDED.integration_id, action_key = EXCLUDED.action_key, name = EXCLUDED.name,
  description = EXCLUDED.description, category = EXCLUDED.category, http_method = EXCLUDED.http_method,
  endpoint = EXCLUDED.endpoint, parameter_schema = EXCLUDED.parameter_schema, response_schema = EXCLUDED.response_schema,
  sample_request = EXCLUDED.sample_request, sample_response = EXCLUDED.sample_response, docs_url = EXCLUDED.docs_url,
  auth_scope = EXCLUDED.auth_scope, resource_type = EXCLUDED.resource_type, idempotent = EXCLUDED.idempotent,
  side_effects = EXCLUDED.side_effects, required_fields = EXCLUDED.required_fields,
  optional_fields = EXCLUDED.optional_fields, is_active = EXCLUDED.is_active, last_used_at = EXCLUDED.last_used_at,
  usage_count = EXCLUDED.usage_count, version = EXCLUDED.version, last_synced_at = EXCLUDED.last_synced_at,
  updated_at = EXCLUDED.updated_at
WHERE integration_actions.updated_at < EXCLUDED.updated_at OR integration_actions.updated_at IS NULL;

-- Webhook Events
INSERT INTO webhook_events SELECT * FROM prod_schema.webhook_events ON CONFLICT (id) DO NOTHING;

-- Agent Workflow Schedules
INSERT INTO agent_workflow_schedules SELECT * FROM prod_schema.agent_workflow_schedules
ON CONFLICT (id) DO UPDATE SET
  workflow_id = EXCLUDED.workflow_id, organization_id = EXCLUDED.organization_id,
  cron_expression = EXCLUDED.cron_expression, timezone = EXCLUDED.timezone, is_active = EXCLUDED.is_active,
  next_run_at = EXCLUDED.next_run_at, last_run_at = EXCLUDED.last_run_at, updated_at = EXCLUDED.updated_at
WHERE agent_workflow_schedules.updated_at < EXCLUDED.updated_at OR agent_workflow_schedules.updated_at IS NULL;

-- ========================================
-- FIELD TASKS & WORKFLOWS
-- ========================================

-- Task Type Configurations
INSERT INTO task_type_configurations SELECT * FROM prod_schema.task_type_configurations
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, splynx_type_id = EXCLUDED.splynx_type_id,
  splynx_type_name = EXCLUDED.splynx_type_name, app_task_type = EXCLUDED.app_task_type,
  workflow_template_id = EXCLUDED.workflow_template_id, display_name = EXCLUDED.display_name,
  color = EXCLUDED.color, icon_name = EXCLUDED.icon_name, estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
  requires_signature = EXCLUDED.requires_signature, requires_photos = EXCLUDED.requires_photos,
  requires_customer_present = EXCLUDED.requires_customer_present, is_active = EXCLUDED.is_active,
  show_in_mobile_app = EXCLUDED.show_in_mobile_app, default_priority = EXCLUDED.default_priority,
  sort_order = EXCLUDED.sort_order, updated_at = EXCLUDED.updated_at
WHERE task_type_configurations.updated_at < EXCLUDED.updated_at OR task_type_configurations.updated_at IS NULL;

-- Workflow Templates
INSERT INTO workflow_templates SELECT * FROM prod_schema.workflow_templates
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, applicable_types = EXCLUDED.applicable_types, steps = EXCLUDED.steps,
  version = EXCLUDED.version, is_active = EXCLUDED.is_active, is_system_template = EXCLUDED.is_system_template,
  estimated_minutes = EXCLUDED.estimated_minutes, display_in_menu = EXCLUDED.display_in_menu,
  menu_label = EXCLUDED.menu_label, menu_icon = EXCLUDED.menu_icon, menu_order = EXCLUDED.menu_order,
  default_filters = EXCLUDED.default_filters, table_columns = EXCLUDED.table_columns,
  completion_callbacks = EXCLUDED.completion_callbacks, updated_at = EXCLUDED.updated_at
WHERE workflow_templates.updated_at < EXCLUDED.updated_at OR workflow_templates.updated_at IS NULL;

-- Field Tasks
INSERT INTO field_tasks SELECT * FROM prod_schema.field_tasks
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, splynx_task_id = EXCLUDED.splynx_task_id, title = EXCLUDED.title,
  description = EXCLUDED.description, splynx_task_type = EXCLUDED.splynx_task_type,
  task_type_config_id = EXCLUDED.task_type_config_id, app_task_type = EXCLUDED.app_task_type,
  workflow_template_id = EXCLUDED.workflow_template_id, status = EXCLUDED.status, priority = EXCLUDED.priority,
  assigned_to_user_id = EXCLUDED.assigned_to_user_id, assigned_to_splynx_id = EXCLUDED.assigned_to_splynx_id,
  team_id = EXCLUDED.team_id, project_id = EXCLUDED.project_id, customer_name = EXCLUDED.customer_name,
  customer_id = EXCLUDED.customer_id, address = EXCLUDED.address, latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude, scheduled_date = EXCLUDED.scheduled_date, scheduled_start_time = EXCLUDED.scheduled_start_time,
  scheduled_end_time = EXCLUDED.scheduled_end_time, actual_start_time = EXCLUDED.actual_start_time,
  actual_end_time = EXCLUDED.actual_end_time, completed_at = EXCLUDED.completed_at, sync_status = EXCLUDED.sync_status,
  last_synced_at = EXCLUDED.last_synced_at, splynx_last_modified = EXCLUDED.splynx_last_modified,
  local_last_modified = EXCLUDED.local_last_modified, updated_at = EXCLUDED.updated_at
WHERE field_tasks.updated_at < EXCLUDED.updated_at OR field_tasks.updated_at IS NULL;

-- Field Task Executions
INSERT INTO field_task_executions SELECT * FROM prod_schema.field_task_executions
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, task_id = EXCLUDED.task_id,
  workflow_template_id = EXCLUDED.workflow_template_id, status = EXCLUDED.status,
  current_step_index = EXCLUDED.current_step_index, step_responses = EXCLUDED.step_responses,
  started_at = EXCLUDED.started_at, completed_at = EXCLUDED.completed_at, updated_at = EXCLUDED.updated_at
WHERE field_task_executions.updated_at < EXCLUDED.updated_at OR field_task_executions.updated_at IS NULL;

-- Task Checklists
INSERT INTO task_checklists SELECT * FROM prod_schema.task_checklists
ON CONFLICT (id) DO UPDATE SET
  task_id = EXCLUDED.task_id, splynx_checklist_id = EXCLUDED.splynx_checklist_id, items = EXCLUDED.items,
  completed_count = EXCLUDED.completed_count, total_count = EXCLUDED.total_count, updated_at = EXCLUDED.updated_at
WHERE task_checklists.updated_at < EXCLUDED.updated_at OR task_checklists.updated_at IS NULL;

-- Visit Workflows
INSERT INTO visit_workflows SELECT * FROM prod_schema.visit_workflows
ON CONFLICT (id) DO UPDATE SET
  task_id = EXCLUDED.task_id, workflow_type = EXCLUDED.workflow_type, steps = EXCLUDED.steps,
  current_step_index = EXCLUDED.current_step_index, photos = EXCLUDED.photos, signatures = EXCLUDED.signatures,
  notes = EXCLUDED.notes, completed_at = EXCLUDED.completed_at, updated_at = EXCLUDED.updated_at
WHERE visit_workflows.updated_at < EXCLUDED.updated_at OR visit_workflows.updated_at IS NULL;

-- Vehicle Checks
INSERT INTO vehicle_checks SELECT * FROM prod_schema.vehicle_checks ON CONFLICT (id) DO NOTHING;

-- Work Item Workflow Executions
INSERT INTO work_item_workflow_executions SELECT * FROM prod_schema.work_item_workflow_executions
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, work_item_id = EXCLUDED.work_item_id,
  workflow_template_id = EXCLUDED.workflow_template_id, status = EXCLUDED.status,
  current_step_id = EXCLUDED.current_step_id, execution_data = EXCLUDED.execution_data,
  started_at = EXCLUDED.started_at, completed_at = EXCLUDED.completed_at, updated_at = EXCLUDED.updated_at
WHERE work_item_workflow_executions.updated_at < EXCLUDED.updated_at OR work_item_workflow_executions.updated_at IS NULL;

-- Work Item Workflow Execution Steps
INSERT INTO work_item_workflow_execution_steps SELECT * FROM prod_schema.work_item_workflow_execution_steps
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, work_item_id = EXCLUDED.work_item_id,
  execution_id = EXCLUDED.execution_id, step_index = EXCLUDED.step_index, step_title = EXCLUDED.step_title,
  step_description = EXCLUDED.step_description, status = EXCLUDED.status, completed_at = EXCLUDED.completed_at,
  completed_by = EXCLUDED.completed_by, notes = EXCLUDED.notes, evidence = EXCLUDED.evidence,
  updated_at = EXCLUDED.updated_at
WHERE work_item_workflow_execution_steps.updated_at < EXCLUDED.updated_at OR work_item_workflow_execution_steps.updated_at IS NULL;

-- Integration Workflow Mappings
INSERT INTO integration_workflow_mappings SELECT * FROM prod_schema.integration_workflow_mappings
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, integration_name = EXCLUDED.integration_name,
  external_task_type = EXCLUDED.external_task_type, workflow_template_id = EXCLUDED.workflow_template_id,
  field_mappings = EXCLUDED.field_mappings, auto_sync = EXCLUDED.auto_sync, is_active = EXCLUDED.is_active,
  updated_at = EXCLUDED.updated_at
WHERE integration_workflow_mappings.updated_at < EXCLUDED.updated_at OR integration_workflow_mappings.updated_at IS NULL;

-- Sync Queue
INSERT INTO sync_queue SELECT * FROM prod_schema.sync_queue ON CONFLICT (id) DO NOTHING;

-- Splynx Administrators
INSERT INTO splynx_administrators SELECT * FROM prod_schema.splynx_administrators
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, splynx_admin_id = EXCLUDED.splynx_admin_id,
  login = EXCLUDED.login, full_name = EXCLUDED.full_name, email = EXCLUDED.email,
  partner_id = EXCLUDED.partner_id, role = EXCLUDED.role, is_active = EXCLUDED.is_active,
  last_fetched_at = EXCLUDED.last_fetched_at, updated_at = EXCLUDED.updated_at
WHERE splynx_administrators.updated_at < EXCLUDED.updated_at OR splynx_administrators.updated_at IS NULL;

-- ========================================
-- FIBER NETWORK MAPPING
-- ========================================

-- Fiber Network Nodes
INSERT INTO fiber_network_nodes SELECT * FROM prod_schema.fiber_network_nodes
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, tenant_id = EXCLUDED.tenant_id, name = EXCLUDED.name,
  node_type = EXCLUDED.node_type, status = EXCLUDED.status, network = EXCLUDED.network,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, what3words = EXCLUDED.what3words,
  address = EXCLUDED.address, notes = EXCLUDED.notes, photos = EXCLUDED.photos,
  fiber_details = EXCLUDED.fiber_details, created_by = EXCLUDED.created_by, updated_by = EXCLUDED.updated_by,
  updated_at = EXCLUDED.updated_at
WHERE fiber_network_nodes.updated_at < EXCLUDED.updated_at OR fiber_network_nodes.updated_at IS NULL;

-- Fiber Network Activity Logs
INSERT INTO fiber_network_activity_logs SELECT * FROM prod_schema.fiber_network_activity_logs ON CONFLICT (id) DO NOTHING;

-- ========================================
-- AIRTABLE INTEGRATION
-- ========================================

-- Airtable Connections
INSERT INTO airtable_connections SELECT * FROM prod_schema.airtable_connections
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, base_id = EXCLUDED.base_id, base_name = EXCLUDED.base_name,
  table_id = EXCLUDED.table_id, table_name = EXCLUDED.table_name, menu_item_id = EXCLUDED.menu_item_id,
  is_active = EXCLUDED.is_active, sync_enabled = EXCLUDED.sync_enabled, last_synced_at = EXCLUDED.last_synced_at,
  table_schema = EXCLUDED.table_schema, settings = EXCLUDED.settings, created_by = EXCLUDED.created_by,
  updated_at = EXCLUDED.updated_at
WHERE airtable_connections.updated_at < EXCLUDED.updated_at OR airtable_connections.updated_at IS NULL;

-- Airtable Workflow Templates
INSERT INTO airtable_workflow_templates SELECT * FROM prod_schema.airtable_workflow_templates
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id, connection_id = EXCLUDED.connection_id, name = EXCLUDED.name,
  description = EXCLUDED.description, field_mappings = EXCLUDED.field_mappings,
  default_assignee_id = EXCLUDED.default_assignee_id, default_status = EXCLUDED.default_status,
  work_item_type = EXCLUDED.work_item_type, updated_at = EXCLUDED.updated_at
WHERE airtable_workflow_templates.updated_at < EXCLUDED.updated_at OR airtable_workflow_templates.updated_at IS NULL;

-- ========================================
-- EXCLUDED TABLES (NOT SYNCED)
-- ========================================
-- The following tables are INTENTIONALLY SKIPPED:
-- 1. sessions - Development-specific session data
-- 2. menu_sections - Per requirements, do not overwrite
-- 3. menu_items - Per requirements, do not overwrite
-- 
-- Secrets excluded from synced tables:
-- - users.passwordHash, users.vapiApiKey, users.twoFactorSecret
-- - tenants.dbPasswordEncrypted
-- - integrations.credentialsEncrypted
-- - databaseConnections.passwordEncrypted
-- - integrationTriggers.webhookSecret

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
