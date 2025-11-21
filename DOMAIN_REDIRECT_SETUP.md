# Domain Redirect Setup: field-job.com → field-jobs.co

This guide explains how to redirect `field-job.com` to `field-jobs.co` so all traffic is routed to your main domain.

---

## Option 1: DNS-Level Redirect (Recommended)

This is the cleanest approach and works at the DNS/hosting level.

### If Using Vercel for Both Domains:

1. **Add field-job.com to your Vercel project:**
   - Go to your project in Vercel Dashboard
   - Navigate to **Settings** → **Domains**
   - Click **Add Domain**
   - Enter: `field-job.com`
   - Also add: `www.field-job.com`
   - Click **Add**

2. **Configure DNS at your domain registrar:**
   - Log into your domain registrar (GoDaddy, Namecheap, etc.)
   - Find DNS settings for `field-job.com`
   - Add these records:

   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   TTL: 3600
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   TTL: 3600
   ```

3. **Set up redirect in Vercel:**
   - Once domain is verified, go to **Settings** → **Domains**
   - Click on `field-job.com`
   - Enable **Redirect to field-jobs.co**
   - Select **Permanent (308)** redirect
   - Check **Redirect www subdomain**

4. **Verify:**
   - Visit `http://field-job.com` → should redirect to `https://field-jobs.co`
   - Visit `https://www.field-job.com` → should redirect to `https://field-jobs.co`

---

## Option 2: Registrar-Level Redirect

If your domain registrar supports URL forwarding (most do):

### GoDaddy:

1. Log into GoDaddy
2. Go to **My Products** → **Domains**
3. Click on `field-job.com`
4. Scroll to **Forwarding** section
5. Click **Add Forwarding**
6. Configure:
   - **Forward to:** `https://field-jobs.co`
   - **Redirect type:** Permanent (301)
   - **Forward settings:** Forward only (not with masking)
   - **Update my nameservers:** Yes
7. Save changes

### Namecheap:

1. Log into Namecheap
2. Go to **Domain List**
3. Click **Manage** next to `field-job.com`
4. Go to **Advanced DNS** tab
5. Add **URL Redirect Record**:
   - **Type:** URL Redirect
   - **Host:** @
   - **Value:** `https://field-jobs.co`
   - **Redirect Type:** Permanent (301)
6. Add another for www:
   - **Host:** www
   - **Value:** `https://field-jobs.co`
   - **Redirect Type:** Permanent (301)

### Cloudflare (if using):

1. Add `field-job.com` to Cloudflare
2. Update nameservers at registrar to Cloudflare's
3. Create **Page Rule**:
   - **URL:** `*field-job.com/*`
   - **Setting:** Forwarding URL
   - **Status Code:** 301 - Permanent Redirect
   - **Destination URL:** `https://field-jobs.co/$2`
4. Save and deploy

---

## Option 3: Next.js Middleware Redirect (If domains point to same app)

If both domains are already pointing to your Vercel deployment, add this to your Next.js app:

### Create/Update `middleware.ts`:

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  
  // Redirect field-job.com to field-jobs.co
  if (hostname.includes('field-job.com')) {
    const url = request.nextUrl.clone()
    url.host = 'field-jobs.co'
    url.protocol = 'https'
    
    return NextResponse.redirect(url, 308) // 308 = Permanent Redirect
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

### Deploy:
```bash
git add middleware.ts
git commit -m "Add domain redirect from field-job.com to field-jobs.co"
git push origin main
```

---

## Verification Checklist

After setup, test these URLs:

- [ ] `http://field-job.com` → redirects to `https://field-jobs.co`
- [ ] `https://field-job.com` → redirects to `https://field-jobs.co`
- [ ] `http://www.field-job.com` → redirects to `https://field-jobs.co`
- [ ] `https://www.field-job.com` → redirects to `https://field-jobs.co`
- [ ] `http://field-job.com/employers` → redirects to `https://field-jobs.co/employers`
- [ ] All redirects preserve the path (e.g., `/jobs` stays `/jobs`)

---

## Redirect Types Explained

- **301 (Moved Permanently)**: Traditional permanent redirect. Good for SEO.
- **308 (Permanent Redirect)**: Modern permanent redirect. Preserves HTTP method (POST stays POST).

**Recommendation**: Use **308** for better HTTP spec compliance, or **301** if you need broader compatibility.

---

## SEO Considerations

1. **Update Google Search Console:**
   - Add both `field-job.com` and `field-jobs.co` as properties
   - Set `field-jobs.co` as the preferred domain
   - Submit a change of address from `field-job.com` to `field-jobs.co`

2. **Update Marketing Materials:**
   - Update any printed materials, business cards, etc.
   - Update social media profiles
   - Update email signatures

3. **Canonical Tags:**
   - Ensure all pages have canonical tags pointing to `field-jobs.co`
   - This is already handled in your `app/layout.tsx`

---

## Troubleshooting

### Redirect not working:
- **DNS propagation**: Can take 24-48 hours. Check with `dig field-job.com` or `nslookup field-job.com`
- **Cache**: Clear browser cache or test in incognito mode
- **HTTPS**: Ensure SSL certificate is active for both domains

### Redirect loop:
- Check that `field-jobs.co` is NOT redirecting back to `field-job.com`
- Verify middleware logic doesn't create circular redirects

### SSL Certificate errors:
- If using Vercel, SSL is automatic once domain is verified
- If using Cloudflare, ensure SSL mode is set to "Full" or "Full (Strict)"

---

## Current Status

- **Primary Domain:** `field-jobs.co` ✅
- **Secondary Domain:** `field-job.com` (needs setup)
- **Recommended Approach:** Option 1 (Vercel DNS redirect) for simplicity and reliability

---

## Next Steps

1. Choose your preferred option above
2. Follow the setup instructions
3. Wait for DNS propagation (up to 48 hours)
4. Test all redirect scenarios
5. Update Google Search Console
6. Monitor analytics to ensure traffic is flowing correctly

---

**Questions?** Contact your domain registrar's support or Vercel support for domain-specific help.

