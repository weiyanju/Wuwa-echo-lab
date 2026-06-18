import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('evaluation backtest owns model detail interactions and cleanup', async () => {
  const source = await readFile(new URL('./EvaluationBacktest.vue', import.meta.url), 'utf8')
  const appSource = await readFile(new URL('../../App.vue', import.meta.url), 'utf8')

  assert.match(source, /evaluation: \{ type: Object, default: null \}/)
  assert.match(source, /modelDetails: \{ type: Array, default: \(\) => \[\] \}/)
  assert.match(source, /prediction: \{ type: Object, default: null \}/)
  assert.match(source, /const expandedModelDetailKey = computed/)
  assert.match(source, /function startMarkovAxisDrag\(event\)/)
  assert.match(source, /onBeforeUnmount\(\(\) => \{\s+endMarkovAxisDrag\(\)/)
  assert.match(source, /class="evaluation-grid compact-evaluation-grid evaluation-chart-strip"/)
  assert.match(source, /<Transition name="model-row-detail">/)
  assert.match(appSource, /import EvaluationBacktest from '\.\/features\/evaluation\/EvaluationBacktest\.vue'/)
  assert.match(appSource, /<EvaluationBacktest[\s\S]+:model-details="modelDetailCards"/)
})
