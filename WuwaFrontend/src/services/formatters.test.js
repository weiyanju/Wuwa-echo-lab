import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import test from 'node:test'

import { mainStatsByCost, substatLabels, substatOrder, tierTables } from '../data/substats.js'
import { sonataEffects, sonataEffectsSource } from '../data/sonataEffects.js'
import { confidenceText, formatPercent, formatSignedPercent, formatSubstatTierValue, modelWeightLabel, sampleStageText, statusText } from './formatters.js'

test('formats probabilities as readable percentages', () => {
  assert.equal(formatPercent(0.1234), '12.34%')
  assert.equal(formatPercent(0), '0.00%')
  assert.equal(formatPercent(null), '0.00%')
})

test('formats signed baseline deviations', () => {
  assert.equal(formatSignedPercent(0.0123), '+1.23%')
  assert.equal(formatSignedPercent(-0.004), '-0.40%')
  assert.equal(formatSignedPercent(0), '+0.00%')
})

test('formats substat tier values by stat unit type', () => {
  assert.equal(formatSubstatTierValue('crit_rate', 6.3), '6.3%')
  assert.equal(formatSubstatTierValue('skill_damage', 6.4), '6.4%')
  assert.equal(formatSubstatTierValue('energy_regen', 6.8), '6.8%')
  assert.equal(formatSubstatTierValue('flat_atk', 30), '30')
  assert.equal(formatSubstatTierValue('flat_hp', 320), '320')
  assert.equal(formatSubstatTierValue('flat_def', 40), '40')
})

test('maps model status and confidence to Chinese labels', () => {
  assert.equal(confidenceText('low'), '低')
  assert.equal(confidenceText('medium'), '中')
  assert.equal(statusText('monitoring'), '监控中')
  assert.equal(statusText('unknown'), 'unknown')
})

test('maps internal model weight keys to user-facing labels', () => {
  assert.equal(modelWeightLabel('rule'), '规则均衡')
  assert.equal(modelWeightLabel('bayes'), '周期规律')
  assert.equal(modelWeightLabel('markov'), '近期序列')
  assert.equal(modelWeightLabel('context'), '上下文监测')
  assert.equal(modelWeightLabel('unknown'), 'unknown')
})

test('formats sample stage objects without losing sample ranges', () => {
  assert.equal(sampleStageText({ key: 'recording', label: '0-500 条：规则基线主导' }), '0-500 条：规则基线主导')
  assert.equal(sampleStageText(null), '暂无样本阶段')
})

test('contains 13 independent substat types with clickable tier tables', () => {
  assert.equal(substatOrder.length, 13)
  assert.equal(new Set(substatOrder).size, 13)
  assert.equal(substatLabels.basic_attack_damage, '普攻伤害加成')
  assert.equal(substatLabels.skill_damage, '共鸣技能伤害加成')
  assert.equal(substatLabels.heavy_attack_damage, '重击伤害加成')
  assert.equal(substatLabels.liberation_damage, '共鸣解放伤害加成')
  assert.equal(substatLabels.atk_percent, '攻击百分比')
  assert.equal(substatLabels.hp_percent, '生命百分比')

  for (const substatType of substatOrder) {
    assert.ok(Array.isArray(tierTables[substatType]), substatType)
    assert.ok(tierTables[substatType].length >= 4, substatType)
    assert.ok(tierTables[substatType].every((tier) => typeof tier.value === 'number'), substatType)
    assert.ok(tierTables[substatType].every((tier) => typeof tier.probability === 'number'), substatType)
  }
})

test('allows hp percent as a 3 cost main stat', () => {
  assert.ok(mainStatsByCost[3].includes('hp_percent'))
})

test('preserves manual rounded probability sums instead of forcing one', () => {
  const flatHpTotal = tierTables.flat_hp.reduce((sum, tier) => sum + tier.probability, 0)
  const energyTotal = tierTables.energy_regen.reduce((sum, tier) => sum + tier.probability, 0)

  assert.equal(Math.round(flatHpTotal * 1000) / 1000, 1.002)
  assert.equal(Math.round(energyTotal * 1000) / 1000, 1.001)
})

test('stores current visible sonata effects with local icons', () => {
  assert.equal(sonataEffectsSource.url, 'https://wuwa.wiki/zh-hans/codex/sonataeffects')
  assert.equal(sonataEffects.length, 30)
  assert.equal(sonataEffects[0].name, '剪心辑梦之影')
  assert.equal(sonataEffects.at(-1).name, '凝夜白霜')
  assert.ok(sonataEffects.some((effect) => effect.name === '啸谷长风'))
  assert.ok(sonataEffects.every((effect) => existsSync(`public${effect.icon}`)))
})
