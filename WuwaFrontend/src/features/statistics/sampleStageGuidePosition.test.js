import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveSampleStageGuidePosition } from './sampleStageGuidePosition.js'

const panelRect = { width: 720, height: 354 }

test('sample stage guide prefers right placement when the panel fits', () => {
  assert.deepEqual(
    resolveSampleStageGuidePosition({
      triggerRect: { left: 300, right: 328, top: 100, bottom: 128 },
      panelRect,
      viewportWidth: 1440,
      viewportHeight: 900,
    }),
    { placement: 'right', left: 336, top: 92, maxWidth: 720 },
  )
})

test('sample stage guide flips left when the right side does not fit', () => {
  assert.deepEqual(
    resolveSampleStageGuidePosition({
      triggerRect: { left: 1150, right: 1178, top: 100, bottom: 128 },
      panelRect,
      viewportWidth: 1200,
      viewportHeight: 900,
    }),
    { placement: 'left', left: 422, top: 92, maxWidth: 720 },
  )
})

test('sample stage guide falls below and clamps on narrow viewports', () => {
  assert.deepEqual(
    resolveSampleStageGuidePosition({
      triggerRect: { left: 250, right: 278, top: 60, bottom: 88 },
      panelRect,
      viewportWidth: 760,
      viewportHeight: 640,
    }),
    { placement: 'below', left: 28, top: 96, maxWidth: 736 },
  )
})
