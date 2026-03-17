'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import Sidebar from '@/components/Sidebar'
import { AppStateCard, StateActionButton } from '@/components/AppState'
import { api, getErrorMessage, getUser } from '@/lib/api'
import { useToast } from '@/components/ToastProvider'
import RichContent from '@/components/RichContent'

interface Agent {
  id: number
  name: string
  description: string
  config?: {
    agent_type?: string
  }
}

interface Workflow {
  id: number
  name: string
  description: string
  agent_ids: number[]
}

interface WorkflowRunStep {
  agent_id: number
  agent_name: string
  prompt: string
  output: string
}

interface WorkflowRunResult {
  workflow_id: number
  input: string
  final_output: string
  steps: WorkflowRunStep[]
}

export default function WorkflowsPage() {
  const router = useRouter()
  const { pushToast, updateToast } = useToast()
  const [agents, setAgents] = useState<Agent[]>([])
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null)
  const [workflowName, setWorkflowName] = useState('')
  const [workflowDescription, setWorkflowDescription] = useState('')
  const [workflowAgentIds, setWorkflowAgentIds] = useState<number[]>([])
  const [workflowInput, setWorkflowInput] = useState('')
  const [runResult, setRunResult] = useState<WorkflowRunResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError('')

    try {
      const [agentsRes, workflowsRes] = await Promise.all([
        api.get('/agents/list?limit=100'),
        api.get('/workflows/list'),
      ])
      setAgents(Array.isArray(agentsRes.data) ? agentsRes.data : [])
      setWorkflows(Array.isArray(workflowsRes.data) ? workflowsRes.data : [])
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "We couldn't load workflows right now.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!getUser()) {
      router.push('/login')
      return
    }
    void loadData()
  }, [router])

  const agentMap = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents])

  const resetForm = () => {
    setSelectedWorkflowId(null)
    setWorkflowName('')
    setWorkflowDescription('')
    setWorkflowAgentIds([])
    setWorkflowInput('')
    setRunResult(null)
    setSelectedAgentId('')
  }

  const handleSelectWorkflow = (workflow: Workflow) => {
    setSelectedWorkflowId(workflow.id)
    setWorkflowName(workflow.name)
    setWorkflowDescription(workflow.description || '')
    setWorkflowAgentIds(workflow.agent_ids || [])
    setRunResult(null)
  }

  const handleAddAgentStep = () => {
    const nextId = Number(selectedAgentId)
    if (!Number.isFinite(nextId) || workflowAgentIds.includes(nextId)) return
    setWorkflowAgentIds((current) => [...current, nextId])
    setSelectedAgentId('')
  }

  const moveStep = (index: number, direction: -1 | 1) => {
    setWorkflowAgentIds((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  const removeStep = (agentId: number) => {
    setWorkflowAgentIds((current) => current.filter((id) => id !== agentId))
  }

  const handleSaveWorkflow = async () => {
    if (saving) return
    if (!workflowName.trim()) {
      setError('Workflow name is required.')
      return
    }
    if (!workflowAgentIds.length) {
      setError('Add at least one agent to the workflow.')
      return
    }

    setSaving(true)
    setError('')
    const toastId = pushToast({
      title: selectedWorkflowId ? 'Updating workflow' : 'Creating workflow',
      description: 'Saving your chained agent setup.',
      tone: 'loading',
      dismissible: false,
    })

    try {
      if (selectedWorkflowId) {
        await api.put(`/workflows/${selectedWorkflowId}`, {
          name: workflowName,
          description: workflowDescription,
          agent_ids: workflowAgentIds,
        })
      } else {
        await api.post('/workflows/create', {
          name: workflowName,
          description: workflowDescription,
          agent_ids: workflowAgentIds,
        })
      }
      await loadData()
      updateToast(toastId, {
        title: selectedWorkflowId ? 'Workflow updated' : 'Workflow created',
        description: 'Your workflow is ready to run.',
        tone: 'success',
        dismissible: true,
      })
      resetForm()
    } catch (err: unknown) {
      const message = getErrorMessage(err)
      setError(message)
      updateToast(toastId, {
        title: "Couldn't save workflow",
        description: message,
        tone: 'error',
        dismissible: true,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleRunWorkflow = async (workflow: Workflow) => {
    if (running) return
    if (!workflowInput.trim()) {
      setError('Add workflow input before running.')
      return
    }

    setRunning(true)
    setError('')
    const toastId = pushToast({
      title: `Running ${workflow.name}`,
      description: 'Executing each workflow step in order.',
      tone: 'loading',
      dismissible: false,
    })

    try {
      const { data } = await api.post(`/workflows/${workflow.id}/run`, {
        input: workflowInput,
      })
      setRunResult(data)
      updateToast(toastId, {
        title: `${workflow.name} finished`,
        description: 'The workflow completed successfully.',
        tone: 'success',
        dismissible: true,
      })
    } catch (err: unknown) {
      const message = getErrorMessage(err)
      setError(message)
      updateToast(toastId, {
        title: `Couldn't run ${workflow.name}`,
        description: message,
        tone: 'error',
        dismissible: true,
      })
    } finally {
      setRunning(false)
    }
  }

  const handleDeleteWorkflow = async (workflowId: number) => {
    const toastId = pushToast({
      title: 'Deleting workflow',
      description: 'Removing this workflow setup.',
      tone: 'loading',
      dismissible: false,
    })
    try {
      await api.delete(`/workflows/${workflowId}`)
      if (selectedWorkflowId === workflowId) {
        resetForm()
      }
      await loadData()
      updateToast(toastId, {
        title: 'Workflow deleted',
        description: 'The workflow was removed successfully.',
        tone: 'success',
        dismissible: true,
      })
    } catch (err: unknown) {
      updateToast(toastId, {
        title: "Couldn't delete workflow",
        description: getErrorMessage(err),
        tone: 'error',
        dismissible: true,
      })
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar />
      <main className="app-shell-main">
        <div className="app-shell-content">
          <div className="dashboard-header">
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px', letterSpacing: '-0.03em' }}>
                Agent Workflows
              </h1>
              <p style={{ color: 'var(--text-2)', margin: 0, fontSize: 16 }}>
                Chain multiple agents together, define the order, and pass each result into the next step automatically.
              </p>
            </div>
          </div>

          {loading ? (
            <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading workflows...</div>
          ) : error && !workflows.length && !agents.length ? (
            <AppStateCard
              eyebrow='Workflows unavailable'
              icon='🔗'
              title='Workflows could not be loaded'
              description={error}
              tone='error'
              actions={<StateActionButton label='Retry workflows' onClick={() => void loadData()} />}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) minmax(0, 1fr)', gap: 22 }}>
              <section
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 18,
                  padding: 18,
                  display: 'grid',
                  gap: 16,
                  alignSelf: 'start',
                }}
              >
                <div>
                  <div style={{ color: 'var(--text)', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
                    {selectedWorkflowId ? 'Edit workflow' : 'Create workflow'}
                  </div>
                  <div style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.7 }}>
                    Pick the agents, set their order, and save the workflow once.
                  </div>
                </div>

                <input
                  value={workflowName}
                  onChange={(event) => setWorkflowName(event.target.value)}
                  placeholder='Workflow name'
                  style={fieldStyle}
                />
                <textarea
                  value={workflowDescription}
                  onChange={(event) => setWorkflowDescription(event.target.value)}
                  placeholder='What should this workflow accomplish?'
                  rows={3}
                  style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <select
                    value={selectedAgentId}
                    onChange={(event) => setSelectedAgentId(event.target.value)}
                    style={{ ...fieldStyle, flex: '1 1 220px' }}
                  >
                    <option value=''>Choose an agent</option>
                    {agents
                      .filter((agent) => !workflowAgentIds.includes(agent.id))
                      .map((agent) => (
                        <option key={agent.id} value={String(agent.id)}>
                          {agent.name}
                        </option>
                      ))}
                  </select>
                  <button onClick={handleAddAgentStep} style={primaryButtonStyle}>
                    Add step
                  </button>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  {workflowAgentIds.length === 0 ? (
                    <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No agents added yet.</div>
                  ) : workflowAgentIds.map((agentId, index) => {
                    const agent = agentMap.get(agentId)
                    if (!agent) return null

                    return (
                      <div
                        key={`${agentId}-${index}`}
                        style={{
                          background: 'var(--bg-3)',
                          border: '1px solid var(--border)',
                          borderRadius: 14,
                          padding: '12px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <div>
                          <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                            Step {index + 1}: {agent.name}
                          </div>
                          <div style={{ color: 'var(--text-3)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {(agent.config?.agent_type || 'custom').replace(/_/g, ' ')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => moveStep(index, -1)} style={secondaryIconButtonStyle}>↑</button>
                          <button onClick={() => moveStep(index, 1)} style={secondaryIconButtonStyle}>↓</button>
                          <button onClick={() => removeStep(agentId)} style={secondaryIconButtonStyle}>×</button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => void handleSaveWorkflow()} disabled={saving} style={primaryButtonStyle}>
                    {saving ? 'Saving...' : selectedWorkflowId ? 'Save workflow' : 'Create workflow'}
                  </button>
                  <button onClick={resetForm} style={secondaryButtonStyle}>
                    Reset
                  </button>
                </div>
              </section>

              <section style={{ display: 'grid', gap: 18 }}>
                <div
                  style={{
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 18,
                    padding: 18,
                    display: 'grid',
                    gap: 16,
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--text)', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
                      Saved workflows
                    </div>
                    <div style={{ color: 'var(--text-2)', fontSize: 14 }}>
                      Choose one to edit or run with a fresh input.
                    </div>
                  </div>

                  {workflows.length === 0 ? (
                    <AppStateCard
                      eyebrow='No workflows yet'
                      icon='🔗'
                      title='Create your first workflow'
                      description='Start with two or three agents and let each step build on the last output.'
                      tone='neutral'
                      compact
                    />
                  ) : (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {workflows.map((workflow) => (
                        <div
                          key={workflow.id}
                          style={{
                            background: 'var(--bg-3)',
                            border: workflow.id === selectedWorkflowId ? '1px solid rgba(217,121,85,0.28)' : '1px solid var(--border)',
                            borderRadius: 16,
                            padding: 16,
                            display: 'grid',
                            gap: 10,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ color: 'var(--text)', fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
                                {workflow.name}
                              </div>
                              <div style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6 }}>
                                {workflow.description || 'No description yet.'}
                              </div>
                            </div>
                            <button onClick={() => void handleDeleteWorkflow(workflow.id)} style={secondaryIconButtonStyle}>×</button>
                          </div>
                          <div style={{ color: 'var(--text-3)', fontSize: 12 }}>
                            {workflow.agent_ids.map((agentId) => agentMap.get(agentId)?.name || `Agent ${agentId}`).join(' → ')}
                          </div>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <button onClick={() => handleSelectWorkflow(workflow)} style={secondaryButtonStyle}>Edit</button>
                            <button onClick={() => void handleRunWorkflow(workflow)} disabled={running} style={primaryButtonStyle}>
                              {running ? 'Running...' : 'Run workflow'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <textarea
                    value={workflowInput}
                    onChange={(event) => setWorkflowInput(event.target.value)}
                    placeholder='Add the starting prompt or context for the selected workflow run'
                    rows={4}
                    style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>

                {runResult && (
                  <div
                    style={{
                      background: 'var(--bg-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 18,
                      padding: 18,
                      display: 'grid',
                      gap: 16,
                    }}
                  >
                    <div>
                      <div style={{ color: 'var(--text)', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
                        Workflow result
                      </div>
                      <div style={{ color: 'var(--text-2)', fontSize: 14 }}>
                        Each step reused the previous output as context for the next agent.
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 12 }}>
                      {runResult.steps.map((step, index) => (
                        <div key={`${step.agent_id}-${index}`} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
                          <div style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                            Step {index + 1}
                          </div>
                          <div style={{ color: 'var(--text)', fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
                            {step.agent_name}
                          </div>
                          <div style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 10 }}>
                            Prompt sent to this step
                          </div>
                          <div style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.7, marginBottom: 14, whiteSpace: 'pre-wrap' }}>
                            {step.prompt}
                          </div>
                          <div style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 8 }}>
                            Output
                          </div>
                          <div style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.8 }}>
                            <RichContent content={step.output} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-3)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '12px 14px',
  color: 'var(--text)',
  fontSize: 14,
  outline: 'none',
}

const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 12,
  border: 'none',
  background: 'var(--accent)',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
}

const secondaryButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 12,
  border: '1px solid var(--border)',
  background: 'var(--bg-3)',
  color: 'var(--text)',
  fontWeight: 700,
  cursor: 'pointer',
}

const secondaryIconButtonStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
  fontWeight: 700,
  cursor: 'pointer',
}
