import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readStatisticsStyles() {
  return readFile(new URL('../../styles/features/statistics.css', import.meta.url), 'utf8')
}

test('statistics view owns analytics presentation', async () => {
  const source = await readFile(new URL('./StatisticsView.vue', import.meta.url), 'utf8')

  assert.match(source, /defineProps\(\{[\s\S]+stats:/)
  assert.match(source, /class="product-panel full-panel stats-analytics-panel"/)
  assert.match(source, /v-for="row in sortedStatFrequency"/)
  assert.match(source, /v-for="stage in sampleStageAxisRows"/)
})

test('statistics diagnosis keeps context at section level and avoids duplicate empty values', async () => {
  const source = await readFile(new URL('./StatisticsView.vue', import.meta.url), 'utf8')

  assert.match(source, /<h2>统计诊断<\/h2>\s*<p v-if="stats" class="stats-diagnostic-context">\{\{ statsReliabilityNote\(totalSamples\) \}\}<\/p>/)
  assert.doesNotMatch(source, /class="stats-diagnostic-note"/)
  assert.match(source, /hottestStatRow\?\.label \|\| '暂无明显偏高'/)
  assert.match(source, /coldestStatRow\?\.label \|\| '暂无明显偏低'/)
  assert.doesNotMatch(source, /v-else>暂无<\/em>/)
})

test('statistics diagnostic context uses quiet section-level typography', async () => {
  const styles = await readStatisticsStyles()
  const titleRowRule = styles.match(/^\.stats-diagnostic-title-row \{([^}]+)\}/m)?.[1] || ''
  const stackRule = styles.match(/^\.stats-diagnostic-title-stack \{([^}]+)\}/m)?.[1] || ''
  const contextRule = styles.match(/^\.stats-diagnostic-context \{([^}]+)\}/m)?.[1] || ''

  assert.match(titleRowRule, /align-items: flex-start/)
  assert.match(stackRule, /gap: 6px/)
  assert.match(contextRule, /max-width: 440px/)
  assert.match(contextRule, /margin: 0/)
  assert.match(contextRule, /color: #6f8293/)
  assert.match(contextRule, /font-size: var\(--text-label\)/)
  assert.match(contextRule, /font-weight: var\(--weight-supporting\)/)
  assert.match(contextRule, /line-height: var\(--leading-body\)/)
  assert.doesNotMatch(contextRule, /border|background/)
  assert.match(styles, /\.app-shell\.theme-dark \.stats-diagnostic-head p,\s*\.app-shell\.theme-dark \.stats-diagnostic-context,\s*\.app-shell\.theme-dark \.stats-section-heading > span\s*\{[^}]*color: var\(--charcoal\)/m)
  assert.doesNotMatch(styles, /\.stats-diagnostic-note/)
})
