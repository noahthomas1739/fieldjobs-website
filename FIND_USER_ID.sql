-- Find the correct user ID for Noah Thomas
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.email,
  p.account_type,
  u.email as auth_email,
  u.raw_user_meta_data->>'given_name' as linkedin_first,
  u.raw_user_meta_data->>'family_name' as linkedin_last
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.email = 'noah.ds.thomas@gmail.com' 
   OR u.email = 'noah.ds.thomas@gmail.com'
   OR p.first_name = 'Job'
   OR u.raw_user_meta_data->>'given_name' = 'Noah';
