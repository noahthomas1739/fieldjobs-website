# Stripe Products Setup Guide - 3-Tier Structure

## Overview
This guide will help you create/update Stripe products for the new simplified pricing structure:
- **Single Job Post**: $199 one-time
- **Enterprise**: $1,999/year ($167/month)
- **Unlimited**: $3,499/year ($292/month)

---

## Step 1: Delete Old Products (Optional but Recommended)

### In Stripe Dashboard:
1. Go to **Products** → https://dashboard.stripe.com/products
2. **Archive** these old products (if they exist):
   - Starter Plan
   - Growth Plan
   - Professional Plan
   - Any old Enterprise pricing

**Note**: You cannot delete products with active subscriptions. Archive them instead.

---

## Step 2: Create Single Job Post Product

### Product Details:
- **Name**: `Single Job Posting`
- **Description**: `Post one job for 60 days with full applicant access`
- **Statement descriptor**: `FIELDJOBS JOB POST`

### Pricing:
- **Pricing model**: Standard pricing
- **Price**: `$199.00`
- **Billing period**: One time
- **Currency**: USD

### After Creating:
- ✅ Copy the **Price ID** (starts with `price_`)
- ✅ Save it as: `NEXT_PUBLIC_STRIPE_SINGLE_JOB_PRICE_ID`

**Note**: This is for reference only. The code uses dynamic pricing for single jobs, so this env var is optional.

---

## Step 3: Create Enterprise Plan Product

### Product Details:
- **Name**: `Enterprise Plan`
- **Description**: `Unlimited job postings, unlimited resume credits, priority support, and advanced analytics`
- **Statement descriptor**: `FIELDJOBS ENTERPRISE`

### Pricing:
- **Pricing model**: Standard pricing
- **Price**: `$1,999.00`
- **Billing period**: **Yearly** (IMPORTANT!)
- **Currency**: USD
- **Usage type**: Licensed

### Advanced Settings:
- **Trial period**: None (or 7 days if you want)
- **Default quantity**: 1

### After Creating:
- ✅ Copy the **Price ID** (starts with `price_`)
- ✅ Save it as: `NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID`

---

## Step 4: Create Unlimited Plan Product

### Product Details:
- **Name**: `Unlimited Plan`
- **Description**: `Everything in Enterprise plus dedicated account manager, custom integrations, and priority feature requests`
- **Statement descriptor**: `FIELDJOBS UNLIMITED`

### Pricing:
- **Pricing model**: Standard pricing
- **Price**: `$3,499.00`
- **Billing period**: **Yearly** (IMPORTANT!)
- **Currency**: USD
- **Usage type**: Licensed

### Advanced Settings:
- **Trial period**: None (or 7 days if you want)
- **Default quantity**: 1

### After Creating:
- ✅ Copy the **Price ID** (starts with `price_`)
- ✅ Save it as: `NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID`

---

## Step 5: Create Resume Credit Packs (Add-Ons)

### 10 Credits Pack:
- **Name**: `Resume Credits - 10 Pack`
- **Price**: `$39.00`
- **Billing**: One time
- Save as: `NEXT_PUBLIC_STRIPE_RESUME_10_PRICE_ID`

### 25 Credits Pack:
- **Name**: `Resume Credits - 25 Pack`
- **Price**: `$79.00`
- **Billing**: One time
- Save as: `NEXT_PUBLIC_STRIPE_RESUME_25_PRICE_ID`

### 50 Credits Pack:
- **Name**: `Resume Credits - 50 Pack`
- **Price**: `$149.00`
- **Billing**: One time
- Save as: `NEXT_PUBLIC_STRIPE_RESUME_50_PRICE_ID`

---

## Step 6: Create Job Feature Add-Ons

### Featured Listing:
- **Name**: `Featured Job Listing`
- **Description**: `Top of search results with bright highlight badge for 30 days`
- **Price**: `$29.00`
- **Billing**: One time
- Save as: `NEXT_PUBLIC_STRIPE_FEATURED_PRICE_ID`

