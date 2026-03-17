// lib/api.ts
import axios from 'axios'
import {
  DEFAULT_THEME_FAMILY,
  DEFAULT_THEME_MODE,
  normalizeThemeFamily,
  normalizeThemeMode,
  type ThemeFamily,
  type ThemeMode,
} from '@/lib/themes'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const USER_STORAGE_KEY = 'user'
const THEME_MODE_STORAGE_KEY = 'nexora_theme_mode'
const THEME_FAMILY_STORAGE_KEY = 'nexora_theme_family'

export interface CurrentUser {
  id: number
  name: string
  email: string
  plan: string
  is_admin: boolean
  theme: ThemeMode
  theme_family: ThemeFamily
  created_at: string
}

const normalizeCurrentUser = (value: unknown): CurrentUser | null => {
  if (!value || typeof value !== 'object') return null

  const candidate = value as Record<string, unknown>
  const id = typeof candidate.id === 'number' ? candidate.id : Number(candidate.id)

  if (!Number.isFinite(id) || typeof candidate.email !== 'string') {
    return null
  }

  return {
    id,
    name: typeof candidate.name === 'string' ? candidate.name : '',
    email: candidate.email,
    plan: typeof candidate.plan === 'string' ? candidate.plan : 'free',
    is_admin: candidate.is_admin === true,
    theme: normalizeThemeMode(candidate.theme ?? DEFAULT_THEME_MODE),
    theme_family: normalizeThemeFamily(candidate.theme_family ?? DEFAULT_THEME_FAMILY),
    created_at: typeof candidate.created_at === 'string' ? candidate.created_at : '',
  }
}

export const api = axios.create({
  baseURL: API_URL,
})

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') {
    return config
  }

  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window !== 'undefined' && err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem(USER_STORAGE_KEY)
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const getToken = () => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

export const getUser = () => {
  if (typeof window === 'undefined') return null
  const u = localStorage.getItem(USER_STORAGE_KEY)
  if (!u) return null

  try {
    return normalizeCurrentUser(JSON.parse(u))
  } catch {
    return null
  }
}

export const refreshCurrentUser = async (): Promise<CurrentUser | null> => {
  if (typeof window === 'undefined') return null

  const token = localStorage.getItem('token')
  if (!token) return getUser()

  const { data } = await api.get<CurrentUser>('/users/me', {
    headers: { Authorization: `Bearer ${token}` },
  })

  const normalizedUser = normalizeCurrentUser(data)
  if (!normalizedUser) {
    return getUser()
  }

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser))
  setStoredThemePreferences({
    theme: normalizedUser.theme,
    theme_family: normalizedUser.theme_family,
  })
  return normalizedUser
}

export const logout = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem('token')
  localStorage.removeItem(USER_STORAGE_KEY)
  window.location.href = '/login'
}

export const getStoredTheme = () => {
  if (typeof window === 'undefined') return null
  return normalizeThemeMode(localStorage.getItem(THEME_MODE_STORAGE_KEY))
}

export const setStoredTheme = (theme: ThemeMode) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(THEME_MODE_STORAGE_KEY, normalizeThemeMode(theme))
}

export const getStoredThemeFamily = () => {
  if (typeof window === 'undefined') return null
  return normalizeThemeFamily(localStorage.getItem(THEME_FAMILY_STORAGE_KEY))
}

export const setStoredThemeFamily = (themeFamily: ThemeFamily) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(THEME_FAMILY_STORAGE_KEY, normalizeThemeFamily(themeFamily))
}

export const setStoredThemePreferences = (preferences: {
  theme?: unknown
  theme_family?: unknown
}) => {
  if (typeof window === 'undefined') return
  setStoredTheme(normalizeThemeMode(preferences.theme ?? DEFAULT_THEME_MODE))
  setStoredThemeFamily(normalizeThemeFamily(preferences.theme_family ?? DEFAULT_THEME_FAMILY))
}

export const setStoredUser = (user: CurrentUser | Record<string, unknown>) => {
  if (typeof window === 'undefined') return
  const normalizedUser = normalizeCurrentUser(user)
  if (!normalizedUser) return

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser))
  setStoredThemePreferences({
    theme: normalizedUser.theme,
    theme_family: normalizedUser.theme_family,
  })
}

export const normalizePlan = (plan: unknown) => {
  if (typeof plan !== 'string') return 'free'

  const normalized = plan.trim().toLowerCase()
  return ['free', 'starter', 'pro', 'business', 'enterprise'].includes(normalized)
    ? normalized
    : 'free'
}

export const formatPlanName = (plan: unknown) => {
  const normalized = normalizePlan(plan)
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

// ─── Error message extractor ──────────────────────────────────────────────────
// Axios wraps backend errors inside err.response.data
// FastAPI validation errors (422) come as:
//   { detail: [{ type, loc, msg, input }] }  ← array of objects, NOT a string
// FastAPI business logic errors (400/403/404) come as:
//   { detail: "some message" }               ← plain string
// This function handles all three cases so every catch block stays one line

export const getErrorMessage = (err: unknown): string => {
  // Cast to the shape Axios errors have
  const axiosErr = err as { response?: { data?: { detail?: unknown } } }
  const detail = axiosErr?.response?.data?.detail

  // 422 validation errors — array of objects, each has a .msg field
  if (Array.isArray(detail)) {
    return detail.map((d: { msg: string }) => d.msg).join(', ')
  }

  // 400 / 403 / 404 — plain string detail
  if (typeof detail === 'string') {
    return detail
  }

  // Network error or unexpected shape — fall back to the JS Error message
  if (err instanceof Error) {
    return err.message
  }

  return 'Something went wrong'
}
