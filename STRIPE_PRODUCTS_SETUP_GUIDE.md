# Stripe Products Setup Guide - Complete Product Catalog

## Overview
This guide will help you create/update ALL Stripe products for FieldJobs:

### Core Products (3):
1. **Single Job Post**: $199 one-time
2. **Enterprise Plan**: $1,999/year ($167/month)
3. **Unlimited Plan**: $3,499/year ($292/month)

### Add-On Products (5):
4. **Resume Credits 10-Pack**: $39 one-time
5. **Resume Credits 25-Pack**: $79 one-time
6. **Resume Credits 50-Pack**: $149 one-time
7. **Featured Job Listing**: $29 one-time (30 days)
8. **Urgent Job Badge**: $19 one-time (30 days)

**Total: 8 Products, 8 Price IDs**

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
```
Name: Single Job Posting
Description: Post one job for 60 days with full applicant access and email notifications
Statement descriptor: FIELDJOBS JOB POST
```

### Pricing:
- **Pricing model**: Standard pricing
- **Price**: `$199.00`
- **Billing period**: One time
- **Currency**: USD

### Copy-Paste Description:
```
Post one job for 60 days with full applicant access and email notifications
```

### After Creating:
- ✅ Copy the **Price ID** (starts with `price_`)
- ✅ Save it as: `NEXT_PUBLIC_STRIPE_SINGLE_JOB_PRICE_ID`

**Note**: This is for reference only. The code uses dynamic pricing for single jobs, so this env var is optional.

---

## Step 3: Create Enterprise Plan Product (Annual)

### Product Details:
```
Name: Enterprise Plan (Annual)
Description: 20 job postings, 25 resume search credits, email support, and advanced analytics. Save $250 with annual billing!
Statement descriptor: FIELDJOBS ENTERPRISE
```

### Pricing:
- **Pricing model**: Standard pricing
- **Price**: `$2,246.00` (10% discount from monthly equivalent)
- **Billing period**: **Yearly** (IMPORTANT!)
- **Currency**: USD
- **Usage type**: Licensed

### Copy-Paste Description:
```
20 job postings, 25 resume search credits, email support, and advanced analytics. Save $250 with annual billing!
```

### Pricing Calculation:
- Monthly plan: $208/month × 12 = $2,496/year
- Annual price with 10% discount: $2,246 ($187/month when billed annually)
- **You save: $250 per year!**

### Advanced Settings:
- **Trial period**: None (or 7 days if you want)
- **Default quantity**: 1

### After Creating:
- ✅ Copy the **Price ID** (starts with `price_`)
- ✅ Save it as: `NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID`

### Optional: Create Monthly Version
If you want to offer monthly billing:
```
Name: Enterprise Plan (Monthly)
Price: $208.00
Billing period: Monthly
Description: Same as annual, billed monthly (no discount)
```
- Save as: `NEXT_PUBLIC_STRIPE_ENTERPRISE_MONTHLY_PRICE_ID`

---

## Step 4: Create Unlimited Plan Product (Annual)

### Product Details:
```
Name: Unlimited Plan (Annual)
Description: Unlimited job postings, 100 resume search credits, priority support, advanced analytics, custom integrations, and priority feature requests. Save $394 with annual billing!
Statement descriptor: FIELDJOBS UNLIMITED
```

### Pricing:
- **Pricing model**: Standard pricing
- **Price**: `$3,553.00` (10% discount from monthly equivalent)
- **Billing period**: **Yearly** (IMPORTANT!)
- **Currency**: USD
- **Usage type**: Licensed

### Copy-Paste Description:
```
Unlimited job postings, 100 resume search credits, priority support, advanced analytics, custom integrations, and priority feature requests. Save $394 with annual billing!
```

### Pricing Calculation:
- Monthly plan: $329/month × 12 = $3,948/year
- Annual price with 10% discount: $3,553 ($296/month when billed annually)
- **You save: $395 per year!**

### Advanced Settings:
- **Trial period**: None (or 7 days if you want)
- **Default quantity**: 1

### After Creating:
- ✅ Copy the **Price ID** (starts with `price_`)
- ✅ Save it as: `NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID`

### Optional: Create Monthly Version
If you want to offer monthly billing:
```
Name: Unlimited Plan (Monthly)
Price: $329.00
Billing period: Monthly
Description: Same as annual, billed monthly (no discount)
```
- Save as: `NEXT_PUBLIC_STRIPE_UNLIMITED_MONTHLY_PRICE_ID`

