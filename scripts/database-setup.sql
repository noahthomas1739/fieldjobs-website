-- ==========================================
-- FIELD JOBS AUTOMATION - DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ==========================================

-- ==========================================
-- 1. AGGREGATED JOBS TABLE
-- Stores jobs pulled from external APIs
-- ==========================================

CREATE TABLE IF NOT EXISTS aggregated_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  company_name VARCHAR(100) NOT NULL,
  location VARCHAR(200),
  description TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  external_url TEXT,
  external_id VARCHAR(100) UNIQUE NOT NULL,
  source VARCHAR(50) NOT NULL, -- 'adzuna', 'jsearch', 'remoteok'
  industry VARCHAR(50),
  employment_type VARCHAR(50) DEFAULT 'full_time',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  -- Indexes
  CONSTRAINT aggregated_jobs_external_id_unique UNIQUE (external_id)
);

CREATE INDEX IF NOT EXISTS idx_aggregated_jobs_industry ON aggregated_jobs(industry);
CREATE INDEX IF NOT EXISTS idx_aggregated_jobs_active ON aggregated_jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_aggregated_jobs_created ON aggregated_jobs(created_at DESC);

-- ==========================================
-- 2. LEADS TABLE
-- Stores companies/contacts for outreach
-- ==========================================

CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name VARCHAR(200) NOT NULL,
  company_domain VARCHAR(100) NOT NULL,
  contact_name VARCHAR(100),
  contact_email VARCHAR(200) NOT NULL,
  contact_title VARCHAR(100),
  location VARCHAR(200),
  industry VARCHAR(50),
  
  -- Email verification
  email_source VARCHAR(50), -- 'apollo', 'hunter', 'snov', 'skrapp'
  email_verified BOOLEAN DEFAULT false,
  
  -- Outreach status
  status VARCHAR(20) DEFAULT 'new', -- 'new', 'active', 'converted', 'unsubscribed', 'bounced'
  last_email_number INTEGER DEFAULT 0,
  
  -- Email tracking
  email_1_sent TIMESTAMPTZ,
  email_2_sent TIMESTAMPTZ,
  email_3_sent TIMESTAMPTZ,
  email_4_sent TIMESTAMPTZ,
  email_5_sent TIMESTAMPTZ,
  
  -- Response tracking
  clicked BOOLEAN DEFAULT false,
  replied BOOLEAN DEFAULT false,
  converted BOOLEAN DEFAULT false,
  unsubscribed BOOLEAN,
  bounced BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT leads_company_domain_unique UNIQUE (company_domain)
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_industry ON leads(industry);
CREATE INDEX IF NOT EXISTS idx_leads_email_verified ON leads(email_verified);

-- ==========================================
-- 3. EMAIL LOG TABLE
-- Tracks all sent emails
-- ==========================================

CREATE TABLE IF NOT EXISTS email_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  email_number INTEGER NOT NULL,
  recipient_email VARCHAR(200) NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened BOOLEAN DEFAULT false,
  clicked BOOLEAN DEFAULT false,
  bounced BOOLEAN DEFAULT false,
  
  -- For analytics
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_log_sent_at ON email_log(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_lead ON email_log(lead_id);

-- ==========================================
-- 4. EMAIL SERVICE USAGE TABLE
-- Tracks API usage for free tiers
-- ==========================================

CREATE TABLE IF NOT EXISTS email_service_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service VARCHAR(50) NOT NULL, -- 'apollo', 'hunter', 'snov', 'skrapp'
  month TIMESTAMPTZ NOT NULL,
  count INTEGER DEFAULT 0,
  
  CONSTRAINT email_service_usage_unique UNIQUE (service, month)
);

-- ==========================================
-- 5. AUTOMATION RUNS LOG
-- Tracks when scripts ran and results
-- ==========================================

CREATE TABLE IF NOT EXISTS automation_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  script_name VARCHAR(50) NOT NULL, -- 'job-aggregator', 'lead-generator', 'email-outreach'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'running', -- 'running', 'completed', 'failed'
  results JSONB,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_automation_runs_script ON automation_runs(script_name);
CREATE INDEX IF NOT EXISTS idx_automation_runs_started ON automation_runs(started_at DESC);

-- ==========================================
-- ROW LEVEL SECURITY (Optional for service role)
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE aggregated_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_service_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for automation scripts)
CREATE POLICY "Service role has full access to aggregated_jobs"
  ON aggregated_jobs FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to leads"
  ON leads FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to email_log"
  ON email_log FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to email_service_usage"
  ON email_service_usage FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to automation_runs"
  ON automation_runs FOR ALL
  USING (true)
  WITH CHECK (true);

-- ==========================================
-- HELPFUL VIEWS
-- ==========================================

-- View: Daily email stats
CREATE OR REPLACE VIEW daily_email_stats AS
SELECT 
  DATE(sent_at) as date,
  COUNT(*) as total_sent,
  COUNT(CASE WHEN bounced THEN 1 END) as bounced,
  COUNT(CASE WHEN opened THEN 1 END) as opened,
  COUNT(CASE WHEN clicked THEN 1 END) as clicked
FROM email_log
GROUP BY DATE(sent_at)
ORDER BY date DESC;

-- View: Lead funnel
CREATE OR REPLACE VIEW lead_funnel AS
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM leads
GROUP BY status
ORDER BY 
  CASE status
    WHEN 'new' THEN 1
    WHEN 'active' THEN 2
    WHEN 'converted' THEN 3
    WHEN 'unsubscribed' THEN 4
    WHEN 'bounced' THEN 5
  END;

-- View: Jobs by source
CREATE OR REPLACE VIEW jobs_by_source AS
SELECT 
  source,
  COUNT(*) as total_jobs,
  COUNT(CASE WHEN is_active THEN 1 END) as active_jobs
FROM aggregated_jobs
GROUP BY source;

-- ==========================================
-- DONE!
-- ==========================================
SELECT 'Database setup complete!' as message;

