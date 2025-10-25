-- VERIFY_MIGRATION.sql
-- Simple verification queries to check the migration worked

-- Check jobs table
SELECT 
  'jobs' as table_name,
  COUNT(*) as total_rows,
  COUNT(user_id) as user_id_count,
  COUNT(employer_id) as employer_id_count
FROM jobs;

-- Check applications table  
SELECT 
  'applications' as table_name,
  COUNT(*) as total_rows,
  COUNT(applicant_id) as applicant_id_count
FROM applications;

-- Check if user_id column exists and has data
SELECT 
  'user_id_column_check' as check_type,
  COUNT(*) as total_jobs,
  COUNT(user_id) as jobs_with_user_id,
  COUNT(employer_id) as jobs_with_employer_id
FROM jobs;

-- Sample data to verify migration
SELECT 
  'sample_jobs' as check_type,
  id,
  title,
  user_id,
  employer_id,
  created_at
FROM jobs 
LIMIT 5;
