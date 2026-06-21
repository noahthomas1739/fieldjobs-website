# Field Jobs Automation Scripts

## Overview

This folder contains automation scripts for:
1. **Job Aggregation** - Pulls jobs from external APIs to populate the platform
2. **Lead Generation** - Uses Claude + email verification services to find verified leads
3. **Email Outreach** - Sends cadence emails to verified leads

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Database
Run `database-setup.sql` in your Supabase SQL Editor.

### 3. Configure Environment Variables
Add these to your `.env.local`:

```env
# Required (you should already have these)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_key
CLAUDE_API_KEY=your_claude_key

# Email Finding Services (75 verified emails/month FREE)
HUNTER_API_KEY=           # https://hunter.io/api_keys (25 free/month)
SNOV_CLIENT_ID=           # Your Snov API key (50 free/month)
SNOV_CLIENT_SECRET=       # Your Snov Secret key

# Job APIs (get free API keys)
ADZUNA_APP_ID=            # https://developer.adzuna.com (250 free/month)
ADZUNA_API_KEY=
JSEARCH_API_KEY=          # https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch (200 free/month)

# Admin dashboard (/admin/leads) — comma-separated emails allowed to view ops stats
LEAD_GEN_ADMIN_EMAILS=noah.thomas@field-jobs.co
```

Also add `SNOV_CLIENT_ID`, `SNOV_CLIENT_SECRET`, `HUNTER_API_KEY`, and `LEAD_GEN_ADMIN_EMAILS` to **GitHub Actions secrets** and **Vercel** environment variables.

### 4. Run Scripts Manually

```bash
# Aggregate jobs from external APIs
npm run jobs:aggregate

# Generate leads with verified emails
npm run leads:generate

# Send outreach emails
npm run emails:send

# Check lead gen pipeline health
npm run leads:health

# Run all scripts
npm run automation:all
```

## Script Details

### Job Aggregator (`job-aggregator.js`)
- Pulls jobs from Adzuna and JSearch
- Filters for target industries and candidate-fit relevance
- Stores in `aggregated_jobs` table
- **Schedule**: Every 6 hours
- Logs each run in `automation_runs` with quality metrics (`filtered_out_off_target`, `filtered_out_rate`)

### Lead Generator (`lead-generator.js`)
- Uses Claude to find relevant companies (excludes existing domains in prompt)
- Rotates 2 industries per week to conserve API quota
- Verifies emails using Snov + Hunter (rotates to maximize free tier)
- Only saves leads with **verified** emails
- Warns loudly if Snov credentials are missing (25/mo cap without it)
- **Schedule**: Mondays at 8 AM EST

### Lead Gen Health (`lead-gen-health.js`)
- Reports quota usage, lead counts, and recent `automation_runs`
- **Schedule**: Tuesdays at 9 AM EST (after Monday lead gen)
- Fails scheduled runs when the pipeline is unhealthy (opens a GitHub issue)
- **Admin UI**: `/admin/leads` (requires `LEAD_GEN_ADMIN_EMAILS` env var)

### Email Outreach (`email-outreach.js`)
- Sends 5-email cadence to verified leads
- Respects daily limits (100/day default)
- Random delays to avoid spam detection
- **Schedule**: 3x daily (9am, 1pm, 5pm EST)

## Free Tier Limits

| Service | Monthly Limit | Used For |
|---------|---------------|----------|
| Snov.io | 50 | Email finding + verification |
| Hunter.io | 25 | Email finding + verification |
| Adzuna | 250 calls | Job listings |
| JSearch | 200 calls | Job listings |
| **Total Emails** | **75/month** | Verified, real emails |

## Automation (GitHub Actions)

The `.github/workflows/automation.yml` file runs these scripts on a schedule:

| Script | Schedule |
|--------|----------|
| Job Aggregator | Every 6 hours |
| Lead Generator | Mondays 8 AM EST |
| Email Outreach | 9 AM, 1 PM, 5 PM EST |

### Manual Trigger
You can also trigger scripts manually from GitHub Actions → Field Jobs Automation → Run workflow

## Database Tables

| Table | Purpose |
|-------|---------|
| `aggregated_jobs` | Jobs from external APIs |
| `leads` | Companies/contacts for outreach |
| `email_log` | Tracks all sent emails |
| `email_service_usage` | Tracks API usage |
| `automation_runs` | Script execution logs |

## Troubleshooting

### "No leads generated"
- Check if email service quotas are exhausted (`email_service_usage` table)
- Verify API keys are correct in `.env.local` and **GitHub Actions secrets**
- Ensure **Snov** is configured (`SNOV_CLIENT_ID`, `SNOV_CLIENT_SECRET`) — without it you cap at 25/mo
- Run `npm run leads:health` or visit `/admin/leads` (set `LEAD_GEN_ADMIN_EMAILS` in Vercel)
- Check GitHub Issues labeled `lead-gen` for automated alerts

### "Emails bouncing"
- Only verified emails should be in the `leads` table
- Check `email_verified = true` filter is working

### "Script failing"
- Check GitHub Actions logs
- Verify Supabase service role key has correct permissions
- Run locally first: `npm run leads:generate`

