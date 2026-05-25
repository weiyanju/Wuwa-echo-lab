import assert from 'node:assert/strict'
import test from 'node:test'

import { displayEchoNumericId, generateNumericEchoUid } from './echoId.js'

test('generates a short numeric echo id from uid and echo config', () => {
  const id = generateNumericEchoUid({
    playerUid: '123456',
    sonataId: 1,
    cost: 4,
    mainStat: 'crit_rate',
    sequence: 1,
  })

  assert.equal(id, '456014060001')
  assert.match(id, /^\d{12}$/)
})

test('pads missing uid and sequence parts to keep the id numeric and stable length', () => {
  const id = generateNumericEchoUid({
    playerUid: '',
    sonataId: 30,
    cost: 1,
    mainStat: 'atk_percent',
    sequence: 23,
  })

  assert.equal(id, '000301010023')
  assert.match(id, /^\d{12}$/)
})

test('displays numeric echo uid directly and converts legacy ids to the full numeric format', () => {
  assert.equal(displayEchoNumericId({ id: 27, echo_uid: '456014060001' }), '456014060001')
  assert.match(displayEchoNumericId({ id: 27, echo_uid: 'WUWA-123456-S1-4C-CR-mPF4265R' }), /^45601406\d{4}$/)
})
