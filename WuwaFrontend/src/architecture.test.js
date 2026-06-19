import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function lineCount(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8')
  return source.split(/\r?\n/).length
}

test('frontend high-attraction entry files do not grow beyond the refactor baseline', async () => {
  assert.ok(await lineCount('./App.vue') <= 320, 'App.vue must not grow beyond 320 lines')
  assert.ok(await lineCount('./features/auth/LoginView.vue') <= 85, 'LoginView.vue must not grow beyond 85 lines')
  assert.ok(await lineCount('./features/evaluation/EvaluationBacktest.vue') <= 705, 'EvaluationBacktest.vue must not grow beyond 705 lines')
  assert.ok(await lineCount('./features/history/FloatingHistoryPanel.vue') <= 650, 'FloatingHistoryPanel.vue must not grow beyond 650 lines')
  assert.ok(await lineCount('./features/workspace/UidSetupView.vue') <= 125, 'UidSetupView.vue must not grow beyond 125 lines')
  assert.ok(await lineCount('./features/workspace/EchoWorkbenchView.vue') <= 210, 'EchoWorkbenchView.vue must not grow beyond 210 lines')
  assert.ok(await lineCount('./features/workspace/useEchoWorkspace.js') <= 400, 'useEchoWorkspace.js must not grow beyond 400 lines')
  assert.ok(await lineCount('./features/recognition/useRecognitionReview.js') <= 145, 'useRecognitionReview.js must not grow beyond 145 lines')
  assert.ok(await lineCount('./style.css') <= 6560, 'style.css must not grow beyond 6560 lines')
  assert.ok(await lineCount('./styles/shell.css') <= 830, 'shell.css must not grow beyond 830 lines')
  assert.ok(await lineCount('./styles/features/history.css') <= 885, 'history.css must not grow beyond 885 lines')
})

test('global styles import shared tokens and base rules', async () => {
  const entry = await readFile(new URL('./style.css', import.meta.url), 'utf8')
  const tokens = await readFile(new URL('./styles/tokens.css', import.meta.url), 'utf8')
  const base = await readFile(new URL('./styles/base.css', import.meta.url), 'utf8')

  assert.match(entry, /@import '\.\/styles\/tokens\.css';/)
  assert.match(entry, /@import '\.\/styles\/base\.css';/)
  assert.match(tokens, /:root \{/)
  assert.match(base, /body \{/)
  assert.doesNotMatch(entry, /^:root \{/m)
})

test('recognition feature owns its styles', async () => {
  const entry = await readFile(new URL('./style.css', import.meta.url), 'utf8')
  const recognition = await readFile(new URL('./styles/features/recognition.css', import.meta.url), 'utf8')

  assert.match(entry, /@import '\.\/styles\/features\/recognition\.css';/)
  assert.match(recognition, /\.product-panel\.recognition-panel \{/)
  assert.match(recognition, /\.app-shell\.theme-dark \.recognition-summary-strip/)
  assert.doesNotMatch(entry, /\.recognition-panel \{/)
})

test('statistics feature owns its base and responsive styles', async () => {
  const entry = await readFile(new URL('./style.css', import.meta.url), 'utf8')
  const statistics = await readFile(new URL('./styles/features/statistics.css', import.meta.url), 'utf8')

  assert.match(entry, /@import '\.\/styles\/features\/statistics\.css';/)
  assert.match(statistics, /\.stats-analytics-panel \{/)
  assert.match(statistics, /\.substat-deviation-chart \{/)
  assert.match(statistics, /@media \(max-width: 860px\)/)
  assert.doesNotMatch(entry, /\.stats-analytics-panel \{/)
})

test('application shell owns navigation, account, theme, and hero styles', async () => {
  const entry = await readFile(new URL('./style.css', import.meta.url), 'utf8')
  const shell = await readFile(new URL('./styles/shell.css', import.meta.url), 'utf8')

  assert.match(entry, /@import '\.\/styles\/shell\.css';/)
  assert.match(shell, /\.dashboard \{/)
  assert.match(shell, /\.topbar \{/)
  assert.match(shell, /\.uid-chip \{/)
  assert.match(shell, /\.theme-toggle-button \{/)
  assert.match(shell, /\.hero-band \{/)
  assert.match(shell, /\.app-shell\.theme-dark \.topbar/)
  assert.match(shell, /@media \(max-width: 860px\)/)
  assert.doesNotMatch(entry, /\.dashboard \{/)
  assert.doesNotMatch(entry, /\.hero-band \{/)
})

test('history feature owns panel, filters, records, and responsive styles', async () => {
  const entry = await readFile(new URL('./style.css', import.meta.url), 'utf8')
  const history = await readFile(new URL('./styles/features/history.css', import.meta.url), 'utf8')

  assert.match(entry, /@import '\.\/styles\/features\/history\.css';/)
  assert.match(history, /\.floating-history-panel \{/)
  assert.match(history, /\.history-filter-chip \{/)
  assert.match(history, /\.echo-item \{/)
  assert.match(history, /\.app-shell\.theme-dark \.floating-history-panel/)
  assert.match(history, /@media \(max-width: 860px\)/)
  assert.match(history, /@media \(max-width: 520px\)/)
  assert.doesNotMatch(entry, /\.floating-history-panel \{/)
  assert.doesNotMatch(entry, /\.history-filter-chip \{/)
})
