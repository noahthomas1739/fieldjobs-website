-- Direct fix for Noah's profile based on console logs
-- Update the profile for user ID: ce486dc8-967a-49a3-8fa2-20155dc372ce

UPDATE public.profiles 
SET 
  first_name = 'Noah',
  last_name = 'Thomas'
WHERE id = 'ce486dc8-967a-49a3-8fa2-20155dc372ce';
