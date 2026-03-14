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

  // Target Industries
  industries: [
    { key: 'nuclear', name: 'Nuclear Power', keywords: ['nuclear', 'power plant', 'radiation', 'reactor'] },
    { key: 'oil-gas', name: 'Oil & Gas', keywords: ['oil', 'gas', 'petroleum', 'drilling', 'pipeline'] },
    { key: 'renewable', name: 'Renewable Energy', keywords: ['solar', 'wind', 'renewable', 'clean energy'] },
    { key: 'construction', name: 'Construction', keywords: ['construction', 'contractor', 'builder', 'infrastructure'] },
    { key: 'aerospace', name: 'Aerospace', keywords: ['aerospace', 'aviation', 'aircraft', 'defense'] },
    { key: 'manufacturing', name: 'Manufacturing', keywords: ['manufacturing', 'fabrication', 'industrial'] },
    { key: 'mining', name: 'Mining', keywords: ['mining', 'mineral', 'excavation'] },
    { key: 'utilities', name: 'Utilities', keywords: ['utility', 'electric', 'transmission', 'substation'] },
    { key: 'ai-datacenter', name: 'AI Data Centers', keywords: ['data center', 'datacenter', 'AI infrastructure', 'GPU'] },
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

