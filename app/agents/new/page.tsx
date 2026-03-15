'use client'
// app/agents/new/page.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, getErrorMessage } from '@/lib/api'

const AGENT_TYPES = [
  { type: 'web_researcher', emoji: '🔍', label: 'Web Researcher' },
  { type: 'customer_support', emoji: '💬', label: 'Customer Support' },
  { type: 'sales_assistant', emoji: '💼', label: 'Sales Assistant' },
  { type: 'content_writer', emoji: '✍️', label: 'Content Writer' },
  { type: 'code_reviewer', emoji: '💻', label: 'Code Reviewer' },
  { type: 'email_assistant', emoji: '📧', label: 'Email Assistant' },
  { type: 'news_monitor', emoji: '📰', label: 'News Monitor' },
  { type: 'data_interpreter', emoji: '📊', label: 'Data Interpreter' },
  { type: 'personal_assistant', emoji: '🤖', label: 'Personal Assistant' },
  { type: 'lead_qualifier', emoji: '🎯', label: 'Lead Qualifier' },
  { type: 'competitor_analyst', emoji: '🔭', label: 'Competitor Analyst' },
  { type: 'study_assistant', emoji: '📚', label: 'Study Assistant' },
  { type: 'custom', emoji: '⚙️', label: 'Custom Agent' },
]

export default function NewAgentPage() {
  const router = useRouter()
  const [step, setStep] = useState<'type' | 'details'>('type')
  const [selectedType, setSelectedType] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const showUpgrade = /limit reached|upgrade|max/i.test(error)

  useEffect(() => {
    if (!localStorage.getItem('token')) router.push('/login')
  }, [])

  const handleCreate = async () => {
    if (!name.trim()) { setError('Agent name is required.'); return }
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/agents/create', {
        name: name.trim(),
        description: description.trim(),
        agent_type: selectedType,
      })
      router.push(`/agents/${data.id}`)
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Failed to create agent.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'type') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
          <Link href="/dashboard" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>← Back</Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Choose agent type</h1>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
          {AGENT_TYPES.map(a => (
            <button key={a.type} onClick={() => { setSelectedType(a.type); setStep('details') }} style={{
              background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '12px',
              padding: '1.5rem 1rem', cursor: 'pointer', textAlign: 'center',
              transition: 'border-color 0.15s, background 0.15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)' }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{a.emoji}</div>
              <div style={{ color: 'var(--text)', fontWeight: 500, fontSize: '0.9rem' }}>{a.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '480px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2.5rem' }}>
        <button onClick={() => setStep('type')} style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', marginBottom: '1.5rem', fontSize: '0.9rem' }}>← Back</button>
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>
          {AGENT_TYPES.find(a => a.type === selectedType)?.emoji}
        </div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.35rem' }}>Name your agent</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
          {AGENT_TYPES.find(a => a.type === selectedType)?.label} — you can customize everything after creation.
        </p>

        {error && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', color: 'var(--red)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            <div>{error}</div>
            {showUpgrade && (
              <Link href="/" style={{ display: 'inline-block', marginTop: '0.55rem', color: 'var(--text)', fontWeight: 700, textDecoration: 'underline' }}>
                Upgrade to create more agents
              </Link>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-2)' }}>Agent name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Daily Research Bot" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 1rem', color: 'var(--text)', fontSize: '0.95rem', outline: 'none' }} />
          <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-2)' }}>Description (optional)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this agent do?" rows={3} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 1rem', color: 'var(--text)', fontSize: '0.95rem', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
          <button onClick={handleCreate} disabled={loading} style={{ marginTop: '0.5rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.85rem', fontWeight: 600, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Creating...' : 'Create agent →'}
          </button>
        </div>
      </div>
    </div>
  )
}
