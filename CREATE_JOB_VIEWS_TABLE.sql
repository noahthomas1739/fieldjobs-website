-- Create job_views table for tracking job page views
CREATE TABLE IF NOT EXISTS job_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_views_job_id ON job_views(job_id);
CREATE INDEX IF NOT EXISTS idx_job_views_user_id ON job_views(user_id);
CREATE INDEX IF NOT EXISTS idx_job_views_viewed_at ON job_views(viewed_at);

-- Enable RLS
ALTER TABLE job_views ENABLE ROW LEVEL SECURITY;

-- Allow employers to view analytics for their own jobs
CREATE POLICY "Employers can view analytics for their jobs" ON job_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_views.job_id 
      AND jobs.employer_id = auth.uid()
    )
  );

-- Allow anyone to insert view records (for tracking)
CREATE POLICY "Anyone can track job views" ON job_views
  FOR INSERT WITH CHECK (true);

-- Add comment
COMMENT ON TABLE job_views IS 'Tracks page views for job postings to provide analytics';
