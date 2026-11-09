import { createClient } from '@supabase/supabase-js'

// Soporte para variantes estándar de nombres en Vercel / Vite
const url = (
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
).trim()

const key = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''
).trim()

export const isSupabaseConfigured = Boolean(url && key)

export const supabase = isSupabaseConfigured ? createClient(url, key) : null

export function db() {
  if (!supabase) {
    throw new Error('Falta la configuración pública de Supabase. En Vercel, define VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY y vuelve a desplegar.')
  }
  return supabase
}

// Catálogo por defecto para garantizar que la Landing Page y los modelos 3D
// siempre se rendericen perfectamente incluso si Supabase está offline o en configuración.
export const DEFAULT_CATALOG = [
  {
    id: 'prod-5kg',
    capacidad: '5kg',
    capacity: '5 kg',
    nombre_comercial: 'Balón Portátil',
    name: 'Balón Portátil',
    dimensiones: '38 cm alto × 23 cm ø',
    dimensions: '38 cm alto × 23 cm ø',
    descripcion: 'Departamentos, campamentos, parrillas y espacios reducidos.',
    idealFor: 'Departamentos, campamentos, parrillas y espacios reducidos.',
    precio_venta_pen: 28.5,
    price: 'S/ 28.50',
    tara_promedio_kg: 6.2,
    peso_neto_gas_kg: 5.0,
    popular: false,
    icon: 'bi-house-heart-fill',
    specs: ['Tara: 6.2 kg', 'Peso neto: 5.0 kg', 'Sello hermético probado'],
  },
  {
    id: 'prod-10kg',
    capacidad: '10kg',
    capacity: '10 kg',
    nombre_comercial: 'Balón Familiar',
    name: 'Balón Familiar',
    dimensiones: '62 cm alto × 30 cm ø',
    dimensions: '62 cm alto × 30 cm ø',
    descripcion: 'El más elegido para hogares familiares, cocinas y pequeños negocios.',
    idealFor: 'El más elegido para hogares familiares, cocinas y pequeños negocios.',
    precio_venta_pen: 48.0,
    price: 'S/ 48.00',
    tara_promedio_kg: 11.5,
    peso_neto_gas_kg: 10.0,
    popular: true,
    icon: 'bi-fire',
    specs: ['Tara: 11.5 kg', 'Peso neto: 10.0 kg', 'Balanza digital en puerta'],
  },
  {
    id: 'prod-45kg',
    capacidad: '45kg',
    capacity: '45 kg',
    nombre_comercial: 'Balón Industrial',
    name: 'Balón Industrial',
    dimensiones: '132 cm alto × 38 cm ø',
    dimensions: '132 cm alto × 38 cm ø',
    descripcion: 'Restaurantes, panaderías, hoteles y calderas de alta demanda.',
    idealFor: 'Restaurantes, panaderías, hoteles y calderas de alta demanda.',
    precio_venta_pen: 185.0,
    price: 'S/ 185.00',
    tara_promedio_kg: 38.0,
    peso_neto_gas_kg: 45.0,
    popular: false,
    icon: 'bi-building-fill-gear',
    specs: ['Tara: 38.0 kg', 'Peso neto: 45.0 kg', 'Válvula reforzada POL'],
  },
]

export async function catalog() {
  if (!supabase) {
    return DEFAULT_CATALOG
  }
  try {
    const { data, error } = await supabase
      .from('productos_catalogo')
      .select('*')
      .eq('disponible_en_puno', true)
      .order('peso_neto_gas_kg')

    if (error || !data || data.length === 0) {
      return DEFAULT_CATALOG
    }

    return data.map(p => ({
      ...p,
      capacity: p.capacidad.replace('kg', ' kg'),
      name: p.nombre_comercial,
      dimensions: p.dimensiones,
      idealFor: p.descripcion,
      price: new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(p.precio_venta_pen),
      popular: p.capacidad === '10kg',
      icon: p.capacidad === '5kg' ? 'bi-house-heart-fill' : p.capacidad === '45kg' ? 'bi-building-fill-gear' : 'bi-fire',
      specs: [`Tara: ${p.tara_promedio_kg} kg`, `Peso neto: ${p.peso_neto_gas_kg} kg`],
    }))
  } catch (err) {
    console.warn('Usando catálogo local de contingencia:', err)
    return DEFAULT_CATALOG
  }
}
