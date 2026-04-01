/**
 * Best-effort recruiting contact from job HTML/text (aggregated listings).
 * Returns null if nothing trustworthy is found.
 */

const EMAIL_RE = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi

const BLOCK_DOMAIN = new Set([
  'adzuna.com',
  'adzuna.co.uk',
  'example.com',
  'test.com',
  'rapidapi.com',
  'linkedin.com',
  'indeed.com',
  'glassdoor.com',
  'google.com',
])

const BLOCK_LOCAL = /^(noreply|no-reply|donotreply|no_reply|mailer-daemon|postmaster|bounce|newsletter)$/i

const PREFER_LOCAL = /^(careers|jobs|hr|recruiting|talent|apply|staffing|recruitment)$/i

function stripHtml(html) {
  if (!html) return ''
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreEmail(raw) {
  const lower = raw.toLowerCase()
  const [local, domain] = lower.split('@')
  if (!domain) return -1
  const base = domain.replace(/^www\./, '')
  if (BLOCK_DOMAIN.has(base)) return -1
  if (BLOCK_LOCAL.test(local)) return -1
  let score = 0
  if (PREFER_LOCAL.test(local)) score += 10
  if (base.includes('hsgi') || base.includes('staff') || base.includes('hire')) score += 2
  return score
}

function extractRecruiterEmail(htmlOrText) {
  const text = stripHtml(htmlOrText)
  const matches = text.match(EMAIL_RE) || []
  const seen = new Set()
  let best = null
  let bestScore = -1
  for (const raw of matches) {
    const normalized = raw.toLowerCase()
    if (seen.has(normalized)) continue
    seen.add(normalized)
    const s = scoreEmail(normalized)
    if (s > bestScore) {
      bestScore = s
      best = normalized
    }
  }
  return bestScore >= 0 ? best : null
}

module.exports = { extractRecruiterEmail, stripHtml }
