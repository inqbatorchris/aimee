-- ============================================================================
-- PAGES SYNCHRONIZATION SCRIPT: Development → Production
-- Generated: 2025-10-15
-- Total Pages: 48
-- ============================================================================
-- 
-- CRITICAL INSTRUCTIONS:
-- 1. **BACKUP PRODUCTION FIRST!** Run on production database:
--    CREATE TABLE pages_backup_20251015 AS SELECT * FROM pages;
--
-- 2. This script uses INSERT ... ON CONFLICT for safe UPSERT operations
-- 3. Existing pages with same (organization_id, slug) will be UPDATED
-- 4. New pages will be INSERTED
-- 5. Safe to run multiple times
--
-- HOW TO USE:
-- - Run this entire file on your PRODUCTION database
-- - Review the verification queries at the end
--
-- ============================================================================

BEGIN;

-- Log the sync operation
DO $$
BEGIN
  RAISE NOTICE 'Starting pages sync from development to production...';
  RAISE NOTICE 'Timestamp: %', NOW();
END $$;

-- ============================================================================
-- CORE PAGES (Organization ID: 3)
-- ============================================================================

-- Login Page
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, functions, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('eb4269ed-7c96-4c2f-943a-70c192311d0c'::uuid, 3, 'login', '/login', 'Login', 'User authentication and session management', 'live', 'released', '["auth", "session"]'::jsonb, true, 'draft', 'auth', '2025-08-14 10:18:28.242484', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Forgot Password
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, functions, is_core_page, unified_status, category, page_metadata, created_at, updated_at)
VALUES ('66e7c2a5-ec40-475f-a80c-ba8adda893c9'::uuid, 3, 'forgot-password', '/forgot-password', 'Forgot Password', 'Password recovery workflow', 'live', 'released', '["auth", "email"]'::jsonb, true, 'live', 'auth', '{"visibleInNavigation": false}'::jsonb, '2025-08-14 10:18:28.242484', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Reset Password
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, functions, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('34d5e581-cecc-4bb5-a765-7a9f32c5e9f4'::uuid, 3, 'reset-password', '/reset-password', 'Reset Password', 'Password reset confirmation', 'live', 'released', '["auth", "validation"]'::jsonb, true, 'draft', 'auth', '2025-08-14 10:18:28.242484', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- My Day Dashboard
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, functions, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('6abf2e1b-858b-4701-bb0f-3e3a26d2be67'::uuid, 3, 'my-day', '/', 'My Day', 'Personal dashboard with daily overview and quick actions', 'live', 'released', '["dashboard", "analytics", "tasks"]'::jsonb, true, 'draft', 'dashboard', '2025-08-14 10:18:28.242484', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Strategy: Mission & Vision
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, functions, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('220f4c77-53c5-4239-a57d-a5206fbff10b'::uuid, 3, 'strategy-mission-vision', '/strategy/mission-vision', 'Mission & Vision', 'Company mission, vision, and values management', 'live', 'released', '["company", "vision", "alignment"]'::jsonb, true, 'draft', 'strategy', '2025-08-14 10:18:28.242484', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Strategy: Check-in Dashboard
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, functions, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('e60c8b50-9f46-4061-ab8c-4bcaf2bf2eb8'::uuid, 3, 'checkin-dashboard', '/strategy/checkin', 'Check-in Dashboard', 'Progress tracking and team check-ins', 'live', 'released', '["checkin", "progress", "team"]'::jsonb, true, 'live', 'strategy', '2025-08-14 10:18:28.242484', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Strategy: Objectives
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, functions, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('c1256cc3-3514-4edd-912c-23cdf5990dd7'::uuid, 3, 'strategy-objectives', '/strategy/objectives', 'Objectives', 'Task management and work item tracking', 'live', 'released', '["tasks", "tracking", "collaboration"]'::jsonb, true, 'draft', 'productivity', '2025-08-14 10:18:28.242484', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Strategy: Work Items
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('7e852aff-4e9a-4e96-8b5a-4e7cf59e5b3c'::uuid, 3, 'strategy-work-items', '/strategy/work-items', 'Work Items', 'Task management and work item tracking', 'live', 'released', true, 'live', 'productivity', '2025-08-14 10:18:28.242484', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Strategy: Settings
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('7a713120-c92b-4b1e-b5b7-1fc06248d6bb'::uuid, 3, 'strategy-settings', '/strategy/settings', 'Strategy Settings', 'Configure automated work item generation and notifications', 'live', 'released', false, 'live', 'core', '2025-09-07 08:52:51.152767', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Strategy: Knowledge Base
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, is_core_page, unified_status, category, page_metadata, created_at, updated_at)
VALUES ('d5cb19fa-a2dd-4608-a50a-ba735bbd701b'::uuid, 3, 'strategy-knowledge-base', '/strategy/knowledge-base', 'Knowledge Base', 'Strategic knowledge base and documentation management for objectives, plans, and organizational knowledge', 'live', 'released', false, 'draft', 'core', '{"category": "strategy", "visibleInNavigation": true}'::jsonb, '2025-09-21 16:20:48.896133', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Dev Tools Main
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, functions, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('1a49cf6a-d589-4d42-a77c-e2c791495510'::uuid, 3, 'dev-tools', '/dev-tools', 'Dev Tools', 'Database explorer, page manager, and development utilities', 'live', 'released', '["development", "database", "tools"]'::jsonb, true, 'live', 'development', '2025-08-14 10:18:28.242484', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- ============================================================================
-- CORE SYSTEM PAGES
-- ============================================================================

-- User Profile
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, is_core_page, unified_status, category, page_content, created_at, updated_at)
VALUES ('0d022e38-3753-4be3-9e28-ed9288bcf6fc'::uuid, 3, 'user-profile-core', '/core/user-profile', 'User Profile', 'View and edit user profile information', 'live', 'testing', true, 'live', 'core', '{"sections": [{"type": "header", "content": {"title": "User Profile", "subtitle": "Your personal information"}}, {"type": "profile_card", "content": {"editable": true, "showAvatar": true}}]}'::jsonb, '2025-08-18 11:46:14.385043', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- People & Teams (User Management)
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, is_core_page, unified_status, category, page_content, created_at, updated_at)
VALUES ('e2cf0606-4524-4529-8ec7-f185f9ab9184'::uuid, 3, 'user-management-core', '/core/user-management', 'People & Teams', 'Manage users, teams, and organization membership', 'live', 'released', true, 'live', 'core', '{"sections": [{"type": "header", "content": {"title": "People & Teams", "subtitle": "Manage team members, teams, and permissions"}}, {"type": "user_table", "content": {"allowEdit": true, "showRoles": true, "showTeams": true, "showStatus": true}}]}'::jsonb, '2025-08-18 11:46:14.385043', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Account Settings
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('4e7e8f9a-1234-5678-9abc-def012345678'::uuid, 3, 'account-settings-core', '/core/account-settings', 'Settings', 'Personal account settings and preferences', 'live', 'released', true, 'live', 'core', '2025-08-18 11:46:14.385043', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Organization Settings
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('5f8f9g0b-2345-6789-0bcd-ef0123456789'::uuid, 3, 'organization-settings-core', '/core/organization-settings', 'Organization Settings', 'Manage organization-wide settings and configuration', 'live', 'released', true, 'live', 'core', '2025-08-18 11:46:14.385043', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Theme Editor
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('6g9h0i1c-3456-7890-1cde-f01234567890'::uuid, 3, 'theme-editor-core', '/core/theme-editor', 'Theme Editor', 'Customize organization theme and branding', 'live', 'released', false, 'live', 'core', '2025-08-18 11:46:14.385043', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Super Admin Platform Manager
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('7h0i1j2d-4567-8901-2def-012345678901'::uuid, 3, 'super-admin-platform-manager-core', '/core/super-admin-platform-manager', 'Super Admin Platform Manager', 'Platform-wide administration and management', 'live', 'released', true, 'live', 'core', '2025-08-18 11:46:14.385043', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- ============================================================================
-- DEV TOOLS PAGES
-- ============================================================================

-- Page Manager
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('8i1j2k3e-5678-9012-3efg-123456789012'::uuid, 3, 'dev-tools-pages', '/dev-tools/pages', 'Page Manager', 'Manage application pages and routes', 'live', 'released', false, 'live', 'development', '2025-08-18 11:46:14.385043', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Menu Manager
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('9j2k3l4f-6789-0123-4fgh-234567890123'::uuid, 3, 'dev-tools-menu', '/dev-tools/menu', 'Menu Manager', 'Configure navigation menus and structure', 'live', 'released', false, 'live', 'development', '2025-08-18 11:46:14.385043', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Feature Manager
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('0k3l4m5g-7890-1234-5ghi-345678901234'::uuid, 3, 'dev-tools-features', '/dev-tools/features', 'Feature Manager', 'Manage platform features and modules', 'live', 'released', false, 'live', 'development', '2025-08-18 11:46:14.385043', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Database Tools
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('1l4m5n6h-8901-2345-6hij-456789012345'::uuid, 3, 'dev-tools-database', '/dev-tools/database', 'Database Tools', 'Database exploration and management', 'live', 'released', false, 'live', 'development', '2025-08-18 11:46:14.385043', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Database Relationships
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('2m5n6o7i-9012-3456-7ijk-567890123456'::uuid, 3, 'dev-tools-relationships', '/dev-tools/relationships', 'Database Relationships', 'Visualize and manage database relationships', 'live', 'released', false, 'live', 'development', '2025-08-18 11:46:14.385043', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Developer Documentation
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('3n6o7p8j-0123-4567-8jkl-678901234567'::uuid, 3, 'dev-tools-documentation', '/dev-tools/documentation', 'Developer Documentation', 'Auto-generated developer documentation and API reference', 'live', 'released', true, 'live', 'development', '2025-09-01 12:00:00', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- ============================================================================
-- INTEGRATIONS & AUTOMATION (Organization 1 & 3)
-- ============================================================================

-- Integrations Hub (Org 1)
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, is_core_page, unified_status, category, page_metadata, created_at, updated_at)
VALUES ('b189bdb3-32be-4361-bb9f-d37ce94be232'::uuid, 1, 'integrations-hub', '/integrations', 'Integrations Hub', 'Central hub for managing all platform integrations including active connections, available integrations, and setup wizards. Features secure credential management, real-time connection testing, and comprehensive activity logging.', 'live', 'not_started', true, 'live', 'Integration Management', '{"features": ["Active/Available integration tabs", "Real-time connection testing", "Secure credential management", "Activity logging and monitoring"], "component_type": "integration_hub", "integration_platforms": ["splynx", "openai", "xero", "outlook", "firebase"]}'::jsonb, '2025-09-28 15:34:46.024335', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Agent Builder (Org 1)
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, is_core_page, unified_status, category, page_metadata, created_at, updated_at)
VALUES ('ab994bb8-af63-43eb-b2f2-305782b74dd0'::uuid, 1, 'agent-builder', '/agents', 'Agent Builder', 'Advanced workflow automation builder for creating intelligent agent workflows that connect integrations with triggers, conditions, and actions. Features visual workflow design, AI-powered suggestions, and real-time execution monitoring.', 'live', 'not_started', true, 'live', 'Automation', '{"features": ["Visual workflow designer", "Drag-and-drop interface", "AI-powered action suggestions", "Real-time execution monitoring", "Comprehensive logging"], "component_type": "agent_builder", "workflow_components": ["triggers", "conditions", "actions", "AI_processing"]}'::jsonb, '2025-09-28 15:34:46.024335', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Workflow Templates (Org 3)
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('4o7p8q9k-1234-5678-9klm-789012345678'::uuid, 3, 'workflow-templates', '/agents/workflows', 'Workflow Templates', 'Manage human workflow templates and checklists', 'live', 'released', true, 'live', 'automation', '2025-09-28 15:34:46.024335', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Agent Builder (Org 3)
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('5p8q9r0l-2345-6789-0lmn-890123456789'::uuid, 3, 'agent-builder', '/agents', 'Agent Builder', 'AI-powered automation workflow builder', 'live', 'released', true, 'live', 'automation', '2025-09-28 15:34:46.024335', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Splynx Setup (Org 3)
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('6q9r0s1m-3456-7890-1mno-901234567890'::uuid, 3, 'splynx-setup', '/integrations/splynx/setup', 'Splynx Setup', 'Configure Splynx ISP integration', 'live', 'released', false, 'live', 'integrations', '2025-09-21 16:20:48.896133', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Splynx Agents (Org 3)
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('7r0s1t2n-4567-8901-2nop-012345678901'::uuid, 3, 'splynx-agents', '/integrations/splynx/agents', 'Splynx Agents', 'Manage Splynx integration agents', 'live', 'released', false, 'live', 'integrations', '2025-09-21 16:20:48.896133', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- ============================================================================
-- FIELD ENGINEERING PAGES (Organization 4)
-- ============================================================================

-- Customer Mapping Tool
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('8s1t2u3o-5678-9012-3opq-123456789012'::uuid, 4, 'mapping-tool', '/field-engineering/customer-mapping', 'Mapping Tool', 'Interactive customer location mapping', 'live', 'released', false, 'live', 'field_engineering', '2025-09-21 16:20:48.896133', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Fiber Network (Org 4)
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('9t2u3v4p-6789-0123-4pqr-234567890123'::uuid, 4, 'fiber-network', '/field-engineering/fiber-network', 'Fiber Network', 'Fiber network infrastructure management', 'live', 'released', true, 'live', 'field_engineering', '2025-09-21 16:20:48.896133', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- Fiber Splicing (Org 4)
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, is_core_page, unified_status, category, created_at, updated_at)
VALUES ('0u3v4w5q-7890-1234-5qrs-345678901234'::uuid, 4, 'fiber-splicing', '/network/fiber-splicing', 'Fiber Splicing', 'Fiber optic splicing management and tracking', 'live', 'released', true, 'live', 'field_engineering', '2025-09-21 16:20:48.896133', NOW())
ON CONFLICT (organization_id, slug) DO UPDATE SET
  path = EXCLUDED.path, title = EXCLUDED.title, description = EXCLUDED.description,
  status = EXCLUDED.status, build_status = EXCLUDED.build_status,
  unified_status = EXCLUDED.unified_status, updated_at = NOW();

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

-- Log completion
DO $$
DECLARE
  pages_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pages_count FROM pages WHERE deleted_at IS NULL;
  RAISE NOTICE 'Pages sync completed successfully!';
  RAISE NOTICE 'Total pages in database: %', pages_count;
  RAISE NOTICE 'Timestamp: %', NOW();
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these to verify the sync was successful
-- ============================================================================

-- Check total pages
SELECT COUNT(*) as total_pages FROM pages WHERE deleted_at IS NULL;

-- Check pages by organization
SELECT 
  organization_id, 
  COUNT(*) as page_count,
  COUNT(*) FILTER (WHERE unified_status = 'live') as live_pages,
  COUNT(*) FILTER (WHERE unified_status = 'draft') as draft_pages
FROM pages 
WHERE deleted_at IS NULL 
GROUP BY organization_id
ORDER BY organization_id;

-- Check pages by category
SELECT 
  category,
  COUNT(*) as page_count,
  COUNT(*) FILTER (WHERE is_core_page = true) as core_pages
FROM pages 
WHERE deleted_at IS NULL 
GROUP BY category
ORDER BY page_count DESC;

-- List all synced pages with key details
SELECT 
  organization_id as org,
  slug,
  path,
  title,
  unified_status as status,
  is_core_page as core,
  category
FROM pages
WHERE deleted_at IS NULL
ORDER BY organization_id, category, slug;

-- Check for any duplicate slugs (should be empty)
SELECT organization_id, slug, COUNT(*) as count
FROM pages
WHERE deleted_at IS NULL
GROUP BY organization_id, slug
HAVING COUNT(*) > 1;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- If something went wrong, you can restore from backup:
-- 
-- BEGIN;
-- DELETE FROM pages;
-- INSERT INTO pages SELECT * FROM pages_backup_20251015;
-- COMMIT;
-- 
-- ============================================================================
