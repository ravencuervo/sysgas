export function readCylinderCode(value) {
  const text = value.trim()
  if (/^https?:\/\//i.test(text)) {
    const url = new URL(text)
    const match = url.pathname.match(/^\/balon\/([^/]+)\/?$/)
    if (!match) throw new Error('El QR no contiene un código de balón válido.')
    return readCylinderCode(decodeURIComponent(match[1]))
  }
  if (!/^[A-Za-z0-9_-]{3,60}$/.test(text)) throw new Error('El código debe tener entre 3 y 60 letras, números, guiones o guiones bajos.')
  return text
}
export function parseBatch(value) {
  const codes = value.split(/[\s,;]+/).filter(Boolean).map(readCylinderCode)
  if (!codes.length || codes.length > 500) throw new Error('Ingresa entre 1 y 500 códigos.')
  if (new Set(codes).size !== codes.length) throw new Error('Hay códigos repetidos en la lista. Revísalos antes de confirmar.')
  return codes
}
