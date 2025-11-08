-- =====================================================
-- Remove Vehicle Checks and FTTP Installations from Menu
-- Organization ID: 4 (Production)
-- =====================================================
-- This script hides two workflow templates from the menu
-- without deleting them (preserves historical data)
-- =====================================================

-- Update workflow templates to hide them from menu
UPDATE workflow_templates 
SET 
  display_in_menu = false,
  updated_at = NOW()
WHERE id IN ('fttp-installation-v1', 'vehicle-check-v1')
  AND organization_id = 4;

-- Verification query - should show display_in_menu=false for both
SELECT 
  id, 
  name, 
  menu_label, 
  display_in_menu, 
  is_active,
  updated_at
FROM workflow_templates
WHERE id IN ('fttp-installation-v1', 'vehicle-check-v1')
  AND organization_id = 4;

-- =====================================================
-- Expected Result:
-- Both templates should show display_in_menu = false
-- They will no longer appear in the navigation menu
-- =====================================================
