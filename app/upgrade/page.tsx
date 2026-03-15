'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { formatPlanName, getUser, normalizePlan, refreshCurrentUser } from '@/lib/api'

type PlanName = 'free' | 'starter' | 'pro' | 'business' | 'enterprise'

type UserShape = {
  email?: string
  name?: string
  plan?: string
} | null

const PLANS: Array<{
  name: PlanName
  title: string
  price: string
  period: string
  summary: string
  features: string[]
  accent?: boolean
}> = [
  {
    name: 'free',
    title: 'Free',
    price: '$0',
    period: '',
    summary: 'Best for trying Nexora and building your first agent.',
    features: ['3 agents', '100 messages / month', 'No scheduling'],
  },
  {
    name: 'starter',
    title: 'Starter',
    price: '$19',
    period: '/mo',
    summary: 'Light automation for solo operators and early teams.',
    features: ['5 agents', '5,000 messages / month', '3 schedules'],
  },
  {
    name: 'pro',
    title: 'Pro',
    price: '$49',
    period: '/mo',
    summary: 'The main plan for serious daily AI workflows.',
    features: ['20 agents', '50,000 messages / month', '10 schedules'],
    accent: true,
  },
  {
    name: 'business',
    title: 'Business',
    price: '$149',
    period: '/mo',
    summary: 'High-capacity automation for teams and operations.',
    features: ['100 agents', '500,000 messages / month', '50 schedules'],
  },
  {
    name: 'enterprise',
    title: 'Enterprise',
    price: 'Custom',
    period: '',
    summary: 'Unlimited scale, custom support, and tailored rollout.',
    features: ['Unlimited agents', 'Unlimited messages', 'Unlimited schedules'],
  },
]

const PLAN_ORDER: Record<PlanName, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  business: 3,
  enterprise: 4,
}

export default function UpgradePage() {
  const [user, setUser] = useState<UserShape>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const init = async () => {
      const cachedUser = getUser()
      if (cachedUser) {
        setUser(cachedUser)
      }

      try {
        const freshUser = await refreshCurrentUser()
        if (freshUser) {
          setUser(freshUser)
        }
      } catch {
        // Keep showing cached or logged-out state if refresh fails.
      } finally {
        setHydrated(true)
      }
    }

    init()
  }, [])

  const normalizedPlan = normalizePlan(user?.plan) as PlanName
  const isLoggedIn = Boolean(user)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {isLoggedIn && <Sidebar />}

      <main style={{
        marginLeft: isLoggedIn ? 220 : 0,
        padding: isLoggedIn ? '40px 48px 72px' : '88px 24px 72px',
      }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 20,
            flexWrap: 'wrap',
            marginBottom: 28,
          }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 999,
                background: 'var(--accent-g)',
                color: 'var(--accent)',
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 16,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                Upgrade
              </div>

              <h1 style={{
                fontSize: 'clamp(2rem, 4vw, 3.2rem)',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                color: 'var(--text)',
                margin: 0,
              }}>
                Choose the plan that fits your agents
              </h1>

              <p style={{
                color: 'var(--text-2)',
                fontSize: 16,
                lineHeight: 1.75,
                maxWidth: 720,
                margin: '14px 0 0',
              }}>
                Upgrade to unlock more agents, more messages, and more automation. Your current plan is{' '}
                <span style={{ color: 'var(--text)', fontWeight: 700 }}>
                  {formatPlanName(normalizedPlan)}
                </span>.
              </p>
            </div>

            <Link
              href={isLoggedIn ? '/settings' : '/login'}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                border: '1px solid var(--border-2)',
                background: 'var(--bg-2)',
                color: 'var(--text)',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              {isLoggedIn ? 'Back to settings' : 'Sign in'}
            </Link>
          </div>

          <div style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: 24,
            marginBottom: 28,
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
            }}>
              {[
                { label: 'Current plan', value: formatPlanName(normalizedPlan) },
                { label: 'Best for automation', value: 'Starter+' },
                { label: 'Best value', value: 'Pro' },
              ].map((item) => (
                <div key={item.label} style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: 18,
                }}>
                  <div style={{ color: 'var(--text-3)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    {item.label}
                  </div>
                  <div style={{ color: 'var(--text)', fontSize: 20, fontWeight: 700 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 18,
          }}>
            {PLANS.map((plan) => {
              const isCurrent = normalizedPlan === plan.name
              const canUpgrade = PLAN_ORDER[plan.name] > PLAN_ORDER[normalizedPlan]

              return (
                <section
                  key={plan.name}
                  style={{
                    position: 'relative',
                    background: plan.accent
                      ? 'linear-gradient(180deg, rgba(217,121,85,0.16) 0%, var(--bg-2) 100%)'
                      : 'var(--bg-2)',
                    border: `1px solid ${plan.accent ? 'rgba(217,121,85,0.45)' : 'var(--border)'}`,
                    borderRadius: 20,
                    padding: 22,
                    boxShadow: plan.accent ? '0 18px 48px rgba(217,121,85,0.16)' : 'none',
                  }}
                >
                  {plan.accent && (
                    <div style={{
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      background: 'var(--accent)',
                      color: '#fff',
                      borderRadius: 999,
                      padding: '5px 10px',
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}>
                      Most Popular
                    </div>
                  )}

                  <div style={{ color: 'var(--text)', fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
                    {plan.title}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
                    <span style={{ color: 'var(--text)', fontSize: 34, fontWeight: 800, letterSpacing: '-0.04em' }}>
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span style={{ color: 'var(--text-2)', fontSize: 15 }}>
                        {plan.period}
                      </span>
                    )}
                  </div>

                  <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.7, minHeight: 72, margin: '0 0 18px' }}>
                    {plan.summary}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    {plan.features.map((feature) => (
                      <div key={feature} style={{ color: 'var(--text-2)', fontSize: 14 }}>
                        ✓ {feature}
                      </div>
                    ))}
                  </div>

                  <Link
                    href={plan.name === 'enterprise' ? '/settings' : isLoggedIn ? '/settings' : '/register'}
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      padding: '11px 14px',
                      borderRadius: 12,
                      background: isCurrent ? 'var(--bg-3)' : plan.accent || canUpgrade ? 'var(--accent)' : 'var(--bg-3)',
                      color: (plan.accent || canUpgrade) && !isCurrent ? '#fff' : 'var(--text)',
                      border: isCurrent ? '1px solid var(--border-2)' : 'none',
                      fontSize: 14,
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    {plan.name === 'enterprise'
                      ? 'Contact sales'
                      : isCurrent
                        ? 'Current plan'
                        : canUpgrade
                          ? `Upgrade to ${plan.title}`
                          : 'Available'}
                  </Link>
                </section>
              )
            })}
          </div>

          {!hydrated && (
            <div style={{ marginTop: 24, color: 'var(--text-3)', fontSize: 14 }}>
              Checking your current plan...
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
