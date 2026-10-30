import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabase = url && key ? createClient(url, key) : null
export function db() {
  if (!supabase) throw new Error('Falta configurar la clave pública de Supabase en .env.local.')
  return supabase
}
export async function catalog() {
  const { data, error } = await db().from('productos_catalogo').select('*').eq('disponible_en_puno', true).order('peso_neto_gas_kg')
  if (error) throw error
  return data.map(p => ({ ...p, capacity: p.capacidad.replace('kg', ' kg'), name: p.nombre_comercial,
    dimensions: p.dimensiones, idealFor: p.descripcion, price: new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(p.precio_venta_pen),
    popular: p.capacidad === '10kg', icon: 'bi-fire', specs: [`Tara: ${p.tara_promedio_kg} kg`, `Peso neto: ${p.peso_neto_gas_kg} kg`] }))
}
