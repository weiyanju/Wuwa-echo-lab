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
  assert.ok(await lineCount('./features/workspace/UidSetupView.vue') <= 130, 'UidSetupView.vue must not grow beyond 130 lines')
  assert.ok(await lineCount('./components/controls/UidSwitcher.vue') <= 250, 'UidSwitcher.vue must not grow beyond 250 lines')
  assert.ok(await lineCount('./features/workspace/EchoWorkbenchView.vue') <= 210, 'EchoWorkbenchView.vue must not grow beyond 210 lines')
  assert.ok(await lineCount('./features/workspace/useEchoWorkspace.js') <= 400, 'useEchoWorkspace.js must not grow beyond 400 lines')
  assert.ok(await lineCount('./features/recognition/useRecognitionReview.js') <= 145, 'useRecognitionReview.js must not grow beyond 145 lines')
  assert.ok(await lineCount('./style.css') <= 13, 'style.css must remain an import-only entry')
  assert.ok(await lineCount('./styles/controls.css') <= 380, 'controls.css must not grow beyond 380 lines')
  assert.ok(await lineCount('./styles/shell.css') <= 880, 'shell.css must not grow beyond 880 lines')
  assert.ok(await lineCount('./styles/features/history.css') <= 910, 'history.css must not grow beyond 910 lines')
  assert.ok(await lineCount('./styles/features/auth.css') <= 300, 'auth.css must not grow beyond 300 lines')
  assert.ok(await lineCount('./styles/features/uid-setup.css') <= 200, 'uid-setup.css must not grow beyond 200 lines')
  assert.ok(await lineCount('./styles/features/workspace.css') <= 710, 'workspace.css must not grow beyond 710 lines')
  assert.ok(await lineCount('./styles/features/evaluation.css') <= 4690, 'evaluation.css must not grow beyond 4690 lines')
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
  assert.doesNotMatch(entry, /^\.stats-analytics-panel \{/m)
})

