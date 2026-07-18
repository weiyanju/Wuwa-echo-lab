import assert from 'node:assert/strict'
import test from 'node:test'

import { createModelDetailViewportAnchor } from './modelDetailViewportAnchor.js'

function createAnchorFixture({ top = 120, scrollTop = 400 } = {}) {
  let currentTop = top
  const scrollingElement = { scrollTop }
  const ownerDocument = { scrollingElement }
  const anchorElement = {
    isConnected: true,
    ownerDocument,
    getBoundingClientRect() {
      return { top: currentTop }
    },
  }

  return {
    anchorElement,
    scrollingElement,
    setTop(value) {
      currentTop = value
    },
  }
}

test('viewport anchor keeps a row fixed when the browser moves it down', async () => {
  const fixture = createAnchorFixture()
  let stateChanged = false
  const preserve = createModelDetailViewportAnchor({
    waitForUpdate: async () => fixture.setTop(170),
  })

  await preserve(fixture.anchorElement, () => {
    stateChanged = true
  })

  assert.equal(stateChanged, true)
  assert.equal(fixture.scrollingElement.scrollTop, 450)
})

test('viewport anchor handles an upward row displacement', async () => {
  const fixture = createAnchorFixture()
  const preserve = createModelDetailViewportAnchor({
    waitForUpdate: async () => fixture.setTop(90),
  })

  await preserve(fixture.anchorElement, () => {})

  assert.equal(fixture.scrollingElement.scrollTop, 370)
})

test('viewport anchor ignores subpixel movement below the tolerance', async () => {
  const fixture = createAnchorFixture()
  const preserve = createModelDetailViewportAnchor({
    waitForUpdate: async () => fixture.setTop(120.5),
  })

  await preserve(fixture.anchorElement, () => {})

  assert.equal(fixture.scrollingElement.scrollTop, 400)
})

test('viewport anchor safely exits when the element disconnects', async () => {
  const fixture = createAnchorFixture()
  const preserve = createModelDetailViewportAnchor({
    waitForUpdate: async () => {
      fixture.setTop(170)
      fixture.anchorElement.isConnected = false
    },
  })

  await preserve(fixture.anchorElement, () => {})

  assert.equal(fixture.scrollingElement.scrollTop, 400)
})

test('viewport anchor safely exits without a scrolling element', async () => {
  const fixture = createAnchorFixture()
  fixture.anchorElement.ownerDocument.scrollingElement = null
  const preserve = createModelDetailViewportAnchor({
    waitForUpdate: async () => fixture.setTop(170),
  })

  await preserve(fixture.anchorElement, () => {})

  assert.equal(fixture.scrollingElement.scrollTop, 400)
})

test('only the latest rapid disclosure operation compensates scroll', async () => {
  const first = createAnchorFixture()
  const second = createAnchorFixture()
  const updateResolvers = []
  const preserve = createModelDetailViewportAnchor({
    waitForUpdate: () => new Promise((resolve) => updateResolvers.push(resolve)),
  })

  const firstOperation = preserve(first.anchorElement, () => {})
  const secondOperation = preserve(second.anchorElement, () => {})
  first.setTop(180)
  second.setTop(150)

  updateResolvers[0]()
  await firstOperation
  assert.equal(first.scrollingElement.scrollTop, 400)

  updateResolvers[1]()
  await secondOperation
  assert.equal(second.scrollingElement.scrollTop, 430)
})
