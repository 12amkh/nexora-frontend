'use client'

import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppStateCard, StateActionButton } from '@/components/AppState'
import ConfirmDialog from '@/components/ConfirmDialog'
import { SettingsLoadingState } from '@/components/LoadingSkeleton'
import Sidebar from '@/components/Sidebar'
import { useToast } from '@/components/ToastProvider'
import UsageStats from '@/components/UsageStats'
import { useTheme } from '@/components/ThemeProvider'
import {
  api,
  formatPlanName,
  getErrorMessage,
  getUser,
  logout,
  normalizePlan,
  refreshCurrentUser,
  setStoredUser,
  type CurrentUser,
} from '@/lib/api'
import { THEME_FAMILIES, getThemeDefinition, type ThemeFamily, type ThemeMode } from '@/lib/themes'

const PLAN_COLORS: Record<string, string> = {
  free: '#8888a0',
  starter: '#34d399',
  pro: '#6c63ff',
  business: '#f59e0b',
  enterprise: '#ec4899',
}

interface Stats {
  user_id: number
  name: string
  email: string
  plan: string
  total_agents: number
  total_messages: number
  messages_sent: number
}

const THEME_MODE_OPTIONS: Array<{
  value: ThemeMode
  title: string
  description: string
  accent: string
}> = [
  {
    value: 'dark',
    title: 'Dark workspace',
    description: 'Reduce glare and keep focus during long sessions.',
    accent: 'linear-gradient(135deg, #151515 0%, #2f2a27 100%)',
  },
  {
    value: 'light',
    title: 'Light workspace',
    description: 'Use a brighter canvas for daytime work and reviews.',
    accent: 'linear-gradient(135deg, #f4efe5 0%, #d9d2c3 100%)',
  },
]

