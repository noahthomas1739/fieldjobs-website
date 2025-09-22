-- Debug why frontend shows wrong profile data
-- Check if there are multiple profiles for the same user

-- 1. Check current session user ID vs profiles
SELECT 
  'Current Session User' as check_type,
  '04023538-2a7b-426a-be32-a0e40ee11a2f' as session_user_id;

-- 2. Find ALL profiles for this user ID
SELECT 
  'Profiles for Session User' as check_type,
  p.*
FROM public.profiles p
WHERE p.id = '04023538-2a7b-426a-be32-a0e40ee11a2f';

-- 3. Check if there are multiple profiles with same email
SELECT 
  'All Profiles with Same Email' as check_type,
  p.*
FROM public.profiles p
WHERE p.email = 'noah.ds.thomas@gmail.com'
ORDER BY p.created_at DESC;

-- 4. Check auth.users to see which ID should be active
SELECT 
  'Auth Users with Same Email' as check_type,
  u.id,
  u.email,
  u.created_at,
  u.last_sign_in_at
FROM auth.users u
WHERE u.email = 'noah.ds.thomas@gmail.com'
ORDER BY u.created_at DESC;
