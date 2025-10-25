-- UPDATE_ALL_RLS_POLICIES.sql
-- Update all RLS policies to use user_id instead of employer_id

-- 1. Update applications table policies
DROP POLICY IF EXISTS "Employers can view applications for their jobs" ON applications;
CREATE POLICY "Employers can view applications for their jobs" ON applications
  FOR SELECT USING (
    auth.uid() IN (
      SELECT jobs.user_id
      FROM jobs
      WHERE jobs.id = applications.job_id
    )
  );

-- 2. Update jobs table policies (if they exist)
DROP POLICY IF EXISTS "Users can view their own jobs" ON jobs;
CREATE POLICY "Users can view their own jobs" ON jobs
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view active jobs" ON jobs;
CREATE POLICY "Anyone can view active jobs" ON jobs
  FOR SELECT USING (active = true);

-- 3. Update job_views table policies (if they exist)
DROP POLICY IF EXISTS "Employers can view analytics for their jobs" ON job_views;
CREATE POLICY "Employers can view analytics for their jobs" ON job_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_views.job_id 
      AND jobs.user_id = auth.uid()
    )
  );

-- 4. Update job_feature_purchases table policies (if they exist)
DROP POLICY IF EXISTS "Users can manage their own feature purchases" ON job_feature_purchases;
CREATE POLICY "Users can manage their own feature purchases" ON job_feature_purchases
  FOR ALL USING (auth.uid() = user_id);

-- 5. Update resume_unlocks table policies (if they exist)
DROP POLICY IF EXISTS "Employers can view their resume unlocks" ON resume_unlocks;
CREATE POLICY "Employers can view their resume unlocks" ON resume_unlocks
  FOR ALL USING (auth.uid() = user_id);

-- 6. Update upgrade_prompts table policies (if they exist)
DROP POLICY IF EXISTS "Users can view their own prompts" ON upgrade_prompts;
CREATE POLICY "Users can view their own prompts" ON upgrade_prompts
  FOR ALL USING (auth.uid() = user_id);

-- 7. Verify all policies are updated
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('applications', 'jobs', 'job_views', 'job_feature_purchases', 'resume_unlocks', 'upgrade_prompts')
ORDER BY tablename, policyname;
