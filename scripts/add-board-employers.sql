-- ==========================================
-- BOARD EMPLOYERS
-- Companies seen advertising on traveling-trades job boards
-- (RoadDogJobs, RoadTechs). Only the company name and where it was
-- seen are stored — no job titles, descriptions, pay or poster contacts.
-- Run once in the Supabase SQL Editor.
-- ==========================================

CREATE TABLE IF NOT EXISTS board_employers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name VARCHAR(200) NOT NULL,
  name_key VARCHAR(200) NOT NULL UNIQUE,   -- normalized name used to merge sources
  sources TEXT[] NOT NULL DEFAULT '{}',    -- 'roaddogjobs', 'roadtechs'
  rdj_employer_code VARCHAR(20),
  rdj_posting_count INTEGER DEFAULT 0,     -- open postings at last collect
  rt_boards TEXT[] NOT NULL DEFAULT '{}',  -- RoadTechs boards the shop is listed on
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),

  -- Enrichment into the leads table
  company_domain VARCHAR(100),
  lead_id UUID REFERENCES leads(id),
  enrich_status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'saved', 'existing_lead', 'no_domain', 'no_email' (retried after 30 days)
  enrich_attempted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_board_employers_status ON board_employers(enrich_status);
CREATE INDEX IF NOT EXISTS idx_board_employers_last_seen ON board_employers(last_seen);

ALTER TABLE board_employers ENABLE ROW LEVEL SECURITY;

-- Where a lead came from. Existing rows stay NULL (Claude-sourced).
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_source VARCHAR(50);
