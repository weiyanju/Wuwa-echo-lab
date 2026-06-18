import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('evaluation overview owns fusion status and summary presentation', async () => {
  const source = await readFile(new URL('./EvaluationOverview.vue', import.meta.url), 'utf8')
  const appSource = await readFile(new URL('../../App.vue', import.meta.url), 'utf8')

  assert.match(source, /evaluation: \{ type: Object, default: null \}/)
  assert.match(source, /modelDetails: \{ type: Array, default: \(\) => \[\] \}/)
  assert.match(source, /prediction: \{ type: Object, default: null \}/)
  assert.match(source, /stats: \{ type: Object, default: null \}/)
  assert.match(source, /const weightRows = computed/)
  assert.match(source, /weight <= ACTIVE_MODEL_WEIGHT_EPSILON/)
  assert.match(source, /const evaluationSummaryParts = computed/)
  assert.match(source, /const highlightedSummaryModelKey = ref\(null\)/)
  assert.match(source, /class="fusion-weight-grid"/)
  assert.match(source, /class="evaluation-summary-line"/)
  assert.match(appSource, /import EvaluationOverview from '\.\/features\/evaluation\/EvaluationOverview\.vue'/)
  assert.match(appSource, /<EvaluationOverview[\s\S]+:model-details="modelDetailCards"/)
})
