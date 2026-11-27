import http, { type IncomingMessage, type ServerResponse } from 'node:http'
import { type AuthProfile, sb, verifyUserToken } from './supabase.js'
import {
  HttpError,
  normalizeCapacidad,
  optionalString,
  requireEnum,
  requireNumber,
  requireString,
} from './types.js'

const PORT = Number(process.env.PORT ?? 4000)
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN ?? '*')
  .split(',')
  .map((s) => s.trim().replace(/\/+$/, ''))
  .filter(Boolean)
const MAX_BODY_BYTES = 64 * 1024

const ADMIN_AND_STAFF: ReadonlyArray<AuthProfile['rol']> = [
  'super_admin',
  'empresa_admin',
  'chofer_repartidor',
  'planta_operador',
  'supervisor_calidad',
]
const MANAGERS: ReadonlyArray<AuthProfile['rol']> = ['super_admin', 'empresa_admin']

async function requireAuth(req: IncomingMessage, allowedRoles: ReadonlyArray<AuthProfile['rol']>): Promise<AuthProfile> {
  const auth = req.headers.authorization ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  const profile = await verifyUserToken(token)
  if (!allowedRoles.includes(profile.rol)) {
    throw new HttpError(403, 'No tienes permisos para realizar esta acción.')
  }
  return profile
}

function resolveCorsOrigin(req: IncomingMessage): string {
  if (ALLOWED_ORIGINS.includes('*')) return '*'
  const reqOrigin = (req.headers.origin ?? '').replace(/\/+$/, '')
  if (reqOrigin && ALLOWED_ORIGINS.includes(reqOrigin)) return reqOrigin
  return ALLOWED_ORIGINS[0] ?? '*'
}

function send(req: IncomingMessage, res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': resolveCorsOrigin(req),
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  })
  res.end(JSON.stringify(payload))
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buf.length
    if (size > MAX_BODY_BYTES) {
      throw new HttpError(413, 'El cuerpo de la solicitud excede el límite permitido.')
    }
    chunks.push(buf)
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new HttpError(400, 'JSON inválido: se esperaba un objeto.')
    }
    return parsed as Record<string, unknown>
  } catch (err) {
    if (err instanceof HttpError) throw err
    throw new HttpError(400, 'JSON malformado.')
  }
}

