'use client'
// app/settings/page.tsx
// Stage 16: Settings & Profile Page
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, getUser, logout, getErrorMessage } from '@/lib/api'

const PLAN_COLORS: Record<string, string> = {
  free: '#8888a0', starter: '#34d399', pro: '#6c63ff', business: '#f59e0b',
}

interface Stats {
  user_id: number
  name: string
  email: string
  plan: string
  total_agents: number
  total_messages: number
  messages_sent: number
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string; name?: string; plan?: string } | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  
  // Profile update form
  const [nameInput, setNameInput] = useState('')
  const [updating, setUpdating] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.push('/login'); return }
    const u = getUser()
    setUser(u)
    if (u?.name) setNameInput(u.name)
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/users/stats')
      setStats(data)
    } catch {
      // stats error isn't fatal for the page
    }
  }

  // 1. Update Profile (Name)
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameInput.trim() || nameInput === user?.name) return
    
    setUpdating(true)
    setErrorMsg('')
    setSuccessMsg('')
    
    try {
      const { data } = await api.put('/users/update', { name: nameInput.trim() })
      // Update local storage so the sidebar reflects changes immediately
      const updatedUser = { ...user, name: data.name }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setUser(updatedUser)
      setSuccessMsg('Profile updated successfully.')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setErrorMsg(getErrorMessage(err))
    } finally {
      setUpdating(false)
    }
  }

  // 2. Delete Account
  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you absolutely sure? This will delete all your agents, schedules, and chat history. This action cannot be undone.')) {
      return
    }
    
    // Double confirmation for destructive action
    if (!window.confirm('Type OK if you are completely sure you want to delete your account.')) {
        return
    }

    try {
      await api.delete('/users/delete')
      logout() // clears token/user and redirects to login
    } catch (err) {
      setErrorMsg(getErrorMessage(err))
      window.scrollTo(0, 0)
    }
  }

  const plan = user?.plan || 'free'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, minHeight: '100vh',
        background: 'var(--bg-2)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', padding: '20px 16px',
        position: 'fixed', top: 0, left: 0, zIndex: 10,
      }}>
        <Link href="/dashboard" style={{
          fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.03em',
          padding: '0.5rem 0.75rem', display: 'block', marginBottom: '1.25rem',
          color: 'var(--text)',
        }}>
          Nexora
        </Link>

        <NavItem href="/dashboard" label="🤖  Agents" active={false} />
        <NavItem href="/schedules" label="⏰  Schedules" active={false} />
        <NavItem href="/settings"  label="⚙️  Settings" active={true} />

        {/* Bottom: user info + logout */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div style={{ padding: '0.5rem 0.75rem' }}>
            <div style={{
              fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)',
              marginBottom: '0.15rem', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user?.name || user?.email}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: PLAN_COLORS[plan], display: 'inline-block',
              }} />
              <span style={{
                fontSize: '0.75rem', color: 'var(--text-2)', textTransform: 'capitalize',
              }}>
                {plan} plan
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            style={{
              width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem',
              background: 'transparent', border: 'none', color: 'var(--text-3)',
              fontSize: '0.85rem', cursor: 'pointer', borderRadius: '6px',
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ marginLeft: 220, flex: 1, padding: '40px 48px', maxWidth: 860 }}>
        <h1 style={{
          fontSize: 28, fontWeight: 700, color: 'var(--text)',
          margin: 0, letterSpacing: '-0.5px', marginBottom: 28,
        }}>
          Settings
        </h1>

        {/* Global Errors/Success */}
        {errorMsg && (
          <div style={{
            background: 'rgba(248,113,113,0.1)', border: '1px solid var(--red)',
            borderRadius: 8, padding: '12px 16px', color: 'var(--red)',
            fontSize: 14, marginBottom: 24,
          }}>
            {errorMsg}
          </div>
        )}
        
        {successMsg && (
          <div style={{
            background: 'rgba(52,211,153,0.1)', border: '1px solid var(--green)',
            borderRadius: 8, padding: '12px 16px', color: 'var(--green)',
            fontSize: 14, marginBottom: 24,
          }}>
            ✓ {successMsg}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Section 1: Profile */}
          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Profile</h2>
            <p style={sectionDescStyle}>Update your personal information.</p>
            
            <form onSubmit={handleUpdateProfile} style={{ marginTop: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Email</label>
                <input 
                  type="text" 
                  value={user?.email || ''} 
                  disabled 
                  style={{ ...inputStyle, background: 'var(--bg)', color: 'var(--text-3)', cursor: 'not-allowed' }} 
                />
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
                  Email cannot be changed at this time.
                </p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Display Name</label>
                <input 
                  type="text" 
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Your name"
                  style={inputStyle} 
                />
              </div>

              <button
                type="submit"
                disabled={updating || nameInput === user?.name || !nameInput.trim()}
                style={{
                  padding: '10px 20px', borderRadius: 8,
                  background: (updating || nameInput === user?.name || !nameInput.trim()) ? 'var(--bg-3)' : 'var(--accent)',
                  color: (updating || nameInput === user?.name || !nameInput.trim()) ? 'var(--text-3)' : 'white',
                  border: 'none', fontWeight: 600, fontSize: 14,
                  cursor: (updating || nameInput === user?.name || !nameInput.trim()) ? 'not-allowed' : 'pointer',
                }}
              >
                {updating ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          </section>

          {/* Section 2: Plan & Usage */}
          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Plan & Usage</h2>
            <p style={sectionDescStyle}>Your current subscription and platform usage.</p>
            
            <div style={{ 
              marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16,
              background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)',
              padding: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-2)', fontSize: 14, fontWeight: 500 }}>Current Plan</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: PLAN_COLORS[plan], display: 'inline-block',
                  }} />
                  <span style={{ color: 'var(--text)', fontWeight: 600, textTransform: 'capitalize', fontSize: 14 }}>
                    {plan}
                  </span>
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--border)' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <StatBox label="Active Agents" value={stats?.total_agents?.toString() || '-'} />
                <StatBox label="Total Messages" value={stats?.total_messages?.toString() || '-'} />
                <StatBox label="Messages Sent" value={stats?.messages_sent?.toString() || '-'} />
              </div>
            </div>
          </section>

          {/* Section 3: Danger Zone */}
          <section style={{ ...cardStyle, border: '1px solid rgba(248,113,113,0.3)' }}>
            <h2 style={{ ...sectionTitleStyle, color: 'var(--red)' }}>Danger Zone</h2>
            <p style={sectionDescStyle}>Permanently delete your account and all associated data.</p>
            
            <div style={{ marginTop: 20 }}>
              <button
                onClick={handleDeleteAccount}
                style={{
                  padding: '10px 20px', borderRadius: 8,
                  background: 'rgba(248,113,113,0.1)', border: '1px solid var(--red)',
                  color: 'var(--red)', fontWeight: 600, fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Delete account
              </button>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 10 }}>
                This will immediately delete all your agents, settings, and chat history. This action is irreversible.
              </p>
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-2)', border: '1px solid var(--border)',
  borderRadius: 12, padding: 24,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 16, fontWeight: 600, color: 'var(--text)',
  margin: '0 0 6px', letterSpacing: '-0.01em',
}

const sectionDescStyle: React.CSSProperties = {
  fontSize: 14, color: 'var(--text-2)', margin: 0,
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500,
  color: 'var(--text-2)', marginBottom: 8,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  background: 'var(--bg-3)', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text)', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>{value}</div>
    </div>
  )
}

function NavItem({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} style={{
      display: 'block', padding: '0.5rem 0.75rem', borderRadius: '7px',
      fontSize: '0.875rem', fontWeight: active ? 600 : 400,
      background: active ? 'var(--accent-g)' : 'transparent',
      color: active ? 'var(--text)' : 'var(--text-2)',
      border: active ? '1px solid rgba(108,99,255,0.2)' : '1px solid transparent',
      marginBottom: '0.1rem',
    }}>
      {label}
    </Link>
  )
}
