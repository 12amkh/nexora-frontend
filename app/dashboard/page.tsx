'use client'
// app/dashboard/page.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, logout, getUser } from '@/lib/api'

interface Agent {
  id: number
  name: string
  description: string
  config: { agent_type?: string; tone?: string }
  created_at: string
}

const TYPE_EMOJI: Record<string, string> = {
  web_researcher: '🔍', customer_support: '💬', sales_assistant: '💼',
  content_writer: '✍️', code_reviewer: '💻', email_assistant: '📧',
  personal_assistant: '🤖', news_monitor: '📰', data_interpreter: '📊',
  lead_qualifier: '🎯', competitor_analyst: '🔭', study_assistant: '📚',
  custom: '⚙️',
}

const PLAN_COLORS: Record<string, string> = {
  free: '#8888a0', starter: '#34d399', pro: '#6c63ff', business: '#f59e0b',
}

export default function DashboardPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ email?: string; name?: string; plan?: string } | null>(null)

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.push('/login'); return }
    const u = getUser()
    setUser(u)
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      const { data } = await api.get('/agents/list?limit=50')
      setAgents(data)
    } catch { router.push('/login') }
    finally { setLoading(false) }
  }

  const deleteAgent = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}" and all its history?`)) return
    await api.delete(`/agents/${id}`)
    setAgents(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* sidebar */}
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <aside style={{ width: '220px', background: 'var(--bg-2)', borderRight: '1px solid var(--border)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', position: 'fixed', top: 0, bottom: 0, left: 0 }}>
          <Link href="/dashboard" style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.03em', padding: '0.5rem 0.75rem', display: 'block', marginBottom: '1.25rem', color: 'var(--text)' }}>
            Nexora
          </Link>
          <NavItem href="/dashboard" label="🤖  Agents" active />
          <NavItem href="/schedules" label="⏰  Schedules" />
          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <div style={{ padding: '0.5rem 0.75rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || user?.email}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: PLAN_COLORS[user?.plan || 'free'], display: 'inline-block' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', textTransform: 'capitalize' }}>{user?.plan || 'free'} plan</span>
              </div>
            </div>
            <button onClick={logout} style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', background: 'transparent', border: 'none', color: 'var(--text-3)', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '6px' }}>
              Sign out
            </button>
          </div>
        </aside>

        {/* main */}
        <main style={{ marginLeft: '220px', flex: 1, padding: '2.5rem' }}>
          <div style={{ maxWidth: '900px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>Your Agents</h1>
                <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>{agents.length} agent{agents.length !== 1 ? 's' : ''}</p>
              </div>
              <Link href="/agents/new" style={{ background: 'var(--accent)', color: '#fff', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', boxShadow: '0 0 20px rgba(108,99,255,0.2)' }}>
                + New Agent
              </Link>
            </div>

            {loading ? (
              <div style={{ color: 'var(--text-3)', padding: '4rem', textAlign: 'center', fontSize: '0.9rem' }}>Loading...</div>
            ) : agents.length === 0 ? (
              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '4rem 2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🤖</div>
                <h2 style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '1.1rem' }}>No agents yet</h2>
                <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Create your first AI agent to get started.</p>
                <Link href="/agents/new" style={{ background: 'var(--accent)', color: '#fff', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem' }}>
                  Create agent
                </Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '1rem' }}>
                {agents.map(agent => (
                  <div key={agent.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.5rem' }}>{TYPE_EMOJI[agent.config?.agent_type || 'custom'] || '🤖'}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>{agent.name}</div>
                          <div style={{ color: 'var(--text-3)', fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', textTransform: 'capitalize' }}>
                            {agent.config?.agent_type?.replace(/_/g, ' ') || 'custom'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteAgent(agent.id, agent.name)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: '0.1rem 0.3rem', borderRadius: '4px' }}
                      >×</button>
                    </div>

                    {agent.description && (
                      <p style={{ color: 'var(--text-2)', fontSize: '0.825rem', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {agent.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                      <Link href={`/agents/${agent.id}`} style={{ flex: 1, textAlign: 'center', background: 'var(--accent)', color: '#fff', padding: '0.55rem', borderRadius: '7px', fontWeight: 600, fontSize: '0.85rem' }}>
                        Chat
                      </Link>
                      <Link href={`/agents/${agent.id}/edit`} style={{ textAlign: 'center', background: 'var(--bg-3)', color: 'var(--text-2)', padding: '0.55rem 0.9rem', borderRadius: '7px', fontSize: '0.85rem', border: '1px solid var(--border)' }}>
                        Edit
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function NavItem({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link href={href} style={{
      display: 'block', padding: '0.5rem 0.75rem', borderRadius: '7px',
      fontSize: '0.875rem', fontWeight: active ? 600 : 400,
      background: active ? 'var(--accent-g)' : 'transparent',
      color: active ? 'var(--text)' : 'var(--text-2)',
      border: active ? '1px solid rgba(108,99,255,0.2)' : '1px solid transparent',
    }}>{label}</Link>
  )
}