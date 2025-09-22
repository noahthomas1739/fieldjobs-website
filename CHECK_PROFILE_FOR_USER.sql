-- Check the specific profile for the current user ID
SELECT 
  'Profile for Current User' as check_type,
  p.*
FROM public.profiles p
WHERE p.id = '04023538-2a7b-426a-be32-a0e40ee11a2f';

-- Also check if there are any profiles with Job/Seeker that might be interfering
SELECT 
  'Job/Seeker Profiles' as check_type,
  p.*
FROM public.profiles p
WHERE p.first_name = 'Job' OR p.last_name = 'Seeker'
ORDER BY p.created_at DESC;
