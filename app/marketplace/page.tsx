'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Sidebar from '@/components/Sidebar'
import { AppStateCard, StateActionButton } from '@/components/AppState'
import { api, getErrorMessage, getUser } from '@/lib/api'
import { useToast } from '@/components/ToastProvider'

interface MarketplaceItem {
  id: number
  title: string
  description: string
  agent_type: string
  owner_name: string
  config: {
    tone?: string
    response_length?: string
    use_web_search?: boolean
    report_mode?: boolean
  }
}

export default function MarketplacePage() {
  const router = useRouter()
  const { pushToast, updateToast } = useToast()
  const [items, setItems] = useState<MarketplaceItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [importingItemId, setImportingItemId] = useState<number | null>(null)

  const loadMarketplace = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const { data } = await api.get(`/marketplace/items${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`)
      setItems(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      setItems([])
      setError(getErrorMessage(err) || "We couldn't load the marketplace right now.")
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    if (!getUser()) {
      router.push('/login')
      return
    }
    void loadMarketplace()
  }, [loadMarketplace, router])

  const visibleSummary = useMemo(() => {
    if (!items.length) {
      return 'No public templates yet. Publish one of your agents to seed the marketplace.'
    }
    return `${items.length} public ${items.length === 1 ? 'template is' : 'templates are'} available to import right now.`
  }, [items])

  const handleImport = async (item: MarketplaceItem) => {
    if (importingItemId) return

    const toastId = pushToast({
      title: `Importing ${item.title}`,
      description: 'Creating a copy of this marketplace template in your workspace.',
      tone: 'loading',
      dismissible: false,
    })
    setImportingItemId(item.id)

    try {
      const { data } = await api.post(`/marketplace/items/${item.id}/import`)
      updateToast(toastId, {
        title: `${item.title} imported`,
        description: 'The template is now available in your agents.',
        tone: 'success',
        dismissible: true,
      })
      router.push(`/agents/${data.agent.id}`)
    } catch (err: unknown) {
      updateToast(toastId, {
        title: "Couldn't import template",
        description: getErrorMessage(err),
        tone: 'error',
        dismissible: true,
      })
    } finally {
      setImportingItemId(null)
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
                Agent Marketplace
              </h1>
              <p style={{ color: 'var(--text-2)', margin: 0, fontSize: 16 }}>
                Browse public Nexora agent templates, import a copy, or publish one of your own.
              </p>
            </div>
            <div className="dashboard-header-actions">
              <Link
                href="/agents/new"
                style={{
                  padding: '10px 16px',
                  borderRadius: 12,
                  background: 'var(--accent)',
                  color: '#fff',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                New agent
              </Link>
            </div>
          </div>

          <section style={{ marginBottom: 24 }}>
            <div
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 18,
                padding: 18,
                display: 'grid',
                gap: 14,
              }}
            >
              <div style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.7 }}>
                {visibleSummary}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder='Search by title, description, or type'
                  style={{
                    flex: '1 1 260px',
                    minWidth: 0,
                    background: 'var(--bg-3)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    color: 'var(--text)',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => void loadMarketplace()}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-3)',
                    color: 'var(--text)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Search
                </button>
              </div>
            </div>
          </section>

          {loading ? (
            <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading marketplace...</div>
          ) : error ? (
            <AppStateCard
              eyebrow='Marketplace unavailable'
              icon='🛍️'
              title='Marketplace items could not be loaded'
              description={error}
              tone='error'
              actions={<StateActionButton label='Retry marketplace' onClick={() => void loadMarketplace()} />}
            />
          ) : items.length === 0 ? (
            <AppStateCard
              eyebrow='No public templates'
              icon='📦'
              title='Nothing has been published yet'
              description='Publish one of your agents from the edit page to make it available here for others to import.'
              tone='neutral'
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {items.map(item => (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 18,
                    padding: 18,
                    display: 'grid',
                    gap: 14,
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--text)', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
                      {item.title}
                    </div>
                    <div style={{ color: 'var(--text-3)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                      {item.agent_type.replace(/_/g, ' ')} · by {item.owner_name}
                    </div>
                    <div style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.7 }}>
                      {item.description}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                    {[
                      { label: 'Tone', value: item.config?.tone || 'professional' },
                      { label: 'Reply style', value: item.config?.response_length || 'medium' },
                      { label: 'Web research', value: item.config?.use_web_search ? 'Enabled' : 'Off' },
                      { label: 'Report mode', value: item.config?.report_mode ? 'On' : 'Off' },
                    ].map(detail => (
                      <div
                        key={detail.label}
                        style={{
                          padding: '11px 12px',
                          borderRadius: 12,
                          border: '1px solid var(--border)',
                          background: 'var(--bg-3)',
                        }}
                      >
                        <div style={{ color: 'var(--text-3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                          {detail.label}
                        </div>
                        <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>
                          {detail.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => void handleImport(item)}
                    disabled={importingItemId === item.id}
                    style={{
                      padding: '11px 16px',
                      borderRadius: 12,
                      border: 'none',
                      background: 'var(--accent)',
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: importingItemId === item.id ? 'not-allowed' : 'pointer',
                      opacity: importingItemId === item.id ? 0.85 : 1,
                    }}
                  >
                    {importingItemId === item.id ? 'Importing...' : 'Import template'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
