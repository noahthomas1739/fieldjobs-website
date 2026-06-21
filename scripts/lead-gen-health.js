// ==========================================
// FIELD JOBS - LEAD GEN HEALTH CHECK
// Run: node scripts/lead-gen-health.js [--weekly] [--check-last-run] [--strict]
// ==========================================

const config = require('./config');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

const APOLLO_LIMIT = config.emailServices.apollo?.monthlyLimit || 50;
const SNOV_LIMIT   = config.emailServices.snov.monthlyLimit;
const HUNTER_LIMIT = config.emailServices.hunter.monthlyLimit;

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    weekly: args.includes('--weekly'),
    checkLastRun: args.includes('--check-last-run'),
    strict: args.includes('--strict'),
  };
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getQuotaUsage() {
  const monthStart = startOfMonth().toISOString();
  const { data, error } = await supabase
    .from('email_service_usage')
    .select('service, count')
    .gte('month', monthStart);

  if (error) throw new Error(`email_service_usage: ${error.message}`);

  const usage = {};
  (data || []).forEach((row) => {
    usage[row.service] = (usage[row.service] || 0) + row.count;
  });
  return usage;
}

async function getLeadCounts() {
  const { data, error } = await supabase.from('leads').select('status, created_at');
  if (error) throw new Error(`leads: ${error.message}`);

  const byStatus = {};
  let total = 0;
  let newThisWeek = 0;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  for (const row of data || []) {
    total++;
    byStatus[row.status] = (byStatus[row.status] || 0) + 1;
    if (new Date(row.created_at).getTime() >= weekAgo) newThisWeek++;
  }

  return { total, byStatus, newThisWeek };
}

async function getRecentRuns(scriptName, limit = 10) {
  const { data, error } = await supabase
    .from('automation_runs')
    .select('started_at, completed_at, status, results, error_message')
    .eq('script_name', scriptName)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`automation_runs: ${error.message}`);
  return data || [];
}

function checkConfig() {
  const apolloOk = !!config.emailServices.apollo?.apiKey;
  const snovOk   = !!(config.emailServices.snov.clientId && config.emailServices.snov.clientSecret);
  const hunterOk = !!config.emailServices.hunter.apiKey;
  return { apolloOk, snovOk, hunterOk };
}

function printReport({ usage, leads, runs, configStatus, issues }) {
  console.log('\n' + '='.repeat(50));
  console.log('LEAD GEN HEALTH REPORT');
  console.log('='.repeat(50));

  console.log('\n--- Email finder config ---');
  console.log(`  Apollo: ${configStatus.apolloOk ? 'configured (50/mo)' : 'MISSING — set APOLLO_API_KEY'}`);
  console.log(`  Snov:   ${configStatus.snovOk   ? 'configured (50/mo)' : 'MISSING — set SNOV_CLIENT_ID + SNOV_CLIENT_SECRET'}`);
  console.log(`  Hunter: ${configStatus.hunterOk ? 'configured (25/mo)' : 'MISSING — set HUNTER_API_KEY'}`);

  console.log('\n--- Quota usage (this month) ---');
  const apolloUsed = usage.apollo || 0;
  const snovUsed   = usage.snov   || 0;
  const hunterUsed = usage.hunter || 0;
  console.log(`  Apollo: ${apolloUsed}/${APOLLO_LIMIT}`);
  console.log(`  Snov:   ${snovUsed}/${SNOV_LIMIT}`);
  console.log(`  Hunter: ${hunterUsed}/${HUNTER_LIMIT}`);
  console.log(`  Combined remaining: ${Math.max(0, APOLLO_LIMIT - apolloUsed) + Math.max(0, SNOV_LIMIT - snovUsed) + Math.max(0, HUNTER_LIMIT - hunterUsed)}/125`);

  console.log('\n--- Leads ---');
  console.log(`  Total: ${leads.total}`);
  console.log(`  New (7 days): ${leads.newThisWeek}`);
  console.log(`  By status: ${JSON.stringify(leads.byStatus)}`);

  console.log('\n--- Recent lead-generator runs ---');
  if (runs.length === 0) {
    console.log('  (none found)');
  } else {
    for (const run of runs.slice(0, 5)) {
      const saved = run.results?.saved ?? run.results?.results?.saved ?? '?';
      console.log(`  ${run.started_at} | ${run.status} | saved=${saved}${run.error_message ? ` | ${run.error_message}` : ''}`);
    }
  }

  if (issues.length > 0) {
    console.log('\n--- Issues ---');
    issues.forEach((msg) => console.log(`  ⚠️  ${msg}`));
  } else {
    console.log('\n✅ No issues detected');
  }

  console.log('\n' + '='.repeat(50));
}

