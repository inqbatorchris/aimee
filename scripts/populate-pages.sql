-- Page-Driven Architecture: Initial Page Population Script
-- This script populates the pages table with all current application pages

-- First, clear existing pages to ensure clean state
DELETE FROM pages WHERE true;

-- Core App Pages
INSERT INTO pages (slug, path, title, description, status, build_status, functions, is_core_page, category) VALUES
-- Authentication & Profile
('login', '/login', 'Login', 'User authentication and session management', 'active', 'released', '["auth", "session"]', true, 'auth'),
('forgot-password', '/forgot-password', 'Forgot Password', 'Password recovery workflow', 'active', 'released', '["auth", "email"]', true, 'auth'),
('reset-password', '/reset-password', 'Reset Password', 'Password reset confirmation', 'active', 'released', '["auth", "validation"]', true, 'auth'),
('user-profile', '/profile', 'User Profile', 'Personal profile and account settings', 'active', 'released', '["profile", "settings"]', true, 'profile'),

-- Dashboard & Core Operations
('my-day', '/', 'My Day', 'Personal dashboard with daily overview and quick actions', 'active', 'released', '["dashboard", "analytics", "tasks"]', true, 'dashboard'),
('work', '/objectives/work', 'Work', 'Task management and work item tracking', 'active', 'released', '["tasks", "tracking", "collaboration"]', true, 'productivity'),
('tasks', '/tasks', 'Tasks', 'Detailed task operations and management', 'active', 'released', '["tasks", "crud", "assignment"]', true, 'productivity'),

-- Strategy & OKRs
('key-results', '/key-results', 'Key Results', 'Key result management and tracking', 'active', 'released', '["okr", "metrics", "progress"]', true, 'strategy'),
('checkin-dashboard', '/strategy/checkin', 'Check-in Dashboard', 'Progress tracking and team check-ins', 'active', 'released', '["checkin", "progress", "team"]', true, 'strategy'),
('mission-vision', '/mission-vision', 'Mission & Vision', 'Company mission, vision, and values management', 'active', 'released', '["company", "vision", "alignment"]', true, 'strategy'),

-- Knowledge & Documentation
('knowledge-base', '/knowledge', 'Knowledge Base', 'Documentation and knowledge management system', 'active', 'released', '["docs", "search", "collaboration"]', true, 'knowledge'),

-- Administration & Configuration
('organization-settings', '/organization-settings', 'Organization Settings', 'Organization-wide configuration and preferences', 'active', 'released', '["admin", "config", "organization"]', true, 'admin'),
('core-settings', '/settings', 'Settings', 'Core application settings and preferences', 'active', 'released', '["settings", "preferences", "config"]', true, 'admin'),
('theme-editor', '/settings/theme-editor', 'Theme Editor', 'Visual theme customization and brand management', 'active', 'released', '["theming", "design", "branding"]', true, 'admin'),

-- Developer Tools
('dev-tools', '/dev-tools', 'Developer Tools', 'Database explorer, page manager, and development utilities', 'active', 'released', '["development", "database", "tools"]', true, 'development'),
('page-manager', '/dev-tools/pages', 'Page Manager', 'Page administration and lifecycle management', 'active', 'released', '["pages", "admin", "lifecycle"]', true, 'development');

-- Add-on Pages
INSERT INTO pages (slug, path, title, description, status, build_status, functions, is_core_page, category) VALUES
-- AI & Automation
('ai-site-builder', '/tools/ai-site-builder', 'AI Site Builder', 'AI-powered website generation and management', 'in_review', 'testing', '["ai", "website", "generation"]', false, 'ai-tools'),
('automation-tools', '/tools/automation', 'Automation Tools', 'Process automation and workflow management', 'in_review', 'testing', '["automation", "workflow", "integration"]', false, 'ai-tools'),
('voice-agent-management', '/tools/voice-agents', 'Voice Agent Management', 'AI voice assistant configuration and management', 'draft', 'building', '["ai", "voice", "assistant"]', false, 'ai-tools'),

