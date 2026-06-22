export function normalizePlayerUid(value) {
  return String(value || '').replace(/\D/g, '')
}

export function isValidPlayerUid(value) {
  return /^[0-9]{9}$/.test(normalizePlayerUid(value))
}
