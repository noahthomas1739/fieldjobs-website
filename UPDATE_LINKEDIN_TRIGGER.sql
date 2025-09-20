-- Quick update to fix LinkedIn name extraction in database trigger
-- Run this in Supabase SQL Editor to fix the auto-fill

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER -- Runs with elevated privileges
SET search_path = public, auth
AS $$
DECLARE
  user_account_type text;
  user_first_name text;
  user_last_name text;
  user_avatar_url text;
  user_linkedin_url text;
BEGIN
  -- Get account type from user metadata, default to 'job_seeker'
  user_account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'job_seeker');
  
  -- Extract name data - LinkedIn uses given_name/family_name
  user_first_name := COALESCE(
    NEW.raw_user_meta_data->>'given_name',
    NEW.raw_user_meta_data->>'first_name',
    split_part(NEW.raw_user_meta_data->>'name', ' ', 1),
    split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1),
    ''
  );
  
  user_last_name := COALESCE(
    NEW.raw_user_meta_data->>'family_name',
    NEW.raw_user_meta_data->>'last_name',
    split_part(NEW.raw_user_meta_data->>'name', ' ', 2),
    split_part(NEW.raw_user_meta_data->>'full_name', ' ', 2),
    ''
  );
  
  -- Extract profile picture and LinkedIn URL
  user_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    ''
  );
  
  user_linkedin_url := COALESCE(
    NEW.raw_user_meta_data->>'profile_url',
    NEW.raw_user_meta_data->>'linkedin_url',
    ''
  );
  
  -- Insert profile with auto-filled data
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
    NEW.id,
    user_first_name,
    user_last_name,
    NEW.email,
    user_account_type,
    user_linkedin_url,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't prevent user creation
    RAISE LOG 'Failed to create profile for user %: % %', NEW.id, SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
