import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('evaluation view owns the result-first task order and app wiring', async () => {
  const source = await readFile(new URL('./EvaluationView.vue', import.meta.url), 'utf8')
  const appSource = await readFile(new URL('../../App.vue', import.meta.url), 'utf8')

  assert.match(source, /import EvaluationCoreBacktest from '\.\/EvaluationCoreBacktest\.vue'/)
  assert.match(source, /import EvaluationOverview from '\.\/EvaluationOverview\.vue'/)
  assert.match(source, /import EvaluationBacktest from '\.\/EvaluationBacktest\.vue'/)
  assert.match(source, /class="product-panel full-panel evaluation-panel"/)
  assert.match(source, /class="evaluation-module-stack"/)

  const coreIndex = source.indexOf('<EvaluationCoreBacktest')
  const fusionIndex = source.indexOf('<EvaluationOverview')
  const modelsIndex = source.indexOf('<EvaluationBacktest')
  assert.ok(coreIndex >= 0 && coreIndex < fusionIndex)
  assert.ok(fusionIndex < modelsIndex)

  assert.match(appSource, /import EvaluationView from '\.\/features\/evaluation\/EvaluationView\.vue'/)
  assert.match(appSource, /<EvaluationView[\s\S]+:model-details="modelDetailCards"/)
  assert.doesNotMatch(appSource, /import EvaluationOverview from/)
  assert.doesNotMatch(appSource, /import EvaluationBacktest from/)
})

test('evaluation task modules use one sibling card boundary each', async () => {
  const core = await readFile(new URL('./EvaluationCoreBacktest.vue', import.meta.url), 'utf8')
  const fusion = await readFile(new URL('./EvaluationOverview.vue', import.meta.url), 'utf8')
  const models = await readFile(new URL('./EvaluationBacktest.vue', import.meta.url), 'utf8')

  assert.match(core, /class="evaluation-card evaluation-module evaluation-core-module"/)
  assert.match(fusion, /class="evaluation-card evaluation-module evaluation-fusion-module"/)
  assert.match(models, /class="evaluation-card evaluation-module model-backtest-card"/)
  assert.doesNotMatch(core, /class="evaluation-card chart-card"/)
  assert.doesNotMatch(models, /class="evaluation-grid compact-evaluation-grid evaluation-chart-strip"/)
})
