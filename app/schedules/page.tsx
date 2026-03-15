'use client'

// app/schedules/page.tsx
// Stage 15: Schedules page — list, create, pause/resume, manual trigger with live polling

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, formatPlanName, getUser, logout, getErrorMessage, normalizePlan, refreshCurrentUser } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Schedule {
  id: number
  name: string
  cron: string
  task_message: string
  is_active: boolean
  agent_id: number
  last_run_at?: string | null
  last_run_status?: string | null
  agent_name?: string
}

interface Agent {
  id: number
  name: string
}

interface TaskResult {
  scheduleId: number
  status: 'pending' | 'started' | 'retry' | 'success' | 'failure'
  result?: string
}

type PendingTaskMap = Record<string, string>
type CachedTaskResultMap = Record<string, { status: TaskResult['status']; result?: string }>

const PLAN_LIMITS: Record<string, number | null> = {
  free: 0, starter: 3, pro: 10, business: 50, enterprise: null,
}

const PLAN_COLORS: Record<string, string> = {
  free: '#8888a0', starter: '#34d399', pro: '#6c63ff', business: '#f59e0b', enterprise: '#ec4899',
}

const PENDING_TASKS_STORAGE_KEY = 'nexora_pending_schedule_tasks'
const TASK_RESULTS_STORAGE_KEY = 'nexora_schedule_task_results'

// ─── Friendly cron builder ────────────────────────────────────────────────────

const REPEAT_OPTIONS = [
  { label: 'Every hour',  value: 'hourly'  },
  { label: 'Every day',   value: 'daily'   },
  { label: 'Every week',  value: 'weekly'  },
  { label: 'Every month', value: 'monthly' },
]

const DAY_OPTIONS = [
  { label: 'Monday',    value: '1' },
  { label: 'Tuesday',   value: '2' },
  { label: 'Wednesday', value: '3' },
  { label: 'Thursday',  value: '4' },
  { label: 'Friday',    value: '5' },
  { label: 'Saturday',  value: '6' },
  { label: 'Sunday',    value: '0' },
]

