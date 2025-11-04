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
  - Monthly: $1,999/month (this is NEW - currently it's showing monthly pricing)
  - **Annual**: $21,589/year (10% discount = $1,999 × 12 × 0.9)
  - **Annual displayed as**: $1,799/month (billed annually)
- Copy the **Annual Price ID** (starts with `price_...`)
- Add to environment variables as: `NEXT_PUBLIC_STRIPE_ENTERPRISE_ANNUAL_PRICE_ID`

### **Unlimited Plan** (NEW TIER)
- **Product Name**: Unlimited Plan
- **Description**: "Unlimited job postings, unlimited resume access, priority support, and dedicated account manager"
- **Pricing**:
  - Monthly: $3,499/month  
  - **Annual**: $37,669/year (10% discount = $3,499 × 12 × 0.9)
  - **Annual displayed as**: $3,139/month (billed annually)
- Copy the **Annual Price ID** (starts with `price_...`)
- Add to environment variables as: `NEXT_PUBLIC_STRIPE_UNLIMITED_ANNUAL_PRICE_ID`

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

## Pricing Calculation Reference

| Plan | Monthly | Annual (Full Price) | 10% Discount | Final Annual Price | Displayed As (Monthly) |
|------|---------|---------------------|--------------|-------------------|----------------------|
| Starter | $199 | $2,388 | $239 | **$2,149** | $179/mo |
| Growth | $299 | $3,588 | $359 | **$3,229** | $269/mo |
| Professional | $599 | $7,188 | $719 | **$6,469** | $539/mo |
| Enterprise | $1,999 | $23,988 | $2,399 | **$21,589** | $1,799/mo |
| Unlimited | $3,499 | $41,988 | $4,199 | **$37,669** | $3,139/mo |

---

## Features by Plan

### Starter ($199/month or $179/month annual)
- 3 active job postings
- 0 resume credits
- Email support

### Growth ($299/month or $269/month annual)  
- 6 active job postings
- 5 resume credits
- Email support

### Professional ($599/month or $539/month annual)
- 15 active job postings
- 25 resume credits
- Priority support

### Enterprise ($1,999/month or $1,799/month annual)
- Unlimited job postings
- Unlimited resume credits
- Priority support

### Unlimited ($3,499/month or $3,139/month annual)
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

