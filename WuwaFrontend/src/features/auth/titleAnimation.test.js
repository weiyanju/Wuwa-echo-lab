import assert from 'node:assert/strict'
import test from 'node:test'

import {
  TITLE_AUTH_HANDOFF_DELAY_MS,
  TITLE_COMPLETE_DELAY_MS,
  TITLE_FINAL_HOLD_MS,
  TITLE_GRAPHEME_DELAYS_MS,
  TITLE_INDICATOR_HIDE_DELAY_MS,
  TITLE_INDICATOR_STATE,
  TITLE_PHASE,
  TITLE_PUNCTUATION_COMPRESS_MS,
  TITLE_START_DELAY_MS,
  createTitleAnimation,
  shouldAnimateTitle,
  splitTitleGraphemes,
} from './titleAnimation.js'

function createManualScheduler() {
  let nextId = 0
  const jobs = []

  return {
    schedule(callback, delay) {
      nextId += 1
      jobs.push({ callback, delay, id: nextId })
      return nextId
    },
    cancel(id) {
      const index = jobs.findIndex((job) => job.id === id)
      if (index >= 0) jobs.splice(index, 1)
    },
    runAll() {
      const delays = []
      while (jobs.length) {
        const job = jobs.shift()
        delays.push(job.delay)
        job.callback()
      }
      return delays
    },
  }
}

test('splitTitleGraphemes keeps a joined emoji in one visible frame', () => {
  assert.deepEqual(splitTitleGraphemes('欢迎👨‍👩‍👧‍👦'), ['欢', '迎', '👨‍👩‍👧‍👦'])
  assert.deepEqual(splitTitleGraphemes('欢迎回家，漂泊者', null), ['欢', '迎', '回', '家', '，', '漂', '泊', '者'])
})

test('createTitleAnimation emits the approved archive lifecycle', () => {
  const scheduler = createManualScheduler()
  const frames = []
  const phases = []
  const indicators = []
  let authReadyCount = 0
  let completionCount = 0
  const animation = createTitleAnimation({
    text: '欢迎回家，漂泊者',
    onFrame: (frame) => frames.push(frame),
    onPhaseChange: (phase) => phases.push(phase),
    onIndicatorChange: (state) => indicators.push(state),
    onAuthReady: () => { authReadyCount += 1 },
    onComplete: () => { completionCount += 1 },
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
  })

  animation.start()
  animation.start()
  const delays = scheduler.runAll()

  assert.deepEqual(frames, [
    '',
    '欢',
    '欢迎',
    '欢迎回',
    '欢迎回家',
    '欢迎回家，',
    '欢迎回家，漂',
    '欢迎回家，漂泊',
    '欢迎回家，漂泊者',
  ])
  assert.deepEqual(phases, [
    TITLE_PHASE.TYPING,
    TITLE_PHASE.PUNCTUATION,
    TITLE_PHASE.TYPING,
    TITLE_PHASE.RESOLVING,
    TITLE_PHASE.COMPLETED,
  ])
  assert.deepEqual(indicators, [
    TITLE_INDICATOR_STATE.BAR,
    TITLE_INDICATOR_STATE.COMPRESSED,
    TITLE_INDICATOR_STATE.BAR,
    TITLE_INDICATOR_STATE.DOT,
    TITLE_INDICATOR_STATE.HIDDEN,
  ])
  assert.deepEqual(delays, [
    TITLE_START_DELAY_MS,
    ...TITLE_GRAPHEME_DELAYS_MS.slice(0, 4),
    TITLE_PUNCTUATION_COMPRESS_MS,
    TITLE_GRAPHEME_DELAYS_MS[4],
    ...TITLE_GRAPHEME_DELAYS_MS.slice(5),
    TITLE_FINAL_HOLD_MS,
    TITLE_AUTH_HANDOFF_DELAY_MS,
    TITLE_INDICATOR_HIDE_DELAY_MS,
    TITLE_COMPLETE_DELAY_MS,
  ])
  assert.equal(authReadyCount, 1)
  assert.equal(completionCount, 1)
})

test('completion and scheduler failures enter the static lifecycle while static conditions skip animation', () => {
  const scheduler = createManualScheduler()
  const frames = []
  const phases = []
  const indicators = []
  let authReadyCount = 0
  let completionCount = 0
  const animation = createTitleAnimation({
    text: '欢迎回家，漂泊者',
    onFrame: (frame) => frames.push(frame),
    onPhaseChange: (phase) => phases.push(phase),
    onIndicatorChange: (state) => indicators.push(state),
    onAuthReady: () => { authReadyCount += 1 },
    onComplete: () => { completionCount += 1 },
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
  })

  animation.start()
  animation.complete()
  animation.complete()

  assert.deepEqual(frames, ['', '欢迎回家，漂泊者'])
  assert.deepEqual(phases, [TITLE_PHASE.TYPING, TITLE_PHASE.STATIC])
  assert.deepEqual(indicators, [TITLE_INDICATOR_STATE.BAR, TITLE_INDICATOR_STATE.HIDDEN])
  assert.equal(authReadyCount, 1)
  assert.equal(completionCount, 1)
  assert.equal(shouldAnimateTitle({ reduceMotion: false, compactViewport: false, documentHidden: false }), true)
  assert.equal(shouldAnimateTitle({ reduceMotion: true, compactViewport: false, documentHidden: false }), false)
  assert.equal(shouldAnimateTitle({ reduceMotion: false, compactViewport: true, documentHidden: false }), false)
  assert.equal(shouldAnimateTitle({ reduceMotion: false, compactViewport: false, documentHidden: true }), false)

  const failureFrames = []
  const failurePhases = []
  const failureIndicators = []
  let failureAuthReadyCount = 0
  let failureCompletionCount = 0
  const failingAnimation = createTitleAnimation({
    text: '欢迎回家，漂泊者',
    onFrame: (frame) => failureFrames.push(frame),
    onPhaseChange: (phase) => failurePhases.push(phase),
    onIndicatorChange: (state) => failureIndicators.push(state),
    onAuthReady: () => { failureAuthReadyCount += 1 },
    onComplete: () => { failureCompletionCount += 1 },
    schedule: () => { throw new Error('timer unavailable') },
    cancel: () => {},
  })
  failingAnimation.start()

  assert.deepEqual(failureFrames, ['', '欢迎回家，漂泊者'])
  assert.deepEqual(failurePhases, [TITLE_PHASE.TYPING, TITLE_PHASE.STATIC])
  assert.deepEqual(failureIndicators, [TITLE_INDICATOR_STATE.BAR, TITLE_INDICATOR_STATE.HIDDEN])
  assert.equal(failureAuthReadyCount, 1)
  assert.equal(failureCompletionCount, 1)
})
