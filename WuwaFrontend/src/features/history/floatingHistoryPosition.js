const MINIMIZED_SIZE = 76
const SAFE_INSET = 24

export function defaultFloatingHistoryPosition({ viewportWidth, viewportHeight, minimized }) {
  if (!minimized) return { x: 32, y: 150 }
  return {
    x: Math.max(12, viewportWidth - MINIMIZED_SIZE - SAFE_INSET),
    y: Math.max(12, viewportHeight - MINIMIZED_SIZE - SAFE_INSET),
  }
}

export function readFloatingHistoryPosition({ storedPosition, viewportWidth, viewportHeight, minimized }) {
  try {
    const stored = JSON.parse(storedPosition || 'null')
    if (Number.isFinite(stored?.x) && Number.isFinite(stored?.y)) return stored
  } catch {
    // Ignore invalid saved panel coordinates.
  }
  return defaultFloatingHistoryPosition({ viewportWidth, viewportHeight, minimized })
}
