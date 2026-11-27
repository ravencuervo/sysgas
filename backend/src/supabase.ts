import { HttpError } from './types.js'

const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '')
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? ''

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SECRET_KEY en backend/.env')
  process.exit(1)
}

export interface SbOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  prefer?: string
}

export interface AuthProfile {
  id: string
  correo: string
  rol: 'super_admin' | 'empresa_admin' | 'chofer_repartidor' | 'planta_operador' | 'supervisor_calidad' | 'cliente_comun'
  activo: boolean
  empresa_id: string | null
}

export async function sb<T = unknown>(
  path: string,
  { method = 'GET', body, prefer = 'return=representation' }: SbOptions = {}
): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      'Content-Type': 'application/json',
      Prefer: prefer,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  const data = text ? (JSON.parse(text) as T & { message?: string; hint?: string }) : (null as T)
  if (!res.ok) {
    const errObj = data as unknown as { message?: string; hint?: string } | null
    throw new HttpError(res.status, errObj?.message || errObj?.hint || `Supabase HTTP ${res.status}`)
  }
  return data
}

export async function verifyUserToken(token: string): Promise<AuthProfile> {
  if (!token) {
    throw new HttpError(401, 'Sesión requerida. Inicia sesión para continuar.')
  }
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) {
    throw new HttpError(401, 'Tu sesión expiró o no es válida.')
  }
  const user = (await res.json()) as { id?: string }
  if (!user.id) {
    throw new HttpError(401, 'Usuario no identificado.')
  }
  const profiles = await sb<AuthProfile[]>(`perfiles?id=eq.${encodeURIComponent(user.id)}&select=id,correo,rol,activo,empresa_id&limit=1`)
  const profile = profiles[0]
  if (!profile || !profile.activo) {
    throw new HttpError(403, 'Tu cuenta no está activa en el sistema.')
  }
  return profile
}
