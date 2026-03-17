'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const HERO_ROTATIONS = ['every morning.', 'while you sleep.', 'on every schedule.', 'without extra ops.']

const VALUE_PILLS = [
  'AI research agents for live web intelligence',
  'Templates for competitor tracking, news, SEO, and briefs',
  'Automation that runs daily, weekly, or on your cadence',
]

const TRUST_POINTS = [
  { value: '24', label: 'ready-to-use agent types' },
  { value: '< 5 min', label: 'from idea to live agent' },
  { value: '0 code', label: 'required to launch' },
]

const FEATURE_CARDS = [
  {
    icon: '🔎',
    title: 'Research agents that stay current',
    desc: 'Launch AI agents that search the web, track trends, summarize changes, and turn noisy information into clear answers.',
  },
  {
    icon: '🧩',
    title: 'Templates that shorten setup time',
    desc: 'Start from proven agent patterns for market research, competitor monitoring, content prep, SEO, and recurring reporting.',
  },
  {
    icon: '⏱️',
    title: 'Automation that keeps running',
    desc: 'Put agents on schedules so research, summaries, and alerts keep happening even when your team is offline.',
  },
  {
    icon: '🎛️',
    title: 'Controls built for real workflows',
    desc: 'Adjust tone, language, topics, knowledge, and response style so every agent fits the way your team already works.',
  },
]

const FLOW_STEPS = [
  {
    step: '01',
    title: 'Pick a research template',
    desc: 'Choose a starting point like competitor analyst, web researcher, SEO researcher, or news monitor.',
  },
  {
    step: '02',
    title: 'Customize the agent fast',
    desc: 'Set the focus, instructions, tone, memory, and topics you want the agent to watch or avoid.',
  },
  {
    step: '03',
    title: 'Run once or automate it',
    desc: 'Use the agent live in chat, or schedule it to generate recurring updates without manual work.',
  },
]

const TEMPLATE_SPOTLIGHTS = [
  {
    name: 'Competitor Analyst',
    summary: 'Track launches, pricing moves, messaging shifts, and positioning changes across competitors.',
  },
  {
    name: 'Web Researcher',
    summary: 'Collect and condense live research on any topic into usable findings, recommendations, and sources.',
  },
  {
    name: 'SEO Researcher',
    summary: 'Turn search intent, keyword ideas, and content angles into clearer briefs for your content pipeline.',
  },
  {
    name: 'News Monitor',
    summary: 'Keep a running watch on industries, companies, and trends that need frequent updates.',
  },
]

const PLANS = [
  { name: 'Free', price: '$0', period: '', agents: '3 agents', messages: '100 messages / month', schedules: 'No scheduling', cta: 'Get started', accent: false },
  { name: 'Starter', price: '$19', period: '/mo', agents: '5 agents', messages: '5,000 messages / month', schedules: '3 schedules', cta: 'Start free trial', accent: false },
  { name: 'Pro', price: '$49', period: '/mo', agents: '20 agents', messages: '50,000 messages / month', schedules: '10 schedules', cta: 'Go Pro', accent: true },
  { name: 'Business', price: '$149', period: '/mo', agents: '100 agents', messages: '500,000 messages / month', schedules: '50 schedules', cta: 'Scale up', accent: false },
  { name: 'Enterprise', price: 'Custom', period: '', agents: 'Unlimited agents', messages: 'Unlimited messages', schedules: 'Unlimited schedules', cta: 'Contact sales', accent: false },
]

const NAV: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 2rem',
  height: '64px',
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 100,
  background: 'color-mix(in srgb, var(--bg) 78%, transparent)',
  backdropFilter: 'blur(20px)',
  borderBottom: '1px solid var(--border)',
}

const sectionEyebrowStyle: React.CSSProperties = {
  textAlign: 'center',
  fontSize: '0.78rem',
  fontWeight: 700,
  letterSpacing: '0.14em',
  color: 'var(--accent)',
  textTransform: 'uppercase',
  marginBottom: '1rem',
}

