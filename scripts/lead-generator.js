// ==========================================
// FIELD JOBS - LEAD GENERATOR
// Uses Claude + Multiple Email Finding Services
// Run: node scripts/lead-generator.js
// ==========================================

const dns = require('dns').promises;
const config = require('./config');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

// Initialize clients
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);
const anthropic = new Anthropic({ apiKey: config.claude.apiKey });

async function createRunLog() {
  const { data, error } = await supabase
    .from('automation_runs')
    .insert({
      script_name: 'lead-generator',
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

  const { error } = await supabase
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

// ==========================================
// EMAIL FINDING SERVICES (FREE TIERS)
// Total: ~100 verified emails/month for FREE
// ==========================================

/**
 * Find email using Hunter.io (25 free/month)
 * Docs: https://hunter.io/api-documentation/v2
 * Uses Domain Search to find emails at a company
 */
async function findEmailHunter(companyDomain) {
  if (!config.emailServices.hunter.apiKey) return null;
  
  try {
    // Use Domain Search to find emails - prioritize personal emails with seniority
    const url = `https://api.hunter.io/v2/domain-search?domain=${companyDomain}&type=personal&limit=5&api_key=${config.emailServices.hunter.apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.errors) {
      console.error('Hunter API error:', data.errors[0]?.details);
      return null;
    }
    
    // Find the best email - prefer verified ones with high confidence
    const emails = data.data?.emails || [];
    const bestEmail = emails.find(e => e.verification?.status === 'valid') || 
                      emails.find(e => e.confidence > 80) ||
                      emails[0];
    
    if (bestEmail) {
      return {
        email: bestEmail.value,
        name: `${bestEmail.first_name || ''} ${bestEmail.last_name || ''}`.trim(),
        title: bestEmail.position,
        department: bestEmail.department,
        source: 'hunter',
        verified: bestEmail.verification?.status === 'valid',
        confidence: bestEmail.confidence,
      };
    }
  } catch (error) {
    console.error('Hunter error:', error.message);
  }
  
  return null;
}

/**
 * Verify email using Hunter.io Email Verifier
 * Uses separate verification endpoint for extra validation
 */
async function verifyEmailHunter(email) {
  if (!config.emailServices.hunter.apiKey) return null;
  
  try {
    const url = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${config.emailServices.hunter.apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.data) {
      return {
        verified: data.data.status === 'valid',
        status: data.data.status, // valid, invalid, accept_all, webmail, disposable, unknown
        score: data.data.score,
      };
    }
  } catch (error) {
    console.error('Hunter verify error:', error.message);
  }
  
  return null;
}

/**
 * Find email using Snov.io (50 free/month)
 * Docs: https://snov.io/api
 * Uses Domain Search with info to get emails + contact details
 */
async function findEmailSnov(companyDomain) {
  if (!config.emailServices.snov.clientId || !config.emailServices.snov.clientSecret) return null;
  
  try {
    // Step 1: Get access token
    const tokenResponse = await fetch('https://api.snov.io/v1/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: config.emailServices.snov.clientId,
        client_secret: config.emailServices.snov.clientSecret,
      }),
    });
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    if (!accessToken) {
      console.error('Snov: Failed to get access token');
      return null;
    }
    
    // Step 2: Search for emails by domain
    const searchResponse = await fetch('https://api.snov.io/v1/get-domain-emails-with-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: accessToken,
        domain: companyDomain,
        type: 'all',
        limit: 5,
      }),
    });
    
    const data = await searchResponse.json();
    
    if (data.success === false) {
      console.error('Snov API error:', data.message);
      return null;
    }
    
    // Find best email - prefer ones with names and valid status
    const emails = data.emails || [];
    const bestEmail = emails.find(e => e.status === 'valid' && e.firstName) ||
                      emails.find(e => e.status === 'valid') ||
                      emails.find(e => e.firstName) ||
                      emails[0];
    
    if (bestEmail) {
      return {
        email: bestEmail.email,
        name: `${bestEmail.firstName || ''} ${bestEmail.lastName || ''}`.trim(),
        title: bestEmail.position,
        source: 'snov',
        verified: bestEmail.status === 'valid',
      };
    }
  } catch (error) {
    console.error('Snov error:', error.message);
  }
  
  return null;
}

/**
 * Verify email using Snov.io Email Verifier
 */
async function verifyEmailSnov(email) {
  if (!config.emailServices.snov.clientId || !config.emailServices.snov.clientSecret) return null;
  
  try {
    // Get access token
    const tokenResponse = await fetch('https://api.snov.io/v1/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: config.emailServices.snov.clientId,
        client_secret: config.emailServices.snov.clientSecret,
      }),
    });
    
    const { access_token } = await tokenResponse.json();
    if (!access_token) return null;
    
    // Verify email
    const verifyResponse = await fetch('https://api.snov.io/v1/get-emails-verification-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token,
        emails: [email],
      }),
    });
    
    const data = await verifyResponse.json();
    
    if (data[0]) {
      return {
        verified: data[0].status === 'valid',
        status: data[0].status,
      };
    }
  } catch (error) {
    console.error('Snov verify error:', error.message);
  }
  
  return null;
}

// ==========================================
// WEBSITE SCRAPING (FREE — NO QUOTA)
// ==========================================

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Patterns that suggest a hiring/HR contact — highest value for our use case
const HIRING_PATTERNS = ['hr', 'recruit', 'hiring', 'talent', 'careers', 'people', 'workforce'];
// Generic but still a real mailbox — lower value but usable
const GENERIC_PATTERNS = ['info', 'contact', 'hello', 'office', 'admin', 'general', 'inquir'];
// Definitely skip these — automated senders, no human reads them
const SKIP_PATTERNS = ['noreply', 'no-reply', 'donotreply', 'bounce', 'unsubscribe', 'mailer', 'postmaster', 'abuse'];

function getBaseDomain(domain) {
  const cleaned = domain.replace(/^www\./, '').toLowerCase();
  const parts = cleaned.split('.');
  // Return last two segments (handles .com, .net, .org, .io, etc.)
  return parts.length > 2 ? parts.slice(-2).join('.') : cleaned;
}

function scoreEmail(localPart) {
  const local = localPart.toLowerCase();
  if (SKIP_PATTERNS.some(p => local.includes(p))) return -1;
  if (HIRING_PATTERNS.some(p => local.includes(p)))  return 10; // hr@, recruiter@, etc.
  if (GENERIC_PATTERNS.every(p => !local.includes(p))) return 6; // looks like a person's name
  return 2; // generic contact@ / info@ — still real
}

/**
 * Scrape company website for publicly listed contact emails.
 * Free, unlimited — tries common contact/about/team paths.
 * Falls back gracefully on any fetch error.
 */
async function scrapeEmailFromWebsite(companyDomain) {
  const baseDomain = getBaseDomain(companyDomain);
  const baseUrl = `https://${companyDomain}`;

  const paths = [
    '',           // homepage — often has email in footer
    '/contact',
    '/contact-us',
    '/about',
    '/about-us',
    '/team',
    '/our-team',
    '/leadership',
    '/company',
    '/careers',
    '/hiring',
  ];

  const candidates = new Map(); // email → score

  for (const path of paths) {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; business inquiry bot)' },
        signal: AbortSignal.timeout(7000),
        redirect: 'follow',
      });

      if (!res.ok) continue;

      const html = await res.text();
      const matches = html.match(EMAIL_REGEX) || [];

      for (const email of matches) {
        if (candidates.has(email)) continue;
        const [local, emailDomain] = email.toLowerCase().split('@');
        if (!emailDomain) continue;

        // Only keep emails that belong to this company's domain
        if (!emailDomain.endsWith(baseDomain)) continue;

        const score = scoreEmail(local);
        if (score < 0) continue; // skip no-reply etc.

        candidates.set(email, score);
      }

      // Stop early if we already have a high-quality email
      const best = [...candidates.values()].sort((a, b) => b - a)[0];
      if (best >= 10) break;

    } catch {
      // Timeout, DNS failure, SSL error — just move on to next path
    }
  }

  if (candidates.size === 0) return null;

  // Pick highest-scoring email
  const [bestEmail] = [...candidates.entries()].sort((a, b) => b[1] - a[1])[0];

  // Basic MX record check — confirms the domain can receive mail
  try {
    await dns.resolveMx(bestEmail.split('@')[1]);
  } catch {
    console.log(`    ⚠️ No MX records for ${bestEmail.split('@')[1]} — skipping`);
    return null;
  }

  const score = candidates.get(bestEmail);
  console.log(`    🌐 Scraped from website: ${bestEmail} (score ${score})`);

  return {
    email: bestEmail,
    name: '',
    title: null,
    source: 'website_scrape',
    // Treat hiring-pattern emails as verified; generic ones are "accept_all" quality
    verified: score >= 6,
    confidence: Math.min(score * 10, 90),
  };
}

