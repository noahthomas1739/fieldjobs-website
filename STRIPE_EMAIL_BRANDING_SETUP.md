# Stripe Email Branding Setup Guide

## Overview
This guide will help you configure Stripe to automatically send branded invoice/receipt emails to customers for both subscriptions and one-time payments (single job postings).

---

## Why You're Not Receiving Test Emails

**Important**: In Stripe Test Mode, emails are **NOT sent to real email addresses** by default. Stripe only sends test emails to:
- Email addresses you've verified in your Stripe account
- Your account owner email

### To Receive Test Emails:
1. Go to **Settings → Account details**
2. Add your test email address to "Verified email addresses"
3. OR switch to **Live Mode** to test real email delivery

---

## Step 1: Brand Your Invoices

### Settings → Appearance (Branding)
**URL**: `https://dashboard.stripe.com/settings/branding`

1. **Upload Logo**
   - Click "Upload logo"
   - Use your FieldJobs logo (SVG or PNG)
   - Recommended size: 200x50px or similar aspect ratio

2. **Brand Color**
   - Set primary color: `#FF6B35` (your orange) or `#9333EA` (your purple)
   - This appears in buttons and headers

3. **Icon**
   - Upload favicon (optional but recommended)

4. **Click "Save"**

---

## Step 2: Set Business Information

### Settings → Account details → Public details
**URL**: `https://dashboard.stripe.com/settings/public`

1. **Business name**: `FieldJobs LLC`
2. **Support email**: `support@field-jobs.co`
3. **Support phone**: Your business phone number
4. **Business address**: Your registered business address

5. **Click "Save"**

---

## Step 3: Configure Invoice Settings

### Settings → Billing → Invoices → General
**URL**: `https://dashboard.stripe.com/settings/billing/invoice`

1. **Invoice PDFs** (toggle ON)
   - ✅ "Include PDF links and attachments on invoice emails and payment page"

2. **Default memo** (optional)
   - Example: "Thank you for choosing FieldJobs! Questions? Contact support@field-jobs.co"

3. **Default footer**
   - Example:
   ```
   FieldJobs LLC
   [Your Business Address]
   support@field-jobs.co | field-jobs.co
   
   Questions about your invoice? Contact us anytime.
   ```

4. **Payment page** (should be enabled by default)
   - ✅ "Include a link to a payment page in the invoice email"

5. **Click "Save"**

---

## Step 4: Enable Customer Email Notifications

### Settings → Billing → Subscriptions and emails
**URL**: `https://dashboard.stripe.com/settings/billing/automatic`

### Customer emails section:
1. ✅ **"Send a reminder email 7 days before a free trial ends"** (if using trials)
2. ✅ **"Send emails about upcoming renewals"**
3. ✅ **"Send emails about expiring cards"**
4. ✅ **"Send emails when card payments fail"**
5. ✅ **"Send emails when bank debit payments fail"**

### Manage invoices sent to customers section:
1. ✅ **"Send finalized invoices and credit notes to customers"** (CRITICAL - must be ON)
2. ✅ **"Send reminders if a recurring invoice hasn't been paid"**

6. **Click "Save"**

---

## Step 5: Configure One-Time Payment Emails

### Settings → Billing → Invoices → General
**URL**: `https://dashboard.stripe.com/settings/billing/invoice`

Scroll to **"Customer emails"** section:
1. ✅ **"Send reminders if a one-off invoice hasn't been paid"** (should be enabled)

**Click "Save"**

---

## Step 6: Test Email Delivery

### In Test Mode:
1. Go to **Settings → Account details**
2. Add your email to "Verified email addresses"
3. Make a test purchase (subscription or single job)
4. Check your email inbox

### In Live Mode:
- Emails will be sent to all customers automatically
- No verification needed

---

## What Emails Are Sent Automatically?

### Subscriptions:
- ✅ **Initial purchase confirmation** (with invoice)
- ✅ **Monthly renewal invoices** (at start of billing period)
- ✅ **Payment failure notifications**
- ✅ **Upcoming renewal reminders** (7 days before)
- ✅ **Card expiration warnings**

### One-Time Payments (Single Jobs):
- ✅ **Receipt/invoice immediately after payment**
- ✅ **PDF invoice attached** (if enabled)

### All emails include:
- Your FieldJobs branding
- Your business information
- Payment details
- PDF invoice link
- Support contact info

---

## Troubleshooting

### "I'm not receiving emails in Test Mode"
- Verify your email address in **Settings → Account details**
- Check spam/junk folders
- Test in Live Mode for real email delivery

### "Emails look generic/unbranded"
- Complete Steps 1-2 (Branding + Business Info)
- Wait 5-10 minutes for changes to propagate
- Send a new test invoice

### "One-time payment emails not sending"
- Ensure "Send finalized invoices and credit notes to customers" is ON
- Check that "Include PDF links" is enabled
- Verify customer email is valid in Stripe

### "Subscription emails not sending"
- Check **Settings → Billing → Subscriptions and emails**
- Ensure all customer email toggles are ON
- Verify subscription status is "active" in Stripe

---

## Quick Checklist

- [ ] Upload logo in Branding settings
- [ ] Set brand color
- [ ] Add business name, email, phone, address
- [ ] Enable invoice PDFs
- [ ] Add custom footer to invoices
- [ ] Enable all customer email notifications
- [ ] Enable "Send finalized invoices and credit notes"
- [ ] Verify test email address (for Test Mode)
- [ ] Test a subscription purchase
- [ ] Test a single job purchase
- [ ] Check inbox for branded emails

---

## Support

If emails still aren't sending after following this guide:
1. Check Stripe Dashboard → Developers → Events for email events
2. Look for `invoice.sent` or `invoice.payment_succeeded` events
3. Contact Stripe support if issues persist

---

**Last Updated**: November 1, 2025

