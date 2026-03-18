'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { jsPDF } from 'jspdf'

import Sidebar from '@/components/Sidebar'
import { AppStateCard, StateActionButton } from '@/components/AppState'
import { api, getErrorMessage, getUser } from '@/lib/api'
import { useToast } from '@/components/ToastProvider'
import RichContent, { parseRichContent } from '@/components/RichContent'

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

interface WorkflowTemplate {
  id: string
  title: string
  description: string
  steps: Array<{
    name: string
    agent_type: string
    description: string
  }>
}

interface WorkflowRunStep {
  agent_id: number
  agent_name: string
  prompt: string
  output: string
}

interface WorkflowRunResult {
  id?: number | null
  workflow_id: number
  input: string
  final_output: string
  status?: string
  steps: WorkflowRunStep[]
  created_at?: string | null
  share_id?: string | null
}

interface WorkflowRunHistoryItem {
  id: number
  workflow_id: number
  status: string
  input: string
  final_output: string
  error_message: string
  created_at: string
}

const SELECTED_WORKFLOW_STORAGE_KEY = 'nexora_selected_workflow_id'
const SELECTED_WORKFLOW_RUN_STORAGE_KEY = 'nexora_selected_workflow_run_id'

export default function WorkflowsPage() {
  const router = useRouter()
  const { pushToast, updateToast } = useToast()
  const [agents, setAgents] = useState<Agent[]>([])
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null)
  const [workflowName, setWorkflowName] = useState('')
  const [workflowDescription, setWorkflowDescription] = useState('')
  const [workflowAgentIds, setWorkflowAgentIds] = useState<number[]>([])
  const [workflowInput, setWorkflowInput] = useState('')
  const [runResult, setRunResult] = useState<WorkflowRunResult | null>(null)
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRunHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [loadingRuns, setLoadingRuns] = useState(false)
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [workflowLoadError, setWorkflowLoadError] = useState('')
  const [templateLoadError, setTemplateLoadError] = useState('')
  const [runHistoryError, setRunHistoryError] = useState('')
  const [sharingRun, setSharingRun] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError('')
    setWorkflowLoadError('')
    setTemplateLoadError('')

    try {
      const [agentsResult, workflowsResult, templatesResult] = await Promise.allSettled([
        api.get('/agents/list?limit=100'),
        api.get('/workflows/list'),
        api.get('/workflows/templates'),
      ])

      if (agentsResult.status === 'fulfilled') {
        setAgents(Array.isArray(agentsResult.value.data) ? agentsResult.value.data : [])
      } else {
        setAgents([])
        setError(getErrorMessage(agentsResult.reason) || "We couldn't load your agents right now.")
      }

      if (workflowsResult.status === 'fulfilled') {
        setWorkflows(Array.isArray(workflowsResult.value.data) ? workflowsResult.value.data : [])
      } else {
        setWorkflows([])
        setWorkflowLoadError(getErrorMessage(workflowsResult.reason) || "We couldn't load workflows right now.")
      }

      if (templatesResult.status === 'fulfilled') {
        setTemplates(Array.isArray(templatesResult.value.data) ? templatesResult.value.data : [])
      } else {
        setTemplates([])
        setTemplateLoadError(getErrorMessage(templatesResult.reason) || "We couldn't load workflow templates right now.")
      }
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (selectedWorkflowId) {
      window.localStorage.setItem(SELECTED_WORKFLOW_STORAGE_KEY, String(selectedWorkflowId))
    } else {
      window.localStorage.removeItem(SELECTED_WORKFLOW_STORAGE_KEY)
    }
  }, [selectedWorkflowId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (runResult?.id) {
      window.localStorage.setItem(SELECTED_WORKFLOW_RUN_STORAGE_KEY, String(runResult.id))
    } else {
      window.localStorage.removeItem(SELECTED_WORKFLOW_RUN_STORAGE_KEY)
    }
  }, [runResult])

  const agentMap = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents])

  const resetForm = () => {
    setSelectedWorkflowId(null)
    setWorkflowName('')
    setWorkflowDescription('')
    setWorkflowAgentIds([])
    setWorkflowInput('')
    setRunResult(null)
    setWorkflowRuns([])
    setRunHistoryError('')
    setSelectedAgentId('')
  }

  const loadWorkflowRuns = async (workflowId: number) => {
    setLoadingRuns(true)
    setRunHistoryError('')
    try {
      const { data } = await api.get(`/workflows/${workflowId}/runs`)
      setWorkflowRuns(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      setWorkflowRuns([])
      setRunHistoryError(getErrorMessage(err) || "We couldn't load workflow runs right now.")
    } finally {
      setLoadingRuns(false)
    }
  }

  const handleSelectWorkflow = (workflow: Workflow) => {
    setSelectedWorkflowId(workflow.id)
    setWorkflowName(workflow.name)
    setWorkflowDescription(workflow.description || '')
    setWorkflowAgentIds(workflow.agent_ids || [])
    setRunResult(null)
    void loadWorkflowRuns(workflow.id)
  }

  const handleOpenRun = async (workflowId: number, runId: number) => {
    const toastId = pushToast({
      title: 'Opening workflow run',
      description: 'Loading the saved run details.',
      tone: 'loading',
      dismissible: false,
    })

    try {
      const { data } = await api.get(`/workflows/${workflowId}/runs/${runId}`)
      setRunResult(data)
      updateToast(toastId, {
        title: 'Workflow run loaded',
        description: 'Saved run details are now open below.',
        tone: 'success',
        dismissible: true,
      })
    } catch (err: unknown) {
      updateToast(toastId, {
        title: "Couldn't open workflow run",
        description: getErrorMessage(err),
        tone: 'error',
        dismissible: true,
      })
    }
  }

  const getWorkflowName = (workflowId: number) => workflows.find((workflow) => workflow.id === workflowId)?.name || 'Workflow'

  const buildWorkflowShareUrl = (shareId: string) => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/workflow-reports/${shareId}`
  }

  const handleShareRun = async () => {
    if (!runResult?.id || !selectedWorkflowId || sharingRun) return

    setSharingRun(true)
    const toastId = pushToast({
      title: 'Creating share link',
      description: 'Preparing a public workflow report link.',
      tone: 'loading',
      dismissible: false,
    })

    try {
      const { data } = await api.post(`/workflows/${selectedWorkflowId}/runs/${runResult.id}/share`)
      const shareUrl = buildWorkflowShareUrl(data.share_id)
      if (shareUrl) {
        await navigator.clipboard.writeText(shareUrl)
      }
      setRunResult((current) => (current ? { ...current, share_id: data.share_id } : current))
      setWorkflowRuns((current) => current.map((run) => (run.id === runResult.id ? { ...run, share_id: data.share_id } : run)))
      updateToast(toastId, {
        title: 'Share link ready',
        description: shareUrl ? 'The workflow report link was copied to your clipboard.' : 'The workflow report link is ready.',
        tone: 'success',
        dismissible: true,
      })
    } catch (err: unknown) {
      updateToast(toastId, {
        title: "Couldn't share workflow report",
        description: getErrorMessage(err),
        tone: 'error',
        dismissible: true,
      })
    } finally {
      setSharingRun(false)
    }
  }

  const handleExportPdf = async () => {
    if (!runResult?.final_output || exportingPdf) return

    setExportingPdf(true)
    const toastId = pushToast({
      title: 'Exporting PDF',
      description: 'Building a shareable workflow report file.',
      tone: 'loading',
      dismissible: false,
    })

    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const marginX = 48
      let cursorY = 54

      const addWrappedText = (text: string, fontSize: number, color: string, lineHeight: number, indent = 0) => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(fontSize)
        doc.setTextColor(color)
        const lines = doc.splitTextToSize(text, pageWidth - marginX * 2 - indent)
        lines.forEach((line: string) => {
          if (cursorY > pageHeight - 54) {
            doc.addPage()
            cursorY = 54
          }
          doc.text(line, marginX + indent, cursorY)
          cursorY += lineHeight
        })
      }

      const blocks = parseRichContent(runResult.final_output)
      const title = `${getWorkflowName(runResult.workflow_id)} Report`

      doc.setFillColor(246, 235, 229)
      doc.roundedRect(marginX, cursorY, 170, 28, 12, 12, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor('#d97955')
      doc.text('NEXORA WORKFLOW REPORT', marginX + 14, cursorY + 18)
      cursorY += 48

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(24)
      doc.setTextColor('#1f2937')
      const titleLines = doc.splitTextToSize(title, pageWidth - marginX * 2)
      titleLines.forEach((line: string) => {
        doc.text(line, marginX, cursorY)
        cursorY += 28
      })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      doc.setTextColor('#6b7280')
      doc.text(`Generated ${formatRunTime(runResult.created_at || new Date().toISOString())}`, marginX, cursorY)
      cursorY += 28

      blocks.forEach((block) => {
        if (block.type === 'heading') {
          if (cursorY > pageHeight - 90) {
            doc.addPage()
            cursorY = 54
          }
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(15)
          doc.setTextColor('#1f2937')
          doc.text(block.content, marginX, cursorY)
          cursorY += 22
          return
        }

        if (block.type === 'paragraph') {
          addWrappedText(block.content, 11, '#374151', 18)
          cursorY += 6
          return
        }

        const items = block.items
        items.forEach((item, index) => {
          const prefix = block.type === 'numbered-list' ? `${index + 1}. ` : '• '
          addWrappedText(`${prefix}${item}`, 11, '#374151', 18, 10)
        })
        cursorY += 8
      })

      const fileName = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`
      doc.save(fileName)
      updateToast(toastId, {
        title: 'PDF exported',
        description: 'The workflow report PDF was downloaded.',
        tone: 'success',
        dismissible: true,
      })
    } catch (err: unknown) {
      updateToast(toastId, {
        title: "Couldn't export PDF",
        description: err instanceof Error ? err.message : 'The workflow report could not be exported.',
        tone: 'error',
        dismissible: true,
      })
    } finally {
      setExportingPdf(false)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined' || loading || workflows.length === 0 || selectedWorkflowId) return

    const storedWorkflowId = Number(window.localStorage.getItem(SELECTED_WORKFLOW_STORAGE_KEY))
    if (!Number.isFinite(storedWorkflowId)) return

    const workflow = workflows.find((item) => item.id === storedWorkflowId)
    if (workflow) {
      setSelectedWorkflowId(workflow.id)
      setWorkflowName(workflow.name)
      setWorkflowDescription(workflow.description || '')
      setWorkflowAgentIds(workflow.agent_ids || [])
      setRunResult(null)
      void loadWorkflowRuns(workflow.id)
    }
  }, [loading, workflows, selectedWorkflowId])

  useEffect(() => {
    if (typeof window === 'undefined' || !selectedWorkflowId || loadingRuns || workflowRuns.length === 0 || runResult?.id) return

    const storedRunId = Number(window.localStorage.getItem(SELECTED_WORKFLOW_RUN_STORAGE_KEY))
    if (!Number.isFinite(storedRunId)) return

    const run = workflowRuns.find((item) => item.id === storedRunId && item.workflow_id === selectedWorkflowId)
    if (run) {
      const restoreRun = async () => {
        try {
          const { data } = await api.get(`/workflows/${selectedWorkflowId}/runs/${run.id}`)
          setRunResult(data)
        } catch {
          window.localStorage.removeItem(SELECTED_WORKFLOW_RUN_STORAGE_KEY)
        }
      }
      void restoreRun()
    }
  }, [selectedWorkflowId, workflowRuns, loadingRuns, runResult])

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
      await loadWorkflowRuns(workflow.id)
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
      if (selectedWorkflowId === workflowId) {
        setWorkflowRuns([])
        setRunResult(null)
      }
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

  const formatRunTime = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Unknown time'
    return date.toLocaleString()
  }

  const handleApplyTemplate = async (template: WorkflowTemplate) => {
    if (applyingTemplateId) return

    setApplyingTemplateId(template.id)
    const toastId = pushToast({
      title: `Applying ${template.title}`,
      description: 'Creating the starter agents and workflow from this template.',
      tone: 'loading',
      dismissible: false,
    })

    try {
      const { data } = await api.post(`/workflows/templates/${template.id}/apply`)
      await loadData()
      handleSelectWorkflow(data)
      updateToast(toastId, {
        title: `${template.title} ready`,
        description: 'The workflow template was added to your workspace and is ready to edit.',
        tone: 'success',
        dismissible: true,
      })
    } catch (err: unknown) {
      updateToast(toastId, {
        title: "Couldn't apply template",
        description: getErrorMessage(err),
        tone: 'error',
        dismissible: true,
      })
    } finally {
      setApplyingTemplateId(null)
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
          ) : error && !agents.length ? (
            <AppStateCard
              eyebrow='Workflows unavailable'
              icon='🔗'
              title='Agents could not be loaded'
              description={error}
              tone='error'
              actions={<StateActionButton label='Retry workflows' onClick={() => void loadData()} />}
            />
          ) : (
            <div style={{ display: 'grid', gap: 22 }}>
              <section
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
                    Workflow templates
                  </div>
                  <div style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.7 }}>
                    Start with a proven multi-agent flow, then edit the steps or agent order once it is in your workspace.
                  </div>
                </div>

                {templateLoadError ? (
                  <AppStateCard
                    eyebrow='Templates unavailable'
                    icon='🧩'
                    title='Workflow templates could not be loaded'
                    description={templateLoadError}
                    tone='error'
                    compact
                    actions={<StateActionButton label='Retry templates' onClick={() => void loadData()} />}
                  />
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        style={{
                          background: 'var(--bg-3)',
                          border: '1px solid var(--border)',
                          borderRadius: 16,
                          padding: 16,
                          display: 'grid',
                          gap: 12,
                        }}
                      >
                        <div>
                          <div style={{ color: 'var(--text)', fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
                            {template.title}
                          </div>
                          <div style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.7 }}>
                            {template.description}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gap: 8 }}>
                          {template.steps.map((step, index) => (
                            <div key={`${template.id}-${index}`} style={{ color: 'var(--text-3)', fontSize: 12, lineHeight: 1.6 }}>
                              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Step {index + 1}:</span> {step.name}
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => void handleApplyTemplate(template)}
                          disabled={applyingTemplateId === template.id}
                          style={primaryButtonStyle}
                        >
                          {applyingTemplateId === template.id ? 'Creating...' : 'Use template'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

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

                  {workflowLoadError ? (
                    <AppStateCard
                      eyebrow='Saved workflows unavailable'
                      icon='🔗'
                      title='Saved workflows could not be loaded'
                      description={workflowLoadError}
                      tone='error'
                      compact
                      actions={<StateActionButton label='Retry workflows' onClick={() => void loadData()} />}
                    />
                  ) : workflows.length === 0 ? (
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
                      Run history
                    </div>
                    <div style={{ color: 'var(--text-2)', fontSize: 14 }}>
                      Review past workflow executions, their status, and open any saved run to inspect all steps again.
                    </div>
                  </div>

                  {!selectedWorkflowId ? (
                    <AppStateCard
                      eyebrow='Choose a workflow'
                      icon='🕘'
                      title='Select a workflow to view its run history'
                      description='Pick a saved workflow above and its previous runs will appear here.'
                      tone='neutral'
                      compact
                    />
                  ) : loadingRuns ? (
                    <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading run history...</div>
                  ) : runHistoryError ? (
                    <AppStateCard
                      eyebrow='Run history unavailable'
                      icon='🕘'
                      title='Workflow runs could not be loaded'
                      description={runHistoryError}
                      tone='error'
                      compact
                      actions={<StateActionButton label='Retry run history' onClick={() => void loadWorkflowRuns(selectedWorkflowId)} />}
                    />
                  ) : workflowRuns.length === 0 ? (
                    <AppStateCard
                      eyebrow='No runs yet'
                      icon='🕘'
                      title='This workflow has not been run yet'
                      description='Run the workflow once and its full step-by-step history will be saved here.'
                      tone='neutral'
                      compact
                    />
                  ) : (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {workflowRuns.map((run) => (
                        <div
                          key={run.id}
                          style={{
                            background: 'var(--bg-3)',
                            border: runResult?.id === run.id ? '1px solid rgba(217,121,85,0.28)' : '1px solid var(--border)',
                            borderRadius: 16,
                            padding: 16,
                            display: 'grid',
                            gap: 10,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            <div>
                              <div style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                                Run #{run.id}
                              </div>
                              <div style={{ color: 'var(--text-3)', fontSize: 12 }}>
                                {formatRunTime(run.created_at)}
                              </div>
                            </div>
                            <div
                              style={{
                                padding: '6px 10px',
                                borderRadius: 999,
                                background: run.status === 'completed' ? 'rgba(74, 222, 128, 0.12)' : 'rgba(248, 113, 113, 0.12)',
                                color: run.status === 'completed' ? '#86efac' : '#fca5a5',
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                              }}
                            >
                              {run.status}
                            </div>
                          </div>
                          <div style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.7 }}>
                            {run.input.length > 180 ? `${run.input.slice(0, 180)}...` : run.input}
                          </div>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <button onClick={() => void handleOpenRun(run.workflow_id, run.id)} style={secondaryButtonStyle}>
                              Open run
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                        {runResult.id ? `Workflow run #${runResult.id}` : 'Workflow result'}
                      </div>
                      <div style={{ color: 'var(--text-2)', fontSize: 14 }}>
                        Each step reused the previous output as context for the next agent.
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {runResult.created_at && (
                        <div style={metaPillStyle}>
                          {formatRunTime(runResult.created_at)}
                        </div>
                      )}
                      {runResult.status && (
                        <div style={metaPillStyle}>
                          Status: {runResult.status}
                        </div>
                      )}
                      {runResult.share_id && (
                        <div style={metaPillStyle}>
                          Shared
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button onClick={() => void handleShareRun()} disabled={!runResult.id || sharingRun} style={secondaryButtonStyle}>
                        {sharingRun ? 'Sharing...' : 'Share report'}
                      </button>
                      <button onClick={() => void handleExportPdf()} disabled={exportingPdf} style={secondaryButtonStyle}>
                        {exportingPdf ? 'Exporting...' : 'Export PDF'}
                      </button>
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

const metaPillStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 999,
  border: '1px solid var(--border)',
  background: 'var(--bg-3)',
  color: 'var(--text-2)',
  fontSize: 12,
  fontWeight: 600,
}