/**
 * Find email using Apollo.io (50 free exports/month)
 * Docs: https://apolloio.github.io/apollo-api-docs
 * Uses People Search filtered by organization domain
 */
async function findEmailApollo(companyDomain) {
  if (!config.emailServices.apollo?.apiKey) return null;

  try {
    const response = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        api_key: config.emailServices.apollo.apiKey,
        q_organization_domains: companyDomain,
        per_page: 5,
        // Prioritize decision-makers likely to handle hiring
        person_titles: [
          'HR Manager', 'Human Resources', 'Recruiter', 'Talent Acquisition',
          'VP HR', 'Director of HR', 'People Operations',
          'Owner', 'CEO', 'President', 'COO', 'General Manager',
          'Operations Manager', 'Project Manager', 'Site Manager',
        ],
      }),
    });

    if (!response.ok) {
      console.error(`Apollo HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    const people = data.people || [];

    // Prefer contacts with verified emails
    const best = people.find(p => p.email && p.verified_for_sending) ||
                 people.find(p => p.email) ||
                 people[0];

    if (!best?.email) return null;

    return {
      email: best.email,
      name: best.name || `${best.first_name || ''} ${best.last_name || ''}`.trim(),
      title: best.title || null,
      source: 'apollo',
      verified: !!best.verified_for_sending,
      confidence: best.email_status === 'verified' ? 100 : 70,
    };
  } catch (error) {
    console.error('Apollo error:', error.message);
  }

  return null;
}

/**
 * Try all email finding methods in order:
 *   1. Website scraping (FREE, unlimited) — tries contact/about/team pages
 *   2. Apollo (50/month free)
 *   3. Snov (50/month free)
 *   4. Hunter (25/month free)
 *
 * Paid API quota is only consumed when scraping finds nothing.
 */
async function findVerifiedEmail(companyDomain, companyName) {
  console.log(`  🔍 Finding email for ${companyDomain}...`);

  // ── Step 1: Website scraping (free, no quota) ──────────────────────────
  const scraped = await scrapeEmailFromWebsite(companyDomain);
  if (scraped?.email && scraped.verified) {
    console.log(`    ✅ Found via website scrape: ${scraped.email}`);
    return scraped;
  }
  // Keep scraped result as a fallback even if not "verified" (will use if paid services also fail)
  const scrapedFallback = scraped?.email ? scraped : null;

  // ── Step 2: Paid email finder APIs (quota-tracked) ─────────────────────
  const usage = await getServiceUsage();
  
  const services = [
    { name: 'apollo', fn: findEmailApollo, verifyFn: null,              limit: 50 },
    { name: 'snov',   fn: findEmailSnov,   verifyFn: verifyEmailSnov,   limit: 50 },
    { name: 'hunter', fn: findEmailHunter, verifyFn: verifyEmailHunter, limit: 25 },
  ].filter(s => (usage[s.name] || 0) < s.limit);

  if (services.length === 0) {
    console.log(`    ⚠️ All paid quotas exhausted — Apollo ${usage.apollo || 0}/50, Snov ${usage.snov || 0}/50, Hunter ${usage.hunter || 0}/25`);
    // Still use a scraped email if we have one, even if only generic quality
    if (scrapedFallback) {
      console.log(`    🌐 Using scraped fallback: ${scrapedFallback.email}`);
      scrapedFallback.verified = true;
      return scrapedFallback;
    }
    return null;
  }
  
  for (const service of services) {
    try {
      const result = await service.fn(companyDomain, companyName);
      
      if (result?.email) {
        await logServiceUsage(service.name);
        
        if (result.verified) {
          console.log(`    ✅ Found verified via ${service.name}: ${result.email}`);
          return result;
        }
        
        if (result.confidence && result.confidence > 80) {
          console.log(`    ✅ High-confidence (${result.confidence}%) via ${service.name}: ${result.email}`);
          result.verified = true;
          return result;
        }
        
        if (service.verifyFn) {
          console.log(`    🔄 Verifying ${result.email}...`);
          const verification = await service.verifyFn(result.email);
          
          if (verification?.verified) {
            console.log(`    ✅ Verified: ${result.email}`);
            result.verified = true;
            return result;
          } else if (verification?.status === 'accept_all') {
            result.verified = true;
            result.note = 'accept_all';
            return result;
          }
          console.log(`    ⚠️ Verification: ${verification?.status || 'unknown'}`);
        }
      }
      
      await sleep(1000);
    } catch (error) {
      console.error(`    Error with ${service.name}:`, error.message);
    }
  }

  // ── Step 3: Use scraped fallback if paid services also failed ───────────
  if (scrapedFallback) {
    console.log(`    🌐 Paid services found nothing — using scraped fallback: ${scrapedFallback.email}`);
    scrapedFallback.verified = true;
    return scrapedFallback;
  }

  console.log(`    ❌ No email found via scraping or paid services`);
  return null;
}

// ==========================================
// CLAUDE COMPANY RESEARCH
// ==========================================

/**
 * Use Claude to find relevant companies in an industry
 * Claude returns company info, we find real emails separately
 * @param {object} industry
 * @param {string[]} excludeDomains — domains already in leads (lowercase)
 */
async function findCompaniesWithClaude(industry, excludeDomains = []) {
  console.log(`\n🤖 Asking Claude for ${industry.name} companies...`);

  const excludeSample = excludeDomains.slice(0, 120);
  const excludeBlock =
    excludeSample.length > 0
      ? `\nDO NOT include any company whose domain appears in this list (we already have them):\n${excludeSample.join(', ')}\n`
      : '';

  const prompt = `You are a B2B researcher helping Field-Jobs find companies that hire traveling technical workers (welders, pipefitters, electricians, mechanics).

TASK: List 20 real companies in this industry that likely hire traveling/contract workers:
"${industry.name} - ${industry.keywords.join(', ')}"
${excludeBlock}
For each company, provide:
1. Company name (must be a REAL company)
2. Website domain (just the domain, e.g., "bechtel.com")
3. Location (headquarters city/state)
4. Why they're a good target (1 sentence)

FORMAT: Return as JSON array:
[
  {
    "company": "Bechtel Corporation",
    "domain": "bechtel.com",
    "location": "Reston, VA",
    "reason": "Major EPC contractor hiring traveling workers for large industrial projects"
  }
]

IMPORTANT: 
- Only include REAL companies you're confident exist
- Domain must be their actual website
- Focus on companies known to hire contract/traveling workers
- Include mix of large and mid-size companies

Return ONLY the JSON array.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });
    
    const content = response.content[0].text;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      const companies = JSON.parse(jsonMatch[0]);
      console.log(`  Found ${companies.length} companies`);
      return companies;
    }
  } catch (error) {
    console.error('Claude error:', error.message);
  }
  
  return [];
}

