# 📧 FieldJobs Email System Setup Guide

## Overview

The email system uses **SendGrid** for reliable email delivery with professionally designed React Email templates.

## ✅ What's Already Implemented

### Email Templates Created:
1. **ApplicationConfirmation** - Sent to job seekers when they apply
2. **NewApplicationAlert** - Sent to employers when they receive an application
3. **ApplicationStatusUpdate** - Sent to job seekers when application status changes

### API Routes Created:
- `/api/send-application-emails` - Sends confirmation + alert emails
- `/api/send-status-update` - Sends status update emails

### Dependencies Installed:
- `@react-email/components` - React Email component library
- `@react-email/render` - Renders React components to HTML

## 🚀 Quick Setup

### Step 1: Configure SendGrid

1. **Get SendGrid API Key** (if you don't have one):
   - Go to https://sendgrid.com
   - Sign up or log in
   - Navigate to Settings → API Keys
   - Create API Key with "Mail Send" permissions
   - Copy the key

2. **Add to Vercel Environment Variables**:
   ```bash
   SENDGRID_API_KEY=SG.your_actual_api_key_here
   SENDGRID_FROM_EMAIL=noreply@field-jobs.co
   ```

3. **Verify Sender Email in SendGrid**:
   - Settings → Sender Authentication
   - Verify `noreply@field-jobs.co`
   - Add DNS records to your domain (Cloudflare)

### Step 2: Integrate Email Sending

The email system is ready to use! You just need to call the API routes when actions happen.

#### A. Send Emails When Application is Submitted

**Location:** In your application submission form (where users apply for jobs)

**What to do:** Add this code after successfully creating an application:

```typescript
// After successfully creating application
try {
  await fetch('/api/send-application-emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicationId: newApplication.id })
  })
} catch (emailError) {
  console.error('Email send failed:', emailError)
  // Don't fail the application if email fails
}
```

**Where to find this:** Look for your job application form submission code, usually in a file like:
- `app/api/job-applications/route.js` (if using API routes)
- `app/apply/[jobId]/page.tsx` (if using a separate apply page)
- Any component that handles job applications

#### B. Send Emails When Status Changes

**Location:** In your employer dashboard where you update application status

**What to do:** Add this code to your status update function:

```typescript
const updateApplicationStatus = async (applicationId: number, newStatus: string) => {
  // ... existing update code ...
  
  // Send status update email
  try {
    await fetch('/api/send-status-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        applicationId,
        newStatus 
      })
    })
  } catch (emailError) {
    console.error('Status update email failed:', emailError)
  }
}
```

**Where to find this:** Look in your employer dashboard code, usually in:
- `app/employer/page.tsx` (employer dashboard)
- Any component that handles application status updates

## 📝 Email Templates Included

### 1. Application Confirmation (Job Seeker)
**Sent when:** Job seeker submits an application
**Includes:**
- Confirmation message
- Job title and company
- Application date
- Link to view job posting
- Dashboard link to track status

### 2. New Application Alert (Employer)
**Sent when:** Employer receives a new application
**Includes:**
- Applicant name
- Job title
- Application date
- Link to employer dashboard
- Call-to-action to review application

### 3. Application Status Update (Job Seeker)
**Sent when:** Employer changes application status
**Includes:**
- Status-specific message and emoji
- Job title and company
- Current status
- Dashboard link
- Encouragement (for rejections)

**Statuses supported:**
- `shortlisted` - "You've Been Shortlisted! ⭐"
- `interviewed` - "Interview Scheduled 📅"
- `rejected` - "Application Update 📋"
- `hired` - "Congratulations! 🎉"

## 🎨 Email Design

All emails feature:
- **FieldJobs branding** with orange (#ff6b35) header
- **Mobile-responsive** design
- **Professional typography** with clear hierarchy
- **Call-to-action buttons** for key actions
- **Footer** with links and copyright

## 🧪 Testing

### Test Locally (Without Sending Real Emails)

If `SENDGRID_API_KEY` is not set, emails will be logged to console instead of sent.

### Test with Real Emails

1. Set `SENDGRID_API_KEY` in your `.env.local`
2. Use your own email address for testing
3. Submit a test application
4. Check your inbox

### Preview Email Templates

You can preview templates without sending:

```typescript
import { render } from '@react-email/render'
import ApplicationConfirmationEmail from '@/emails/ApplicationConfirmation'

const html = render(ApplicationConfirmationEmail({
  applicantName: 'John Doe',
  jobTitle: 'Senior Technician',
  company: 'Tech Corp',
  appliedDate: 'January 20, 2025',
}))

console.log(html) // View the HTML
```

## 📊 Monitoring

### SendGrid Dashboard

Monitor your emails at https://app.sendgrid.com:
- **Activity** - See all sent emails
- **Statistics** - Delivery rates, opens, clicks
- **Suppressions** - Bounces, spam reports, unsubscribes

### Application Logs

Check Vercel logs for email sending status:
- ✅ Success: "Confirmation email sent to: email@example.com"
- ❌ Errors: "Failed to send confirmation email: [error details]"

## 🔐 Security Best Practices

1. **Never commit API keys** - Use environment variables only
2. **Verify sender domain** - Improves deliverability and trust
3. **Monitor bounce rates** - Keep email list clean
4. **Include unsubscribe links** - Required for marketing emails (not needed for transactional)

## 🚨 Troubleshooting

### Emails Not Sending

**Check:**
1. Is `SENDGRID_API_KEY` set in Vercel?
2. Is the API key valid and has "Mail Send" permissions?
3. Is sender email verified in SendGrid?
4. Check Vercel logs for error messages

### Emails Going to Spam

**Solutions:**
1. Verify domain in SendGrid (Settings → Sender Authentication)
2. Add SPF and DKIM records to DNS
3. Avoid spam trigger words
4. Ensure consistent "From" address

### Slow Email Delivery

**Solutions:**
1. Emails are sent asynchronously (don't block user actions)
2. If still slow, consider background job queue
3. Check SendGrid activity feed for delays

## 📈 Scaling

### Current Setup (Free Tier)
- **100 emails/day** with SendGrid free plan
- Perfect for initial launch and testing

### When to Upgrade

**SendGrid Essentials ($19.95/mo):**
- 50,000 emails/month
- Email validation
- Better deliverability
- Recommended when you hit 50+ applications/day

**SendGrid Pro ($89.95/mo):**
- 100,000 emails/month
- Dedicated IP
- Advanced analytics
- Recommended for 200+ applications/day

## 🎯 Next Steps

1. **Set SendGrid environment variables in Vercel**
2. **Verify sender email in SendGrid**
3. **Integrate email calls in application flow**
4. **Test with real applications**
5. **Monitor delivery in SendGrid dashboard**

## 📧 Additional Email Templates (Future)

Consider adding these templates later:
- Welcome email for new users
- Weekly job recommendations for job seekers
- Weekly application summary for employers
- Job expiring soon reminder
- Payment failed notification
- Subscription confirmation

## 🆘 Support

- **SendGrid Docs**: https://docs.sendgrid.com
- **React Email Docs**: https://react.email
- **Contact**: Check SendGrid activity feed and Vercel logs for debugging

---

**Status**: ✅ Email system is ready to use! Just add the API calls and configure SendGrid.

