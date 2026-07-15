export const HISTORY_PANEL_MODE = Object.freeze({
  COMPACT: 'compact',
  SHOWCASE: 'showcase',
  MINIMIZED: 'minimized',
})

function validExpandedMode(mode) {
  return mode === HISTORY_PANEL_MODE.SHOWCASE
    ? HISTORY_PANEL_MODE.SHOWCASE
    : HISTORY_PANEL_MODE.COMPACT
}

export function initialHistoryPanelState(storedMinimized, storedLastExpandedMode, { emptyHistory = false } = {}) {
  const hasSavedPreference = storedMinimized === 'true' || storedMinimized === 'false'
  const minimized = storedMinimized === 'true' || (!hasSavedPreference && emptyHistory)
  return {
    mode: minimized ? HISTORY_PANEL_MODE.MINIMIZED : HISTORY_PANEL_MODE.COMPACT,
    lastExpandedMode: validExpandedMode(storedLastExpandedMode),
  }
}

export function resolveHistoryPanelTransition(state, intent) {
  if (intent === 'toggle-minimized') {
    if (state.mode === HISTORY_PANEL_MODE.MINIMIZED) {
      const restoredMode = validExpandedMode(state.lastExpandedMode)
      return { mode: restoredMode, lastExpandedMode: restoredMode }
    }
    const expandedMode = validExpandedMode(state.mode)
    return { mode: HISTORY_PANEL_MODE.MINIMIZED, lastExpandedMode: expandedMode }
  }

  if (intent === 'toggle-showcase' && state.mode !== HISTORY_PANEL_MODE.MINIMIZED) {
    const nextMode = state.mode === HISTORY_PANEL_MODE.SHOWCASE
      ? HISTORY_PANEL_MODE.COMPACT
      : HISTORY_PANEL_MODE.SHOWCASE
    return { mode: nextMode, lastExpandedMode: nextMode }
  }

  return state
}
