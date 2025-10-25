-- STANDARDIZE_USER_IDS.sql
-- This script standardizes all user references to use 'user_id' consistently

-- Step 1: Add user_id column to jobs table if it doesn't exist
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Copy employer_id data to user_id (if user_id is empty)
UPDATE jobs 
SET user_id = employer_id 
WHERE user_id IS NULL AND employer_id IS NOT NULL;

-- Step 3: Make user_id NOT NULL (after data migration)
ALTER TABLE jobs ALTER COLUMN user_id SET NOT NULL;

-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);

-- Step 5: Update RLS policies to use user_id
DROP POLICY IF EXISTS "Users can view their own jobs" ON jobs;
CREATE POLICY "Users can view their own jobs" ON jobs
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view active jobs" ON jobs;
CREATE POLICY "Anyone can view active jobs" ON jobs
  FOR SELECT USING (active = true);

-- Step 6: Update job_views RLS policy
DROP POLICY IF EXISTS "Employers can view analytics for their jobs" ON job_views;
CREATE POLICY "Employers can view analytics for their jobs" ON job_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_views.job_id 
      AND jobs.user_id = auth.uid()
    )
  );

-- Step 7: Update applications RLS policy (if needed)
DROP POLICY IF EXISTS "Employers can view applications for their jobs" ON applications;
CREATE POLICY "Employers can view applications for their jobs" ON applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = applications.job_id 
      AND jobs.user_id = auth.uid()
    )
  );

-- Step 8: Update job_feature_purchases table (if it exists)
-- This table might also need user_id standardization
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_feature_purchases') THEN
    -- Add user_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_feature_purchases' AND column_name = 'user_id') THEN
      ALTER TABLE job_feature_purchases ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
      
      -- Copy employer_id to user_id if needed
      UPDATE job_feature_purchases 
      SET user_id = employer_id 
      WHERE user_id IS NULL AND employer_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- Step 9: Update resume_unlocks table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resume_unlocks') THEN
    -- Add user_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resume_unlocks' AND column_name = 'user_id') THEN
      ALTER TABLE resume_unlocks ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
      
      -- Copy employer_id to user_id if needed
      UPDATE resume_unlocks 
      SET user_id = employer_id 
      WHERE user_id IS NULL AND employer_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- Step 10: Create a view for backward compatibility (optional)
-- This allows old code to still work while we update APIs
CREATE OR REPLACE VIEW jobs_with_employer_id AS
SELECT *, user_id as employer_id FROM jobs;

-- Step 11: Add comments for documentation
COMMENT ON COLUMN jobs.user_id IS 'The user who created this job (replaces employer_id)';
COMMENT ON COLUMN jobs.employer_id IS 'DEPRECATED: Use user_id instead. Kept for backward compatibility.';

-- Step 12: Verify the migration
SELECT 
  'jobs' as table_name,
  COUNT(*) as total_rows,
  COUNT(user_id) as user_id_count,
  COUNT(employer_id) as employer_id_count
FROM jobs
UNION ALL
SELECT 
  'applications' as table_name,
  COUNT(*) as total_rows,
  COUNT(applicant_id) as applicant_id_count,
  0 as employer_id_count
FROM applications;
