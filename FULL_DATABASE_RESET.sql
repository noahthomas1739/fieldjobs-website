-- =====================================================
-- FULL DATABASE RESET (Nuclear Option)
-- =====================================================
-- WARNING: This deletes EVERYTHING including test data
-- Only use this if you want a completely fresh start
-- =====================================================

-- 1. Delete all applications
DELETE FROM applications;
ALTER SEQUENCE IF EXISTS applications_id_seq RESTART WITH 1;

-- 2. Delete all jobs
DELETE FROM jobs;
ALTER SEQUENCE IF EXISTS jobs_id_seq RESTART WITH 1;

-- 3. Delete all job alerts
DELETE FROM job_alerts;
ALTER SEQUENCE IF EXISTS job_alerts_id_seq RESTART WITH 1;

-- 4. Delete all saved jobs
DELETE FROM saved_jobs;
ALTER SEQUENCE IF EXISTS saved_jobs_id_seq RESTART WITH 1;

-- 5. Delete all subscriptions
DELETE FROM subscriptions;
ALTER SEQUENCE IF EXISTS subscriptions_id_seq RESTART WITH 1;

-- 6. Delete all stripe payments
DELETE FROM stripe_payments;
ALTER SEQUENCE IF EXISTS stripe_payments_id_seq RESTART WITH 1;

-- 7. Delete all job feature purchases
DELETE FROM job_feature_purchases;
ALTER SEQUENCE IF EXISTS job_feature_purchases_id_seq RESTART WITH 1;

-- 8. Delete all subscription schedule changes
DELETE FROM subscription_schedule_changes;
ALTER SEQUENCE IF EXISTS subscription_schedule_changes_id_seq RESTART WITH 1;

-- 9. Delete all free job eligibility records
DELETE FROM free_job_eligibility;
ALTER SEQUENCE IF EXISTS free_job_eligibility_id_seq RESTART WITH 1;

-- 10. Delete all upgrade prompts
DELETE FROM upgrade_prompts;
ALTER SEQUENCE IF EXISTS upgrade_prompts_id_seq RESTART WITH 1;

-- 11. Reset all profiles (keep accounts but reset data)
UPDATE profiles 
SET 
  stripe_customer_id = NULL,
  credits = 0,
  active_jobs_limit = 0,
  company = NULL,
  phone = NULL,
  resume_url = NULL,
  resume_filename = NULL,
  classification = NULL
WHERE 1=1;

-- 12. Optional: Delete all profiles (uncomment if you want to remove test accounts)
-- DELETE FROM profiles WHERE email LIKE '%test%' OR email LIKE '%@gmail.com';

-- 13. Verify cleanup
SELECT 'Applications' as table_name, COUNT(*) as count FROM applications
UNION ALL
SELECT 'Jobs', COUNT(*) FROM jobs
UNION ALL
SELECT 'Job Alerts', COUNT(*) FROM job_alerts
UNION ALL
SELECT 'Saved Jobs', COUNT(*) FROM saved_jobs
UNION ALL
SELECT 'Subscriptions', COUNT(*) FROM subscriptions
UNION ALL
SELECT 'Stripe Payments', COUNT(*) FROM stripe_payments
UNION ALL
SELECT 'Feature Purchases', COUNT(*) FROM job_feature_purchases
UNION ALL
SELECT 'Schedule Changes', COUNT(*) FROM subscription_schedule_changes
UNION ALL
SELECT 'Free Job Eligibility', COUNT(*) FROM free_job_eligibility
UNION ALL
SELECT 'Upgrade Prompts', COUNT(*) FROM upgrade_prompts
UNION ALL
SELECT 'Total Profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'Employers', COUNT(*) FROM profiles WHERE account_type = 'employer'
UNION ALL
SELECT 'Job Seekers', COUNT(*) FROM profiles WHERE account_type = 'seeker';

-- =====================================================
-- FULL RESET COMPLETE
-- =====================================================

