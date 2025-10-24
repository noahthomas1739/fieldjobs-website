-- Fix applications status constraint to allow all necessary status values

-- Drop the existing constraint
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;

-- Create a new, more permissive constraint
ALTER TABLE applications ADD CONSTRAINT applications_status_check 
CHECK (status IN (
  'pending', 
  'new', 
  'submitted', 
  'shortlisted', 
  'interviewed', 
  'rejected', 
  'hired',
  'withdrawn',
  'expired'
));
