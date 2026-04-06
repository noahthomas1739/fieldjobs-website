// ==========================================
// FIELD JOBS - EMAIL OUTREACH
// Sends cadence emails to verified leads
// Run: node scripts/email-outreach.js
// ==========================================

const config = require('./config');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

let supabaseClient;
let resendClient;

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient(config.supabase.url, config.supabase.serviceKey);
  }
  return supabaseClient;
}

function getResend() {
  if (!resendClient) {
    if (!config.resend.apiKey) {
      throw new Error('RESEND_API_KEY is not set');
    }
    resendClient = new Resend(config.resend.apiKey);
  }
  return resendClient;
}

// ==========================================
// EMAIL TEMPLATES
// ==========================================

const emailTemplates = {
  1: {
    subject: 'Traveling workers ready for {industry} projects',
    body: `Hello,

Field-Jobs connects employers with skilled workers who actively want to travel for project-based work.

We have 4,000+ active tradespeople—welders, pipefitters, electricians, mechanics—and live job listings on the platform, so the candidate pool stays engaged.

May I ask how long it typically takes {company} to fill a traveling role?

When you have a moment: https://field-job.com/employers?utm_source=email&utm_medium=outreach&utm_campaign=cold_email`,
  },
  2: {
    subject: 'Your first job post is free',
    body: `Hello,

A straightforward offer: your first job post on Field-Jobs is free.

You reach active candidates who want traveling work, alongside other employers’ live listings. If the quality fits your bar, keep posting; if not, you are not out anything.

Workers join Field-Jobs because they want road work—we built the marketplace around that.

Post at no cost: https://field-job.com/employers?utm_source=email&utm_medium=outreach&utm_campaign=cold_email`,
  },
  3: {
    subject: 'Skip the "will you travel?" conversation',
    body: `Hello,

On general job boards, a lot of screening time goes to candidates who are not serious about travel or per-diem work.

On Field-Jobs, candidates opt in for road work. The site also carries live roles from other employers, so workers see an active marketplace—not an empty feed.

See employer tools here: https://field-job.com/employers?utm_source=email&utm_medium=outreach&utm_campaign=cold_email`,
  },
  4: {
    subject: 'Time-to-fill is killing margins',
    body: `Hello,

Every day a role sits open carries cost:
• Billable hours
• Client relationships
• Margin

Faster fills help across the board. Field-Jobs already has active candidates and live job posts—adding your role builds on that momentum.

Post your first job free: https://field-job.com/employers?utm_source=email&utm_medium=outreach&utm_campaign=cold_email`,
  },
  5: {
    subject: 'Closing the loop',
    body: `Hello,

This is my last note in this series: traveling-focused candidates, live listings on the platform, and your first post is still free—no obligation.

If timing was not right before, you can pick it up anytime here: https://field-job.com/employers?utm_source=email&utm_medium=outreach&utm_campaign=cold_email`,
  },
};

// Email schedule (days since last email)
const emailSchedule = {
  1: 0,   // Send immediately for new leads
  2: 3,   // 3 days after email 1
  3: 7,   // 7 days after email 1
  4: 14,  // 14 days after email 1
  5: 21,  // 21 days after email 1
};

// ==========================================
// EMAIL SENDING
// ==========================================

const EMPLOYERS_UTM =
  'https://field-job.com/employers?utm_source=email&utm_medium=outreach&utm_campaign=cold_email';
const EMPLOYERS_UTM_XML = EMPLOYERS_UTM.replace(/&/g, '&amp;');

function applyLeadPlaceholders(text, lead) {
  return text
    .replace(/{company}/g, lead.company_name)
    .replace(/{industry}/g, lead.industry || 'your');
}

function buildPlainTextBody(body, lead) {
  const main = applyLeadPlaceholders(body, lead).trim();
  return `${main}

—
Noah Thomas
Founder & CEO, Field-Jobs
https://field-job.com
noah.thomas@field-jobs.co`;
}

/**
 * Branded HTML email (Field-Jobs orange + slate; table layout for client compatibility)
 */
