import assert from 'node:assert/strict'
import test from 'node:test'
import { validateUidBinding } from './uidBinding.js'

const UID_ERROR = '请输入 9 位数字 UID。'

test('uid binding normalizes mixed input and accepts exactly nine digits', () => {
  assert.deepEqual(validateUidBinding('UID 123-456-789'), { uid: '123456789', error: '' })
})

test('uid binding rejects invalid lengths without truncating', () => {
  assert.deepEqual(validateUidBinding('12345678'), { uid: '12345678', error: UID_ERROR })
  assert.deepEqual(validateUidBinding('1234567890'), { uid: '1234567890', error: UID_ERROR })
})

test('uid binding rejects full-width digits', () => {
  assert.deepEqual(validateUidBinding('１２３４５６７８９'), { uid: '', error: UID_ERROR })
})
