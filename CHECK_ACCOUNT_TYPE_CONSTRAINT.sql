-- Check what account_type values are allowed
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints 
WHERE constraint_name = 'profiles_account_type_check';

-- Also check existing profiles to see what account_type values are used
SELECT DISTINCT 
  account_type,
  COUNT(*) as count
FROM public.profiles 
GROUP BY account_type;