function buildHtmlEmail(body, lead) {
  let raw = applyLeadPlaceholders(body, lead);
  raw = raw.replace(
    new RegExp(EMPLOYERS_UTM.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
    `<a href="${EMPLOYERS_UTM}" target="_blank" style="color:#ea580c;font-weight:600;text-decoration:underline;">field-job.com/employers</a>`
  );

  const blocks = raw.split(/\n\n/).map((block) => block.replace(/\n/g, '<br>'));
  const content = blocks
    .map(
      (inner, i) =>
        `<p style="margin:0 0 ${i === blocks.length - 1 ? '0' : '16px'} 0;">${inner}</p>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Field-Jobs</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    Field-Jobs — marketplace for traveling skilled trades. Active candidates and live employer listings.
  </div>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="height:4px;line-height:4px;font-size:4px;background-color:#ea580c;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 40px 20px 40px;border-bottom:1px solid #e2e8f0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="https://field-job.com/fieldjobs-logo.svg" alt="Field-Jobs" width="160" style="display:block;max-width:160px;height:auto;border:0;" />
                    <p style="margin:12px 0 0 0;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;font-weight:600;letter-spacing:0.04em;color:#ea580c;text-transform:uppercase;">
                      Marketplace for traveling skilled trades
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 8px 40px;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;line-height:1.65;color:#334155;">
              ${content}
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 8px 0;">
                <tr>
                  <td align="left" style="border-radius:8px;background-color:#ea580c;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${EMPLOYERS_UTM_XML}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="12%" strokecolor="#ea580c" fillcolor="#ea580c">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:600;">Post your first job free</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${EMPLOYERS_UTM}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;background-color:#ea580c;">
                      Post your first job free →
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 28px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top:1px solid #e2e8f0;">
                <tr>
                  <td style="padding-top:24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td width="56" valign="top" style="padding-right:16px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td align="center" valign="middle" width="52" height="52" style="width:52px;height:52px;background-color:#ea580c;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:20px;font-weight:700;color:#ffffff;line-height:52px;text-align:center;">
                                N
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td valign="top" style="font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                          <p style="margin:0 0 4px 0;font-size:16px;font-weight:600;color:#0f172a;">Noah Thomas</p>
                          <p style="margin:0 0 10px 0;font-size:13px;color:#64748b;">Founder &amp; CEO, Field-Jobs</p>
                          <p style="margin:0;font-size:13px;line-height:1.5;">
                            <a href="https://field-job.com" style="color:#ea580c;font-weight:600;text-decoration:none;">field-job.com</a>
                            <span style="color:#cbd5e1;">&nbsp;·&nbsp;</span>
                            <a href="mailto:noah.thomas@field-jobs.co" style="color:#64748b;text-decoration:none;">noah.thomas@field-jobs.co</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 40px;background-color:#fff7ed;border-top:1px solid #fed7aa;">
              <p style="margin:0;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;line-height:1.55;color:#9a3412;text-align:center;">
                <strong style="color:#c2410c;">4,000+ active candidates</strong> seeking traveling work
                <span style="color:#fdba74;">&nbsp;·&nbsp;</span>
                <strong style="color:#c2410c;">Live job listings</strong> from employers on Field-Jobs
              </p>
            </td>
          </tr>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;margin-top:20px;">
          <tr>
            <td style="text-align:center;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;line-height:1.6;color:#94a3b8;">
              <p style="margin:0 0 6px 0;">
                <span style="color:#64748b;font-weight:600;">Field-Jobs</span> LLC · Austin, TX
              </p>
              <p style="margin:0;">
                <a href="https://field-job.com" style="color:#ea580c;text-decoration:underline;">field-job.com</a>
                <span style="color:#cbd5e1;">&nbsp;·&nbsp;</span>
                <a href="https://field-job.com/privacy" style="color:#94a3b8;text-decoration:underline;">Privacy</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send email via Resend
 */
async function sendEmail(lead, emailNumber) {
  const template = emailTemplates[emailNumber];
  
  const subject = applyLeadPlaceholders(template.subject, lead);

  const htmlBody = buildHtmlEmail(template.body, lead);

  try {
    const result = await getResend().emails.send({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to: lead.contact_email,
      subject: subject,
      html: htmlBody,
      text: buildPlainTextBody(template.body, lead),
      reply_to: config.email.replyTo,
    });
    
    if (result.error) {
      console.error(`  ❌ Error sending to ${lead.contact_email}:`, result.error.message);
      return false;
    }
    
    console.log(`  ✅ Sent email ${emailNumber} to ${lead.contact_email}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error sending to ${lead.contact_email}:`, error.message);
    return false;
  }
}

// ==========================================
// DATABASE OPERATIONS
// ==========================================

/**
 * Get leads ready for their next email
 */
async function getLeadsForOutreach() {
  const { data: leads, error } = await getSupabase()
    .from('leads')
    .select('*')
    .eq('status', 'active')
    .eq('email_verified', true)
    .or('unsubscribed.is.null,unsubscribed.eq.false')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching leads:', error.message);
    return [];
  }
  
  return leads || [];
}

/**
 * Get new leads that haven't received any emails yet
 */
async function getNewLeads() {
  const { data: leads, error } = await getSupabase()
    .from('leads')
    .select('*')
    .eq('status', 'new')
    .eq('email_verified', true)
    .or('unsubscribed.is.null,unsubscribed.eq.false')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching new leads:', error.message);
    return [];
  }
  
  return leads || [];
}

/**
 * Update lead's email status
 */
async function updateLeadEmailStatus(leadId, emailNumber) {
  const updateField = `email_${emailNumber}_sent`;
  
  const { error } = await getSupabase()
    .from('leads')
    .update({
      [updateField]: new Date().toISOString(),
      last_email_number: emailNumber,
      status: emailNumber === 1 ? 'active' : undefined,
    })
    .eq('id', leadId);
  
  if (error) {
    console.error('Error updating lead:', error.message);
  }
}

/**
 * Get today's email count
 */
async function getTodaysEmailCount() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { count } = await getSupabase()
    .from('email_log')
    .select('*', { count: 'exact', head: true })
    .gte('sent_at', today.toISOString());
  
  return count || 0;
}

/**
 * Log email sent
 */
async function logEmailSent(leadId, emailNumber, recipientEmail) {
  await getSupabase()
    .from('email_log')
    .insert({
      lead_id: leadId,
      email_number: emailNumber,
      recipient_email: recipientEmail,
      sent_at: new Date().toISOString(),
    });
}

// ==========================================
// MAIN EXECUTION
// ==========================================

async function runEmailOutreach() {
  console.log('📧 Starting Email Outreach...\n');
  console.log('='.repeat(50));
  
  // Check daily limit
  const sentToday = await getTodaysEmailCount();
  const remaining = config.email.dailyLimit - sentToday;
  
  console.log(`📊 Daily email status: ${sentToday}/${config.email.dailyLimit} sent`);
  console.log(`📊 Remaining today: ${remaining}`);
  
  if (remaining <= 0) {
    console.log('\n⚠️ Daily email limit reached. Try again tomorrow.');
    return { sent: 0 };
  }
  
  let totalSent = 0;
  
  // PART 1: Send Email 1 to new leads
  console.log('\n--- Processing New Leads (Email 1) ---');
  const newLeads = await getNewLeads();
  console.log(`Found ${newLeads.length} new leads`);
  
  for (const lead of newLeads) {
    if (totalSent >= remaining) break;
    
    const success = await sendEmail(lead, 1);
    if (success) {
      await updateLeadEmailStatus(lead.id, 1);
      await logEmailSent(lead.id, 1, lead.contact_email);
      totalSent++;
    }
    
    // Random delay between 5-15 seconds for natural sending pattern
    const delay = 5000 + Math.random() * 10000;
    await sleep(delay);
  }
  
  // PART 2: Send follow-up emails to active leads
  console.log('\n--- Processing Follow-up Emails ---');
  const activeLeads = await getLeadsForOutreach();
  console.log(`Found ${activeLeads.length} active leads`);
  
  for (const lead of activeLeads) {
    if (totalSent >= remaining) break;
    
    const lastEmailNumber = lead.last_email_number || 0;
    const nextEmailNumber = lastEmailNumber + 1;
    
    // Check if there's a next email in sequence
    if (nextEmailNumber > 5) {
      console.log(`  ⏭️ ${lead.contact_email} - Sequence complete`);
      continue;
    }
    
    // Check if enough time has passed
    const lastEmailField = `email_${lastEmailNumber}_sent`;
    const lastEmailDate = lead[lastEmailField];
    
    if (lastEmailDate) {
      const daysSince = Math.floor((Date.now() - new Date(lastEmailDate)) / (1000 * 60 * 60 * 24));
      const requiredDays = emailSchedule[nextEmailNumber] - emailSchedule[lastEmailNumber];
      
      if (daysSince < requiredDays) {
        continue; // Not time yet
      }
    }
    
    // Send the next email
    const success = await sendEmail(lead, nextEmailNumber);
    if (success) {
      await updateLeadEmailStatus(lead.id, nextEmailNumber);
      await logEmailSent(lead.id, nextEmailNumber, lead.contact_email);
      totalSent++;
    }
    
    // Random delay
    const delay = 5000 + Math.random() * 10000;
    await sleep(delay);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 Email Outreach Complete!');
  console.log(`✅ Total emails sent: ${totalSent}`);
  
  return { sent: totalSent };
}

// Helper function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Sample lead for placeholder preview (company / industry only). */
const SAMPLE_PREVIEW_LEAD = {
  company_name: 'Acme Industrial Services',
  industry: 'industrial construction',
  contact_email: 'preview@example.com',
};

/**
 * Send all 5 templates to one inbox for QA. Does not read or write Supabase.
 */
async function sendTemplatePreviews(toEmail) {
  const lead = { ...SAMPLE_PREVIEW_LEAD, contact_email: toEmail };
  for (let n = 1; n <= 5; n++) {
    const template = emailTemplates[n];
    const subject = `[Template preview ${n}/5] ${applyLeadPlaceholders(template.subject, lead)}`;
    const result = await getResend().emails.send({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to: toEmail,
      subject,
      html: buildHtmlEmail(template.body, lead),
      text: buildPlainTextBody(template.body, lead),
      reply_to: config.email.replyTo,
    });
    if (result.error) {
      throw new Error(`Email ${n}: ${result.error.message}`);
    }
    console.log(`Sent preview ${n}/5 → ${toEmail}`);
    await sleep(800);
  }
  return { sent: 5 };
}

// Run if called directly
if (require.main === module) {
  runEmailOutreach()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runEmailOutreach, sendTemplatePreviews };

