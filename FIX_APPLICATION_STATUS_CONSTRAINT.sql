-- Fix application status constraint to allow proper status values
-- This script updates the applications_status_check constraint to allow:
-- 'pending', 'new', 'shortlisted', 'interviewed', 'rejected', 'hired', 'submitted'

-- First, drop the existing constraint
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;

-- Add the new constraint with proper status values
ALTER TABLE applications ADD CONSTRAINT applications_status_check 
CHECK (status IN (
  'pending',
  'new', 
  'shortlisted',
  'interviewed',
  'rejected',
  'hired',
  'submitted'
));

-- Verify the constraint was added
SELECT conname, consrc 
FROM pg_constraint 
WHERE conname = 'applications_status_check';
