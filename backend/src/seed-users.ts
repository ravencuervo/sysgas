import { sb } from './supabase.js'

const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '')
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? ''
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? ''

interface SeedUser {
  email: string
  password: string
  nombres: string
  apellidos: string
  rol: 'super_admin' | 'empresa_admin' | 'chofer_repartidor'
}

const TEST_USERS: SeedUser[] = [
  {
    email: 'admin@sysgas.pe',
    password: 'SysgasAdmin2026!',
    nombres: 'Administrador',
    apellidos: 'SYSGAS',
    rol: 'super_admin',
  },
  {
    email: 'empresa@sysgas.pe',
    password: 'SysgasEmpresa2026!',
    nombres: 'Distribuidora',
    apellidos: 'Gas del Lago',
    rol: 'empresa_admin',
  },
  {
    email: 'repartidor@sysgas.pe',
    password: 'SysgasReparto2026!',
    nombres: 'Miguel Ángel',
    apellidos: 'Ticona',
    rol: 'chofer_repartidor',
  },
]

async function adminAuth(path: string, method: string, body?: unknown) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = (await res.json()) as Record<string, unknown>
  return { ok: res.ok, status: res.status, data }
}

async function ensureUser(u: SeedUser): Promise<void> {
  const listRes = await adminAuth(`users?page=1&per_page=100`, 'GET')
  const users = (listRes.data.users as Array<{ id: string; email?: string }> | undefined) ?? []
  let authUser = users.find((x) => x.email?.toLowerCase() === u.email.toLowerCase())

  if (!authUser) {
    const created = await adminAuth('users', 'POST', {
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { nombres: u.nombres, apellidos: u.apellidos },
    })
    if (!created.ok || typeof created.data.id !== 'string') {
      throw new Error(`No se pudo crear ${u.email}: ${JSON.stringify(created.data)}`)
    }
    authUser = { id: created.data.id, email: u.email }
  } else {
    const updated = await adminAuth(`users/${authUser.id}`, 'PUT', {
      password: u.password,
      email_confirm: true,
      user_metadata: { nombres: u.nombres, apellidos: u.apellidos },
    })
    if (!updated.ok) {
      throw new Error(`No se pudo actualizar clave de ${u.email}: ${JSON.stringify(updated.data)}`)
    }
  }

  await sb(`perfiles?id=eq.${encodeURIComponent(authUser.id)}`, {
    method: 'PATCH',
    body: {
      rol: u.rol,
      activo: true,
      nombres: u.nombres,
      apellidos: u.apellidos,
    },
  })

  // Verificar login real con password
  const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: u.email, password: u.password }),
  })
  if (!loginRes.ok) {
    const errBody = await loginRes.text()
    throw new Error(`Login falló para ${u.email}: ${loginRes.status} ${errBody}`)
  }
  console.log(`Login verificado OK: ${u.email} -> ${u.rol}`)
}

for (const u of TEST_USERS) {
  await ensureUser(u)
}
