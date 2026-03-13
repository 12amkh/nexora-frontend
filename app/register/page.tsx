'use client'
// app/register/page.tsx
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/register', { name, email, password })
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
      setError(e.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg-3)',
    border: '1px solid var(--border-2)', borderRadius: '8px',
    padding: '0.75rem 1rem', color: 'var(--text)',
    fontSize: '0.95rem', outline: 'none',
  }
  const labelStyle = {
    display: 'block', fontSize: '0.8rem', fontWeight: 600,
    color: 'var(--text-2)', marginBottom: '0.4rem', letterSpacing: '0.02em',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <Link href="/" style={{ fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.03em', display: 'block', marginBottom: '2.5rem', color: 'var(--text)' }}>
          Nexora
        </Link>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.35rem' }}>Create your account</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>Sign in</Link>
        </p>

        {/* plan badge */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem' }}>
          {['Free forever', 'No credit card', '3 agents included'].map(t => (
            <span key={t} style={{ fontSize: '0.75rem', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '100px', padding: '0.2rem 0.65rem', color: 'var(--text-2)' }}>{t}</span>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '8px', padding: '0.7rem 1rem', color: '#f87171', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>FULL NAME</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ahmad" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 chars, 1 uppercase, 1 number" required style={inputStyle} />
          </div>
          <button
            type="submit" disabled={loading}
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.8rem', fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '0.25rem', boxShadow: '0 0 20px rgba(108,99,255,0.25)' }}
          >
            {loading ? 'Creating account...' : 'Create free account →'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', fontSize: '0.78rem', color: 'var(--text-3)', textAlign: 'center' }}>
          By signing up you agree to our Terms of Service
        </p>
      </div>
    </div>
  )
}