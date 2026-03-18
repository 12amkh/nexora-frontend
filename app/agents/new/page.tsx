'use client'
// app/agents/new/page.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, getErrorMessage } from '@/lib/api'

type AgentConfigForm = {
  instructions: string
  tone: 'professional' | 'friendly' | 'analytical' | 'creative' | 'casual' | 'persuasive'
  use_web_search: boolean
  response_length: 'short' | 'medium' | 'detailed'
  welcome_message: string
  report_mode: boolean
  focus_topics: string
  avoid_topics: string
}

type TemplatePreset = {
  id: string
  title: string
  subtitle: string
  emoji: string
  description: string
  agentType: string
  name: string
  config: AgentConfigForm
}

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

const DEFAULT_CONFIG: AgentConfigForm = {
  instructions: '',
  tone: 'professional',
  use_web_search: true,
  response_length: 'medium',
  welcome_message: '',
  report_mode: false,
  focus_topics: '',
  avoid_topics: '',
}

function cloneConfig(config: AgentConfigForm): AgentConfigForm {
  return { ...config }
}

function parseTopicList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function createTemplateConfig(config: Partial<AgentConfigForm>): AgentConfigForm {
  return {
    ...DEFAULT_CONFIG,
    ...config,
  }
}

function getDefaultConfigForType(type: string): AgentConfigForm {
  if (type === 'news_monitor') {
    return createTemplateConfig({
      tone: 'analytical',
      use_web_search: true,
      response_length: 'medium',
      instructions:
        'Monitor developments, summarize what changed, and separate signal from noise. Lead with the most meaningful developments, explain why they matter, and keep the output practical.',
      welcome_message: 'Hi! I can monitor important developments and summarize the strongest signals for you.',
      report_mode: false,
      focus_topics: 'latest developments, notable launches, trend shifts, market signals',
      avoid_topics: 'unsupported rumors, vague hot takes, filler commentary',
    })
  }

  if (type === 'competitor_analyst') {
    return createTemplateConfig({
      tone: 'analytical',
      use_web_search: true,
      response_length: 'detailed',
      instructions:
        'Compare competitors with a strategy lens. Highlight positioning, pricing, product movement, messaging changes, and what creates risk or opportunity.',
      welcome_message: 'Hi! I can compare competitors and surface what changed, why it matters, and where the opportunity is.',
      report_mode: false,
      focus_topics: 'positioning, pricing, product updates, feature gaps, messaging shifts',
      avoid_topics: 'generic company descriptions, unsupported assumptions, hype',
    })
  }

  if (type === 'web_researcher') {
    return createTemplateConfig({
      tone: 'analytical',
      use_web_search: true,
      response_length: 'detailed',
      instructions:
        'Research the topic from multiple angles, synthesize the strongest findings, and produce a structured answer with useful takeaways instead of a raw link dump.',
      welcome_message: 'Hi! Give me a topic or question and I will turn live research into a clear, useful brief.',
      report_mode: false,
      focus_topics: 'recent sources, key findings, summaries, recommendations',
      avoid_topics: 'thin summaries, unsupported claims, repetitive source lists',
    })
  }

  if (type === 'content_writer') {
    return createTemplateConfig({
      tone: 'persuasive',
      use_web_search: false,
      response_length: 'medium',
      instructions:
        'Write with clear structure, strong hooks, and practical messaging. Optimize for clarity, momentum, and audience fit rather than generic filler.',
      welcome_message: 'Hi! I can help turn ideas into content drafts, angles, and polished messaging.',
      report_mode: false,
      focus_topics: 'strong hooks, structure, audience fit, calls to action',
      avoid_topics: 'keyword stuffing, vague filler, robotic copy',
    })
  }

  if (type === 'data_interpreter') {
    return createTemplateConfig({
      tone: 'analytical',
      use_web_search: false,
      response_length: 'detailed',
      instructions:
        'Interpret information and turn it into decisions. Explain the key pattern, what changed, what to watch, and what action should follow.',
      welcome_message: 'Hi! I can interpret findings, spot patterns, and turn raw information into decisions.',
      report_mode: false,
      focus_topics: 'patterns, insights, prioritization, implications',
      avoid_topics: 'raw data dumps, vague conclusions, unnecessary jargon',
    })
  }

  return createTemplateConfig({
    tone: 'professional',
    use_web_search: ['web_researcher', 'news_monitor', 'competitor_analyst'].includes(type),
    response_length: ['web_researcher', 'news_monitor', 'competitor_analyst'].includes(type) ? 'detailed' : 'medium',
  })
}

