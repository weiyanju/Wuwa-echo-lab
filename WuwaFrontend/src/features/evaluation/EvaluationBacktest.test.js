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

test('model detail summary uses one native disclosure button without nested controls', async () => {
  const source = await readFile(new URL('./EvaluationBacktest.vue', import.meta.url), 'utf8')
  const style = await readFile(new URL('../../styles/features/evaluation.css', import.meta.url), 'utf8')

  assert.match(source, /<button\s+class="model-bar-summary"\s+type="button"\s+:aria-expanded="expandedModelDetailKey === row\.key"\s+@click="toggleModelDetail\(row\.key\)"/)
  assert.match(source, /<span class="model-expand-state" aria-hidden="true">/)
  assert.doesNotMatch(source, /class="model-bar-summary"\s+role="button"/)
  assert.doesNotMatch(source, /<button\s+class="model-expand-state"/)
  assert.match(style, /\.model-bars article > \.model-bar-summary \{[\s\S]+border: 0;[\s\S]+background: transparent;[\s\S]+font: inherit;[\s\S]+appearance: none;/)
})

test('dark inline Bayes detail inherits the shared expanded-row surface', async () => {
  const style = await readFile(new URL('../../styles/features/evaluation.css', import.meta.url), 'utf8')

  assert.match(
    style,
    /\.app-shell\.theme-dark \.model-row-detail \.model-chart-bayes \{[^}]*border: 0;[^}]*border-radius: 0;[^}]*padding: 0;[^}]*background: transparent;[^}]*\}/,
  )
  assert.match(
    style,
    /\.app-shell\.theme-dark \.model-row-detail \.bayes-contribution-chart \{[^}]*background: transparent;[^}]*\}/,
  )
})
