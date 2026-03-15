// lib/api.ts
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const USER_STORAGE_KEY = 'user'
const THEME_STORAGE_KEY = 'nexora_theme'

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
  return u ? JSON.parse(u) : null
}

export const refreshCurrentUser = async () => {
  if (typeof window === 'undefined') return null

  const token = localStorage.getItem('token')
  if (!token) return getUser()

  const { data } = await api.get('/users/me', {
    headers: { Authorization: `Bearer ${token}` },
  })

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data))
  if (data?.theme) {
    localStorage.setItem(THEME_STORAGE_KEY, data.theme)
  }
  return data
}

export const logout = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem('token')
  localStorage.removeItem(USER_STORAGE_KEY)
  window.location.href = '/login'
}

export const getStoredTheme = () => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(THEME_STORAGE_KEY)
}

export const setStoredTheme = (theme: 'dark' | 'light') => {
  if (typeof window === 'undefined') return
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

export const setStoredUser = (user: Record<string, unknown>) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  const theme = user?.theme
  if (typeof theme === 'string') {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }
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
