-- FIXED PERMANENT FIX: Update all LinkedIn users with correct names
-- This version works around the app_metadata access limitation

-- 1. Fix all existing profiles that have LinkedIn data but wrong names
UPDATE public.profiles 
SET 
  first_name = COALESCE(
    u.raw_user_meta_data->>'given_name',
    u.raw_user_meta_data->>'first_name',
    split_part(u.raw_user_meta_data->>'name', ' ', 1)
  ),
  last_name = COALESCE(
    u.raw_user_meta_data->>'family_name',
    u.raw_user_meta_data->>'last_name',
    split_part(u.raw_user_meta_data->>'name', ' ', 2)
  ),
  linkedin_url = COALESCE(
    u.raw_user_meta_data->>'profile_url',
    u.raw_user_meta_data->>'linkedin_url',
    profiles.linkedin_url
  ),
  updated_at = NOW()
FROM auth.users u
WHERE profiles.id = u.id
  AND (
    profiles.first_name = 'Job' 
    OR profiles.last_name = 'Seeker'
    OR profiles.first_name IS NULL
    OR profiles.last_name IS NULL
  )
  AND u.raw_user_meta_data IS NOT NULL
  AND (
    u.raw_user_meta_data->>'given_name' IS NOT NULL
    OR u.raw_user_meta_data->>'family_name' IS NOT NULL
    OR u.raw_user_meta_data->>'name' IS NOT NULL
  );

-- 2. Show results of the update
SELECT 
  'Updated profiles:' as status,
  COUNT(*) as count
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.raw_user_meta_data IS NOT NULL
  AND (
    u.raw_user_meta_data->>'given_name' IS NOT NULL
    OR u.raw_user_meta_data->>'family_name' IS NOT NULL
  );

-- 3. Show specific results for verification
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.email,
  p.linkedin_url,
  u.raw_user_meta_data->>'given_name' as linkedin_given,
  u.raw_user_meta_data->>'family_name' as linkedin_family,
  u.raw_user_meta_data->>'name' as linkedin_full_name
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.raw_user_meta_data IS NOT NULL
  AND (
    u.raw_user_meta_data->>'given_name' IS NOT NULL
    OR u.raw_user_meta_data->>'family_name' IS NOT NULL
  )
ORDER BY p.updated_at DESC;
