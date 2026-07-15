import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('evaluation backtest owns model detail interactions and cleanup', async () => {
  const source = await readFile(new URL('./EvaluationBacktest.vue', import.meta.url), 'utf8')

  assert.match(source, /evaluation: \{ type: Object, default: null \}/)
  assert.match(source, /modelDetails: \{ type: Array, default: \(\) => \[\] \}/)
  assert.match(source, /prediction: \{ type: Object, default: null \}/)
  assert.match(source, /const expandedModelDetailKey = computed/)
  assert.match(source, /function startMarkovAxisDrag\(event\)/)
  assert.match(source, /onBeforeUnmount\(\(\) => \{\s+endMarkovAxisDrag\(\)/)
  assert.match(source, /class="evaluation-card evaluation-module model-backtest-card"/)
  assert.doesNotMatch(source, /<h3>核心回测<\/h3>/)
  assert.doesNotMatch(source, /class="evaluation-grid compact-evaluation-grid evaluation-chart-strip"/)
  assert.match(source, /<Transition name="model-row-detail">/)
})

test('submodel diagnostics start collapsed and keep one selected row', async () => {
  const source = await readFile(new URL('./EvaluationBacktest.vue', import.meta.url), 'utf8')

  assert.match(source, /const selectedModelDetailKey = ref\(null\)/)
  assert.match(source, /const expandedModelDetailKey = computed\(\(\) => \{/)
  assert.match(source, /return selectedRow \? selectedKey : null/)
  assert.match(source, /selectedModelDetailKey\.value = expandedModelDetailKey\.value === key \? null : key/)
  assert.doesNotMatch(source, /defaultExpandedModelDetailKey/)
  assert.doesNotMatch(source, /collapsedModelDetailKeys/)
  assert.doesNotMatch(source, /hasManualModelDetailInteraction/)
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

test('submodel module uses flat disclosure rows inside one shell', async () => {
  const layoutStyle = await readFile(new URL('../../styles/features/evaluation-layout.css', import.meta.url), 'utf8')

  assert.match(layoutStyle, /\.model-backtest-card \.model-bars \{[^}]*gap: 0;[^}]*overflow: hidden;/)
  assert.match(layoutStyle, /\.model-backtest-card \.model-bars article[^}]*\{[^}]*border: 0;[^}]*border-radius: 0;[^}]*background: transparent;/)
})

test('submodel disclosure focus ring stays inside the clipped list shell', async () => {
  const layoutStyle = await readFile(new URL('../../styles/features/evaluation-layout.css', import.meta.url), 'utf8')

  assert.match(layoutStyle, /\.model-backtest-card \.model-bar-summary:focus-visible \{[^}]*outline-offset: -3px;/)
})
