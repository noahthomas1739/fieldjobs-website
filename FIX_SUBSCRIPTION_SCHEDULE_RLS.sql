-- FIX_SUBSCRIPTION_SCHEDULE_RLS.sql
-- Add proper RLS policies for subscription_schedule_changes table
-- This allows users to manage their own scheduled subscription changes

-- First, ensure RLS is enabled on the table
ALTER TABLE subscription_schedule_changes ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own scheduled changes" ON subscription_schedule_changes;
DROP POLICY IF EXISTS "Users can insert own scheduled changes" ON subscription_schedule_changes;
DROP POLICY IF EXISTS "Users can update own scheduled changes" ON subscription_schedule_changes;
DROP POLICY IF EXISTS "Users can delete own scheduled changes" ON subscription_schedule_changes;

-- Policy 1: Users can view their own scheduled changes
CREATE POLICY "Users can view own scheduled changes" 
ON subscription_schedule_changes
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy 2: Users can insert scheduled changes for themselves only
CREATE POLICY "Users can insert own scheduled changes" 
ON subscription_schedule_changes
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own scheduled changes (e.g., cancel a pending downgrade)
CREATE POLICY "Users can update own scheduled changes" 
ON subscription_schedule_changes
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own scheduled changes
CREATE POLICY "Users can delete own scheduled changes" 
ON subscription_schedule_changes
FOR DELETE 
USING (auth.uid() = user_id);

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'subscription_schedule_changes'
ORDER BY policyname;

