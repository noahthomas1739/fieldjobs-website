-- Check Noah's current profile status
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.email,
  p.linkedin_url,
  p.account_type,
  p.updated_at,
  u.raw_user_meta_data->>'given_name' as linkedin_given,
  u.raw_user_meta_data->>'family_name' as linkedin_family,
  u.raw_user_meta_data->>'name' as linkedin_full_name
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.email = 'noah.ds.thomas@gmail.com'
   OR u.email = 'noah.ds.thomas@gmail.com';
