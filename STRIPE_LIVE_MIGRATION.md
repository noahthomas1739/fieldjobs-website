# Stripe Sandbox to Live Migration Guide

## 🔧 **Step-by-Step Migration Process**

### **1. Create Live Products in Stripe Dashboard**

#### **Go to Stripe Dashboard (Live Mode):**
1. Switch to **Live Mode** in Stripe Dashboard
2. Go to **Products** → **Create Product**

#### **Create Each Subscription Plan:**
```
Starter Plan:
- Name: "Starter Plan"
- Price: $0/month
- Billing: Monthly
- Copy the Price ID (starts with price_)

Growth Plan:
- Name: "Growth Plan" 
- Price: $29/month
- Billing: Monthly
- Copy the Price ID

Professional Plan:
- Name: "Professional Plan"
- Price: $99/month  
- Billing: Monthly
- Copy the Price ID

Enterprise Plan:
- Name: "Enterprise Plan"
- Price: $299/month
- Billing: Monthly
- Copy the Price ID
```

### **2. Update Vercel Environment Variables**

#### **Replace Test Keys with Live Keys:**
```bash
# Replace these in Vercel → Environment Variables → Production

STRIPE_SECRET_KEY=sk_live_... (your live secret key)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (your live publishable key)

# Replace with your new live price IDs
STRIPE_STARTER_PRICE_ID=price_... (live starter price ID)
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_... (same as above)

STRIPE_GROWTH_PLAN_PRICE_ID=price_... (live growth price ID)
NEXT_PUBLIC_STRIPE_GROWTH_PLAN_PRICE_ID=price_... (same as above)

STRIPE_PROFESSIONAL_PRICE_ID=price_... (live professional price ID)
NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID=price_... (same as above)

STRIPE_ENTERPRISE_PRICE_ID=price_... (live enterprise price ID)
NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID=price_... (same as above)
```

### **3. Configure Live Webhook**

#### **Create Live Webhook:**
1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. **Endpoint URL**: `https://field-jobs.co/api/stripe/webhook`
4. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. **Copy the webhook signing secret** (starts with `whsec_`)

#### **Update Webhook Secret:**
```bash
# In Vercel → Environment Variables → Production
STRIPE_WEBHOOK_SECRET=whsec_... (your live webhook secret)
```

### **4. Test Live Payments**

#### **Small Test Purchase:**
1. Deploy with live keys
2. Create a test account
3. Purchase the cheapest plan ($29 Growth plan)
4. Use a real credit card (small amount)
5. Verify:
   - Payment processes successfully
   - Subscription created in Stripe
   - User subscription updated in Supabase
   - Email confirmations sent

### **5. Monitor After Launch**

#### **Stripe Dashboard Monitoring:**
- **Payments**: Monitor successful/failed payments
- **Customers**: Track new customer signups
- **Subscriptions**: Monitor active subscriptions
- **Webhooks**: Check webhook delivery success rates

#### **Common Issues to Watch:**
- **Webhook failures**: Check endpoint URL and events
- **Payment failures**: Monitor declined cards
- **Subscription sync**: Ensure Supabase stays in sync

## ⚠️ **Important Notes**

### **Before Going Live:**
- [ ] **Test with small amounts** first
- [ ] **Verify all price IDs** are correct
- [ ] **Check webhook endpoint** is accessible
- [ ] **Monitor first few transactions** closely

### **Security Considerations:**
- **Never commit live keys** to code
- **Use environment variables** only
- **Monitor for suspicious activity**
- **Set up Stripe alerts** for failed payments

## 🎯 **Launch Checklist**

- [ ] Live products created in Stripe
- [ ] Live API keys in Vercel environment variables
- [ ] Live webhook configured and tested
- [ ] Small test purchase completed successfully
- [ ] Email confirmations working
- [ ] Subscription sync working
- [ ] Monitoring set up

## 🚨 **Rollback Plan**

If issues occur:
1. **Revert environment variables** to test keys
2. **Redeploy** with test configuration
3. **Debug issues** in test environment
4. **Fix and retry** live migration
