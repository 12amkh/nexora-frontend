// lib/api.ts
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_URL,
})

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
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
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const getToken = () => localStorage.getItem('token')

export const getUser = () => {
  const u = localStorage.getItem('user')
  return u ? JSON.parse(u) : null
}

export const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.location.href = '/login'
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