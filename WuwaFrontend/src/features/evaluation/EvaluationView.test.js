import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('evaluation uses shared maturity and keeps readiness inside the page', async () => {
  const source = await readFile(new URL('./EvaluationView.vue', import.meta.url), 'utf8')
  assert.match(source, /sampleMaturityState\(totalSamples\.value\)/)
  assert.match(source, /sampleStageState\(totalSamples\.value\)/)
  assert.match(source, /evaluationReadinessState\(props\.evaluation\)/)
  assert.match(source, /\{\{ maturity\.label \}\}/)
  assert.match(source, /<i v-if="maturity\.hasSamples" aria-hidden="true"><\/i>/)
  assert.doesNotMatch(source, /function evaluationStatusText/)
  assert.doesNotMatch(source, /'观察中'|'可参考'|'稳定'/)
})

test('evaluation hides result modules until the backend marks evaluation ready', async () => {
  const source = await readFile(new URL('./EvaluationView.vue', import.meta.url), 'utf8')
  const readinessSource = await readFile(new URL('./EvaluationReadinessState.vue', import.meta.url), 'utf8').catch(() => '')
  const stackIndex = source.indexOf('v-else-if="readiness.ready" class="evaluation-module-stack"')
  const readinessIndex = source.indexOf('<EvaluationReadinessState')
  assert.ok(stackIndex >= 0 && readinessIndex > stackIndex)
  assert.match(source, /import EvaluationReadinessState from '\.\/EvaluationReadinessState\.vue'/)
  assert.match(source, /<EvaluationReadinessState[\s\S]+@start-recording="emit\('start-recording'\)"/)
  const readinessElement = source.match(/<EvaluationReadinessState[\s\S]*?\/>/)?.[0] || ''
  assert.doesNotMatch(readinessElement, /:evaluation=/)
  assert.match(readinessSource, /class="sample-activation-state evaluation-readiness-state"/)
  assert.match(readinessSource, /积累历史后自动开启模型评估/)
  assert.match(readinessSource, /先建立 20 条上下文，再积累 20 条有效回测。/)
  assert.match(readinessSource, /class="button-primary sample-activation-action"/)
  assert.doesNotMatch(readinessSource, /评估准备|evaluation-readiness-steps|当前预测仍由规则基线提供|进行中|等待中/)
  assert.doesNotMatch(source, /<SampleReadinessPanel/)
})

test('evaluation zero state uses one centered blue action on a quiet task surface', async () => {
  const sharedStyles = await readFile(new URL('../../styles/sample-readiness.css', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../../styles/features/evaluation.css', import.meta.url), 'utf8')
  const layoutStyles = await readFile(new URL('../../styles/features/evaluation-layout.css', import.meta.url), 'utf8')
  const emptyOwnerRule = layoutStyles.match(/^\.product-panel\.evaluation-panel--empty \{([^}]+)\}/m)?.[1] || ''

  assert.match(sharedStyles, /\.sample-activation-action\s*\{[^}]*background: var\(--primary\);/s)
  assert.match(emptyOwnerRule, /border: 1px solid/)
  assert.match(emptyOwnerRule, /background: #fbfcfe/)
  assert.doesNotMatch(styles, /evaluation-readiness-(?:step|steps|index|status)/)
})

test('unavailable evaluation metrics use a numeric placeholder instead of a semantic error', async () => {
  const source = await readFile(new URL('./EvaluationView.vue', import.meta.url), 'utf8')
  assert.match(source, /EMPTY_METRIC_TEXT/)
  assert.match(source, /formatOptionalMetric/)
  assert.match(source, /page-summary-chip__value--empty/)
  assert.match(source, /前三命中率尚未形成/)
  assert.doesNotMatch(source, /return metric\?\.value == null \? '样本不足'/)
})

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

test('evaluation header exposes the shared accessible summary group', async () => {
  const source = await readFile(new URL('./EvaluationView.vue', import.meta.url), 'utf8')

  assert.match(source, /class="page-summary-chips" role="group" aria-label="评估摘要"/)
  assert.equal((source.match(/class="page-summary-chip(?: page-summary-chip--state)?"/g) || []).length, 3)
  assert.equal((source.match(/class="page-summary-chip__value"/g) || []).length, 2)
  assert.equal((source.match(/v-if="maturity\.hasSamples" class="page-summary-chip"/g) || []).length, 2)
})
