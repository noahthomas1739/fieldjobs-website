# LinkedIn OAuth Setup Guide

## The Issue
LinkedIn OAuth is failing with "redirect_uri does not match the registered value" because the redirect URI configuration doesn't match between LinkedIn Developer App and Supabase.

## Fix Required

### 1. LinkedIn Developer Console
Go to: https://www.linkedin.com/developers/apps

1. **Select your LinkedIn app** (or create one if needed)
2. **Go to Auth tab**
3. **Add these Authorized redirect URLs**:
   ```
   https://wqoiedzibfptxfsatzgy.supabase.co/auth/v1/callback
   https://field-jobs.co/auth/callback
   http://localhost:3000/auth/callback
   ```

### 2. Supabase Configuration
In your Supabase dashboard:

1. **Go to Authentication > Providers**
2. **Click on LinkedIn**
3. **Enable LinkedIn provider**
4. **Add your LinkedIn credentials**:
   - Client ID: (from LinkedIn app)
   - Client Secret: (from LinkedIn app)
5. **Ensure the callback URL is**:
   ```
   https://wqoiedzibfptxfsatzgy.supabase.co/auth/v1/callback
   ```

### 3. LinkedIn App Permissions
Make sure your LinkedIn app has these permissions enabled:
- `r_liteprofile` (to read basic profile info)
- `r_emailaddress` (to read email)

### 4. Test URLs
- **Production**: `https://field-jobs.co`
- **Development**: `http://localhost:3000`
- **Supabase**: `https://wqoiedzibfptxfsatzgy.supabase.co`

## Code Changes Made
- Added `redirectTo` option to LinkedIn OAuth calls
- Standardized redirect to `/auth/callback` (same as Google)
- Updated both login and signup flows

## Testing
After configuration:
1. Test on localhost first
2. Test on production domain
3. Verify user profile data is correctly received

## Important Notes
- LinkedIn OAuth requires HTTPS in production
- Redirect URIs are case-sensitive
- Changes in LinkedIn Developer Console may take a few minutes to propagate
