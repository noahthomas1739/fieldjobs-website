-- =====================================================
-- FIX UNLIMITED SUBSCRIPTION
-- =====================================================
-- This script updates your subscription to Unlimited plan
-- Run this after purchasing Unlimited to manually sync
-- =====================================================

BEGIN;

DO $$
DECLARE
  target_user_id uuid;
  stripe_sub_id text := 'sub_1SZI5sRC3IxXIgoOtJ8yhczr'; -- From your Stripe screenshot
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = 'noahdawg61@gmail.com';
  
  RAISE NOTICE 'Found user ID: %', target_user_id;
  
  -- Update or insert the subscription
  UPDATE subscriptions
  SET 
    plan_type = 'unlimited',
    active_jobs_limit = 999999,
    credits = 100,
    price = 355300,
    status = 'active',
    updated_at = NOW()
  WHERE user_id = target_user_id
  AND stripe_subscription_id = stripe_sub_id;
  
  -- If no rows updated, the subscription might not exist yet
  IF NOT FOUND THEN
    RAISE NOTICE 'No existing subscription found, creating new one...';
    
    -- Insert new subscription
    INSERT INTO subscriptions (
      user_id,
      plan_type,
      status,
      stripe_subscription_id,
      stripe_customer_id,
      active_jobs_limit,
      credits,
      price,
      current_period_start,
      current_period_end,
      created_at,
      updated_at
    )
    SELECT 
      target_user_id,
      'unlimited',
      'active',
      stripe_sub_id,
      stripe_customer_id,
      999999,
      100,
      355300,
      NOW(),
      NOW() + INTERVAL '1 year',
      NOW(),
      NOW()
    FROM profiles
    WHERE id = target_user_id;
    
    RAISE NOTICE 'Created new Unlimited subscription';
  ELSE
    RAISE NOTICE 'Updated existing subscription to Unlimited';
  END IF;
END $$;

COMMIT;

-- Verify the fix
SELECT 
  s.id,
  s.plan_type,
  s.status,
  s.active_jobs_limit,
  s.credits,
  s.price / 100.0 as price_usd,
  s.stripe_subscription_id,
  s.current_period_end,
  u.email
FROM subscriptions s
JOIN auth.users u ON u.id = s.user_id
WHERE u.email = 'noahdawg61@gmail.com'
AND s.status = 'active'
ORDER BY s.created_at DESC;