### Urgent Badge:
- **Name**: `Urgent Job Badge`
- **Description**: `Bright "URGENT" badge for immediate attention for 30 days`
- **Price**: `$19.00`
- **Billing**: One time
- Save as: `NEXT_PUBLIC_STRIPE_URGENT_PRICE_ID`

---

## Step 7: Update Vercel Environment Variables

### Required Variables:

```bash
# Subscription Plans (Annual Billing)
NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID=price_xxxxxxxxxxxxx

# Add-Ons (Optional - only if using)
NEXT_PUBLIC_STRIPE_RESUME_10_PRICE_ID=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_RESUME_25_PRICE_ID=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_RESUME_50_PRICE_ID=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_FEATURED_PRICE_ID=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_URGENT_PRICE_ID=price_xxxxxxxxxxxxx

# Existing (Keep These)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
```

### How to Update in Vercel:
1. Go to **Vercel Dashboard** → Your Project
2. Go to **Settings** → **Environment Variables**
3. Add each variable above
4. Select **Production**, **Preview**, and **Development**
5. Click **Save**
6. **Redeploy** your application

---

## Step 8: Configure Stripe Billing Settings

### Invoice Settings:
**URL**: https://dashboard.stripe.com/settings/billing/invoice

1. ✅ **Invoice PDFs**: Enable "Include PDF links and attachments"
2. ✅ **Default memo**: "Thank you for choosing FieldJobs!"
3. ✅ **Payment page**: Enable "Include a link to a payment page"

### Subscription Settings:
**URL**: https://dashboard.stripe.com/settings/billing/automatic

1. ✅ **Customer emails**: 
   - Send finalized invoices ✅
   - Send emails about upcoming renewals ✅
   - Send emails when card payments fail ✅

2. ✅ **Proration**: "Create prorations" for upgrades

### Branding:
**URL**: https://dashboard.stripe.com/settings/branding

1. Upload **FieldJobs logo**
2. Set **brand color**: `#9333EA` (purple) or `#FF6B35` (orange)
3. Add **business info**: FieldJobs LLC, support@field-jobs.co

---

## Step 9: Test Mode vs Live Mode

### Test Mode (Development):
- Create test products with same structure
- Use test price IDs in development environment
- Test card: `4242 4242 4242 4242`

### Live Mode (Production):
- Create live products (follow steps above)
- Use live price IDs in production environment
- Real credit cards will be charged

---

## Step 10: Verify Setup

### Checklist:
- [ ] All products created in Stripe
- [ ] All price IDs copied
- [ ] Environment variables added to Vercel
- [ ] Application redeployed
- [ ] Test purchase in Test Mode works
- [ ] Subscription shows correctly in dashboard
- [ ] Billing history displays invoices
- [ ] Emails are being sent (check Stripe Events)

---

## Quick Reference: Pricing Summary

| Product | Price | Billing | Display As | Features |
|---------|-------|---------|------------|----------|
| **Single Job** | $199 | One-time | $199 | 1 job, 60 days |
| **Enterprise** | $1,999 | Yearly | $167/mo | Unlimited jobs, unlimited credits, priority support |
| **Unlimited** | $3,499 | Yearly | $292/mo | Everything + account manager |
| Resume 10-pack | $39 | One-time | $39 | 10 resume credits |
| Resume 25-pack | $79 | One-time | $79 | 25 resume credits |
| Resume 50-pack | $149 | One-time | $149 | 50 resume credits |
| Featured Listing | $29 | One-time | $29 | 30 days featured |
| Urgent Badge | $19 | One-time | $19 | 30 days urgent |

---

## Troubleshooting

### "No such price" error:
- Verify price ID is correct
- Check you're using the right mode (test vs live)
- Ensure price is active in Stripe

### Subscription not showing:
- Check webhook is configured
- Verify `stripe_customer_id` is being saved
- Check Stripe Events for errors

### Wrong amount charged:
- Verify price ID matches the product
- Check currency is USD
- Ensure billing period is correct (yearly for Enterprise/Unlimited)

---

## Support

If you encounter issues:
1. Check **Stripe Dashboard** → **Events** for errors
2. Check **Vercel Logs** for API errors
3. Verify environment variables are set correctly
4. Test in Test Mode before going live

---

**Last Updated**: November 4, 2025

