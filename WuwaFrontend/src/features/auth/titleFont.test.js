import assert from 'node:assert/strict'
import test from 'node:test'

import {
  TITLE_FONT_LOAD_TIMEOUT_MS,
  TITLE_FONT_SHORTHAND,
  createTitleFontPreparation,
} from './titleFont.js'

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
    pendingCount() {
      return jobs.length
    },
  }
}

test('title font preparation loads every face matched by the complete title', async () => {
  const scheduler = createManualScheduler()
  const calls = []
  const preparation = createTitleFontPreparation({
    text: '欢迎回家，漂泊者',
    fontSet: {
      load(font, text) {
        calls.push({ font, text })
        return Promise.resolve([{}, {}, {}, {}, {}, {}])
      },
    },
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
  })

  preparation.start()

  assert.equal(await preparation.ready, true)
  assert.deepEqual(calls, [{
    font: TITLE_FONT_SHORTHAND,
    text: '欢迎回家，漂泊者',
  }])
  assert.equal(scheduler.pendingCount(), 0)
})

test('title font preparation rejects unsupported, empty, and failed loads', async () => {
  const unsupported = createTitleFontPreparation({ text: '标题', fontSet: null })
  unsupported.start()
  assert.equal(await unsupported.ready, false)

  const empty = createTitleFontPreparation({
    text: '标题',
    fontSet: { load: () => Promise.resolve([]) },
  })
  empty.start()
  assert.equal(await empty.ready, false)

  const failed = createTitleFontPreparation({
    text: '标题',
    fontSet: { load: () => { throw new Error('font unavailable') } },
  })
  failed.start()
  assert.equal(await failed.ready, false)
})

test('title font preparation clears its timeout after an asynchronous load rejection', async () => {
  const scheduler = createManualScheduler()
  const preparation = createTitleFontPreparation({
    text: '标题',
    fontSet: { load: () => Promise.reject(new Error('font unavailable')) },
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
  })

  preparation.start()

  assert.equal(scheduler.pendingCount(), 1)
  assert.equal(await preparation.ready, false)
  assert.equal(scheduler.pendingCount(), 0)
})

test('title font preparation starts only one load and timeout job', async () => {
  const scheduler = createManualScheduler()
  let loadCalls = 0
  const preparation = createTitleFontPreparation({
    text: '标题',
    fontSet: {
      load() {
        loadCalls += 1
        return new Promise(() => {})
      },
    },
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
  })

  preparation.start()
  preparation.start()
  preparation.start()

  assert.equal(loadCalls, 1)
  assert.equal(scheduler.pendingCount(), 1)
  preparation.cancel()
  assert.equal(await preparation.ready, false)
})

test('title font preparation times out without accepting a late result', async () => {
  const scheduler = createManualScheduler()
  let resolveLoad
  const preparation = createTitleFontPreparation({
    text: '欢迎回家，漂泊者',
    fontSet: { load: () => new Promise((resolve) => { resolveLoad = resolve }) },
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
  })

  preparation.start()

  assert.deepEqual(scheduler.runAll(), [TITLE_FONT_LOAD_TIMEOUT_MS])
  assert.equal(await preparation.ready, false)
  resolveLoad([{}])
  await Promise.resolve()
  assert.equal(await preparation.ready, false)
})

test('title font preparation cancellation clears its timeout and resolves statically', async () => {
  const scheduler = createManualScheduler()
  const preparation = createTitleFontPreparation({
    text: '欢迎回家，漂泊者',
    fontSet: { load: () => new Promise(() => {}) },
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
  })

  preparation.start()
  preparation.cancel()
  preparation.cancel()

  assert.equal(await preparation.ready, false)
  assert.equal(scheduler.pendingCount(), 0)
})