export default function SettingsPage() {
  const router = useRouter()
  const { themeMode, themeFamily, setTheme, setThemeFamily } = useTheme()
  const { pushToast, updateToast } = useToast()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsError, setStatsError] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [updatingProfile, setUpdatingProfile] = useState(false)
  const [savingTheme, setSavingTheme] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const init = async () => {
      if (!localStorage.getItem('token')) {
        router.push('/login')
        return
      }

      const cachedUser = getUser()
      if (cachedUser) {
        setUser(cachedUser)
        setNameInput(cachedUser.name ?? '')
      }

      try {
        const freshUser = await refreshCurrentUser()
        if (freshUser) {
          setUser(freshUser)
          setNameInput(freshUser.name ?? '')
        }
      } catch {
        // Keep cached data if refresh fails.
      } finally {
        setLoading(false)
      }

      void fetchStats()
    }

    void init()
  }, [router])

  useEffect(() => {
    if (!statusMessage) return

    const timeout = window.setTimeout(() => setStatusMessage(null), 3200)
    return () => window.clearTimeout(timeout)
  }, [statusMessage])

  const fetchStats = async () => {
    try {
      const response = await fetchStatsData()
      setStats(response)
      setStatsError('')
    } catch {
      setStatsError("We couldn't load your account activity summary.")
    }
  }

  const setFeedback = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text })
  }

  const handleUpdateProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = nameInput.trim()

    if (!trimmedName || trimmedName === user?.name) return

    setUpdatingProfile(true)
    setStatusMessage(null)
    const toastId = pushToast({
      title: 'Saving profile',
      description: 'Updating your account details.',
      tone: 'loading',
      dismissible: false,
    })

    try {
      const response = await fetchUpdateProfile(trimmedName)
      setStoredUser(response)
      setUser(response)
      setNameInput(response.name)
      setFeedback('success', 'Profile updated successfully.')
      updateToast(toastId, {
        title: 'Profile saved',
        description: 'Your display name was updated.',
        tone: 'success',
        dismissible: true,
      })
    } catch (error) {
      const message = getErrorMessage(error)
      setFeedback('error', message)
      updateToast(toastId, {
        title: "Couldn't save profile",
        description: message,
        tone: 'error',
        dismissible: true,
      })
    } finally {
      setUpdatingProfile(false)
    }
  }

  const handleThemeModeChange = async (nextThemeMode: ThemeMode) => {
    if (nextThemeMode === themeMode) return

    setSavingTheme(true)
    setStatusMessage(null)
    const toastId = pushToast({
      title: 'Updating theme mode',
      description: 'Saving your light or dark preference.',
      tone: 'loading',
      dismissible: false,
    })

    try {
      await setTheme(nextThemeMode)
      const updatedUser = user
        ? { ...user, theme: nextThemeMode, theme_family: themeFamily }
        : null
      if (updatedUser) {
        setStoredUser(updatedUser)
        setUser(updatedUser)
      }
      setFeedback('success', 'Theme mode updated successfully.')
      updateToast(toastId, {
        title: 'Theme mode saved',
        description: 'Your appearance preference is now synced.',
        tone: 'success',
        dismissible: true,
      })
    } catch (error) {
      const message = getErrorMessage(error)
      setFeedback('error', message)
      updateToast(toastId, {
        title: "Couldn't update theme mode",
        description: message,
        tone: 'error',
        dismissible: true,
      })
    } finally {
      setSavingTheme(false)
    }
  }

  const handleThemeFamilyChange = async (nextThemeFamily: ThemeFamily) => {
    if (nextThemeFamily === themeFamily) return

    setSavingTheme(true)
    setStatusMessage(null)
    const toastId = pushToast({
      title: 'Updating theme family',
      description: 'Applying your selected Nexora theme family.',
      tone: 'loading',
      dismissible: false,
    })

    try {
      await setThemeFamily(nextThemeFamily)
      const updatedUser = user
        ? { ...user, theme: themeMode, theme_family: nextThemeFamily }
        : null
      if (updatedUser) {
        setStoredUser(updatedUser)
        setUser(updatedUser)
      }
      setFeedback('success', 'Theme family updated successfully.')
      updateToast(toastId, {
        title: 'Theme family saved',
        description: 'Your theme palette was updated successfully.',
        tone: 'success',
        dismissible: true,
      })
    } catch (error) {
      const message = getErrorMessage(error)
      setFeedback('error', message)
      updateToast(toastId, {
        title: "Couldn't update theme family",
        description: message,
        tone: 'error',
        dismissible: true,
      })
    } finally {
      setSavingTheme(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deletingAccount) return
    const toastId = pushToast({
      title: 'Deleting account',
      description: 'Removing your profile, agents, schedules, and chat history.',
      tone: 'loading',
      dismissible: false,
    })
    setDeletingAccount(true)

    try {
      await fetchDeleteAccount()
      updateToast(toastId, {
        title: 'Account deleted',
        description: 'Your account was removed successfully.',
        tone: 'success',
        dismissible: true,
      })
      logout()
    } catch (error) {
      const message = getErrorMessage(error)
      setFeedback('error', message)
      updateToast(toastId, {
        title: "Couldn't delete account",
        description: message,
        tone: 'error',
        dismissible: true,
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setDeletingAccount(false)
      setShowDeleteAccountDialog(false)
    }
  }

  const plan = normalizePlan(user?.plan)
  const currentTheme = getThemeDefinition(themeFamily)
  const joinedLabel = formatJoinedDate(user?.created_at)
  const hasProfileChanges = nameInput.trim() !== '' && nameInput.trim() !== user?.name

  if (loading && !user) {
    return <SettingsLoadingState />
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <ConfirmDialog
        open={showDeleteAccountDialog}
        title='Delete your account?'
        description='This permanently removes your profile, agents, schedules, and chat history from Nexora.'
        warning='This action cannot be undone. You will be signed out immediately after the deletion completes.'
        confirmLabel='Delete account'
        cancelLabel='Keep account'
        destructive
        loading={deletingAccount}
        onConfirm={() => void handleDeleteAccount()}
        onCancel={() => {
          if (!deletingAccount) setShowDeleteAccountDialog(false)
        }}
      />
      <Sidebar />

      <main className='app-shell-main' style={pageStyle}>
        <section style={heroCardStyle}>
          <div style={heroContentStyle}>
            <div>
              <div style={eyebrowStyle}>Account Preferences</div>
              <h1 style={heroTitleStyle}>Settings</h1>
              <p style={heroDescriptionStyle}>
                Manage your profile, personalize the workspace, and keep your Nexora account tidy.
              </p>
            </div>

            <div style={heroMetaGridStyle}>
              <SummaryTile
                label='Current plan'
                value={formatPlanName(plan)}
                accent={PLAN_COLORS[plan] ?? PLAN_COLORS.free}
              />
              <SummaryTile
                label='Theme'
                value={`${currentTheme.name} ${themeMode === 'dark' ? 'Dark' : 'Light'}`}
                accent='var(--accent)'
              />
              <SummaryTile
                label='Member since'
                value={joinedLabel}
                accent='rgba(255,255,255,0.4)'
              />
            </div>
          </div>
        </section>

        {loading && (
          <div style={loadingBadgeStyle}>Refreshing your latest account preferences...</div>
        )}

        {statusMessage && (
          <div style={getNoticeStyle(statusMessage.type)}>
            {statusMessage.type === 'success' ? 'Saved' : 'Issue'}: {statusMessage.text}
          </div>
        )}

        <div style={contentGridStyle}>
          <div style={mainColumnStyle}>
            <SectionCard
              title='Profile basics'
              description='Keep your public account details up to date and make the workspace feel like yours.'
            >
              <form onSubmit={handleUpdateProfile} style={formStyle}>
                <div style={fieldGridStyle}>
                  <Field label='Display name' help='Shown across your workspace and account surfaces.'>
                    <input
                      type='text'
                      value={nameInput}
                      onChange={(event) => setNameInput(event.target.value)}
                      placeholder='Your name'
                      style={inputStyle}
                    />
                  </Field>

                  <Field label='Email address' help='Email changes are not available from settings yet.'>
                    <input
                      type='text'
                      value={user?.email ?? ''}
                      disabled
                      style={{ ...inputStyle, ...disabledInputStyle }}
                    />
                  </Field>
                </div>

                <div style={profileMetaRowStyle}>
                  <MetaPill label='Plan' value={formatPlanName(plan)} />
                  <MetaPill label='Workspace theme' value={currentTheme.name} />
                  <MetaPill label='Joined' value={joinedLabel} />
                </div>

                <div style={actionRowStyle}>
                  <button
                    type='submit'
                    disabled={updatingProfile || !hasProfileChanges}
                    style={getPrimaryButtonStyle(updatingProfile || !hasProfileChanges)}
                  >
                    {updatingProfile ? 'Saving profile...' : 'Save profile'}
                  </button>
                  <button
                    type='button'
                    onClick={() => setNameInput(user?.name ?? '')}
                    disabled={updatingProfile || nameInput === (user?.name ?? '')}
                    style={getSecondaryButtonStyle(updatingProfile || nameInput === (user?.name ?? ''))}
                  >
                    Reset
                  </button>
                </div>
              </form>
            </SectionCard>

            <SectionCard
              title='Appearance'
              description='Choose how Nexora should look and feel every time you open the app.'
            >
              <div style={subsectionStyle}>
                <div style={subsectionHeaderStyle}>
                  <div>
                    <div style={subsectionTitleStyle}>Light or dark mode</div>
                    <div style={subsectionDescriptionStyle}>
                      Your mode preference is saved immediately and synced to your account.
                    </div>
                  </div>
                  <span style={miniStatusStyle}>{savingTheme ? 'Saving...' : 'Synced'}</span>
                </div>

                <div style={modeGridStyle}>
                  {THEME_MODE_OPTIONS.map((option) => {
                    const active = themeMode === option.value
                    return (
                      <button
                        key={option.value}
                        type='button'
                        onClick={() => void handleThemeModeChange(option.value)}
                        disabled={savingTheme}
                        style={getModeCardStyle(active, savingTheme, option.accent)}
                      >
                        <div style={modePreviewStyle(option.accent)} />
                        <div>
                          <div style={optionTitleStyle}>{option.title}</div>
                          <div style={optionDescriptionStyle}>{option.description}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={subsectionStyle}>
                <div style={subsectionHeaderStyle}>
                  <div>
                    <div style={subsectionTitleStyle}>Theme family</div>
                    <div style={subsectionDescriptionStyle}>
                      Pick the color system that best matches your workflow and brand mood.
                    </div>
                  </div>
                  <span style={miniStatusStyle}>{currentTheme.name} active</span>
                </div>

                <div style={themeGridStyle}>
                  {THEME_FAMILIES.map((theme) => {
                    const active = theme.id === themeFamily
                    const preview = getThemeDefinition(theme.id)

                    return (
                      <button
                        key={theme.id}
                        type='button'
                        onClick={() => void handleThemeFamilyChange(theme.id)}
                        disabled={savingTheme}
                        style={getThemeCardStyle(active, savingTheme)}
                      >
                        <div style={themeCardHeaderStyle}>
                          <div>
                            <div style={optionTitleStyle}>{theme.name}</div>
                            <div style={optionDescriptionStyle}>{theme.description}</div>
                          </div>
                          <span style={active ? activeBadgeStyle : inactiveBadgeStyle}>
                            {active ? 'Selected' : 'Available'}
                          </span>
                        </div>

                        <div style={previewGridStyle}>
                          <ThemePreviewCard
                            label='Light'
                            bg={preview.light.bg}
                            surface={preview.light.surface}
                            accent={preview.light.accent}
                            text={preview.light.text}
                          />
                          <ThemePreviewCard
                            label='Dark'
                            bg={preview.dark.bg}
                            surface={preview.dark.surface}
                            accent={preview.dark.accent}
                            text={preview.dark.text}
                          />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title='Plan and activity'
              description='Track what you are using today and how your account is progressing over time.'
            >
              {statsError ? (
                <AppStateCard
                  eyebrow='Activity unavailable'
                  icon='📉'
                  title='Account activity could not be loaded'
                  description={`${statsError} Your saved settings are still available, and you can retry the summary whenever you want.`}
                  tone='error'
                  actions={<StateActionButton label='Retry activity' onClick={() => void fetchStats()} />}
                />
              ) : (
                <div style={statsGridStyle}>
                  <StatsPanel
                    title='Workspace activity'
                    description='A quick summary of what this account has created and used so far.'
                  >
                    <div style={miniStatsGridStyle}>
                      <StatBox label='Active agents' value={String(stats?.total_agents ?? '-')} />
                      <StatBox label='Total messages' value={String(stats?.total_messages ?? '-')} />
                      <StatBox label='Messages sent' value={String(stats?.messages_sent ?? '-')} />
                    </div>
                  </StatsPanel>

                  <StatsPanel
                    title='Subscription'
                    description='Your current plan determines limits, billing features, and access to upgrades.'
                  >
                    <div style={planPanelStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: PLAN_COLORS[plan] ?? PLAN_COLORS.free,
                            display: 'inline-block',
                          }}
                        />
                        <div>
                          <div style={planValueStyle}>{formatPlanName(plan)}</div>
                          <div style={planCaptionStyle}>
                            {plan === 'free'
                              ? 'Upgrade to unlock more agents, schedules, and higher usage limits.'
                              : 'Your plan is active and ready for more automation.'}
                          </div>
                        </div>
                      </div>

                      <Link href='/dashboard/upgrade' style={upgradeLinkStyle}>
                        Review plans
                      </Link>
                    </div>
                  </StatsPanel>
                </div>
              )}

              <div style={{ marginTop: 24 }}>
                <UsageStats />
              </div>
            </SectionCard>
          </div>

          <aside style={sideColumnStyle}>
            <SectionCard
              title='Account actions'
              description='Shortcuts for common account tasks and safe management actions.'
            >
              <div style={actionStackStyle}>
                <ActionCard
                  title='Sign out everywhere on this browser'
                  description='End your current session on this device and return to the login screen.'
                  actionLabel='Sign out'
                  onClick={logout}
                  tone='neutral'
                />

                <ActionCard
                  title='Delete account'
                  description='Permanently remove your profile, agents, schedules, and conversation history.'
                  actionLabel='Delete account'
                  onClick={() => setShowDeleteAccountDialog(true)}
                  tone='danger'
                />
              </div>
            </SectionCard>

            <SectionCard
              title='Current setup'
              description='A compact view of what this account is using right now.'
            >
              <div style={checklistStyle}>
                <ChecklistRow label='Display name' value={user?.name || 'Not set'} />
                <ChecklistRow label='Email' value={user?.email || 'Not set'} />
                <ChecklistRow label='Theme mode' value={themeMode === 'dark' ? 'Dark' : 'Light'} />
                <ChecklistRow label='Theme family' value={currentTheme.name} />
                <ChecklistRow label='Plan' value={formatPlanName(plan)} />
              </div>
            </SectionCard>
          </aside>
        </div>
      </main>
    </div>
  )
}

async function fetchStatsData(): Promise<Stats> {
  const response = await fetchJson<Stats>('/users/stats')
  return response
}

async function fetchUpdateProfile(name: string): Promise<CurrentUser> {
  const response = await fetchJson<CurrentUser>('/users/update', {
    method: 'PUT',
    body: { name },
  })
  return response
}

async function fetchDeleteAccount(): Promise<void> {
  await fetchJson('/users/delete', { method: 'DELETE' })
}

async function fetchJson<T>(url: string, options?: { method?: 'PUT' | 'DELETE'; body?: Record<string, unknown> }): Promise<T> {
  const response = options?.method === 'DELETE'
    ? await api.delete(url)
    : options?.method === 'PUT'
    ? await api.put(url, options.body)
    : await api.get(url)

  return response.data as T
}

function formatJoinedDate(value?: string) {
  if (!value) return 'Recently'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently'

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section style={sectionCardStyle}>
      <div style={{ marginBottom: 22 }}>
        <h2 style={sectionTitleStyle}>{title}</h2>
        <p style={sectionDescriptionStyle}>{description}</p>
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  help,
  children,
}: {
  label: string
  help: string
  children: ReactNode
}) {
  return (
    <label style={fieldStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
      <span style={fieldHelpStyle}>{help}</span>
    </label>
  )
}

function SummaryTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={summaryTileStyle}>
      <div style={{ ...summaryAccentStyle, background: accent }} />
      <div style={summaryLabelStyle}>{label}</div>
      <div style={summaryValueStyle}>{value}</div>
    </div>
  )
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={metaPillStyle}>
      <span style={metaPillLabelStyle}>{label}</span>
      <span style={metaPillValueStyle}>{value}</span>
    </div>
  )
}

function StatsPanel({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div style={statsPanelStyle}>
      <div style={{ marginBottom: 16 }}>
        <div style={subsectionTitleStyle}>{title}</div>
        <div style={subsectionDescriptionStyle}>{description}</div>
      </div>
      {children}
    </div>
  )
}

function ActionCard({
  title,
  description,
  actionLabel,
  onClick,
  tone,
}: {
  title: string
  description: string
  actionLabel: string
  onClick: () => void
  tone: 'neutral' | 'danger'
}) {
  const isDanger = tone === 'danger'

  return (
    <div style={isDanger ? dangerCardStyle : actionCardStyle}>
      <div>
        <div style={subsectionTitleStyle}>{title}</div>
        <div style={subsectionDescriptionStyle}>{description}</div>
      </div>
      <button type='button' onClick={onClick} style={isDanger ? dangerButtonStyle : neutralButtonStyle}>
        {actionLabel}
      </button>
    </div>
  )
}

function ChecklistRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={checklistRowStyle}>
      <span style={checklistLabelStyle}>{label}</span>
      <span style={checklistValueStyle}>{value}</span>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={statBoxStyle}>
      <div style={statLabelStyle}>{label}</div>
      <div style={statValueStyle}>{value}</div>
    </div>
  )
}

function ThemePreviewCard({
  label,
  bg,
  surface,
  accent,
  text,
}: {
  label: string
  bg: string
  surface: string
  accent: string
  text: string
}) {
  return (
    <div style={{ ...themePreviewCardStyle, background: bg, border: `1px solid ${surface}` }}>
      <div style={{ color: text, fontSize: 11, fontWeight: 700, marginBottom: 10 }}>{label}</div>
      <div style={themePreviewInnerGridStyle}>
        <div style={{ borderRadius: 10, background: surface, minHeight: 60, padding: 10 }}>
          <div style={{ width: 34, height: 6, borderRadius: 999, background: accent, marginBottom: 8 }} />
          <div style={{ width: '75%', height: 6, borderRadius: 999, background: `${text}22`, marginBottom: 6 }} />
          <div style={{ width: '55%', height: 6, borderRadius: 999, background: `${text}14` }} />
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ borderRadius: 10, minHeight: 26, background: accent }} />
          <div style={{ borderRadius: 10, minHeight: 26, background: `${text}12` }} />
        </div>
      </div>
    </div>
  )
}

function getNoticeStyle(type: 'success' | 'error'): CSSProperties {
  return {
    marginBottom: 24,
    padding: '14px 16px',
    borderRadius: 14,
    fontSize: 14,
    border: type === 'success' ? '1px solid rgba(52,211,153,0.28)' : '1px solid rgba(248,113,113,0.28)',
    background: type === 'success' ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
    color: type === 'success' ? 'var(--green)' : 'var(--red)',
  }
}

function getPrimaryButtonStyle(disabled: boolean): CSSProperties {
  return {
    padding: '11px 18px',
    borderRadius: 10,
    border: '1px solid transparent',
    background: disabled ? 'var(--bg-3)' : 'var(--accent)',
    color: disabled ? 'var(--text-3)' : '#fff',
    fontWeight: 700,
    fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer',
  }
}

function getSecondaryButtonStyle(disabled: boolean): CSSProperties {
  return {
    padding: '11px 18px',
    borderRadius: 10,
    border: '1px solid var(--border)',
    background: disabled ? 'var(--bg-3)' : 'transparent',
    color: disabled ? 'var(--text-3)' : 'var(--text)',
    fontWeight: 600,
    fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer',
  }
}

function getModeCardStyle(active: boolean, disabled: boolean, accent: string): CSSProperties {
  return {
    ...interactiveCardStyle,
    border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
    background: active ? 'var(--accent-g)' : 'var(--bg)',
    opacity: disabled ? 0.7 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: active ? '0 12px 30px rgba(0,0,0,0.18)' : 'none',
    ['--mode-accent' as string]: accent,
  }
}

function getThemeCardStyle(active: boolean, disabled: boolean): CSSProperties {
  return {
    ...interactiveCardStyle,
    border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
    background: active ? 'var(--accent-g)' : 'var(--bg)',
    opacity: disabled ? 0.7 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: active ? '0 16px 36px rgba(0,0,0,0.18)' : 'none',
  }
}

function modePreviewStyle(background: string): CSSProperties {
  return {
    height: 72,
    borderRadius: 14,
    background,
    border: '1px solid rgba(255,255,255,0.08)',
  }
}

const pageStyle: CSSProperties = {}

const heroCardStyle: CSSProperties = {
  background:
    'radial-gradient(circle at top left, rgba(217,121,85,0.18), transparent 32%), linear-gradient(180deg, var(--bg-2) 0%, rgba(255,255,255,0.02) 100%)',
  border: '1px solid var(--border)',
  borderRadius: 24,
  padding: 28,
  marginBottom: 24,
  boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
}

const heroContentStyle: CSSProperties = {
  display: 'grid',
  gap: 22,
}

const eyebrowStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--accent)',
  marginBottom: 10,
}

const heroTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 34,
  lineHeight: 1.05,
  fontWeight: 800,
  color: 'var(--text)',
  letterSpacing: '-0.04em',
}

const heroDescriptionStyle: CSSProperties = {
  margin: '10px 0 0',
  maxWidth: 620,
  color: 'var(--text-2)',
  fontSize: 15,
  lineHeight: 1.7,
}

const heroMetaGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 14,
}

const loadingBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  marginBottom: 20,
  padding: '10px 12px',
  borderRadius: 999,
  border: '1px solid var(--border)',
  background: 'var(--bg-2)',
  color: 'var(--text-2)',
  fontSize: 13,
}

const contentGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'var(--settings-content-columns)',
  gap: 24,
  alignItems: 'start',
}

const mainColumnStyle: CSSProperties = {
  display: 'grid',
  gap: 24,
}

const sideColumnStyle: CSSProperties = {
  display: 'grid',
  gap: 24,
  position: 'var(--settings-side-position)' as CSSProperties['position'],
  top: 24,
}

const sectionCardStyle: CSSProperties = {
  background: 'var(--bg-2)',
  border: '1px solid var(--border)',
  borderRadius: 22,
  padding: 24,
  boxShadow: '0 14px 40px rgba(0,0,0,0.12)',
}

const sectionTitleStyle: CSSProperties = {
  margin: '0 0 6px',
  fontSize: 21,
  fontWeight: 700,
  color: 'var(--text)',
  letterSpacing: '-0.03em',
}