async function runHealthCheck(options) {
  const issues = [];

  const configStatus = checkConfig();
  if (!configStatus.hunterOk && !configStatus.snovOk) {
    issues.push('No email finder APIs configured (HUNTER_API_KEY / SNOV credentials missing)');
  } else if (!configStatus.snovOk) {
    issues.push('Snov not configured — pipeline capped at 25 leads/month (Hunter only)');
  }

  const usage = await getQuotaUsage();
  const apolloUsed = usage.apollo || 0;
  const snovUsed   = usage.snov   || 0;
  const hunterUsed = usage.hunter || 0;
  const totalRemaining =
    Math.max(0, APOLLO_LIMIT - apolloUsed) +
    Math.max(0, SNOV_LIMIT   - snovUsed)   +
    Math.max(0, HUNTER_LIMIT - hunterUsed);

  if (totalRemaining <= 0) {
    issues.push('All email service quotas exhausted (Apollo/Snov/Hunter)');
  }
  if (!configStatus.apolloOk) {
    issues.push('Apollo not configured — missing 50 free lookups/month (set APOLLO_API_KEY)');
  }
  if (!configStatus.snovOk) {
    issues.push('Snov not configured — missing 50 free lookups/month (set SNOV_CLIENT_ID + SNOV_CLIENT_SECRET)');
  }

  const leads = await getLeadCounts();
  const runs = await getRecentRuns('lead-generator', 10);

  if (options.weekly && leads.newThisWeek === 0) {
    issues.push('No new leads created in the last 7 days');
  }

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentGeneratorRuns = runs.filter(
    (r) => new Date(r.started_at).getTime() >= weekAgo
  );
  if (options.weekly && recentGeneratorRuns.length === 0) {
    issues.push('lead-generator has not run in the last 7 days (check GitHub Actions schedule)');
  }

  if (options.checkLastRun) {
    const lastRun = runs[0];
    if (!lastRun) {
      issues.push('No lead-generator runs found in automation_runs');
    } else if (lastRun.status === 'failed') {
      issues.push(`Last lead-generator run failed: ${lastRun.error_message || 'unknown error'}`);
    } else {
      const saved = lastRun.results?.saved ?? 0;
      if (saved === 0) {
        issues.push('Last lead-generator run saved 0 leads');
      }
    }
  }

  printReport({ usage, leads, runs, configStatus, issues });

  if (options.strict && issues.length > 0) {
    console.error(`\n❌ Health check failed (${issues.length} issue(s))`);
    process.exit(1);
  }

  return { issues, usage, leads, runs };
}

if (require.main === module) {
  const options = parseArgs();
  runHealthCheck(options).catch((err) => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}

async function getLeadGenStats() {
  const configStatus = checkConfig();
  const usage = await getQuotaUsage();
  const leads = await getLeadCounts();
  const runs = await getRecentRuns('lead-generator', 10);
  const outreachRuns = await getRecentRuns('email-outreach', 5);

  const hunterUsed = usage.hunter || 0;
  const snovUsed = usage.snov || 0;
  const totalRemaining =
    Math.max(0, HUNTER_LIMIT - hunterUsed) + Math.max(0, SNOV_LIMIT - snovUsed);

  return {
    config: configStatus,
    quota: {
      apollo: { used: apolloUsed, limit: APOLLO_LIMIT },
      snov:   { used: snovUsed,   limit: SNOV_LIMIT },
      hunter: { used: hunterUsed, limit: HUNTER_LIMIT },
      remaining: totalRemaining,
    },
    leads,
    recentRuns: {
      leadGenerator: runs,
      emailOutreach: outreachRuns,
    },
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { runHealthCheck, getLeadGenStats };