const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) => ({
  label: h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`,
  value: String(h),
}))

const buildCron = (repeat: string, hour: string, day: string): string => {
  if (repeat === 'hourly')  return '0 * * * *'
  if (repeat === 'daily')   return `0 ${hour} * * *`
  if (repeat === 'weekly')  return `0 ${hour} * * ${day}`
  if (repeat === 'monthly') return `0 ${hour} 1 * *`
  return `0 ${hour} * * *`
}

const cronToLabel = (cron: string): string => {
  if (cron === '0 * * * *') return 'Every hour'
  const parts = cron.split(' ')
  if (parts.length !== 5) return cron
  const [, h, dom, , dow] = parts
  const hour = TIME_OPTIONS.find(t => t.value === h)?.label ?? `${h}:00`
  if (dom === '1' && dow === '*') return `Every month at ${hour}`
  if (dow !== '*') {
    const dayName = DAY_OPTIONS.find(d => d.value === dow)?.label ?? `day ${dow}`
    return `Every ${dayName} at ${hour}`
  }
  return `Every day at ${hour}`
}

const getTaskTone = (status: TaskResult['status']) => {
  if (status === 'success') {
    return {
      bg: 'rgba(52,211,153,0.08)',
      border: 'rgba(52,211,153,0.3)',
      text: 'var(--green)',
      label: 'Last run completed',
      icon: '✓',
    }
  }
  if (status === 'failure') {
    return {
      bg: 'rgba(248,113,113,0.08)',
      border: 'rgba(248,113,113,0.3)',
      text: 'var(--red)',
      label: 'Last run failed',
      icon: '✗',
    }
  }
  if (status === 'retry') {
    return {
      bg: 'rgba(251,191,36,0.08)',
      border: 'rgba(251,191,36,0.3)',
      text: '#fbbf24',
      label: 'Retrying run',
      icon: '🔁',
    }
  }
  return {
    bg: 'var(--bg-3)',
    border: 'var(--border)',
    text: 'var(--text-2)',
    label: status === 'started' ? 'Worker is running' : 'Waiting in queue',
    icon: status === 'started' ? '⚙️' : '⏳',
  }
}

const formatRunTime = (isoDate?: string | null) => {
  if (!isoDate) return null

  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SchedulesPage() {
  const router = useRouter()
  const pollIntervals = useRef<Record<number, ReturnType<typeof setInterval>>>({})
  const restoredTasks = useRef(false)

  const [schedules, setSchedules]   = useState<Schedule[]>([])
  const [agents, setAgents]         = useState<Agent[]>([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [user, setUser]             = useState<{ email?: string; name?: string; plan?: string } | null>(null)

  const [taskResults, setTaskResults] = useState<Record<number, TaskResult>>({})
  const [running, setRunning]         = useState<Set<number>>(new Set())
  const [toggling, setToggling]       = useState<Set<number>>(new Set())

  const [form, setForm] = useState({
    name: '', agent_id: '', prompt: '',
    repeat: 'daily', hour: '9', day: '1',
  })

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      if (!localStorage.getItem('token')) { router.push('/login'); return }

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
        // Keep cached user data if refresh fails.
      }

      loadData(true)
    }

    init()

    return () => {
      Object.values(pollIntervals.current).forEach(clearInterval)
      pollIntervals.current = {}
    }
  }, [])

  const getPendingTasks = (): PendingTaskMap => {
    if (typeof window === 'undefined') return {}
    try {
      const raw = localStorage.getItem(PENDING_TASKS_STORAGE_KEY)
      return raw ? JSON.parse(raw) as PendingTaskMap : {}
    } catch {
      return {}
    }
  }

  const setPendingTasks = (tasks: PendingTaskMap) => {
    if (typeof window === 'undefined') return
    if (Object.keys(tasks).length === 0) {
      localStorage.removeItem(PENDING_TASKS_STORAGE_KEY)
      return
    }
    localStorage.setItem(PENDING_TASKS_STORAGE_KEY, JSON.stringify(tasks))
  }

  const rememberTask = (scheduleId: number, taskId: string) => {
    const tasks = getPendingTasks()
    tasks[String(scheduleId)] = taskId
    setPendingTasks(tasks)
  }

  const forgetTask = (scheduleId: number) => {
    const tasks = getPendingTasks()
    delete tasks[String(scheduleId)]
    setPendingTasks(tasks)
  }

  const getCachedResults = (): CachedTaskResultMap => {
    if (typeof window === 'undefined') return {}
    try {
      const raw = localStorage.getItem(TASK_RESULTS_STORAGE_KEY)
      return raw ? JSON.parse(raw) as CachedTaskResultMap : {}
    } catch {
      return {}
    }
  }

  const setCachedResults = (results: CachedTaskResultMap) => {
    if (typeof window === 'undefined') return
    if (Object.keys(results).length === 0) {
      localStorage.removeItem(TASK_RESULTS_STORAGE_KEY)
      return
    }
    localStorage.setItem(TASK_RESULTS_STORAGE_KEY, JSON.stringify(results))
  }

  const rememberResult = (scheduleId: number, status: TaskResult['status'], result?: string) => {
    const results = getCachedResults()
    results[String(scheduleId)] = { status, result }
    setCachedResults(results)
  }

  const forgetResult = (scheduleId: number) => {
    const results = getCachedResults()
    delete results[String(scheduleId)]
    setCachedResults(results)
  }

  const restorePendingTasks = (scheduleList: Schedule[]) => {
    if (restoredTasks.current) return
    restoredTasks.current = true

    const pendingTasks = getPendingTasks()
    const scheduleIds = new Set(scheduleList.map((schedule) => String(schedule.id)))

    Object.entries(pendingTasks).forEach(([scheduleId, taskId]) => {
      if (!scheduleIds.has(scheduleId)) {
        forgetTask(Number(scheduleId))
        return
      }

      const id = Number(scheduleId)
      setRunning(prev => new Set(prev).add(id))
      setTaskResults(prev => ({
        ...prev,
        [id]: { scheduleId: id, status: 'pending', result: 'Restored after reload. Checking task status...' },
      }))
      pollTask(id, taskId)
    })
  }

  const restoreCachedResults = (scheduleList: Schedule[]) => {
    const cachedResults = getCachedResults()

    setTaskResults(prev => {
      const next = { ...prev }

      scheduleList.forEach((schedule) => {
        if (next[schedule.id]) return

        const cached = cachedResults[String(schedule.id)]
        if (!cached) return

        next[schedule.id] = {
          scheduleId: schedule.id,
          status: cached.status,
          result: cached.result,
        }
      })

      return next
    })
  }

  const loadData = async (restoreTasks = false) => {
    setLoading(true)
    try {
      const [schedRes, agentRes] = await Promise.all([
        api.get('/schedules/list'),
        api.get('/agents/list?limit=50'),
      ])
      const agentList: Agent[] = agentRes.data
      setAgents(agentList)
      const agentMap = Object.fromEntries(agentList.map(a => [a.id, a.name]))
      const enriched = schedRes.data.map((s: Schedule) => ({
        ...s,
        agent_name: agentMap[s.agent_id] ?? 'Unknown agent',
      }))
      setSchedules(enriched)
      restoreCachedResults(enriched)
      if (restoreTasks) {
        restorePendingTasks(enriched)
      }
      if (agentList.length > 0) {
        setForm(prev => ({ ...prev, agent_id: String(agentList[0].id) }))
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.name.trim() || !form.agent_id || !form.prompt.trim()) {
      setError('Name, agent, and prompt are all required')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const cron = buildCron(form.repeat, form.hour, form.day)
      await api.post('/schedules/create', {
        name:         form.name.trim(),
        agent_id:     Number(form.agent_id),
        task_message: form.prompt.trim(),
        cron,
        is_active:    true,
      })
      setForm(prev => ({ ...prev, name: '', prompt: '', repeat: 'daily', hour: '9', day: '1' }))
      setShowForm(false)
      await loadData()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  // ── Pause / Resume ─────────────────────────────────────────────────────────
  const handleToggle = async (schedule: Schedule) => {
    setToggling(prev => new Set(prev).add(schedule.id))
    try {
      await api.put(`/schedules/${schedule.id}`, { is_active: !schedule.is_active })
      setSchedules(prev =>
        prev.map(s => s.id === schedule.id ? { ...s, is_active: !s.is_active } : s)
      )
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setToggling(prev => { const n = new Set(prev); n.delete(schedule.id); return n })
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!confirm('Delete this schedule?')) return
    try {
      await api.delete(`/schedules/${id}`)
      if (pollIntervals.current[id]) {
        clearInterval(pollIntervals.current[id])
        delete pollIntervals.current[id]
      }
      forgetTask(id)
      forgetResult(id)
      setSchedules(prev => prev.filter(s => s.id !== id))
      setRunning(prev => { const n = new Set(prev); n.delete(id); return n })
      setTaskResults(prev => { const n = { ...prev }; delete n[id]; return n })
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  // ── Manual trigger + polling ───────────────────────────────────────────────
  const handleRun = async (scheduleId: number) => {
    setRunning(prev => new Set(prev).add(scheduleId))
    setTaskResults(prev => ({ ...prev, [scheduleId]: { scheduleId, status: 'pending', result: 'Queued. Checking task status...' } }))
    try {
      const { data } = await api.post(`/schedules/${scheduleId}/run`)
      rememberTask(scheduleId, data.task_id)
      pollTask(scheduleId, data.task_id)
    } catch (err) {
      forgetTask(scheduleId)
      setRunning(prev => { const n = new Set(prev); n.delete(scheduleId); return n })
      setTaskResults(prev => ({
        ...prev,
        [scheduleId]: { scheduleId, status: 'failure', result: getErrorMessage(err) },
      }))
    }
  }

  // FIX: single clean if/else block — all branches inside the setInterval callback
  // Previous version had a stray closing brace that kicked the else-if outside the callback
  const pollTask = (scheduleId: number, taskId: string) => {
    if (pollIntervals.current[scheduleId]) return

    let attempts = 0
    const MAX_ATTEMPTS = 30 // ~60 seconds at 2s intervals

    const interval = setInterval(async () => {
      attempts += 1

      try {
        const { data } = await api.get(`/schedules/task/${taskId}`)
        // Normalize to lowercase — Celery returns "SUCCESS"/"FAILURE" uppercase
        const status = (data.status as string).toLowerCase()

        if (status === 'success') {
          clearInterval(interval)
          delete pollIntervals.current[scheduleId]
          forgetTask(scheduleId)
          setRunning(prev => { const n = new Set(prev); n.delete(scheduleId); return n })
          // data.result may be a string or a metadata object — extract displayable text safely
          const resultText = typeof data.result === 'string'
            ? data.result
            : data.result?.response ?? data.result?.output ?? 'Task completed successfully'
          setTaskResults(prev => ({
            ...prev,
            [scheduleId]: { scheduleId, status: 'success', result: resultText },
          }))
          rememberResult(scheduleId, 'success', resultText)
          setSchedules(prev => prev.map(schedule =>
            schedule.id === scheduleId
              ? { ...schedule, last_run_status: 'success', last_run_at: new Date().toISOString() }
              : schedule
          ))
        } else if (status === 'started') {
          setTaskResults(prev => ({
            ...prev,
            [scheduleId]: { scheduleId, status: 'started', result: 'Task is running on the worker...' },
          }))
        } else if (status === 'retry') {
          setTaskResults(prev => ({
            ...prev,
            [scheduleId]: { scheduleId, status: 'retry', result: 'Task hit an error and is being retried...' },
          }))
        } else if (status === 'failure') {
          clearInterval(interval)
          delete pollIntervals.current[scheduleId]
          forgetTask(scheduleId)
          setRunning(prev => { const n = new Set(prev); n.delete(scheduleId); return n })
          const resultText = typeof data.result === 'string'
            ? data.result
            : 'Task failed'
          setTaskResults(prev => ({
            ...prev,
            [scheduleId]: { scheduleId, status: 'failure', result: resultText },
          }))
          rememberResult(scheduleId, 'failure', resultText)
          setSchedules(prev => prev.map(schedule =>
            schedule.id === scheduleId
              ? { ...schedule, last_run_status: 'failed', last_run_at: new Date().toISOString() }
              : schedule
          ))
        } else if (attempts >= MAX_ATTEMPTS) {
          clearInterval(interval)
          delete pollIntervals.current[scheduleId]
          forgetTask(scheduleId)
          setRunning(prev => { const n = new Set(prev); n.delete(scheduleId); return n })
          setTaskResults(prev => ({
            ...prev,
            [scheduleId]: {
              scheduleId,
              status: 'failure',
              result: 'Task is still queued after 60 seconds. Your Celery worker may not be running.',
            },
          }))
          rememberResult(scheduleId, 'failure', 'Task is still queued after 60 seconds. Your Celery worker may not be running.')
        }
        // status === 'pending' → keep polling until success/failure/timeout
      } catch {
        clearInterval(interval)
        delete pollIntervals.current[scheduleId]
        forgetTask(scheduleId)
        setRunning(prev => { const n = new Set(prev); n.delete(scheduleId); return n })
        setTaskResults(prev => ({
          ...prev,
          [scheduleId]: {
            scheduleId,
            status: 'failure',
            result: 'Failed to check task status. Please try again.',
          },
        }))
        rememberResult(scheduleId, 'failure', 'Failed to check task status. Please try again.')
      }
    }, 2000)

    pollIntervals.current[scheduleId] = interval
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const plan    = normalizePlan(user?.plan)
  const limit   = PLAN_LIMITS[plan] ?? 0
  const isFree  = plan === 'free'
  const atLimit = limit !== null && schedules.length >= limit && !isFree

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, minHeight: '100vh',
        background: 'var(--bg-2)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', padding: '20px 16px',
        position: 'fixed', top: 0, left: 0, zIndex: 10,
      }}>
        <Link href="/dashboard" style={{
          fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.03em',
          padding: '0.5rem 0.75rem', display: 'block', marginBottom: '1.25rem',
          color: 'var(--text)', textDecoration: 'none',
        }}>
          Nexora
        </Link>
        <NavItem href="/dashboard" label="🤖  Agents"   active={false} />
        <NavItem href="/schedules" label="⏰  Schedules" active={true}  />

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div style={{ padding: '0.5rem 0.75rem' }}>
            <div style={{
              fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)',
              marginBottom: '0.15rem', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user?.name || user?.email}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: PLAN_COLORS[plan], display: 'inline-block',
              }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', textTransform: 'capitalize' }}>
                {formatPlanName(plan)} plan
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            style={{
              width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem',
              background: 'transparent', border: 'none',
              color: 'var(--text-3)', fontSize: '0.85rem',
              cursor: 'pointer', borderRadius: 6,
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ marginLeft: 220, flex: 1, padding: '40px 48px', maxWidth: 860 }}>

        {/* Page header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', marginBottom: 28,
        }}>
          <div>
            <h1 style={{
              fontSize: 28, fontWeight: 700, color: 'var(--text)',
              margin: 0, letterSpacing: '-0.5px',
            }}>
              Schedules
            </h1>
            <p style={{ color: 'var(--text-2)', fontSize: 14, margin: '6px 0 0' }}>
              Automated tasks that run your agents on a timer
            </p>

            {!loading && (
              isFree ? (
                <div style={{
                  marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.25)',
                  borderRadius: 8, padding: '6px 12px',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                    🔒 Schedules require{' '}
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Starter ($19/mo)</span>
                    {' '}or higher
                  </span>
                  <Link href="/dashboard/upgrade" style={{ color: 'var(--text)', fontWeight: 700, textDecoration: 'underline', fontSize: 13 }}>
                    Upgrade
                  </Link>
                </div>
              ) : (
                <div style={{
                  marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'var(--bg-3)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '6px 12px',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: atLimit ? 'var(--red)' : 'var(--green)' }}>
                    {limit === null ? `${schedules.length} / Unlimited` : `${schedules.length} / ${limit}`}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>schedules used</span>
                  {atLimit && (
                    <span style={{
                      fontSize: 11, color: 'var(--red)',
                      background: 'rgba(248,113,113,0.1)', padding: '2px 8px',
                      borderRadius: 6, border: '1px solid rgba(248,113,113,0.3)',
                    }}>
                      Limit reached
                    </span>
                  )}
                </div>
              )
            )}
          </div>

          {!isFree && !atLimit && (
            <button
              onClick={() => { setShowForm(f => !f); setError('') }}
              style={{
                padding: '10px 18px', borderRadius: 8,
                background: showForm ? 'var(--bg-3)' : 'var(--accent)',
                border: showForm ? '1px solid var(--border-2)' : 'none',
                color: showForm ? 'var(--text-2)' : 'white',
                fontSize: 14, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
              }}
            >
              {showForm ? 'Cancel' : '+ New schedule'}
            </button>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            background: 'rgba(248,113,113,0.1)', border: '1px solid var(--red)',
            borderRadius: 8, padding: '12px 16px', color: 'var(--red)',
            fontSize: 14, marginBottom: 24,
          }}>
            {error}
          </div>
        )}

        {/* ── Create form ── */}
        {showForm && (
          <div style={{
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 24, marginBottom: 24,
          }}>
            <h2 style={{
              fontSize: 13, fontWeight: 600, color: 'var(--text-2)',
              textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 20px',
            }}>
              New schedule
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Schedule name</label>
                <input name="name" value={form.name} onChange={handleChange}
                  placeholder="Daily market summary" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Agent</label>
                <select name="agent_id" value={form.agent_id} onChange={handleChange} style={inputStyle}>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>When should this run?</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <select name="repeat" value={form.repeat} onChange={handleChange}
                  style={{ ...inputStyle, width: 'auto', flex: '1 1 140px' }}>
                  {REPEAT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

                {form.repeat === 'weekly' && (
                  <>
                    <span style={{ color: 'var(--text-3)', fontSize: 13 }}>on</span>
                    <select name="day" value={form.day} onChange={handleChange}
                      style={{ ...inputStyle, width: 'auto', flex: '1 1 130px' }}>
                      {DAY_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </>
                )}

                {form.repeat !== 'hourly' && (
                  <>
                    <span style={{ color: 'var(--text-3)', fontSize: 13 }}>at</span>
                    <select name="hour" value={form.hour} onChange={handleChange}
                      style={{ ...inputStyle, width: 'auto', flex: '1 1 130px' }}>
                      {TIME_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </>
                )}

                <span style={{
                  padding: '8px 12px', borderRadius: 6,
                  background: 'var(--bg-3)', border: '1px solid var(--border)',
                  color: 'var(--text-3)', fontSize: 12,
                  fontFamily: 'JetBrains Mono, monospace', flexShrink: 0,
                }}>
                  {buildCron(form.repeat, form.hour, form.day)}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>What should the agent do each run?</label>
              <textarea name="prompt" value={form.prompt} onChange={handleChange}
                placeholder="Summarize the top 5 technology news stories from today"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleCreate} disabled={submitting} style={{
                padding: '10px 24px', borderRadius: 8,
                background: submitting ? 'var(--bg-3)' : 'var(--accent)',
                border: 'none', color: submitting ? 'var(--text-2)' : 'white',
                fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer',
              }}>
                {submitting ? 'Creating...' : 'Create schedule'}
              </button>
            </div>
          </div>
        )}

        {/* ── Schedule list ── */}
        {loading ? (
          <div style={{ color: 'var(--text-2)', fontSize: 14, padding: '4rem', textAlign: 'center' }}>
            Loading schedules...
          </div>
        ) : schedules.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏰</div>
            <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 8 }}>No schedules yet</div>
            <div style={{ color: 'var(--text-2)', fontSize: 14 }}>
              {isFree
                ? <span>Upgrade to Starter ($19/mo) to start automating your agents. <Link href="/dashboard/upgrade" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'underline' }}>View plans</Link></span>
                : 'Create a schedule to run your agents automatically.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {schedules.map(schedule => (
              <div key={schedule.id}>

                <div style={{
                  background: 'var(--bg-2)', border: '1px solid var(--border)',
                  borderRadius: taskResults[schedule.id] ? '12px 12px 0 0' : 12,
                  padding: '18px 20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>
                          {schedule.name}
                        </span>
                        <span style={{
                          padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: schedule.is_active ? 'rgba(52,211,153,0.12)' : 'var(--bg-3)',
                          color: schedule.is_active ? 'var(--green)' : 'var(--text-3)',
                          border: `1px solid ${schedule.is_active ? 'var(--green)' : 'var(--border)'}`,
                        }}>
                          {schedule.is_active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-2)' }}>
                        <span>🕐 {cronToLabel(schedule.cron)}</span>
                        <span>🤖 {schedule.agent_name}</span>
                      </div>
                      {(schedule.last_run_at || schedule.last_run_status) && (
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
                          {schedule.last_run_at && (
                            <span>Last run: {formatRunTime(schedule.last_run_at)}</span>
                          )}
                          {schedule.last_run_status && (
                            <span style={{ textTransform: 'capitalize' }}>
                              Status: {schedule.last_run_status}
                            </span>
                          )}
                        </div>
                      )}
                      <div style={{
                        marginTop: 8, fontSize: 13, color: 'var(--text-3)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: 480,
                      }}>
                        &quot;{schedule.task_message}&quot;
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => handleRun(schedule.id)}
                        disabled={running.has(schedule.id)}
                        style={{
                          padding: '6px 14px', borderRadius: 8,
                          background: 'var(--bg-3)', border: '1px solid var(--border-2)',
                          color: running.has(schedule.id) ? 'var(--text-3)' : 'var(--text)',
                          fontSize: 13, fontWeight: 500,
                          cursor: running.has(schedule.id) ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {running.has(schedule.id) ? '⏳' : '▶ Run'}
                      </button>

                      <button
                        onClick={() => handleToggle(schedule)}
                        disabled={toggling.has(schedule.id)}
                        title={schedule.is_active ? 'Pause' : 'Resume'}
                        style={{
                          padding: '6px 10px', borderRadius: 8,
                          background: 'var(--bg-3)', border: '1px solid var(--border)',
                          color: toggling.has(schedule.id) ? 'var(--text-3)' : 'var(--text-2)',
                          fontSize: 13, cursor: toggling.has(schedule.id) ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {toggling.has(schedule.id) ? '·' : schedule.is_active ? '⏸' : '▶'}
                      </button>

                      <button
                        onClick={() => handleDelete(schedule.id)}
                        style={{
                          padding: '6px 10px', borderRadius: 8,
                          background: 'transparent', border: '1px solid var(--border)',
                          color: 'var(--text-3)', fontSize: 13, cursor: 'pointer',
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>

                {/* Task result panel */}
                {taskResults[schedule.id] && (() => {
                  const taskResult = taskResults[schedule.id]
                  const tone = getTaskTone(taskResult.status)

                  return (
                    <div style={{
                      padding: '14px 20px 16px',
                      borderRadius: '0 0 12px 12px',
                      background: tone.bg,
                      border: `1px solid ${tone.border}`,
                      borderTop: 'none',
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        marginBottom: taskResult.result ? 10 : 0,
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          color: tone.text,
                        }}>
                          <span>{tone.icon}</span>
                          <span>{tone.label}</span>
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                          polled every 2s
                        </span>
                      </div>

                      {taskResult.result && (
                        <div style={{
                          background: 'rgba(5,5,7,0.28)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          padding: '12px 14px',
                          color: taskResult.status === 'success' ? 'var(--text)' : tone.text,
                          fontSize: 13,
                          lineHeight: 1.7,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          maxHeight: 260,
                          overflowY: 'auto',
                        }}>
                          {taskResult.result}
                        </div>
                      )}
                    </div>
                  )
                })()}

              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500,
  color: 'var(--text-2)', marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  background: 'var(--bg-3)', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text)', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
}

function NavItem({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} style={{
      display: 'block', padding: '0.5rem 0.75rem', borderRadius: 7,
      fontSize: '0.875rem', fontWeight: active ? 600 : 400,
      background: active ? 'var(--accent-g)' : 'transparent',
      color: active ? 'var(--text)' : 'var(--text-2)',
      border: active ? '1px solid rgba(108,99,255,0.2)' : '1px solid transparent',
      marginBottom: '0.1rem', textDecoration: 'none',
    }}>
      {label}
    </Link>
  )
}