---

## Step 5: Create Resume Search Credit Packs (Add-Ons)

> **Note:** Your code currently uses dynamic pricing for add-ons. To enable Stripe's built-in checkout features (like suggested add-ons, better analytics, and upsells), create these products in Stripe and update your code to use Price IDs instead of `price_data`.

### Product 1: 10 Credits Pack

**Product Details:**
```
Name: Resume Search Credits - 10 Pack
Description: 10 resume search credits for unlocking candidate profiles in database
Statement descriptor: FIELDJOBS RESUME 10
```

**Pricing:**
- **Price**: `$39.00`
- **Billing period**: One time
- **Currency**: USD

**Copy-Paste Description:**
```
10 resume search credits for unlocking candidate profiles in database
```

**After Creating:**
- ✅ Copy the **Price ID** (starts with `price_`)
- ✅ Save it as: `NEXT_PUBLIC_STRIPE_RESUME_10_PRICE_ID`

---

### Product 2: 25 Credits Pack

**Product Details:**
```
Name: Resume Search Credits - 25 Pack
Description: 25 resume search credits for unlocking candidate profiles in database (Best Value)
Statement descriptor: FIELDJOBS RESUME 25
```

**Pricing:**
- **Price**: `$79.00`
- **Billing period**: One time
- **Currency**: USD

**Copy-Paste Description:**
```
25 resume search credits for unlocking candidate profiles in database (Best Value)
```

**After Creating:**
- ✅ Copy the **Price ID** (starts with `price_`)
- ✅ Save it as: `NEXT_PUBLIC_STRIPE_RESUME_25_PRICE_ID`

---

### Product 3: 50 Credits Pack

**Product Details:**
```
Name: Resume Credits - 50 Pack
Description: 50 resume view credits for unlocking candidate resumes (Maximum Savings)
Statement descriptor: FIELDJOBS RESUME 50
```

**Pricing:**
- **Price**: `$129.00`
- **Billing period**: One time
- **Currency**: USD

**Copy-Paste Description:**
```
50 resume search credits for unlocking candidate profiles in database (Maximum Savings)
```

**After Creating:**
- ✅ Copy the **Price ID** (starts with `price_`)
- ✅ Save it as: `NEXT_PUBLIC_STRIPE_RESUME_50_PRICE_ID`

---

## Step 6: Create Job Feature Add-Ons

### Product 1: Featured Job Listing

**Product Details:**
```
Name: Featured Job Listing
Description: Top of search results with bright highlight badge for 30 days
Statement descriptor: FIELDJOBS FEATURED
```

**Pricing:**
- **Pricing model**: Standard pricing
- **Price**: `$29.00`
- **Billing period**: One time
- **Currency**: USD

**Copy-Paste Description:**
```
Top of search results with bright highlight badge for 30 days
```

**After Creating:**
- ✅ Copy the **Price ID** (starts with `price_`)
- ✅ Save it as: `NEXT_PUBLIC_STRIPE_FEATURED_PRICE_ID`

---

### Product 2: Urgent Job Badge

**Product Details:**
```
Name: Urgent Job Badge
Description: Bright "URGENT" badge for immediate attention for 30 days
Statement descriptor: FIELDJOBS URGENT
```

**Pricing:**
- **Pricing model**: Standard pricing
- **Price**: `$19.00`
- **Billing period**: One time
- **Currency**: USD

**Copy-Paste Description:**
```
Bright "URGENT" badge for immediate attention for 30 days
```

**After Creating:**
- ✅ Copy the **Price ID** (starts with `price_`)
- ✅ Save it as: `NEXT_PUBLIC_STRIPE_URGENT_PRICE_ID`

---

## Step 7: Update Vercel Environment Variables

### Required Variables:

