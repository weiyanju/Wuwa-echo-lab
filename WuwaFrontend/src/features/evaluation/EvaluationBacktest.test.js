import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

function cssRuleBodies(source, selector) {
  const bodies = []
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g

  for (const match of source.matchAll(rulePattern)) {
    const selectors = match[1].split(',').map((item) => item.trim())
    if (selectors.includes(selector)) {
      bodies.push(match[2])
    }
  }

  return bodies
}

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
  assert.match(source, /<Transition name="model-row-detail"/)
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

  assert.match(source, /<button\s+class="model-bar-summary"\s+type="button"\s+:aria-expanded="expandedModelDetailKey === row\.key"\s+@click="toggleModelDetail\(row\.key, \$event\)"/)
  assert.match(source, /<span class="model-expand-state" aria-hidden="true">/)
  assert.doesNotMatch(source, /class="model-bar-summary"\s+role="button"/)
  assert.doesNotMatch(source, /<button\s+class="model-expand-state"/)
  assert.match(style, /\.model-bars article > \.model-bar-summary \{[\s\S]+border: 0;[\s\S]+background: transparent;[\s\S]+font: inherit;[\s\S]+appearance: none;/)
})

test('visible disclosure rows own state while inline model cards only identify data graphics', async () => {
  const source = await readFile(new URL('./EvaluationBacktest.vue', import.meta.url), 'utf8')
  const style = await readFile(new URL('../../styles/features/evaluation.css', import.meta.url), 'utf8')

  assert.match(
    source,
    /:class="\{ best: row\.isBest, expanded: expandedModelDetailKey === row\.key, disabled: row\.disabled \}"/,
  )
  assert.match(source, /class="model-row-detail"/)
  assert.match(source, /class="model-insight-card inline-model-insight"/)
  assert.match(source, /:class="modelInsightClass\(model\)"/)
  assert.match(style, /\.model-row-detail \.model-insight-card \{[^}]*background: transparent;/)
  assert.doesNotMatch(source, /--model-surface-accent/)
})

test('best submodel removes the visual badge while retaining accessible context', async () => {
  const source = await readFile(new URL('./EvaluationBacktest.vue', import.meta.url), 'utf8')
  const style = await readFile(new URL('../../styles/features/evaluation.css', import.meta.url), 'utf8')

  assert.doesNotMatch(source, /<em v-if="row\.isBest">最高命中<\/em>/)
  assert.match(
    source,
    /:aria-label="`\$\{expandedModelDetailKey === row\.key \? '收起' : '展开'\}\$\{row\.label\}详情\$\{row\.isBest \? '，本组最高命中率' : ''\}`"/,
  )
  assert.doesNotMatch(style, /\.model-bar-summary strong em\s*\{/)
  assert.match(
    style,
    /\.model-bar-summary strong \.disabled-model-badge \{[^}]*border: 1px solid/,
  )
})

test('submodel disclosure reveals expansion and preserves collapse position', async () => {
  const source = await readFile(new URL('./EvaluationBacktest.vue', import.meta.url), 'utf8')

  assert.match(source, /import \{ createModelDetailViewportAnchor \} from '\.\/modelDetailViewportAnchor\.js'/)
  assert.match(source, /createModelDetailViewportAnchor\(\{\s+waitForUpdate: nextTick,\s+\}\)/)
  assert.match(source, /function toggleModelDetail\(key, event\)/)
  assert.match(source, /const action = expandedModelDetailKey\.value === key \? 'collapse' : 'expand'/)
  assert.match(source, /preserveModelDetailViewportAnchor\(event\?\.currentTarget, \(\) => \{[\s\S]+selectedModelDetailKey\.value = expandedModelDetailKey\.value === key \? null : key[\s\S]+\}, \{ action \}\)/)
  assert.match(source, /@click="toggleModelDetail\(row\.key, \$event\)"/)
  assert.doesNotMatch(source, /scrollIntoView/)
  assert.doesNotMatch(source, /behavior:\s*['"]smooth['"]/)
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
  assert.match(layoutStyle, /\.model-backtest-card \.model-bars > article[^}]*\{[^}]*border: 0;[^}]*border-radius: 0;[^}]*background: transparent;/)
})

test('submodel disclosure focus ring stays inside the clipped list shell', async () => {
  const layoutStyle = await readFile(new URL('../../styles/features/evaluation-layout.css', import.meta.url), 'utf8')

  assert.match(layoutStyle, /\.model-backtest-card \.model-bar-summary:focus-visible \{[^}]*outline-offset: -3px;/)
})

test('submodel hover stays on the summary row and never masks nested detail articles', async () => {
  const layoutStyle = await readFile(new URL('../../styles/features/evaluation-layout.css', import.meta.url), 'utf8')

  assert.doesNotMatch(
    layoutStyle,
    /\.model-backtest-card \.model-bars article(?=[.:,\s{])/,
  )
  assert.doesNotMatch(
    layoutStyle,
    /\.model-backtest-card \.model-bars > article:hover/,
  )
  assert.match(
    layoutStyle,
    /\.model-backtest-card \.model-bars > article > \.model-bar-summary:hover[^}]*\{[^}]*background:/,
  )
  assert.match(
    layoutStyle,
    /\.theme-dark \.evaluation-panel \.model-backtest-card \.model-bars > article > \.model-bar-summary:hover[^}]*\{[^}]*background:/,
  )
})

test('submodel detail close avoids layout animation and keeps light and dark clipping', async () => {
  const source = await readFile(new URL('./EvaluationBacktest.vue', import.meta.url), 'utf8')
  const style = await readFile(new URL('../../styles/features/evaluation.css', import.meta.url), 'utf8')
  const detailBodies = cssRuleBodies(style, '.model-row-detail')
  const darkDetailBodies = cssRuleBodies(style, '.app-shell.theme-dark .model-row-detail')
  const enterBodies = cssRuleBodies(style, '.model-row-detail-enter-active')
  const leaveBodies = cssRuleBodies(style, '.model-row-detail-leave-active')
  const leaveTargetBodies = cssRuleBodies(style, '.model-row-detail-leave-to')

  assert.ok(detailBodies.length > 0, 'expected the shared model detail surface rule')
  assert.match(detailBodies[0], /overflow:\s*hidden;/)
  assert.doesNotMatch(detailBodies.join('\n'), /max-height\s*:/)

  assert.equal(darkDetailBodies.length, 1)
  assert.match(darkDetailBodies[0], /overflow:\s*hidden;/)

  assert.ok(enterBodies.length > 0, 'expected an enter-only detail transition')
  assert.match(enterBodies[0], /opacity 140ms ease/)
  assert.match(enterBodies[0], /transform 140ms ease/)
  assert.doesNotMatch(enterBodies[0], /(?:max-height|height|margin|padding|position)\s+\d+ms/)

  assert.deepEqual(leaveBodies, [], 'close must immediately update document flow instead of animating layout')
  assert.deepEqual(leaveTargetBodies, [], 'close must not retain a delayed collapsed target state')
  assert.match(source, /function finishModelDetailLeave\(_element, done\) \{\s+done\(\)\s+\}/)
  assert.match(source, /<Transition name="model-row-detail" @leave="finishModelDetailLeave">/)
})
