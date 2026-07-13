import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultFloatingHistoryPosition, readFloatingHistoryPosition } from './floatingHistoryPosition.js'

test('a new minimized history panel starts in the desktop bottom-right safe area', () => {
  assert.deepEqual(defaultFloatingHistoryPosition({
    viewportWidth: 1366,
    viewportHeight: 768,
    minimized: true,
  }), { x: 1266, y: 668 })
})

test('the expanded desktop default remains unchanged', () => {
  assert.deepEqual(defaultFloatingHistoryPosition({
    viewportWidth: 1366,
    viewportHeight: 768,
    minimized: false,
  }), { x: 32, y: 150 })
})

test('a saved valid position wins over the safe default', () => {
  assert.deepEqual(readFloatingHistoryPosition({
    storedPosition: '{"x":144,"y":188}',
    viewportWidth: 1366,
    viewportHeight: 768,
    minimized: true,
  }), { x: 144, y: 188 })
})
