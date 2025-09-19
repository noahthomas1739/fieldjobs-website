# Supabase LinkedIn Provider Save Issues

## Common Problem
Supabase sometimes doesn't save LinkedIn provider changes properly, especially with long client secrets.

## Solutions to Try

### Method 1: Disable and Re-enable
1. **Disable LinkedIn provider** (toggle off)
2. **Click Save**
3. **Refresh the page**
4. **Enable LinkedIn provider** (toggle on)
5. **Enter Client ID**: `861y3u5rdzoq2f`
6. **Enter Client Secret**: `WPL_AP1Ju8OonAf1B06ullD/sHvYQ==`
7. **Click Save**

### Method 2: Clear Browser Cache
1. **Clear browser cache and cookies**
2. **Log out of Supabase**
3. **Log back in**
4. **Try updating LinkedIn settings again**

### Method 3: Different Browser
1. **Try in an incognito window**
2. **Or use a different browser entirely**
3. **Configure LinkedIn provider there**

### Method 4: Check for Errors
1. **Open browser developer tools** (F12)
2. **Go to Console tab**
3. **Try saving LinkedIn settings**
4. **Look for any error messages**

### Method 5: Manual API Call
If all else fails, you can configure it via Supabase API:

```bash
curl -X PATCH 'https://api.supabase.com/v1/projects/wqoiedzibfptxfsatzgy/config/auth' \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "external": {
      "linkedin_oidc": {
        "enabled": true,
        "client_id": "861y3u5rdzoq2f",
        "secret": "WPL_AP1Ju8OonAf1B06ullD/sHvYQ=="
      }
    }
  }'
```

## Quick Test
After saving, try this quick test:
1. **Go to your site**
2. **Try LinkedIn login**
3. **Check if you still get redirect_uri error**

## Signs It Worked
- No more "redirect_uri mismatch" error
- LinkedIn login redirects properly
- User gets authenticated successfully

## If Still Not Working
- Check Supabase status page for outages
- Contact Supabase support
- Try generating a new LinkedIn client secret
