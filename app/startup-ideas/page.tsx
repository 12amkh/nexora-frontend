'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import Sidebar from '@/components/Sidebar'
import { AppStateCard, StateActionButton } from '@/components/AppState'
import { api, getErrorMessage, getUser } from '@/lib/api'
import { useToast } from '@/components/ToastProvider'
import RichContent from '@/components/RichContent'

type Workflow = {
  id: number
  name: string
  description: string
  agent_ids: number[]
}

type WorkflowRunStep = {
  agent_id: number
  agent_name: string
  prompt: string
  output: string
}

type WorkflowRunResult = {
  id?: number | null
  workflow_id: number
  input: string
  final_output: string
  status?: string
  steps: WorkflowRunStep[]
  created_at?: string | null
}

type ResultCard = {
  label: string
  value: string
  detail: string
}

const TEMPLATE_ID = 'market-research-startup-summary'
const WORKFLOW_TITLE = 'Market Research → Startup Idea Generation → Summary Report'
const EXAMPLE_TOPICS = [
  'AI tools for independent restaurants',
  'Workflow problems inside dental clinics',
  'Software for repair shops with missed bookings',
  'Startup idea in B2B logistics operations',
]

const KNOWN_HEADINGS = [
  'winning opportunity',
  'best opportunity',
  'target user',
  'target market',
  'business buyer',
  'exact workflow being automated',
  'what to build first',
  'immediate next steps',
  'why this works now',
  'why it wins',
  'why now',
  'business model',
  '30-day plan',
  'startup idea',
  'problem',
  'solution',
  'opportunity',
]

function normalizeHeadingText(line: string) {
  return line
    .trim()
    .replace(/^#{1,6}\s*/, '')
    .replace(/^\d+[\.\)]\s*/, '')
    .replace(/\s*:\s*$/, '')
    .trim()
    .toLowerCase()
}

function extractSectionContent(content: string, headings: string[]) {
  const normalized = (content || '').replace(/\r/g, '').trim()
  if (!normalized) return ''

  const lines = normalized.split('\n')
  const headingSet = new Set(KNOWN_HEADINGS)
  const normalizedHeadings = headings.map((heading) => heading.toLowerCase())
  const startIndex = lines.findIndex((line) => normalizedHeadings.includes(normalizeHeadingText(line)))

  if (startIndex === -1) return ''

  const collected: string[] = []
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const rawLine = lines[index]
    const normalizedLine = normalizeHeadingText(rawLine)

    if (normalizedLine && headingSet.has(normalizedLine)) {
      break
    }

    collected.push(rawLine)
  }

  return collected.join('\n').trim()
}

