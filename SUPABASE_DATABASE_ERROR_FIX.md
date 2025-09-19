# Supabase Database Error Fix

## The Issue
LinkedIn OAuth failing with "Database error saving new user" - this means Supabase can't create the user record in the database.

## Root Cause
The error URL shows: `error=server_error&error_code=unexpected_failure&error_description=Database+error+saving+new+user`

This indicates a database-level problem when Supabase tries to insert the new user.

## Possible Causes & Solutions

### 1. Database Permissions
**Issue**: Auth service doesn't have permission to insert into auth.users table
**Solution**: Check Supabase project settings and ensure auth is properly configured

### 2. Database Schema Issues
**Issue**: Missing required columns or constraints in auth.users table
**Solutions**:
- Check if custom user schema conflicts with Supabase auth
- Verify no custom triggers are blocking user creation
- Ensure no unique constraints are being violated

### 3. Database Connection Issues
**Issue**: Database is overloaded or connection pool exhausted
**Solution**: Check Supabase dashboard for database performance metrics

### 4. Row Level Security (RLS) Policies
**Issue**: RLS policies are blocking user creation
**Solution**: 
- Go to Supabase Dashboard → Authentication → Policies
- Ensure auth.users table allows inserts for authenticated users
- Check if custom policies are interfering

### 5. Custom Database Triggers
**Issue**: Custom triggers on auth.users table are failing
**Solution**: 
- Check for any custom triggers on auth schema
- Temporarily disable custom triggers to test

## Immediate Fixes to Try

### Fix 1: Check Supabase Dashboard
1. Go to Supabase Dashboard → Settings → Database
2. Check for any error messages or warnings
3. Look at recent logs for failed queries

### Fix 2: Verify Auth Configuration
1. Go to Authentication → Settings
2. Ensure "Enable email confirmations" matches your needs
3. Check "Enable phone confirmations" settings
4. Verify site URL is correct

### Fix 3: Test with Direct SQL
Run this in Supabase SQL Editor to test user creation:
```sql
-- Test if we can insert into auth.users manually
SELECT * FROM auth.users LIMIT 1;

-- Check auth schema permissions
SELECT has_table_privilege('auth.users', 'INSERT');
```

### Fix 4: Check Database Logs
1. Go to Supabase Dashboard → Logs
2. Look for recent database errors
3. Check auth-related error messages

### Fix 5: Temporarily Disable Custom Schema
If you have custom user profiles or triggers:
1. Temporarily disable them
2. Test LinkedIn OAuth
3. Re-enable one by one to identify the problem

## Testing After Fix
1. Clear browser cache and cookies
2. Try LinkedIn OAuth with a different email
3. Check Supabase auth users table for new entry
4. Verify user can reach account type selection

## Alternative Workaround
If database issue persists:
1. Create user manually in Supabase auth
2. Test OAuth with existing user
3. This will help confirm if issue is with creation or login
