export const CAPACITIES = ['5 kg', '10 kg', '45 kg']

export function formatCap(raw) {
  return String(raw || '10kg').replace(/(\d+)\s*kg/i, '$1 kg')
}

export function mapsUrl(address, coords) {
  const query = coords && coords.trim() ? coords.trim() : address
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || 'Puno, Peru')}`
}
