import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveSampleStageGuidePosition } from './sampleStageGuidePosition.js'

const panelRect = { width: 720, height: 354 }

function assertWithinHorizontalViewport(position, viewportWidth) {
  const renderedWidth = Math.min(panelRect.width, position.maxWidth)
  assert.ok(position.left >= 12, `left edge ${position.left} must stay within the viewport`)
  assert.ok(
    position.left + renderedWidth <= viewportWidth - 12,
    `right edge ${position.left + renderedWidth} must stay within the viewport`,
  )
}

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

test('sample stage guide stays within both horizontal bounds for a right-clipped anchor', () => {
  const viewportWidth = 1200
  const position = resolveSampleStageGuidePosition({
    triggerRect: { left: 1198, right: 1226, top: 100, bottom: 128 },
    panelRect,
    viewportWidth,
    viewportHeight: 900,
  })

  assertWithinHorizontalViewport(position, viewportWidth)
})

test('sample stage guide stays within both horizontal bounds for a left-clipped anchor', () => {
  const viewportWidth = 1200
  const position = resolveSampleStageGuidePosition({
    triggerRect: { left: -26, right: 2, top: 100, bottom: 128 },
    panelRect,
    viewportWidth,
    viewportHeight: 900,
  })

  assertWithinHorizontalViewport(position, viewportWidth)
})

test('sample stage guide clamps its top edge to the viewport margin', () => {
  assert.deepEqual(
    resolveSampleStageGuidePosition({
      triggerRect: { left: 300, right: 328, top: 4, bottom: 32 },
      panelRect,
      viewportWidth: 1440,
      viewportHeight: 900,
    }),
    { placement: 'right', left: 336, top: 12, maxWidth: 720 },
  )
})

test('sample stage guide clamps its bottom edge to the viewport margin', () => {
  assert.deepEqual(
    resolveSampleStageGuidePosition({
      triggerRect: { left: 300, right: 328, top: 880, bottom: 908 },
      panelRect,
      viewportWidth: 1440,
      viewportHeight: 900,
    }),
    { placement: 'right', left: 336, top: 534, maxWidth: 720 },
  )
})