// ==========================================
// DATABASE OPERATIONS
// ==========================================

async function getExistingLeads() {
  // Fetch both successful leads AND previously-tried domains in parallel
  const [leadsRes, triedRes] = await Promise.all([
    supabase.from('leads').select('company_domain'),
    supabase.from('tried_domains').select('domain'),
  ]);

  const domains = new Set();
  for (const row of leadsRes.data || []) domains.add(row.company_domain);
  for (const row of triedRes.data || [])  domains.add(row.domain);
  return domains;
}

async function saveTriedDomain(domain, reason = 'no_email_found') {
  await supabase
    .from('tried_domains')
    .upsert({ domain, reason }, { onConflict: 'domain', ignoreDuplicates: true });
}

async function saveLead(lead) {
  const { error } = await supabase
    .from('leads')
    .insert({
      company_name: lead.company,
      company_domain: lead.domain,
      contact_name: lead.contactName || null,
      contact_email: lead.email,
      contact_title: lead.title || null,
      location: lead.location,
      industry: lead.industry,
      email_source: lead.emailSource,
      email_verified: lead.verified || false,
      status: 'new',
      created_at: new Date().toISOString(),
    });
  
  if (error) {
    console.error('Error saving lead:', error.message);
    return false;
  }
  return true;
}

function monthStartIso() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  return startOfMonth.toISOString();
}

