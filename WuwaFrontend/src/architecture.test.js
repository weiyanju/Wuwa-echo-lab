import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function lineCount(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8')
  return source.split(/\r?\n/).length
}

test('frontend high-attraction entry files do not grow beyond the refactor baseline', async () => {
  assert.ok(await lineCount('./App.vue') <= 320, 'App.vue must not grow beyond 320 lines')
  assert.ok(await lineCount('./features/auth/LoginView.vue') <= 120, 'LoginView.vue must not grow beyond 120 lines')
  assert.ok(await lineCount('./features/evaluation/EvaluationView.vue') <= 110, 'EvaluationView.vue must not grow beyond 110 lines')
  assert.ok(await lineCount('./features/evaluation/EvaluationCoreBacktest.vue') <= 130, 'EvaluationCoreBacktest.vue must not grow beyond 130 lines')
  assert.ok(await lineCount('./features/evaluation/EvaluationOverview.vue') <= 250, 'EvaluationOverview.vue must not grow beyond 250 lines')
  assert.ok(await lineCount('./features/evaluation/EvaluationBacktest.vue') <= 620, 'EvaluationBacktest.vue must not grow beyond 620 lines')
  assert.ok(await lineCount('./features/history/FloatingHistoryPanel.vue') <= 650, 'FloatingHistoryPanel.vue must not grow beyond 650 lines')
  assert.ok(await lineCount('./features/workspace/UidSetupView.vue') <= 130, 'UidSetupView.vue must not grow beyond 130 lines')
  assert.ok(await lineCount('./components/controls/UidSwitcher.vue') <= 250, 'UidSwitcher.vue must not grow beyond 250 lines')
  assert.ok(await lineCount('./features/workspace/EchoWorkbenchView.vue') <= 210, 'EchoWorkbenchView.vue must not grow beyond 210 lines')
  assert.ok(await lineCount('./features/workspace/useEchoWorkspace.js') <= 400, 'useEchoWorkspace.js must not grow beyond 400 lines')
  assert.ok(await lineCount('./features/recognition/useRecognitionReview.js') <= 145, 'useRecognitionReview.js must not grow beyond 145 lines')
  assert.ok(await lineCount('./style.css') <= 14, 'style.css must remain an import-only entry')
  assert.ok(await lineCount('./styles/controls.css') <= 400, 'controls.css must not grow beyond 400 lines')
  assert.ok(await lineCount('./styles/shell.css') <= 920, 'shell.css must not grow beyond 920 lines')
  assert.ok(await lineCount('./styles/features/history.css') <= 940, 'history.css must not grow beyond 940 lines')
  assert.ok(await lineCount('./styles/features/auth.css') <= 310, 'auth.css must not grow beyond 310 lines')
  assert.ok(await lineCount('./styles/features/uid-setup.css') <= 220, 'uid-setup.css must not grow beyond 220 lines')
  assert.ok(await lineCount('./styles/features/workspace.css') <= 710, 'workspace.css must not grow beyond 710 lines')
  assert.ok(await lineCount('./styles/features/workspace-active.css') <= 390, 'workspace-active.css must not grow beyond 390 lines')
  assert.ok(await lineCount('./styles/features/evaluation.css') <= 4700, 'evaluation.css must not grow beyond 4700 lines')
  assert.ok(await lineCount('./styles/features/evaluation-layout.css') <= 260, 'evaluation-layout.css must not grow beyond 260 lines')
})

