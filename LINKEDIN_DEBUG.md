# LinkedIn OAuth Debug Guide

## Current Status
- ✅ LinkedIn app has all redirect URLs configured
- ✅ "Sign In with LinkedIn using OpenID Connect" product enabled
- ✅ Correct scopes in code: `openid profile email`
- ❌ Still getting redirect_uri mismatch

## Debug Steps

### 1. Check LinkedIn App Scopes
In your LinkedIn app, scroll down to "OAuth 2.0 scopes" section and verify these scopes are enabled:
- `openid` (required for OpenID Connect)
- `profile` (for basic profile info)
- `email` (for email address)

### 2. Test Localhost First
Try the LinkedIn OAuth on localhost:3000 first to isolate if it's a domain-specific issue.

### 3. Check Exact Error Details
The error might be more specific than just "redirect_uri mismatch". Look for:
- Is the exact redirect URI logged in browser console?
- What's the exact error message from LinkedIn?
- Any additional error codes?

### 4. Verify OpenID Connect vs OAuth 2.0
Make sure your LinkedIn app is configured for:
- Product: "Sign In with LinkedIn using OpenID Connect" (NOT regular OAuth 2.0)
- This uses different endpoints and scopes

### 5. Test Without Custom redirectTo
Try removing the `redirectTo` option temporarily to see if Supabase's default handling works:

```javascript
// Test version - no custom redirectTo
await supabase.auth.signInWithOAuth({
  provider: 'linkedin_oidc',
  options: {
    scopes: 'openid profile email'
  }
})
```

### 6. Check Supabase LinkedIn Provider Settings
In Supabase dashboard:
- Authentication > Providers > LinkedIn
- Verify Client ID and Secret are correct
- Check if there are any additional configuration options

## Possible Solutions

### Option A: Use Supabase Default Flow
- Remove custom redirectTo
- Let Supabase handle the entire flow
- Users will see Supabase URL briefly but then redirect to your app

### Option B: Custom Domain Setup
- Set up custom domain for Supabase auth
- Update LinkedIn app to use auth.field-jobs.co
- Fully branded experience

### Option C: Manual OAuth Implementation
- Implement LinkedIn OAuth directly without Supabase OAuth helper
- Full control over redirect URLs
- More complex but fully branded

## Next Steps
1. Check OAuth 2.0 scopes in LinkedIn app
2. Test on localhost
3. Try without custom redirectTo
4. If still failing, consider Option B or C
