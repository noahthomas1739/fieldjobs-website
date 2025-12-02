-- =====================================================
-- FIX CURRENT SUBSCRIPTION
-- =====================================================
-- This script fixes the incorrectly synced subscription
-- from Stripe where Enterprise was recorded as Starter
-- 
-- Run this after your purchase to manually sync the
-- correct subscription data
-- =====================================================

BEGIN;

-- Find the user and subscription
DO $$
DECLARE
  target_user_id uuid;
  existing_sub_id bigint;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = 'noahdawg61@gmail.com';
  
  RAISE NOTICE 'Found user ID: %', target_user_id;
  
  -- Check for existing subscription
  SELECT id INTO existing_sub_id
  FROM subscriptions
  WHERE user_id = target_user_id
  AND status = 'active'
  LIMIT 1;
  
  IF existing_sub_id IS NOT NULL THEN
    RAISE NOTICE 'Found existing subscription ID: %', existing_sub_id;
    
    -- Update the subscription to Enterprise plan
    UPDATE subscriptions
    SET 
      plan_type = 'enterprise',
      active_jobs_limit = 20,
      credits = 25,
      price = 224600,
      updated_at = NOW()
    WHERE id = existing_sub_id;
    
    RAISE NOTICE 'Updated subscription to Enterprise plan';
  ELSE
    RAISE NOTICE 'No active subscription found';
  END IF;
END $$;

COMMIT;

-- Verify the fix
SELECT 
  s.id,
  s.user_id,
  s.plan_type,
  s.status,
  s.active_jobs_limit,
  s.credits,
  s.price / 100.0 as price_usd,
  s.stripe_subscription_id,
  s.current_period_end
FROM subscriptions s
JOIN auth.users u ON u.id = s.user_id
WHERE u.email = 'noahdawg61@gmail.com'
AND s.status = 'active';

