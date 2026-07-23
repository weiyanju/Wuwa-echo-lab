import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { createRenderer, defineComponent } from 'vue'

import {
  TITLE_AUTH_HANDOFF_DELAY_MS,
  TITLE_FINAL_HOLD_MS,
  TITLE_INDICATOR_HIDE_DELAY_MS,
  TITLE_INDICATOR_STATE,
  TITLE_INDICATOR_TRANSITION_MS,
  TITLE_PHASE,
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
  assert.match(source, /const phase = ref\(shouldPlay \? TITLE_PHASE\.PREPARING : TITLE_PHASE\.STATIC\)/)
  assert.match(source, /const indicatorState = ref\(TITLE_INDICATOR_STATE\.HIDDEN\)/)
  assert.match(source, /const isAuthReady = ref\(!shouldPlay\)/)
  assert.match(source, /let fontPreparation = null/)
  assert.match(source, /let stopped = false/)
  assert.match(source, /onMounted\(async \(\) => \{/)
  assert.match(source, /if \(documentTarget\?\.hidden \|\| reducedMotionQuery\.matches \|\| compactViewportQuery\.matches\) \{\s+complete\(\)/)
  assert.match(source, /fontPreparation = createTitleFontPreparation\(\{\s+text,\s+fontSet: documentTarget\?\.fonts,/)
  assert.match(source, /fontPreparation\.start\(\)\s+const fontReady = await fontPreparation\.ready/)
  assert.match(source, /if \(stopped \|\| phase\.value === TITLE_PHASE\.STATIC\) return/)
  assert.match(source, /if \(!fontReady \|\| documentTarget\?\.hidden \|\| reducedMotionQuery\.matches \|\| compactViewportQuery\.matches\) \{\s+complete\(\)/)
  assert.match(source, /onPhaseChange: \(nextPhase\) => \{\s+phase\.value = nextPhase/)
  assert.match(source, /onIndicatorChange: \(nextState\) => \{\s+indicatorState\.value = nextState/)
  assert.match(source, /onAuthReady: \(\) => \{\s+isAuthReady\.value = true/)
  assert.match(source, /documentTarget\?\.addEventListener\('visibilitychange', handleDocumentVisibility\)/)
  assert.match(source, /stopped = true\s+fontPreparation\?\.cancel\(\)/)
  assert.match(source, /onBeforeUnmount\(\(\) => \{[\s\S]+animation\?\.cancel\(\)[\s\S]+removeEventListener/)
  assert.match(source, /return \{ displayedTitle, phase, indicatorState, isAuthReady \}/)
})

test('title animation hands auth over before the archived indicator exits', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const fontLoad = createDeferred()
  const targets = createBrowserTargets({ load: () => fontLoad.promise })
  const { state, unmount } = mountTitleAnimation('题', targets)

  assert.equal(state.displayedTitle.value, '')
  assert.equal(state.phase.value, TITLE_PHASE.PREPARING)
  assert.equal(state.indicatorState.value, TITLE_INDICATOR_STATE.HIDDEN)
  assert.equal(state.isAuthReady.value, false)

  fontLoad.resolve([{}])
  await flushMicrotasks()
  assert.equal(state.phase.value, TITLE_PHASE.TYPING)
  assert.equal(state.indicatorState.value, TITLE_INDICATOR_STATE.BAR)

  context.mock.timers.tick(TITLE_START_DELAY_MS)
  assert.equal(state.displayedTitle.value, '题')

  context.mock.timers.tick(TITLE_FINAL_HOLD_MS)
  assert.equal(state.phase.value, TITLE_PHASE.RESOLVING)
  assert.equal(state.indicatorState.value, TITLE_INDICATOR_STATE.DOT)
  assert.equal(state.isAuthReady.value, false)

  context.mock.timers.tick(TITLE_AUTH_HANDOFF_DELAY_MS)
  assert.equal(state.isAuthReady.value, true)
  assert.equal(state.phase.value, TITLE_PHASE.RESOLVING)

  context.mock.timers.tick(TITLE_INDICATOR_HIDE_DELAY_MS - TITLE_AUTH_HANDOFF_DELAY_MS)
  assert.equal(state.indicatorState.value, TITLE_INDICATOR_STATE.HIDDEN)
  assert.equal(state.phase.value, TITLE_PHASE.RESOLVING)

  context.mock.timers.tick(TITLE_INDICATOR_TRANSITION_MS)
  assert.equal(state.phase.value, TITLE_PHASE.COMPLETED)

  unmount()
})

test('empty font readiness completes the title statically without typing', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const targets = createBrowserTargets({ load: () => Promise.resolve([]) })
  const { state, unmount } = mountTitleAnimation('完整标题', targets)

  assert.equal(state.displayedTitle.value, '')
  assert.equal(state.phase.value, TITLE_PHASE.PREPARING)
  assert.equal(state.indicatorState.value, TITLE_INDICATOR_STATE.HIDDEN)
  assert.equal(state.isAuthReady.value, false)
  await flushMicrotasks()
  assert.equal(state.displayedTitle.value, '完整标题')
  assert.equal(state.phase.value, TITLE_PHASE.STATIC)
  assert.equal(state.indicatorState.value, TITLE_INDICATOR_STATE.HIDDEN)
  assert.equal(state.isAuthReady.value, true)

  context.mock.timers.tick(1_000)
  assert.equal(state.displayedTitle.value, '完整标题')
  assert.equal(state.phase.value, TITLE_PHASE.STATIC)
  assert.equal(state.indicatorState.value, TITLE_INDICATOR_STATE.HIDDEN)
  assert.equal(state.isAuthReady.value, true)

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
    assert.equal(state.phase.value, TITLE_PHASE.STATIC, name)
    assert.equal(state.indicatorState.value, TITLE_INDICATOR_STATE.HIDDEN, name)
    assert.equal(state.isAuthReady.value, true, name)

    fontLoad.resolve([{}])
    await flushMicrotasks()
    assert.equal(state.displayedTitle.value, '完整标题', name)
    assert.equal(state.phase.value, TITLE_PHASE.STATIC, name)
    assert.equal(state.indicatorState.value, TITLE_INDICATOR_STATE.HIDDEN, name)
    assert.equal(state.isAuthReady.value, true, name)

    context.mock.timers.tick(1_000)
    assert.equal(state.displayedTitle.value, '完整标题', name)
    assert.equal(state.phase.value, TITLE_PHASE.STATIC, name)
    assert.equal(state.indicatorState.value, TITLE_INDICATOR_STATE.HIDDEN, name)
    assert.equal(state.isAuthReady.value, true, name)
    unmount()
  }
})

test('unmount cancels pending font preparation and ignores its late result', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const fontLoad = createDeferred()
  const targets = createBrowserTargets({ load: () => fontLoad.promise })
  const { state, unmount } = mountTitleAnimation('完整标题', targets)

  assert.equal(state.displayedTitle.value, '')
  assert.equal(state.phase.value, TITLE_PHASE.PREPARING)
  assert.equal(state.indicatorState.value, TITLE_INDICATOR_STATE.HIDDEN)
  assert.equal(state.isAuthReady.value, false)
  unmount()
  assert.equal(targets.documentTarget.listenerCount('visibilitychange'), 0)
  assert.equal(targets.reducedMotionQuery.listenerCount('change'), 0)
  assert.equal(targets.compactViewportQuery.listenerCount('change'), 0)

  await flushMicrotasks()
  fontLoad.resolve([{}])
  await flushMicrotasks()
  context.mock.timers.tick(1_000)
  assert.equal(state.displayedTitle.value, '')
  assert.equal(state.phase.value, TITLE_PHASE.PREPARING)
  assert.equal(state.indicatorState.value, TITLE_INDICATOR_STATE.HIDDEN)
  assert.equal(state.isAuthReady.value, false)
})
