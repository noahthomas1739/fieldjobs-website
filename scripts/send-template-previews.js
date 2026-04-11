#!/usr/bin/env node
/**
 * Send all 5 employer outreach templates to one address (HTML + text).
 * Usage: node scripts/send-template-previews.js you@example.com
 * Or:    PREVIEW_TO_EMAIL=you@example.com node scripts/send-template-previews.js
 *
 * Requires RESEND_API_KEY in .env.local (same as production outreach).
 *
 * HTML only (no send): node scripts/render-employer-outreach-html.js
 * Copy lives in: scripts/outreach-employer-templates.js
 */
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

if (!process.env.RESEND_API_KEY) {
  console.error('Missing RESEND_API_KEY. Add it to .env.local (same as GitHub Actions secret).');
  process.exit(1);
}

const { sendTemplatePreviews } = require('./email-outreach');

function resolveRecipient() {
  const arg = process.argv[2];
  if (arg) return arg.trim();
  if (process.env.PREVIEW_TO_EMAIL) return process.env.PREVIEW_TO_EMAIL.trim();
  try {
    return execSync('git config user.email', { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const to = resolveRecipient();
if (!to) {
  console.error('Set a recipient: node scripts/send-template-previews.js <email>');
  process.exit(1);
}

sendTemplatePreviews(to)
  .then(() => {
    console.log('Done. Check inbox (and spam) for 5 messages.');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
