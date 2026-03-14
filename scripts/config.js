// ==========================================
// FIELD JOBS AUTOMATION - CONFIGURATION
// ==========================================

// Load environment variables from .env.local
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const config = {
  // Supabase (from your existing .env.local)
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY, // Need service key for backend scripts
  },

  // Email Finding Services (FREE TIERS)
  // Total: 75 verified emails/month
  emailServices: {
    // Hunter.io - 25 free searches/month
    // Get key at: https://hunter.io/api_keys
    hunter: {
      apiKey: process.env.HUNTER_API_KEY,
      monthlyLimit: 25,
    },
    // Snov.io - 50 free credits/month
    // You have: API key = client_id, Secret = client_secret
    snov: {
      clientId: process.env.SNOV_CLIENT_ID,
      clientSecret: process.env.SNOV_CLIENT_SECRET,
      monthlyLimit: 50,
    },
  },

  // Job Aggregation APIs (FREE TIERS)
  jobApis: {
    adzuna: {
      appId: process.env.ADZUNA_APP_ID,
      apiKey: process.env.ADZUNA_API_KEY,
    },
    jsearch: {
      apiKey: process.env.JSEARCH_API_KEY, // RapidAPI key
    },
  },

  // Claude API
  claude: {
    apiKey: process.env.CLAUDE_API_KEY,
  },

  // Resend (for email sending)
  resend: {
    apiKey: process.env.RESEND_API_KEY,
  },

  // Target Industries - TRAVEL/FIELD FOCUSED KEYWORDS
  industries: [
    { key: 'nuclear', name: 'Nuclear Power', keywords: ['traveling nuclear technician', 'nuclear outage', 'radiation protection technician', 'nuclear contractor'] },
    { key: 'oil-gas', name: 'Oil & Gas', keywords: ['traveling pipeline welder', 'oilfield technician', 'drilling rig', 'pipeline construction'] },
    { key: 'renewable', name: 'Renewable Energy', keywords: ['traveling solar installer', 'wind turbine technician travel', 'solar EPC', 'wind farm construction'] },
    { key: 'construction', name: 'Construction', keywords: ['traveling welder', 'traveling pipefitter', 'industrial electrician travel', 'road crew construction'] },
    { key: 'aerospace', name: 'Aerospace', keywords: ['traveling aircraft mechanic', 'aviation maintenance technician', 'aerospace contractor'] },
    { key: 'manufacturing', name: 'Manufacturing', keywords: ['traveling millwright', 'industrial mechanic travel', 'plant shutdown contractor'] },
    { key: 'mining', name: 'Mining', keywords: ['traveling heavy equipment operator', 'mining contractor', 'mine electrician'] },
    { key: 'utilities', name: 'Utilities', keywords: ['traveling lineman', 'transmission line worker', 'substation technician travel'] },
    { key: 'ai-datacenter', name: 'AI Data Centers', keywords: ['data center technician travel', 'data center construction', 'critical facility technician'] },
  ],

  // Email Settings
  email: {
    fromEmail: 'noah.thomas@field-jobs.co',
    fromName: 'Noah Thomas',
    replyTo: 'noah.thomas@field-jobs.co',
    dailyLimit: 100, // Start conservative, increase as domain warms up
  },

  // Rate Limits
  rateLimits: {
    emailsPerDay: 100,
    leadsPerWeek: 275, // Combined free tier limits
    jobsPerDay: 50,
  },
};

module.exports = config;

