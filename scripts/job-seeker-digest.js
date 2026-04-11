#!/usr/bin/env node
/**
 * Pilot job-seeker digest: emails profiles with account_type=job_seeker (optionally resume).
 *
 * Default is DRY RUN (no sends). Use --send only after legal/compliance review.
 *
 *   node scripts/job-seeker-digest.js
 *   node scripts/job-seeker-digest.js --send --limit 50
 *   node scripts/job-seeker-digest.js --dry-run --limit 5 --include-no-resume
 */

const config = require('./config');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const {
  DIGEST_UTM,
  subjectLine,
  buildDigestHtml,
  buildDigestText,
} = require('./job-seeker-digest-templates');

function parseArgs() {
  const argv = process.argv.slice(2);
  const out = {
    send: false,
    dryRun: true,
    limit: 50,
    requireResume: true,
  };
  for (const a of argv) {
    if (a === '--send') {
      out.send = true;
      out.dryRun = false;
    }
    if (a === '--dry-run') out.dryRun = true;
    if (a.startsWith('--limit=')) out.limit = Math.max(1, parseInt(a.split('=')[1], 10) || 50);
    if (a === '--include-no-resume') out.requireResume = false;
  }
  if (out.send) out.dryRun = false;
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getActiveJobsCount(supabase) {
  const { count, error } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('active', true);
  if (error) {
    console.error('Could not count jobs:', error.message);
    return 0;
  }
  return count || 0;
}

async function fetchRecipients(supabase, { requireResume, limit }) {
  let query = supabase
    .from('profiles')
    .select('id, email, first_name, resume_url, email_alerts')
    .eq('account_type', 'job_seeker')
    .not('email', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (requireResume) {
    query = query.not('resume_url', 'is', null);
  }

  let { data, error } = await query;

  if (error && /email_alerts|column/i.test(error.message)) {
    let q2 = supabase
      .from('profiles')
      .select('id, email, first_name, resume_url')
      .eq('account_type', 'job_seeker')
      .not('email', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (requireResume) q2 = q2.not('resume_url', 'is', null);
    ({ data, error } = await q2);
  }

  if (error) {
    console.error('Error loading profiles:', error.message);
    return [];
  }

  let rows = data || [];
  rows = rows.filter((r) => r.email && String(r.email).includes('@'));
  if (rows[0] && 'email_alerts' in rows[0]) {
    rows = rows.filter((r) => r.email_alerts !== false);
  }
  return rows;
}

async function run() {
  const opts = parseArgs();
  const supabase = createClient(config.supabase.url, config.supabase.serviceKey);
  const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

  console.log('📬 Job seeker digest');
  console.log(`   Mode: ${opts.dryRun ? 'DRY RUN (no email sent)' : 'SEND'}`);
  console.log(`   Limit: ${opts.limit}, require resume: ${opts.requireResume}\n`);

  const activeJobs = await getActiveJobsCount(supabase);
  console.log(`   Active jobs on platform: ${activeJobs}\n`);

  const recipients = await fetchRecipients(supabase, opts);
  console.log(`   Recipients to process: ${recipients.length}\n`);

  if (recipients.length === 0) {
    console.log('Nothing to send. Check profiles (account_type=job_seeker, email set).');
    return;
  }

  const listingUrl = DIGEST_UTM;
  let sent = 0;

  for (const row of recipients) {
    const payload = {
      firstName: row.first_name,
      activeJobsCount: activeJobs,
      listingUrl,
    };
    const html = buildDigestHtml(payload);
    const text = buildDigestText(payload);
    const subj = subjectLine();

    if (opts.dryRun) {
      console.log(`  [dry-run] ${row.email} — "${subj}"`);
      continue;
    }

    if (!resend) {
      console.error('RESEND_API_KEY missing.');
      process.exit(1);
    }

    const result = await resend.emails.send({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to: row.email,
      subject: subj,
      html,
      text,
      reply_to: config.email.replyTo,
    });

    if (result.error) {
      console.error(`  ❌ ${row.email}:`, result.error.message);
    } else {
      console.log(`  ✅ ${row.email}`);
      sent++;
    }
    await sleep(800 + Math.random() * 500);
  }

  console.log('\n' + '='.repeat(40));
  if (opts.dryRun) {
    console.log(`Dry run complete. Would have targeted ${recipients.length} recipient(s).`);
    console.log('Run with --send to deliver (after compliance review).');
  } else {
    console.log(`Done. Sent: ${sent}${sent < recipients.length ? ' (some failed)' : ''}`);
  }
}

module.exports = { run };

if (require.main === module) {
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
