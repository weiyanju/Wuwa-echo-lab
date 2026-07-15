import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('evaluation overview owns fusion status and summary presentation', async () => {
  const source = await readFile(new URL('./EvaluationOverview.vue', import.meta.url), 'utf8')

  assert.match(source, /evaluation: \{ type: Object, default: null \}/)
  assert.match(source, /modelDetails: \{ type: Array, default: \(\) => \[\] \}/)
  assert.match(source, /prediction: \{ type: Object, default: null \}/)
  assert.match(source, /const weightRows = computed/)
  assert.match(source, /weight <= ACTIVE_MODEL_WEIGHT_EPSILON/)
  assert.match(source, /const evaluationSummaryParts = computed/)
  assert.match(source, /const highlightedSummaryModelKey = ref\(null\)/)
  assert.match(source, /class="evaluation-card evaluation-module evaluation-fusion-module"/)
  assert.match(source, /class="evaluation-module-header"/)
  assert.match(source, /class="fusion-weight-grid"/)
  assert.match(source, /class="evaluation-summary-line"/)
  assert.doesNotMatch(source, /class="evaluation-status-bar"/)
  assert.doesNotMatch(source, /stats: \{ type: Object/)
})

test('fusion weight overview excludes first-choice markers while backtest keeps hit-rate evaluation', async () => {
  const overviewSource = await readFile(new URL('./EvaluationOverview.vue', import.meta.url), 'utf8')
  const backtestSource = await readFile(new URL('./EvaluationBacktest.vue', import.meta.url), 'utf8')
  const coreSource = await readFile(new URL('./EvaluationCoreBacktest.vue', import.meta.url), 'utf8')
  const evaluationStyles = await readFile(new URL('../../styles/features/evaluation.css', import.meta.url), 'utf8')

  assert.doesNotMatch(overviewSource, /legend-hit-triangle|hit-marker|首选回测|首选命中率/)
  assert.doesNotMatch(evaluationStyles, /\.legend-hit-triangle|\.hit-marker/)
  assert.match(coreSource, /aria-label="首选到前五预测范围命中率"/)
  assert.match(backtestSource, /model\.adjustment\?\.hit_rate/)
})
