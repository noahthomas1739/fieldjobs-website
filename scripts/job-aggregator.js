// ==========================================
// FIELD JOBS - JOB AGGREGATOR
// Pulls jobs from free APIs and adds to platform
// Run: node scripts/job-aggregator.js
// ==========================================

const config = require('./config');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with service role key
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

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
  
  for (const keyword of industry.keywords.slice(0, 2)) { // Limit to conserve API calls
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

/**
 * Fetch jobs from RemoteOK (Free, no API key needed)
 * Note: Only remote jobs, may not fit all industries
 */
async function fetchRemoteOKJobs() {
  try {
    const response = await fetch('https://remoteok.com/api?tag=engineering');
    const data = await response.json();
    
    // Skip first item (it's metadata)
    const jobs = data.slice(1).map(job => ({
      source: 'remoteok',
      external_id: `remoteok_${job.id}`,
      title: job.position,
      company: job.company,
      location: 'Remote',
      description: job.description,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      url: job.url,
      industry: 'general',
      posted_date: new Date(job.date).toISOString(),
      tags: job.tags,
    }));
    
    return jobs.slice(0, 20); // Limit
  } catch (error) {
    console.error('Error fetching RemoteOK jobs:', error.message);
    return [];
  }
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
  
  for (const job of jobs) {
    try {
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
  if (errors > 0) console.log(`❌ Errors: ${errors}`);
  
  return { saved, duplicates, errors };
}

// ==========================================
// MAIN EXECUTION
// ==========================================

async function runJobAggregator() {
  console.log('🚀 Starting Job Aggregator...\n');
  console.log('=' .repeat(50));
  
  const allJobs = [];
  
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
  
  // RemoteOK (general)
  console.log(`\n📂 Fetching remote jobs...`);
  const remoteJobs = await fetchRemoteOKJobs();
  console.log(`  RemoteOK: ${remoteJobs.length} jobs`);
  allJobs.push(...remoteJobs);
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Total jobs fetched: ${allJobs.length}`);
  
  // Save to database
  const results = await saveJobsToDatabase(allJobs);
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 Job Aggregator Complete!');
  console.log(`Total new jobs added: ${results.saved}`);
  
  return results;
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

