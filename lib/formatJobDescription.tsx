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
import { decodeEntities, stripHtml, cleanJobDescriptionText } from './sanitizeJobText'

export { cleanJobDescriptionText }

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

  let cleaned: string = decodeEntities(text)
  cleaned = stripHtml(cleaned)

  const paragraphs: string[] = cleaned
    .split(/\n\s*\n/)
    .map((p: string) => p.trim())
    .filter(Boolean)

  if (paragraphs.length === 0) return null

  return (
    <div className={className} style={style}>
      {paragraphs.map((paragraph: string, pIdx: number) => {
        const lines = paragraph.split('\n').filter((l: string) => l.trim().length > 0)
        return (
          <p key={pIdx} style={{ margin: pIdx === 0 ? 0 : '0.9em 0 0 0' }}>
            {lines.map((line: string, lIdx: number) => (
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
