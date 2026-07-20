import assert from 'node:assert/strict'
import { access } from 'node:fs/promises'
import test from 'node:test'

import sonataEchoes from './sonataEchoes.raw.json' with { type: 'json' }
import { sonataEffectNames, sonataEffects } from './sonataEffects.js'

test('sonata effects include the current 3.5 lead set', async () => {
  const leadSet = sonataEffects[0]

  assert.equal(leadSet.id, 35)
  assert.equal(leadSet.name, '冥途夜行之灯')
  assert.equal(leadSet.sourceIcon, 'Common/Image/IconElementAttri/T_IconElementAttriJingran')
  assert.ok(sonataEffectNames.includes('羽落空尘之歌'))
  assert.ok(sonataEffectNames.includes('清邪荡煞之心'))
  assert.ok(sonataEffectNames.includes('冥途夜行之灯'))

  await access(new URL(`../../public${leadSet.icon}`, import.meta.url))
})

test('sonata effects expose available costs from local echo resources', () => {
  const leadSet = sonataEffects[0]

  assert.deepEqual(leadSet.availableCosts, [1, 3, 4])
  assert.ok(sonataEffects.every((effect) => Array.isArray(effect.availableCosts)))
  assert.ok(sonataEffects.every((effect) => effect.availableCosts.length > 0))
  assert.ok(sonataEffects.every((effect) => effect.availableCosts.every((cost) => [1, 3, 4].includes(cost))))
})

test('sonata echo resources include the 3.5 set echoes grouped by cost', () => {
  const newSet = sonataEchoes.sets.find((set) => set.id === 35)

  assert.equal(newSet.name, '冥途夜行之灯')
  assert.deepEqual(Object.keys(newSet.echoesByCost), ['cost4', 'cost3', 'cost1'])
  assert.deepEqual(newSet.echoesByCost.cost4.map((echo) => echo.name), ['万囮牢·朽躯'])
  assert.deepEqual(newSet.echoesByCost.cost3.map((echo) => echo.name), ['霁息兽尊', '封庭械囿'])
  assert.deepEqual(newSet.echoesByCost.cost1.map((echo) => echo.name), [
    '瓷庭候',
    '石庭候',
    '心傀·悲',
    '心傀·恐',
  ])
  assert.ok(newSet.echoesByCost.cost4.every((echo) => echo.image.endsWith('.avif')))
})
