// ==========================================
// FIELD JOBS - EMAIL OUTREACH
// Sends cadence emails to verified leads
// Run: node scripts/email-outreach.js
// ==========================================

const crypto = require('crypto');
const config = require('./config');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const {
  EMPLOYERS_UTM,
  emailTemplates,
  emailSchedule,
} = require('./outreach-employer-templates');

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

async function createRunLog() {
  const { data, error } = await getSupabase()
    .from('automation_runs')
    .insert({
      script_name: 'email-outreach',
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.warn('⚠️ Failed to create automation run log:', error.message);
    return null;
  }

  return data?.id || null;
}

async function completeRunLog(runId, status, payload = {}) {
  if (!runId) return;

  const { error } = await getSupabase()
    .from('automation_runs')
    .update({
      status,
      completed_at: new Date().toISOString(),
      results: payload.results || null,
      error_message: payload.error_message || null,
    })
    .eq('id', runId);

  if (error) {
    console.warn('⚠️ Failed to update automation run log:', error.message);
  }
}

// Templates + cadence: scripts/outreach-employer-templates.js

// ==========================================
// EMAIL SENDING
// ==========================================

function applyLeadPlaceholders(text, lead) {
  return text
    .replace(/{company}/g, lead.company_name)
    .replace(/{industry}/g, lead.industry || 'your');
}

function buildPlainTextBody(body, lead, employersHref = null) {
  let main = applyLeadPlaceholders(body, lead).trim();
  if (employersHref) {
    const escaped = EMPLOYERS_UTM.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    main = main.replace(new RegExp(escaped, 'g'), employersHref);
  }
  return `${main}

—
Noah Thomas
Founder & CEO, Field-Jobs
${config.email.linkBase.replace(/\/$/, '')}
noah.thomas@field-jobs.co`;
}

/**
 * Branded HTML email (Field-Jobs orange + slate; table layout for client compatibility)
 * @param {object} [options]
 * @param {string} [options.employersTrackingUrl] — replaces EMPLOYERS_UTM in body + CTA (e.g. /api/email-click?t=…)
 */
function buildHtmlEmail(body, lead, options = {}) {
  const employersHref = options.employersTrackingUrl || EMPLOYERS_UTM;
  const employersHrefXml = employersHref.replace(/&/g, '&amp;');

  let raw = applyLeadPlaceholders(body, lead);
  raw = raw.replace(
    new RegExp(EMPLOYERS_UTM.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
    `<a href="${employersHref}" target="_blank" style="color:#ea580c;font-weight:600;text-decoration:underline;">field-job.com/employers</a>`
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
                    <img src="${config.email.linkBase.replace(/\/$/, '')}/fieldjobs-logo.svg" alt="Field-Jobs" width="160" style="display:block;max-width:160px;height:auto;border:0;" />
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
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${employersHrefXml}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="12%" strokecolor="#ea580c" fillcolor="#ea580c">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:600;">Post your first job free</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${employersHref}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;background-color:#ea580c;">
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
                            <a href="${config.email.linkBase.replace(/\/$/, '')}" style="color:#ea580c;font-weight:600;text-decoration:none;">field-jobs.co</a>
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
                <a href="${config.email.linkBase.replace(/\/$/, '')}" style="color:#ea580c;text-decoration:underline;">field-jobs.co</a>
                <span style="color:#cbd5e1;">&nbsp;·&nbsp;</span>
                <a href="${config.email.linkBase.replace(/\/$/, '')}/privacy" style="color:#94a3b8;text-decoration:underline;">Privacy</a>
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
function getAppBaseUrl() {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://field-job.com';
  return String(base).replace(/\/$/, '');
}

async function sendEmail(lead, emailNumber) {
  const template = emailTemplates[emailNumber];
  
  const subject = applyLeadPlaceholders(template.subject, lead);

  const clickToken = crypto.randomUUID();
  const trackingUrl = `${getAppBaseUrl()}/api/email-click?t=${encodeURIComponent(clickToken)}`;
  const htmlBody = buildHtmlEmail(template.body, lead, {
    employersTrackingUrl: trackingUrl,
  });

  try {
    const result = await getResend().emails.send({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to: lead.contact_email,
      subject: subject,
      html: htmlBody,
      text: buildPlainTextBody(template.body, lead, trackingUrl),
      reply_to: config.email.replyTo,
    });
    
    if (result.error) {
      console.error(`  ❌ Error sending to ${lead.contact_email}:`, result.error.message);
      return { ok: false };
    }
    
    console.log(`  ✅ Sent email ${emailNumber} to ${lead.contact_email}`);
    return { ok: true, clickToken, redirectUrl: EMPLOYERS_UTM };
  } catch (error) {
    console.error(`  ❌ Error sending to ${lead.contact_email}:`, error.message);
    return { ok: false };
  }
}

// ==========================================
// DATABASE OPERATIONS
// ==========================================

/**
 * Get leads ready for their next email (excludes sequence_complete)
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
 * Mark a lead's sequence as fully complete
 */
async function markSequenceComplete(leadId) {
  const { error } = await getSupabase()
    .from('leads')
    .update({ status: 'sequence_complete' })
    .eq('id', leadId);

  if (error) {
    console.error('Error marking sequence complete:', error.message);
  }
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
async function logEmailSent(leadId, emailNumber, recipientEmail, meta = {}) {
  const row = {
    lead_id: leadId,
    email_number: emailNumber,
    recipient_email: recipientEmail,
    sent_at: new Date().toISOString(),
  };
  if (meta.clickToken) row.click_token = meta.clickToken;
  if (meta.redirectUrl) row.redirect_url = meta.redirectUrl;

  const { error } = await getSupabase().from('email_log').insert(row);
  if (error) {
    console.error('  ⚠️ logEmailSent:', error.message);
  }
}

// ==========================================
// MAIN EXECUTION
// ==========================================

async function runEmailOutreach() {
  const runId = await createRunLog();
  console.log('📧 Starting Email Outreach...\n');
  console.log('='.repeat(50));

  try {
    // Check daily limit
    const sentToday = await getTodaysEmailCount();
    const remaining = config.email.dailyLimit - sentToday;
    
    console.log(`📊 Daily email status: ${sentToday}/${config.email.dailyLimit} sent`);
    console.log(`📊 Remaining today: ${remaining}`);
    
    if (remaining <= 0) {
      console.log('\n⚠️ Daily email limit reached. Try again tomorrow.');
      const results = { sent: 0, daily_limit: config.email.dailyLimit, sent_today: sentToday };
      await completeRunLog(runId, 'completed', { results });
      return { sent: 0 };
    }
    
    let totalSent = 0;
    
    // PART 1: Send Email 1 to new leads
    console.log('\n--- Processing New Leads (Email 1) ---');
    const newLeads = await getNewLeads();
    console.log(`Found ${newLeads.length} new leads`);
    
    for (const lead of newLeads) {
      if (totalSent >= remaining) break;
      
      const sendResult = await sendEmail(lead, 1);
      if (sendResult.ok) {
        await updateLeadEmailStatus(lead.id, 1);
        await logEmailSent(lead.id, 1, lead.contact_email, {
          clickToken: sendResult.clickToken,
          redirectUrl: sendResult.redirectUrl,
        });
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

    let notYetDue = 0;
    let sequenceComplete = 0;
    let markedComplete = 0;

    for (const lead of activeLeads) {
      if (totalSent >= remaining) break;
      
      const lastEmailNumber = lead.last_email_number || 0;
      const nextEmailNumber = lastEmailNumber + 1;
      
      // Sequence finished — mark status and skip
      if (nextEmailNumber > 5) {
        sequenceComplete++;
        if (lead.status !== 'sequence_complete') {
          await markSequenceComplete(lead.id);
          markedComplete++;
        }
        continue;
      }
      
      // Check if enough time has passed
      const lastEmailField = `email_${lastEmailNumber}_sent`;
      const lastEmailDate = lead[lastEmailField];
      
      if (lastEmailDate) {
        const daysSince = Math.floor((Date.now() - new Date(lastEmailDate)) / (1000 * 60 * 60 * 24));
        const requiredDays = emailSchedule[nextEmailNumber] - emailSchedule[lastEmailNumber];
        
        if (daysSince < requiredDays) {
          notYetDue++;
          continue;
        }
      }
      
      // Send the next email
      const sendResult = await sendEmail(lead, nextEmailNumber);
      if (sendResult.ok) {
        await updateLeadEmailStatus(lead.id, nextEmailNumber);
        await logEmailSent(lead.id, nextEmailNumber, lead.contact_email, {
          clickToken: sendResult.clickToken,
          redirectUrl: sendResult.redirectUrl,
        });
        totalSent++;
      }
      
      // Random delay
      const delay = 5000 + Math.random() * 10000;
      await sleep(delay);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🏁 Email Outreach Complete!');
    console.log(`✅ Sent this run: ${totalSent}`);
    console.log(`📊 Daily total: ${sentToday + totalSent}/${config.email.dailyLimit}`);
    console.log(`⏳ Not yet due: ${notYetDue} leads`);
    console.log(`🏁 Sequence complete: ${sequenceComplete} leads${markedComplete > 0 ? ` (${markedComplete} newly marked)` : ''}`);
    if (totalSent === 0 && activeLeads.length === 0) {
      console.log('\n💡 No leads to email yet — run lead-generator first (Mon + Thu).');
      console.log('   Ensure SKRAPP_API_KEY, SNOV_CLIENT_ID/SECRET, HUNTER_API_KEY are set in GitHub secrets.');
    }

    const results = {
      sent: totalSent,
      daily_limit: config.email.dailyLimit,
      sent_today: sentToday + totalSent,
      not_yet_due: notYetDue,
      sequence_complete: sequenceComplete,
    };
    await completeRunLog(runId, 'completed', { results });
    return { sent: totalSent };
  } catch (error) {
    await completeRunLog(runId, 'failed', { error_message: error.message });
    throw error;
  }
}

// Helper function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

module.exports = { runEmailOutreach };