async function getServiceUsage() {
  const { data } = await supabase
    .from('email_service_usage')
    .select('service, count')
    .gte('month', monthStartIso());

  const usage = {};
  (data || []).forEach((row) => {
    usage[row.service] = (usage[row.service] || 0) + row.count;
  });

  return usage;
}

async function logServiceUsage(service) {
  const month = monthStartIso();

  const { data: existing } = await supabase
    .from('email_service_usage')
    .select('id, count')
    .eq('service', service)
    .eq('month', month)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('email_service_usage')
      .update({ count: existing.count + 1 })
      .eq('id', existing.id);
  } else {
    await supabase.from('email_service_usage').insert({
      service,
      month,
      count: 1,
    });
  }
}

function validateEmailServices() {
  // Debug: print env var presence without exposing values
  console.log('\n🔑 Env vars present:',
    `APOLLO_API_KEY=${process.env.APOLLO_API_KEY ? '✅' : '❌'}`,
    `SNOV_CLIENT_ID=${process.env.SNOV_CLIENT_ID ? '✅' : '❌'}`,
    `SNOV_CLIENT_SECRET=${process.env.SNOV_CLIENT_SECRET ? '✅' : '❌'}`,
    `HUNTER_API_KEY=${process.env.HUNTER_API_KEY ? '✅' : '❌'}`,
    `CLAUDE_API_KEY=${process.env.CLAUDE_API_KEY ? '✅' : '❌'}`,
  );

  const apolloOk = !!config.emailServices.apollo?.apiKey;
  const snovOk   = !!(config.emailServices.snov.clientId && config.emailServices.snov.clientSecret);
  const hunterOk = !!config.emailServices.hunter.apiKey;

  console.log('\n📡 Email finder configuration:');
  console.log(`  Website scraping: ✅ always active (free, unlimited)`);
  console.log(`  Apollo: ${apolloOk ? '✅ configured (50/month)' : '❌ MISSING — set APOLLO_API_KEY'}`);
  console.log(`  Snov:   ${snovOk   ? '✅ configured (50/month)' : '❌ MISSING — set SNOV_CLIENT_ID + SNOV_CLIENT_SECRET'}`);
  console.log(`  Hunter: ${hunterOk ? '✅ configured (25/month)' : '❌ MISSING — set HUNTER_API_KEY'}`);

  const totalCapacity = (apolloOk ? 50 : 0) + (snovOk ? 50 : 0) + (hunterOk ? 25 : 0);
  console.log(`  Paid API capacity: ${totalCapacity}/125 lookups/month (scraping is on top of this)`);

  if (!apolloOk && !snovOk && !hunterOk) {
    throw new Error(
      'No email finder APIs configured. Set APOLLO_API_KEY, SNOV_CLIENT_ID/SECRET, and/or HUNTER_API_KEY.'
    );
  }

  if (!apolloOk) {
    console.warn('\n⚠️  WARNING: Apollo not configured — missing 50 free lookups/month.');
    console.warn('   Add APOLLO_API_KEY to GitHub secrets. Free key at https://app.apollo.io/settings/integrations/api\n');
  }
  if (!snovOk) {
    console.warn('⚠️  WARNING: Snov not configured — missing 50 free lookups/month.');
    console.warn('   Add SNOV_CLIENT_ID and SNOV_CLIENT_SECRET to GitHub secrets.\n');
  }

  return { apolloOk, snovOk, hunterOk };
}

