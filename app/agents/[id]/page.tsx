'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { api, getErrorMessage, getToken } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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

  const sendMessage = async () => {
    if (!input.trim() || streaming) return

    setError('')
    setUpgradeMessage('')

    const userMessage = input.trim()
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
                  {message.content}
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
              onClick={sendMessage}
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
