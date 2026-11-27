import { db } from './supabase.js'

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, '')

export async function apiFetch(path, { method = 'GET', body } = {}) {
  const { data } = await db().auth.getSession()
  const token = data.session?.access_token || ''
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const parsed = text ? JSON.parse(text) : null
  if (!res.ok) {
    throw new Error(parsed?.error || `Error del servidor (${res.status})`)
  }
  return parsed
}
