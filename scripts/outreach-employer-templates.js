/**
 * Employer cold-outreach copy + cadence (used by email-outreach.js).
 *
 * Edit subjects/bodies here. Placeholders: {company}, {industry}
 * UTM link must match EMPLOYERS_UTM below (used for HTML linkification + CTA).
 *
 * Preview real sends:  node scripts/send-template-previews.js you@email.com
 * Preview HTML files: node scripts/render-employer-outreach-html.js
 */

const EMPLOYERS_UTM =
  'https://field-job.com/employers?utm_source=email&utm_medium=outreach&utm_campaign=cold_email';

const emailTemplates = {
  1: {
    subject: 'Traveling workers ready for {industry} projects',
    body: `Hello,

Field-Jobs connects employers with skilled workers who actively want to travel for project-based work.

We have 4,000+ active tradespeople—welders, pipefitters, electricians, mechanics—and live job listings on the platform, so the candidate pool stays engaged.

May I ask how long it typically takes {company} to fill a traveling role?

When you have a moment: ${EMPLOYERS_UTM}`,
  },
  2: {
    subject: 'Your first job post is free',
    body: `Hello,

A straightforward offer: your first job post on Field-Jobs is free.

You reach active candidates who want traveling work, alongside other employers’ live listings. If the quality fits your bar, keep posting; if not, you are not out anything.

Workers join Field-Jobs because they want road work—we built the marketplace around that.

Post at no cost: ${EMPLOYERS_UTM}`,
  },
  3: {
    subject: 'Skip the "will you travel?" conversation',
    body: `Hello,

On general job boards, a lot of screening time goes to candidates who are not serious about travel or per-diem work.

On Field-Jobs, candidates opt in for road work. The site also carries live roles from other employers, so workers see an active marketplace—not an empty feed.

See employer tools here: ${EMPLOYERS_UTM}`,
  },
  4: {
    subject: 'Time-to-fill is killing margins',
    body: `Hello,

Every day a role sits open carries cost:
• Billable hours
• Client relationships
• Margin

Faster fills help across the board. Field-Jobs already has active candidates and live job posts—adding your role builds on that momentum.

Post your first job free: ${EMPLOYERS_UTM}`,
  },
  5: {
    subject: 'Closing the loop',
    body: `Hello,

This is my last note in this series: traveling-focused candidates, live listings on the platform, and your first post is still free—no obligation.

If timing was not right before, you can pick it up anytime here: ${EMPLOYERS_UTM}`,
  },
};

/** Days after email 1 for each step (see email-outreach.js follow-up logic). */
const emailSchedule = {
  1: 0,
  2: 3,
  3: 7,
  4: 14,
  5: 21,
};

module.exports = {
  EMPLOYERS_UTM,
  emailTemplates,
  emailSchedule,
};