async function handleSimpleCrud(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  prefix: string,
  table: string
): Promise<boolean> {
  const re = new RegExp(`^${prefix}(?:/([^/]+))?$`)
  const match = pathname.match(re)
  if (!match) return false
  const id = match[1]

  if (req.method === 'POST' && !id) {
    const body = await readJson(req)
    const rows = await sb<unknown[]>(table, { method: 'POST', body })
    send(req, res, 201, rows[0] ?? null)
    return true
  }
  if (req.method === 'PATCH' && id) {
    const body = await readJson(req)
    const rows = await sb<unknown[]>(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body })
    send(req, res, 200, rows[0] ?? null)
    return true
  }
  if (req.method === 'DELETE' && id) {
    await sb(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', prefer: 'return=minimal' })
    send(req, res, 200, { ok: true })
    return true
  }
  return false
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    send(req, res, 204, {})
    return
  }

  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  const { pathname } = url

  try {
    if (req.method === 'GET' && pathname === '/health') {
      const catalog = await sb<Array<{ capacidad: string }>>('productos_catalogo?select=capacidad&limit=3')
      send(req, res, 200, { ok: true, runtime: 'node-ts', productos: catalog.length })
      return
    }

    if (req.method === 'POST' && pathname === '/api/afiliaciones') {
      const b = await readJson(req)
      const rows = await sb<unknown[]>('solicitudes_afiliacion', {
        method: 'POST',
        body: {
          nombre_empresa: requireString(b.nombre_empresa, 'nombre_empresa', 2, 150),
          representante_nombre: requireString(b.representante_nombre, 'representante_nombre', 2, 120),
          ciudad: requireString(b.ciudad ?? 'Puno', 'ciudad', 2, 80),
          telefono: requireString(b.telefono, 'telefono', 7, 20),
          correo: requireString(b.correo, 'correo', 5, 120),
          volumen_mensual_balones: Math.round(requireNumber(b.volumen_mensual_balones ?? 1000, 'volumen', 1, 500000)),
        },
      })
      send(req, res, 201, rows[0] ?? null)
      return
    }

    if (req.method === 'GET' && pathname === '/api/admin/resumen') {
      await requireAuth(req, ADMIN_AND_STAFF)
      const [afiliaciones, locales, lotes, pedidos, vehiculos, catalog, incidencias, notificaciones] = await Promise.all([
        sb('solicitudes_afiliacion?select=*&order=created_at.desc&limit=100'),
        sb('locales_dispensa?select=*&order=created_at.desc&limit=100'),
        sb('lotes_balones?select=*&order=created_at.desc&limit=100'),
        sb('pedidos?select=*,pedido_items(capacidad,cantidad,precio_unitario_pen,subtotal_pen)&order=created_at.desc&limit=100'),
        sb('vehiculos_reparto?select=*&order=placa.asc&limit=100'),
        sb('productos_catalogo?select=*&order=capacidad.asc'),
        sb('incidencias?select=*&order=created_at.desc&limit=50'),
        sb('notificaciones?select=*&order=created_at.desc&limit=30'),
      ])
      send(req, res, 200, { afiliaciones, locales, lotes, pedidos, vehiculos, catalog, incidencias, notificaciones })
      return
    }

    const matchAff = pathname.match(/^\/api\/admin\/afiliaciones\/([^/]+)$/)
    if (matchAff?.[1]) {
      await requireAuth(req, ['super_admin'])
      const id = matchAff[1]
      if (req.method === 'PATCH') {
        const b = await readJson(req)
        const estado = requireEnum(b.estado, 'estado', ['pendiente_revision', 'contactado', 'aprobada_activa', 'rechazada'])
        const rows = await sb<Array<Record<string, unknown>>>(`solicitudes_afiliacion?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: {
            estado,
            notas_internas: optionalString(b.notas_internas, 2000),
          },
        })
        const updated = rows[0]
        if (updated && estado === 'aprobada_activa' && b.ruc && b.direccion) {
          const ruc = requireString(b.ruc, 'ruc', 11, 11)
          const direccion = requireString(b.direccion, 'direccion', 5, 300)
          const emps = await sb<Array<{ id: string }>>('empresas_distribuidoras', {
            method: 'POST',
            body: {
              ruc,
              razon_social: updated.nombre_empresa,
              nombre_comercial: updated.nombre_empresa,
              ciudad: updated.ciudad,
              direccion,
              telefono_contacto: updated.telefono,
              correo_contacto: updated.correo,
              volumen_estimado_mensual: updated.volumen_mensual_balones,
            },
          })
          const emp = emps[0]
          if (emp) {
            await sb('locales_dispensa', {
              method: 'POST',
              body: {
                empresa_id: emp.id,
                nombre_local: `Sede ${String(updated.ciudad)} — ${String(updated.nombre_empresa)}`,
                tipo: 'Distribuidora afiliada',
                ruc,
                ciudad: updated.ciudad,
                direccion,
                estado: 'piloto',
              },
            })
          }
        }
        send(req, res, 200, updated ?? null)
        return
      }
      if (req.method === 'DELETE') {
        await sb(`solicitudes_afiliacion?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', prefer: 'return=minimal' })
        send(req, res, 200, { ok: true })
        return
      }
    }

    if (pathname.startsWith('/api/admin/locales')) {
      await requireAuth(req, MANAGERS)
      if (await handleSimpleCrud(req, res, pathname, '/api/admin/locales', 'locales_dispensa')) return
    }

    const matchLote = pathname.match(/^\/api\/admin\/lotes(?:\/([^/]+))?$/)
    if (matchLote) {
      await requireAuth(req, MANAGERS)
      const id = matchLote[1]
      if (req.method === 'POST' && !id) {
        const b = await readJson(req)
        const cantidad = Math.round(requireNumber(b.cantidad, 'cantidad', 1, 5000))
        const tara = requireNumber(b.tara_unitaria_kg, 'tara_unitaria_kg', 0, 200)
        const neto = requireNumber(b.peso_neto_unitario_kg, 'peso_neto_unitario_kg', 0, 200)
        const rows = await sb<unknown[]>('lotes_balones', {
          method: 'POST',
          body: {
            codigo_lote: requireString(b.codigo_lote, 'codigo_lote', 2, 60),
            local_id: b.local_id ?? null,
            capacidad: normalizeCapacidad(b.capacidad),
            cantidad,
            movimiento: requireEnum(b.movimiento, 'movimiento', ['Entrada', 'Salida']),
            tara_unitaria_kg: tara,
            peso_neto_unitario_kg: neto,
            peso_total_kg: Number((cantidad * (tara + neto)).toFixed(2)),
            calidad: requireEnum(b.calidad ?? 'Apto', 'calidad', ['Apto', 'En inspección', 'Mantenimiento']),
            codigos_qr: optionalString(b.codigos_qr, 300),
            ultima_prueba: optionalString(b.ultima_prueba, 20) || undefined,
          },
        })
        send(req, res, 201, rows[0] ?? null)
        return
      }
      if (req.method === 'PATCH' && id) {
        const b = await readJson(req)
        const rows = await sb<unknown[]>(`lotes_balones?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: {
            ...b,
            ...(b.capacidad ? { capacidad: normalizeCapacidad(b.capacidad) } : {}),
          },
        })
        send(req, res, 200, rows[0] ?? null)
        return
      }
      if (req.method === 'DELETE' && id) {
        await sb(`lotes_balones?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', prefer: 'return=minimal' })
        send(req, res, 200, { ok: true })
        return
      }
    }

    const matchPed = pathname.match(/^\/api\/admin\/pedidos(?:\/([^/]+))?$/)
    if (matchPed) {
      await requireAuth(req, req.method === 'PATCH' ? ADMIN_AND_STAFF : MANAGERS)
      const id = matchPed[1]
      if (req.method === 'POST' && !id) {
        const b = await readJson(req)
        const total = requireNumber(b.total_pedido_pen ?? 46, 'total_pedido_pen', 1, 100000)
        const cantidad = Math.round(requireNumber(b.cantidad ?? 1, 'cantidad', 1, 100))
        const ticket = optionalString(b.codigo_ticket, 32) || `TK-${Date.now().toString().slice(-6)}`
        const rows = await sb<Array<{ id: string }>>('pedidos', {
          method: 'POST',
          body: {
            codigo_ticket: ticket,
            nombre_destinatario: requireString(b.nombre_destinatario, 'nombre_destinatario', 2, 120),
            telefono_contacto: requireString(b.telefono_contacto, 'telefono_contacto', 7, 20),
            ciudad: requireString(b.ciudad ?? 'Puno', 'ciudad', 2, 80),
            direccion_entrega: requireString(b.direccion_entrega, 'direccion_entrega', 4, 300),
            coordenadas: optionalString(b.coordenadas, 120),
            estado: optionalString(b.estado, 40) || 'pendiente',
            total_pedido_pen: total,
            metodo_pago: optionalString(b.metodo_pago, 30) || 'Efectivo',
            vacio_recuperado: Boolean(b.vacio_recuperado),
          },
        })
        const row = rows[0]
        if (row && b.capacidad) {
          await sb('pedido_items', {
            method: 'POST',
            body: {
              pedido_id: row.id,
              capacidad: normalizeCapacidad(b.capacidad),
              cantidad,
              precio_unitario_pen: Number((total / cantidad).toFixed(2)),
              subtotal_pen: total,
            },
          })
        }
        send(req, res, 201, row ?? null)
        return
      }
      if (req.method === 'PATCH' && id) {
        const b = await readJson(req)
        const rows = await sb<unknown[]>(`pedidos?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: b })
        send(req, res, 200, rows[0] ?? null)
        return
      }
      if (req.method === 'DELETE' && id) {
        await sb(`pedidos?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', prefer: 'return=minimal' })
        send(req, res, 200, { ok: true })
        return
      }
    }

    if (pathname.startsWith('/api/admin/vehiculos')) {
      await requireAuth(req, MANAGERS)
      if (await handleSimpleCrud(req, res, pathname, '/api/admin/vehiculos', 'vehiculos_reparto')) return
    }
    if (pathname.startsWith('/api/admin/catalogo')) {
      await requireAuth(req, MANAGERS)
      if (await handleSimpleCrud(req, res, pathname, '/api/admin/catalogo', 'productos_catalogo')) return
    }
    if (pathname.startsWith('/api/incidencias')) {
      await requireAuth(req, ADMIN_AND_STAFF)
      if (await handleSimpleCrud(req, res, pathname, '/api/incidencias', 'incidencias')) return
    }

    send(req, res, 404, { error: 'Ruta no encontrada' })
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500
    const message = err instanceof Error ? err.message : 'Error interno del servidor'
    send(req, res, status, { error: message })
  }
})

server.listen(PORT, () => {
  console.log(`SYSGAS Backend (TypeScript) escuchando en http://localhost:${PORT}`)
})
