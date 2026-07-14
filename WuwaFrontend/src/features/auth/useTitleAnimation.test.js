import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { createRenderer, defineComponent } from 'vue'

import {
  TITLE_CHARACTER_INTERVAL_MS,
  TITLE_START_DELAY_MS,
} from './titleAnimation.js'
import { useTitleAnimation } from './useTitleAnimation.js'

function createDeferred() {
  let resolve
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

function createEventSource() {
  const listeners = new Map()

  return {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type).add(listener)
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener)
    },
    dispatch(type, event = {}) {
      for (const listener of listeners.get(type) ?? []) listener(event)
    },
    listenerCount(type) {
      return listeners.get(type)?.size ?? 0
    },
  }
}

function createMediaQuery(initialMatches = false) {
  let matches = initialMatches
  const events = createEventSource()

  return {
    get matches() {
      return matches
    },
    addEventListener: events.addEventListener,
    removeEventListener: events.removeEventListener,
    listenerCount: events.listenerCount,
    setMatches(nextMatches) {
      matches = nextMatches
      events.dispatch('change', { matches })
    },
  }
}

function createBrowserTargets(fontSet) {
  let hidden = false
  const documentEvents = createEventSource()
  const reducedMotionQuery = createMediaQuery()
  const compactViewportQuery = createMediaQuery()
  const documentTarget = {
    fonts: fontSet,
    get hidden() {
      return hidden
    },
    addEventListener: documentEvents.addEventListener,
    removeEventListener: documentEvents.removeEventListener,
    listenerCount: documentEvents.listenerCount,
    setHidden(nextHidden) {
      hidden = nextHidden
      documentEvents.dispatch('visibilitychange')
    },
  }
  const windowTarget = {
    matchMedia(query) {
      if (query === '(prefers-reduced-motion: reduce)') return reducedMotionQuery
      if (query === '(max-width: 520px)') return compactViewportQuery
      throw new Error(`Unexpected media query: ${query}`)
    },
  }

  return {
    compactViewportQuery,
    documentTarget,
    reducedMotionQuery,
    windowTarget,
  }
}

function createHostNode(type) {
  return { children: [], parent: null, text: '', type }
}

const renderer = createRenderer({
  patchProp() {},
  insert(node, parent, anchor) {
    node.parent = parent
    const anchorIndex = anchor ? parent.children.indexOf(anchor) : -1
    if (anchorIndex < 0) parent.children.push(node)
    else parent.children.splice(anchorIndex, 0, node)
  },
  remove(node) {
    const index = node.parent?.children.indexOf(node) ?? -1
    if (index >= 0) node.parent.children.splice(index, 1)
    node.parent = null
  },
  createElement: (type) => createHostNode(type),
  createText(text) {
    const node = createHostNode('text')
    node.text = text
    return node
  },
  createComment(text) {
    const node = createHostNode('comment')
    node.text = text
    return node
  },
  setText(node, text) {
    node.text = text
  },
  setElementText(node, text) {
    node.text = text
  },
  parentNode: (node) => node.parent,
  nextSibling(node) {
    const index = node.parent?.children.indexOf(node) ?? -1
    return index >= 0 ? node.parent.children[index + 1] ?? null : null
  },
})

function mountTitleAnimation(text, targets) {
  let state
  const component = defineComponent({
    setup() {
      state = useTitleAnimation(text, targets)
      return () => null
    },
  })
  const app = renderer.createApp(component)
  app.mount(createHostNode('root'))

  return { state, unmount: () => app.unmount() }
}

async function flushMicrotasks() {
  for (let index = 0; index < 5; index += 1) await Promise.resolve()
}

