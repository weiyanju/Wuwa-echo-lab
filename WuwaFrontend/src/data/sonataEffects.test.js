import assert from 'node:assert/strict'
import { access } from 'node:fs/promises'
import test from 'node:test'

import { sonataEffectNames, sonataEffects } from './sonataEffects.js'

test('sonata effects include the current 3.4 lead set', async () => {
  const leadSet = sonataEffects[0]

  assert.equal(leadSet.id, 32)
  assert.equal(leadSet.name, '碎梦亡鬼之魇')
  assert.equal(leadSet.sourceIcon, 'Common/Image/IconElementAttri/T_IconElementAttriAdam')
  assert.ok(sonataEffectNames.includes('碎梦亡鬼之魇'))

  await access(new URL(`../../public${leadSet.icon}`, import.meta.url))
})

test('sonata effects expose available costs from local echo resources', () => {
  const leadSet = sonataEffects[0]

  assert.deepEqual(leadSet.availableCosts, [4])
  assert.ok(sonataEffects.every((effect) => Array.isArray(effect.availableCosts)))
  assert.ok(sonataEffects.every((effect) => effect.availableCosts.length > 0))
  assert.ok(sonataEffects.every((effect) => effect.availableCosts.every((cost) => [1, 3, 4].includes(cost))))
})
