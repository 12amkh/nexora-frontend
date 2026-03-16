'use client'

import { Fragment } from 'react'

export type RenderBlock =
  | { type: 'heading'; content: string }
  | { type: 'paragraph'; content: string }
  | { type: 'bullet-list'; items: string[]; isSources?: boolean }
  | { type: 'numbered-list'; items: string[] }

function isHeadingLine(line: string): boolean {
  return /^#{1,3}\s+/.test(line) || /^[A-Z][A-Za-z0-9\s/&-]{2,60}:$/.test(line)
}

function normalizeHeading(line: string): string {
  return line.replace(/^#{1,3}\s+/, '').replace(/:\s*$/, '').trim()
}

function isBulletLine(line: string): boolean {
  return /^[-*•]\s+/.test(line)
}

function isNumberedLine(line: string): boolean {
  return /^\d+\.\s+/.test(line)
}

function stripListMarker(line: string): string {
  return line.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '').trim()
}

export function parseRichContent(content: string): RenderBlock[] {
  const lines = content
    .split('\n')
    .map(line => line.replace(/\t/g, '  ').trimEnd())

  const blocks: RenderBlock[] = []
  let paragraphBuffer: string[] = []
  let index = 0
  let pendingSources = false

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return
    blocks.push({
      type: 'paragraph',
      content: paragraphBuffer.join(' ').trim(),
    })
    paragraphBuffer = []
  }

  while (index < lines.length) {
    const line = lines[index].trim()

    if (!line) {
      flushParagraph()
      index += 1
      continue
    }

    if (isHeadingLine(line)) {
      flushParagraph()
      const heading = normalizeHeading(line)
      blocks.push({ type: 'heading', content: heading })
      pendingSources = /^sources?$/i.test(heading)
      index += 1
      continue
    }

    if (/^sources?\s*:/i.test(line)) {
      flushParagraph()
      const heading = normalizeHeading(line)
      blocks.push({ type: 'heading', content: heading })
      pendingSources = true
      index += 1
      continue
    }

    if (isBulletLine(line)) {
      flushParagraph()
      const items: string[] = []
      while (index < lines.length && isBulletLine(lines[index].trim())) {
        items.push(stripListMarker(lines[index].trim()))
        index += 1
      }
      blocks.push({ type: 'bullet-list', items, isSources: pendingSources })
      pendingSources = false
      continue
    }

    if (isNumberedLine(line)) {
      flushParagraph()
      const items: string[] = []
      while (index < lines.length && isNumberedLine(lines[index].trim())) {
        items.push(stripListMarker(lines[index].trim()))
        index += 1
      }
      blocks.push({ type: 'numbered-list', items })
      pendingSources = false
      continue
    }

    paragraphBuffer.push(line)
    pendingSources = false
    index += 1
  }

  flushParagraph()

  return blocks.length > 0 ? blocks : [{ type: 'paragraph', content }]
}

function renderFormattedText(text: string) {
  const labelMatch = text.match(/^([A-Za-z][A-Za-z0-9\s/&-]{1,40}:)\s+(.*)$/)
  const parts = (labelMatch ? labelMatch[2] : text).split(/(https?:\/\/[^\s]+|\*\*[^*]+\*\*)/g)
  const renderedParts = parts
    .filter(Boolean)
    .map((part, index) => {
      if (/^https?:\/\/[^\s]+$/.test(part)) {
        return (
          <a
            key={`${part}-${index}`}
            href={part}
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: '3px' }}
          >
            {part}
          </a>
        )
      }

      if (/^\*\*[^*]+\*\*$/.test(part)) {
        return (
          <strong key={`bold-${index}`} style={{ color: 'var(--text)', fontWeight: 700 }}>
            {part.slice(2, -2)}
          </strong>
        )
      }

      return <Fragment key={`text-${index}`}>{part}</Fragment>
    })

  if (!labelMatch) {
    return renderedParts
  }

  return [
    <strong key="label" style={{ color: 'var(--text)', fontWeight: 700 }}>
      {labelMatch[1]}
    </strong>,
    <Fragment key="space"> </Fragment>,
    ...renderedParts,
  ]
}

export default function RichContent({ content }: { content: string }) {
  const blocks = parseRichContent(content)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <div
              key={`heading-${index}`}
              style={{
                color: 'var(--text)',
                fontSize: '0.98rem',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                paddingTop: index === 0 ? 0 : '0.35rem',
              }}
            >
              {block.content}
            </div>
          )
        }

        if (block.type === 'paragraph') {
          return (
            <p
              key={`paragraph-${index}`}
              style={{ margin: 0, color: 'var(--text-2)', fontSize: '0.92rem', lineHeight: 1.8 }}
            >
              {renderFormattedText(block.content)}
            </p>
          )
        }

        if (block.type === 'bullet-list') {
          return (
            <div
              key={`bullets-${index}`}
              style={{
                background: block.isSources ? 'rgba(217,121,85,0.08)' : 'transparent',
                border: block.isSources ? '1px solid rgba(217,121,85,0.18)' : 'none',
                borderRadius: block.isSources ? '12px' : undefined,
                padding: block.isSources ? '0.85rem 0.95rem' : 0,
              }}
            >
              <ul style={{ margin: 0, paddingLeft: '1.15rem', display: 'grid', gap: '0.6rem' }}>
                {block.items.map((item, itemIndex) => (
                  <li key={`bullet-item-${itemIndex}`} style={{ color: 'var(--text-2)', lineHeight: 1.75, paddingLeft: '0.2rem' }}>
                    {renderFormattedText(item)}
                  </li>
                ))}
              </ul>
            </div>
          )
        }

        return (
          <ol key={`numbers-${index}`} style={{ margin: 0, paddingLeft: '1.2rem', display: 'grid', gap: '0.7rem' }}>
            {block.items.map((item, itemIndex) => (
              <li key={`number-item-${itemIndex}`} style={{ color: 'var(--text-2)', lineHeight: 1.75, paddingLeft: '0.25rem' }}>
                {renderFormattedText(item)}
              </li>
            ))}
          </ol>
        )
      })}
    </div>
  )
}
