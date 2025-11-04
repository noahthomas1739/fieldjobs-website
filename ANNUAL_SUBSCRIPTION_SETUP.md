# Annual Subscription Setup Guide

## Overview
This guide will help you set up annual billing with 10% discount for your subscription plans.

---

## Stripe Dashboard Configuration

### Step 1: Create Annual Price IDs

You need to create **annual** price IDs in your Stripe Dashboard for each plan:

#### 1. Go to Stripe Dashboard → Products
**URL**: `https://dashboard.stripe.com/products`

#### 2. Create/Update Each Product with Annual Pricing:

### **Enterprise Plan**
- **Product Name**: Enterprise Plan
- **Pricing**:
  - **Annual ONLY**: $1,999/year
  - **Displayed as**: $167/month (billed annually at $1,999)
  - Billing interval: yearly
- Copy the **Annual Price ID** (starts with `price_...`)
- Add to environment variables as: `NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID`

### **Unlimited Plan** (NEW TIER)
- **Product Name**: Unlimited Plan
- **Description**: "Unlimited job postings, unlimited resume access, priority support, and dedicated account manager"
- **Pricing**:
  - **Annual ONLY**: $3,499/year
  - **Displayed as**: $292/month (billed annually at $3,499)
  - Billing interval: yearly
- Copy the **Annual Price ID** (starts with `price_...`)
- Add to environment variables as: `NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID`

### **Existing Plans** (Add Annual Options):

#### Starter Plan ($199/month)
- **Annual**: $2,149/year ($179/month when billed annually)
- Env var: `NEXT_PUBLIC_STRIPE_STARTER_ANNUAL_PRICE_ID`

#### Growth Plan ($299/month)  
- **Annual**: $3,229/year ($269/month when billed annually)
- Env var: `NEXT_PUBLIC_STRIPE_GROWTH_ANNUAL_PRICE_ID`

#### Professional Plan ($599/month)
- **Annual**: $6,469/year ($539/month when billed annually)
- Env var: `NEXT_PUBLIC_STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID`

---

## Environment Variables to Add

Add these to your Vercel environment variables:

```bash
# Annual Price IDs
NEXT_PUBLIC_STRIPE_STARTER_ANNUAL_PRICE_ID=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_GROWTH_ANNUAL_PRICE_ID=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_ENTERPRISE_ANNUAL_PRICE_ID=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_UNLIMITED_ANNUAL_PRICE_ID=price_xxxxxxxxxxxxx
```

---

## Pricing Reference

| Plan | Billing | Price | Displayed As |
|------|---------|-------|--------------|
| Starter | Monthly | $199/month | $199/mo |
| Growth | Monthly | $299/month | $299/mo |
| Professional | Monthly | $599/month | $599/mo |
| Enterprise | **Annual Only** | **$1,999/year** | **$167/mo** (billed annually) |
| Unlimited | **Annual Only** | **$3,499/year** | **$292/mo** (billed annually) |

---

## Features by Plan

### Starter ($199/month)
- 3 active job postings
- 0 resume credits
- Email support

### Growth ($299/month)  
- 6 active job postings
- 5 resume credits
- Email support

### Professional ($599/month)
- 15 active job postings
- 25 resume credits
- Priority support

### Enterprise ($167/month - billed annually at $1,999)
- Unlimited job postings
- Unlimited resume credits
- Priority support

### Unlimited ($292/month - billed annually at $3,499)
- Unlimited job postings
- Unlimited resume credits
- Priority support
- Dedicated account manager

---

## Next Steps

1. Create all annual price IDs in Stripe Dashboard
2. Copy each price ID
3. Add them to Vercel environment variables
4. Redeploy the application
5. The UI will automatically show the monthly/annual toggle with pricing

---

**Last Updated**: November 4, 2025