export default function LandingPage() {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 80)
    return () => window.clearInterval(timer)
  }, [])

  const suffix = HERO_ROTATIONS[Math.floor(tick / 40) % HERO_ROTATIONS.length]
  const charIdx = tick % 44
  const animatedSuffix = suffix.slice(0, Math.min(charIdx, suffix.length))
  const cursorVisible = tick % 10 < 5

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', overflowX: 'hidden' }}>
      <nav style={NAV}>
        <span style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.03em', color: 'var(--text)' }}>
          Nexora
        </span>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link href="/login" style={{ color: 'var(--text-2)', fontSize: '0.9rem', padding: '0.4rem 0.9rem' }}>
            Sign in
          </Link>
          <Link
            href="/register"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              padding: '0.5rem 1.1rem',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Start free
          </Link>
        </div>
      </nav>

      <section
        style={{
          padding: '132px 1.5rem 92px',
          maxWidth: '1180px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '28px',
            alignItems: 'stretch',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-2) 92%, transparent) 0%, color-mix(in srgb, var(--bg) 88%, transparent) 100%)',
              border: '1px solid var(--border)',
              borderRadius: '28px',
              padding: '28px',
              boxShadow: '0 26px 60px rgba(0,0,0,0.14)',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.55rem',
                padding: '0.38rem 0.95rem',
                borderRadius: '999px',
                border: '1px solid var(--border-2)',
                background: 'var(--bg-2)',
                fontSize: '0.78rem',
                color: 'var(--text-2)',
                marginBottom: '1.5rem',
                letterSpacing: '0.03em',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
              AI research agents with automation built in
            </div>

            <h1
              style={{
                fontSize: 'clamp(2.4rem, 5.6vw, 4.8rem)',
                fontWeight: 800,
                letterSpacing: '-0.05em',
                lineHeight: 1.02,
                marginBottom: '1.2rem',
                color: 'var(--text)',
                maxWidth: '760px',
              }}
            >
              Build AI research agents that keep working{' '}
              <span style={{ color: 'var(--accent)' }}>
                {animatedSuffix}
                <span style={{ opacity: cursorVisible ? 1 : 0, color: 'var(--text-2)' }}>|</span>
              </span>
            </h1>

            <p
              style={{
                fontSize: '1.05rem',
                color: 'var(--text-2)',
                lineHeight: 1.75,
                maxWidth: '640px',
                marginBottom: '1.5rem',
              }}
            >
              Nexora helps teams launch AI agents for live research, recurring monitoring, and automated reporting.
              Start from templates, customize the workflow, then let your agents run on demand or on schedule.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginBottom: '1.75rem' }}>
              {VALUE_PILLS.map((pill) => (
                <div
                  key={pill}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '999px',
                    border: '1px solid var(--border)',
                    background: 'color-mix(in srgb, var(--bg-2) 88%, transparent)',
                    color: 'var(--text)',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                  }}
                >
                  {pill}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '1.8rem' }}>
              <Link
                href="/register"
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  padding: '0.9rem 1.8rem',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.96rem',
                  textDecoration: 'none',
                  boxShadow: '0 20px 40px color-mix(in srgb, var(--accent) 32%, transparent)',
                }}
              >
                Start building for free
              </Link>
              <Link
                href="/register"
                style={{
                  background: 'var(--bg-3)',
                  color: 'var(--text)',
                  padding: '0.9rem 1.35rem',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '0.96rem',
                  border: '1px solid var(--border-2)',
                  textDecoration: 'none',
                }}
              >
                Explore templates
              </Link>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '12px',
              }}
            >
              {TRUST_POINTS.map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: '1rem 1rem 0.95rem',
                    borderRadius: '18px',
                    border: '1px solid var(--border)',
                    background: 'color-mix(in srgb, var(--bg-2) 82%, transparent)',
                  }}
                >
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text)' }}>
                    {item.value}
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-2)', lineHeight: 1.55, marginTop: '0.3rem' }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gap: '18px',
            }}
          >
            <div
              style={{
                background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-2) 96%, transparent) 0%, color-mix(in srgb, var(--bg-3) 90%, transparent) 100%)',
                border: '1px solid var(--border)',
                borderRadius: '28px',
                padding: '22px',
                boxShadow: '0 26px 60px rgba(0,0,0,0.14)',
              }}
            >
              <div style={{ color: 'var(--text-3)', fontSize: '0.73rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.85rem' }}>
                Product Flow
              </div>
              <div style={{ display: 'grid', gap: '14px' }}>
                {FLOW_STEPS.map((item) => (
                  <div
                    key={item.step}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '52px minmax(0, 1fr)',
                      gap: '12px',
                      padding: '0.95rem',
                      borderRadius: '18px',
                      background: 'var(--bg-2)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '16px',
                        background: 'var(--accent-g)',
                        color: 'var(--accent)',
                        fontWeight: 800,
                        display: 'grid',
                        placeItems: 'center',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {item.step}
                    </div>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.35rem' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-2)', lineHeight: 1.65 }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                background: 'linear-gradient(160deg, color-mix(in srgb, var(--accent) 12%, var(--bg-2)) 0%, var(--bg-2) 100%)',
                border: '1px solid color-mix(in srgb, var(--accent) 28%, var(--border))',
                borderRadius: '28px',
                padding: '22px',
              }}
            >
              <div style={{ color: 'var(--text-3)', fontSize: '0.73rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.85rem' }}>
                What teams use Nexora for
              </div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {[
                  'Daily competitor snapshots before standup',
                  'Automated research briefs for content and SEO',
                  'Recurring news monitoring for clients or internal teams',
                ].map((item) => (
                  <div
                    key={item}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.7rem',
                      padding: '0.82rem 0.9rem',
                      borderRadius: '16px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: 'var(--text)',
                      fontSize: '0.89rem',
                    }}
                  >
                    <span style={{ color: 'var(--accent)', fontWeight: 800 }}>+</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, var(--border-2), transparent)', maxWidth: '940px', margin: '0 auto' }} />

      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '78px 1.5rem 36px' }}>
        <p style={sectionEyebrowStyle}>Why Nexora</p>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.8rem, 3.7vw, 2.8rem)', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '0.9rem' }}>
          Clear value from the first run
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: '1rem', lineHeight: 1.75, maxWidth: '760px', margin: '0 auto 2.6rem' }}>
          Nexora is built for teams that want AI agents to produce useful research and recurring outputs, not just chat in a sandbox.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1px',
            background: 'var(--border)',
            border: '1px solid var(--border)',
            borderRadius: '22px',
            overflow: 'hidden',
          }}
        >
          {FEATURE_CARDS.map((feature) => (
            <div key={feature.title} style={{ background: 'var(--bg-2)', padding: '2rem 1.7rem' }}>
              <div style={{ fontSize: '1.55rem', marginBottom: '0.9rem' }}>{feature.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.55rem', letterSpacing: '-0.01em' }}>{feature.title}</div>
              <div style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.72 }}>{feature.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 1.5rem 90px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          <div
            style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: '24px',
              padding: '24px',
            }}
          >
            <div style={{ color: 'var(--accent)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>
              Templates
            </div>
            <h3 style={{ fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '0.9rem' }}>
              Start from agent templates that already make sense
            </h3>
            <p style={{ color: 'var(--text-2)', lineHeight: 1.75, fontSize: '0.98rem', marginBottom: '1.4rem' }}>
              Instead of starting with a blank prompt, begin with a purpose-built template and adapt it to your market, clients, or internal workflow.
            </p>
            <div style={{ display: 'grid', gap: '10px' }}>
              {[
                'Live web search enabled where freshness matters',
                'Opinionated defaults for tone, structure, and depth',
                'Easy to tune for briefs, alerts, monitoring, and summaries',
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    display: 'flex',
                    gap: '0.7rem',
                    alignItems: 'center',
                    color: 'var(--text)',
                    fontSize: '0.9rem',
                  }}
                >
                  <span style={{ color: 'var(--green)', fontWeight: 800 }}>✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '14px',
            }}
          >
            {TEMPLATE_SPOTLIGHTS.map((template) => (
              <div
                key={template.name}
                style={{
                  background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-2) 98%, transparent) 0%, color-mix(in srgb, var(--bg-3) 88%, transparent) 100%)',
                  border: '1px solid var(--border)',
                  borderRadius: '20px',
                  padding: '18px',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    padding: '0.3rem 0.7rem',
                    borderRadius: '999px',
                    background: 'var(--accent-g)',
                    color: 'var(--accent)',
                    fontSize: '0.73rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '0.9rem',
                  }}
                >
                  Template
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.45rem' }}>
                  {template.name}
                </div>
                <div style={{ color: 'var(--text-2)', fontSize: '0.88rem', lineHeight: 1.68 }}>
                  {template.summary}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 1.5rem 100px' }}>
        <p style={sectionEyebrowStyle}>Pricing</p>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.8rem, 3.7vw, 2.7rem)', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '0.75rem' }}>
          Start simple, scale into automation
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-2)', marginBottom: '3rem', fontSize: '0.97rem' }}>
          Try Nexora free, then upgrade when you need more agents, more messages, and more scheduled runs.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              style={{
                background: plan.accent ? 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, transparent), color-mix(in srgb, var(--accent) 4%, var(--bg-2)))' : 'var(--bg-2)',
                border: `1px solid ${plan.accent ? 'color-mix(in srgb, var(--accent) 42%, transparent)' : 'var(--border)'}`,
                borderRadius: '18px',
                padding: '1.75rem',
                position: 'relative',
              }}
            >
              {plan.accent && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-11px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--accent)',
                    color: '#fff',
                    padding: '0.22rem 0.82rem',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.02em',
                  }}
                >
                  MOST POPULAR
                </div>
              )}
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-2)', marginBottom: '0.75rem' }}>{plan.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.04em' }}>{plan.price}</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>{plan.period}</span>
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: '0.4rem' }}>✓ {plan.agents}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: '0.4rem' }}>✓ {plan.messages}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: '1.5rem' }}>✓ {plan.schedules}</div>
              <Link
                href="/register"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  background: plan.accent ? 'var(--accent)' : 'var(--bg-3)',
                  color: plan.accent ? '#fff' : 'var(--text)',
                  border: plan.accent ? 'none' : '1px solid var(--border-2)',
                  padding: '0.68rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: '980px', margin: '0 auto', padding: '0 1.5rem 110px' }}>
        <div
          style={{
            borderRadius: '28px',
            border: '1px solid color-mix(in srgb, var(--accent) 24%, var(--border))',
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, var(--bg-2)) 0%, color-mix(in srgb, var(--bg-2) 96%, transparent) 100%)',
            padding: '30px',
            textAlign: 'center',
          }}
        >
          <div style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.9rem' }}>
            Get started
          </div>
          <h2 style={{ fontSize: 'clamp(1.9rem, 4vw, 3rem)', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '0.9rem' }}>
            Launch your first AI research agent today
          </h2>
          <p style={{ color: 'var(--text-2)', fontSize: '1rem', lineHeight: 1.75, maxWidth: '660px', margin: '0 auto 1.6rem' }}>
            Use a template, customize it in minutes, and turn live research into a workflow your team can actually reuse.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
            <Link
              href="/register"
              style={{
                background: 'var(--accent)',
                color: '#fff',
                padding: '0.9rem 1.7rem',
                borderRadius: '12px',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Create free account
            </Link>
            <Link
              href="/login"
              style={{
                background: 'transparent',
                color: 'var(--text)',
                padding: '0.9rem 1.4rem',
                borderRadius: '12px',
                fontWeight: 600,
                border: '1px solid var(--border-2)',
                textDecoration: 'none',
              }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer
        style={{
          borderTop: '1px solid var(--border)',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          color: 'var(--text-3)',
          fontSize: '0.85rem',
        }}
      >
        © 2026 Nexora · AI research agents and automation for modern teams
      </footer>
    </div>
  )
}
