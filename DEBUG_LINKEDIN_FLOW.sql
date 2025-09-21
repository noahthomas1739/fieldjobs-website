-- Debug the LinkedIn OAuth flow
-- Check if user was created in auth.users but not in profiles

-- 1. Check auth.users for your LinkedIn user
SELECT 
  'Auth Users Check' as check_type,
  u.id,
  u.email,
  u.created_at,
  u.app_metadata,
  u.raw_user_meta_data->>'given_name' as given_name,
  u.raw_user_meta_data->>'family_name' as family_name,
  u.raw_user_meta_data->>'name' as full_name
FROM auth.users u
WHERE u.email = 'noah.ds.thomas@gmail.com'
ORDER BY u.created_at DESC;

-- 2. Check profiles table for your user
SELECT 
  'Profiles Check' as check_type,
  p.*
FROM public.profiles p
WHERE p.email = 'noah.ds.thomas@gmail.com';

-- 3. Check for any profiles with Job/Seeker names (might be yours)
SELECT 
  'Job/Seeker Profiles' as check_type,
  p.*
FROM public.profiles p
WHERE p.first_name = 'Job' OR p.last_name = 'Seeker'
ORDER BY p.created_at DESC;

-- 4. Check the trigger exists and is active
SELECT 
  'Trigger Check' as check_type,
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
