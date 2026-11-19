// ==========================================
// FIELD JOBS - BOARD EMPLOYERS
// Finds companies advertising on traveling-trades job boards
// (RoadDogJobs, RoadTechs) and turns them into leads.
//
// Collects company names only — never job titles, descriptions, pay,
// or poster contact details. Contacts come from the same email finders
// the lead generator uses (website scrape → Apollo → Snov → Hunter).
//
// Run:
//   node scripts/board-employers.js                 collect + enrich
//   node scripts/board-employers.js --collect-only  just update board_employers
//   node scripts/board-employers.js --dry-run       no database; writes a CSV
//   options: --sources=roaddogjobs,roadtechs  --enrich-limit=15
// ==========================================

const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;
const config = require('./config');

const USER_AGENT = 'Mozilla/5.0 (compatible; FieldJobsResearch/1.0; +https://field-jobs.co)';
const REQUEST_DELAY_MS = 3000; // be polite: one request every 3 seconds per site
const RDJ_MAX_PAGES = 40;
const RETRY_NO_EMAIL_DAYS = 30;

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const hit = args.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : fallback;
};

const DRY_RUN = flag('dry-run');
const COLLECT_ONLY = flag('collect-only') || DRY_RUN;
const SOURCES = option('sources', 'roaddogjobs,roadtechs').split(',');
const ENRICH_LIMIT = parseInt(option('enrich-limit', '15'), 10);

// ==========================================
// HTTP + ROBOTS.TXT
// ==========================================

const robotsCache = new Map();

async function getDisallowRules(origin) {
  if (robotsCache.has(origin)) return robotsCache.get(origin);
  const rules = [];
  try {
    const res = await fetch(`${origin}/robots.txt`, { headers: { 'User-Agent': USER_AGENT } });
    if (res.ok) {
      let applies = false;
      for (const raw of (await res.text()).split('\n')) {
        const line = raw.split('#')[0].trim();
        const [key, ...rest] = line.split(':');
        const value = rest.join(':').trim();
        if (/^user-agent$/i.test(key)) applies = value === '*';
        else if (applies && /^disallow$/i.test(key) && value) rules.push(value);
      }
    }
  } catch (error) {
    console.warn(`  ⚠️ Could not read robots.txt for ${origin}: ${error.message}`);
  }
  robotsCache.set(origin, rules);
  return rules;
}

