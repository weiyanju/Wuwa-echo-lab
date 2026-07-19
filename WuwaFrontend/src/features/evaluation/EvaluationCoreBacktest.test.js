import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('core backtest uses proportional comparison rows and signed percent gains', async () => {
  const source = await readFile(new URL('./EvaluationCoreBacktest.vue', import.meta.url), 'utf8')

  assert.match(source, /import \{ getCoverageScale \} from '\.\/coverageScale\.js'/)
  assert.match(
    source,
    /function deltaText\(row\) \{\s+return Number\.isFinite\(row\.delta\)\s+\? formatSignedPercent\(row\.delta\)\s+: '--'\s+\}/,
  )
  assert.match(
    source,
    /const coverageAriaLabel = computed\(\(\) =>[\s\S]*?return Number\.isFinite\(row\.delta\)\s+\? `\$\{valueLabel\}，\$\{deltaAriaLabel\(row\)\}`\s+: valueLabel[\s\S]*?\.join\('，'\),\s+\)/,
  )
  assert.match(
    source,
    /return `相对\$\{row\.deltaFrom\}新增 \$\{formatSignedPercent\(row\.delta\)\}`/,
  )
  assert.match(source, /class="coverage-comparison"/)
  assert.match(source, /class="coverage-axis"/)
  assert.match(source, /class="coverage-row"/)
  assert.match(source, /class="coverage-bar-fill"/)
  assert.match(source, /class="coverage-delta"/)
  assert.match(source, /row\.value \/ coverageScale\.value\.max/)
  assert.doesNotMatch(source, /coverage-band|coverageNodePosition|coverageNodeClass/)
})

test('core backtest keeps calibration metrics factual and compact', async () => {
  const source = await readFile(new URL('./EvaluationCoreBacktest.vue', import.meta.url), 'utf8')

  assert.match(source, /<dl class="calibration-metrics"/)
  assert.match(source, /<dt>\{\{ metric\.label \}\}<\/dt>/)
  assert.match(source, /Log Loss/)
  assert.match(source, /Brier Score/)
  assert.doesNotMatch(source, /优秀|较差|健康|异常/)
})

test('core coverage chart is compact, proportional, and non-decorative', async () => {
  const styles = await readFile(
    new URL('../../styles/features/evaluation.css', import.meta.url),
    'utf8',
  )

  assert.match(styles, /\.coverage-comparison \{[^}]*max-width: 1280px;/s)
  assert.match(styles, /\.coverage-bar \{[^}]*background: transparent;/s)
  assert.match(styles, /\.coverage-bar-fill \{[^}]*background: var\(--primary\);/s)
  assert.match(styles, /\.coverage-delta \{[^}]*position: absolute;/s)
  assert.match(
    styles,
    /@media \(max-width: 520px\)[\s\S]*\.coverage-delta \{[^}]*position: static;/s,
  )
  assert.doesNotMatch(styles, /coverage-band-(?:track|fill|node|labels)/)
})
