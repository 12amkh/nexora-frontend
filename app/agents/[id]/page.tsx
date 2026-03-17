'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx'
import { jsPDF } from 'jspdf'

import { api, getErrorMessage, getToken } from '@/lib/api'
import { AppStateCard, StateActionButton } from '@/components/AppState'
import ConfirmDialog from '@/components/ConfirmDialog'
import { AgentPageLoadingState, ReportsLoadingState } from '@/components/LoadingSkeleton'
import { useToast } from '@/components/ToastProvider'
import RichContent, { parseRichContent } from '@/components/RichContent'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const QUICK_ACTIONS = [
  {
    label: 'Get AI Trends',
    prompt: 'Give me the most important AI trends right now, what is driving them, and what to watch next.',
  },
  {
    label: 'Market Opportunities',
    prompt: 'Analyze current market opportunities in this space and highlight the strongest gaps, demand signals, and business angles.',
  },
  {
    label: 'Startup Ideas',
    prompt: 'Generate strong startup ideas based on current trends, unmet needs, and practical opportunities I could explore.',
  },
]

interface Message {
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
}

interface Report {
  id: number
  title: string
  content: string
  share_id?: string | null
  created_at: string
}

interface Agent {
  id: number
  name: string
  config?: {
    agent_type?: string
    welcome_message?: string
  }
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function formatTimeLabel(value?: string): string {
  if (!value) return 'Now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Now'
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatDateDivider(value?: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function buildFollowUpPrompts(messages: Message[]): Array<{ label: string; prompt: string }> {
  const lastAssistant = [...messages].reverse().find(message => message.role === 'assistant' && message.content.trim())
  if (!lastAssistant) return []

  const lastReply = lastAssistant.content.replace(/\s+/g, ' ').trim()
  const preview = lastReply.length > 220 ? `${lastReply.slice(0, 217).trimEnd()}...` : lastReply

  return [
    {
      label: 'Go deeper',
      prompt: `Go deeper on your last answer. Expand the strongest points and add more detail where it matters.\n\nPrevious answer:\n${preview}`,
    },
    {
      label: 'Summarize context',
      prompt: `Summarize our recent conversation so far into the key ideas, decisions, and next steps.\n\nRecent context:\n${preview}`,
    },
    {
      label: 'Next actions',
      prompt: `Based on our conversation so far, turn the latest answer into concrete next actions I should take.\n\nLatest answer:\n${preview}`,
    },
  ]
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { pushToast, updateToast } = useToast()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [input, setInput] = useState('')
  const [pageLoading, setPageLoading] = useState(true)
  const [streaming, setStreaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'reports'>('chat')
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsLoaded, setReportsLoaded] = useState(false)
  const [previewReport, setPreviewReport] = useState<Report | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [error, setError] = useState('')
  const [agentLoadError, setAgentLoadError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [reportsError, setReportsError] = useState('')
  const [upgradeMessage, setUpgradeMessage] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const recentContext = messages.slice(-4)
  const followUpActions = buildFollowUpPrompts(messages)
  const requestedTab = searchParams.get('tab')
  const requestedReportId = searchParams.get('report')

  useEffect(() => {
    const init = async () => {
      if (!localStorage.getItem('token')) {
        router.push('/login')
        return
      }

      try {
        await Promise.all([loadAgent(), loadHistory()])
      } finally {
        setPageLoading(false)
      }
    }

    void init()
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (activeTab === 'reports' && !reportsLoaded) {
      loadReports()
    }
  }, [activeTab, reportsLoaded])

  useEffect(() => {
    if (requestedTab === 'reports' && activeTab !== 'reports') {
      setActiveTab('reports')
    }
  }, [requestedTab, activeTab])

  useEffect(() => {
    if (!requestedReportId || !reports.length) return

    const targetReportId = Number(requestedReportId)
    if (!Number.isFinite(targetReportId)) return

    const targetReport = reports.find(report => report.id === targetReportId)
    if (targetReport) {
      setPreviewReport(targetReport)
    }
  }, [requestedReportId, reports])

  const loadAgent = async () => {
    try {
      const { data } = await api.get(`/agents/${id}`)
      setAgent(data)
      setAgentLoadError('')
    } catch {
      setAgentLoadError("We couldn't load this agent right now.")
    }
  }

  const loadHistory = async () => {
    try {
      const { data } = await api.get(`/chat/history/${id}?limit=50`)
      setMessages(
        data.map((message: { role: string; message: string; created_at?: string }) => ({
          role: message.role as 'user' | 'assistant',
          content: message.message,
          createdAt: message.created_at,
        }))
      )
      setHistoryError('')
    } catch {
      setHistoryError("We couldn't load the recent conversation.")
    }
  }

  const loadReports = async () => {
    setReportsLoading(true)
    setReportsError('')
    try {
      const { data } = await api.get(`/agents/${id}/reports`)
      setReports(data)
      setReportsLoaded(true)
    } catch {
      setReports([])
      setReportsError("We couldn't load the saved reports.")
    } finally {
      setReportsLoading(false)
    }
  }

  const sanitizeInlineText = (text: string) => text.replace(/\*\*([^*]+)\*\*/g, '$1')

  const downloadReportPdf = (report: Report) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 52
    const lineWidth = pageWidth - margin * 2
    let cursorY = 56

    const ensureSpace = (height: number) => {
      if (cursorY + height <= pageHeight - margin) return
      doc.addPage()
      cursorY = 56
    }

    doc.setTextColor(19, 19, 20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text(report.title, margin, cursorY)
    cursorY += 18

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(102, 102, 108)
    doc.setFontSize(10)
    doc.text(new Date(report.created_at).toLocaleString(), margin, cursorY)
    cursorY += 24

    const blocks = parseRichContent(report.content)

    blocks.forEach((block) => {
      if (block.type === 'heading') {
        ensureSpace(24)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(19, 19, 20)
        doc.setFontSize(13)
        doc.text(block.content, margin, cursorY)
        cursorY += 22
        return
      }

      if (block.type === 'paragraph') {
        const lines = doc.splitTextToSize(sanitizeInlineText(block.content), lineWidth)
        ensureSpace(lines.length * 16)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(54, 54, 61)
        doc.setFontSize(11)
        doc.text(lines, margin, cursorY)
        cursorY += lines.length * 16 + 6
        return
      }

      if (block.type === 'bullet-list') {
        block.items.forEach((item) => {
          const lines = doc.splitTextToSize(`• ${sanitizeInlineText(item)}`, lineWidth)
          ensureSpace(lines.length * 16)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(54, 54, 61)
          doc.setFontSize(11)
          doc.text(lines, margin, cursorY)
          cursorY += lines.length * 16 + 4
        })
        cursorY += 4
        return
      }

      block.items.forEach((item, index) => {
        const lines = doc.splitTextToSize(`${index + 1}. ${sanitizeInlineText(item)}`, lineWidth)
        ensureSpace(lines.length * 16)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(54, 54, 61)
        doc.setFontSize(11)
        doc.text(lines, margin, cursorY)
        cursorY += lines.length * 16 + 4
      })
      cursorY += 4
    })

    doc.save(`${report.title.replace(/[^\w\s-]+/g, '').trim() || 'report'}.pdf`)
  }

  const downloadReportDocx = async (report: Report) => {
    const blocks = parseRichContent(report.content)
    const paragraphs: Paragraph[] = [
      new Paragraph({
        heading: HeadingLevel.TITLE,
        children: [new TextRun({ text: report.title, bold: true })],
      }),
      new Paragraph({
        children: [new TextRun({ text: new Date(report.created_at).toLocaleString(), color: '66666c' })],
      }),
    ]

    blocks.forEach((block) => {
      if (block.type === 'heading') {
        paragraphs.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: sanitizeInlineText(block.content), bold: true })],
          })
        )
        return
      }

      if (block.type === 'paragraph') {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: sanitizeInlineText(block.content) })],
          })
        )
        return
      }

      if (block.type === 'bullet-list') {
        block.items.forEach((item) => {
          paragraphs.push(
            new Paragraph({
              bullet: { level: 0 },
              children: [new TextRun({ text: sanitizeInlineText(item) })],
            })
          )
        })
        return
      }

      block.items.forEach((item, index) => {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: `${index + 1}. ${sanitizeInlineText(item)}` })],
          })
        )
      })
    })

    const document = new Document({
      sections: [
        {
          children: paragraphs,
        },
      ],
    })

    const blob = await Packer.toBlob(document)
    triggerBlobDownload(blob, `${report.title.replace(/[^\w\s-]+/g, '').trim() || 'report'}.docx`)
  }

  const handleShareReport = async (report: Report) => {
    const toastId = pushToast({
      title: 'Generating share link',
      description: 'Preparing a public link for this report.',
      tone: 'loading',
      dismissible: false,
    })

    try {
      const { data } = await api.post(`/agents/${id}/reports/${report.id}/share`)
      const shareLink = `${window.location.origin}/reports/${data.share_id}`
      await navigator.clipboard.writeText(shareLink)
      setReports(prev =>
        prev.map(item => (item.id === report.id ? { ...item, share_id: data.share_id } : item))
      )
      if (previewReport?.id === report.id) {
        setPreviewReport({ ...report, share_id: data.share_id })
      }
      updateToast(toastId, {
        title: 'Share link copied',
        description: 'Anyone with the link can open this report.',
        tone: 'success',
        dismissible: true,
      })
    } catch (err: unknown) {
      updateToast(toastId, {
        title: "Couldn't share report",
        description: getErrorMessage(err),
        tone: 'error',
        dismissible: true,
      })
    }
  }

  const sendMessage = async (presetMessage?: string) => {
    const nextMessage = presetMessage ?? input

    if (!nextMessage.trim() || streaming) return

    setError('')
    setUpgradeMessage('')

    const userMessage = nextMessage.trim()
    setInput('')
    const createdAt = new Date().toISOString()
    setMessages(prev => [...prev, { role: 'user', content: userMessage, createdAt }])
    setStreaming(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '', createdAt }])

    try {
      const response = await fetch(`${API_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ agent_id: Number(id), message: userMessage }),
      })

      if (!response.ok) {
        let detail = 'Something went wrong. Please try again.'
        try {
          const payload = await response.json()
          if (typeof payload?.detail === 'string') {
            detail = payload.detail
          }
        } catch {
          // Ignore non-JSON error payloads.
        }

        if (/limit reached|upgrade|max/i.test(detail)) {
          setUpgradeMessage(detail)
        }
        throw new Error(detail)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

        for (const line of lines) {
          const payload = line.replace('data: ', '').trim()
          if (!payload) continue

          try {
            const event = JSON.parse(payload)
            if (event.token) {
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: updated[updated.length - 1].content + event.token,
                  createdAt: updated[updated.length - 1].createdAt,
                }
                return updated
              })
            }
          } catch {
            // Skip malformed chunks.
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: message,
          createdAt: updated[updated.length - 1].createdAt,
        }
        return updated
      })
    } finally {
      setStreaming(false)
      setReportsLoaded(false)
    }
  }

  const runQuickAction = async (prompt: string) => {
    if (activeTab !== 'chat') {
      setActiveTab('chat')
    }
    await sendMessage(prompt)
  }

  const handleDelete = async () => {
    if (!agent || deleting) return

    const toastId = pushToast({
      title: `Deleting ${agent.name}`,
      description: 'Removing this agent and its conversation history.',
      tone: 'loading',
      dismissible: false,
    })
    setDeleting(true)
    setError('')

    try {
      await api.delete(`/agents/${id}`)
      updateToast(toastId, {
        title: `${agent.name} deleted`,
        description: 'The agent was removed successfully.',
        tone: 'success',
        dismissible: true,
      })
      router.push('/dashboard')
    } catch (err: unknown) {
      const message = getErrorMessage(err)
      setError(message)
      updateToast(toastId, {
        title: `Couldn't delete ${agent.name}`,
        description: message,
        tone: 'error',
        dismissible: true,
      })
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  if (pageLoading) {
    return <AgentPageLoadingState />
  }

  if (agentLoadError && !agent) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: 'min(720px, 100%)' }}>
          <AppStateCard
            eyebrow='Agent unavailable'
            icon='🤖'
            title='This agent could not be opened'
            description={`${agentLoadError} You can try again now or head back to your dashboard.`}
            tone='error'
            actions={
              <>
                <StateActionButton label='Retry agent' onClick={() => {
                  setPageLoading(true)
                  void Promise.all([loadAgent(), loadHistory()]).finally(() => setPageLoading(false))
                }} />
                <Link href='/dashboard' style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border-2)',
                  background: 'var(--bg-2)',
                  color: 'var(--text)',
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: 'none',
                }}>
                  Back to dashboard
                </Link>
              </>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <ConfirmDialog
        open={showDeleteDialog}
        title={agent ? `Delete ${agent.name}?` : 'Delete agent?'}
        description='This permanently removes the agent and all of its conversation history.'
        warning='Saved reports and recent chat context tied to this agent will no longer be available after deletion.'
        confirmLabel='Delete agent'
        cancelLabel='Keep agent'
        destructive
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!deleting) setShowDeleteDialog(false)
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-3)', fontSize: '1.1rem' }}>
          ←
        </Link>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{agent?.name || '...'}</div>
          <div style={{ color: 'var(--text-3)', fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', textTransform: 'capitalize' }}>
            {agent?.config?.agent_type?.replace(/_/g, ' ') || ''}
          </div>
        </div>
        {agent && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleting}
              style={{
                color: deleting ? 'var(--text-3)' : 'var(--red)',
                background: 'transparent',
                border: '1px solid var(--border)',
                padding: '0.3rem 0.7rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: deleting ? 'not-allowed' : 'pointer',
              }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
            <Link
              href={`/agents/${id}/edit`}
              style={{ color: 'var(--text-3)', border: '1px solid var(--border)', padding: '0.3rem 0.7rem', borderRadius: '6px', fontSize: '0.8rem' }}
            >
              Edit
            </Link>
          </div>
        )}
      </div>

      {(error || historyError) && (
        <div style={{ maxWidth: '900px', width: '100%', margin: '1rem auto 0', padding: '0 2rem' }}>
          <AppStateCard
            eyebrow='Conversation issue'
            icon='⚠️'
            title='Part of this conversation needs another try'
            description={error || historyError}
            tone='error'
            compact
            actions={<StateActionButton label='Retry conversation' onClick={() => void loadHistory()} />}
          />
        </div>
      )}

      {upgradeMessage && (
        <div style={{ maxWidth: '900px', width: '100%', margin: '1rem auto 0', padding: '0 2rem' }}>
          <div style={{ background: 'rgba(217,121,85,0.1)', border: '1px solid var(--accent)', borderRadius: '10px', color: 'var(--text)', padding: '0.9rem 1rem', fontSize: '0.9rem' }}>
            <span>{upgradeMessage}</span>
            <Link href="/dashboard/upgrade" style={{ marginLeft: 8, color: 'var(--accent)', fontWeight: 700, textDecoration: 'underline' }}>
              Upgrade plan
            </Link>
          </div>
        </div>
      )}

      {previewReport && (
        <div
          onClick={() => setPreviewReport(null)}
          className='app-modal-overlay'
          style={{ zIndex: 50 }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className='app-modal-card'
            style={{ width: 'min(920px, 100%)', maxHeight: '85vh', overflowY: 'auto', padding: '1.5rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ color: 'var(--text)', fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  {previewReport.title}
                </div>
                <div style={{ color: 'var(--text-3)', fontSize: '0.84rem' }}>
                  {new Date(previewReport.created_at).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => setPreviewReport(null)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-3)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.2rem' }}>
              <RichContent content={previewReport.content} />
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '900px', width: '100%', margin: '0 auto', padding: '1rem 2rem 0' }}>
        <div style={{ display: 'inline-flex', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '999px', padding: '0.25rem', gap: '0.25rem' }}>
          {(['chat', 'reports'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? 'var(--accent)' : 'transparent',
                color: activeTab === tab ? '#fff' : 'var(--text-2)',
                border: 'none',
                borderRadius: '999px',
                padding: '0.55rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {tab === 'chat' ? 'Chat' : 'Reports'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'chat' ? (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '900px', width: '100%', margin: '0 auto', alignSelf: 'center' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.25rem' }}>
              {QUICK_ACTIONS.map(action => (
                <button
                  key={action.label}
                  onClick={() => runQuickAction(action.prompt)}
                  disabled={streaming}
                  style={{
                    background: 'var(--bg-2)',
                    color: streaming ? 'var(--text-3)' : 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: '999px',
                    padding: '0.6rem 0.95rem',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: streaming ? 'not-allowed' : 'pointer',
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
            {recentContext.length > 1 && (
              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '0.95rem 1rem', display: 'grid', gap: '0.7rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '0.9rem' }}>Recent context</div>
                  <div style={{ color: 'var(--text-3)', fontSize: '0.76rem' }}>Conversation continues from your latest turns</div>
                </div>
                <div style={{ display: 'grid', gap: '0.6rem' }}>
                  {recentContext.map((message, index) => (
                    <div key={`context-${index}`} style={{ display: 'grid', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <span style={{ color: message.role === 'user' ? 'var(--accent)' : 'var(--text)', fontSize: '0.78rem', fontWeight: 700 }}>
                          {message.role === 'user' ? 'You' : agent?.name || 'Agent'}
                        </span>
                        <span style={{ color: 'var(--text-3)', fontSize: '0.74rem' }}>
                          {formatTimeLabel(message.createdAt)}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-2)', fontSize: '0.84rem', lineHeight: 1.65 }}>
                        {message.content.length > 180 ? `${message.content.slice(0, 177).trimEnd()}...` : message.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {followUpActions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                {followUpActions.map(action => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.prompt)}
                    disabled={streaming}
                    style={{
                      background: 'rgba(217,121,85,0.08)',
                      color: streaming ? 'var(--text-3)' : 'var(--accent)',
                      border: '1px solid rgba(217,121,85,0.18)',
                      borderRadius: '999px',
                      padding: '0.55rem 0.9rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: streaming ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
            {messages.length === 0 && agent && (
              <div
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 20,
                  padding: '2rem 1.4rem',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    borderRadius: 999,
                    background: 'rgba(217,121,85,0.1)',
                    color: 'var(--accent)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '1rem',
                  }}
                >
                  First Run
                </div>
                <h2 style={{ color: 'var(--text)', fontSize: '1.5rem', lineHeight: 1.15, letterSpacing: '-0.03em', margin: '0 0 0.75rem' }}>
                  Start the conversation with a quick action or your own prompt
                </h2>
                <p style={{ color: 'var(--text-2)', margin: '0 0 1.1rem', fontSize: '0.96rem', lineHeight: 1.75, maxWidth: 680 }}>
                  {agent.config?.welcome_message || `Hi! I'm ${agent.name}. How can I help?`}
                </p>
                <div style={{ display: 'grid', gap: '0.7rem', marginBottom: '1.2rem' }}>
                  {[
                    'Click a quick action above for an instant first result.',
                    'Ask a direct question, request research, or generate ideas in the composer below.',
                    'Keep chatting with follow-up prompts to build on recent context.',
                  ].map(item => (
                    <div
                      key={item}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        color: 'var(--text-2)',
                        fontSize: '0.9rem',
                      }}
                    >
                      <span style={{ color: 'var(--accent)', fontWeight: 700 }}>•</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.7rem' }}>
                  {QUICK_ACTIONS.map(action => (
                    <button
                      key={`empty-${action.label}`}
                      onClick={() => runQuickAction(action.prompt)}
                      disabled={streaming}
                      style={{
                        background: 'var(--bg-3)',
                        color: streaming ? 'var(--text-3)' : 'var(--text)',
                        border: '1px solid var(--border)',
                        borderRadius: 999,
                        padding: '0.7rem 1rem',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: streaming ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <div key={index}>
                {(() => {
                  const currentDay = formatDateDivider(message.createdAt)
                  const previousDay = index > 0 ? formatDateDivider(messages[index - 1].createdAt) : null
                  if (currentDay && currentDay !== previousDay) {
                    return (
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '0.25rem 0 0.85rem' }}>
                        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '999px', padding: '0.32rem 0.7rem', color: 'var(--text-3)', fontSize: '0.74rem' }}>
                          {currentDay}
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}
              <div style={{ display: 'flex', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '75%',
                    padding: '0.8rem 1rem',
                    borderRadius: message.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: message.role === 'user' ? 'var(--accent)' : 'var(--bg-2)',
                    border: message.role === 'assistant' ? '1px solid var(--border)' : 'none',
                    fontSize: '0.9rem',
                    lineHeight: 1.65,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ color: message.role === 'user' ? 'rgba(255,255,255,0.82)' : 'var(--text-3)', fontSize: '0.74rem', fontWeight: 700 }}>
                      {message.role === 'user' ? 'You' : agent?.name || 'Agent'}
                    </span>
                    <span style={{ color: message.role === 'user' ? 'rgba(255,255,255,0.72)' : 'var(--text-3)', fontSize: '0.72rem' }}>
                      {formatTimeLabel(message.createdAt)}
                    </span>
                  </div>
                  {message.role === 'assistant' ? (
                    <RichContent content={message.content} />
                  ) : (
                    message.content
                  )}
                  {streaming && index === messages.length - 1 && message.role === 'assistant' && message.content === '' && (
                    <span style={{ display: 'inline-block', width: '7px', height: '14px', background: 'var(--accent)', borderRadius: '2px', animation: 'blink 0.8s infinite', verticalAlign: 'middle' }} />
                  )}
                </div>
              </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border)', background: 'var(--bg-2)', display: 'flex', gap: '0.75rem', maxWidth: '900px', width: '100%', margin: '0 auto', alignSelf: 'center' }}>
            <textarea
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Message your agent... (Enter to send, Shift+Enter for new line)"
              rows={1}
              style={{ flex: 1, background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: '10px', padding: '0.75rem 1rem', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', resize: 'none' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={streaming || !input.trim()}
              style={{ background: streaming ? 'var(--bg-3)' : 'var(--accent)', color: streaming ? 'var(--text-3)' : '#fff', border: 'none', borderRadius: '10px', padding: '0 1.25rem', cursor: streaming ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.9rem' }}
            >
              {streaming ? '...' : 'Send'}
            </button>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem 2rem', maxWidth: '900px', width: '100%', margin: '0 auto', alignSelf: 'center' }}>
          {reportsLoading ? (
            <ReportsLoadingState />
          ) : reportsError ? (
            <AppStateCard
              eyebrow='Reports unavailable'
              icon='🗂️'
              title='Saved reports could not be loaded'
              description={`${reportsError} Retry to fetch the latest generated reports for this agent.`}
              tone='error'
              actions={<StateActionButton label='Retry reports' onClick={() => void loadReports()} />}
            />
          ) : reports.length === 0 ? (
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.4rem 1.2rem', color: 'var(--text-2)', lineHeight: 1.7 }}>
              <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1rem', marginBottom: '0.4rem' }}>
                No saved reports yet
              </div>
              <div style={{ marginBottom: '0.9rem' }}>
                Reports appear here when this agent produces deeper research, summaries, or structured analysis. Casual chat stays in Chat only.
              </div>
              <button
                onClick={() => setActiveTab('chat')}
                style={{
                  background: 'var(--bg-3)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '0.7rem 1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Go to chat
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {reports.map(report => (
                <div key={report.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.1rem 1.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem' }}>{report.title}</div>
                      <div style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{new Date(report.created_at).toLocaleString()}</div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setPreviewReport(report)}
                        style={{
                          background: 'var(--bg-3)',
                          color: 'var(--text)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          padding: '0.55rem 0.8rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => downloadReportPdf(report)}
                        style={{
                          background: 'var(--bg-3)',
                          color: 'var(--text)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          padding: '0.55rem 0.8rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => downloadReportDocx(report)}
                        style={{
                          background: 'var(--bg-3)',
                          color: 'var(--text)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          padding: '0.55rem 0.8rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        DOCX
                      </button>
                      <button
                        onClick={() => void handleShareReport(report)}
                        style={{
                          background: 'var(--bg-3)',
                          color: 'var(--text)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          padding: '0.55rem 0.8rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Share Report
                      </button>
                    </div>
                  </div>
                  <div style={{ color: 'var(--text-2)', fontSize: '0.92rem', lineHeight: 1.7, wordBreak: 'break-word' }}>
                    <RichContent content={report.content} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  )
}
