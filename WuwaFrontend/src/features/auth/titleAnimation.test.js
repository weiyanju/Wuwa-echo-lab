import assert from 'node:assert/strict'
import test from 'node:test'

import {
  TITLE_CHARACTER_INTERVAL_MS,
  TITLE_PUNCTUATION_PAUSE_MS,
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

test('createTitleAnimation emits complete prefixes and completes after the punctuation pause', () => {
  const scheduler = createManualScheduler()
  const frames = []
  let completionCount = 0
  const animation = createTitleAnimation({
    text: '欢迎回家，漂泊者',
    onFrame: (frame) => frames.push(frame),
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
  assert.deepEqual(delays, [
    TITLE_START_DELAY_MS,
    TITLE_CHARACTER_INTERVAL_MS,
    TITLE_CHARACTER_INTERVAL_MS,
    TITLE_CHARACTER_INTERVAL_MS,
    TITLE_CHARACTER_INTERVAL_MS,
    TITLE_CHARACTER_INTERVAL_MS + TITLE_PUNCTUATION_PAUSE_MS,
    TITLE_CHARACTER_INTERVAL_MS,
    TITLE_CHARACTER_INTERVAL_MS,
    TITLE_CHARACTER_INTERVAL_MS,
  ])
  assert.equal(completionCount, 1)
})

test('completion and scheduler failures reveal the full title while static conditions skip animation', () => {
  const scheduler = createManualScheduler()
  const frames = []
  let completionCount = 0
  const animation = createTitleAnimation({
    text: '欢迎回家，漂泊者',
    onFrame: (frame) => frames.push(frame),
    onComplete: () => { completionCount += 1 },
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
  })

  animation.start()
  animation.complete()
  animation.complete()

  assert.deepEqual(frames, ['', '欢迎回家，漂泊者'])
  assert.equal(completionCount, 1)
  assert.equal(shouldAnimateTitle({ reduceMotion: false, compactViewport: false, documentHidden: false }), true)
  assert.equal(shouldAnimateTitle({ reduceMotion: true, compactViewport: false, documentHidden: false }), false)
  assert.equal(shouldAnimateTitle({ reduceMotion: false, compactViewport: true, documentHidden: false }), false)
  assert.equal(shouldAnimateTitle({ reduceMotion: false, compactViewport: false, documentHidden: true }), false)

  const failureFrames = []
  let failureCompletionCount = 0
  const failingAnimation = createTitleAnimation({
    text: '欢迎回家，漂泊者',
    onFrame: (frame) => failureFrames.push(frame),
    onComplete: () => { failureCompletionCount += 1 },
    schedule: () => { throw new Error('timer unavailable') },
    cancel: () => {},
  })
  failingAnimation.start()

  assert.deepEqual(failureFrames, ['', '欢迎回家，漂泊者'])
  assert.equal(failureCompletionCount, 1)
})
