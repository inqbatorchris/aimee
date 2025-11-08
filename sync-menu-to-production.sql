-- ============================================================================
-- MENU SYNCHRONIZATION SCRIPT: Development → Production
-- Organization: Country Connect (ID: 4)
-- Generated: 2025-10-15
-- ============================================================================
-- 
-- PURPOSE: Sync menu structure from development to match the screenshot
-- 
-- CURRENT STATE (Production Org 4):
-- - Strategy & OKRs: No menu items
-- - Tools & Agents: Only "Workflow Templates"
-- - Network: RFS data, Customer Mapping, Fiber Network, Fiber Splicing ✓
--
-- TARGET STATE (Development Menu):
-- - Strategy & OKRs: Mission & Vision, Objectives, Work Items, Check-in, Knowledge Base
-- - Tools & Agents: Agent Builder, Workflow Templates, Integrations Hub
-- - Network: RFS data, Customer Mapping, Fiber Network, Fiber Splicing
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: ADD MISSING STRATEGY & OKRs MENU ITEMS
-- ============================================================================

-- Mission & Vision
INSERT INTO menu_items (
  organization_id, 
  section_id, 
  title, 
  path, 
  icon, 
  order_index, 
  is_visible
)
VALUES (
  4,                                    -- Country Connect org ID
  12,                                   -- Strategy & OKRs section ID for org 4
  'Mission & Vision',
  '/strategy/mission-vision',
  'Target',
  0,
  true
)
ON CONFLICT DO NOTHING;

-- Objectives
INSERT INTO menu_items (
  organization_id, 
  section_id, 
  title, 
  path, 
  icon, 
  order_index, 
  is_visible
)
VALUES (
  4,
  12,
  'Objectives',
  '/strategy/objectives',
  'FileText',
  1,
  true
)
ON CONFLICT DO NOTHING;

-- Work Items
INSERT INTO menu_items (
  organization_id, 
  section_id, 
  title, 
  path, 
  icon, 
  order_index, 
  is_visible
)
VALUES (
  4,
  12,
  'Work Items',
  '/strategy/work-items',
  'Briefcase',
  2,
  true
)
ON CONFLICT DO NOTHING;

-- Check-in Dashboard
INSERT INTO menu_items (
  organization_id, 
  section_id, 
  title, 
  path, 
  icon, 
  order_index, 
  is_visible
)
VALUES (
  4,
  12,
  'Check-in Dashboard',
  '/strategy/checkin',
  'CheckSquare',
  3,
  true
)
ON CONFLICT DO NOTHING;

-- Knowledge Base
INSERT INTO menu_items (
  organization_id, 
  section_id, 
  title, 
  path, 
  icon, 
  order_index, 
  is_visible
)
VALUES (
  4,
  12,
  'Knowledge Base',
  '/strategy/knowledge-base',
  'BookOpen',
  4,
  true
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 2: ADD MISSING TOOLS & AGENTS MENU ITEMS
-- ============================================================================

-- Agent Builder
INSERT INTO menu_items (
  organization_id, 
  section_id, 
  title, 
  path, 
  icon, 
  order_index, 
  is_visible
)
VALUES (
  4,
  13,                                   -- Tools & Agents section ID for org 4
  'Agent Builder',
  '/agents',
  'Bot',
  1,
  true
)
ON CONFLICT DO NOTHING;

-- Update Workflow Templates order to be after Agent Builder
UPDATE menu_items 
SET order_index = 2
WHERE organization_id = 4 
  AND section_id = 13 
  AND title = 'Workflow Templates';

-- Integrations Hub
INSERT INTO menu_items (
  organization_id, 
  section_id, 
  title, 
  path, 
  icon, 
  order_index, 
  is_visible
)
VALUES (
  4,
  13,
  'Integrations Hub',
  '/integrations',
  'Package',
  3,
  true
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 3: ENSURE NETWORK SECTION IS CORRECT (Already looks good)
-- ============================================================================

-- Update order indexes for Network items to match development
UPDATE menu_items SET order_index = 0 
WHERE organization_id = 4 AND section_id = 21 AND title = 'RFS data';

UPDATE menu_items SET order_index = 1 
WHERE organization_id = 4 AND section_id = 21 AND title = 'Customer Mapping';

UPDATE menu_items SET order_index = 2 
WHERE organization_id = 4 AND section_id = 21 AND title = 'Fiber Network';

UPDATE menu_items SET order_index = 3 
WHERE organization_id = 4 AND section_id = 21 AND title = 'Fiber Splicing';

-- ============================================================================
-- STEP 4: ENSURE SECTION VISIBILITY AND ORDER
-- ============================================================================

-- Make sure Core section is hidden (as shown in screenshot)
UPDATE menu_sections 
SET is_visible = false 
WHERE organization_id = 4 AND name = 'Core';

-- Ensure correct section order
UPDATE menu_sections SET order_index = 0 WHERE organization_id = 4 AND name = 'Core';
UPDATE menu_sections SET order_index = 1 WHERE organization_id = 4 AND name = 'Strategy & OKRs';
UPDATE menu_sections SET order_index = 2 WHERE organization_id = 4 AND name = 'Tools & Agents';
UPDATE menu_sections SET order_index = 3 WHERE organization_id = 4 AND name = 'Network';

-- Hide unused sections
UPDATE menu_sections 
SET is_visible = false 
WHERE organization_id = 4 
  AND name IN ('Airtable data', 'Data');

-- ============================================================================
-- COMMIT AND LOG
-- ============================================================================

DO $$
DECLARE
  strategy_count INTEGER;
  tools_count INTEGER;
  network_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO strategy_count FROM menu_items WHERE organization_id = 4 AND section_id = 12;
  SELECT COUNT(*) INTO tools_count FROM menu_items WHERE organization_id = 4 AND section_id = 13;
  SELECT COUNT(*) INTO network_count FROM menu_items WHERE organization_id = 4 AND section_id = 21;
  
  RAISE NOTICE 'Menu sync completed for Country Connect (Org 4)!';
  RAISE NOTICE 'Strategy & OKRs items: %', strategy_count;
  RAISE NOTICE 'Tools & Agents items: %', tools_count;
  RAISE NOTICE 'Network items: %', network_count;
  RAISE NOTICE 'Timestamp: %', NOW();
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these to verify the sync was successful
-- ============================================================================

-- Show all menu sections for Country Connect
SELECT 
  id,
  name,
  icon,
  order_index,
  is_visible,
  is_collapsible
FROM menu_sections 
WHERE organization_id = 4
ORDER BY order_index;

-- Show all menu items by section for Country Connect
SELECT 
  ms.name as section,
  ms.order_index as section_order,
  mi.title as menu_item,
  mi.path,
  mi.icon,
  mi.order_index as item_order,
  mi.is_visible
FROM menu_items mi
JOIN menu_sections ms ON mi.section_id = ms.id
WHERE mi.organization_id = 4
ORDER BY ms.order_index, mi.order_index;

-- Count items per section
SELECT 
  ms.name as section,
  COUNT(mi.id) as item_count,
  COUNT(mi.id) FILTER (WHERE mi.is_visible = true) as visible_items
FROM menu_sections ms
LEFT JOIN menu_items mi ON ms.id = mi.section_id AND mi.organization_id = 4
WHERE ms.organization_id = 4
GROUP BY ms.id, ms.name
ORDER BY ms.order_index;
