# LinkedIn Auto-Login Loop Fix

## The Problem
LinkedIn automatically signs you in with a cached profile, and clicking "Not you?" just loops back to auto-login.

## Quick Fixes for Testing

### Method 1: Incognito/Private Mode
- Open incognito/private browser window
- Test LinkedIn login there (no cached accounts)

### Method 2: Clear LinkedIn Session
1. Go to linkedin.com
2. Sign out completely
3. Clear browser cookies for linkedin.com
4. Try OAuth again

### Method 3: Force Account Selection
Add `prompt=select_account` to force LinkedIn to show account picker.

## Code Fix: Force Account Selection

Update the LinkedIn OAuth to force account selection:

```javascript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'linkedin_oidc',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    scopes: 'openid profile email',
    queryParams: {
      prompt: 'select_account'
    }
  }
})
```

## Alternative: Add prompt parameter directly

If queryParams doesn't work, we can modify the Supabase OAuth URL manually:

```javascript
// Force account selection by adding prompt parameter
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'linkedin_oidc',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    scopes: 'openid profile email prompt=select_account'
  }
})
```

## User Solutions (for end users)
1. **Sign out of LinkedIn** before using your app
2. **Use incognito mode** for testing different accounts
3. **Clear LinkedIn cookies** if stuck in loop

## For Development
- Test in incognito mode with different LinkedIn accounts
- Consider adding a "Sign in with different LinkedIn account" option
- Add logout functionality that clears LinkedIn session