const sectionDescriptionStyle: CSSProperties = {
  margin: 0,
  color: 'var(--text-2)',
  fontSize: 14,
  lineHeight: 1.6,
}

const formStyle: CSSProperties = {
  display: 'grid',
  gap: 18,
}

const fieldGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 16,
}

const fieldStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
}

const fieldLabelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--text)',
}

const fieldHelpStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--text-3)',
  lineHeight: 1.5,
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  background: 'var(--bg-3)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

const disabledInputStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.02)',
  color: 'var(--text-3)',
  cursor: 'not-allowed',
}

const profileMetaRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
}

const metaPillStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  borderRadius: 999,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
}

const metaPillLabelStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--text-3)',
}

const metaPillValueStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--text)',
}

const actionRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
}

const subsectionStyle: CSSProperties = {
  display: 'grid',
  gap: 16,
}

const subsectionHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'flex-start',
}

const subsectionTitleStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: 'var(--text)',
  marginBottom: 4,
}

const subsectionDescriptionStyle: CSSProperties = {
  fontSize: 13,
  color: 'var(--text-2)',
  lineHeight: 1.55,
}

const miniStatusStyle: CSSProperties = {
  padding: '6px 10px',
  borderRadius: 999,
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  color: 'var(--text-2)',
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: 'nowrap',
}

const modeGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 14,
}

const themeGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 16,
}

const interactiveCardStyle: CSSProperties = {
  textAlign: 'left',
  padding: 16,
  borderRadius: 18,
  display: 'grid',
  gap: 14,
}

const optionTitleStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: 'var(--text)',
  marginBottom: 4,
}

const optionDescriptionStyle: CSSProperties = {
  fontSize: 13,
  color: 'var(--text-2)',
  lineHeight: 1.55,
}

const themeCardHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'flex-start',
}

const activeBadgeStyle: CSSProperties = {
  padding: '5px 9px',
  borderRadius: 999,
  background: 'var(--accent)',
  color: '#fff',
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: 'nowrap',
}

const inactiveBadgeStyle: CSSProperties = {
  padding: '5px 9px',
  borderRadius: 999,
  background: 'var(--bg-3)',
  color: 'var(--text-3)',
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: 'nowrap',
}

const previewGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'var(--settings-theme-preview-columns)',
  gap: 10,
}

const statsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: 16,
}

const statsPanelStyle: CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 18,
  padding: 18,
}

const miniStatsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'var(--settings-mini-stats-columns)',
  gap: 12,
}

const planPanelStyle: CSSProperties = {
  display: 'grid',
  gap: 18,
}

const planValueStyle: CSSProperties = {
  color: 'var(--text)',
  fontSize: 20,
  fontWeight: 800,
  letterSpacing: '-0.03em',
}

