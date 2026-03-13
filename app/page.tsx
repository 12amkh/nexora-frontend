'use client'
// app/page.tsx
import Link from 'next/link'
import { useEffect, useState } from 'react'

const FEATURES = [
  { icon: '⚡', title: 'Instant Agents', desc: '24 pre-built types. Pick one, name it, start chatting in under 60 seconds.' },
  { icon: '🌐', title: 'Live Web Search', desc: 'Agents search the internet in real time. No stale data, ever.' },
  { icon: '🔁', title: 'Fully Automated', desc: 'Schedule agents to run on their own schedule. Daily, weekly, or every 30 minutes.' },
  { icon: '🎛️', title: 'Fully Configurable', desc: 'Tune tone, language, focus topics, memory. Your agent, your rules.' },
]

const PLANS = [
  { name: 'Free', price: '$0', period: '', agents: '3 agents', schedules: 'No scheduling', cta: 'Get started', accent: false },
  { name: 'Starter', price: '$19', period: '/mo', agents: '5 agents', schedules: '3 schedules', cta: 'Start free trial', accent: false },
  { name: 'Pro', price: '$49', period: '/mo', agents: '20 agents', schedules: '10 schedules', cta: 'Go Pro', accent: true },
  { name: 'Business', price: '$149', period: '/mo', agents: '100 agents', schedules: '50 schedules', cta: 'Scale up', accent: false },
]

const NAV: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0 2rem', height: '60px',
  position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
  background: 'rgba(5,5,7,0.8)', backdropFilter: 'blur(20px)',
  borderBottom: '1px solid var(--border)',
}

export default function LandingPage() {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 80)
    return () => clearInterval(t)
  }, [])

  const words = ['while you sleep.', 'automatically.', 'around the clock.', 'without code.']
  const phrase = 'Build AI agents that work '
  const suffix = words[Math.floor(tick / 40) % words.length]
  const charIdx = tick % 40

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* NAV */}
      <nav style={NAV}>
        <span style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.03em', color: 'var(--text)' }}>
          Nexora
        </span>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link href="/login" style={{ color: 'var(--text-2)', fontSize: '0.9rem', padding: '0.4rem 0.9rem' }}>
            Sign in
          </Link>
          <Link href="/register" style={{
            background: 'var(--accent)', color: '#fff',
            padding: '0.45rem 1.1rem', borderRadius: '8px',
            fontSize: '0.875rem', fontWeight: 600,
          }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ paddingTop: '140px', paddingBottom: '100px', textAlign: 'center', maxWidth: '720px', margin: '0 auto', padding: '140px 1.5rem 100px' }}>

        {/* badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.3rem 0.9rem', borderRadius: '100px',
          border: '1px solid var(--border-2)',
          background: 'var(--bg-2)',
          fontSize: '0.78rem', color: 'var(--text-2)',
          marginBottom: '2rem', letterSpacing: '0.02em',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
          Now live · AI Agent Platform
        </div>

        {/* headline */}
        <h1 style={{
          fontSize: 'clamp(2.2rem, 5.5vw, 4rem)',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1.1,
          marginBottom: '1.5rem',
          color: 'var(--text)',
        }}>
          {phrase}
          <span style={{ color: 'var(--accent)' }}>
            {suffix.slice(0, charIdx % (suffix.length + 10))}
            <span style={{ opacity: Math.sin(Date.now() / 300) > 0 ? 1 : 0, color: 'var(--text-2)' }}>|</span>
          </span>
        </h1>

        <p style={{ fontSize: '1.1rem', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: '520px', margin: '0 auto 2.5rem' }}>
          Nexora lets you build, deploy, and automate AI agents in minutes.
          No code. No complexity. Just results.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" style={{
            background: 'var(--accent)', color: '#fff',
            padding: '0.8rem 1.75rem', borderRadius: '10px',
            fontWeight: 700, fontSize: '0.95rem',
            boxShadow: '0 0 30px rgba(108,99,255,0.3)',
          }}>
            Start for free →
          </Link>
          <Link href="/login" style={{
            background: 'var(--bg-3)', color: 'var(--text)',
            padding: '0.8rem 1.75rem', borderRadius: '10px',
            fontWeight: 500, fontSize: '0.95rem',
            border: '1px solid var(--border-2)',
          }}>
            Sign in
          </Link>
        </div>
      </section>

      {/* DIVIDER */}
      <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, var(--border-2), transparent)', maxWidth: '700px', margin: '0 auto' }} />

      {/* FEATURES */}
      <section style={{ maxWidth: '1000px', margin: '0 auto', padding: '80px 1.5rem' }}>
        <p style={{ textAlign: 'center', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.12em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Features
        </p>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '3rem' }}>
          Everything you need, nothing you don't
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ background: 'var(--bg-2)', padding: '2rem 1.75rem' }}>
              <div style={{ fontSize: '1.6rem', marginBottom: '0.875rem' }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>{f.title}</div>
              <div style={{ color: 'var(--text-2)', fontSize: '0.875rem', lineHeight: 1.65 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 1.5rem 100px' }}>
        <p style={{ textAlign: 'center', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.12em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Pricing
        </p>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
          Simple, honest pricing
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-2)', marginBottom: '3rem', fontSize: '0.95rem' }}>
          Start free. Upgrade when you're ready.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
          {PLANS.map((p) => (
            <div key={p.name} style={{
              background: p.accent ? 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(108,99,255,0.05))' : 'var(--bg-2)',
              border: `1px solid ${p.accent ? 'rgba(108,99,255,0.4)' : 'var(--border)'}`,
              borderRadius: '14px', padding: '1.75rem',
              position: 'relative',
            }}>
              {p.accent && (
                <div style={{
                  position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--accent)', color: '#fff',
                  padding: '0.2rem 0.8rem', borderRadius: '100px',
                  fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: '0.02em',
                }}>MOST POPULAR</div>
              )}
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-2)', marginBottom: '0.75rem' }}>{p.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.04em' }}>{p.price}</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>{p.period}</span>
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: '0.4rem' }}>✓ {p.agents}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: '1.5rem' }}>✓ {p.schedules}</div>
              <Link href="/register" style={{
                display: 'block', textAlign: 'center',
                background: p.accent ? 'var(--accent)' : 'var(--bg-3)',
                color: p.accent ? '#fff' : 'var(--text)',
                border: p.accent ? 'none' : '1px solid var(--border-2)',
                padding: '0.65rem', borderRadius: '8px',
                fontWeight: 600, fontSize: '0.875rem',
              }}>{p.cta}</Link>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '2rem 1.5rem',
        textAlign: 'center',
        color: 'var(--text-3)',
        fontSize: '0.85rem',
      }}>
        © 2026 Nexora · Built for builders
      </footer>
    </div>
  )
}