test('title animation composable owns browser preferences, lifecycle, and cleanup', async () => {
  const source = await readFile(new URL('./useTitleAnimation.js', import.meta.url), 'utf8')

  assert.match(source, /import \{ onBeforeUnmount, onMounted, ref \} from 'vue'/)
  assert.match(source, /import \{ createTitleFontPreparation \} from '\.\/titleFont\.js'/)
  assert.match(source, /windowTarget\?\.matchMedia\?\.\('\(prefers-reduced-motion: reduce\)'\)/)
  assert.match(source, /windowTarget\?\.matchMedia\?\.\('\(max-width: 520px\)'\)/)
  assert.match(source, /const displayedTitle = ref\(shouldPlay \? '' : text\)/)
  assert.match(source, /const isComplete = ref\(!shouldPlay\)/)
  assert.match(source, /let fontPreparation = null/)
  assert.match(source, /let stopped = false/)
  assert.match(source, /onMounted\(async \(\) => \{/)
  assert.match(source, /if \(documentTarget\?\.hidden \|\| reducedMotionQuery\.matches \|\| compactViewportQuery\.matches\) \{\s+complete\(\)/)
  assert.match(source, /fontPreparation = createTitleFontPreparation\(\{\s+text,\s+fontSet: documentTarget\?\.fonts,/)
  assert.match(source, /fontPreparation\.start\(\)\s+const fontReady = await fontPreparation\.ready/)
  assert.match(source, /if \(stopped \|\| isComplete\.value\) return/)
  assert.match(source, /if \(!fontReady \|\| documentTarget\?\.hidden \|\| reducedMotionQuery\.matches \|\| compactViewportQuery\.matches\) \{\s+complete\(\)/)
  assert.match(source, /animation = createTitleAnimation\(\{[\s\S]+onComplete: \(\) => \{\s+isComplete\.value = true/)
  assert.match(source, /documentTarget\?\.addEventListener\('visibilitychange', handleDocumentVisibility\)/)
  assert.match(source, /stopped = true\s+fontPreparation\?\.cancel\(\)/)
  assert.match(source, /onBeforeUnmount\(\(\) => \{[\s\S]+animation\?\.cancel\(\)[\s\S]+removeEventListener/)
  assert.match(source, /return \{ displayedTitle, isComplete \}/)
})

test('title animation waits for ready fonts and gates completion until typing finishes', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const fontLoad = createDeferred()
  const loadCalls = []
  const targets = createBrowserTargets({
    load(font, text) {
      loadCalls.push({ font, text })
      return fontLoad.promise
    },
  })
  const { state, unmount } = mountTitleAnimation('题', targets)

  assert.equal(state.displayedTitle.value, '')
  assert.equal(state.isComplete.value, false)
  assert.equal(loadCalls.length, 1)

  context.mock.timers.tick(TITLE_START_DELAY_MS)
  assert.equal(state.displayedTitle.value, '')
  assert.equal(state.isComplete.value, false)

  fontLoad.resolve([{}])
  await flushMicrotasks()
  assert.equal(state.displayedTitle.value, '')
  assert.equal(state.isComplete.value, false)

  context.mock.timers.tick(TITLE_START_DELAY_MS)
  assert.equal(state.displayedTitle.value, '题')
  assert.equal(state.isComplete.value, false)

  context.mock.timers.tick(TITLE_CHARACTER_INTERVAL_MS - 1)
  assert.equal(state.isComplete.value, false)
  context.mock.timers.tick(1)
  assert.equal(state.displayedTitle.value, '题')
  assert.equal(state.isComplete.value, true)

  unmount()
})

test('empty font readiness completes the title statically without typing', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const targets = createBrowserTargets({ load: () => Promise.resolve([]) })
  const { state, unmount } = mountTitleAnimation('完整标题', targets)

  assert.equal(state.displayedTitle.value, '')
  assert.equal(state.isComplete.value, false)
  await flushMicrotasks()
  assert.equal(state.displayedTitle.value, '完整标题')
  assert.equal(state.isComplete.value, true)

  context.mock.timers.tick(1_000)
  assert.equal(state.displayedTitle.value, '完整标题')
  assert.equal(state.isComplete.value, true)

  unmount()
})

test('pending font preparation completes statically on visibility and preference changes', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const cases = [
    ['visibility', (targets) => targets.documentTarget.setHidden(true)],
    ['reduced motion', (targets) => targets.reducedMotionQuery.setMatches(true)],
    ['compact viewport', (targets) => targets.compactViewportQuery.setMatches(true)],
  ]

  for (const [name, makeStatic] of cases) {
    const fontLoad = createDeferred()
    const targets = createBrowserTargets({ load: () => fontLoad.promise })
    const { state, unmount } = mountTitleAnimation('完整标题', targets)

    assert.equal(targets.documentTarget.listenerCount('visibilitychange'), 1, name)
    assert.equal(targets.reducedMotionQuery.listenerCount('change'), 1, name)
    assert.equal(targets.compactViewportQuery.listenerCount('change'), 1, name)
    makeStatic(targets)
    assert.equal(state.displayedTitle.value, '完整标题', name)
    assert.equal(state.isComplete.value, true, name)

    fontLoad.resolve([{}])
    await flushMicrotasks()
    assert.equal(state.displayedTitle.value, '完整标题', name)
    assert.equal(state.isComplete.value, true, name)

    context.mock.timers.tick(1_000)
    assert.equal(state.displayedTitle.value, '完整标题', name)
    assert.equal(state.isComplete.value, true, name)
    unmount()
  }
})

test('unmount cancels pending font preparation and ignores its late result', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const fontLoad = createDeferred()
  const targets = createBrowserTargets({ load: () => fontLoad.promise })
  const { state, unmount } = mountTitleAnimation('完整标题', targets)

  assert.equal(state.displayedTitle.value, '')
  assert.equal(state.isComplete.value, false)
  unmount()
  assert.equal(targets.documentTarget.listenerCount('visibilitychange'), 0)
  assert.equal(targets.reducedMotionQuery.listenerCount('change'), 0)
  assert.equal(targets.compactViewportQuery.listenerCount('change'), 0)

  await flushMicrotasks()
  fontLoad.resolve([{}])
  await flushMicrotasks()
  context.mock.timers.tick(1_000)
  assert.equal(state.displayedTitle.value, '')
  assert.equal(state.isComplete.value, false)
})
