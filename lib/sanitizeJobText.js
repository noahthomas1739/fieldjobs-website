// Shared text-cleaning helpers for job description/requirements/benefits
// text, used both at render time (lib/formatJobDescription.tsx) and at
// ingestion time (scripts/job-aggregator.js) so scraped jobs are sanitized
// at the source as well as rendered safely on the site.
//
// Plain CommonJS (no JSX/React) so it can be `require()`d from Node scripts.

// Decode the handful of HTML entities that show up in scraped descriptions,
// plus common UTF-8 "mojibake" smart quotes from double-decoded encodings.
function decodeEntities(text) {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&rsquo;/gi, '\u2019')
    .replace(/&lsquo;/gi, '\u2018')
    .replace(/&rdquo;/gi, '\u201d')
    .replace(/&ldquo;/gi, '\u201c')
    .replace(/&mdash;/gi, '\u2014')
    .replace(/&ndash;/gi, '\u2013')
    .replace(/â€™|â€˜/g, "'")
    .replace(/â€œ|â€\x9d/g, '"')
    .replace(/â€"|â€"/g, '-')
    .replace(/Â /g, ' ')
}

// Strip HTML tags while preserving paragraph/list structure as line breaks.
function stripHtml(text) {
  if (!/<[a-z][\s\S]*>/i.test(text)) return text
  return text
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '\n\u2022 ')
    .replace(/<\/\s*(p|div|h[1-6]|ul|ol|li)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
}

// Plain-text clean (collapses markdown emphasis markers rather than
// rendering them) — used for previews/truncated text and for sanitizing
// text at ingestion before it's stored.
function cleanJobDescriptionText(raw) {
  if (!raw) return ''
  let text = decodeEntities(raw)
  text = stripHtml(text)
  text = text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(?<![a-zA-Z0-9_])_([^_\n]+)_(?![a-zA-Z0-9_])/g, '$1')
    .replace(/(?<![a-zA-Z0-9*])\*([^*\n]+)\*(?![a-zA-Z0-9*])/g, '$1')
    .replace(/[ \t]*\n[ \t]*\n+/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text
}

module.exports = { decodeEntities, stripHtml, cleanJobDescriptionText }
