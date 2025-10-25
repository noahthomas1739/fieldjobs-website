-- CHECK_APPLICATIONS_TABLE.sql
-- Check if applications table exists and has the right structure

-- Check if table exists
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name = 'applications';

-- Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'applications'
ORDER BY ordinal_position;

-- Check if there are any constraints
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'applications';

-- Check RLS policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'applications';