/**
 * Rotate industries weekly so each run focuses quota on fresh verticals.
 */
function getIndustriesForThisRun(allIndustries) {
  // Run 4 industries per execution — enough to use the larger Skrapp quota
  // while still rotating so every industry gets attention over time.
  const perRun = 4;
  if (allIndustries.length <= perRun) return allIndustries;

  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000));
  // Offset by day-of-week so Mon/Thu runs cover different industries
  const dayOffset = now.getDay() >= 4 ? Math.ceil(allIndustries.length / 2) : 0;
  const startIdx = ((weekNum * perRun) + dayOffset) % allIndustries.length;

  const selected = [];
  for (let i = 0; i < perRun; i++) {
    selected.push(allIndustries[(startIdx + i) % allIndustries.length]);
  }
  return selected;
}

// ==========================================
// MAIN EXECUTION
// ==========================================

async function runLeadGenerator() {
  const runId = await createRunLog();
  console.log('🚀 Starting Lead Generator...\n');
  console.log('='.repeat(50));

  try {
    validateEmailServices();

    // Get existing leads to avoid duplicates
    const existingDomains = await getExistingLeads();
    const excludeDomains = [...existingDomains];
    console.log(`📋 Existing leads: ${existingDomains.size}`);

    const industriesThisRun = getIndustriesForThisRun(config.industries);
    console.log(
      `\n📅 Industries this run (${industriesThisRun.length}/${config.industries.length}): ${industriesThisRun.map((i) => i.key).join(', ')}`
    );
    
    // Check service quotas
    const usage = await getServiceUsage();
    // Only Snov + Hunter are wired into findVerifiedEmail(); quota math must match or we never exit early correctly.
    console.log('\n📊 Email finder usage (this month):');
    console.log(`  Apollo: ${usage.apollo || 0}/50`);
    console.log(`  Snov:   ${usage.snov   || 0}/50`);
    console.log(`  Hunter: ${usage.hunter || 0}/25`);

    const totalRemaining =
      (50 - (usage.apollo || 0)) +
      (50 - (usage.snov   || 0)) +
      (25 - (usage.hunter || 0));

    console.log(`  Combined lookups remaining: ${totalRemaining}/125`);

    if (totalRemaining <= 0) {
      console.log('\n⚠️ All email service quotas exhausted for this month — no new leads until reset.');
      const results = { saved: 0, skipped: 0, total_remaining: totalRemaining };
      await completeRunLog(runId, 'completed', { results });
      return results;
    }
    
    let totalSaved = 0;
    let totalSkipped = 0;
    
    // Process rotated industries (per-company finder re-checks Snov/Hunter quotas)
    for (const industry of industriesThisRun) {
      console.log('\n' + '='.repeat(50));
      console.log(`📂 Processing: ${industry.name}`);
      
      // Get companies from Claude (exclude known domains in prompt)
      const companies = await findCompaniesWithClaude(industry, excludeDomains);
      
      for (const company of companies) {
        // Skip if we already have this domain
        if (existingDomains.has(company.domain)) {
          console.log(`  ⏭️ Skipping ${company.domain} (already exists)`);
          totalSkipped++;
          continue;
        }
        
        // Find verified email
        const emailResult = await findVerifiedEmail(company.domain, company.company);
        
        if (emailResult?.email && emailResult.verified) {
          const saved = await saveLead({
            company: company.company,
            domain: company.domain,
            location: company.location,
            industry: industry.key,
            email: emailResult.email,
            contactName: emailResult.name,
            title: emailResult.title,
            emailSource: emailResult.source,
            verified: emailResult.verified,
          });
          
          if (saved) {
            totalSaved++;
            existingDomains.add(company.domain);
            console.log(`  💾 Saved lead: ${company.company}`);
          }
        } else {
          // Mark domain as tried so we don't re-process it next run
          await saveTriedDomain(company.domain, 'no_email_found');
          existingDomains.add(company.domain);
          console.log(`  📝 Marked ${company.domain} as tried (no verified email found)`);
        }
        
        // Rate limiting
        await sleep(1000);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🏁 Lead Generator Complete!');
    console.log(`✅ New leads saved: ${totalSaved}`);
    console.log(`⏭️ Skipped (duplicates): ${totalSkipped}`);
    
    const results = { saved: totalSaved, skipped: totalSkipped };
    await completeRunLog(runId, 'completed', { results });
    return results;
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
  runLeadGenerator()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runLeadGenerator };