-- Customer & Sales Management
('crm', '/tools/crm', 'CRM', 'Customer relationship management system', 'in_review', 'testing', '["crm", "customers", "sales"]', false, 'business-tools'),
('customer-management', '/customers', 'Customer Management', 'Customer data and relationship management', 'active', 'released', '["customers", "data", "management"]', false, 'business-tools'),

-- Administration Dashboards
('admin-dashboard', '/admin', 'Admin Dashboard', 'Administrative overview and system management', 'active', 'released', '["admin", "dashboard", "system"]', false, 'admin-tools'),
('super-admin-dashboard', '/super-admin', 'Super Admin Dashboard', 'System-wide administration and configuration', 'active', 'released', '["super-admin", "system", "config"]', false, 'admin-tools'),
('user-management', '/admin/users', 'User Management', 'User account administration and permissions', 'active', 'released', '["users", "permissions", "admin"]', false, 'admin-tools'),

-- Service Management
('managed-services', '/services', 'Managed Services', 'Service delivery and client management', 'active', 'released', '["services", "clients", "delivery"]', false, 'service-tools'),
('support-tickets', '/support/tickets', 'Support Tickets', 'Help desk and customer support management', 'active', 'released', '["support", "tickets", "helpdesk"]', false, 'service-tools'),
('integrations', '/integrations', 'Integrations', 'Third-party service connections and API management', 'in_review', 'testing', '["integrations", "api", "connections"]', false, 'service-tools'),

-- Training & Development
('training', '/training', 'Training', 'Training modules and educational content', 'deprecated', 'released', '["training", "education", "content"]', false, 'hr-tools'),
('shift-management', '/hr/shifts', 'Shift Management', 'Employee scheduling and shift planning', 'archived', 'released', '["hr", "scheduling", "shifts"]', false, 'hr-tools'),
('time-off-management', '/hr/time-off', 'Time Off Management', 'Employee leave and vacation management', 'archived', 'released', '["hr", "timeoff", "leave"]', false, 'hr-tools'),

-- Strategy & Analytics
('strategy-dashboard', '/strategy', 'Strategy Dashboard', 'Strategic planning overview and analytics', 'active', 'released', '["strategy", "analytics", "planning"]', false, 'strategy-tools'),

-- Utility Pages
('unified-table-view', '/tools/table-view', 'Unified Table View', 'Advanced data table and reporting interface', 'active', 'released', '["data", "tables", "reporting"]', false, 'utility-tools');

-- Update organization_id for all pages to match the default organization (id: 1)
UPDATE pages SET organization_id = 1 WHERE organization_id IS NULL;

-- Add some sample visibility rules for demonstration
INSERT INTO page_visibility_rules (page_id, rule_type, rule_value, is_include, priority) 
SELECT 
    id,
    'role'::visibility_rule_type_enum,
    '["super_admin"]'::jsonb,
    true,
    100
FROM pages 
WHERE slug IN ('super-admin-dashboard', 'dev-tools', 'page-manager');

INSERT INTO page_visibility_rules (page_id, rule_type, rule_value, is_include, priority) 
SELECT 
    id,
    'role'::visibility_rule_type_enum,
    '["admin", "super_admin"]'::jsonb,
    true,
    90
FROM pages 
WHERE slug IN ('admin-dashboard', 'user-management', 'organization-settings');

-- Add documentation for key pages
INSERT INTO page_docs (page_id, doc_markdown, owner_user_id) 
SELECT 
    id,
    '# ' || title || E'\n\n' || description || E'\n\nThis page provides ' || LOWER(title) || ' functionality for the aimee.works platform.',
    1
FROM pages 
WHERE slug IN ('page-manager', 'theme-editor', 'dev-tools', 'objective-builder');

COMMIT;