// Disallow rules are path prefixes; '*' matches anything and a trailing '$' anchors the end
function robotsAllows(rules, urlPath) {
  return !rules.some(rule => {
    const anchored = rule.endsWith('$');
    const body = anchored ? rule.slice(0, -1) : rule;
    const pattern = body.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${pattern}${anchored ? '$' : ''}`).test(urlPath);
  });
}

async function politeFetch(url, options = {}) {
  const { origin, pathname, search } = new URL(url);
  const rules = await getDisallowRules(origin);
  if (!robotsAllows(rules, pathname + search)) {
    throw new Error(`robots.txt disallows ${pathname}`);
  }
  await sleep(REQUEST_DELAY_MS);
  const res = await fetch(url, {
    ...options,
    headers: { 'User-Agent': USER_AGENT, ...(options.headers || {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res;
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

// ==========================================
// COMPANY NAME NORMALIZATION
// ==========================================

const NAME_SUFFIXES = /\b(inc|incorporated|llc|l\.l\.c|ltd|limited|corp|corporation|co|company|lp|llp|pllc|plc)\b\.?/g;

function nameKey(name) {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/&/g, ' and ')
    .replace(NAME_SUFFIXES, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// ==========================================
// ROADDOGJOBS
// Search results list every open posting with its employer. Page through
// them (ASP.NET postback, same as clicking the pager) and keep only the
// employer name, employer code and how many postings it has.
// ==========================================

const RDJ_SEARCH = 'https://www.roaddogjobs.com/search';
const RDJ_EMPLOYER_RE = /__doPostBack\(&#39;Employer&#39;, &#39;([a-z0-9]+)&#39;\)">([^<]+)</g;

function rdjFormFields(html) {
  const fields = new URLSearchParams();
  for (const tag of html.match(/<input[^>]+>/g) || []) {
    const name = tag.match(/name="([^"]+)"/)?.[1];
    const type = tag.match(/type="([^"]+)"/)?.[1] || 'text';
    if (!name || ['submit', 'button', 'image'].includes(type)) continue;
    if (['checkbox', 'radio'].includes(type) && !tag.includes('checked')) continue;
    fields.set(name, decodeEntities(tag.match(/value="([^"]*)"/)?.[1] || ''));
  }
  for (const [, name, body] of html.matchAll(/<select name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
    const selected = body.match(/<option selected="selected" value="([^"]*)"/) || body.match(/<option value="([^"]*)"/);
    fields.set(name, decodeEntities(selected?.[1] || ''));
  }
  return fields;
}

function rdjLastPage(html) {
  const pages = [...html.matchAll(/__doPostBack\('Page', '(\d+)'\)/g)].map(m => Number(m[1]));
  return pages.length ? Math.max(...pages) : 1;
}

async function collectRoadDogJobs() {
  console.log('\n🐕 RoadDogJobs: reading employer names from search results...');
  const employers = new Map(); // code -> { name, count }
  let cookie = '';

  const record = (html) => {
    let found = 0;
    for (const [, code, rawName] of html.matchAll(RDJ_EMPLOYER_RE)) {
      const name = decodeEntities(rawName).trim();
      const entry = employers.get(code) || { name, count: 0 };
      entry.count += 1;
      employers.set(code, entry);
      found += 1;
    }
    return found;
  };

  let res = await politeFetch(RDJ_SEARCH);
  cookie = (res.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ');
  let html = await res.text();
  record(html);
  const lastPage = Math.min(rdjLastPage(html), RDJ_MAX_PAGES);

  for (let page = 2; page <= lastPage; page++) {
    const fields = rdjFormFields(html);
    fields.set('__EVENTTARGET', 'Page');
    fields.set('__EVENTARGUMENT', String(page));
    res = await politeFetch(RDJ_SEARCH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: RDJ_SEARCH,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: fields.toString(),
    });
    html = await res.text();
    const found = record(html);
    process.stdout.write(`  page ${page}/${lastPage}: ${found} postings\r`);
    if (!found) break;
  }

  console.log(`\n  ✅ ${employers.size} employers across ${lastPage} pages`);
  return [...employers].map(([code, { name, count }]) => ({
    source: 'roaddogjobs',
    company_name: name,
    rdj_employer_code: code,
    rdj_posting_count: count,
  }));
}

// ==========================================
// ROADTECHS
// Each board has a public "Shops" page listing the firms that pay to
// advertise there. We read the shop names only. Shop contact details sit
// behind a reCAPTCHA by design — we never touch those pages.
// ==========================================

const RT_HOME = 'https://www.roadtechs.com/';

async function collectRoadTechs() {
  console.log('\n🛣️  RoadTechs: reading shop directories...');
  const home = await (await politeFetch(RT_HOME)).text();
  const shopPages = [...new Set([...home.matchAll(/href="(\/shops[a-z]*\.htm)"/g)].map(m => m[1]))];
  const shops = new Map(); // name -> Set(board)

  for (const shopPage of shopPages) {
    let html;
    try {
      html = await (await politeFetch(new URL(shopPage, RT_HOME).href)).text();
    } catch (error) {
      console.warn(`  ⚠️ ${shopPage}: ${error.message}`);
      continue;
    }
    html = html.replace(/<!--[\s\S]*?-->/g, ''); // commented-out shops are no longer listed
    const title = decodeEntities(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || shopPage)
      .replace(/\s+/g, ' ')
      .replace(/^Roadtechs\s*:?\s*/i, '')
      .replace(/\s*(Shops|Business Listings?).*$/i, '')
      .trim();
    let count = 0;
    for (const [, rawName] of html.matchAll(/<a href="\/[a-z0-9]+_[a-z]+\.php"[^>]*>\s*<b>([\s\S]*?)<\/b>\s*<\/a>/g)) {
      const name = decodeEntities(rawName.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
      if (!name) continue;
      if (!shops.has(name)) shops.set(name, new Set());
      shops.get(name).add(title);
      count += 1;
    }
    console.log(`  ${shopPage} (${title}): ${count} shops`);
  }

  console.log(`  ✅ ${shops.size} unique shops across ${shopPages.length} boards`);
  return [...shops].map(([name, boards]) => ({
    source: 'roadtechs',
    company_name: name,
    rt_boards: [...boards].sort(),
  }));
}

// ==========================================
// MERGE + STORE
// ==========================================

function mergeEmployers(rows) {
  const merged = new Map();
  for (const row of rows) {
    const key = nameKey(row.company_name);
    if (!key) continue;
    const entry = merged.get(key) || {
      name_key: key,
      company_name: row.company_name,
      sources: [],
      rdj_employer_code: null,
      rdj_posting_count: 0,
      rt_boards: [],
    };
    if (!entry.sources.includes(row.source)) entry.sources.push(row.source);
    if (row.rdj_employer_code) {
      entry.rdj_employer_code = row.rdj_employer_code;
      entry.rdj_posting_count += row.rdj_posting_count;
    }
    if (row.rt_boards) entry.rt_boards = [...new Set([...entry.rt_boards, ...row.rt_boards])];
    merged.set(key, entry);
  }
  return [...merged.values()].sort((a, b) =>
    b.sources.length - a.sources.length || b.rdj_posting_count - a.rdj_posting_count || a.company_name.localeCompare(b.company_name));
}

function writeCsv(employers, leadNameKeys = new Set()) {
  const outDir = path.join(__dirname, 'exports');
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `board-employers-${new Date().toISOString().slice(0, 10)}.csv`);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [['company_name', 'sources', 'roaddogjobs_open_postings', 'roadtechs_boards', 'already_a_lead'].join(',')];
  for (const e of employers) {
    lines.push([e.company_name, e.sources.join(' + '), e.rdj_posting_count || '', e.rt_boards.join('; '),
      leadNameKeys.has(e.name_key) ? 'yes' : ''].map(esc).join(','));
  }
  fs.writeFileSync(file, lines.join('\n') + '\n');
  return file;
}

async function upsertEmployers(supabase, employers) {
  const now = new Date().toISOString();
  const { data: existing, error } = await supabase
    .from('board_employers')
    .select('name_key, sources, rt_boards');
  if (error) throw new Error(`board_employers read failed — run scripts/add-board-employers.sql first (${error.message})`);
  const known = new Map((existing || []).map(r => [r.name_key, r]));

  let inserted = 0;
  for (const e of employers) {
    const prior = known.get(e.name_key);
    const row = {
      name_key: e.name_key,
      company_name: e.company_name,
      sources: [...new Set([...(prior?.sources || []), ...e.sources])],
      rdj_employer_code: e.rdj_employer_code,
      rdj_posting_count: e.rdj_posting_count,
      rt_boards: [...new Set([...(prior?.rt_boards || []), ...e.rt_boards])],
      last_seen: now,
    };
    if (!prior) inserted += 1;
    const { error: upsertError } = await supabase
      .from('board_employers')
      .upsert(row, { onConflict: 'name_key' });
    if (upsertError) console.error(`  ❌ ${e.company_name}: ${upsertError.message}`);
  }
  console.log(`\n💾 board_employers: ${inserted} new, ${employers.length - inserted} updated`);
}

// ==========================================
// ENRICH → LEADS
// ==========================================

// Domains that are never a company's own website
const NON_COMPANY_DOMAINS = ['roaddogjobs.com', 'roadtechs.com', 'indeed.com', 'linkedin.com', 'facebook.com', 'ziprecruiter.com'];

async function findDomainsWithClaude(anthropic, names) {
  const prompt = `For each company below, give its primary website domain (e.g. "kiewit.com").
These companies post traveling skilled-trades jobs (industrial construction, staffing, outage, pipeline).
If you are not confident, use null. Do not guess.

${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Return ONLY a JSON object mapping each company name exactly as written to a domain string or null.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });
  const json = response.content[0].text.match(/\{[\s\S]*\}/);
  return json ? JSON.parse(json[0]) : {};
}

async function domainResolves(domain) {
  try {
    await dns.resolve(domain);
    return true;
  } catch {
    return false;
  }
}

async function enrichEmployers(supabase, limit) {
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: config.claude.apiKey });
  const { findVerifiedEmail, validateEmailServices } = require('./lead-generator');

  validateEmailServices();

  // Pending rows, plus no-email rows due a retry (a miss is often just an exhausted monthly quota)
  const retryBefore = new Date(Date.now() - RETRY_NO_EMAIL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: pending, error } = await supabase
    .from('board_employers')
    .select('id, company_name, name_key, sources, rdj_posting_count')
    .or(`enrich_status.eq.pending,and(enrich_status.eq.no_email,enrich_attempted_at.lt.${retryBefore})`)
    .order('rdj_posting_count', { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!pending?.length) {
    console.log('\n✅ No pending board employers to enrich');
    return { saved: 0 };
  }

  console.log(`\n🔎 Enriching ${pending.length} board employers...`);
  const { data: leadRows } = await supabase.from('leads').select('id, company_name, company_domain');
  const leadsByName = new Map((leadRows || []).map(l => [nameKey(l.company_name), l]));
  const leadsByDomain = new Map((leadRows || []).map(l => [l.company_domain, l]));

  const mark = (id, fields) => supabase
    .from('board_employers')
    .update({ ...fields, enrich_attempted_at: new Date().toISOString() })
    .eq('id', id);

  // Already a lead under the same company name — link it, spend no quota
  const toLookup = [];
  for (const emp of pending) {
    const lead = leadsByName.get(emp.name_key);
    if (lead) {
      await mark(emp.id, { enrich_status: 'existing_lead', lead_id: lead.id, company_domain: lead.company_domain });
      console.log(`  🔗 ${emp.company_name}: already a lead`);
    } else {
      toLookup.push(emp);
    }
  }
  if (!toLookup.length) return { saved: 0 };

  const domains = await findDomainsWithClaude(anthropic, toLookup.map(e => e.company_name));
  let saved = 0;

  for (const emp of toLookup) {
    const domain = (domains[emp.company_name] || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    if (!domain || NON_COMPANY_DOMAINS.includes(domain) || !(await domainResolves(domain))) {
      await mark(emp.id, { enrich_status: 'no_domain' });
      console.log(`  ❔ ${emp.company_name}: no confident domain`);
      continue;
    }

    const lead = leadsByDomain.get(domain);
    if (lead) {
      await mark(emp.id, { enrich_status: 'existing_lead', lead_id: lead.id, company_domain: domain });
      console.log(`  🔗 ${emp.company_name}: already a lead (${domain})`);
      continue;
    }
    const contact = await findVerifiedEmail(domain, emp.company_name);
    if (!contact?.email) {
      await mark(emp.id, { enrich_status: 'no_email', company_domain: domain });
      console.log(`  ⏭️ ${emp.company_name}: no email yet — retry in ${RETRY_NO_EMAIL_DAYS} days`);
      continue;
    }

    const { data: inserted, error: insertError } = await supabase
      .from('leads')
      .insert({
        company_name: emp.company_name,
        company_domain: domain,
        contact_name: contact.name || null,
        contact_email: contact.email,
        contact_title: contact.title || null,
        industry: 'Traveling trades',
        email_source: contact.source,
        email_verified: contact.verified || false,
        lead_source: emp.sources.join('+'),
        status: 'new',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error(`  ❌ ${emp.company_name}: ${insertError.message}`);
      continue;
    }
    leadsByDomain.set(domain, inserted); // e.g. two Bechtel accounts share bechtel.com
    await mark(emp.id, { enrich_status: 'saved', lead_id: inserted.id, company_domain: domain });
    console.log(`  ✅ ${emp.company_name}: ${contact.name || '(no name)'} <${contact.email}> ${contact.title ? `– ${contact.title}` : ''}`);
    saved += 1;
  }

  return { saved };
}

// ==========================================
// MAIN EXECUTION
// ==========================================

async function runBoardEmployers() {
  console.log('🚀 Starting Board Employers...');
  console.log(`   Sources: ${SOURCES.join(', ')}${DRY_RUN ? ' (dry run — no database)' : ''}`);

  const collected = [];
  if (SOURCES.includes('roaddogjobs')) collected.push(...await collectRoadDogJobs());
  if (SOURCES.includes('roadtechs')) collected.push(...await collectRoadTechs());
  const employers = mergeEmployers(collected);
  console.log(`\n📋 ${employers.length} unique companies (${employers.filter(e => e.sources.length > 1).length} on both boards)`);

  if (DRY_RUN) {
    console.log(`📄 Wrote ${writeCsv(employers)}`);
    return { collected: employers.length };
  }

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(config.supabase.url, config.supabase.serviceKey);
  await upsertEmployers(supabase, employers);

  const { data: leadRows } = await supabase.from('leads').select('company_name');
  console.log(`📄 Wrote ${writeCsv(employers, new Set((leadRows || []).map(l => nameKey(l.company_name))))}`);

  if (COLLECT_ONLY) return { collected: employers.length };
  const { saved } = await enrichEmployers(supabase, ENRICH_LIMIT);
  console.log(`\n🏁 Board Employers complete — ${employers.length} companies tracked, ${saved} new leads saved`);
  return { collected: employers.length, saved };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

if (require.main === module) {
  runBoardEmployers()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runBoardEmployers, enrichEmployers, nameKey };
