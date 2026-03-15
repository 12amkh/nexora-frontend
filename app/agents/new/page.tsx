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
}

function cloneConfig(config: AgentConfigForm): AgentConfigForm {
  return { ...config }
}

const TEMPLATE_PRESETS: Array<{
  id: string
  title: string
  subtitle: string
  emoji: string
  description: string
  agentType: string
  name: string
  config: AgentConfigForm
}> = [
  {
    id: 'ai-trend-monitor',
    title: 'AI Trend Monitor',
    subtitle: 'Daily signal tracker',
    emoji: '📡',
    description: 'Monitors AI launches, funding, model updates, and emerging product trends.',
    agentType: 'news_monitor',
    name: 'AI Trend Monitor',
    config: {
      instructions: 'Track important AI news and product launches. Surface meaningful trends, company moves, and market signals with short actionable summaries.',
      tone: 'analytical',
      use_web_search: true,
      response_length: 'medium',
      welcome_message: 'Hi! I can monitor AI trends, launches, and funding news for you.',
    },
  },
  {
    id: 'competitor-analyzer',
    title: 'Competitor Analyzer',
    subtitle: 'Positioning and pricing watch',
    emoji: '🧭',
    description: 'Researches competitors, compares positioning, and summarizes pricing or product changes.',
    agentType: 'competitor_analyst',
    name: 'Competitor Analyzer',
    config: {
      instructions: 'Analyze competitors, compare positioning, pricing, product updates, and strategic moves. Highlight what matters and what changed.',
      tone: 'analytical',
      use_web_search: true,
      response_length: 'detailed',
      welcome_message: 'Hi! Tell me which competitor or market you want me to analyze.',
    },
  },
  {
    id: 'startup-idea-generator',
    title: 'Startup Idea Generator',
    subtitle: 'Market gaps and ideas',
    emoji: '💡',
    description: 'Generates startup opportunities, validates demand signals, and suggests business angles.',
    agentType: 'custom',
    name: 'Startup Idea Generator',
    config: {
      instructions: 'Generate startup ideas from market pain points, trends, and underserved niches. Suggest business models, target users, and validation angles.',
      tone: 'creative',
      use_web_search: true,
      response_length: 'medium',
      welcome_message: 'Hi! I can help you discover and shape startup ideas worth exploring.',
    },
  },
  {
    id: 'seo-researcher',
    title: 'SEO Researcher',
    subtitle: 'Keyword and content angles',
    emoji: '📈',
    description: 'Finds SEO opportunities, content angles, search intent, and topic clusters.',
    agentType: 'web_researcher',
    name: 'SEO Researcher',
    config: {
      instructions: 'Research SEO opportunities, analyze search intent, suggest keyword clusters, and propose content ideas that can rank.',
      tone: 'analytical',
      use_web_search: true,
      response_length: 'detailed',
      welcome_message: 'Hi! Give me a topic, industry, or keyword and I will find SEO opportunities.',
    },
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
  }, [])

  const applyTemplate = (template: typeof TEMPLATE_PRESETS[number]) => {
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
    setConfig({
      ...cloneConfig(DEFAULT_CONFIG),
      use_web_search: ['web_researcher', 'news_monitor', 'competitor_analyst'].includes(type),
      tone: ['web_researcher', 'news_monitor', 'competitor_analyst'].includes(type) ? 'analytical' : 'professional',
    })
    setStep('details')
  }

  const handleCreate = async () => {
    if (!name.trim()) { setError('Agent name is required.'); return }
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/agents/create', {
        name: name.trim(),
        description: description.trim(),
        agent_type: selectedType,
        config,
      })
      router.push(`/agents/${data.id}`)
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Failed to create agent.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'type') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
          <Link href="/dashboard" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>← Back</Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Choose agent type</h1>
        </div>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.9rem' }}>
            Start from a template
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {TEMPLATE_PRESETS.map(template => (
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
                  <span style={{ color: 'var(--text-3)', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{template.subtitle}</span>
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
          {AGENT_TYPES.map(a => (
            <button key={a.type} onClick={() => selectAgentType(a.type)} style={{
              background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '12px',
              padding: '1.5rem 1rem', cursor: 'pointer', textAlign: 'center',
              transition: 'border-color 0.15s, background 0.15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)' }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{a.emoji}</div>
              <div style={{ color: 'var(--text)', fontWeight: 500, fontSize: '0.9rem' }}>{a.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '720px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2.5rem' }}>
        <button onClick={() => setStep('type')} style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', marginBottom: '1.5rem', fontSize: '0.9rem' }}>← Back</button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '2rem' }}>
            {selectedTemplate
              ? TEMPLATE_PRESETS.find(template => template.id === selectedTemplate)?.emoji
              : AGENT_TYPES.find(a => a.type === selectedType)?.emoji}
          </div>
          <div style={{ color: 'var(--text-3)', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {selectedTemplate
              ? TEMPLATE_PRESETS.find(template => template.id === selectedTemplate)?.title
              : AGENT_TYPES.find(a => a.type === selectedType)?.label}
          </div>
        </div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.35rem' }}>Shape your agent</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
          {selectedTemplate
            ? 'Template values are prefilled. You can edit everything before creating the agent.'
            : `${AGENT_TYPES.find(a => a.type === selectedType)?.label} — you can customize everything before creation.`}
        </p>

        {selectedTemplate && (
          <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.95rem 1rem', marginBottom: '1.25rem' }}>
            <div style={{ color: 'var(--accent)', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
              Template selected
            </div>
            <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: '0.25rem' }}>
              {TEMPLATE_PRESETS.find(template => template.id === selectedTemplate)?.title}
            </div>
            <div style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              You can adjust the name, description, and behavior below before creating the agent.
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
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Daily Research Bot" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 1rem', color: 'var(--text)', fontSize: '0.95rem', outline: 'none' }} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-2)' }}>Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this agent do?" rows={3} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 1rem', color: 'var(--text)', fontSize: '0.95rem', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-2)' }}>Tone</label>
            <select value={config.tone} onChange={e => setConfig(prev => ({ ...prev, tone: e.target.value as AgentConfigForm['tone'] }))} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 1rem', color: 'var(--text)', fontSize: '0.95rem', outline: 'none' }}>
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
            <select value={config.response_length} onChange={e => setConfig(prev => ({ ...prev, response_length: e.target.value as AgentConfigForm['response_length'] }))} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 1rem', color: 'var(--text)', fontSize: '0.95rem', outline: 'none' }}>
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="detailed">Detailed</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-2)' }}>Instructions</label>
            <textarea value={config.instructions} onChange={e => setConfig(prev => ({ ...prev, instructions: e.target.value }))} placeholder="What should this agent focus on?" rows={4} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 1rem', color: 'var(--text)', fontSize: '0.95rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-2)' }}>Welcome message</label>
            <input value={config.welcome_message} onChange={e => setConfig(prev => ({ ...prev, welcome_message: e.target.value }))} placeholder="How should the agent greet the user?" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 1rem', color: 'var(--text)', fontSize: '0.95rem', outline: 'none' }} />
          </div>
          <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.7rem', color: 'var(--text)', fontSize: '0.92rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={config.use_web_search} onChange={e => setConfig(prev => ({ ...prev, use_web_search: e.target.checked }))} />
            Enable web search
          </label>
          <button onClick={handleCreate} disabled={loading} style={{ gridColumn: '1 / -1', marginTop: '0.5rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.85rem', fontWeight: 600, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Creating...' : 'Create agent →'}
          </button>
        </div>
      </div>
    </div>
  )
}
