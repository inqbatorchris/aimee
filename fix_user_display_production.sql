-- =====================================================
-- Fix User Display Issues in Production
-- Organization ID: 4
-- =====================================================

-- Step 1: Check current user data
SELECT 
    id,
    email,
    full_name,
    username,
    role,
    is_active,
    organization_id
FROM users
WHERE organization_id = 4
ORDER BY id;

-- Step 2: Update any users with NULL full_name using their username or email
UPDATE users
SET 
    full_name = COALESCE(
        NULLIF(full_name, ''),
        NULLIF(username, ''),
        split_part(email, '@', 1)
    ),
    updated_at = NOW()
WHERE organization_id = 4
  AND (full_name IS NULL OR full_name = '');

-- Step 3: Verify the fix
SELECT 
    id,
    email,
    full_name,
    username,
    role,
    is_active
FROM users
WHERE organization_id = 4
ORDER BY id;

-- =====================================================
-- Expected Result:
-- All users should now have a value in the full_name column
-- =====================================================
