-- ============================================================================
-- PRODUCTION SYNC - Country Connect (Org 4) - Pages & Menu Items
-- ============================================================================
-- This script REPLACES all org 4 data with fresh data from development
-- 
-- INSTRUCTIONS: Select ALL SQL below and click "Run" in Neon Console
-- ============================================================================

-- Begin transaction
BEGIN;

-- Step 1: Delete existing Country Connect data (reverse order due to foreign keys)
DELETE FROM menu_items WHERE organization_id = 4;
DELETE FROM pages WHERE organization_id = 4;

-- Step 2: Insert Pages for Org 4 (from dev export)
INSERT INTO pages (id, organization_id, slug, path, title, description, status, build_status, functions, is_core_page, owner_user_id, created_at, updated_at, deleted_at, category, template_id, layout_config, custom_css, meta_tags, page_content, theme_overrides, layout_template_id, visibility_rules, page_metadata, component_config, unified_status) VALUES
('029e03ef-35b0-497f-a414-22d32a40f1ea', 4, 'mapping-tool', '/field-engineering/customer-mapping', 'Mapping Tool', 'Visualize ISP customers on interactive map with geolocation and bulk operations', 'live', 'released', '[]'::jsonb, false, NULL, '2025-10-10T13:10:57.763Z'::timestamptz, '2025-10-10T13:10:57.763Z'::timestamptz, NULL, 'core', NULL, '{}'::jsonb, NULL, '{}'::jsonb, '{}'::jsonb, NULL, NULL, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'live'),
('32c8d840-44b4-4e22-933d-6508be4fe133', 4, 'wholesale', '/wholesale', 'Wholesale', 'Wholesale page for Country Connect', 'live', 'released', '[]'::jsonb, false, NULL, '2025-10-04T16:16:17.906Z'::timestamptz, '2025-10-04T16:16:17.906Z'::timestamptz, NULL, 'core', NULL, '{}'::jsonb, NULL, '{}'::jsonb, NULL, NULL, NULL, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'live'),
('5d2845d3-2ac5-49d9-a497-af5049f205ec', 4, 'fiber-network', '/field-engineering/fiber-network', 'Fiber Network', 'Chamber mapping and field engineering tool', 'live', 'not_started', '[]'::jsonb, true, NULL, '2025-10-14T21:05:05.190Z'::timestamptz, '2025-10-14T21:05:05.190Z'::timestamptz, NULL, 'core', NULL, '{}'::jsonb, NULL, '{}'::jsonb, NULL, NULL, NULL, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'live'),
('962f9f2a-d4ce-4c8c-9ed3-cf4d8355d931', 4, 'fiber-splicing', '/network/fiber-splicing', 'Fiber Splicing', NULL, 'live', 'not_started', '[]'::jsonb, true, NULL, '2025-10-15T11:35:00.535Z'::timestamptz, '2025-10-15T11:35:00.535Z'::timestamptz, NULL, 'network', NULL, '{}'::jsonb, NULL, '{}'::jsonb, NULL, NULL, NULL, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'live');

