-- =====================================================
-- COMPLETE Menu, Pages, and Workflow Templates Migration
-- Organization ID: 4
-- =====================================================
-- This script migrates:
-- 1. Pages (Mapping Tool)
-- 2. Menu Sections (5 sections)
-- 3. Menu Items (3 static items)
-- 4. Workflow Templates (2 templates that appear in menu)
-- =====================================================

-- =====================================================
-- STEP 1: Insert/Update Pages
-- =====================================================

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

-- =====================================================
-- STEP 2: Insert/Update Menu Sections
-- =====================================================

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

-- =====================================================
-- STEP 3: Insert/Update Static Menu Items
-- =====================================================

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

-- =====================================================
-- STEP 4: Insert/Update Workflow Templates 
-- (These will appear dynamically in the menu)
-- =====================================================

INSERT INTO workflow_templates (
  id, 
  organization_id, 
  name, 
  description, 
  category, 
  estimated_time_minutes, 
  applicable_types, 
  steps, 
  is_active, 
  display_in_menu, 
  menu_label, 
  menu_icon, 
  menu_order, 
  created_by, 
  created_at, 
  updated_at
)
VALUES
  -- FTTP Fiber Installation Template
  (
    'fttp-installation-v1',
    4,
    'FTTP Fiber Installation',
    'Complete workflow for fiber optic installation including site survey, installation, and testing',
    'Field Engineering',
    120,
    '["Installation", "Field Work"]',
    '[
      {"title": "Pre-Installation Safety Check", "description": "Verify PPE, tools, and safety equipment"},
      {"title": "Site Survey", "description": "Assess installation location and requirements"},
      {"title": "Fiber Cable Run", "description": "Install and secure fiber optic cable"},
      {"title": "Equipment Installation", "description": "Mount and connect ONT equipment"},
      {"title": "Signal Testing", "description": "Test fiber signal strength and quality"},
      {"title": "Customer Handover", "description": "Demonstrate service and obtain sign-off"}
    ]'::jsonb,
    true,
    true,
    'FTTP Installations',
    'Cable',
    10,
    1,
    NOW(),
    NOW()
  ),
  
  -- Vehicle Safety Check Template
  (
    'vehicle-check-v1',
    4,
    'Vehicle Safety Check',
    'Daily vehicle safety inspection checklist',
    'Operations',
    15,
    '["Maintenance", "Safety"]',
    '[
      {"title": "Exterior Inspection", "description": "Check lights, tires, body condition"},
      {"title": "Interior Safety", "description": "Verify seatbelts, mirrors, controls"},
      {"title": "Fluid Levels", "description": "Check oil, coolant, brake fluid, washer fluid"},
      {"title": "Emergency Equipment", "description": "Confirm first aid kit, warning triangle, fire extinguisher"},
      {"title": "Documentation", "description": "Verify insurance, registration, maintenance records"}
    ]'::jsonb,
    true,
    true,
    'Vehicle Checks',
    'Truck',
    11,
    1,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  estimated_time_minutes = EXCLUDED.estimated_time_minutes,
  applicable_types = EXCLUDED.applicable_types,
  steps = EXCLUDED.steps,
  is_active = EXCLUDED.is_active,
  display_in_menu = EXCLUDED.display_in_menu,
  menu_label = EXCLUDED.menu_label,
  menu_icon = EXCLUDED.menu_icon,
  menu_order = EXCLUDED.menu_order,
  updated_at = NOW();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

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

SELECT '=== Static Menu Items for Org 4 ===' as info;
SELECT id, section_id, title, path, icon, order_index, is_visible, status
FROM menu_items 
WHERE organization_id = 4 
ORDER BY section_id, order_index;

SELECT '=== Workflow Templates (Display in Menu) for Org 4 ===' as info;
SELECT id, name, menu_label, menu_icon, menu_order, display_in_menu, is_active
FROM workflow_templates
WHERE organization_id = 4 
  AND display_in_menu = true
ORDER BY menu_order;

-- =====================================================
-- DONE! 
-- Your complete menu structure with workflow templates
-- should now be visible in production
-- =====================================================
