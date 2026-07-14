import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildSampleStageProgress,
  buildSampleStageAxisRows,
  buildSortedStatFrequency,
  statDiagnosticClass,
  statsReliabilityNote,
  statsReliabilityText,
} from './presentation.js'

test('statistics presentation sorts rows by absolute baseline deviation', () => {
  const rows = buildSortedStatFrequency({
    substat_frequency: {
      low: { substat_type: 'low', observed_rate: 0.08, baseline_rate: 0.1 },
      high: { substat_type: 'high', observed_rate: 0.2, baseline_rate: 0.1 },
    },
  })

  assert.equal(rows[0].substat_type, 'high')
  assert.equal(rows[0].deviation, 0.1)
  assert.equal(statDiagnosticClass(rows[0]), 'hot')
  assert.equal(statDiagnosticClass(rows[1]), 'cool')
})

test('statistics presentation maps sample reliability and current stage', () => {
  assert.equal(statsReliabilityText(0), '起步观察')
  assert.equal(statsReliabilityText(3000), '可作参考')
  assert.equal(statsReliabilityText(50000), '可优化权重')
  assert.equal(statsReliabilityNote(0), '基于 0 条样本，当前偏差仅作趋势提示。')
  assert.equal(statsReliabilityNote(130), '基于 130 条样本，当前偏差仅作趋势提示。')
  assert.equal(statsReliabilityNote(500), '基于 500 条样本，偏差可作初步参考。')
  assert.equal(statsReliabilityNote(3000), '基于 3000 条样本，偏差可辅助判断，极端值仍需保守看待。')
  assert.equal(statsReliabilityNote(10000), '基于 10000 条样本，偏差趋势可作为长期观察依据。')
  assert.equal(statsReliabilityNote(50000), '基于 50000 条样本，可进入长期权重优化。')

  const stages = buildSampleStageAxisRows(3200)
  assert.equal(stages.find((stage) => stage.current)?.label, '3000')
})

test('statistics presentation maps sample progress on a quantity-weighted axis', () => {
  const progress = buildSampleStageProgress(36)

  assert.equal(progress.currentStage.label, '0')
  assert.equal(progress.nextStage.label, '500')
  assert.equal(progress.remainingToNext, 464)
  assert.equal(progress.stageProgress, 36 / 500)
  assert.equal(progress.axisProgress, 36 / 500 * 0.1)

  const stages = buildSampleStageAxisRows(36)
  assert.deepEqual(stages.map((stage) => stage.displayLabel), ['0', '500', '3000', '10000', '50000'])
  assert.deepEqual(stages.map((stage) => Number(stage.axisProgress.toFixed(3))), [0, 0.1, 0.245, 0.447, 1])
  assert.deepEqual(
    stages.filter((stage) => stage.showCaption).map((stage) => Number(stage.captionProgress.toFixed(3))),
    [0.05, 0.172, 0.346, 0.724],
  )
  assert.equal(stages.at(-1).showCaption, false)
})
