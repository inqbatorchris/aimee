-- Check what columns exist in workflow_templates table in production
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workflow_templates' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
