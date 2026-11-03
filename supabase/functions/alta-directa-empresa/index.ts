import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: object, status = 200) => Response.json(body, { status, headers })

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers })
  if (req.method !== 'POST') return json({ message: 'Método no permitido.' }, 405)
  try {
    const authorization = req.headers.get('Authorization')
    if (!authorization?.startsWith('Bearer ')) return json({ message: 'Inicia sesión.' }, 401)
    const url = Deno.env.get('SUPABASE_URL')!
    const options = { auth: { persistSession: false, autoRefreshToken: false } }
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      ...options, global: { headers: { Authorization: authorization } },
    })
    const { data: { user } } = await caller.auth.getUser(authorization.slice(7))
    if (!user) return json({ message: 'Sesión inválida.' }, 401)
    const { data: isAdmin, error: roleError } = await caller.rpc('es_superadmin')
    if (roleError || !isAdmin) return json({ message: 'Solo SYSGAS puede dar de alta empresas.' }, 403)
    const input = await req.json()
    if (!input || typeof input !== 'object' || Array.isArray(input)) return json({ message: 'Datos inválidos.' }, 400)
    const fields = ['correo','ruc','razon_social','ciudad','direccion','telefono','nombres','apellidos','dias_cortesia']
    const datos = Object.fromEntries(fields.map(k => [k, typeof input[k] === 'string' ? input[k].trim() : '']))
    datos.correo = datos.correo.toLowerCase()
    const check = await caller.rpc('alta_directa_empresa', { p_datos: datos, p_comprobar: true })
    if (check.error) return json({ message: check.error.code === 'P0001' ? check.error.message : 'No se pudo validar el alta. Revisa la migración.' }, 400)
    let created = false
    if (!check.data) {
      const password = input.contrasena
      if (typeof password !== 'string' || password.trim().length < 12 || new TextEncoder().encode(password).length > 72) {
        return json({ message: 'Para crear una cuenta nueva, ingresa una contraseña de al menos 12 caracteres y hasta 72 bytes.' }, 400)
      }
      const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, options)
      const account = await admin.auth.admin.createUser({
        email: datos.correo,
        password,
        email_confirm: true,
        user_metadata: { nombres: datos.nombres, apellidos: datos.apellidos },
      })
      if (account.error) {
        const retry = await caller.rpc('alta_directa_empresa', { p_datos: datos, p_comprobar: true })
        if (retry.error || !retry.data) return json({ message: 'No se pudo crear la cuenta. Revisa el correo y los requisitos de contraseña.' }, 400)
      } else created = true
    }
    const result = await caller.rpc('alta_directa_empresa', { p_datos: datos, p_comprobar: false })
    if (result.error) return json({ message: result.error.code === 'P0001' ? result.error.message : 'No se pudo vincular al gerente. Puedes reintentar con el mismo correo.' }, 400)
    return json({ empresa_id: result.data, cuenta_creada: created })
  } catch {
    return json({ message: 'No se pudo completar el alta empresarial.' }, 500)
  }
})