-- Step 3: Ensure required menu sections exist for Org 4
INSERT INTO menu_sections (id, organization_id, name, icon, order_index, is_visible) VALUES
(12, 4, 'Strategy & OKRs', 'Target', 1, true),
(13, 4, 'Tools & Agents', 'Package', 2, true),
(21, 4, 'Network', 'Folder', 3, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  order_index = EXCLUDED.order_index,
  is_visible = EXCLUDED.is_visible;

-- Step 4: Insert Menu Items for Org 4 (from dev export)
INSERT INTO menu_items (id, organization_id, section_id, page_id, parent_id, title, path, icon, description, order_index, is_visible, is_external, open_in_new_tab, badge, badge_color, status, role_permissions, custom_permissions, created_at, updated_at) VALUES
(93, 4, 13, NULL, NULL, 'Workflow Templates', '/templates/workflows', 'GitBranch', 'Create and manage workflow templates', 2, true, false, false, NULL, NULL, 'active', '[]'::jsonb, '{}'::jsonb, '2025-10-06T20:57:34.225Z'::timestamptz, '2025-10-07T11:38:02.628Z'::timestamptz),
(94, 4, 21, '029e03ef-35b0-497f-a414-22d32a40f1ea', NULL, 'Customer Mapping', '/field-engineering/customer-mapping', 'Map', 'Visualize customers on interactive map', 1, true, false, false, NULL, NULL, 'active', '["admin","manager","team_member"]'::jsonb, '{}'::jsonb, '2025-10-10T13:11:44.435Z'::timestamptz, '2025-10-15T11:57:12.159Z'::timestamptz),
(96, 4, 21, NULL, NULL, 'RFS data', '/data/airtable/1', 'Table', 'Country Connect - address', 0, true, false, false, NULL, NULL, 'active', '[]'::jsonb, '{}'::jsonb, '2025-10-13T14:53:35.673Z'::timestamptz, '2025-10-15T11:32:42.545Z'::timestamptz),
(98, 4, 21, '5d2845d3-2ac5-49d9-a497-af5049f205ec', NULL, 'Fiber Network', '/field-engineering/fiber-network', 'Network', 'View and manage fiber network chambers', 2, true, false, false, NULL, NULL, 'active', '[]'::jsonb, '{}'::jsonb, '2025-10-14T21:05:37.605Z'::timestamptz, '2025-10-15T11:57:42.722Z'::timestamptz),
(99, 4, 21, '962f9f2a-d4ce-4c8c-9ed3-cf4d8355d931', NULL, 'Fiber Splicing', '/network/fiber-splicing', 'Cable', NULL, 3, true, false, false, NULL, NULL, 'active', '[]'::jsonb, '{}'::jsonb, '2025-10-15T11:35:13.088Z'::timestamptz, '2025-10-15T11:57:38.164Z'::timestamptz),
(100, 4, 12, NULL, NULL, 'Mission & Vision', '/strategy/mission-vision', 'Target', NULL, 0, true, false, false, NULL, NULL, 'active', '[]'::jsonb, '{}'::jsonb, '2025-10-15T19:49:33.677Z'::timestamptz, '2025-10-15T19:49:33.677Z'::timestamptz),
(101, 4, 12, NULL, NULL, 'Objectives', '/strategy/objectives', 'FileText', NULL, 1, true, false, false, NULL, NULL, 'active', '[]'::jsonb, '{}'::jsonb, '2025-10-15T19:49:33.677Z'::timestamptz, '2025-10-15T19:49:33.677Z'::timestamptz),
(102, 4, 12, NULL, NULL, 'Work Items', '/strategy/work-items', 'Briefcase', NULL, 2, true, false, false, NULL, NULL, 'active', '[]'::jsonb, '{}'::jsonb, '2025-10-15T19:49:33.677Z'::timestamptz, '2025-10-15T19:49:33.677Z'::timestamptz),
(103, 4, 12, NULL, NULL, 'Check-in Dashboard', '/strategy/checkin', 'CheckSquare', NULL, 3, true, false, false, NULL, NULL, 'active', '[]'::jsonb, '{}'::jsonb, '2025-10-15T19:49:33.677Z'::timestamptz, '2025-10-15T19:49:33.677Z'::timestamptz),
(104, 4, 12, NULL, NULL, 'Knowledge Base', '/strategy/knowledge-base', 'BookOpen', NULL, 4, true, false, false, NULL, NULL, 'active', '[]'::jsonb, '{}'::jsonb, '2025-10-15T19:49:33.677Z'::timestamptz, '2025-10-15T19:49:33.677Z'::timestamptz),
(105, 4, 13, NULL, NULL, 'Agent Builder', '/agents', 'Bot', NULL, 1, true, false, false, NULL, NULL, 'active', '[]'::jsonb, '{}'::jsonb, '2025-10-15T19:49:33.677Z'::timestamptz, '2025-10-15T19:49:33.677Z'::timestamptz),
(106, 4, 13, NULL, NULL, 'Integrations Hub', '/integrations', 'Package', NULL, 3, true, false, false, NULL, NULL, 'active', '[]'::jsonb, '{}'::jsonb, '2025-10-15T19:49:33.677Z'::timestamptz, '2025-10-15T19:49:33.677Z'::timestamptz);

-- Commit transaction
COMMIT;

-- Step 5: Verify the sync
SELECT 'PAGES - Org 4' as table_name, COUNT(*) as row_count FROM pages WHERE organization_id = 4
UNION ALL
SELECT 'MENU_ITEMS - Org 4', COUNT(*) FROM menu_items WHERE organization_id = 4;

-- Show Network section menu items
SELECT 
  mi.id,
  mi.title,
  mi.path,
  mi.icon,
  mi.order_index
FROM menu_items mi
JOIN menu_sections ms ON mi.section_id = ms.id
WHERE ms.organization_id = 4 AND ms.name = 'Network'
ORDER BY mi.order_index;
