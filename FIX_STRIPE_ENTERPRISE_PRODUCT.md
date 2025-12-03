# Fix Stripe Enterprise Product

## Problem
Your current Enterprise product in Stripe shows:
- ❌ Price: $1,999.00
- ❌ Name: "Enterprise Plan (Monthly)"
- ❌ Should be: $2,246.00 annual

## Solution: Create New Price for Existing Product

### Step 1: Go to Your Enterprise Product
1. Open Stripe Dashboard: https://dashboard.stripe.com/test/products
2. Click on "Enterprise Plan (Annual)" or "Enterprise Plan (Monthly)"

### Step 2: Add New Annual Price
1. Click **"Add another price"** button
2. Fill in:
   - **Price**: `$2,246.00`
   - **Billing period**: **Yearly** (IMPORTANT!)
   - **Currency**: USD
   - **Price description**: `$187/month billed annually - Save 10%`

3. Click **"Add price"**

### Step 3: Copy the New Price ID
1. After creating, you'll see the new price in the list
2. Click on it to see details
3. Copy the **Price ID** (starts with `price_`)
4. It will look like: `price_1AbCdEfGhIjKlMnO`

### Step 4: Update Vercel Environment Variable
1. Go to: https://vercel.com/fieldjobs-projects/fieldjobs-website/settings/environment-variables
2. Find: `NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID`
3. Click **Edit**
4. Paste the NEW Price ID
5. Click **Save**
6. **Redeploy** the application

### Step 5: Archive Old Price (Optional)
1. Go back to the Enterprise product in Stripe
2. Find the old $1,999 price
3. Click the "..." menu → **Archive**
4. This prevents it from being used accidentally

---

## For Unlimited Plan

If Unlimited also shows wrong price, repeat the same steps:
1. Add new price: **$3,553.00** yearly
2. Copy new Price ID
3. Update `NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID` in Vercel
4. Redeploy

---

## Quick Check
After updating, test by:
1. Going to `/employers` page
2. Click "Choose Plan" on Enterprise
3. Verify checkout shows **$2,246.00** and **"Per year"**

