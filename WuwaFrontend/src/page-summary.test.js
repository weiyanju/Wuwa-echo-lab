import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readOrEmpty(url) {
  return readFile(url, 'utf8').catch(() => '')
}

function classTokenCount(source, classToken) {
  let count = 0
  const classPattern = /\bclass\s*=\s*"([^"]*)"/g

  for (const match of source.matchAll(classPattern)) {
    if (match[1].split(/\s+/).includes(classToken)) count += 1
  }

  return count
}

function summaryGroupOpeningTag(source) {
  return source.match(/<div\b(?=[^>]*\bclass\s*=\s*"[^"]*\bpage-summary-chips\b[^"]*")[^>]*>/)?.[0] || ''
}

test('statistics and evaluation share one accessible page summary contract', async () => {
  const [entry, shared, statisticsView, evaluationView, statisticsStyles, evaluationStyles] = await Promise.all([
    readOrEmpty(new URL('./style.css', import.meta.url)),
    readOrEmpty(new URL('./styles/page-summary.css', import.meta.url)),
    readOrEmpty(new URL('./features/statistics/StatisticsView.vue', import.meta.url)),
    readOrEmpty(new URL('./features/evaluation/EvaluationView.vue', import.meta.url)),
    readOrEmpty(new URL('./styles/features/statistics.css', import.meta.url)),
    readOrEmpty(new URL('./styles/features/evaluation.css', import.meta.url)),
  ])

  assert.match(entry, /@import '\.\/styles\/page-summary\.css';/)
  assert.match(shared, /^\.page-summary-chips \{/m)
  assert.match(shared, /^\.page-summary-chip \{/m)
  assert.match(shared, /^\.page-summary-chip__value \{/m)
  assert.match(shared, /^\.page-summary-chip--state \{/m)
  assert.match(shared, /^\.page-summary-chip--neutral \{/m)
  assert.match(shared, /^\.page-summary-chip__value--empty \{/m)
  assert.match(shared, /\.app-shell\.theme-dark \.page-summary-chip--neutral/)
  assert.match(shared, /@media \(max-width: 520px\)[\s\S]*\.page-summary-chip/)
  assert.match(shared, /\.app-shell\.theme-dark \.page-summary-chip/)
  assert.doesNotMatch(statisticsStyles, /\.stats-diagnostic-summary-chip/)
  assert.doesNotMatch(evaluationStyles, /\.evaluation-status-chip/)

  const statisticsGroup = summaryGroupOpeningTag(statisticsView)
  assert.match(statisticsGroup, /\brole="group"/)
  assert.match(statisticsGroup, /\baria-label="统计摘要"/)
  assert.equal(classTokenCount(statisticsView, 'page-summary-chip'), 2)
  assert.equal(classTokenCount(statisticsView, 'page-summary-chip__value'), 1)

  const evaluationGroup = summaryGroupOpeningTag(evaluationView)
  assert.match(evaluationGroup, /\brole="group"/)
  assert.match(evaluationGroup, /\baria-label="评估摘要"/)
  assert.equal(classTokenCount(evaluationView, 'page-summary-chip'), 3)
  assert.equal(classTokenCount(evaluationView, 'page-summary-chip__value'), 2)
  assert.match(statisticsView, /sampleMaturityState/)
  assert.match(evaluationView, /sampleMaturityState/)
  assert.match(statisticsView, /page-summary-chip--neutral/)
  assert.match(evaluationView, /page-summary-chip--neutral/)
})
