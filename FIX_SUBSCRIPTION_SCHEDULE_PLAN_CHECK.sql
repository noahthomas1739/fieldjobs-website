-- FIX_SUBSCRIPTION_SCHEDULE_PLAN_CHECK.sql
-- Fix the CHECK constraint to allow all valid plan types

-- First, let's see what the current constraint looks like
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'subscription_schedule_changes'::regclass 
AND contype = 'c';

-- Drop the old constraint
ALTER TABLE subscription_schedule_changes 
DROP CONSTRAINT IF EXISTS subscription_schedule_changes_plan_check;

-- Also try these common naming patterns
ALTER TABLE subscription_schedule_changes 
DROP CONSTRAINT IF EXISTS subscription_schedule_changes_current_plan_check;

ALTER TABLE subscription_schedule_changes 
DROP CONSTRAINT IF EXISTS subscription_schedule_changes_new_plan_check;

-- Add new constraint that includes all valid plan types
-- This covers both current_plan and new_plan columns
ALTER TABLE subscription_schedule_changes 
ADD CONSTRAINT subscription_schedule_changes_plan_check 
CHECK (
    current_plan IN ('free', 'starter', 'growth', 'professional', 'enterprise', 'unlimited') 
    AND new_plan IN ('free', 'starter', 'growth', 'professional', 'enterprise', 'unlimited')
);

-- Verify the constraint was updated
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'subscription_schedule_changes'::regclass 
AND contype = 'c';

