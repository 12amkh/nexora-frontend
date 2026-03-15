'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { api, getErrorMessage, getToken } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const QUICK_ACTIONS = [
  {
    label: 'Get AI Trends',
    prompt: 'Give me the most important AI trends right now, what is driving them, and what to watch next.',
  },
  {
    label: 'Market Opportunities',
    prompt: 'Analyze current market opportunities in this space and highlight the strongest gaps, demand signals, and business angles.',
  },
  {
    label: 'Startup Ideas',
    prompt: 'Generate strong startup ideas based on current trends, unmet needs, and practical opportunities I could explore.',
  },
]

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Report {
  id: number
  title: string
  content: string
  created_at: string
}

interface Agent {
  id: number
  name: string
  config?: {
    agent_type?: string
    welcome_message?: string
  }
}

type RenderBlock =
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

function parseAssistantContent(content: string): RenderBlock[] {
  const lines = content
    .split('\n')
    .map(line => line.replace(/\t/g, '  ').trimEnd())

  const blocks: RenderBlock[] = []
  let paragraphBuffer: string[] = []
  let i = 0
  let pendingSources = false

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return
    blocks.push({
      type: 'paragraph',
      content: paragraphBuffer.join(' ').trim(),
    })
    paragraphBuffer = []
  }

  while (i < lines.length) {
    const rawLine = lines[i]
    const line = rawLine.trim()

    if (!line) {
      flushParagraph()
      i += 1
      continue
    }

    if (isHeadingLine(line)) {
      flushParagraph()
      const heading = normalizeHeading(line)
      blocks.push({ type: 'heading', content: heading })
      pendingSources = /^sources?$/i.test(heading)
      i += 1
      continue
    }

    if (/^sources?\s*:/i.test(line)) {
      flushParagraph()
      const heading = normalizeHeading(line)
      blocks.push({ type: 'heading', content: heading })
      pendingSources = true
      i += 1
      continue
    }

    if (isBulletLine(line)) {
      flushParagraph()
      const items: string[] = []
      while (i < lines.length && isBulletLine(lines[i].trim())) {
        items.push(stripListMarker(lines[i].trim()))
        i += 1
      }
      blocks.push({ type: 'bullet-list', items, isSources: pendingSources })
      pendingSources = false
      continue
    }

    if (isNumberedLine(line)) {
      flushParagraph()
      const items: string[] = []
      while (i < lines.length && isNumberedLine(lines[i].trim())) {
        items.push(stripListMarker(lines[i].trim()))
        i += 1
      }
      blocks.push({ type: 'numbered-list', items })
      pendingSources = false
      continue
    }

    paragraphBuffer.push(line)
    pendingSources = false
    i += 1
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

      return <span key={`text-${index}`}>{part}</span>
    })

  if (!labelMatch) {
    return renderedParts
  }

  return [
    <strong key="label" style={{ color: 'var(--text)', fontWeight: 700 }}>
      {labelMatch[1]}
    </strong>,
    <span key="label-space"> </span>,
    ...renderedParts,
  ]
}

