import assert from 'node:assert/strict'
import test from 'node:test'

import { addRecentPlayerUid, normalizePlayerUid, readRecentPlayerUids } from './playerUid.js'

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null
    },
    setItem(key, value) {
      data.set(key, String(value))
    },
  }
}

test('normalizes uid input to digits only', () => {
  assert.equal(normalizePlayerUid('  UID 123 456  '), '123456')
})

test('stores recent player uids with the newest first and no duplicates', () => {
  const storage = memoryStorage({ 'wuwa-recent-player-uids': JSON.stringify(['123456', '987654']) })

  const nextUids = addRecentPlayerUid('987654', storage)

  assert.deepEqual(nextUids, ['987654', '123456'])
  assert.deepEqual(readRecentPlayerUids(storage), ['987654', '123456'])
})

test('keeps at most five valid recent player uids', () => {
  const storage = memoryStorage({
    'wuwa-recent-player-uids': JSON.stringify(['111111', 'bad uid', '222222', '333333', '444444', '555555']),
  })

  const nextUids = addRecentPlayerUid('666666', storage)

  assert.deepEqual(nextUids, ['666666', '111111', '222222', '333333', '444444'])
})
