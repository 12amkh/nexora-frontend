'use client'

// app/schedules/page.tsx
// Stage 15: Schedules page — list, create, pause/resume, manual trigger with live polling

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, getUser, getErrorMessage, normalizePlan, refreshCurrentUser } from '@/lib/api'
import ConfirmDialog from '@/components/ConfirmDialog'
import RichContent from '@/components/RichContent'
import Sidebar from '@/components/Sidebar'
import { useToast } from '@/components/ToastProvider'

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

const formatPromptPreview = (value: string, maxLength = 140) => {
  const compact = value.replace(/\s+/g, ' ').trim()
  if (compact.length <= maxLength) return compact
  return `${compact.slice(0, maxLength - 1).trimEnd()}…`
}

const formatRelativeTime = (isoDate?: string | null) => {
  if (!isoDate) return null

  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return null

  const diffMs = date.getTime() - Date.now()
  const absMinutes = Math.round(Math.abs(diffMs) / 60000)

  if (absMinutes < 1) return diffMs >= 0 ? 'in less than a minute' : 'less than a minute ago'
  if (absMinutes < 60) return diffMs >= 0 ? `in ${absMinutes}m` : `${absMinutes}m ago`

  const absHours = Math.round(absMinutes / 60)
  if (absHours < 24) return diffMs >= 0 ? `in ${absHours}h` : `${absHours}h ago`

  const absDays = Math.round(absHours / 24)
  return diffMs >= 0 ? `in ${absDays}d` : `${absDays}d ago`
}

const getNextRunTime = (cron: string, isActive: boolean): string | null => {
  if (!isActive) return null

  const parts = cron.split(' ')
  if (parts.length !== 5) return null

  const [, hourValue, dayOfMonth, , dayOfWeek] = parts
  const hour = Number(hourValue)
  if (Number.isNaN(hour)) return null

  const now = new Date()
  const next = new Date(now)
  next.setSeconds(0, 0)

  if (cron === '0 * * * *') {
    next.setMinutes(0)
    next.setHours(now.getHours() + 1)
    return next.toISOString()
  }

  next.setMinutes(0)
  next.setHours(hour, 0, 0, 0)

  if (dayOfMonth === '1' && dayOfWeek === '*') {
    if (next <= now || next.getDate() !== 1) {
      next.setMonth(next.getMonth() + 1, 1)
      next.setHours(hour, 0, 0, 0)
    } else {
      next.setDate(1)
    }
    return next.toISOString()
  }

  if (dayOfWeek !== '*') {
    const targetDay = Number(dayOfWeek)
    if (Number.isNaN(targetDay)) return null
    const currentDay = now.getDay()
    let diff = targetDay - currentDay
    if (diff < 0 || (diff === 0 && next <= now)) diff += 7
    next.setDate(now.getDate() + diff)
    next.setHours(hour, 0, 0, 0)
    return next.toISOString()
  }

  if (next <= now) {
    next.setDate(next.getDate() + 1)
  }

  return next.toISOString()
}

