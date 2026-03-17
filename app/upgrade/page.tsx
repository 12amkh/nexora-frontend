'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AppStateCard, StateActionButton } from '@/components/AppState'
import { UpgradeLoadingState } from '@/components/LoadingSkeleton'
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
  audience: string
  upgradeValue: string
  features: string[]
  accent?: boolean
  badge?: string
  cta: string
}> = [
  {
    name: 'free',
    title: 'Free',
    price: '$0',
    period: '',
    summary: 'Best for testing Nexora and launching your first AI agent.',
    audience: 'For curious builders and early evaluation',
    upgradeValue: 'Upgrade when you need more message volume or your first automations.',
    features: ['3 agents', '100 messages / month', 'No scheduling'],
    cta: 'Start free',
  },
  {
    name: 'starter',
    title: 'Starter',
    price: '$19',
    period: '/mo',
    summary: 'Add lightweight automation and enough capacity for a single operator or small workflow.',
    audience: 'For solo operators and focused side projects',
    upgradeValue: 'Unlock scheduling so recurring research and summaries keep running without manual work.',
    features: ['5 agents', '5,000 messages / month', '3 schedules'],
    badge: 'Automation starts here',
    cta: 'Choose Starter',
  },
  {
    name: 'pro',
    title: 'Pro',
    price: '$49',
    period: '/mo',
    summary: 'The strongest value for teams running AI research, monitoring, and repeatable daily workflows.',
    audience: 'For serious daily usage and small teams',
    upgradeValue: 'Get the headroom most teams need for multiple agents, higher usage, and dependable automation.',
    features: ['20 agents', '50,000 messages / month', '10 schedules'],
    accent: true,
    badge: 'Best value',
    cta: 'Upgrade to Pro',
  },
  {
    name: 'business',
    title: 'Business',
    price: '$149',
    period: '/mo',
    summary: 'Built for operations teams managing many agents, heavier message volume, and more recurring runs.',
    audience: 'For teams scaling across clients or departments',
    upgradeValue: 'Expand capacity across many workflows without constantly thinking about limits.',
    features: ['100 agents', '500,000 messages / month', '50 schedules'],
    badge: 'High capacity',
    cta: 'Move to Business',
  },
  {
    name: 'enterprise',
    title: 'Enterprise',
    price: 'Custom',
    period: '',
    summary: 'Unlimited scale, custom rollout support, and room for organization-wide deployment.',
    audience: 'For organizations with custom rollout needs',
    upgradeValue: 'Get tailored onboarding, flexible deployment planning, and the highest ceiling.',
    features: ['Unlimited agents', 'Unlimited messages', 'Unlimited schedules'],
    badge: 'Custom rollout',
    cta: 'Contact sales',
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
  const [refreshError, setRefreshError] = useState(false)

  const loadUpgradeContext = async () => {
    const cachedUser = getUser()
    if (cachedUser) {
      setUser(cachedUser)
    }

    try {
      const freshUser = await refreshCurrentUser()
      if (freshUser) {
        setUser(freshUser)
      }
      setRefreshError(false)
    } catch {
      setRefreshError(true)
    } finally {
      setHydrated(true)
    }
  }

  useEffect(() => {
    void loadUpgradeContext()
  }, [])

  const normalizedPlan = normalizePlan(user?.plan) as PlanName
  const isLoggedIn = Boolean(user)
  const nextPlan = PLANS.find((plan) => PLAN_ORDER[plan.name] > PLAN_ORDER[normalizedPlan]) ?? PLANS[2]
  const currentPlanConfig = PLANS.find((plan) => plan.name === normalizedPlan) ?? PLANS[0]

  if (!hydrated) {
    return <UpgradeLoadingState showSidebar={isLoggedIn} />
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {isLoggedIn && <Sidebar />}

      <main
        style={{
          marginLeft: isLoggedIn ? 220 : 0,
          padding: isLoggedIn ? '40px 48px 72px' : '88px 24px 72px',
        }}
      >
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <section
            style={{
              background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-2) 98%, transparent) 0%, color-mix(in srgb, var(--bg) 92%, transparent) 100%)',
              border: '1px solid var(--border)',
              borderRadius: 24,
              padding: 28,
              marginBottom: 28,
              boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 20,
                flexWrap: 'wrap',
                marginBottom: 24,
              }}
            >
              <div>
                <div
                  style={{
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
                  }}
                >
                  Pricing
                </div>

                <h1
                  style={{
                    fontSize: 'clamp(2rem, 4vw, 3.3rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    color: 'var(--text)',
                    margin: 0,
                  }}
                >
                  Pick the plan that matches your AI workload
                </h1>

                <p
                  style={{
                    color: 'var(--text-2)',
                    fontSize: 16,
                    lineHeight: 1.75,
                    maxWidth: 760,
                    margin: '14px 0 0',
                  }}
                >
                  Compare agent limits, message volume, and automation capacity at a glance. Your current plan is{' '}
                  <span style={{ color: 'var(--text)', fontWeight: 700 }}>{formatPlanName(normalizedPlan)}</span>.
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

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              {[
                { label: 'Current plan', value: formatPlanName(normalizedPlan), note: currentPlanConfig.audience },
                { label: 'Best value', value: 'Pro', note: 'The strongest balance of capacity, automation, and price.' },
                { label: 'Recommended next step', value: formatPlanName(nextPlan.name), note: nextPlan.upgradeValue },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 18,
                    padding: 18,
                  }}
                >
                  <div style={{ color: 'var(--text-3)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    {item.label}
                  </div>
                  <div style={{ color: 'var(--text)', fontSize: 21, fontWeight: 700, marginBottom: 8 }}>
                    {item.value}
                  </div>
                  <div style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6 }}>
                    {item.note}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {refreshError && (
            <div style={{ marginBottom: 24 }}>
              <AppStateCard
                eyebrow='Plan refresh issue'
                icon='⚠️'
                title='Showing the last known plan details'
                description='Nexora could not refresh your latest account status, so pricing is shown using the last available profile data. You can retry without leaving this page.'
                tone='warning'
                compact
                actions={<StateActionButton label='Retry refresh' onClick={() => void loadUpgradeContext()} />}
              />
            </div>
          )}

          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: 18,
              marginBottom: 26,
            }}
          >
            {PLANS.map((plan) => {
              const isCurrent = normalizedPlan === plan.name
              const canUpgrade = PLAN_ORDER[plan.name] > PLAN_ORDER[normalizedPlan]

              return (
                <section
                  key={plan.name}
                  style={{
                    position: 'relative',
                    background: plan.accent
                      ? 'linear-gradient(180deg, color-mix(in srgb, var(--accent) 14%, transparent) 0%, var(--bg-2) 100%)'
                      : 'var(--bg-2)',
                    border: `1px solid ${plan.accent ? 'color-mix(in srgb, var(--accent) 46%, transparent)' : 'var(--border)'}`,
                    borderRadius: 22,
                    padding: 22,
                    boxShadow: plan.accent ? '0 18px 48px rgba(217,121,85,0.16)' : 'none',
                    transform: plan.accent ? 'translateY(-4px)' : 'none',
                  }}
                >
                  {(plan.badge || plan.accent) && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 14,
                        right: 14,
                        background: plan.accent ? 'var(--accent)' : 'var(--bg-3)',
                        color: plan.accent ? '#fff' : 'var(--text)',
                        borderRadius: 999,
                        padding: '5px 10px',
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        border: plan.accent ? 'none' : '1px solid var(--border)',
                      }}
                    >
                      {plan.badge || 'Recommended'}
                    </div>
                  )}

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
                      {plan.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
                      <span style={{ color: 'var(--text)', fontSize: 36, fontWeight: 800, letterSpacing: '-0.04em' }}>
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span style={{ color: 'var(--text-2)', fontSize: 15 }}>{plan.period}</span>
                      )}
                    </div>
                    <div
                      style={{
                        display: 'inline-flex',
                        padding: '5px 10px',
                        borderRadius: 999,
                        background: plan.accent ? 'rgba(255,255,255,0.1)' : 'var(--bg-3)',
                        border: `1px solid ${plan.accent ? 'rgba(255,255,255,0.1)' : 'var(--border)'}`,
                        color: plan.accent ? '#fff' : 'var(--text-2)',
                        fontSize: 12,
                        fontWeight: 700,
                        marginBottom: 14,
                      }}
                    >
                      {plan.audience}
                    </div>
                  </div>

                  <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.7, margin: '0 0 14px' }}>
                    {plan.summary}
                  </p>

                  <div
                    style={{
                      background: colorMixCard(plan.accent),
                      border: `1px solid ${plan.accent ? 'rgba(255,255,255,0.08)' : 'var(--border)'}`,
                      borderRadius: 16,
                      padding: 14,
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ color: plan.accent ? '#fff' : 'var(--text)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                      What you unlock
                    </div>
                    <div style={{ color: plan.accent ? 'rgba(255,255,255,0.82)' : 'var(--text-2)', fontSize: 13, lineHeight: 1.65 }}>
                      {plan.upgradeValue}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    {plan.features.map((feature) => (
                      <div key={feature} style={{ color: plan.accent ? '#fff' : 'var(--text-2)', fontSize: 14 }}>
                        ✓ {feature}
                      </div>
                    ))}
                  </div>

                  {isCurrent ? (
                    <div
                      style={{
                        display: 'block',
                        textAlign: 'center',
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: 'var(--bg-3)',
                        color: 'var(--text-2)',
                        border: '1px solid var(--border-2)',
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      Current Plan
                    </div>
                  ) : canUpgrade ? (
                    <Link
                      href="/dashboard/upgrade"
                      style={{
                        display: 'block',
                        textAlign: 'center',
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: plan.accent ? 'var(--accent)' : 'var(--bg-3)',
                        color: plan.accent ? '#fff' : 'var(--text)',
                        border: plan.accent ? 'none' : '1px solid var(--border-2)',
                        fontSize: 14,
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      {plan.cta}
                    </Link>
                  ) : (
                    <div
                      style={{
                        display: 'block',
                        textAlign: 'center',
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: 'var(--bg-3)',
                        color: 'var(--text-3)',
                        border: '1px solid var(--border)',
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      Available on request
                    </div>
                  )}
                </section>
              )
            })}
          </section>

          <section
            style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 22,
              padding: 24,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              {[
                {
                  title: 'More agents',
                  description: 'Create more specialized workflows instead of trying to force one agent to do everything.',
                },
                {
                  title: 'More messages',
                  description: 'Handle deeper research, more chat iterations, and more frequent production usage before hitting limits.',
                },
                {
                  title: 'More schedules',
                  description: 'Automate recurring monitoring, reporting, and updates across more workflows at the same time.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 18,
                    padding: 18,
                  }}
                >
                  <div style={{ color: 'var(--text)', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                    {item.title}
                  </div>
                  <div style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.65 }}>
                    {item.description}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

function colorMixCard(accent?: boolean) {
  return accent ? 'rgba(255,255,255,0.05)' : 'var(--bg)'
}
