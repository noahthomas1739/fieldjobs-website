-- =====================================================
-- ADD UNLIMITED PLAN TYPE TO DATABASE
-- =====================================================
-- This adds 'unlimited' as a valid plan type
-- Run this in Supabase SQL Editor IMMEDIATELY
-- =====================================================

-- Drop the existing constraint
ALTER TABLE subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;

-- Add the new constraint with 'unlimited' included
ALTER TABLE subscriptions 
ADD CONSTRAINT subscriptions_plan_type_check 
CHECK (plan_type IN ('free', 'starter', 'growth', 'professional', 'enterprise', 'unlimited'));

-- Verify the constraint
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'subscriptions_plan_type_check';

