-- Run once in Supabase SQL Editor: recruiting contact extracted from listing text
ALTER TABLE aggregated_jobs
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(200);

COMMENT ON COLUMN aggregated_jobs.contact_email IS 'Employer/recruiter email parsed from listing; used for application alerts';
