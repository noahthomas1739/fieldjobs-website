/**
 * Job seeker marketing / digest email (separate from employer cold outreach).
 * Edit copy here; preview: node scripts/job-seeker-digest.js --dry-run --limit 1
 */

const DIGEST_UTM =
  'https://field-job.com?utm_source=email&utm_medium=job_seeker_digest&utm_campaign=weekly';

function subjectLine() {
  return 'New traveling & field roles on Field-Jobs';
}

/**
 * Simple HTML; matches Field-Jobs orange accent (inline styles for clients).
 */
function buildDigestHtml({ firstName, activeJobsCount, listingUrl }) {
  const name = firstName && firstName.trim() ? firstName.trim() : 'there';
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr><td style="height:4px;background:#ea580c;"></td></tr>
        <tr><td style="padding:28px 32px;font-size:16px;line-height:1.6;color:#334155;">
          <p style="margin:0 0 16px 0;">Hi ${escapeHtml(name)},</p>
          <p style="margin:0 0 16px 0;">There are <strong>${activeJobsCount}</strong> active roles on Field-Jobs right now—many employers need people who want <strong>traveling or project-based field work</strong>.</p>
          <p style="margin:0 0 24px 0;">Browse what’s new and set alerts for your trade and region.</p>
          <table role="presentation" cellspacing="0" cellpadding="0"><tr>
            <td style="border-radius:8px;background:#ea580c;">
              <a href="${listingUrl}" target="_blank" style="display:inline-block;padding:14px 24px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;">See open roles →</a>
            </td>
          </tr></table>
          <p style="margin:24px 0 0 0;font-size:13px;color:#64748b;line-height:1.5;">
            You’re receiving this because you have a job seeker profile on Field-Jobs.
            <a href="https://field-job.com/privacy" style="color:#ea580c;">Privacy</a>
            · questions: <a href="mailto:noah.thomas@field-jobs.co" style="color:#64748b;">noah.thomas@field-jobs.co</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildDigestText({ firstName, activeJobsCount, listingUrl }) {
  const name = firstName && firstName.trim() ? firstName.trim() : 'there';
  return `Hi ${name},

There are ${activeJobsCount} active roles on Field-Jobs right now—many employers need people who want traveling or project-based field work.

Browse open roles: ${listingUrl}

You’re receiving this because you have a job seeker profile on Field-Jobs.
Privacy: https://field-job.com/privacy
Questions: noah.thomas@field-jobs.co
`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  DIGEST_UTM,
  subjectLine,
  buildDigestHtml,
  buildDigestText,
};
