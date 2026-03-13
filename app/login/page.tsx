'use client'
// app/login/page.tsx
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const form = new URLSearchParams()
      form.append('username', email)
      form.append('password', password)
      const { data } = await api.post('/auth/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      localStorage.setItem('token', data.access_token)
      const { data: user } = await api.get('/users/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      localStorage.setItem('user', JSON.stringify(user))
      router.push('/dashboard')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      {/* left panel */}
      <div style={{
        display: 'none', flex: 1,
        background: 'linear-gradient(135deg, #0d0d18 0%, #0a0a14 100%)',
        borderRight: '1px solid var(--border)',
        padding: '3rem', flexDirection: 'column', justifyContent: 'space-between',
      }}
        className="left-panel"
      >
        <span style={{ fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.03em' }}>Nexora</span>
        <div>
          <p style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.35, marginBottom: '1rem', color: 'var(--text)' }}>
            "We replaced our entire research workflow with one Nexora agent."
          </p>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>— Founder, early customer</p>
        </div>
      </div>

      {/* right panel - form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <Link href="/" style={{ fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.03em', display: 'block', marginBottom: '2.5rem', color: 'var(--text)' }}>
            Nexora
          </Link>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.35rem' }}>Welcome back</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '2rem' }}>
            Don't have an account? <Link href="/register" style={{ color: 'var(--accent)', fontWeight: 500 }}>Sign up free</Link>
          </p>

          {error && (
            <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '8px', padding: '0.7rem 1rem', color: '#f87171', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.4rem', letterSpacing: '0.02em' }}>EMAIL</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" required
                style={{ width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: '8px', padding: '0.75rem 1rem', color: 'var(--text)', fontSize: '0.95rem', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.4rem', letterSpacing: '0.02em' }}>PASSWORD</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                style={{ width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: '8px', padding: '0.75rem 1rem', color: 'var(--text)', fontSize: '0.95rem', outline: 'none' }}
              />
            </div>
            <button
              type="submit" disabled={loading}
              style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.8rem', fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '0.25rem' }}
            >
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}