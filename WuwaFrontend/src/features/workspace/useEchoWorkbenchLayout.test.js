import assert from 'node:assert/strict'
import test from 'node:test'
import { filterSonataEffects, sonataScrollTopForActiveButton } from './useEchoWorkbenchLayout.js'

function createGrid({
  scrollTop = 0,
  clientHeight = 180,
  scrollHeight = 420,
  scrollPaddingTop = '0px',
  scrollPaddingBottom = '0px',
} = {}) {
  return {
    scrollTop,
    clientHeight,
    scrollHeight,
    getBoundingClientRect() {
      return { top: 100 }
    },
    ownerDocument: {
      defaultView: {
        getComputedStyle() {
          return { scrollPaddingTop, scrollPaddingBottom }
        },
      },
    },
  }
}

test('sonata focus scrolls the first active option fully into view', () => {
  const grid = createGrid({ scrollTop: 36, clientHeight: 180, scrollPaddingTop: '3px' })
  const firstButton = {
    offsetTop: 3,
    offsetHeight: 44,
    getBoundingClientRect() {
      return { top: 67 }
    },
  }

  assert.equal(sonataScrollTopForActiveButton(grid, firstButton), 0)
})

test('sonata focus measures active options relative to the scroll container', () => {
  const grid = createGrid({ scrollTop: 36, clientHeight: 180, scrollPaddingTop: '3px' })
  const firstButtonWithDocumentOffset = {
    offsetTop: 103,
    offsetHeight: 44,
    getBoundingClientRect() {
      return { top: 67 }
    },
  }

  assert.equal(sonataScrollTopForActiveButton(grid, firstButtonWithDocumentOffset), 0)
})

test('sonata focus scrolls a lower active option fully into view', () => {
  const grid = createGrid({ scrollTop: 0, clientHeight: 180, scrollPaddingBottom: '3px' })
  const lowerButton = {
    offsetHeight: 44,
    getBoundingClientRect() {
      return { top: 420 }
    },
  }

  assert.equal(sonataScrollTopForActiveButton(grid, lowerButton), 187)
})

test('sonata focus keeps a fully visible active option stable', () => {
  const grid = createGrid({
    scrollTop: 120,
    clientHeight: 180,
    scrollPaddingTop: '3px',
    scrollPaddingBottom: '3px',
  })
  const visibleButton = {
    offsetHeight: 44,
    getBoundingClientRect() {
      return { top: 160 }
    },
  }

  assert.equal(sonataScrollTopForActiveButton(grid, visibleButton), 120)
})

test('sonata focus clamps the last active option to the scroll limit', () => {
  const grid = createGrid({
    scrollTop: 0,
    clientHeight: 180,
    scrollHeight: 492,
    scrollPaddingBottom: '3px',
  })
  const lastButton = {
    offsetHeight: 44,
    getBoundingClientRect() {
      return { top: 548 }
    },
  }

  assert.equal(sonataScrollTopForActiveButton(grid, lastButton), 312)
})

test('sonata filtering ignores spaces and case without changing the source list', () => {
  const effects = [{ name: 'Echo Setup' }, { name: '碎梦亡鬼之魇' }]

  assert.deepEqual(filterSonataEffects(effects, ' echoSET '), [{ name: 'Echo Setup' }])
  assert.deepEqual(filterSonataEffects(effects, '碎 梦'), [{ name: '碎梦亡鬼之魇' }])
  assert.equal(effects.length, 2)
})

test('empty sonata filtering returns every option', () => {
  const effects = [{ name: 'A' }, { name: 'B' }]

  assert.deepEqual(filterSonataEffects(effects, '   '), effects)
})