```bash
# Core Products
NEXT_PUBLIC_STRIPE_SINGLE_JOB_PRICE_ID=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID=price_xxxxxxxxxxxxx

# Resume Credit Add-Ons
NEXT_PUBLIC_STRIPE_RESUME_10_PRICE_ID=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_RESUME_25_PRICE_ID=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_RESUME_50_PRICE_ID=price_xxxxxxxxxxxxx

# Job Feature Add-Ons
NEXT_PUBLIC_STRIPE_FEATURED_PRICE_ID=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_URGENT_PRICE_ID=price_xxxxxxxxxxxxx

# Existing (Keep These)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
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

### Checkout Add-ons (Optional but Recommended):
**URL**: https://dashboard.stripe.com/settings/checkout

To show suggested add-ons at checkout (like "Add resume credits?"):
1. Enable **"Product recommendations"**
2. Configure which products to suggest together
3. Example: When buying a subscription, suggest resume credit packs
4. **Note:** This only works with pre-created products (Price IDs), not dynamic pricing

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

| Product | Annual Price | Monthly Equivalent | Display As | Savings | Features |
|---------|--------------|-------------------|------------|---------|----------|
| **Single Job** | $199 | N/A | $199 | N/A | 1 job, 60 days, email support, analytics |
| **Enterprise** | $2,246 | $208/mo × 12 = $2,496 | $187/mo | **Save $250** | 20 jobs, 25 credits, email support, analytics |
| **Unlimited** | $3,553 | $329/mo × 12 = $3,948 | $296/mo | **Save $395** | Unlimited jobs, 100 credits, priority support, analytics, custom integrations |
| Resume 10-pack | $39 | N/A | $39 | N/A | 10 resume search credits |
| Resume 25-pack | $79 | N/A | $79 | N/A | 25 resume search credits |
| Resume 50-pack | $149 | N/A | $149 | N/A | 50 resume search credits |
| Featured Listing | $29 | N/A | $29 | N/A | 30 days featured |
| Urgent Badge | $19 | N/A | $19 | N/A | 30 days urgent |

**Note**: Annual plans include 10% discount compared to monthly billing. Customers who choose monthly billing will pay the full monthly rate ($208 or $329) without the discount.

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

## Switching from Dynamic Pricing to Price IDs (For Add-ons)

If you want to use Stripe's checkout add-on suggestions, you'll need to update your code to use Price IDs instead of dynamic pricing.

### Files to Update:

#### 1. `app/api/purchase-credits/route.js`

**Current (Dynamic Pricing):**
```javascript
const lineItem = { 
  price_data: {
    currency: 'usd',
    product_data: {
      name: `Resume Credits - ${creditAmounts[addonType]} Pack`,
      description: `${creditAmounts[addonType]} credits for candidate contact`
    },
    unit_amount: prices[addonType]
  },
  quantity: 1 
}
```

**Updated (Price IDs):**
```javascript
// Map addon types to Price IDs
const priceIdMap = {
  'resume_credits_10': process.env.NEXT_PUBLIC_STRIPE_RESUME_10_PRICE_ID,
  'resume_credits_25': process.env.NEXT_PUBLIC_STRIPE_RESUME_25_PRICE_ID,
  'resume_credits_50': process.env.NEXT_PUBLIC_STRIPE_RESUME_50_PRICE_ID
}

const lineItem = { 
  price: priceIdMap[addonType],
  quantity: 1 
}
```

#### 2. `app/api/purchase-job-feature/route.js`

**Current (Dynamic Pricing):**
```javascript
const lineItem = {
  price_data: {
    currency: 'usd',
    product_data: {
      name: featureConfig.name,
      description: featureConfig.description
    },
    unit_amount: featureConfig.amount
  },
  quantity: 1
}
```

**Updated (Price IDs):**
```javascript
const priceIdMap = {
  'featured': process.env.NEXT_PUBLIC_STRIPE_FEATURED_PRICE_ID,
  'urgent': process.env.NEXT_PUBLIC_STRIPE_URGENT_PRICE_ID
}

const lineItem = {
  price: priceIdMap[featureType],
  quantity: 1
}
```

### Benefits of Using Price IDs:
- ✅ Enable Stripe's checkout add-on suggestions
- ✅ Better analytics and reporting in Stripe
- ✅ Easier to update pricing from Stripe Dashboard
- ✅ Consistent product catalog
- ✅ Support for promotional pricing and coupons

### Drawbacks:
- ❌ Need to update environment variables when changing prices
- ❌ More setup work initially

---

## Support

If you encounter issues:
1. Check **Stripe Dashboard** → **Events** for errors
2. Check **Vercel Logs** for API errors
3. Verify environment variables are set correctly
4. Test in Test Mode before going live

---

**Last Updated**: November 4, 2025

