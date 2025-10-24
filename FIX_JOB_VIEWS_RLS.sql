-- Fix RLS policies for job_views table to allow proper tracking

-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "Employers can view analytics for their jobs" ON job_views;
DROP POLICY IF EXISTS "Anyone can track job views" ON job_views;

-- Allow anyone to insert job views (both authenticated and anonymous users)
CREATE POLICY "Allow job view tracking" ON job_views
  FOR INSERT WITH CHECK (true);

-- Allow employers to view analytics for their own jobs
CREATE POLICY "Employers can view analytics for their jobs" ON job_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_views.job_id 
      AND jobs.employer_id = auth.uid()
    )
  );

-- Allow job seekers to view their own view history (optional)
CREATE POLICY "Job seekers can view their own job views" ON job_views
  FOR SELECT USING (auth.uid() = user_id);