test('global styles import shared tokens and base rules', async () => {
  const entry = await readFile(new URL('./style.css', import.meta.url), 'utf8')
  const tokens = await readFile(new URL('./styles/tokens.css', import.meta.url), 'utf8')
  const base = await readFile(new URL('./styles/base.css', import.meta.url), 'utf8')
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const typographySpec = await readFile(
    new URL('../../docs/superpowers/specs/2026-07-13-wuwa-typography-system-design.md', import.meta.url),
    'utf8',
  )

  assert.match(entry, /@import '\.\/styles\/tokens\.css';/)
  assert.match(entry, /@import '\.\/styles\/base\.css';/)
  assert.equal(packageJson.dependencies['@ibm/plex-sans-sc'], '^1.1.0')
  assert.equal(packageJson.dependencies['@ibm/plex-mono'], '^2.5.0')
  assert.equal(packageJson.dependencies['@fontsource/noto-sans-sc'], undefined)
  assert.match(tokens, /IBMPlexSansSC-Regular\.css/)
  assert.match(tokens, /IBMPlexSansSC-Medium\.css/)
  assert.match(tokens, /IBMPlexSansSC-SemiBold\.css/)
  assert.match(tokens, /IBMPlexSansSC-Bold\.css/)
  assert.match(tokens, /IBMPlexMono-Medium\.css/)
  assert.match(tokens, /IBMPlexMono-SemiBold\.css/)
  assert.match(tokens, /:root \{/)
  assert.match(tokens, /--font-cjk: "IBM Plex Sans SC", "Noto Sans SC", "Microsoft YaHei UI", system-ui, sans-serif;/)
  assert.match(tokens, /--font-ui: var\(--font-cjk\);/)
  assert.match(tokens, /--font-title: var\(--font-cjk\);/)
  assert.match(tokens, /--font-latin: "IBM Plex Sans SC", "IBM Plex Sans", system-ui, sans-serif;/)
  assert.match(tokens, /--font-data: var\(--font-latin\);/)
  assert.match(tokens, /--font-mono: "IBM Plex Mono", ui-monospace, Consolas, monospace;/)
  assert.doesNotMatch(tokens, /@fontsource\/noto-sans-sc/)
  assert.match(typographySpec, /IBM Plex Sans SC/)
  assert.doesNotMatch(typographySpec, /@fontsource\/noto-sans-sc/)
  assert.match(tokens, /--text-data-xl: 1\.875rem;/)
  assert.match(tokens, /--weight-emphasis: 700;/)
  assert.match(base, /body \{/)
  assert.match(base, /\.data-number,/)
  assert.match(base, /\.percent-value \{[\s\S]+font-family: var\(--font-data\);[\s\S]+font-variant-numeric: tabular-nums;[\s\S]+font-feature-settings: "tnum";/)
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
  assert.match(auth, /\.terminal-home \{/)
  assert.match(auth, /\.terminal-navbar \{/)
  assert.match(auth, /\.terminal-container \{/)
  assert.match(auth, /\.terminal-features-grid \{/)
  assert.match(auth, /\.terminal-auth-card \{/)
  assert.match(auth, /\.terminal-tab-indicator \{/)
  assert.match(auth, /@media \(max-width: 860px\)/)
  assert.match(auth, /@media \(max-width: 520px\)/)
  assert.match(auth, /@media \(max-width: 860px\)[\s\S]+\.terminal-container \{[\s\S]+grid-template-columns: 1fr;/)
  assert.match(auth, /@media \(max-width: 520px\)[\s\S]+\.terminal-title \{[\s\S]+white-space: normal;[\s\S]+\.terminal-title-caret \{ display: none; \}/)
  assert.doesNotMatch(entry, /\.auth-shell \{/)
  assert.doesNotMatch(entry, /\.terminal-home \{/)
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
  const workspaceSearch = await readFile(new URL('./styles/features/workspace-search.css', import.meta.url), 'utf8').catch(() => '')
  const workspaceActive = await readFile(new URL('./styles/features/workspace-active.css', import.meta.url), 'utf8')

  assert.match(entry, /@import '\.\/styles\/features\/workspace\.css';/)
  assert.match(workspace, /@import '\.\/workspace-search\.css';/)
  assert.match(entry, /@import '\.\/styles\/features\/workspace-active\.css';/)
  assert.match(workspace, /\.workspace-grid \{/)
  assert.match(workspace, /\.sonata-grid \{/)
  assert.match(workspace, /\.substat-matrix \{/)
  assert.match(workspaceSearch, /\.sonata-search-field \{/)
  assert.match(workspaceSearch, /\.app-shell\.theme-dark \.sonata-search-field input/)
  assert.match(workspaceActive, /\.active-summary \{/)
  assert.match(workspace, /@media \(max-width: 860px\)/)
  assert.match(workspace, /@media \(max-width: 520px\)/)
  assert.doesNotMatch(workspace, /\.sonata-search-field \{/)
  assert.doesNotMatch(entry, /\.workspace-grid \{/)
})

test('evaluation feature owns overview, diagnostics, dark, and responsive styles', async () => {
  const entry = await readFile(new URL('./style.css', import.meta.url), 'utf8')
  const evaluation = await readFile(new URL('./styles/features/evaluation.css', import.meta.url), 'utf8')
  const evaluationLayout = await readFile(new URL('./styles/features/evaluation-layout.css', import.meta.url), 'utf8')

  assert.match(entry, /@import '\.\/styles\/features\/evaluation\.css';/)
  assert.match(evaluation, /@import '\.\/evaluation-layout\.css';/)
  assert.match(evaluationLayout, /\.product-panel\.evaluation-panel \{/)
  assert.match(evaluationLayout, /\.evaluation-module-stack \{/)
  assert.match(evaluationLayout, /\.evaluation-module \{/)
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
  assert.ok(await lineCount('./style.css') <= 14, 'style.css must remain an import-only entry')
})

test('features own their remaining styles and removed views leave no legacy css', async () => {
  const entry = await readFile(new URL('./style.css', import.meta.url), 'utf8')
  const statistics = await readFile(new URL('./styles/features/statistics.css', import.meta.url), 'utf8')
  const evaluation = await readFile(new URL('./styles/features/evaluation.css', import.meta.url), 'utf8')
  const history = await readFile(new URL('./styles/features/history.css', import.meta.url), 'utf8')
  const auth = await readFile(new URL('./styles/features/auth.css', import.meta.url), 'utf8')
  const allStyles = [entry, statistics, evaluation, history, auth].join('\n')

  assert.match(statistics, /\.app-shell\.theme-dark \.stats-task-card/)
  assert.match(evaluation, /\.context-overall-progress \{/)
  assert.match(evaluation, /@keyframes summary-copy-refresh/)
  assert.match(history, /\.history-records \{/)
  assert.match(auth, /\.terminal-container \{/)
  assert.doesNotMatch(allStyles, /\.prediction-strip\b/)
  assert.doesNotMatch(allStyles, /\.diagnostic-matrix\b/)
  assert.doesNotMatch(allStyles, /\.weight-bars\b/)
  assert.doesNotMatch(allStyles, /\.hit-chart\b/)
  assert.doesNotMatch(allStyles, /\.hit-bars\b/)
  assert.doesNotMatch(allStyles, /\.stage-timeline\b/)
})

test('page summary chips have one shared style owner', async () => {
  const entry = await readFile(new URL('./style.css', import.meta.url), 'utf8')
  const shared = await readFile(new URL('./styles/page-summary.css', import.meta.url), 'utf8').catch(() => '')

  assert.match(entry, /@import '\.\/styles\/page-summary\.css';/)
  assert.match(shared, /^\.page-summary-chip \{/m)
})

test('shared sample experience owns cross-page maturity and empty metric semantics', async () => {
  const shared = await readFile(new URL('./shared/sampleExperience.js', import.meta.url), 'utf8')
  const statistics = await readFile(new URL('./features/statistics/presentation.js', import.meta.url), 'utf8')
  const evaluation = await readFile(new URL('./features/evaluation/EvaluationView.vue', import.meta.url), 'utf8')

  assert.match(shared, /export function sampleMaturityState/)
  assert.match(shared, /export function evaluationReadinessState/)
  assert.match(shared, /export const EMPTY_METRIC_TEXT = '--'/)
  assert.doesNotMatch(statistics, /可作参考|稳定观察|可优化权重/)
  assert.doesNotMatch(evaluation, /function evaluationStatus/)
  assert.ok(await lineCount('./shared/sampleExperience.js') <= 90)
})

test('sample readiness has one shared component and style owner', async () => {
  const sharedEntry = await readFile(new URL('./styles/page-summary.css', import.meta.url), 'utf8')
  const style = await readFile(new URL('./styles/sample-readiness.css', import.meta.url), 'utf8')

  assert.match(sharedEntry, /@import '\.\/sample-readiness\.css';/)
  assert.match(style, /^\.sample-readiness-panel/m)
  assert.match(style, /^\.insight-request-state/m)
  assert.match(style, /^\.metric-placeholder/m)
  assert.ok(await lineCount('./components/states/SampleReadinessPanel.vue') <= 70)
  assert.ok(await lineCount('./components/states/InsightRequestState.vue') <= 45)
  assert.ok(await lineCount('./styles/sample-readiness.css') <= 120)
})

test('page insight refresh and navigation stay focused on orchestration', async () => {
  assert.ok(await lineCount('./features/workspace/workspaceInsightRefresh.js') <= 100)
  assert.ok(await lineCount('./composables/useDashboardNavigation.js') <= 35)
  assert.ok(await lineCount('./components/shell/WorkspaceSummary.vue') <= 90)
  assert.ok(await lineCount('./features/statistics/SampleStageAxis.vue') <= 65)
  assert.ok(await lineCount('./styles/shell-metrics.css') <= 45)
})
