import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createModelDetailViewportAnchor,
  modelDetailExpandScrollDelta,
} from './modelDetailViewportAnchor.js'

test('expand reveal does not scroll when the whole detail is already visible', () => {
  const delta = modelDetailExpandScrollDelta({
    summaryRect: { top: 120, bottom: 180, height: 60 },
    detailRect: { top: 192, bottom: 492, height: 300 },
    viewportHeight: 720,
    topInset: 88,
    bottomInset: 24,
  })

  assert.equal(delta, 0)
})

test('expand reveal exposes the available first screen near the viewport bottom', () => {
  const delta = modelDetailExpandScrollDelta({
    summaryRect: { top: 435, bottom: 490, height: 55 },
    detailRect: { top: 530, bottom: 1030, height: 500 },
    viewportHeight: 670,
    topInset: 88,
    bottomInset: 24,
  })

  assert.equal(delta, 347)
})

test('expand reveal never moves a summary above the top safe area', () => {
  const delta = modelDetailExpandScrollDelta({
    summaryRect: { top: 76, bottom: 136, height: 60 },
    detailRect: { top: 148, bottom: 648, height: 500 },
    viewportHeight: 670,
    topInset: 88,
    bottomInset: 24,
  })

  assert.equal(delta, 0)
})

test('expand reveal scrolls only enough to expose a short detail', () => {
  const delta = modelDetailExpandScrollDelta({
    summaryRect: { top: 435, bottom: 490, height: 55 },
    detailRect: { top: 530, bottom: 730, height: 200 },
    viewportHeight: 670,
    topInset: 88,
    bottomInset: 24,
  })

  assert.equal(delta, 84)
})

test('expand reveal returns zero for incomplete geometry', () => {
  assert.equal(modelDetailExpandScrollDelta({
    summaryRect: null,
    detailRect: { top: 100, bottom: 300, height: 200 },
    viewportHeight: 720,
  }), 0)
})

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

function createExpandFixture({
  summaryTop = 435,
  summaryHeight = 55,
  detailTop = 530,
  detailHeight = 500,
  scrollTop = 600,
  viewportHeight = 670,
  viewportWidth = 1440,
} = {}) {
  const scrollingElement = {
    clientHeight: viewportHeight,
    scrollHeight: 2200,
    scrollTop,
  }
  const detailElement = {
    getBoundingClientRect() {
      return {
        top: detailTop,
        bottom: detailTop + detailHeight,
        height: detailHeight,
      }
    },
  }
  const rowElement = {
    querySelector(selector) {
      return selector === ':scope > .model-row-detail' ? detailElement : null
    },
  }
  const ownerDocument = {
    scrollingElement,
    defaultView: {
      innerHeight: viewportHeight,
      innerWidth: viewportWidth,
    },
  }
  const anchorElement = {
    isConnected: true,
    ownerDocument,
    getBoundingClientRect() {
      return {
        top: summaryTop,
        bottom: summaryTop + summaryHeight,
        height: summaryHeight,
      }
    },
    closest(selector) {
      return selector === 'article' ? rowElement : null
    },
  }

  return { anchorElement, scrollingElement }
}

test('expand near the viewport bottom reveals the first detail screen', async () => {
  const fixture = createExpandFixture()
  let updateFinished = false
  let frameFinished = false
  const preserve = createModelDetailViewportAnchor({
    waitForUpdate: async () => {
      updateFinished = true
    },
    waitForFrame: async () => {
      assert.equal(updateFinished, true)
      frameFinished = true
    },
  })

  await preserve(fixture.anchorElement, () => {}, { action: 'expand' })

  assert.equal(frameFinished, true)
  assert.equal(fixture.scrollingElement.scrollTop, 947)
})

test('expand keeps the page stable when detail is already visible', async () => {
  const fixture = createExpandFixture({
    summaryTop: 120,
    detailTop: 192,
    detailHeight: 300,
    scrollTop: 400,
    viewportHeight: 720,
  })
  const preserve = createModelDetailViewportAnchor({
    waitForUpdate: async () => {},
    waitForFrame: async () => {},
  })

  await preserve(fixture.anchorElement, () => {}, { action: 'expand' })

  assert.equal(fixture.scrollingElement.scrollTop, 400)
})

test('compact expansion uses the narrow-screen top safe area', async () => {
  const fixture = createExpandFixture({
    summaryTop: 300,
    detailTop: 380,
    detailHeight: 500,
    scrollTop: 500,
    viewportHeight: 720,
    viewportWidth: 520,
  })
  const preserve = createModelDetailViewportAnchor({
    waitForUpdate: async () => {},
    waitForFrame: async () => {},
  })

  await preserve(fixture.anchorElement, () => {}, { action: 'expand' })

  assert.equal(fixture.scrollingElement.scrollTop, 684)
})

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

test('collapse at the page end reserves a temporary tail before the browser can clamp scroll', async () => {
  let baseScrollHeight = 1328
  let tailHeight = 0
  let scrollListener = null
  const scrollingElement = {
    clientHeight: 720,
    scrollTop: 582.6667,
    get scrollHeight() {
      return baseScrollHeight + tailHeight
    },
  }
  const spacer = {
    style: {},
    setAttribute() {},
    remove() {
      tailHeight = 0
    },
  }
  Object.defineProperty(spacer.style, 'height', {
    get() {
      return `${tailHeight}px`
    },
    set(value) {
      tailHeight = Number.parseFloat(value) || 0
    },
  })
  const panel = {
    append(node) {
      assert.equal(node, spacer)
    },
  }
  const expandedRow = {
    getBoundingClientRect() {
      return { height: 370 }
    },
  }
  const detailElement = {
    closest(selector) {
      return selector === 'article' ? expandedRow : null
    },
  }
  const modelBars = {
    querySelector(selector) {
      return selector === '.model-row-detail' ? detailElement : null
    },
  }
  const ownerDocument = {
    scrollingElement,
    defaultView: {
      addEventListener(type, listener) {
        if (type === 'scroll') {
          scrollListener = listener
        }
      },
      removeEventListener(type, listener) {
        if (type === 'scroll' && scrollListener === listener) {
          scrollListener = null
        }
      },
    },
    createElement() {
      return spacer
    },
  }
  const anchorElement = {
    isConnected: true,
    ownerDocument,
    getBoundingClientRect() {
      return { top: 238 }
    },
    closest(selector) {
      if (selector === '.evaluation-panel') {
        return panel
      }
      if (selector === '.model-bars') {
        return modelBars
      }
      return null
    },
  }
  const preserve = createModelDetailViewportAnchor({
    waitForUpdate: async () => {
      baseScrollHeight = 1003
    },
  })

  await preserve(anchorElement, () => {})

  assert.equal(scrollingElement.scrollTop, 582.6667)
  assert.equal(spacer.style.height, '300px')
  assert.equal(typeof scrollListener, 'function')

  scrollingElement.scrollTop = 400
  scrollListener()
  assert.equal(spacer.style.height, '117px')

  scrollingElement.scrollTop = 250
  scrollListener()
  assert.equal(spacer.style.height, '0px')
  assert.equal(scrollListener, null)
})
