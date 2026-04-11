#!/usr/bin/env node
/**
 * Writes employer-outreach-1.html … 5.html under scripts/preview-html/
 * Open any file in Chrome/Safari to check layout (same HTML as Resend, minus client quirks).
 *
 *   node scripts/render-employer-outreach-html.js
 */
const path = require('path');
const { writeEmployerOutreachHtmlPreviews } = require('./email-outreach');

const outDir = path.join(__dirname, 'preview-html');
writeEmployerOutreachHtmlPreviews(outDir);
console.log(`Wrote employer-outreach-1.html … employer-outreach-5.html\n→ ${outDir}`);