test('application shell owns navigation, account, theme, and hero styles', async () => {
  const entry = await readFile(new URL('./style.css', import.meta.url), 'utf8')
  const shell = await readFile(new URL('./styles/shell.css', import.meta.url), 'utf8')

  assert.match(entry, /@import '\.\/styles\/shell\.css';/)
  assert.match(shell, /\.dashboard \{/)
  assert.match(shell, /\.topbar \{/)
  assert.match(shell, /\.uid-chip \{/)
  assert.match(shell, /\.uid-switcher-menu \{/)
  assert.match(shell, /\.uid-switcher-add \{/)
  assert.match(shell, /\.uid-account-check \{/)
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

test('auth feature owns login layout, information, dark, and responsive styles', async () => {
  const entry = await readFile(new URL('./style.css', import.meta.url), 'utf8')
  const auth = await readFile(new URL('./styles/features/auth.css', import.meta.url), 'utf8')

  assert.match(entry, /@import '\.\/styles\/features\/auth\.css';/)
  assert.match(auth, /\.auth-shell \{/)
  assert.match(auth, /\.auth-mode-actions \{/)
  assert.match(auth, /\.login-info-grid \{/)
  assert.match(auth, /\.app-shell\.theme-dark \.auth-shell-home::after/)
  assert.match(auth, /@media \(max-width: 860px\)/)
  assert.match(auth, /@media \(max-width: 520px\)/)
  assert.match(auth, /@media \(max-width: 520px\)[\s\S]+\.login-info-card p \{[\s\S]+white-space: normal;/)
  assert.doesNotMatch(entry, /\.auth-shell \{/)
  assert.doesNotMatch(entry, /\.login-info-grid \{/)
})

test('uid setup owns its shell, card, dark theme, and responsive styles', async () => {
  const entry = await readFile(new URL('./style.css', import.meta.url), 'utf8')
  const workspace = await readFile(new URL('./styles/features/workspace.css', import.meta.url), 'utf8')

  assert.match(entry, /@import '\.\/styles\/features\/uid-setup\.css';/)
  const uidSetup = await readFile(new URL('./styles/features/uid-setup.css', import.meta.url), 'utf8')
  assert.match(uidSetup, /\.uid-setup-shell \{/)
  assert.match(uidSetup, /\.uid-binding-form \{/)
  assert.match(uidSetup, /\.app-shell\.theme-dark \.uid-setup-media/)
  assert.match(uidSetup, /@media \(max-width: 860px\)/)
  assert.match(uidSetup, /@media \(max-width: 520px\)/)
  assert.doesNotMatch(workspace, /\.uid-setup-shell \{|\.uid-binding-form \{|\.disabled-tabs button/)
  assert.doesNotMatch(entry, /\.uid-setup-shell \{/)
})

test('workspace feature owns workbench, matrix, dark, and responsive styles', async () => {
  const entry = await readFile(new URL('./style.css', import.meta.url), 'utf8')
  const workspace = await readFile(new URL('./styles/features/workspace.css', import.meta.url), 'utf8')

  assert.match(entry, /@import '\.\/styles\/features\/workspace\.css';/)
  assert.match(workspace, /\.workspace-grid \{/)
  assert.match(workspace, /\.sonata-grid \{/)
  assert.match(workspace, /\.substat-matrix \{/)
  assert.match(workspace, /\.app-shell\.theme-dark \.active-summary/)
  assert.match(workspace, /@media \(max-width: 860px\)/)
  assert.match(workspace, /@media \(max-width: 520px\)/)
  assert.doesNotMatch(entry, /\.workspace-grid \{/)
})

test('evaluation feature owns overview, diagnostics, dark, and responsive styles', async () => {
  const entry = await readFile(new URL('./style.css', import.meta.url), 'utf8')
  const evaluation = await readFile(new URL('./styles/features/evaluation.css', import.meta.url), 'utf8')

  assert.match(entry, /@import '\.\/styles\/features\/evaluation\.css';/)
  assert.match(evaluation, /\.evaluation-panel \{/)
  assert.match(evaluation, /\.evaluation-status-bar \{/)
  assert.match(evaluation, /\.model-bars \{/)
  assert.match(evaluation, /\.fusion-weight-grid \{/)
  assert.match(evaluation, /\.coverage-band-chart \{/)
  assert.match(evaluation, /\.app-shell\.theme-dark \.model-bars article/)
  assert.match(evaluation, /@media \(max-width: 860px\)/)
  assert.match(evaluation, /@media \(max-width: 520px\)/)
  assert.doesNotMatch(entry, /^\.evaluation-panel \{/m)
  assert.doesNotMatch(entry, /^\.model-bars \{/m)
})

test('shared controls own reusable themes, buttons, forms, cards, and headings', async () => {
  const entry = await readFile(new URL('./style.css', import.meta.url), 'utf8')
  const controls = await readFile(new URL('./styles/controls.css', import.meta.url), 'utf8')

  assert.match(entry, /@import '\.\/styles\/controls\.css';/)
  assert.match(controls, /\.ui-line-icon \{/)
  assert.match(controls, /\.app-shell\.theme-dark \{/)
  assert.match(controls, /\.button-primary,/)
  assert.match(controls, /\.product-panel \{/)
  assert.match(controls, /input:focus \{/)
  assert.match(controls, /\.section-heading \{/)
  assert.match(controls, /@media \(max-width: 520px\)/)
  assert.doesNotMatch(entry, /\{/)
  assert.ok(await lineCount('./style.css') <= 13, 'style.css must remain an import-only entry')
})

test('features own their remaining styles and removed views leave no legacy css', async () => {
  const entry = await readFile(new URL('./style.css', import.meta.url), 'utf8')
  const statistics = await readFile(new URL('./styles/features/statistics.css', import.meta.url), 'utf8')
  const evaluation = await readFile(new URL('./styles/features/evaluation.css', import.meta.url), 'utf8')
  const history = await readFile(new URL('./styles/features/history.css', import.meta.url), 'utf8')
  const auth = await readFile(new URL('./styles/features/auth.css', import.meta.url), 'utf8')
  const allStyles = [entry, statistics, evaluation, history, auth].join('\n')

  assert.match(statistics, /\.app-shell\.theme-dark \.stats-analytics-panel/)
  assert.match(evaluation, /\.context-overall-progress \{/)
  assert.match(evaluation, /@keyframes summary-copy-refresh/)
  assert.match(history, /\.history-records \{/)
  assert.match(auth, /\.showcase-card \{/)
  assert.doesNotMatch(allStyles, /\.prediction-strip\b/)
  assert.doesNotMatch(allStyles, /\.diagnostic-matrix\b/)
  assert.doesNotMatch(allStyles, /\.weight-bars\b/)
  assert.doesNotMatch(allStyles, /\.hit-chart\b/)
  assert.doesNotMatch(allStyles, /\.hit-bars\b/)
  assert.doesNotMatch(allStyles, /\.stage-timeline\b/)
})
