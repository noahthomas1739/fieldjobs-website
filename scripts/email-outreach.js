// ==========================================
// FIELD JOBS - EMAIL OUTREACH
// Sends cadence emails to verified leads
// Run: node scripts/email-outreach.js
// ==========================================

const config = require('./config');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

// Initialize clients
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);
const resend = new Resend(config.resend.apiKey);

// ==========================================
// EMAIL TEMPLATES
// ==========================================

const emailTemplates = {
  1: {
    subject: 'Traveling workers ready for {industry} projects',
    body: `Hey,

Field-Jobs connects companies with skilled workers who actually want to travel for work.

We have 4,000+ tradespeople - welders, pipefitters, electricians, mechanics - specifically looking for project-based, traveling roles.

Quick question: How long does it typically take {company} to fill a traveling position?

Check us out: https://field-job.com/employers

Noah Thomas
Founder, Field-Jobs`,
  },
  2: {
    subject: 'Your first job post is free',
    body: `Hey,

Simple offer: Post your first job on Field-Jobs completely free.

See the candidate quality yourself. If it works, keep posting. If not, you spent nothing.

Our platform attracts workers who want to travel - that's why they signed up.

Post free: https://field-job.com/employers

Noah Thomas
Founder, Field-Jobs`,
  },
  3: {
    subject: 'Skip the "will you travel?" conversation',
    body: `Hey,

On Indeed, half your screening calls are explaining per diem to people who've never left their hometown.

On Field-Jobs, everyone already wants road work. That's why they signed up.

Try it free: https://field-job.com/employers

Noah Thomas
Founder, Field-Jobs`,
  },
  4: {
    subject: 'Time-to-fill is killing margins',
    body: `Hey,

Every day a role sits empty costs you:
• Billable hours lost
• Client relationships strained  
• Margin evaporating

Faster fills = more margin captured.

Post free: https://field-job.com/employers

Noah Thomas
Founder, Field-Jobs`,
  },
  5: {
    subject: 'Last note from me',
    body: `Hey,

Workers who want to travel. Your first post is free. Zero risk.

https://field-job.com/employers

Noah Thomas
Founder, Field-Jobs`,
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

/**
 * Build professional enterprise-style HTML email
 */
function buildHtmlEmail(body, lead) {
  // Replace placeholders
  let content = body
    .replace(/{company}/g, lead.company_name)
    .replace(/{industry}/g, lead.industry || 'your')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  // Don't add <p> tags if content doesn't have them
  if (!content.includes('</p>')) {
    content = `<p>${content}</p>`;
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Field-Jobs</title>
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
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <!-- Preheader text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    Field-Jobs - Connecting you with traveling skilled workers who want road work.
  </div>
  
  <!-- Email Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td style="padding: 30px 20px;">
        
        <!-- Main Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 40px 24px 40px; border-bottom: 1px solid #f1f5f9;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <img src="https://field-job.com/fieldjobs-logo.svg" alt="Field-Jobs" width="150" style="display: block; max-width: 150px; height: auto;" />
                  </td>
                  <td style="text-align: right; font-size: 12px; color: #94a3b8;">
                    Technical Workforce Solutions
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Email Body -->
          <tr>
            <td style="padding: 32px 40px; font-size: 15px; line-height: 1.7; color: #374151;">
              ${content}
              
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;">
                <tr>
                  <td style="border-radius: 8px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);">
                    <a href="https://field-job.com/employers?utm_source=email&utm_medium=outreach&utm_campaign=cold_email" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      Post Your First Job Free →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Signature Section -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top: 1px solid #f1f5f9; padding-top: 24px;">
                <tr>
                  <td width="60" style="vertical-align: top; padding-right: 16px;">
                    <div style="width: 52px; height: 52px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 24px; color: white; font-weight: bold; line-height: 52px; text-align: center; display: block; width: 52px;">N</span>
                    </div>
                  </td>
                  <td style="vertical-align: top;">
                    <div style="font-weight: 600; font-size: 15px; color: #111827; margin-bottom: 2px;">Noah Thomas</div>
                    <div style="font-size: 13px; color: #6b7280; margin-bottom: 8px;">Founder & CEO</div>
                    <div style="font-size: 13px;">
                      <a href="https://field-job.com" style="color: #f97316; text-decoration: none; font-weight: 500;">field-job.com</a>
                      <span style="color: #d1d5db; margin: 0 8px;">|</span>
                      <a href="mailto:noah.thomas@field-jobs.co" style="color: #6b7280; text-decoration: none;">noah.thomas@field-jobs.co</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Social Proof Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 16px 40px; border-radius: 0 0 12px 12px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; font-size: 13px; color: #92400e;">
                    <strong>4,000+ traveling workers</strong> actively seeking project-based work
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
        
        <!-- Footer -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 24px auto 0 auto;">
          <tr>
            <td style="text-align: center; font-size: 11px; color: #9ca3af; line-height: 1.6;">
              <p style="margin: 0 0 8px 0;">
                Field-Jobs LLC | Austin, TX
              </p>
              <p style="margin: 0;">
                <a href="https://field-job.com" style="color: #9ca3af; text-decoration: underline;">Visit Website</a>
                <span style="margin: 0 8px;">•</span>
                <a href="https://field-job.com/privacy" style="color: #9ca3af; text-decoration: underline;">Privacy Policy</a>
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
  
  const subject = template.subject
    .replace(/{company}/g, lead.company_name)
    .replace(/{industry}/g, lead.industry || 'your');
  
  const htmlBody = buildHtmlEmail(template.body, lead);
  
  try {
    const result = await resend.emails.send({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to: lead.contact_email,
      subject: subject,
      html: htmlBody,
      text: template.body
        .replace(/{company}/g, lead.company_name)
        .replace(/{industry}/g, lead.industry || 'your'),
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
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('status', 'active')
    .eq('email_verified', true)
    .is('unsubscribed', null)
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
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('status', 'new')
    .eq('email_verified', true)
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
  
  const { error } = await supabase
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
  
  const { count } = await supabase
    .from('email_log')
    .select('*', { count: 'exact', head: true })
    .gte('sent_at', today.toISOString());
  
  return count || 0;
}

/**
 * Log email sent
 */
async function logEmailSent(leadId, emailNumber, recipientEmail) {
  await supabase
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

