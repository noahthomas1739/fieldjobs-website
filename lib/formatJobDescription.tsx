/**
 * Cleans up job description / requirements / benefits text pulled from
 * scraped sources (USAJobs, JSearch, etc.) and manual entry.
 *
 * Root cause of the literal-underscore bug: several upstream sources hand
 * back plain text that still contains markdown-style emphasis syntax
 * (`_word_`, `__word__`, `*word*`, `**word**`) or raw HTML (`<p>`, `<div>`,
 * `&nbsp;`, smart-quote mojibake, etc.) from the original job posting. The
 * site was rendering that text as a literal string, so candidates saw stray
 * underscores/asterisks and, in some cases, literal HTML tags.
 *
 * Fix: sanitize (strip HTML tags, decode entities) and then parse the
 * remaining lightweight markdown emphasis into real <em>/<strong> nodes
 * before rendering, instead of dumping the raw string into the DOM.
 */

import React from 'react'

// Decode the handful of HTML entities that show up in scraped descriptions.
function decodeEntities(text: string): string {
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
    // Common mojibake from double-decoded UTF-8 smart quotes (â€™, â€œ, etc.)
    .replace(/â€™|â€˜/g, "'")
    .replace(/â€œ|â€\x9d/g, '"')
    .replace(/â€"|â€"/g, '-')
    .replace(/Â /g, ' ')
}

// Strip HTML tags while preserving paragraph/list structure as line breaks,
// so text that was accidentally stored as raw HTML reads as clean prose
// instead of showing literal tags.
function stripHtml(text: string): string {
  if (!/<[a-z][\s\S]*>/i.test(text)) return text
  return text
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '\n\u2022 ')
    .replace(/<\/\s*(p|div|h[1-6]|ul|ol|li)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
}

// Clean, plain-text version — used for truncated card previews where we
// don't want to render rich JSX, just a tidy snippet.
export function cleanJobDescriptionText(raw: string | null | undefined): string {
  if (!raw) return ''
  let text = decodeEntities(raw)
  text = stripHtml(text)
  // Collapse markdown emphasis markers down to plain text for previews.
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

// Parses a single line of text for **bold**, __bold__, *italic*, _italic_
// and returns React nodes with real <strong>/<em> emphasis instead of
// literal markdown characters.
function parseInlineEmphasis(line: string, keyPrefix: string): React.ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_)/g
  const parts = line.split(pattern)
  return parts.filter(Boolean).map((part, i) => {
    const key = `${keyPrefix}-${i}`
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={key}>{part.slice(2, -2)}</strong>
    }
    if (/^__[^_]+__$/.test(part)) {
      return <strong key={key}>{part.slice(2, -2)}</strong>
    }
    if (/^\*[^*\n]+\*$/.test(part)) {
      return <em key={key}>{part.slice(1, -1)}</em>
    }
    if (/^_[^_\n]+_$/.test(part)) {
      return <em key={key}>{part.slice(1, -1)}</em>
    }
    return part
  })
}

/**
 * Renders a full job description (or requirements/benefits block) as a
 * series of paragraphs with real bold/italic emphasis, bullets preserved,
 * and no literal HTML tags or stray underscores/asterisks.
 */
export function JobDescription({
  text,
  className,
  style,
}: {
  text: string | null | undefined
  className?: string
  style?: React.CSSProperties
}) {
  if (!text) return null

  let cleaned = decodeEntities(text)
  cleaned = stripHtml(cleaned)

  const paragraphs = cleaned
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  if (paragraphs.length === 0) return null

  return (
    <div className={className} style={style}>
      {paragraphs.map((paragraph, pIdx) => {
        const lines = paragraph.split('\n').filter((l) => l.trim().length > 0)
        return (
          <p key={pIdx} style={{ margin: pIdx === 0 ? 0 : '0.9em 0 0 0' }}>
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {lIdx > 0 && <br />}
                {parseInlineEmphasis(line, `${pIdx}-${lIdx}`)}
              </React.Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}

export default JobDescription
