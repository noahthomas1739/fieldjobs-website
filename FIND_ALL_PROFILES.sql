-- Find all profiles to see what's in the database
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.email,
  p.account_type,
  p.created_at,
  'Profile Table' as source
FROM public.profiles p
ORDER BY p.created_at DESC
LIMIT 10;

-- Also check auth.users table
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'given_name' as given_name,
  u.raw_user_meta_data->>'family_name' as family_name,
  u.created_at,
  'Auth Users Table' as source
FROM auth.users u
ORDER BY u.created_at DESC
LIMIT 10;
