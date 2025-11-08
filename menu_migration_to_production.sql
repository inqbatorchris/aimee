-- =====================================================
-- Menu and Pages Migration Script for Production
-- Organization ID: 4
-- =====================================================
-- Instructions:
-- 1. Connect to your production database
-- 2. Run this script to create pages, menu sections and items
-- 3. Verify the menu appears correctly in production
-- =====================================================

-- Step 1: Insert/Update Pages
-- Insert the Mapping Tool page if it doesn't exist
INSERT INTO pages (id, organization_id, slug, path, title, description, unified_status, status, is_core_page, created_at, updated_at)
VALUES 
  ('029e03ef-35b0-497f-a414-22d32a40f1ea', 4, 'mapping-tool', '/field-engineering/customer-mapping', 'Mapping Tool', NULL, 'live', 'live', false, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  path = EXCLUDED.path,
  title = EXCLUDED.title,
  unified_status = EXCLUDED.unified_status,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Step 2: Insert/Update Menu Sections for Organization 4
INSERT INTO menu_sections (id, organization_id, name, description, icon, order_index, is_visible, is_collapsible, is_default_expanded, role_permissions, created_at, updated_at)
VALUES 
  (11, 4, 'Core', '', 'Home', 0, true, true, true, '[]', NOW(), NOW()),
  (12, 4, 'Strategy & OKRs', '', 'Target', 1, true, true, true, '[]', NOW(), NOW()),
  (13, 4, 'Tools & Agents', '', 'Package', 2, true, true, true, '[]', NOW(), NOW()),
  (14, 4, 'Administration', '', 'Shield', 3, false, true, false, '[]', NOW(), NOW()),
  (19, 4, 'Data', 'Data sources and integrations', 'Database', 100, true, true, true, '[]', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  order_index = EXCLUDED.order_index,
  is_visible = EXCLUDED.is_visible,
  is_collapsible = EXCLUDED.is_collapsible,
  is_default_expanded = EXCLUDED.is_default_expanded,
  role_permissions = EXCLUDED.role_permissions,
  updated_at = NOW();

-- Step 3: Insert/Update Menu Items for Organization 4
INSERT INTO menu_items (id, organization_id, section_id, page_id, parent_id, title, path, icon, description, order_index, is_visible, is_external, open_in_new_tab, badge, badge_color, status, role_permissions, custom_permissions, created_at, updated_at)
VALUES
  -- Tools & Agents section
  (93, 4, 13, NULL, NULL, 'Workflow Templates', '/templates/workflows', 'GitBranch', 'Create and manage workflow templates', 0, true, false, false, NULL, NULL, 'active', '[]', '{}', NOW(), NOW()),
  (94, 4, 13, '029e03ef-35b0-497f-a414-22d32a40f1ea', NULL, 'Mapping Tool', '/field-engineering/customer-mapping', 'Map', 'Visualize customers on interactive map', 1, true, false, false, NULL, NULL, 'active', '["admin", "manager", "team_member"]', '{}', NOW(), NOW()),
  
  -- Data section
  (96, 4, 19, NULL, NULL, 'address', '/data/airtable/1', 'Table', 'Country Connect - address', 0, true, false, false, NULL, NULL, 'active', '[]', '{}', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  page_id = EXCLUDED.page_id,
  parent_id = EXCLUDED.parent_id,
  title = EXCLUDED.title,
  path = EXCLUDED.path,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  order_index = EXCLUDED.order_index,
  is_visible = EXCLUDED.is_visible,
  is_external = EXCLUDED.is_external,
  open_in_new_tab = EXCLUDED.open_in_new_tab,
  badge = EXCLUDED.badge,
  badge_color = EXCLUDED.badge_color,
  status = EXCLUDED.status,
  role_permissions = EXCLUDED.role_permissions,
  custom_permissions = EXCLUDED.custom_permissions,
  updated_at = NOW();

-- Step 4: Verification Queries
SELECT '=== Pages for Org 4 ===' as info;
SELECT id, title, slug, path, unified_status 
FROM pages 
WHERE organization_id = 4 
ORDER BY title;

SELECT '=== Menu Sections for Org 4 ===' as info;
SELECT id, name, icon, order_index, is_visible 
FROM menu_sections 
WHERE organization_id = 4 
ORDER BY order_index;

SELECT '=== Menu Items for Org 4 ===' as info;
SELECT id, section_id, title, path, icon, order_index, is_visible, status
FROM menu_items 
WHERE organization_id = 4 
ORDER BY section_id, order_index;

-- Done! Your menu structure should now be visible in production
