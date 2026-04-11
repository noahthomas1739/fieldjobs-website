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

  // Target industries — keywords aligned to engineering / field tech resume pool
  industries: [
    {
      key: 'nuclear-outage',
      name: 'Nuclear & outage',
      keywords: [
        'nuclear outage engineer',
        'nuclear welding engineer',
        'radiation protection technician nuclear',
        'nuclear refueling outage',
        'nuclear construction QA',
      ],
    },
    {
      key: 'civil-structural',
      name: 'Civil & structural (industrial)',
      keywords: [
        'structural engineer power plant',
        'civil engineer industrial construction',
        'seismic structural engineer',
        'structural design engineer energy',
        'CADD structural designer nuclear',
      ],
    },
    {
      key: 'welding-qa-ndt',
      name: 'Welding, QA & NDT',
      keywords: [
        'welding engineer',
        'CWI welding inspector',
        'NDT technician ASNT',
        'QA QC inspector construction',
        'welding program engineer',
      ],
    },
    {
      key: 'ie-electrical',
      name: 'Instrumentation & electrical',
      keywords: [
        'instrumentation electrical technician power plant',
        'I&E technician',
        'electrical instrumentation technician',
        'control systems technician power generation',
        'industrial electrician power plant',
      ],
    },
    {
      key: 'field-pm',
      name: 'Field engineer & project management',
      keywords: [
        'field engineer industrial construction',
        'construction project manager energy',
        'site superintendent power plant',
        'construction manager nuclear',
        'EPC project engineer',
      ],
    },
    {
      key: 'oil-gas',
      name: 'Oil & gas',
      keywords: [
        'pipeline construction engineer',
        'oil gas field engineer',
        'petrochemical turnaround planner',
        'refinery maintenance engineer',
      ],
    },
    {
      key: 'renewable',
      name: 'Renewable energy',
      keywords: [
        'wind turbine technician field',
        'solar construction superintendent',
        'utility scale solar EPC',
        'battery storage construction engineer',
      ],
    },
    {
      key: 'utilities-td',
      name: 'Utilities T&D',
      keywords: [
        'transmission line construction',
        'substation technician',
        'traveling lineman utility',
        'utility substation construction',
      ],
    },
    {
      key: 'manufacturing',
      name: 'Industrial manufacturing',
      keywords: [
        'plant maintenance engineer',
        'industrial millwright',
        'factory shutdown manager',
        'process engineer manufacturing',
      ],
    },
    {
      key: 'aerospace-mro',
      name: 'Aerospace & MRO',
      keywords: [
        'aircraft maintenance technician',
        'aviation MRO engineer',
        'aerospace manufacturing engineer',
        'airframe powerplant technician',
      ],
    },
  ],

  // Email Settings
  email: {
    fromEmail: 'noah.thomas@field-jobs.co',
    fromName: 'Noah Thomas',
    replyTo: 'noah.thomas@field-jobs.co',
    dailyLimit: 100, // Start conservative, increase as domain warms up
  },

  // Job seeker digest (scripts/job-seeker-digest.js) — pilot caps via CLI --limit
  jobSeekerDigest: {
    defaultLimit: 50,
  },

  // Rate Limits
  rateLimits: {
    emailsPerDay: 100,
    leadsPerWeek: 275, // Combined free tier limits
    jobsPerDay: 50,
  },
};

module.exports = config;

