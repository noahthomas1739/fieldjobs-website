# 📧 Email Setup Guide for FieldJobs

## **Option 1: Google Workspace (Recommended) - $6/month**

### **Why Google Workspace?**
- ✅ Professional email addresses (@field-jobs.co)
- ✅ Gmail interface everyone knows
- ✅ Built-in spam protection
- ✅ Easy forwarding/aliases
- ✅ Mobile apps included
- ✅ 30GB storage per email

### **Setup Steps:**
1. **Sign up**: Go to [workspace.google.com](https://workspace.google.com)
2. **Verify domain**: Add TXT record to field-jobs.co DNS
3. **Create emails**:
   ```
   support@field-jobs.co (main inbox)
   employers@field-jobs.co → forwards to support@
   privacy@field-jobs.co → forwards to support@
   abuse@field-jobs.co → forwards to support@
   noreply@field-jobs.co (for system emails)
   ```

### **DNS Records Needed:**
```
MX Records:
1  ASPMX.L.GOOGLE.COM
5  ALT1.ASPMX.L.GOOGLE.COM
5  ALT2.ASPMX.L.GOOGLE.COM
10 ALT3.ASPMX.L.GOOGLE.COM
10 ALT4.ASPMX.L.GOOGLE.COM

TXT Record:
google-site-verification=YOUR_VERIFICATION_CODE
```

---

## **Option 2: Simple Email Forwarding (Free)**

### **Using Cloudflare Email Routing (Free)**
1. In Cloudflare dashboard for field-jobs.co
2. Go to Email → Email Routing
3. Enable email routing
4. Add forwarding rules:
   ```
   support@field-jobs.co → your-personal@gmail.com
   employers@field-jobs.co → your-personal@gmail.com
   privacy@field-jobs.co → your-personal@gmail.com
   abuse@field-jobs.co → your-personal@gmail.com
   ```

### **Pros & Cons:**
- ✅ Free
- ✅ Easy setup
- ❌ Can't send FROM these addresses easily
- ❌ Less professional

---

## **Option 3: Domain Registrar Email**

Most domain registrars (GoDaddy, Namecheap) offer email hosting for $3-5/month.

---

## **Recommended Setup:**

```
Primary: support@field-jobs.co (Google Workspace)
Aliases: All others forward to support@

Gmail Filters:
- From: employers@ → Label: "Employers"
- From: privacy@ → Label: "Legal"  
- From: abuse@ → Label: "Abuse Reports"
```

---

## **Next Steps After Email Setup:**

1. Test all email addresses
2. Update contact forms to use new emails
3. Configure SMTP for system emails (optional)
4. Set up auto-responders if needed
