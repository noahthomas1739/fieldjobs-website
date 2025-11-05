-- =====================================================
-- CLEAN SLATE FOR NEW SUBSCRIPTION MODEL
-- =====================================================
-- This script prepares your database for the new 3-tier model:
-- - Single Job Post ($199)
-- - Enterprise ($1,999/year)
-- - Unlimited ($3,499/year)
-- 
-- WHAT THIS DOES:
-- 1. Deletes ALL subscription and payment data
-- 2. Resets all user subscription fields
-- 3. Removes old tier references (starter, growth, professional)
-- 4. Keeps user accounts, jobs, and applications intact
-- 5. Resets sequences for clean IDs
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Delete All Subscription Data
-- =====================================================

-- Delete all subscription schedule changes first (has foreign key to subscriptions)
DELETE FROM subscription_schedule_changes;
ALTER SEQUENCE IF EXISTS subscription_schedule_changes_id_seq RESTART WITH 1;
SELECT 'Deleted all subscription schedule changes' as status;

-- Delete all subscriptions (old tiers: starter, growth, professional, enterprise)
DELETE FROM subscriptions;
ALTER SEQUENCE IF EXISTS subscriptions_id_seq RESTART WITH 1;
SELECT 'Deleted all subscriptions' as status;

-- =====================================================
-- STEP 2: Delete All Payment Data
-- =====================================================

-- Delete all one-time payments (single jobs, resume credits)
DELETE FROM stripe_payments;
ALTER SEQUENCE IF EXISTS stripe_payments_id_seq RESTART WITH 1;
SELECT 'Deleted all stripe payments' as status;

-- Delete all job feature purchases (featured, urgent badges)
DELETE FROM job_feature_purchases;
ALTER SEQUENCE IF EXISTS job_feature_purchases_id_seq RESTART WITH 1;
SELECT 'Deleted all job feature purchases' as status;

-- =====================================================
-- STEP 3: Reset User Profile Subscription Fields
-- =====================================================

-- Reset all employer profiles to free tier
UPDATE profiles 
SET 
  stripe_customer_id = NULL,
  credits = 0,
  active_jobs_limit = 0
WHERE account_type = 'employer';
SELECT 'Reset all employer profiles' as status;

-- =====================================================
-- STEP 4: Reset Free Job Eligibility
-- =====================================================

-- Reset free job eligibility so employers can get their first free job again
UPDATE free_job_eligibility SET used = false;
SELECT 'Reset free job eligibility' as status;

-- =====================================================
-- STEP 5: Clean Up Upgrade Prompts
-- =====================================================

-- Delete all upgrade prompts
DELETE FROM upgrade_prompts;
ALTER SEQUENCE IF EXISTS upgrade_prompts_id_seq RESTART WITH 1;
SELECT 'Deleted all upgrade prompts' as status;

-- =====================================================
-- STEP 6: Optional - Reset Job Features
-- =====================================================

-- Uncomment these if you want to remove all featured/urgent status from jobs
-- UPDATE jobs SET is_featured = false, featured_until = NULL;
-- UPDATE jobs SET is_urgent = false, urgent_until = NULL;
-- SELECT 'Reset all job features' as status;

-- =====================================================
-- STEP 7: Verification - Check What Remains
-- =====================================================

SELECT '========================================' as separator;
SELECT 'DATABASE CLEANUP VERIFICATION' as title;
SELECT '========================================' as separator;

-- Count remaining records
SELECT 'Subscriptions' as table_name, COUNT(*) as count FROM subscriptions
UNION ALL
SELECT 'Stripe Payments', COUNT(*) FROM stripe_payments
UNION ALL
SELECT 'Feature Purchases', COUNT(*) FROM job_feature_purchases
UNION ALL
SELECT 'Schedule Changes', COUNT(*) FROM subscription_schedule_changes
UNION ALL
SELECT 'Upgrade Prompts', COUNT(*) FROM upgrade_prompts
UNION ALL
SELECT '---', 0
UNION ALL
SELECT 'Total Employers', COUNT(*) FROM profiles WHERE account_type = 'employer'
UNION ALL
SELECT 'Employers with Stripe ID', COUNT(*) FROM profiles WHERE account_type = 'employer' AND stripe_customer_id IS NOT NULL
UNION ALL
SELECT 'Employers with Credits', COUNT(*) FROM profiles WHERE account_type = 'employer' AND credits > 0
UNION ALL
SELECT 'Employers with Job Limits', COUNT(*) FROM profiles WHERE account_type = 'employer' AND active_jobs_limit > 0
UNION ALL
SELECT '---', 0
UNION ALL
SELECT 'Total Jobs', COUNT(*) FROM jobs
UNION ALL
SELECT 'Active Jobs', COUNT(*) FROM jobs WHERE active = true
UNION ALL
SELECT 'Featured Jobs', COUNT(*) FROM jobs WHERE is_featured = true
UNION ALL
SELECT 'Urgent Jobs', COUNT(*) FROM jobs WHERE is_urgent = true
UNION ALL
SELECT '---', 0
UNION ALL
SELECT 'Total Applications', COUNT(*) FROM applications
UNION ALL
SELECT 'Total Job Seekers', COUNT(*) FROM profiles WHERE account_type = 'seeker'
ORDER BY table_name;

-- =====================================================
-- STEP 8: Show Sample Employer Profiles
-- =====================================================

SELECT '========================================' as separator;
SELECT 'SAMPLE EMPLOYER PROFILES (First 5)' as title;
SELECT '========================================' as separator;

SELECT 
  id,
  email,
  company,
  stripe_customer_id,
  credits,
  active_jobs_limit,
  created_at
FROM profiles 
WHERE account_type = 'employer'
ORDER BY created_at DESC
LIMIT 5;

COMMIT;

-- =====================================================
-- CLEANUP COMPLETE! ✅
-- =====================================================
-- 
-- Your database is now ready for the new subscription model:
-- 
-- ✅ All old subscription data removed
-- ✅ All payment history cleared
-- ✅ All employer profiles reset to free tier
-- ✅ Jobs and applications preserved
-- ✅ User accounts intact
-- 
-- NEXT STEPS:
-- 1. Create new Stripe products:
--    - Enterprise: $1,999/year
--    - Unlimited: $3,499/year
-- 2. Copy price IDs to Vercel environment variables
-- 3. Test subscription flow
-- 4. Verify dashboard displays correctly
-- 
-- =====================================================