const getScheduleStatusMeta = (
  schedule: Schedule,
  taskResult?: TaskResult,
  isRunning?: boolean
) => {
  if (isRunning || taskResult?.status === 'pending' || taskResult?.status === 'started' || taskResult?.status === 'retry') {
    return {
      label: taskResult?.status === 'retry' ? 'Retrying run' : 'Run in progress',
      color: 'var(--accent)',
      background: 'rgba(217,121,85,0.12)',
      border: 'rgba(217,121,85,0.28)',
    }
  }

  if (!schedule.is_active) {
    return {
      label: 'Paused',
      color: 'var(--text-2)',
      background: 'var(--bg-3)',
      border: 'var(--border)',
    }
  }

  if (schedule.last_run_status?.toLowerCase() === 'failed' || taskResult?.status === 'failure') {
    return {
      label: 'Needs attention',
      color: 'var(--red)',
      background: 'rgba(248,113,113,0.12)',
      border: 'rgba(248,113,113,0.3)',
    }
  }

  if (schedule.last_run_status?.toLowerCase() === 'success' || taskResult?.status === 'success') {
    return {
      label: 'Healthy',
      color: 'var(--green)',
      background: 'rgba(52,211,153,0.12)',
      border: 'rgba(52,211,153,0.3)',
    }
  }

  return {
    label: 'Scheduled',
    color: 'var(--text-2)',
    background: 'var(--bg-3)',
    border: 'var(--border)',
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SchedulesPage() {
  const router = useRouter()
  const { pushToast, updateToast } = useToast()
  const pollIntervals = useRef<Record<number, ReturnType<typeof setInterval>>>({})
  const restoredTasks = useRef(false)

  const [schedules, setSchedules]   = useState<Schedule[]>([])
  const [agents, setAgents]         = useState<Agent[]>([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [schedulePendingDelete, setSchedulePendingDelete] = useState<Schedule | null>(null)
  const [deletingScheduleId, setDeletingScheduleId] = useState<number | null>(null)
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
    const toastId = pushToast({
      title: 'Creating schedule',
      description: 'Saving your automation and preparing it to run.',
      tone: 'loading',
      dismissible: false,
    })
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
      updateToast(toastId, {
        title: 'Schedule created',
        description: 'Your new automation is ready.',
        tone: 'success',
      })
    } catch (err) {
      setError(getErrorMessage(err))
      updateToast(toastId, {
        title: 'Could not create schedule',
        description: getErrorMessage(err),
        tone: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Pause / Resume ─────────────────────────────────────────────────────────
  const handleToggle = async (schedule: Schedule) => {
    setToggling(prev => new Set(prev).add(schedule.id))
    const nextStateLabel = schedule.is_active ? 'Pausing schedule' : 'Resuming schedule'
    const toastId = pushToast({
      title: nextStateLabel,
      description: `${schedule.name} is being updated.`,
      tone: 'loading',
      dismissible: false,
    })
    try {
      await api.put(`/schedules/${schedule.id}`, { is_active: !schedule.is_active })
      setSchedules(prev =>
        prev.map(s => s.id === schedule.id ? { ...s, is_active: !s.is_active } : s)
      )
      updateToast(toastId, {
        title: schedule.is_active ? 'Schedule paused' : 'Schedule resumed',
        description: `${schedule.name} was updated successfully.`,
        tone: 'success',
      })
    } catch (err) {
      setError(getErrorMessage(err))
      updateToast(toastId, {
        title: 'Schedule update failed',
        description: getErrorMessage(err),
        tone: 'error',
      })
    } finally {
      setToggling(prev => { const n = new Set(prev); n.delete(schedule.id); return n })
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!schedulePendingDelete) return

    setDeletingScheduleId(schedulePendingDelete.id)
    const toastId = pushToast({
      title: 'Deleting schedule',
      description: `${schedulePendingDelete.name} is being removed.`,
      tone: 'loading',
      dismissible: false,
    })
    try {
      await api.delete(`/schedules/${schedulePendingDelete.id}`)
      if (pollIntervals.current[schedulePendingDelete.id]) {
        clearInterval(pollIntervals.current[schedulePendingDelete.id])
        delete pollIntervals.current[schedulePendingDelete.id]
      }
      forgetTask(schedulePendingDelete.id)
      forgetResult(schedulePendingDelete.id)
      setSchedules(prev => prev.filter(s => s.id !== schedulePendingDelete.id))
      setRunning(prev => { const n = new Set(prev); n.delete(schedulePendingDelete.id); return n })
      setTaskResults(prev => {
        const next = { ...prev }
        delete next[schedulePendingDelete.id]
        return next
      })
      updateToast(toastId, {
        title: 'Schedule deleted',
        description: `${schedulePendingDelete.name} was removed.`,
        tone: 'success',
      })
      setSchedulePendingDelete(null)
    } catch (err) {
      setError(getErrorMessage(err))
      updateToast(toastId, {
        title: 'Could not delete schedule',
        description: getErrorMessage(err),
        tone: 'error',
      })
    } finally {
      setDeletingScheduleId(null)
    }
  }

  // ── Manual trigger + polling ───────────────────────────────────────────────
  const handleRun = async (scheduleId: number) => {
    setRunning(prev => new Set(prev).add(scheduleId))
    setTaskResults(prev => ({ ...prev, [scheduleId]: { scheduleId, status: 'pending', result: 'Queued. Checking task status...' } }))
    const scheduleName = schedules.find((schedule) => schedule.id === scheduleId)?.name ?? 'Schedule'
    const toastId = pushToast({
      title: 'Starting schedule run',
      description: `${scheduleName} is being queued now.`,
      tone: 'loading',
      dismissible: false,
    })
    try {
      const { data } = await api.post(`/schedules/${scheduleId}/run`)
      rememberTask(scheduleId, data.task_id)
      updateToast(toastId, {
        title: 'Schedule queued',
        description: `${scheduleName} is now waiting to run.`,
        tone: 'success',
      })
      pollTask(scheduleId, data.task_id)
    } catch (err) {
      forgetTask(scheduleId)
      setRunning(prev => { const n = new Set(prev); n.delete(scheduleId); return n })
      setTaskResults(prev => ({
        ...prev,
        [scheduleId]: { scheduleId, status: 'failure', result: getErrorMessage(err) },
      }))
      updateToast(toastId, {
        title: 'Could not start schedule',
        description: getErrorMessage(err),
        tone: 'error',
      })
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
  const activeCount = schedules.filter(schedule => schedule.is_active).length
  const runningCount = running.size
  const lastCompletedRun = schedules
    .filter(schedule => Boolean(schedule.last_run_at))
    .sort((a, b) => new Date(b.last_run_at ?? 0).getTime() - new Date(a.last_run_at ?? 0).getTime())[0]

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <ConfirmDialog
        open={!!schedulePendingDelete}
        title={schedulePendingDelete ? `Delete ${schedulePendingDelete.name}?` : 'Delete schedule?'}
        description='This permanently removes the schedule and clears any queued run state for it.'
        warning='This action cannot be undone. Existing schedule history shown on this page will be removed from the current view.'
        confirmLabel='Delete schedule'
        cancelLabel='Keep schedule'
        destructive
        loading={schedulePendingDelete ? deletingScheduleId === schedulePendingDelete.id : false}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!deletingScheduleId) {
            setSchedulePendingDelete(null)
          }
        }}
      />
      <Sidebar />

      {/* ── Main ── */}
      <main className='app-shell-main app-shell-main--narrow' style={{}}>

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

        {!loading && schedules.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 20,
          }}>
            {[
              { label: 'Active schedules', value: String(activeCount), note: `${schedules.length - activeCount} paused` },
              { label: 'Currently running', value: String(runningCount), note: runningCount > 0 ? 'Live task polling enabled' : 'No active manual runs' },
              {
                label: 'Most recent run',
                value: lastCompletedRun?.last_run_at ? formatRunTime(lastCompletedRun.last_run_at) ?? 'No runs yet' : 'No runs yet',
                note: lastCompletedRun?.name ? lastCompletedRun.name : 'Your schedules will show run history here',
              },
            ].map((item) => (
              <div key={item.label} style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '16px 18px',
              }}>
                <div style={{ color: 'var(--text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  {item.label}
                </div>
                <div style={{ color: 'var(--text)', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                  {item.value}
                </div>
                <div style={{ color: 'var(--text-2)', fontSize: 12, lineHeight: 1.5 }}>
                  {item.note}
                </div>
              </div>
            ))}
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
                {(() => {
                  const taskResult = taskResults[schedule.id]
                  const nextRunIso = getNextRunTime(schedule.cron, schedule.is_active)
                  const statusMeta = getScheduleStatusMeta(schedule, taskResult, running.has(schedule.id))
                  const lastRunLabel = formatRunTime(schedule.last_run_at)
                  const nextRunLabel = formatRunTime(nextRunIso)
                  const nextRunRelative = formatRelativeTime(nextRunIso)
                  const lastRunRelative = formatRelativeTime(schedule.last_run_at)

                  return (
                    <div style={{
                      background: 'var(--bg-2)', border: '1px solid var(--border)',
                      borderRadius: taskResults[schedule.id] ? '12px 12px 0 0' : 12,
                      padding: '18px 20px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                              {schedule.name}
                            </span>
                            <span style={{
                              padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                              background: statusMeta.background,
                              color: statusMeta.color,
                              border: `1px solid ${statusMeta.border}`,
                            }}>
                              {statusMeta.label}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-2)', flexWrap: 'wrap', marginBottom: 10 }}>
                            <span>🤖 {schedule.agent_name}</span>
                            <span>🕐 {cronToLabel(schedule.cron)}</span>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-3)' }}>
                              {schedule.cron}
                            </span>
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: 10,
                            marginBottom: 12,
                          }}>
                            <div style={metaCardStyle}>
                              <div style={metaLabelStyle}>Last run</div>
                              <div style={metaValueStyle}>{lastRunLabel ?? 'Not run yet'}</div>
                              <div style={metaHintStyle}>
                                {lastRunRelative ?? 'This schedule has not run yet.'}
                              </div>
                            </div>
                            <div style={metaCardStyle}>
                              <div style={metaLabelStyle}>Next run</div>
                              <div style={metaValueStyle}>{nextRunLabel ?? 'Paused until resumed'}</div>
                              <div style={metaHintStyle}>
                                {nextRunRelative ?? (schedule.is_active ? 'Waiting for the next matching time.' : 'Resume this schedule to queue future runs.')}
                              </div>
                            </div>
                            <div style={metaCardStyle}>
                              <div style={metaLabelStyle}>Current status</div>
                              <div style={metaValueStyle}>
                                {schedule.last_run_status
                                  ? schedule.last_run_status.charAt(0).toUpperCase() + schedule.last_run_status.slice(1)
                                  : schedule.is_active ? 'Ready to run' : 'Paused'}
                              </div>
                              <div style={metaHintStyle}>
                                {schedule.is_active ? 'This automation is enabled and can run on schedule.' : 'This automation is currently inactive.'}
                              </div>
                            </div>
                          </div>

                          <div style={{
                            background: 'var(--bg-3)',
                            border: '1px solid var(--border)',
                            borderRadius: 10,
                            padding: '12px 14px',
                          }}>
                            <div style={{ ...metaLabelStyle, marginBottom: 6 }}>What this schedule does</div>
                            <div style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.7 }}>
                              {formatPromptPreview(schedule.task_message, 220)}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignSelf: 'flex-start' }}>
                          <button
                            onClick={() => handleRun(schedule.id)}
                            disabled={running.has(schedule.id)}
                            style={{
                              padding: '6px 14px', borderRadius: 8,
                              background: 'var(--bg-3)', border: '1px solid var(--border-2)',
                              color: running.has(schedule.id) ? 'var(--text-3)' : 'var(--text)',
                              fontSize: 13, fontWeight: 600,
                              cursor: running.has(schedule.id) ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {running.has(schedule.id) ? '⏳ Running' : '▶ Run now'}
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
                            onClick={() => setSchedulePendingDelete(schedule)}
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
                  )
                })()}

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
                          wordBreak: 'break-word',
                          maxHeight: 260,
                          overflowY: 'auto',
                        }}>
                          <RichContent content={taskResult.result} />
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

const metaCardStyle: React.CSSProperties = {
  background: 'var(--bg-3)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '12px 14px',
}

const metaLabelStyle: React.CSSProperties = {
  color: 'var(--text-3)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

const metaValueStyle: React.CSSProperties = {
  color: 'var(--text)',
  fontSize: 14,
  fontWeight: 600,
  marginTop: 6,
}

const metaHintStyle: React.CSSProperties = {
  color: 'var(--text-2)',
  fontSize: 12,
  lineHeight: 1.5,
  marginTop: 4,
}
