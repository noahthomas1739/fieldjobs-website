// ==========================================
// FIELD JOBS - LEAD GENERATOR
// Uses Claude + Multiple Email Finding Services
// Run: node scripts/lead-generator.js
// ==========================================

const config = require('./config');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

// Initialize clients
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);
const anthropic = new Anthropic({ apiKey: config.claude.apiKey });

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

/**
 * Try all email finding services in rotation
 * Hunter: 25/month, Snov: 50/month = 75 verified emails/month
 */
async function findVerifiedEmail(companyDomain, companyName) {
  console.log(`  🔍 Finding email for ${companyDomain}...`);
  
  // Get usage counts from database
  const usage = await getServiceUsage();
  
  // Available services with their monthly limits
  const services = [
    { name: 'snov', fn: findEmailSnov, verifyFn: verifyEmailSnov, limit: 50 },
    { name: 'hunter', fn: findEmailHunter, verifyFn: verifyEmailHunter, limit: 25 },
  ].filter(s => (usage[s.name] || 0) < s.limit);
  
  if (services.length === 0) {
    console.log(`    ⚠️ All email finding quotas exhausted for this month`);
    console.log(`    📊 Usage: Snov ${usage.snov || 0}/50, Hunter ${usage.hunter || 0}/25`);
    return null;
  }
  
  for (const service of services) {
    try {
      const result = await service.fn(companyDomain, companyName);
      
      if (result?.email) {
        // Log usage (counts against monthly limit)
        await logServiceUsage(service.name);
        
        // If already verified by the service, return it
        if (result.verified) {
          console.log(`    ✅ Found verified via ${service.name}: ${result.email}`);
          return result;
        }
        
        // If high confidence (>80%), trust it even if not explicitly verified
        if (result.confidence && result.confidence > 80) {
          console.log(`    ✅ High-confidence email (${result.confidence}%) via ${service.name}: ${result.email}`);
          result.verified = true;
          return result;
        }
        
        // Try to verify with the same service's verifier
        if (service.verifyFn) {
          console.log(`    🔄 Verifying ${result.email}...`);
          const verification = await service.verifyFn(result.email);
          
          if (verification?.verified) {
            console.log(`    ✅ Verified: ${result.email}`);
            result.verified = true;
            return result;
          } else {
            console.log(`    ⚠️ Verification status: ${verification?.status || 'unknown'}`);
            // Still return if status is accept_all (catch-all domain)
            if (verification?.status === 'accept_all') {
              result.verified = true;
              result.note = 'accept_all';
              return result;
            }
          }
        }
      }
      
      // Rate limiting between services
      await sleep(1000);
    } catch (error) {
      console.error(`    Error with ${service.name}:`, error.message);
    }
  }
  
  console.log(`    ❌ No verified email found`);
  return null;
}

// ==========================================
// CLAUDE COMPANY RESEARCH
// ==========================================

/**
 * Use Claude to find relevant companies in an industry
 * Claude returns company info, we find real emails separately
 */
async function findCompaniesWithClaude(industry) {
  console.log(`\n🤖 Asking Claude for ${industry.name} companies...`);
  
  const prompt = `You are a B2B researcher helping Field-Jobs find companies that hire traveling technical workers (welders, pipefitters, electricians, mechanics).

TASK: List 20 real companies in this industry that likely hire traveling/contract workers:
"${industry.name} - ${industry.keywords.join(', ')}"

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
      model: 'claude-sonnet-4-20250514',
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
  const { data } = await supabase
    .from('leads')
    .select('company_domain');
  
  return new Set((data || []).map(l => l.company_domain));
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

async function getServiceUsage() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const { data } = await supabase
    .from('email_service_usage')
    .select('service, count')
    .gte('month', startOfMonth.toISOString());
  
  const usage = {};
  (data || []).forEach(row => {
    usage[row.service] = row.count;
  });
  
  return usage;
}

async function logServiceUsage(service) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  // Upsert usage count
  const { data: existing } = await supabase
    .from('email_service_usage')
    .select('id, count')
    .eq('service', service)
    .gte('month', startOfMonth.toISOString())
    .single();
  
  if (existing) {
    await supabase
      .from('email_service_usage')
      .update({ count: existing.count + 1 })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('email_service_usage')
      .insert({
        service,
        month: startOfMonth.toISOString(),
        count: 1,
      });
  }
}

// ==========================================
// MAIN EXECUTION
// ==========================================

async function runLeadGenerator() {
  console.log('🚀 Starting Lead Generator...\n');
  console.log('='.repeat(50));
  
  // Get existing leads to avoid duplicates
  const existingDomains = await getExistingLeads();
  console.log(`📋 Existing leads: ${existingDomains.size}`);
  
  // Check service quotas
  const usage = await getServiceUsage();
  console.log('\n📊 Email Service Usage This Month:');
  console.log(`  Apollo: ${usage.apollo || 0}/50`);
  console.log(`  Snov: ${usage.snov || 0}/50`);
  console.log(`  Skrapp: ${usage.skrapp || 0}/150`);
  console.log(`  Hunter: ${usage.hunter || 0}/25`);
  
  const totalRemaining = (50 - (usage.apollo || 0)) + 
                         (50 - (usage.snov || 0)) + 
                         (150 - (usage.skrapp || 0)) + 
                         (25 - (usage.hunter || 0));
  
  console.log(`  Total remaining: ${totalRemaining}`);
  
  if (totalRemaining <= 0) {
    console.log('\n⚠️ All email service quotas exhausted for this month!');
    return { saved: 0, skipped: 0 };
  }
  
  let totalSaved = 0;
  let totalSkipped = 0;
  
  // Process each industry
  for (const industry of config.industries) {
    if (totalRemaining - totalSaved <= 0) break;
    
    console.log('\n' + '='.repeat(50));
    console.log(`📂 Processing: ${industry.name}`);
    
    // Get companies from Claude
    const companies = await findCompaniesWithClaude(industry);
    
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
        // Save the lead
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
      }
      
      // Rate limiting
      await sleep(1000);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 Lead Generator Complete!');
  console.log(`✅ New leads saved: ${totalSaved}`);
  console.log(`⏭️ Skipped (duplicates): ${totalSkipped}`);
  
  return { saved: totalSaved, skipped: totalSkipped };
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

