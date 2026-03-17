'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

import { api, getErrorMessage } from '@/lib/api'
import { AppStateCard, StateActionButton } from '@/components/AppState'
import RichContent from '@/components/RichContent'

interface SharedReport {
  id: number
  agent_id: number
  title: string
  content: string
  share_id: string
  created_at: string
}

export default function SharedReportPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = use(params)
  const [report, setReport] = useState<SharedReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadReport = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const { data } = await api.get(`/agents/reports/share/${shareId}`)
      setReport(data)
    } catch (err: unknown) {
      setReport(null)
      setError(getErrorMessage(err) || 'This shared report could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [shareId])

  useEffect(() => {
    void loadReport()
  }, [loadReport])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '48px 20px' }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 24, padding: 28 }}>
            <div style={{ height: 18, width: 140, borderRadius: 999, background: 'var(--bg-3)', marginBottom: 18 }} />
            <div style={{ height: 38, width: '70%', borderRadius: 14, background: 'var(--bg-3)', marginBottom: 12 }} />
            <div style={{ height: 14, width: 180, borderRadius: 999, background: 'var(--bg-3)', marginBottom: 24 }} />
            <div style={{ display: 'grid', gap: 12 }}>
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} style={{ height: 16, width: `${92 - index * 7}%`, borderRadius: 999, background: 'var(--bg-3)' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: 'min(720px, 100%)' }}>
          <AppStateCard
            eyebrow='Shared report'
            icon='🗂️'
            title='This report is unavailable'
            description={error || 'This shared report could not be found.'}
            tone='error'
            actions={<StateActionButton label='Retry' onClick={() => void loadReport()} />}
          />
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '48px 20px' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
          <Link
            href='/'
            style={{
              color: 'var(--text)',
              fontWeight: 800,
              fontSize: '1.6rem',
              letterSpacing: '-0.03em',
              textDecoration: 'none',
            }}
          >
            Nexora
          </Link>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 999,
              background: 'var(--accent-g)',
              color: 'var(--accent)',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Shared Report
          </div>
        </div>

        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 24, padding: 28 }}>
          <div style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 10 }}>
            Generated {new Date(report.created_at).toLocaleString()}
          </div>
          <h1 style={{ color: 'var(--text)', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 22 }}>
            {report.title}
          </h1>
          <div style={{ color: 'var(--text-2)', fontSize: 15, lineHeight: 1.85 }}>
            <RichContent content={report.content} />
          </div>
        </div>
      </div>
    </div>
  )
}
