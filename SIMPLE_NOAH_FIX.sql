-- Simple direct fix for Noah's profile
-- Update any profile with email noah.ds.thomas@gmail.com

UPDATE public.profiles 
SET 
  first_name = 'Noah',
  last_name = 'Thomas',
  updated_at = NOW()
WHERE email = 'noah.ds.thomas@gmail.com';

-- Verify the update
SELECT 
  id,
  first_name,
  last_name,
  email,
  updated_at
FROM public.profiles 
WHERE email = 'noah.ds.thomas@gmail.com';
