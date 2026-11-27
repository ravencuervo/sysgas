export type CapacidadCilindro = '5kg' | '10kg' | '45kg'

export class HttpError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function requireString(value: unknown, field: string, min = 1, max = 300): string {
  if (typeof value !== 'string') {
    throw new HttpError(400, `El campo "${field}" debe ser texto.`)
  }
  const trimmed = value.trim()
  if (trimmed.length < min || trimmed.length > max) {
    throw new HttpError(400, `El campo "${field}" debe tener entre ${min} y ${max} caracteres.`)
  }
  return trimmed
}

export function optionalString(value: unknown, max = 300): string {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

export function requireNumber(value: unknown, field: string, min = 0, max = 1_000_000): number {
  const num = Number(value)
  if (!Number.isFinite(num) || num < min || num > max) {
    throw new HttpError(400, `El campo "${field}" debe ser un número entre ${min} y ${max}.`)
  }
  return num
}

export function requireEnum<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new HttpError(400, `Valor inválido para "${field}".`)
  }
  return value as T
}

export function normalizeCapacidad(value: unknown): CapacidadCilindro {
  const normalized = String(value ?? '10kg').replace(/\s+/g, '').toLowerCase()
  if (normalized === '5kg' || normalized === '10kg' || normalized === '45kg') {
    return normalized
  }
  throw new HttpError(400, 'Capacidad inválida. Usa 5kg, 10kg o 45kg.')
}
