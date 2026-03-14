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
 * Build HTML email with professional signature
 */
function buildHtmlEmail(body, lead) {
  // Replace placeholders
  let content = body
    .replace(/{company}/g, lead.company_name)
    .replace(/{industry}/g, lead.industry || 'your')
    .replace(/\n/g, '<br>');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1a1a1a;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="margin-bottom: 30px;">
      ${content}
    </div>
    
    <table cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="vertical-align: top;">
          <div style="font-weight: 600; font-size: 15px; color: #1a1a1a; margin-bottom: 2px;">Noah Thomas</div>
          <div style="font-size: 13px; color: #4b5563; margin-bottom: 6px;">Founder, Field-Jobs</div>
          <div style="font-size: 13px;">
            <a href="https://field-job.com?utm_source=email&utm_medium=outreach" style="color: #2563eb; text-decoration: none; font-weight: 500;">🌐 field-job.com</a>
          </div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 6px; font-style: italic;">
            4,000+ traveling workers ready for your next project
          </div>
        </td>
      </tr>
    </table>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af;">
      Field-Jobs | <a href="https://field-job.com" style="color: #6b7280;">field-job.com</a>
    </div>
  </div>
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