function toShortText(content: string, maxLength = 220) {
  const text = (content || '').replace(/^#+\s*/gm, '').replace(/\s+/g, ' ').trim()
  if (!text) return 'No result yet.'
  return text.length > maxLength ? `${text.slice(0, maxLength - 3).trimEnd()}...` : text
}

function firstAvailableSection(sources: string[], headings: string[]) {
  for (const source of sources) {
    const value = extractSectionContent(source, headings)
    if (value) return value
  }
  return ''
}

export default function StartupIdeasPage() {
  const router = useRouter()
  const { pushToast, updateToast } = useToast()
  const [workflowId, setWorkflowId] = useState<number | null>(null)
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [runResult, setRunResult] = useState<WorkflowRunResult | null>(null)

  useEffect(() => {
    if (!getUser()) {
      router.push('/login')
      return
    }

    const init = async () => {
      try {
        const { data } = await api.get('/workflows/list')
        const workflows = Array.isArray(data) ? (data as Workflow[]) : []
        const existing = workflows.find((workflow) => workflow.name === WORKFLOW_TITLE)
        if (existing) {
          setWorkflowId(existing.id)
        }
      } catch {
        // Keep page usable. Workflow will be created lazily on first generate.
      } finally {
        setLoading(false)
      }
    }

    void init()
  }, [router])

  const ensureWorkflow = async () => {
    if (workflowId) return workflowId

    const { data } = await api.post(`/workflows/templates/${TEMPLATE_ID}/apply`)
    setWorkflowId(data.id)
    return data.id as number
  }

  const resultCards = useMemo<ResultCard[]>(() => {
    if (!runResult) return []

    const sources = [
      runResult.final_output,
      ...runResult.steps.map((step) => step.output).reverse(),
    ]

    const winningIdea = firstAvailableSection(sources, ['Winning Opportunity', 'Best Opportunity', 'Startup Idea']) || runResult.final_output
    const targetUser = firstAvailableSection(sources, ['Target User', 'Target Market', 'Business Buyer'])
    const problem = firstAvailableSection(sources, ['Problem', 'Exact Workflow Being Automated'])
    const buildFirst = firstAvailableSection(sources, ['What to Build First', 'Immediate Next Steps', 'Solution'])
    const businessModel = firstAvailableSection(sources, ['Business Model'])
    const plan = firstAvailableSection(sources, ['30-Day Plan'])

    return [
      {
        label: 'Winning Idea',
        value: toShortText(winningIdea, 180),
        detail: 'The single startup opportunity Nexora believes is strongest.',
      },
      {
        label: 'Target User',
        value: toShortText(targetUser, 180),
        detail: 'The buyer or operator this product is meant for.',
      },
      {
        label: 'Problem',
        value: toShortText(problem, 180),
        detail: 'The real workflow pain this startup should solve first.',
      },
      {
        label: 'What to Build',
        value: toShortText(buildFirst, 180),
        detail: 'The MVP wedge a small team can start building next.',
      },
      {
        label: 'Business Model',
        value: toShortText(businessModel, 180),
        detail: 'Who pays and how this startup could make money.',
      },
      {
        label: '30-Day Plan',
        value: toShortText(plan, 180),
        detail: 'The first month of execution after the decision is made.',
      },
    ]
  }, [runResult])

  const handleGenerate = async () => {
    if (!topic.trim() || generating) return

    setGenerating(true)
    setError('')
    const toastId = pushToast({
      title: 'Generating startup idea',
      description: 'Running market research, narrowing the wedge, and creating a decision memo.',
      tone: 'loading',
      dismissible: false,
    })

    try {
      const nextWorkflowId = await ensureWorkflow()
      const { data } = await api.post(`/workflows/${nextWorkflowId}/run`, {
        input: topic.trim(),
      })
      setRunResult(data)
      updateToast(toastId, {
        title: 'Startup opportunity ready',
        description: 'Nexora picked a winning idea and mapped what to build next.',
        tone: 'success',
        dismissible: true,
      })
    } catch (err: unknown) {
      const message = getErrorMessage(err)
      setError(message)
      updateToast(toastId, {
        title: "Couldn't generate startup opportunity",
        description: message,
        tone: 'error',
        dismissible: true,
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar />
      <main className='app-shell-main'>
        <div className='app-shell-content' style={{ maxWidth: 1180 }}>
          <div className='dashboard-header'>
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
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}
              >
                Focused product surface
              </div>
              <h1 style={{ fontSize: 36, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px', letterSpacing: '-0.04em', maxWidth: 860 }}>
                Give Nexora a market. Get the best startup opportunity and what to build next.
              </h1>
              <p style={{ color: 'var(--text-2)', margin: 0, fontSize: 16, lineHeight: 1.8, maxWidth: 760 }}>
                This is the clearest way to use Nexora. Enter a topic, let the workflow research the market and narrow the wedge, and get back one decision-ready startup recommendation.
              </p>
            </div>
          </div>

          <section
            style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, var(--bg-2)) 0%, var(--bg-2) 72%)',
              border: '1px solid color-mix(in srgb, var(--accent) 24%, var(--border))',
              borderRadius: 24,
              padding: 22,
              display: 'grid',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700 }}>
                Start with a market or workflow problem
              </div>
              <div style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.7 }}>
                Good prompts are usually a niche, business type, workflow problem, or emerging market. Nexora will research it, generate startup wedges, and choose the strongest one.
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                padding: 18,
                display: 'grid',
                gap: 14,
              }}
            >
              <textarea
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder='Examples: AI tools for restaurants, workflow pain inside clinics, startup opportunity in logistics operations'
                rows={4}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text)',
                  fontSize: 15,
                  lineHeight: 1.8,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {EXAMPLE_TOPICS.map((example) => (
                  <button
                    key={example}
                    type='button'
                    onClick={() => setTopic(example)}
                    style={{
                      padding: '9px 13px',
                      borderRadius: 999,
                      border: '1px solid var(--border)',
                      background: 'var(--bg-3)',
                      color: 'var(--text)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {example}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ color: 'var(--text-3)', fontSize: 13 }}>
                  Workflow used: Market Research → Startup Idea Generation → Summary Report
                </div>
                <button
                  type='button'
                  onClick={() => void handleGenerate()}
                  disabled={loading || generating || !topic.trim()}
                  style={{
                    padding: '12px 18px',
                    borderRadius: 14,
                    border: 'none',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: loading || generating || !topic.trim() ? 'not-allowed' : 'pointer',
                    minWidth: 210,
                  }}
                >
                  {generating ? 'Generating...' : 'Generate startup idea'}
                </button>
              </div>
            </div>
          </section>

          {error ? (
            <div style={{ marginBottom: 24 }}>
              <AppStateCard
                eyebrow='Generation issue'
                icon='⚠️'
                title='Nexora could not finish this startup idea run'
                description={error}
                tone='error'
                actions={<StateActionButton label='Try again' onClick={() => void handleGenerate()} />}
              />
            </div>
          ) : null}

          {generating ? (
            <section
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 22,
                padding: 22,
                display: 'grid',
                gap: 14,
              }}
            >
              <div style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700 }}>
                Building your startup recommendation
              </div>
              <div style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.7 }}>
                Nexora is moving through the full workflow to research the market, narrow the wedge, and create a decision memo.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {[
                  '1. Market research',
                  '2. Startup wedge generation',
                  '3. Final recommendation',
                ].map((item) => (
                  <div
                    key={item}
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 16,
                      padding: 16,
                      color: 'var(--text)',
                      fontSize: 15,
                      fontWeight: 700,
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>
          ) : runResult ? (
            <section style={{ display: 'grid', gap: 18 }}>
              <div
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 22,
                  padding: 22,
                  display: 'grid',
                  gap: 18,
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
                      background: 'rgba(217,121,85,0.1)',
                      color: 'var(--accent)',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: 12,
                    }}
                  >
                    Generated result
                  </div>
                  <div style={{ color: 'var(--text)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8 }}>
                    Startup opportunity result
                  </div>
                  <div style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.75 }}>
                    Topic: <span style={{ color: 'var(--text)' }}>{runResult.input}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
                  {resultCards.map((card) => (
                    <div
                      key={card.label}
                      style={{
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        borderRadius: 18,
                        padding: 16,
                        display: 'grid',
                        gap: 8,
                      }}
                    >
                      <div style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        {card.label}
                      </div>
                      <div style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700, lineHeight: 1.55 }}>
                        {card.value}
                      </div>
                      <div style={{ color: 'var(--text-2)', fontSize: 12, lineHeight: 1.6 }}>
                        {card.detail}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 22,
                  padding: 22,
                }}
              >
                <div style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, marginBottom: 14 }}>
                  Full recommendation
                </div>
                <div style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.85 }}>
                  <RichContent content={runResult.final_output} />
                </div>
              </div>
            </section>
          ) : (
            <section
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 22,
                padding: 24,
              }}
            >
              <div style={{ maxWidth: 760 }}>
                <div style={{ color: 'var(--text)', fontSize: 24, fontWeight: 700, marginBottom: 10 }}>
                  One input. One startup decision.
                </div>
                <div style={{ color: 'var(--text-2)', fontSize: 15, lineHeight: 1.8 }}>
                  Enter a market, workflow pain, or business type above. Nexora will run the full chain and return a focused startup opportunity with the buyer, problem, MVP, business model, and first 30 days.
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
