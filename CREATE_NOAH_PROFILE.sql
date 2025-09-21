-- Create Noah's missing profile using his auth.users data
INSERT INTO public.profiles (
  id,
  first_name,
  last_name,
  email,
  account_type,
  linkedin_url,
  created_at,
  updated_at
)
VALUES (
  '02335150-5705-4b2d-a4a7-c20afc0d534c',  -- Your actual user ID
  'Noah',                                    -- From LinkedIn given_name
  'Thomas',                                  -- From LinkedIn family_name  
  'noah.ds.thomas@gmail.com',               -- Your email
  'job_seeker',                             -- Account type
  '',                                       -- LinkedIn URL (can be updated later)
  NOW(),                                    -- Created timestamp
  NOW()                                     -- Updated timestamp
);

-- Verify the profile was created
SELECT 
  id,
  first_name,
  last_name,
  email,
  account_type,
  created_at
FROM public.profiles 
WHERE id = '02335150-5705-4b2d-a4a7-c20afc0d534c';