const planCaptionStyle: CSSProperties = {
  marginTop: 6,
  color: 'var(--text-2)',
  fontSize: 13,
  lineHeight: 1.55,
}

const upgradeLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 'fit-content',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  color: 'var(--text)',
  textDecoration: 'none',
  fontWeight: 700,
  background: 'var(--bg-2)',
}

const actionStackStyle: CSSProperties = {
  display: 'grid',
  gap: 14,
}

const actionCardStyle: CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  padding: 16,
  display: 'grid',
  gap: 14,
}

const dangerCardStyle: CSSProperties = {
  ...actionCardStyle,
  border: '1px solid rgba(248,113,113,0.25)',
  background: 'rgba(248,113,113,0.04)',
}

const neutralButtonStyle: CSSProperties = {
  width: 'fit-content',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--text)',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
}

const dangerButtonStyle: CSSProperties = {
  ...neutralButtonStyle,
  border: '1px solid rgba(248,113,113,0.4)',
  color: 'var(--red)',
  background: 'rgba(248,113,113,0.08)',
}

const checklistStyle: CSSProperties = {
  display: 'grid',
  gap: 12,
}

const checklistRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 14,
  alignItems: 'center',
  paddingBottom: 12,
  borderBottom: '1px solid var(--border)',
}

const checklistLabelStyle: CSSProperties = {
  color: 'var(--text-2)',
  fontSize: 13,
}

const checklistValueStyle: CSSProperties = {
  color: 'var(--text)',
  fontSize: 13,
  fontWeight: 700,
  textAlign: 'right',
}

const summaryTileStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: 16,
}

const summaryAccentStyle: CSSProperties = {
  width: 34,
  height: 5,
  borderRadius: 999,
  marginBottom: 12,
}

const summaryLabelStyle: CSSProperties = {
  color: 'var(--text-3)',
  fontSize: 12,
  marginBottom: 6,
}

const summaryValueStyle: CSSProperties = {
  color: 'var(--text)',
  fontSize: 18,
  fontWeight: 700,
  letterSpacing: '-0.03em',
}

const statBoxStyle: CSSProperties = {
  background: 'var(--bg-2)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: 14,
}

const statLabelStyle: CSSProperties = {
  color: 'var(--text-3)',
  fontSize: 12,
  marginBottom: 6,
}

const statValueStyle: CSSProperties = {
  color: 'var(--text)',
  fontSize: 22,
  fontWeight: 800,
  letterSpacing: '-0.03em',
}

const themePreviewCardStyle: CSSProperties = {
  borderRadius: 12,
  padding: 10,
}

const themePreviewInnerGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.4fr 1fr',
  gap: 8,
}
