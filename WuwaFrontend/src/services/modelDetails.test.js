import assert from 'node:assert/strict'
import test from 'node:test'

import { buildModelDetailCards } from './modelDetails.js'

test('builds large model cards with chart data and disabled context state', () => {
  const cards = buildModelDetailCards({
    prediction: {
      weights: { rule: 0.7, bayes: 0.1, markov: 0.1, cycle: 0.1, context: 0 },
      base_weights: { rule: 0.7, bayes: 0.1, markov: 0.1, cycle: 0.1, context: 0 },
      model_labels: {
        rule: '规则均衡',
        bayes: '周期规律',
        markov: '近期过热',
        cycle: '周期窗口',
        context: '上下文监测',
      },
      candidates: [
        {
          substat_type: 'crit_rate',
          label: '暴击率',
          p_rule: 0.09,
          p_bayes: 0.18,
          p_markov: 0.12,
          p_cycle: 0.2,
          p_context: 0.1,
        },
        {
          substat_type: 'atk_percent',
          label: '攻击百分比',
          p_rule: 0.12,
          p_bayes: 0.1,
          p_markov: 0.11,
          p_cycle: 0.1,
          p_context: 0.1,
        },
      ],
    },
    stats: {
      total_rolls: 128,
      substat_frequency: [
        { substat_type: 'crit_rate', label: '暴击率', observed_rate: 0.14, baseline_rate: 0.08, count: 18 },
        { substat_type: 'atk_percent', label: '攻击百分比', observed_rate: 0.04, baseline_rate: 0.08, count: 5 },
      ],
      context_factors: {
        cost: { status: 'insufficient_data', sample_size: 128 },
        main_stat: { status: 'insufficient_data', sample_size: 128 },
      },
    },
    echoes: [
      { created_at: '2026-05-26T10:00:00Z', substats: [{ substat_type: 'crit_rate' }, { substat_type: 'crit_damage' }] },
      { created_at: '2026-05-26T11:00:00Z', substats: [{ substat_type: 'atk_percent' }] },
    ],
  })

  assert.equal(cards.length, 5)
  assert.deepEqual(cards.map((card) => card.key), ['rule', 'bayes', 'markov', 'cycle', 'context'])
  assert.ok(cards.every((card) => card.bars.length > 0), 'each card exposes chart bars')
  assert.ok(cards.every((card) => card.metrics.length > 0), 'each card exposes summary metrics')
  assert.ok(cards.every((card) => card.tabs.length === 3), 'each card exposes direct tab controls')

  const context = cards.find((card) => card.key === 'context')
  assert.equal(context.status, 'disabled')
  assert.equal(context.statusLabel, '未启用')

  const bayes = cards.find((card) => card.key === 'bayes')
  assert.equal(bayes.segments.length, 2)
  assert.ok(bayes.segments[0].value > bayes.segments[1].value)

  const cycle = cards.find((card) => card.key === 'cycle')
  assert.equal(cycle.windows.length, 4)
  assert.ok(cycle.groupBars.length > 0)
})

test('prefers backend model diagnostics over frontend approximations', () => {
  const cards = buildModelDetailCards({
    prediction: {
      weights: { rule: 0.7, bayes: 0.1, markov: 0.1, cycle: 0.1, context: 0 },
      base_weights: { rule: 0.7, bayes: 0.1, markov: 0.1, cycle: 0.1, context: 0 },
      candidates: [{ substat_type: 'crit_rate', label: '暴击率', p_rule: 0.1, p_bayes: 0.2, p_markov: 0.1, p_cycle: 0.3 }],
      model_diagnostics: {
        summary: {
          dominant_model: 'rule',
          auxiliary_models: ['cycle', 'bayes'],
          context_status: 'disabled',
          confidence_note: '低样本阶段，结论偏观察',
        },
        bayes: { exact_weight: 0.62, wildcard_weight: 0.38, alpha: 2.5, player_note: '精确片段仍然主导。' },
        markov: {
          recent_sequence: [
            { substat_type: 'crit_rate', label: '暴击率' },
            { substat_type: 'flat_atk', label: '攻击固定值' },
          ],
          recent_counts: {
            crit_rate: { label: '暴击率', value: 4 },
          },
          penalties: {
            crit_rate: { label: '暴击率', value: 0.42 },
          },
          player_note: '暴击率近期偏热。',
        },
        cycle: {
          windows: { double: 0.4, single_rate: 0.2, single_damage: 0.15, cooldown: 0.25 },
          group_scores: { attack: 0.34, hp: 0.12, defense: 0.14, damage_bonus: 0.26, energy: 0.14 },
          player_note: '当前更接近双爆窗口。',
        },
        context: {
          status: 'disabled',
          sample_size: 128,
          recommended_samples: 3000,
          factors: {
            set_name: { label: '套装', status: 'insufficient_data', sample_size: 128 },
          },
        },
      },
    },
    stats: { total_rolls: 128, substat_frequency: {}, context_factors: {} },
  })

  assert.equal(cards.summary.dominantModel, 'rule')
  assert.deepEqual(cards.summary.auxiliaryModels, ['cycle', 'bayes'])
  assert.equal(cards.find((card) => card.key === 'bayes').segments[1].value, 0.38)
  assert.equal(cards.find((card) => card.key === 'cycle').windows[0].value, 0.4)
  const markov = cards.find((card) => card.key === 'markov')
  assert.equal(markov.penaltyBars[0].value, 0.42)
  assert.deepEqual(markov.recentSequence.map((item) => item.type), ['crit_rate', 'flat_atk'])
  assert.deepEqual(markov.timelineNodes.map((item) => item.type), ['flat_atk', 'crit_rate'])
  assert.deepEqual(markov.timelineNodes.map((item) => item.index), [0, 1])
  assert.deepEqual(markov.timelineNodes.map((item) => item.track), ['upper', 'lower'])
  assert.deepEqual(markov.timelineNodes.map((item) => item.progress), [0, 1])
  assert.equal(cards.find((card) => card.key === 'context').contextChecks[0].recommended, 3000)
})

test('accepts backend stats maps for substat frequency', () => {
  const cards = buildModelDetailCards({
    prediction: {
      weights: { rule: 0.7, bayes: 0.1, markov: 0.1, cycle: 0.1, context: 0 },
      base_weights: { rule: 0.7, bayes: 0.1, markov: 0.1, cycle: 0.1, context: 0 },
      candidates: [{ substat_type: 'crit_rate', label: '暴击率', p_rule: 0.1 }],
    },
    stats: {
      substat_frequency: {
        crit_rate: { substat_type: 'crit_rate', label: '暴击率', observed_rate: 0.14, baseline_rate: 0.08 },
        flat_atk: { substat_type: 'flat_atk', label: '攻击固定值', observed_rate: 0.02, baseline_rate: 0.08 },
      },
      context_factors: {},
    },
  })

  const rule = cards.find((card) => card.key === 'rule')
  assert.equal(rule.bars.length, 2)
  assert.ok(Math.abs(rule.metrics.find((metric) => metric.label === '最大偏差').value - 0.06) < 0.0001)
})
