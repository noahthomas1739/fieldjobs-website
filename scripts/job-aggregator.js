// ==========================================
// FIELD JOBS - JOB AGGREGATOR
// Pulls jobs from free APIs and adds to platform
// Run: node scripts/job-aggregator.js
// ==========================================

const config = require('./config');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with service role key
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

// Relevance guardrails derived from candidate resume pool:
// favor field/industrial engineering roles and suppress desk/commercial roles.
const POSITIVE_ROLE_REGEX = /\b(engineer|technician|inspector|welder|welding|millwright|electrician|lineman|superintendent|foreman|project\s+manager|construction\s+manager|qa|qc|ndt|radiation|outage|refuel|substation|pipeline|turbine|maintenance|field)\b/i;
const NEGATIVE_ROLE_REGEX = /\b(sales|account\s+executive|inside\s+sales|business\s+development|marketing|customer\s+success|product\s+manager|scrum|proposal\s+writer|technical\s+writer|trader|recruiter)\b/i;

function isRelevantAggregatedJob(job) {
  const text = `${job.title || ''} ${job.description || ''}`;
  const hasPositiveSignal = POSITIVE_ROLE_REGEX.test(text);
  const hasNegativeSignal = NEGATIVE_ROLE_REGEX.test(text);
  return hasPositiveSignal && !hasNegativeSignal;
}

async function createRunLog() {
  const { data, error } = await supabase
    .from('automation_runs')
    .insert({
      script_name: 'job-aggregator',
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

async function auditActiveAlignment(limit = 500) {
  const { data, error } = await supabase
    .from('aggregated_jobs')
    .select('title, description')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('⚠️ Alignment audit failed:', error.message);
    return { checked: 0, negative_matches: 0, rate: 0 };
  }

  const checked = data?.length || 0;
  const negativeMatches = (data || []).filter(job =>
    NEGATIVE_ROLE_REGEX.test(`${job.title || ''} ${job.description || ''}`)
  ).length;

  return {
    checked,
    negative_matches: negativeMatches,
    rate: checked ? Number((negativeMatches / checked).toFixed(4)) : 0,
  };
}

// ==========================================
// JOB SOURCES
// ==========================================

/**
 * Fetch jobs from Adzuna API (Free: 250 calls/month)
 * https://developer.adzuna.com/
 */
async function fetchAdzunaJobs(industry) {
  if (!config.jobApis.adzuna.appId || !config.jobApis.adzuna.apiKey) {
    console.log('⚠️ Adzuna API not configured, skipping...');
    return [];
  }

  const jobs = [];
  
  for (const keyword of industry.keywords) {
    try {
      const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${config.jobApis.adzuna.appId}&app_key=${config.jobApis.adzuna.apiKey}&what=${encodeURIComponent(keyword)}&results_per_page=10&content-type=application/json`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.results) {
        for (const job of data.results) {
          jobs.push({
            source: 'adzuna',
            external_id: `adzuna_${job.id}`,
            title: job.title,
            company: job.company?.display_name || 'Company',
            location: job.location?.display_name || 'United States',
            description: job.description,
            salary_min: job.salary_min,
            salary_max: job.salary_max,
            url: job.redirect_url,
            industry: industry.key,
            posted_date: job.created,
          });
        }
      }
      
      // Rate limiting
      await sleep(500);
    } catch (error) {
      console.error(`Error fetching Adzuna jobs for ${keyword}:`, error.message);
    }
  }
  
  return jobs;
}

/**
 * Fetch jobs from JSearch API (RapidAPI - Free: 200 calls/month)
 * https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
 */
async function fetchJSearchJobs(industry) {
  if (!config.jobApis.jsearch.apiKey) {
    console.log('⚠️ JSearch API not configured, skipping...');
    return [];
  }

  const jobs = [];
  
  for (const keyword of industry.keywords.slice(0, 4)) { // balance coverage vs API limits
    try {
      const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(keyword + ' jobs USA')}&num_pages=1`;
      
      const response = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': config.jobApis.jsearch.apiKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
        }
      });
      
      const data = await response.json();
      
      if (data.data) {
        for (const job of data.data) {
          jobs.push({
            source: 'jsearch',
            external_id: `jsearch_${job.job_id}`,
            title: job.job_title,
            company: job.employer_name,
            location: `${job.job_city || ''}, ${job.job_state || ''}, ${job.job_country || 'US'}`.trim(),
            description: job.job_description,
            salary_min: job.job_min_salary,
            salary_max: job.job_max_salary,
            url: job.job_apply_link,
            industry: industry.key,
            posted_date: job.job_posted_at_datetime_utc,
            employment_type: job.job_employment_type,
          });
        }
      }
      
      // Rate limiting
      await sleep(1000);
    } catch (error) {
      console.error(`Error fetching JSearch jobs for ${keyword}:`, error.message);
    }
  }
  
  return jobs;
}

