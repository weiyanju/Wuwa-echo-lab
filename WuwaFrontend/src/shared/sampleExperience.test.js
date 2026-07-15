import assert from 'node:assert/strict'
import test from 'node:test'

import {
  EMPTY_METRIC_TEXT,
  EVALUATION_READY_TARGET,
  evaluationReadinessState,
  formatOptionalMetric,
  hasRecordedSamples,
  sampleMaturityState,
  sampleStageState,
  sampleTotal,
} from './sampleExperience.js'

test('sample maturity has one boundary mapping for statistics and evaluation', () => {
  assert.deepEqual(
    [0, 1, 499, 500, 2999, 3000, 9999, 10000, 49999, 50000].map(
      (total) => sampleMaturityState(total).label,
    ),
    [
      '待录入',
      '起步观察',
      '起步观察',
      '初步观察',
      '初步观察',
      '可作参考',
      '可作参考',
      '稳定观察',
      '稳定观察',
      '可优化权重',
    ],
  )
  assert.equal(sampleMaturityState(0).tone, 'neutral')
  assert.equal(sampleMaturityState(1).tone, 'active')
})

test('sample counts normalize missing and negative values without inventing samples', () => {
  assert.equal(sampleTotal(), 0)
  assert.equal(sampleTotal({ total_rolls: -3 }), 0)
  assert.equal(sampleTotal({ total_rolls: 7.9 }), 7)
  assert.equal(hasRecordedSamples({ total_rolls: 0 }), false)
  assert.equal(hasRecordedSamples({ total_rolls: 1 }), true)
})

test('sample stages expose a known range even before the first sample', () => {
  assert.equal(sampleStageState(0).rangeLabel, '0–500 条')
  assert.equal(sampleStageState(499).rangeLabel, '0–500 条')
  assert.equal(sampleStageState(500).rangeLabel, '500–3000 条')
  assert.equal(sampleStageState(50000).rangeLabel, '50000+ 条')
})

test('evaluation readiness is independent from sample maturity', () => {
  assert.deepEqual(evaluationReadinessState({ status: 'insufficient_data', evaluated_count: 0 }), {
    key: 'empty', ready: false, evaluated: 0, target: EVALUATION_READY_TARGET, progress: 0,
  })
  assert.deepEqual(evaluationReadinessState({ status: 'insufficient_data', evaluated_count: 7 }), {
    key: 'collecting', ready: false, evaluated: 7, target: EVALUATION_READY_TARGET, progress: 0.35,
  })
  assert.equal(evaluationReadinessState({ status: 'ready', evaluated_count: 20 }).ready, true)
})

test('optional metrics distinguish a real zero from an uncomputed value', () => {
  assert.equal(formatOptionalMetric(0, (value) => `${value}%`), '0%')
  assert.equal(formatOptionalMetric(null, (value) => `${value}%`), EMPTY_METRIC_TEXT)
  assert.equal(formatOptionalMetric(undefined), EMPTY_METRIC_TEXT)
  assert.equal(formatOptionalMetric(Number.NaN), EMPTY_METRIC_TEXT)
})
