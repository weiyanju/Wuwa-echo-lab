import assert from 'node:assert/strict'
import test from 'node:test'
import {
  HISTORY_PANEL_MODE,
  initialHistoryPanelState,
  resolveHistoryPanelTransition,
} from './floatingHistoryMode.js'

test('legacy minimized preference initializes the terminal with compact as its fallback', () => {
  assert.deepEqual(initialHistoryPanelState('true'), {
    mode: HISTORY_PANEL_MODE.MINIMIZED,
    lastExpandedMode: HISTORY_PANEL_MODE.COMPACT,
  })
  assert.deepEqual(initialHistoryPanelState('false'), {
    mode: HISTORY_PANEL_MODE.COMPACT,
    lastExpandedMode: HISTORY_PANEL_MODE.COMPACT,
  })
})

test('a reloaded terminal restores its persisted expanded mode', () => {
  assert.deepEqual(initialHistoryPanelState('true', HISTORY_PANEL_MODE.SHOWCASE), {
    mode: HISTORY_PANEL_MODE.MINIMIZED,
    lastExpandedMode: HISTORY_PANEL_MODE.SHOWCASE,
  })
  assert.deepEqual(initialHistoryPanelState('true', 'unknown-mode'), {
    mode: HISTORY_PANEL_MODE.MINIMIZED,
    lastExpandedMode: HISTORY_PANEL_MODE.COMPACT,
  })
})

test('compact minimizes directly and remembers compact as the restore mode', () => {
  assert.deepEqual(
    resolveHistoryPanelTransition(
      { mode: HISTORY_PANEL_MODE.COMPACT, lastExpandedMode: HISTORY_PANEL_MODE.SHOWCASE },
      'toggle-minimized',
    ),
    { mode: HISTORY_PANEL_MODE.MINIMIZED, lastExpandedMode: HISTORY_PANEL_MODE.COMPACT },
  )
})

test('showcase minimizes directly without emitting compact as an intermediate mode', () => {
  assert.deepEqual(
    resolveHistoryPanelTransition(
      { mode: HISTORY_PANEL_MODE.SHOWCASE, lastExpandedMode: HISTORY_PANEL_MODE.COMPACT },
      'toggle-minimized',
    ),
    { mode: HISTORY_PANEL_MODE.MINIMIZED, lastExpandedMode: HISTORY_PANEL_MODE.SHOWCASE },
  )
})

test('the terminal restores whichever expanded mode was last visible', () => {
  assert.deepEqual(
    resolveHistoryPanelTransition(
      { mode: HISTORY_PANEL_MODE.MINIMIZED, lastExpandedMode: HISTORY_PANEL_MODE.COMPACT },
      'toggle-minimized',
    ),
    { mode: HISTORY_PANEL_MODE.COMPACT, lastExpandedMode: HISTORY_PANEL_MODE.COMPACT },
  )
  assert.deepEqual(
    resolveHistoryPanelTransition(
      { mode: HISTORY_PANEL_MODE.MINIMIZED, lastExpandedMode: HISTORY_PANEL_MODE.SHOWCASE },
      'toggle-minimized',
    ),
    { mode: HISTORY_PANEL_MODE.SHOWCASE, lastExpandedMode: HISTORY_PANEL_MODE.SHOWCASE },
  )
})

test('the showcase control switches only between the two expanded modes', () => {
  assert.deepEqual(
    resolveHistoryPanelTransition(
      { mode: HISTORY_PANEL_MODE.COMPACT, lastExpandedMode: HISTORY_PANEL_MODE.COMPACT },
      'toggle-showcase',
    ),
    { mode: HISTORY_PANEL_MODE.SHOWCASE, lastExpandedMode: HISTORY_PANEL_MODE.SHOWCASE },
  )
  assert.deepEqual(
    resolveHistoryPanelTransition(
      { mode: HISTORY_PANEL_MODE.SHOWCASE, lastExpandedMode: HISTORY_PANEL_MODE.SHOWCASE },
      'toggle-showcase',
    ),
    { mode: HISTORY_PANEL_MODE.COMPACT, lastExpandedMode: HISTORY_PANEL_MODE.COMPACT },
  )
})

test('the showcase control cannot change a minimized panel behind the terminal', () => {
  const state = { mode: HISTORY_PANEL_MODE.MINIMIZED, lastExpandedMode: HISTORY_PANEL_MODE.SHOWCASE }
  assert.deepEqual(resolveHistoryPanelTransition(state, 'toggle-showcase'), state)
})
