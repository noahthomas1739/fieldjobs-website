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

### 3. LinkedIn App Permissions & Products
LinkedIn has moved to OpenID Connect. Make sure your LinkedIn app has:

**Required Product:**
- "Sign In with LinkedIn using OpenID Connect" (NOT the old "Sign In with LinkedIn")

**Required Scopes (automatically included with OpenID Connect):**
- `openid` (authentication)
- `profile` (basic profile info)  
- `email` (email address)

**OLD SCOPES TO REMOVE:**
- ❌ `r_liteprofile` (deprecated)
- ❌ `r_emailaddress` (deprecated)

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
1. **LinkedIn App Setup**:
   - Remove these URLs from LinkedIn app (if present):
     - `https://field-jobs.co/auth/callback`
     - `http://localhost:3000/auth/callback`
   - Keep ONLY: `https://wqoiedzibfptxfsatzgy.supabase.co/auth/v1/callback`
   - Enable "Sign In with LinkedIn using OpenID Connect" product

2. **Supabase Configuration**:
   - Site URL: `https://field-jobs.co`
   - Additional redirect URLs: `http://localhost:3000/**`
   - LinkedIn provider enabled with Client ID/Secret

3. **Code Changes Made**:
   - Updated scopes from `r_liteprofile r_emailaddress` to `openid profile email`
   - Removed custom `redirectTo` option to let Supabase handle redirects automatically

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
