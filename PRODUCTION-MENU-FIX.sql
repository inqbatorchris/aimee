-- ============================================================================
-- PRODUCTION DATABASE MENU FIX - Country Connect (Org 4)
-- ============================================================================
-- This script REPLACES the Network menu items with the correct ones
-- 
-- INSTRUCTIONS FOR NEON CONSOLE:
-- 1. Select ALL the SQL below (from line 9 onwards)
-- 2. Click "Run" - Neon will automatically wrap it in a transaction
-- ============================================================================

-- Step 1: Delete ALL existing Network menu items for org 4
DELETE FROM menu_items 
WHERE organization_id = 4 
  AND section_id IN (
    SELECT id FROM menu_sections 
    WHERE organization_id = 4 AND name = 'Network'
  );

-- Step 2: Ensure Network section exists
INSERT INTO menu_sections (organization_id, name, icon, order_index, is_visible)
VALUES (4, 'Network', 'Folder', 3, true)
ON CONFLICT (organization_id, name) DO NOTHING;

-- Step 3: Insert the correct menu items
-- RFS data (order 0)
INSERT INTO menu_items (organization_id, section_id, title, path, icon, order_index, is_visible)
SELECT 4, ms.id, 'RFS data', '/data/airtable/1', 'Table', 0, true
FROM menu_sections ms WHERE ms.organization_id = 4 AND ms.name = 'Network';

-- Customer Mapping (order 1)
INSERT INTO menu_items (organization_id, section_id, title, path, icon, order_index, is_visible)
SELECT 4, ms.id, 'Customer Mapping', '/field-engineering/customer-mapping', 'Map', 1, true
FROM menu_sections ms WHERE ms.organization_id = 4 AND ms.name = 'Network';

-- Fiber Network (order 2)
INSERT INTO menu_items (organization_id, section_id, title, path, icon, order_index, is_visible)
SELECT 4, ms.id, 'Fiber Network', '/field-engineering/fiber-network', 'Network', 2, true
FROM menu_sections ms WHERE ms.organization_id = 4 AND ms.name = 'Network';

-- Fiber Splicing (order 3)
INSERT INTO menu_items (organization_id, section_id, title, path, icon, order_index, is_visible)
SELECT 4, ms.id, 'Fiber Splicing', '/network/fiber-splicing', 'Cable', 3, true
FROM menu_sections ms WHERE ms.organization_id = 4 AND ms.name = 'Network';

-- Step 4: Verify the results
SELECT 
  mi.id,
  mi.title,
  mi.path,
  mi.icon,
  mi.order_index,
  mi.is_visible
FROM menu_items mi
JOIN menu_sections ms ON mi.section_id = ms.id
WHERE ms.organization_id = 4 
  AND ms.name = 'Network'
ORDER BY mi.order_index;
