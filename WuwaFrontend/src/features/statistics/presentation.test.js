import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildSampleStageAxisRows,
  buildSortedStatFrequency,
  statDiagnosticClass,
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

  const stages = buildSampleStageAxisRows(3200)
  assert.equal(stages.find((stage) => stage.current)?.label, '3000')
})
