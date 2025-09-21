-- Find Noah anywhere in the database
-- Check profiles table for any Noah-related data
SELECT 
  'Profiles with Noah email' as search_type,
  p.*
FROM public.profiles p
WHERE p.email ILIKE '%noah%'
   OR p.email ILIKE '%thomas%';

-- Check auth.users for Noah
SELECT 
  'Auth users with Noah email' as search_type,
  u.id,
  u.email,
  u.raw_user_meta_data,
  u.created_at
FROM auth.users u
WHERE u.email ILIKE '%noah%'
   OR u.email ILIKE '%thomas%'
   OR u.raw_user_meta_data->>'given_name' ILIKE '%noah%';

-- Check for profiles with Job/Seeker names
SELECT 
  'Profiles with Job/Seeker names' as search_type,
  p.*
FROM public.profiles p
WHERE p.first_name = 'Job'
   OR p.last_name = 'Seeker';