const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'ai-trend-monitor',
    title: 'AI Trend Monitor',
    subtitle: 'Daily signal tracker',
    emoji: '📡',
    description: 'Monitors AI launches, model updates, funding, and market shifts to surface what matters first.',
    agentType: 'news_monitor',
    name: 'AI Trend Monitor',
    config: createTemplateConfig({
      instructions:
        'Track the AI market with an operator lens. Prioritize launches, model updates, funding, product direction, and ecosystem shifts. Summarize what changed, why it matters, and where momentum is building.',
      tone: 'analytical',
      use_web_search: true,
      response_length: 'detailed',
      welcome_message: 'Hi! I can monitor AI launches, funding, model updates, and the strongest market signals for you.',
      report_mode: true,
      focus_topics: 'AI launches, model releases, startup funding, product strategy moves, market adoption signals',
      avoid_topics: 'celebrity AI gossip, unverified rumors, generic hype summaries',
    }),
  },
  {
    id: 'competitor-analyzer',
    title: 'Competitor Analyzer',
    subtitle: 'Positioning and pricing watch',
    emoji: '🧭',
    description: 'Analyzes competitors to show what changed in positioning, offers, pricing, and product strategy.',
    agentType: 'competitor_analyst',
    name: 'Competitor Analyzer',
    config: createTemplateConfig({
      instructions:
        'Analyze competitors like a strategy lead. Compare positioning, pricing, feature sets, launches, messaging, and go-to-market shifts. Focus on what changed and what action your team should consider next.',
      tone: 'analytical',
      use_web_search: true,
      response_length: 'detailed',
      welcome_message: 'Hi! Tell me the competitor, market, or category you want analyzed and I will surface the important moves.',
      report_mode: true,
      focus_topics: 'positioning, pricing, product updates, differentiation, messaging, strategic moves',
      avoid_topics: 'shallow company bios, unsupported speculation, broad market filler',
    }),
  },
  {
    id: 'startup-idea-generator',
    title: 'Startup Idea Generator',
    subtitle: 'Market gaps and concepts',
    emoji: '💡',
    description: 'Generates sharper startup concepts from real demand signals, pain points, and market shifts.',
    agentType: 'custom',
    name: 'Startup Idea Generator',
    config: createTemplateConfig({
      instructions:
        'Generate startup ideas grounded in actual pain points, workflow friction, and market change. For each idea, explain the user, the problem, the wedge, possible business model, and how to validate demand quickly.',
      tone: 'creative',
      use_web_search: true,
      response_length: 'detailed',
      welcome_message: 'Hi! I can generate startup ideas based on market gaps, demand signals, and underserved users.',
      report_mode: true,
      focus_topics: 'pain points, market gaps, demand signals, target users, validation paths',
      avoid_topics: 'sci-fi moonshots, impossible business models, copied trend-chasing ideas',
    }),
  },
  {
    id: 'market-research-agent',
    title: 'Market Research Agent',
    subtitle: 'Demand and landscape mapper',
    emoji: '🗺️',
    description: 'Turns messy market information into a clear picture of demand, segments, competitors, and risks.',
    agentType: 'web_researcher',
    name: 'Market Research Agent',
    config: createTemplateConfig({
      instructions:
        'Act like a strategic market analyst, not a cautious assistant. Even when exact data is unavailable, infer likely patterns from adjacent markets, similar products, customer behavior, and industry trends. Always produce a structured market analysis that covers trends, assumptions, competitive landscape, opportunities, and strategic takeaways. Focus on forward-looking insight and decision-making value instead of defensive caveats.',
      tone: 'analytical',
      use_web_search: true,
      response_length: 'detailed',
      welcome_message: 'Hi! Share a market, product idea, or future category and I will turn it into a strategic market analysis.',
      report_mode: true,
      focus_topics: 'trends, assumptions, adjacent markets, customer behavior, competitive landscape, opportunities',
      avoid_topics: 'defensive caveats, no-data refusals, vague TAM claims, generic summaries',
    }),
  },
  {
    id: 'product-strategy-agent',
    title: 'Product Strategy Agent',
    subtitle: 'Positioning and roadmap thinking',
    emoji: '🧱',
    description: 'Helps turn research and user context into product direction, prioritization, and strategic tradeoffs.',
    agentType: 'data_interpreter',
    name: 'Product Strategy Agent',
    config: createTemplateConfig({
      instructions:
        'Think like a product strategist. Use available context to identify the strongest opportunities, tradeoffs, differentiators, and roadmap priorities. Frame recommendations clearly and tie them back to user value.',
      tone: 'professional',
      use_web_search: true,
      response_length: 'detailed',
      welcome_message: 'Hi! I can help shape product direction, positioning, and roadmap priorities from market and user context.',
      report_mode: true,
      focus_topics: 'product opportunities, prioritization, differentiation, roadmap decisions, user value',
      avoid_topics: 'feature dumping, vague brainstorming without prioritization, engineering implementation detail',
    }),
  },
  {
    id: 'content-creation-agent',
    title: 'Content Creation Agent',
    subtitle: 'Angles, briefs, and drafts',
    emoji: '✍️',
    description: 'Builds sharper content ideas, outlines, briefs, and draft directions tailored to a clear audience.',
    agentType: 'content_writer',
    name: 'Content Creation Agent',
    config: createTemplateConfig({
      instructions:
        'Create high-quality content with strategic intent. Focus on strong hooks, useful structure, audience relevance, and a clear narrative arc. When helpful, turn raw research into briefs, outlines, or first drafts.',
      tone: 'persuasive',
      use_web_search: true,
      response_length: 'medium',
      welcome_message: 'Hi! I can help you turn ideas, research, and goals into strong content angles, briefs, and drafts.',
      report_mode: false,
      focus_topics: 'hooks, narratives, outlines, audience fit, conversion angles, editorial clarity',
      avoid_topics: 'generic fluff, repetitive AI phrasing, overstuffed SEO copy',
    }),
  },
  {
    id: 'seo-research-agent',
    title: 'SEO Research Agent',
    subtitle: 'Keyword and intent mapper',
    emoji: '📈',
    description: 'Finds SEO opportunities by connecting topics, search intent, keyword clusters, and content gaps.',
    agentType: 'web_researcher',
    name: 'SEO Research Agent',
    config: createTemplateConfig({
      instructions:
        'Research SEO opportunities with a strategist mindset. Map search intent, keyword clusters, content gaps, SERP themes, and pages worth creating. Recommend content angles that match real user intent.',
      tone: 'analytical',
      use_web_search: true,
      response_length: 'detailed',
      welcome_message: 'Hi! Give me a topic, audience, or keyword theme and I will find SEO opportunities worth pursuing.',
      report_mode: true,
      focus_topics: 'search intent, keyword clusters, topic gaps, SERP themes, content opportunities',
      avoid_topics: 'keyword stuffing, vanity metrics, low-intent traffic suggestions',
    }),
  },
  {
    id: 'automation-planner',
    title: 'Automation Planner',
    subtitle: 'Workflow design and handoff',
    emoji: '⚙️',
    description: 'Designs practical AI-powered workflows, schedules, and repeatable automations around team goals.',
    agentType: 'custom',
    name: 'Automation Planner',
    config: createTemplateConfig({
      instructions:
        'Design automations that are realistic to run. Break work into inputs, triggers, outputs, cadence, ownership, and failure cases. Recommend workflows that reduce manual work without creating brittle complexity.',
      tone: 'professional',
      use_web_search: false,
      response_length: 'detailed',
      welcome_message: 'Hi! I can help you design practical automations, schedules, and AI workflows that teams can actually maintain.',
      report_mode: true,
      focus_topics: 'workflows, triggers, outputs, schedules, dependencies, operational clarity',
      avoid_topics: 'overengineered systems, vague productivity advice, unrealistic tooling assumptions',
    }),
  },
  {
    id: 'customer-insights-agent',
    title: 'Customer Insights Agent',
    subtitle: 'Voice-of-customer synthesizer',
    emoji: '🗣️',
    description: 'Turns feedback, reviews, and recurring signals into clearer customer pains, desires, and messaging insights.',
    agentType: 'data_interpreter',
    name: 'Customer Insights Agent',
    config: createTemplateConfig({
      instructions:
        'Extract customer insight from messy qualitative signals. Identify repeated pains, desired outcomes, buying objections, emotional language, and what those signals mean for product or messaging decisions.',
      tone: 'friendly',
      use_web_search: true,
      response_length: 'detailed',
      welcome_message: 'Hi! I can turn customer feedback, reviews, and user comments into themes and actionable insights.',
      report_mode: true,
      focus_topics: 'pain points, jobs to be done, objections, emotional language, feature requests, satisfaction drivers',
      avoid_topics: 'single-comment overreactions, unsupported certainty, robotic summaries',
    }),
  },
  {
    id: 'weekly-intelligence-report',
    title: 'Weekly Intelligence Report',
    subtitle: 'Executive-ready recap',
    emoji: '🗞️',
    description: 'Compiles the week’s most important developments into a concise, leadership-friendly intelligence brief.',
    agentType: 'news_monitor',
    name: 'Weekly Intelligence Report',
    config: createTemplateConfig({
      instructions:
        'Create a weekly intelligence report that is concise, executive-ready, and decision-focused. Group developments into themes, highlight the strongest signals, and close with what deserves attention next week.',
      tone: 'professional',
      use_web_search: true,
      response_length: 'detailed',
      welcome_message: 'Hi! I can compile a weekly intelligence report covering the most important developments and why they matter.',
      report_mode: true,
      focus_topics: 'weekly developments, notable changes, strategic signals, executive summaries, next-step watchpoints',
      avoid_topics: 'daily noise, duplicate stories, filler paragraphs without decisions',
    }),
  },
]

