-- Fix existing profiles that have "Job"/"Seeker" placeholder values
-- Run this after updating the trigger to fix existing LinkedIn users

-- Update profiles where first_name is 'Job' and we can get the real name from auth.users
UPDATE public.profiles 
SET 
  first_name = COALESCE(
    auth.users.raw_user_meta_data->>'given_name',
    auth.users.raw_user_meta_data->>'first_name',
    split_part(auth.users.raw_user_meta_data->>'name', ' ', 1)
  ),
  last_name = COALESCE(
    auth.users.raw_user_meta_data->>'family_name', 
    auth.users.raw_user_meta_data->>'last_name',
    split_part(auth.users.raw_user_meta_data->>'name', ' ', 2)
  ),
  linkedin_url = COALESCE(
    profiles.linkedin_url,
    auth.users.raw_user_meta_data->>'profile_url',
    auth.users.raw_user_meta_data->>'linkedin_url'
  )
FROM auth.users 
WHERE profiles.id = auth.users.id 
AND (profiles.first_name = 'Job' OR profiles.last_name = 'Seeker' OR profiles.first_name IS NULL OR profiles.last_name IS NULL)
AND auth.users.raw_user_meta_data IS NOT NULL;