// ==========================================
// DATABASE OPERATIONS
// ==========================================

/**
 * Save jobs to Supabase
 * Creates aggregated_jobs table if it doesn't exist
 */
async function saveJobsToDatabase(jobs) {
  console.log(`\n💾 Saving ${jobs.length} jobs to database...`);
  
  let saved = 0;
  let duplicates = 0;
  let errors = 0;
  let filteredOut = 0;
  
  for (const job of jobs) {
    try {
      if (!isRelevantAggregatedJob(job)) {
        filteredOut++;
        continue;
      }

      // Check if job already exists
      const { data: existing } = await supabase
        .from('aggregated_jobs')
        .select('id')
        .eq('external_id', job.external_id)
        .single();
      
      if (existing) {
        duplicates++;
        continue;
      }
      
      // Format job for our schema
      // Convert salary to integer (database expects INTEGER, not DECIMAL)
      const salaryMin = job.salary_min ? Math.round(Number(job.salary_min)) : null;
      const salaryMax = job.salary_max ? Math.round(Number(job.salary_max)) : null;
      
      const jobRecord = {
        title: job.title?.substring(0, 200) || 'Untitled',
        company_name: job.company?.substring(0, 100) || 'Unknown Company',
        location: job.location?.substring(0, 200) || 'United States',
        description: job.description?.substring(0, 5000) || '',
        salary_min: salaryMin,
        salary_max: salaryMax,
        external_url: job.url,
        external_id: job.external_id,
        source: job.source,
        industry: job.industry,
        employment_type: job.employment_type || 'full_time',
        is_active: true,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      };
      
      const { error } = await supabase
        .from('aggregated_jobs')
        .insert(jobRecord);
      
      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          duplicates++;
        } else {
          console.error(`Error saving job: ${error.message}`);
          errors++;
        }
      } else {
        saved++;
      }
    } catch (error) {
      console.error(`Error processing job: ${error.message}`);
      errors++;
    }
  }
  
  console.log(`✅ Saved: ${saved}`);
  console.log(`⏭️ Duplicates skipped: ${duplicates}`);
  console.log(`🧹 Filtered out (off-target): ${filteredOut}`);
  if (errors > 0) console.log(`❌ Errors: ${errors}`);
  
  return { saved, duplicates, errors, filteredOut };
}

// ==========================================
// MAIN EXECUTION
// ==========================================

async function runJobAggregator() {
  console.log('🚀 Starting Job Aggregator...\n');
  console.log('=' .repeat(50));

  const runId = await createRunLog();
  
  const allJobs = [];
  
  try {
    // Fetch from each source for each industry
    for (const industry of config.industries) {
      console.log(`\n📂 Fetching jobs for: ${industry.name}`);
      
      // Adzuna
      const adzunaJobs = await fetchAdzunaJobs(industry);
      console.log(`  Adzuna: ${adzunaJobs.length} jobs`);
      allJobs.push(...adzunaJobs);
      
      // JSearch
      const jsearchJobs = await fetchJSearchJobs(industry);
      console.log(`  JSearch: ${jsearchJobs.length} jobs`);
      allJobs.push(...jsearchJobs);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`📊 Total jobs fetched: ${allJobs.length}`);
    
    // Save to database
    const results = await saveJobsToDatabase(allJobs);

    const quality = {
      fetched: allJobs.length,
      saved: results.saved,
      duplicates: results.duplicates,
      filtered_out_off_target: results.filteredOut || 0,
      filtered_out_rate: allJobs.length ? Number(((results.filteredOut || 0) / allJobs.length).toFixed(4)) : 0,
    };
    const activeAlignment = await auditActiveAlignment(500);
    console.log(`📈 Quality check: filtered ${quality.filtered_out_off_target}/${quality.fetched} (${(quality.filtered_out_rate * 100).toFixed(1)}%)`);
    console.log(`🛡️ Active alignment audit: ${activeAlignment.negative_matches}/${activeAlignment.checked} negative-pattern matches`);

    await completeRunLog(runId, 'completed', {
      results: {
        ...results,
        quality,
        active_alignment_audit: activeAlignment,
        industry_count: config.industries.length,
      },
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('🏁 Job Aggregator Complete!');
    console.log(`Total new jobs added: ${results.saved}`);
    
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
  runJobAggregator()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runJobAggregator };

