-- Check what happened during the recent LinkedIn signup attempt

-- 1. Check the most recent auth.users entries
SELECT 
  'Recent Auth Users' as check_type,
  u.id,
  u.email,
  u.created_at,
  u.raw_user_meta_data->>'given_name' as given_name,
  u.raw_user_meta_data->>'family_name' as family_name,
  u.raw_user_meta_data->>'name' as full_name
FROM auth.users u
ORDER BY u.created_at DESC
LIMIT 5;

-- 2. Check the most recent profiles entries
SELECT 
  'Recent Profiles' as check_type,
  p.id,
  p.first_name,
  p.last_name,
  p.email,
  p.account_type,
  p.created_at
FROM public.profiles p
ORDER BY p.created_at DESC
LIMIT 5;
