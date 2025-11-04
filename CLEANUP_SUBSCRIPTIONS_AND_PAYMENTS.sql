-- =====================================================
-- CLEANUP SCRIPT: Reset Subscriptions & Payment Data
-- =====================================================
-- This script removes all subscription and payment data
-- while preserving user profiles, jobs, and applications
-- 
-- USE WITH CAUTION: This is irreversible!
-- =====================================================

-- 1. Clean up subscriptions table
DELETE FROM subscriptions;
ALTER SEQUENCE IF EXISTS subscriptions_id_seq RESTART WITH 1;

-- 2. Clean up stripe_payments table (one-time payments)
DELETE FROM stripe_payments;
ALTER SEQUENCE IF EXISTS stripe_payments_id_seq RESTART WITH 1;

-- 3. Clean up job_feature_purchases (featured/urgent badges)
DELETE FROM job_feature_purchases;
ALTER SEQUENCE IF EXISTS job_feature_purchases_id_seq RESTART WITH 1;

-- 4. Clean up subscription_schedule_changes (downgrades, etc.)
DELETE FROM subscription_schedule_changes;
ALTER SEQUENCE IF EXISTS subscription_schedule_changes_id_seq RESTART WITH 1;

-- 5. Reset user subscription-related fields in profiles
UPDATE profiles 
SET 
  stripe_customer_id = NULL,
  credits = 0,
  active_jobs_limit = 0
WHERE account_type = 'employer';

-- 6. Optional: Reset free job eligibility (uncomment if needed)
-- UPDATE free_job_eligibility SET used = false;

-- 7. Verify cleanup
SELECT 'Subscriptions Count' as table_name, COUNT(*) as count FROM subscriptions
UNION ALL
SELECT 'Stripe Payments Count', COUNT(*) FROM stripe_payments
UNION ALL
SELECT 'Feature Purchases Count', COUNT(*) FROM job_feature_purchases
UNION ALL
SELECT 'Schedule Changes Count', COUNT(*) FROM subscription_schedule_changes
UNION ALL
SELECT 'Profiles with Stripe ID', COUNT(*) FROM profiles WHERE stripe_customer_id IS NOT NULL
UNION ALL
SELECT 'Total Employers', COUNT(*) FROM profiles WHERE account_type = 'employer'
UNION ALL
SELECT 'Total Jobs', COUNT(*) FROM jobs
UNION ALL
SELECT 'Total Applications', COUNT(*) FROM applications;

-- =====================================================
-- CLEANUP COMPLETE
-- =====================================================
-- Next steps:
-- 1. Update Stripe products to match new pricing
-- 2. Create new price IDs for Enterprise ($1,999/year) and Unlimited ($3,499/year)
-- 3. Add new price IDs to Vercel environment variables
-- 4. Test subscription flow with new products
-- =====================================================

