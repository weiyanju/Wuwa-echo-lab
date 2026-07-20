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
  assert.match(coreSource, /const coverageAriaLabel = computed/)
  assert.match(coreSource, /:aria-label="coverageAriaLabel"/)
  assert.match(backtestSource, /model\.adjustment\?\.hit_rate/)
})

test('fusion weight module uses one shell with flat metric cells', async () => {
  const style = await readFile(new URL('../../styles/features/evaluation-layout.css', import.meta.url), 'utf8')

  assert.match(style, /\.evaluation-fusion-module \.fusion-weight-grid \{[^}]*gap: 0;[^}]*overflow: hidden;/)
  assert.match(style, /\.evaluation-fusion-module \.fusion-weight-card \{[^}]*border: 0;[^}]*border-radius: 0;[^}]*background: transparent;/)
  assert.match(style, /\.evaluation-fusion-module \.evaluation-summary-line \{[^}]*border-right: 0;[^}]*border-bottom: 0;[^}]*border-left: 0;/)
  assert.match(
    style,
    /\.app-shell\.theme-dark \.evaluation-panel \.evaluation-fusion-module \.evaluation-summary-line \{[^}]*background: transparent;/,
  )
})

test('fusion weights use semantic blue with a neutral baseline and no 3 plus 2 layout', async () => {
  const styles = await readFile(
    new URL('../../styles/features/evaluation.css', import.meta.url),
    'utf8',
  )
  const layout = await readFile(
    new URL('../../styles/features/evaluation-layout.css', import.meta.url),
    'utf8',
  )

  assert.match(
    styles,
    /\.fusion-weight-grid article b \{[^}]*background: var\(--primary\);/s,
  )
  assert.match(styles, /\.base-marker \{[^}]*background: var\(--text-muted\);/s)
  assert.doesNotMatch(styles, /\.base-marker \{[^}]*box-shadow:/s)
  assert.match(
    styles,
    /\.fusion-weight-card\.disabled b \{[^}]*background: var\(--decorative-muted\);/s,
  )
  assert.match(
    layout,
    /@media \(max-width: 1000px\)[\s\S]*\.evaluation-panel \.evaluation-fusion-module \.fusion-weight-grid \{[^}]*grid-template-columns: 1fr;/s,
  )
  assert.doesNotMatch(
    layout,
    /@media \(max-width: 1180px\)[\s\S]{0,500}\.evaluation-panel \.evaluation-fusion-module \.fusion-weight-grid/s,
  )
})