export default function NewAgentPage() {
  const router = useRouter()
  const [step, setStep] = useState<'type' | 'details'>('type')
  const [selectedType, setSelectedType] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [config, setConfig] = useState<AgentConfigForm>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const showUpgrade = /limit reached|upgrade|max/i.test(error)

  useEffect(() => {
    if (!localStorage.getItem('token')) router.push('/login')
  }, [router])

  const applyTemplate = (template: TemplatePreset) => {
    setSelectedTemplate(template.id)
    setSelectedType(template.agentType)
    setName(template.name)
    setDescription(template.description)
    setConfig(cloneConfig(template.config))
    setStep('details')
  }

  const selectAgentType = (type: string) => {
    setSelectedTemplate(null)
    setSelectedType(type)
    setName('')
    setDescription('')
    setConfig(cloneConfig(getDefaultConfigForType(type)))
    setStep('details')
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Agent name is required.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data } = await api.post('/agents/create', {
        name: name.trim(),
        description: description.trim(),
        agent_type: selectedType,
        config: {
          ...config,
          focus_topics: parseTopicList(config.focus_topics),
          avoid_topics: parseTopicList(config.avoid_topics),
        },
      })
      router.push(`/agents/${data.id}`)
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Failed to create agent.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'type') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem' }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
            <Link href="/dashboard" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>← Back</Link>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Choose agent type</h1>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.9rem' }}>
              Core Nexora templates
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {TEMPLATE_PRESETS.map((template) => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  style={{
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    padding: '1.1rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '1.7rem' }}>{template.emoji}</span>
                    <span style={{ color: 'var(--text-3)', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {template.subtitle}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1rem', marginBottom: '0.45rem' }}>{template.title}</div>
                  <div style={{ color: 'var(--text-2)', fontSize: '0.88rem', lineHeight: 1.6 }}>{template.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.9rem' }}>
            Or choose a base agent type
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
            {AGENT_TYPES.map((agent) => (
              <button
                key={agent.type}
                onClick={() => selectAgentType(agent.type)}
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '1.5rem 1rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={(event) => { event.currentTarget.style.borderColor = 'var(--accent)' }}
                onMouseLeave={(event) => { event.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{agent.emoji}</div>
                <div style={{ color: 'var(--text)', fontWeight: 500, fontSize: '0.9rem' }}>{agent.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const selectedTemplateData = selectedTemplate
    ? TEMPLATE_PRESETS.find((template) => template.id === selectedTemplate)
    : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '840px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2.5rem' }}>
        <button
          onClick={() => setStep('type')}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', marginBottom: '1.5rem', fontSize: '0.9rem' }}
        >
          ← Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '2rem' }}>
            {selectedTemplateData?.emoji || AGENT_TYPES.find((agent) => agent.type === selectedType)?.emoji}
          </div>
          <div style={{ color: 'var(--text-3)', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {selectedTemplateData?.title || AGENT_TYPES.find((agent) => agent.type === selectedType)?.label}
          </div>
        </div>

        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.35rem' }}>Shape your agent</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
          {selectedTemplateData
            ? 'Template values are prefilled with a purpose-built default profile. You can edit everything before creating the agent.'
            : `${AGENT_TYPES.find((agent) => agent.type === selectedType)?.label} — you can customize everything before creation.`}
        </p>

        {selectedTemplateData && (
          <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.95rem 1rem', marginBottom: '1.25rem' }}>
            <div style={{ color: 'var(--accent)', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
              Template selected
            </div>
            <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: '0.25rem' }}>
              {selectedTemplateData.title}
            </div>
            <div style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              These defaults are tuned to make this agent feel distinct from the start, including instructions, topic focus, and web behavior.
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', color: 'var(--red)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            <div>{error}</div>
            {showUpgrade && (
              <Link href="/dashboard/upgrade" style={{ display: 'inline-block', marginTop: '0.55rem', color: 'var(--text)', fontWeight: 700, textDecoration: 'underline' }}>
                Upgrade to create more agents
              </Link>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-2)' }}>Agent name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Daily Research Bot"
              style={fieldInputStyle}
            />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-2)' }}>Description (optional)</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What does this agent do?"
              rows={3}
              style={{ ...fieldInputStyle, resize: 'none', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-2)' }}>Tone</label>
            <select
              value={config.tone}
              onChange={(event) => setConfig((prev) => ({ ...prev, tone: event.target.value as AgentConfigForm['tone'] }))}
              style={fieldInputStyle}
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="analytical">Analytical</option>
              <option value="creative">Creative</option>
              <option value="casual">Casual</option>
              <option value="persuasive">Persuasive</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-2)' }}>Response length</label>
            <select
              value={config.response_length}
              onChange={(event) => setConfig((prev) => ({ ...prev, response_length: event.target.value as AgentConfigForm['response_length'] }))}
              style={fieldInputStyle}
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="detailed">Detailed</option>
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-2)' }}>Instructions</label>
            <textarea
              value={config.instructions}
              onChange={(event) => setConfig((prev) => ({ ...prev, instructions: event.target.value }))}
              placeholder="What should this agent focus on?"
              rows={5}
              style={{ ...fieldInputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-2)' }}>Focus topics</label>
            <textarea
              value={config.focus_topics}
              onChange={(event) => setConfig((prev) => ({ ...prev, focus_topics: event.target.value }))}
              placeholder="Comma-separated topics this agent should prioritize"
              rows={3}
              style={{ ...fieldInputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-2)' }}>Avoid topics</label>
            <textarea
              value={config.avoid_topics}
              onChange={(event) => setConfig((prev) => ({ ...prev, avoid_topics: event.target.value }))}
              placeholder="Comma-separated topics this agent should avoid"
              rows={3}
              style={{ ...fieldInputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-2)' }}>Welcome message</label>
            <input
              value={config.welcome_message}
              onChange={(event) => setConfig((prev) => ({ ...prev, welcome_message: event.target.value }))}
              placeholder="How should the agent greet the user?"
              style={fieldInputStyle}
            />
          </div>

          <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.7rem', color: 'var(--text)', fontSize: '0.92rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.report_mode}
              onChange={(event) => setConfig((prev) => ({ ...prev, report_mode: event.target.checked }))}
            />
            Enable report mode for structured report-style responses
          </label>

          <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.7rem', color: 'var(--text)', fontSize: '0.92rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.use_web_search}
              onChange={(event) => setConfig((prev) => ({ ...prev, use_web_search: event.target.checked }))}
            />
            Enable web search
          </label>

          <button
            onClick={handleCreate}
            disabled={loading}
            style={{ gridColumn: '1 / -1', marginTop: '0.5rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.85rem', fontWeight: 600, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Creating...' : 'Create agent →'}
          </button>
        </div>
      </div>
    </div>
  )
}

const fieldInputStyle: React.CSSProperties = {
  background: 'var(--bg-3)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '0.75rem 1rem',
  color: 'var(--text)',
  fontSize: '0.95rem',
  outline: 'none',
}
