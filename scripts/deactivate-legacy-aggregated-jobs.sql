-- One-time cleanup: hide aggregated listings that no longer match the site focus.
-- Run in Supabase SQL Editor after updating job-aggregator keywords.

-- Desk / software-remote listings from the old RemoteOK feed
UPDATE aggregated_jobs
SET is_active = false
WHERE source = 'remoteok';

-- Industry keys retired or renamed in scripts/config.js (stale aggregated rows only)
UPDATE aggregated_jobs
SET is_active = false
WHERE industry IN (
  'mining',
  'ai-datacenter',
  'aerospace', -- replaced by aerospace-mro focused keywords in config
  'construction',
  'utilities' -- replaced by utilities-td in config
);

-- Existing aggregated rows that are commercially oriented and don't match the
-- resume pool for field/industrial engineering candidates.
UPDATE aggregated_jobs
SET is_active = false
WHERE is_active = true
  AND (
    title ~* '(sales|account executive|inside sales|business development|marketing|customer success|trader|proposal writer|technical writer|recruiter|product manager)'
    OR description ~* '(sales|account executive|inside sales|business development|marketing|customer success|trader|proposal writer|technical writer|recruiter|product manager)'
  );
