import assert from 'node:assert/strict'
import test from 'node:test'
import { echoConfigMatches, formatConfigCreationNotice } from './echoConfigCreation.js'

test('echo config matching compares the persisted config fields', () => {
  const echo = { set_name: '碎梦亡鬼之魇', cost: 4, main_stat: 'atk_percent' }
  assert.equal(echoConfigMatches(echo, { sonata: '碎梦亡鬼之魇', cost: '4', main_stat: 'atk_percent' }), true)
  assert.equal(echoConfigMatches(echo, { sonata: '碎梦亡鬼之魇', cost: 3, main_stat: 'atk_percent' }), false)
})

test('config creation notice uses the user-facing main stat label', () => {
  assert.equal(formatConfigCreationNotice({
    sonata: '碎梦亡鬼之魇',
    cost: 4,
    main_stat: 'atk_percent',
  }), '已新建：碎梦亡鬼之魇 · COST 4 · 攻击百分比')
})
