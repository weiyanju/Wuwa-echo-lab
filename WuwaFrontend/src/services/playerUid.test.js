import assert from 'node:assert/strict'
import test from 'node:test'

import * as playerUid from './playerUid.js'

test('normalizes uid input to digits only without truncating', () => {
  assert.equal(playerUid.normalizePlayerUid(' UID 123 456 789 0 '), '1234567890')
})

test('accepts only exactly nine ASCII digits after normalization', () => {
  assert.equal(playerUid.isValidPlayerUid('123 456 789'), true)
  assert.equal(playerUid.isValidPlayerUid('12345678'), false)
  assert.equal(playerUid.isValidPlayerUid('1234567890'), false)
  assert.equal(playerUid.isValidPlayerUid('١٢٣٤٥٦٧٨٩'), false)
})

test('does not expose a local recent uid list API', () => {
  assert.equal('readRecentPlayerUids' in playerUid, false)
  assert.equal('addRecentPlayerUid' in playerUid, false)
})
