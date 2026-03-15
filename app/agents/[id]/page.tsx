'use client'
// app/agents/[id]/page.tsx
// Stage 13 bug fix applied: use(params) for Next.js 16
import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, getErrorMessage, getToken } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Message { role: 'user' | 'assistant'; content: string }

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
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.push('/login'); return }
    loadAgent()
    loadHistory()
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadAgent = async () => {
    try {
      const { data } = await api.get(`/agents/${id}`)
      setAgent(data)
    } catch { router.push('/dashboard') }
  }

  const loadHistory = async () => {
    try {
      const { data } = await api.get(`/chat/history/${id}?limit=50`)
      setMessages(data.map((m: { role: string; message: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.message,
      })))
    } catch { /* empty history is fine */ }
  }

  const sendMessage = async () => {
    if (!input.trim() || streaming) return
    setError('')
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setStreaming(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const response = await fetch(`${API_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ agent_id: Number(id), message: userMsg }),
      })

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const json = line.replace('data: ', '').trim()
          if (!json) continue
          try {
            const event = JSON.parse(json)
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
          } catch { /* skip malformed */ }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: 'Something went wrong. Please try again.' }
        return updated
      })
    } finally {
      setStreaming(false)
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
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-3)', fontSize: '1.1rem' }}>←</Link>
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

      {/* messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '900px', width: '100%', margin: '0 auto', alignSelf: 'center' }}>
        {messages.length === 0 && agent && (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '3rem 1rem', fontSize: '0.9rem' }}>
            {agent.config?.welcome_message || `Hi! I'm ${agent.name}. How can I help?`}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '75%', padding: '0.8rem 1rem',
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-2)',
              border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
              fontSize: '0.9rem', lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {msg.content}
              {streaming && i === messages.length - 1 && msg.role === 'assistant' && msg.content === '' && (
                <span style={{ display: 'inline-block', width: '7px', height: '14px', background: 'var(--accent)', borderRadius: '2px', animation: 'blink 0.8s infinite', verticalAlign: 'middle' }} />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border)', background: 'var(--bg-2)', display: 'flex', gap: '0.75rem', maxWidth: '900px', width: '100%', margin: '0 auto', alignSelf: 'center' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
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
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  )
}
