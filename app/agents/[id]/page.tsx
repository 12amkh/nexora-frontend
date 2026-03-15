'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { api, getErrorMessage, getToken } from '@/lib/api'
import RichContent from '@/components/RichContent'

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
  createdAt?: string
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

function formatTimeLabel(value?: string): string {
  if (!value) return 'Now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Now'
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatDateDivider(value?: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function buildFollowUpPrompts(messages: Message[]): Array<{ label: string; prompt: string }> {
  const lastAssistant = [...messages].reverse().find(message => message.role === 'assistant' && message.content.trim())
  if (!lastAssistant) return []

  const lastReply = lastAssistant.content.replace(/\s+/g, ' ').trim()
  const preview = lastReply.length > 220 ? `${lastReply.slice(0, 217).trimEnd()}...` : lastReply

  return [
    {
      label: 'Go deeper',
      prompt: `Go deeper on your last answer. Expand the strongest points and add more detail where it matters.\n\nPrevious answer:\n${preview}`,
    },
    {
      label: 'Summarize context',
      prompt: `Summarize our recent conversation so far into the key ideas, decisions, and next steps.\n\nRecent context:\n${preview}`,
    },
    {
      label: 'Next actions',
      prompt: `Based on our conversation so far, turn the latest answer into concrete next actions I should take.\n\nLatest answer:\n${preview}`,
    },
  ]
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
  const recentContext = messages.slice(-4)
  const followUpActions = buildFollowUpPrompts(messages)

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
        data.map((message: { role: string; message: string; created_at?: string }) => ({
          role: message.role as 'user' | 'assistant',
          content: message.message,
          createdAt: message.created_at,
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
    const createdAt = new Date().toISOString()
    setMessages(prev => [...prev, { role: 'user', content: userMessage, createdAt }])
    setStreaming(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '', createdAt }])

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
                  createdAt: updated[updated.length - 1].createdAt,
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
        updated[updated.length - 1] = {
          role: 'assistant',
          content: message,
          createdAt: updated[updated.length - 1].createdAt,
        }
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
            {recentContext.length > 1 && (
              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '0.95rem 1rem', display: 'grid', gap: '0.7rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '0.9rem' }}>Recent context</div>
                  <div style={{ color: 'var(--text-3)', fontSize: '0.76rem' }}>Conversation continues from your latest turns</div>
                </div>
                <div style={{ display: 'grid', gap: '0.6rem' }}>
                  {recentContext.map((message, index) => (
                    <div key={`context-${index}`} style={{ display: 'grid', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <span style={{ color: message.role === 'user' ? 'var(--accent)' : 'var(--text)', fontSize: '0.78rem', fontWeight: 700 }}>
                          {message.role === 'user' ? 'You' : agent?.name || 'Agent'}
                        </span>
                        <span style={{ color: 'var(--text-3)', fontSize: '0.74rem' }}>
                          {formatTimeLabel(message.createdAt)}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-2)', fontSize: '0.84rem', lineHeight: 1.65 }}>
                        {message.content.length > 180 ? `${message.content.slice(0, 177).trimEnd()}...` : message.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {followUpActions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                {followUpActions.map(action => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.prompt)}
                    disabled={streaming}
                    style={{
                      background: 'rgba(217,121,85,0.08)',
                      color: streaming ? 'var(--text-3)' : 'var(--accent)',
                      border: '1px solid rgba(217,121,85,0.18)',
                      borderRadius: '999px',
                      padding: '0.55rem 0.9rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: streaming ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
            {messages.length === 0 && agent && (
              <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '3rem 1rem', fontSize: '0.9rem' }}>
                {agent.config?.welcome_message || `Hi! I'm ${agent.name}. How can I help?`}
              </div>
            )}
            {messages.map((message, index) => (
              <div key={index}>
                {(() => {
                  const currentDay = formatDateDivider(message.createdAt)
                  const previousDay = index > 0 ? formatDateDivider(messages[index - 1].createdAt) : null
                  if (currentDay && currentDay !== previousDay) {
                    return (
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '0.25rem 0 0.85rem' }}>
                        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '999px', padding: '0.32rem 0.7rem', color: 'var(--text-3)', fontSize: '0.74rem' }}>
                          {currentDay}
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}
              <div style={{ display: 'flex', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ color: message.role === 'user' ? 'rgba(255,255,255,0.82)' : 'var(--text-3)', fontSize: '0.74rem', fontWeight: 700 }}>
                      {message.role === 'user' ? 'You' : agent?.name || 'Agent'}
                    </span>
                    <span style={{ color: message.role === 'user' ? 'rgba(255,255,255,0.72)' : 'var(--text-3)', fontSize: '0.72rem' }}>
                      {formatTimeLabel(message.createdAt)}
                    </span>
                  </div>
                  {message.role === 'assistant' ? (
                    <RichContent content={message.content} />
                  ) : (
                    message.content
                  )}
                  {streaming && index === messages.length - 1 && message.role === 'assistant' && message.content === '' && (
                    <span style={{ display: 'inline-block', width: '7px', height: '14px', background: 'var(--accent)', borderRadius: '2px', animation: 'blink 0.8s infinite', verticalAlign: 'middle' }} />
                  )}
                </div>
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
                  <div style={{ color: 'var(--text-2)', fontSize: '0.92rem', lineHeight: 1.7, wordBreak: 'break-word' }}>
                    <RichContent content={report.content} />
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
