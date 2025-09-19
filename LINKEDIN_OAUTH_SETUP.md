# LinkedIn OAuth Setup Guide

## The Issue
LinkedIn OAuth is failing with "redirect_uri does not match the registered value" because the redirect URI configuration doesn't match between LinkedIn Developer App and Supabase.

## Fix Required

### 1. LinkedIn Developer Console
Go to: https://www.linkedin.com/developers/apps

1. **Select your LinkedIn app** (or create one if needed)
2. **Go to Auth tab**
3. **Add ONLY the Supabase callback URL as authorized redirect URL**:
   ```
   https://wqoiedzibfptxfsatzgy.supabase.co/auth/v1/callback
   ```

⚠️ **CRITICAL**: Do NOT add your app URLs (field-jobs.co, localhost) here. LinkedIn should only redirect to Supabase, then Supabase handles redirecting to your app.

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

## Troubleshooting Current Issue

### Current Error Analysis
The browser shows: `redirect_to=https://field-jobs.co/auth/callback`
But LinkedIn expects: `https://wqoiedzibfptxfsatzgy.supabase.co/auth/v1/callback`

### Fix Steps:
1. **Remove these URLs from LinkedIn app** (if present):
   - `https://field-jobs.co/auth/callback`
   - `http://localhost:3000/auth/callback`

2. **Keep ONLY this URL in LinkedIn app**:
   - `https://wqoiedzibfptxfsatzgy.supabase.co/auth/v1/callback`

3. **In Supabase, your Site URL should be**:
   - Site URL: `https://field-jobs.co`
   - Additional redirect URLs: `http://localhost:3000/**`

### OAuth Flow Explanation:
1. User clicks LinkedIn login → Supabase initiates OAuth
2. LinkedIn redirects to → `wqoiedzibfptxfsatzgy.supabase.co/auth/v1/callback`
3. Supabase processes auth → Redirects to your app's `/auth/callback`
4. Your app handles the session → Redirects to dashboard

## Important Notes
- LinkedIn OAuth requires HTTPS in production
- Redirect URIs are case-sensitive
- Changes in LinkedIn Developer Console may take a few minutes to propagate
- The redirect URI in LinkedIn should NEVER be your app's URL directly