function AssistantMessageContent({ content }: { content: string }) {
  const blocks = parseAssistantContent(content)

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

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'reports'>('chat')
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsLoaded, setReportsLoaded] = useState(false)
  const [error, setError] = useState('')
  const [upgradeMessage, setUpgradeMessage] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/login')
      return
    }
    loadAgent()
    loadHistory()
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (activeTab === 'reports' && !reportsLoaded) {
      loadReports()
    }
  }, [activeTab, reportsLoaded])

  const loadAgent = async () => {
    try {
      const { data } = await api.get(`/agents/${id}`)
      setAgent(data)
    } catch {
      router.push('/dashboard')
    }
  }

  const loadHistory = async () => {
    try {
      const { data } = await api.get(`/chat/history/${id}?limit=50`)
      setMessages(
        data.map((message: { role: string; message: string }) => ({
          role: message.role as 'user' | 'assistant',
          content: message.message,
        }))
      )
    } catch {
      // Empty history is fine.
    }
  }

  const loadReports = async () => {
    setReportsLoading(true)
    try {
      const { data } = await api.get(`/agents/${id}/reports`)
      setReports(data)
      setReportsLoaded(true)
    } catch {
      setReports([])
    } finally {
      setReportsLoading(false)
    }
  }

  const sendMessage = async (presetMessage?: string) => {
    const nextMessage = presetMessage ?? input

    if (!nextMessage.trim() || streaming) return

    setError('')
    setUpgradeMessage('')

    const userMessage = nextMessage.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setStreaming(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const response = await fetch(`${API_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ agent_id: Number(id), message: userMessage }),
      })

      if (!response.ok) {
        let detail = 'Something went wrong. Please try again.'
        try {
          const payload = await response.json()
          if (typeof payload?.detail === 'string') {
            detail = payload.detail
          }
        } catch {
          // Ignore non-JSON error payloads.
        }

        if (/limit reached|upgrade|max/i.test(detail)) {
          setUpgradeMessage(detail)
        }
        throw new Error(detail)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

        for (const line of lines) {
          const payload = line.replace('data: ', '').trim()
          if (!payload) continue

          try {
            const event = JSON.parse(payload)
            if (event.token) {
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: updated[updated.length - 1].content + event.token,
                }
                return updated
              })
            }
          } catch {
            // Skip malformed chunks.
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: message }
        return updated
      })
    } finally {
      setStreaming(false)
      setReportsLoaded(false)
    }
  }

  const runQuickAction = async (prompt: string) => {
    if (activeTab !== 'chat') {
      setActiveTab('chat')
    }
    await sendMessage(prompt)
  }

  const handleDelete = async () => {
    if (!agent || deleting) return

    const confirmed = window.confirm(
      `Delete "${agent.name}"?\n\nThis will also remove its conversation history and cannot be undone.`
    )

    if (!confirmed) return

    setDeleting(true)
    setError('')

    try {
      await api.delete(`/agents/${id}`)
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(getErrorMessage(err))
      setDeleting(false)
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-3)', fontSize: '1.1rem' }}>
          ←
        </Link>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{agent?.name || '...'}</div>
          <div style={{ color: 'var(--text-3)', fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', textTransform: 'capitalize' }}>
            {agent?.config?.agent_type?.replace(/_/g, ' ') || ''}
          </div>
        </div>
        {agent && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                color: deleting ? 'var(--text-3)' : 'var(--red)',
                background: 'transparent',
                border: '1px solid var(--border)',
                padding: '0.3rem 0.7rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: deleting ? 'not-allowed' : 'pointer',
              }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
            <Link
              href={`/agents/${id}/edit`}
              style={{ color: 'var(--text-3)', border: '1px solid var(--border)', padding: '0.3rem 0.7rem', borderRadius: '6px', fontSize: '0.8rem' }}
            >
              Edit
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div style={{ maxWidth: '900px', width: '100%', margin: '1rem auto 0', padding: '0 2rem' }}>
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid var(--red)', borderRadius: '10px', color: 'var(--red)', padding: '0.9rem 1rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        </div>
      )}

      {upgradeMessage && (
        <div style={{ maxWidth: '900px', width: '100%', margin: '1rem auto 0', padding: '0 2rem' }}>
          <div style={{ background: 'rgba(217,121,85,0.1)', border: '1px solid var(--accent)', borderRadius: '10px', color: 'var(--text)', padding: '0.9rem 1rem', fontSize: '0.9rem' }}>
            <span>{upgradeMessage}</span>
            <Link href="/dashboard/upgrade" style={{ marginLeft: 8, color: 'var(--accent)', fontWeight: 700, textDecoration: 'underline' }}>
              Upgrade plan
            </Link>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '900px', width: '100%', margin: '0 auto', padding: '1rem 2rem 0' }}>
        <div style={{ display: 'inline-flex', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '999px', padding: '0.25rem', gap: '0.25rem' }}>
          {(['chat', 'reports'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? 'var(--accent)' : 'transparent',
                color: activeTab === tab ? '#fff' : 'var(--text-2)',
                border: 'none',
                borderRadius: '999px',
                padding: '0.55rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {tab === 'chat' ? 'Chat' : 'Reports'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'chat' ? (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '900px', width: '100%', margin: '0 auto', alignSelf: 'center' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.25rem' }}>
              {QUICK_ACTIONS.map(action => (
                <button
                  key={action.label}
                  onClick={() => runQuickAction(action.prompt)}
                  disabled={streaming}
                  style={{
                    background: 'var(--bg-2)',
                    color: streaming ? 'var(--text-3)' : 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: '999px',
                    padding: '0.6rem 0.95rem',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: streaming ? 'not-allowed' : 'pointer',
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
            {messages.length === 0 && agent && (
              <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '3rem 1rem', fontSize: '0.9rem' }}>
                {agent.config?.welcome_message || `Hi! I'm ${agent.name}. How can I help?`}
              </div>
            )}
            {messages.map((message, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '75%',
                    padding: '0.8rem 1rem',
                    borderRadius: message.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: message.role === 'user' ? 'var(--accent)' : 'var(--bg-2)',
                    border: message.role === 'assistant' ? '1px solid var(--border)' : 'none',
                    fontSize: '0.9rem',
                    lineHeight: 1.65,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {message.role === 'assistant' ? (
                    <AssistantMessageContent content={message.content} />
                  ) : (
                    message.content
                  )}
                  {streaming && index === messages.length - 1 && message.role === 'assistant' && message.content === '' && (
                    <span style={{ display: 'inline-block', width: '7px', height: '14px', background: 'var(--accent)', borderRadius: '2px', animation: 'blink 0.8s infinite', verticalAlign: 'middle' }} />
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border)', background: 'var(--bg-2)', display: 'flex', gap: '0.75rem', maxWidth: '900px', width: '100%', margin: '0 auto', alignSelf: 'center' }}>
            <textarea
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Message your agent... (Enter to send, Shift+Enter for new line)"
              rows={1}
              style={{ flex: 1, background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: '10px', padding: '0.75rem 1rem', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', resize: 'none' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={streaming || !input.trim()}
              style={{ background: streaming ? 'var(--bg-3)' : 'var(--accent)', color: streaming ? 'var(--text-3)' : '#fff', border: 'none', borderRadius: '10px', padding: '0 1.25rem', cursor: streaming ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.9rem' }}
            >
              {streaming ? '...' : 'Send'}
            </button>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem 2rem', maxWidth: '900px', width: '100%', margin: '0 auto', alignSelf: 'center' }}>
          {reportsLoading ? (
            <div style={{ color: 'var(--text-3)', fontSize: '0.95rem', padding: '1rem 0' }}>Loading reports...</div>
          ) : reports.length === 0 ? (
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.2rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
              No saved reports yet. Every generated agent response will appear here once the agent starts working.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {reports.map(report => (
                <div key={report.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.1rem 1.2rem' }}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem' }}>{report.title}</div>
                    <div style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{new Date(report.created_at).toLocaleString()}</div>
                  </div>
                  <div style={{ color: 'var(--text-2)', fontSize: '0.92rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {report.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  )
}
