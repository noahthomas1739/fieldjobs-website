# LinkedIn OAuth Setup Guide

## The Issue
LinkedIn OAuth is failing with "redirect_uri does not match the registered value" because the redirect URI configuration doesn't match between LinkedIn Developer App and Supabase.

## Fix Required

### 1. LinkedIn Developer Console
Go: https://www.linkedin.com/developers/apps

1. **Select your LinkedIn app** (or create one if needed)
2. **Go to Auth tab**
3. **Add these Authorized redirect URLs for branded OAuth flow**:
   ```
   https://field-jobs.co/auth/callback
   http://localhost:3000/auth/callback
   https://wqoiedzibfptxfsatzgy.supabase.co/auth/v1/callback
   ```

✅ **BRANDED FLOW**: Include your app URLs so users see your domain during OAuth, not Supabase's.

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
   - Add ALL these URLs to LinkedIn app authorized redirects:
     - `https://field-jobs.co/auth/callback` (production)
     - `http://localhost:3000/auth/callback` (development)
     - `https://wqoiedzibfptxfsatzgy.supabase.co/auth/v1/callback` (Supabase fallback)
   - Enable "Sign In with LinkedIn using OpenID Connect" product

2. **Supabase Configuration**:
   - Site URL: `https://field-jobs.co`
   - Additional redirect URLs: `http://localhost:3000/**`
   - LinkedIn provider enabled with Client ID/Secret

3. **Code Changes Made**:
   - Updated scopes from `r_liteprofile r_emailaddress` to `openid profile email`
   - Restored `redirectTo` option for branded OAuth flow
   - Users now see your domain during LinkedIn OAuth, not Supabase's

### OAuth Flow Explanation (Branded):
1. User clicks LinkedIn login → Supabase initiates OAuth with your domain
2. LinkedIn redirects to → `https://field-jobs.co/auth/callback` (branded!)
3. Your app receives auth code → Exchanges with Supabase for session
4. Your app handles the session → Redirects to dashboard

### Benefits of Branded Flow:
- ✅ Users see field-jobs.co during OAuth (professional)
- ✅ No Supabase branding visible to users
- ✅ Consistent brand experience
- ✅ Better trust and user experience

## Important Notes
- LinkedIn OAuth requires HTTPS in production
- Redirect URIs are case-sensitive
- Changes in LinkedIn Developer Console may take a few minutes to propagate
- The redirect URI in LinkedIn should NEVER be your app's URL directly
