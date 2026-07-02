import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('context detail progress uses the local clamp helper', async () => {
  const source = await readFile(new URL('./features/evaluation/EvaluationBacktest.vue', import.meta.url), 'utf8')

  assert.match(source, /function contextCheckProgress\(check\) \{\s+return clampNumber\(/)
  assert.doesNotMatch(source, /function contextCheckProgress\(check\) \{\s+return clamp\(/)
})

test('context and rule details show evidence directly with a single evidence tab', async () => {
  const source = await readFile(new URL('./features/evaluation/EvaluationBacktest.vue', import.meta.url), 'utf8')

  assert.match(source, /function modelInsightView\(model\) \{\s+if \(model\.key === 'context' \|\| model\.key === 'rule'\) \{\s+return 'evidence'/)
  assert.match(source, /function modelInsightTabs\(model\) \{\s+if \(model\.key === 'context' \|\| model\.key === 'rule'\) \{\s+return model\.tabs\.filter\(\(tab\) => tab\.key === 'evidence'\)/)
  assert.match(source, /function modelShowsInsightTabs\(model\) \{\s+return modelInsightTabs\(model\)\.length > 0/)
  assert.match(source, /v-if="modelShowsInsightTabs\(model\)" class="model-insight-tabs"/)
  assert.match(source, /v-for="tab in modelInsightTabs\(model\)"/)
})

test('evaluation summary model names highlight linked fusion cards', async () => {
  const source = await readFile(new URL('./features/evaluation/EvaluationOverview.vue', import.meta.url), 'utf8')

  assert.match(source, /const highlightedSummaryModelKey = ref\(null\)/)
  assert.match(source, /class="summary-model-link summary-model-link-dominant"/)
  assert.match(source, /'summary-linked': highlightedSummaryModelKey === row\.key/)
  assert.match(source, /@mouseenter="setSummaryModelHighlight\(/)
})

test('topbar exposes an accessible theme toggle that resets to system color scheme on load', async () => {
  const appSource = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  const styleSource = [
    await readFile(new URL('./style.css', import.meta.url), 'utf8'),
    await readFile(new URL('./styles/features/evaluation.css', import.meta.url), 'utf8'),
    await readFile(new URL('./styles/controls.css', import.meta.url), 'utf8'),
    await readFile(new URL('./styles/features/statistics.css', import.meta.url), 'utf8'),
  ].join('\n')
  const shellStyleSource = await readFile(new URL('./styles/shell.css', import.meta.url), 'utf8')
  const historyStyleSource = await readFile(new URL('./styles/features/history.css', import.meta.url), 'utf8')
  const authStyleSource = await readFile(new URL('./styles/features/auth.css', import.meta.url), 'utf8')
  const workspaceStyleSource = await readFile(new URL('./styles/features/workspace.css', import.meta.url), 'utf8')

  assert.match(appSource, /const themeMode = ref\(readInitialTheme\(\)\)/)
  assert.match(appSource, /const isDarkTheme = computed\(\(\) => themeMode\.value === 'dark'\)/)
  assert.match(appSource, /import moonIcon from '\.\/assets\/icons\/moon\.svg'/)
  assert.match(appSource, /import sunIcon from '\.\/assets\/icons\/sun\.svg'/)
  assert.match(appSource, /function iconMask\(source\)/)
  assert.match(appSource, /window\.matchMedia\?\.\('\(prefers-color-scheme: dark\)'\)\.matches/)
  assert.doesNotMatch(appSource, /localStorage\.getItem\('wuwa-theme'\)/)
  assert.doesNotMatch(appSource, /localStorage\.setItem\('wuwa-theme'/)
  assert.match(appSource, /<main class="app-shell" :class="\{ 'theme-dark': isDarkTheme \}">/)
  assert.match(appSource, /class="theme-toggle-button"/)
  assert.match(appSource, /:aria-pressed="isDarkTheme"/)
  assert.match(appSource, /:aria-label="themeToggleLabel"/)
  assert.match(appSource, /class="ui-line-icon theme-toggle-icon"/)
  assert.match(appSource, /iconMask\(isDarkTheme \? sunIcon : moonIcon\)/)
  assert.match(styleSource, /\.ui-line-icon \{/)
  assert.match(styleSource, /\.app-shell\.theme-dark \{/)
  assert.match(shellStyleSource, /\.theme-toggle-button \{/)
  assert.match(shellStyleSource, /\.theme-dark \.theme-toggle-icon \{/)
  assert.match(historyStyleSource, /\.app-shell\.theme-dark \.history-filter-chip \{/)
  assert.match(historyStyleSource, /\.app-shell\.theme-dark \.echo-roll-list span \{/)
  assert.match(workspaceStyleSource, /\.app-shell\.theme-dark \.active-config-chips span \{/)
  assert.match(workspaceStyleSource, /\.app-shell\.theme-dark \.active-summary \{/)
  assert.match(workspaceStyleSource, /\.app-shell\.theme-dark \.tier-grid button \{/)
  assert.match(shellStyleSource, /\.app-shell\.theme-dark \.topbar \.pill-tabs \{/)
  assert.match(authStyleSource, /\.app-shell\.theme-dark \.terminal-home \{/)
  assert.match(authStyleSource, /\.app-shell\.theme-dark \.terminal-auth-card \{/)
  assert.match(styleSource, /\.app-shell\.theme-dark \.button-buy \{/)
  assert.match(styleSource, /\.app-shell\.theme-dark \.error-text \{/)
  assert.match(styleSource, /\.app-shell\.theme-dark \.stats-summary-bar article,/) 
  assert.match(styleSource, /\.app-shell\.theme-dark \.evaluation-status-chip,/) 
  assert.match(styleSource, /\.app-shell\.theme-dark \.model-bars article,/) 
  assert.match(styleSource, /\.app-shell\.theme-dark \.evaluation-summary-kicker \{/)
  assert.match(styleSource, /\.app-shell\.theme-dark \.model-bars-head \{/)
  assert.match(styleSource, /\.app-shell\.theme-dark \.model-row-detail \.model-insight-card \{/)
  assert.match(styleSource, /\.app-shell\.theme-dark \.model-chart-bayes \{/)
  assert.match(styleSource, /\.app-shell\.theme-dark \.bayes-path-list article \{/)
  assert.match(styleSource, /\.app-shell\.theme-dark \.cycle-window-grid article,/) 
  assert.match(styleSource, /\.app-shell\.theme-dark \.markov-axis-chart \{/)
  assert.match(styleSource, /\.app-shell\.theme-dark \.rule-deviation-chart \{/)
  assert.match(styleSource, /\.app-shell\.theme-dark \.context-check-grid \{/)
  assert.match(styleSource, /\.app-shell\.theme-dark \.model-metric-grid \{/)
  assert.match(styleSource, /\.app-shell\.theme-dark \.model-weight-change \{/)
})

test('topbar renders the shared uid switcher for game account selection', async () => {
  const appSource = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  const uidSetupSource = await readFile(new URL('./features/workspace/UidSetupView.vue', import.meta.url), 'utf8')
  const shellStyleSource = await readFile(new URL('./styles/shell.css', import.meta.url), 'utf8')

  assert.match(uidSetupSource, /import \{ validateUidBinding \} from '\.\/uidSetup\.js'/)
  assert.match(appSource, /import UidSwitcher from '\.\/components\/controls\/UidSwitcher\.vue'/)
  assert.match(appSource, /const boundPlayerUid = computed\(\(\) => gameAccount\.currentAccount\.value\?\.uid \|\| ''\)/)
  assert.match(appSource, /const accountChanging = ref\(false\)/)
  assert.match(appSource, /const appBusy = computed\(\(\) => saving\.value \|\| accountChanging\.value\)/)
  assert.match(appSource, /<UidSwitcher[\s\S]+:accounts="gameAccount\.boundAccounts\.value"[\s\S]+:current-account="gameAccount\.currentAccount\.value"[\s\S]+:can-add-account="gameAccount\.canAddAccount\.value"[\s\S]+:busy="appBusy \|\| gameAccount\.loading\.value"[\s\S]+:error="error"[\s\S]+@select="selectGameAccount"[\s\S]+@add="addGameAccount"/)
  assert.doesNotMatch(appSource, /class="uid-chip-value">\{\{ boundPlayerUid \|\|/)
  assert.doesNotMatch(appSource, /uidQuickSwitchRows/)
  assert.doesNotMatch(appSource, /switchPlayerUid/)
  assert.doesNotMatch(appSource, /readRecentPlayerUids/)
  assert.doesNotMatch(appSource, /addRecentPlayerUid/)
  assert.match(shellStyleSource, /\.uid-status-dot \{/)
  assert.match(shellStyleSource, /\.uid-chip-label \{/)
  assert.match(shellStyleSource, /\.uid-chip-value \{/)
})

test('floating history controls use the shared line icon system', async () => {
  const historySource = await readFile(new URL('./features/history/FloatingHistoryPanel.vue', import.meta.url), 'utf8')
  const readmeSource = await readFile(new URL('./assets/icons/README.md', import.meta.url), 'utf8')
  const iconSources = await Promise.all([
    readFile(new URL('./assets/icons/pin.svg', import.meta.url), 'utf8'),
    readFile(new URL('./assets/icons/layout-list.svg', import.meta.url), 'utf8'),
    readFile(new URL('./assets/icons/panel-left.svg', import.meta.url), 'utf8'),
    readFile(new URL('./assets/icons/fast-arrow-up.svg', import.meta.url), 'utf8'),
    readFile(new URL('./assets/icons/sun.svg', import.meta.url), 'utf8'),
    readFile(new URL('./assets/icons/moon.svg', import.meta.url), 'utf8'),
    readFile(new URL('./assets/icons/chevron-down.svg', import.meta.url), 'utf8'),
    readFile(new URL('./assets/icons/help-circle.svg', import.meta.url), 'utf8'),
  ])

  assert.match(historySource, /import historyPinnedIcon from '\.\.\/\.\.\/assets\/icons\/pin\.svg'/)
  assert.match(historySource, /import historyShowcaseIcon from '\.\.\/\.\.\/assets\/icons\/layout-list\.svg'/)
  assert.match(historySource, /import historyMinimizeIcon from '\.\.\/\.\.\/assets\/icons\/panel-left\.svg'/)
  assert.match(historySource, /class="ui-line-icon history-action-icon"/)
  assert.match(historySource, /iconMask\(historyPinnedIcon\)/)
  assert.match(historySource, /iconMask\(historyShowcaseIcon\)/)
  assert.match(historySource, /iconMask\(historyMinimizeIcon\)/)
  assert.match(readmeSource, /Iconoir/)
  assert.match(readmeSource, /官方库/)
  for (const iconSource of iconSources) {
    assert.match(iconSource, /stroke-width="1\.5"/)
    assert.match(iconSource, /stroke-linecap="round"/)
    assert.match(iconSource, /stroke-linejoin="round"/)
  }
})

test('workbench shell follows the VS Code homepage-style navigation and overview', async () => {
  const appSource = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  const workspaceSource = await readFile(new URL('./features/workspace/useEchoWorkspace.js', import.meta.url), 'utf8')

  assert.match(workspaceSource, /import \{ buildNextEchoConfig, isReusableDraft, sortVisibleEchoHistory \} from '\.\.\/\.\.\/services\/echoWorkflow\.js'/)
  assert.match(workspaceSource, /const visibleEchoCount = computed\(\(\) => sortVisibleEchoHistory\(echoes\.value\)\.length\)/)
  assert.match(appSource, /<section v-else class="dashboard vscode-workbench-shell">/)
  assert.match(appSource, /class="vscode-workbench-overview"/)
  assert.match(appSource, /class="workbench-overview-copy"/)
  assert.match(appSource, /<strong>\{\{ visibleEchoCount \}\}<\/strong>/)
  assert.match(appSource, /:is-dark-theme="isDarkTheme"/)
  assert.doesNotMatch(appSource, /terminal-activity-rail/)
  assert.doesNotMatch(appSource, /workbench-status-bar/)
  assert.doesNotMatch(appSource, /\{\{ sortedEchoes\.length \}\}/)
  assert.doesNotMatch(appSource, /<section class="hero-band compact">/)
})

test('milestone 3 uses account login and locks workbench until default game uid is bound', async () => {
  const appSource = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  const loginSource = await readFile(new URL('./features/auth/LoginView.vue', import.meta.url), 'utf8')
  const uidSetupSource = await readFile(new URL('./features/workspace/UidSetupView.vue', import.meta.url), 'utf8')
  const uidSetupStyleSource = await readFile(new URL('./styles/features/uid-setup.css', import.meta.url), 'utf8')

  assert.match(appSource, /import \{ useAuth \} from '\.\/composables\/useAuth'/)
  assert.match(appSource, /import \{ useGameAccount \} from '\.\/composables\/useGameAccount'/)
  assert.match(appSource, /import LoginView from '\.\/features\/auth\/LoginView\.vue'/)
  assert.match(appSource, /<LoginView v-else-if="!user" :error="error" @submit="submitAuth" \/>/)
  assert.match(loginSource, /const authForm = ref\(\{\s+username: localStorage\.getItem\('wuwa-login-username'\) \|\| '',\s+password: '',\s+mode: 'login'/)
  assert.match(appSource, /async function submitAuth\(\{ username, password, mode, saveLogin \}\)/)
  assert.match(appSource, /localStorage\.setItem\('wuwa-save-login', saveLogin \? 'true' : 'false'\)/)
  assert.match(appSource, /await auth\.signIn\(payload\)/)
  assert.match(appSource, /await gameAccount\.loadGameAccounts\(\)/)
  assert.match(appSource, /const selectedGameAccountId = computed\(\(\) => gameAccount\.currentAccount\.value\?\.id \|\| null\)/)
  assert.match(appSource, /const boundPlayerUid = computed\(\(\) => gameAccount\.currentAccount\.value\?\.uid \|\| ''\)/)
  assert.match(appSource, /import UidSetupView from '\.\/features\/workspace\/UidSetupView\.vue'/)
  assert.match(appSource, /v-else-if="gameAccount\.workspaceLocked\.value"/)
  assert.match(appSource, /@bind="submitUidBinding"/)
  assert.match(appSource, /@clear-error="error = ''"/)
  assert.match(uidSetupSource, /<section class="uid-setup-card">/)
  assert.match(uidSetupSource, /@submit\.prevent="submitUidBinding"/)
  assert.match(appSource, /await changeGameAccount\(\(\) => gameAccount\.bindInitialUid\(uid\)\)/)
  assert.match(appSource, /await refreshAll\(\)/)
  assert.doesNotMatch(appSource, /uidCredentials/)
  assert.doesNotMatch(appSource, /submitUidLogin/)
  assert.doesNotMatch(appSource, /switchPlayerUid/)
  assert.doesNotMatch(appSource, /readRecentPlayerUids/)
  assert.doesNotMatch(appSource, /wuwa-player-uid/)
  assert.match(uidSetupStyleSource, /\.uid-binding-form \{/)
  assert.match(uidSetupStyleSource, /\.uid-setup-card \{[\s\S]+grid-template-columns: 240px minmax\(0, 1fr\);/)
  assert.match(uidSetupStyleSource, /\.uid-binding-form \{[\s\S]+padding: 38px 42px;/)
})

test('app account changes reset workspace before mutation and refresh only after success', async () => {
  const appSource = await readFile(new URL('./App.vue', import.meta.url), 'utf8')

  assert.match(appSource, /async function changeGameAccount\(change\) \{[\s\S]+error\.value = ''[\s\S]+accountChanging\.value = true[\s\S]+resetWorkspaceState\(\)[\s\S]+let accountChanged = false[\s\S]+try \{[\s\S]+await change\(\)[\s\S]+accountChanged = true[\s\S]+await refreshAll\(\)[\s\S]+catch \(err\) \{[\s\S]+error\.value = err\.message[\s\S]+await gameAccount\.loadGameAccounts\(\)\.catch\(\(\) => \{\}\)[\s\S]+if \(accountChanged\) \{[\s\S]+gameAccount\.selectedAccountId\.value = null[\s\S]+\}[\s\S]+resetWorkspaceState\(\)[\s\S]+finally \{[\s\S]+accountChanging\.value = false[\s\S]+\}/)
  assert.match(appSource, /async function submitUidBinding\(uid\) \{[\s\S]+await changeGameAccount\(\(\) => gameAccount\.bindInitialUid\(uid\)\)/)
  assert.match(appSource, /async function addGameAccount\(uid\) \{[\s\S]+await changeGameAccount\(\(\) => gameAccount\.addGameAccount\(uid\)\)/)
  assert.match(appSource, /async function selectGameAccount\(accountOrId\) \{[\s\S]+const id = typeof accountOrId === 'object' \? accountOrId\?\.id : accountOrId[\s\S]+await changeGameAccount\(\(\) => gameAccount\.switchGameAccount\(id\)\)/)
})

test('locked uid binding state shows a focused setup page without workbench chrome', async () => {
  const appSource = `${await readFile(new URL('./App.vue', import.meta.url), 'utf8')}\n${await readFile(new URL('./features/workspace/UidSetupView.vue', import.meta.url), 'utf8')}`
  const styleSource = [
    await readFile(new URL('./style.css', import.meta.url), 'utf8'),
    await readFile(new URL('./styles/features/evaluation.css', import.meta.url), 'utf8'),
    await readFile(new URL('./styles/controls.css', import.meta.url), 'utf8'),
  ].join('\n')
  const uidSetupStyleSource = await readFile(new URL('./styles/features/uid-setup.css', import.meta.url), 'utf8')

  assert.match(appSource, /<UidSetupView[\s\S]+v-else-if="gameAccount\.workspaceLocked\.value"/)
  assert.match(appSource, /<header class="uid-setup-topbar">/)
  assert.match(appSource, /class="pill-tabs disabled-tabs"/)
  assert.match(appSource, /disabled>工作台<\/button>/)
  assert.match(appSource, /disabled>统计<\/button>/)
  assert.match(appSource, /disabled>评估<\/button>/)
  assert.match(appSource, /<div class="uid-setup-content">/)
  assert.match(appSource, /<section class="uid-setup-card">/)
  assert.match(appSource, /<div class="uid-setup-media" aria-hidden="true">/)
  assert.doesNotMatch(appSource, /class="uid-setup-step"/)
  assert.match(appSource, /<h1>绑定游戏 UID<\/h1>/)
  assert.match(appSource, /绑定后即可进入工作台。/)
  assert.match(appSource, /<label class="uid-binding-field" for="uid-binding-input">\s+UID\s+<input/)
  assert.match(appSource, /placeholder="输入你的 UID"/)
  assert.match(appSource, /\{\{ saving \? '绑定中' : '绑定并进入' \}\}/)
  assert.match(appSource, /<section v-else class="dashboard vscode-workbench-shell">/)
  assert.doesNotMatch(appSource, /<section v-if="gameAccount\.workspaceLocked\.value" class="locked-workbench product-panel">/)
  assert.match(uidSetupStyleSource, /\.uid-setup-topbar \{[\s\S]+width: 100%;/)
  assert.match(uidSetupStyleSource, /\.uid-setup-topbar \{[\s\S]+margin: 0 auto;/)
  assert.match(uidSetupStyleSource, /\.uid-setup-shell \{[\s\S]+width: min\(1360px, calc\(100% - 64px\)\);/)
  assert.match(uidSetupStyleSource, /\.uid-setup-content \{[\s\S]+padding-top: clamp\(48px, 8vh, 88px\);/)
  assert.match(uidSetupStyleSource, /\.uid-setup-card \{[\s\S]+width: min\(700px, 100%\);/)
  assert.match(uidSetupStyleSource, /\.uid-setup-media \{[\s\S]+radial-gradient/)
  assert.match(uidSetupStyleSource, /@media \(max-width: 860px\)[\s\S]+\.uid-setup-card \{[\s\S]+grid-template-columns: 1fr;/)
  assert.match(uidSetupStyleSource, /\.disabled-tabs button \{/)
  assert.match(uidSetupStyleSource, /\.disabled-tabs button\.active \{[\s\S]+background: rgba\(23, 105, 210, 0\.08\);/)
  assert.match(styleSource, /input:focus \{[\s\S]+box-shadow: 0 0 0 2px rgba\(24, 118, 242, 0\.1\);/)
})

test('milestone 3 scopes frontend data calls to the selected game account', async () => {
  const appSource = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  const workspaceSource = await readFile(new URL('./features/workspace/useEchoWorkspace.js', import.meta.url), 'utf8')

  assert.match(appSource, /selectedGameAccountId,/)
  assert.match(workspaceSource, /const accountId = selectedGameAccountId\.value/)
  assert.match(workspaceSource, /await listEchoes\(accountId\)/)
  assert.match(workspaceSource, /await createEcho\(\{\s+display_name: '',[\s\S]+?\}, accountId\)/)
  assert.match(workspaceSource, /const nextStats = await getStats\(accountId\)/)
  assert.match(workspaceSource, /const nextEvaluation = await getModelEvaluation\(accountId\)/)
})

test('milestone 6 shows recognition summary, review list, and revert action', async () => {
  const appSource = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  const panelSource = await readFile(new URL('./features/recognition/RecognitionReviewPanel.vue', import.meta.url), 'utf8')
  const workflowSource = await readFile(new URL('./features/recognition/useRecognitionReview.js', import.meta.url), 'utf8')
  const recognitionStyleSource = await readFile(new URL('./styles/features/recognition.css', import.meta.url), 'utf8')

  assert.match(workflowSource, /listRecognitionSessions/)
  assert.match(workflowSource, /listRecognitionSnapshots/)
  assert.match(workflowSource, /revertRecognitionSnapshot/)
  assert.match(appSource, /import RecognitionReviewPanel from '\.\/features\/recognition\/RecognitionReviewPanel\.vue'/)
  assert.match(appSource, /import \{ useRecognitionReview \} from '\.\/features\/recognition\/useRecognitionReview'/)
  assert.match(workflowSource, /const refreshing = ref\(false\)/)
  assert.match(workflowSource, /const refreshStatus = ref\(''\)/)
  assert.match(workflowSource, /let refreshFeedbackTimer = null/)
  assert.match(workflowSource, /const refreshDisabled = computed\(\(\) => saving\.value \|\| refreshing\.value \|\| Boolean\(refreshStatus\.value\)\)/)
  assert.match(workflowSource, /const sessions = ref\(\[\]\)/)
  assert.match(workflowSource, /const snapshots = ref\(\[\]\)/)
  assert.match(workflowSource, /const latestSession = computed/)
  assert.match(workflowSource, /const reviewRows = computed/)
  assert.match(workflowSource, /async function refresh\(\{ silent = false \} = \{\}\)/)
  assert.match(appSource, /await refreshRecognition\(\{ silent: true \}\)/)
  assert.match(workflowSource, /function setRefreshStatus\(status\)/)
  assert.match(workflowSource, /setRefreshStatus\('success'\)/)
  assert.match(workflowSource, /setRefreshStatus\('error'\)/)
  assert.match(appSource, /async function revertSnapshot\(snapshot\)/)
  assert.match(appSource, /:review-rows="recognitionReviewRows"/)
  assert.match(appSource, /@refresh="refreshRecognition"/)
  assert.match(appSource, /@revert="revertSnapshot"/)
  assert.match(workflowSource, /snapshot_count/)
  assert.match(workflowSource, /saved_roll_count/)
  assert.match(workflowSource, /conflict_count/)
  assert.match(panelSource, /import refreshIcon from '\.\.\/\.\.\/assets\/icons\/refresh-cw\.svg'/)
  assert.match(panelSource, /import checkIcon from '\.\.\/\.\.\/assets\/icons\/check\.svg'/)
  assert.match(panelSource, /import xIcon from '\.\.\/\.\.\/assets\/icons\/x\.svg'/)
  assert.match(panelSource, /class="recognition-panel product-panel"/)
  assert.match(panelSource, /aria-label="刷新识别结果"/)
  assert.match(panelSource, /:class="\[refreshStatus, \{ refreshing \}\]"/)
  assert.match(panelSource, /:disabled="refreshDisabled"/)
  assert.match(panelSource, /:aria-busy="refreshing"/)
  assert.match(panelSource, /iconMask\(refreshIconSource\)/)
  assert.match(panelSource, /本地自动识别/)
  assert.match(panelSource, /class="recognition-summary-strip"/)
  assert.match(panelSource, /class="recognition-metric-grid"/)
  assert.match(panelSource, /v-for="snapshot in reviewRows"/)
  assert.match(panelSource, /@click="emit\('revert', snapshot\)"/)
  assert.match(recognitionStyleSource, /\.product-panel\.recognition-panel \{/)
  assert.match(recognitionStyleSource, /\.recognition-refresh-button \{/)
  assert.match(recognitionStyleSource, /\.recognition-refresh-button:hover:not\(:disabled\) \.ui-line-icon \{/)
  assert.match(recognitionStyleSource, /\.recognition-refresh-button\.refreshing \.ui-line-icon \{/)
  assert.match(recognitionStyleSource, /@keyframes recognition-refresh-spin/)
  assert.match(recognitionStyleSource, /\.recognition-refresh-button\.success \{/)
  assert.match(recognitionStyleSource, /\.recognition-refresh-button\.error \{/)
  assert.match(recognitionStyleSource, /\.recognition-summary-strip \{/)
  assert.match(recognitionStyleSource, /\.recognition-metric-grid \{/)
  assert.match(recognitionStyleSource, /\.recognition-review-row \{/)
  assert.match(recognitionStyleSource, /\.app-shell\.theme-dark \.recognition-summary-strip \{/)
  assert.match(recognitionStyleSource, /\.app-shell\.theme-dark \.recognition-review-row,/)
})

test('tier clicks update the active echo without blocking on full workspace refresh', async () => {
  const appSource = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  const workbenchSource = await readFile(new URL('./features/workspace/EchoWorkbenchView.vue', import.meta.url), 'utf8')
  const workspaceSource = await readFile(new URL('./features/workspace/useEchoWorkspace.js', import.meta.url), 'utf8')
  const workspaceStyleSource = await readFile(new URL('./styles/features/workspace.css', import.meta.url), 'utf8')
  const clickTierBody = workspaceSource.match(/async function clickTier\(row, tier\) \{[\s\S]+?\n  \}/)?.[0] || ''
  const undoBody = workspaceSource.match(/async function undoActiveSubstat\(\) \{[\s\S]+?\n  \}/)?.[0] || ''

  assert.match(workspaceSource, /function appendRollToEcho\(echoId, roll\)/)
  assert.match(workspaceSource, /function refreshInsightsInBackground\(\)/)
  assert.match(workspaceSource, /function refreshActiveInBackground\(\)/)
  assert.match(workspaceSource, /const pendingTierKey = ref\(''\)/)
  assert.match(workspaceSource, /let activePredictionRefreshToken = 0/)
  assert.match(workspaceSource, /let insightsRefreshTimer = null/)
  assert.match(workspaceSource, /clearTimeout\(insightsRefreshTimer\)/)
  assert.match(workspaceSource, /setTimeout\(\(\) => \{/)
  assert.match(clickTierBody, /const roll = await addSubstat/)
  assert.match(clickTierBody, /appendRollToEcho\(echo\.id, optimisticRoll\)/)
  assert.match(clickTierBody, /replaceOptimisticRollInEcho\(echo\.id, optimisticRoll\.id, roll\)/)
  assert.match(clickTierBody, /refreshActiveInBackground\(\)/)
  assert.match(clickTierBody, /refreshInsightsInBackground\(\)/)
  assert.doesNotMatch(clickTierBody, /saving\.value = true/)
  assert.doesNotMatch(clickTierBody, /await refreshActive\(\)/)
  assert.doesNotMatch(clickTierBody, /refreshAll\(\)/)
  assert.match(workbenchSource, /:disabled="Boolean\(row\.recorded\) \|\| isTierPending\(row, tier\)"/)
  assert.match(workbenchSource, /v-memo="\[row\.recorded\?\.id, row\.recorded\?\.tier_value, row\.candidate\?\.p_final, row\.candidate\?\.baseline_deviation, row\.topPredicted, pendingTierKey\]"/)
  assert.doesNotMatch(workbenchSource, /:disabled="Boolean\(row\.recorded\) \|\| saving"/)
  assert.doesNotMatch(workspaceSource, /activeEchoId\.value\}:\$\{activeEcho\.value\?\.substats\.length/)
  assert.match(workspaceStyleSource, /\.substat-row \{[\s\S]+contain: layout paint;/)
  assert.match(undoBody, /replaceEcho\(result\.echo\)/)
  assert.match(undoBody, /refreshInsightsInBackground\(\)/)
  assert.doesNotMatch(undoBody, /refreshAll\(\)/)
})

test('tier clicks optimistically update before waiting for the save request', async () => {
  const workspaceSource = await readFile(new URL('./features/workspace/useEchoWorkspace.js', import.meta.url), 'utf8')
  const clickTierBody = workspaceSource.match(/async function clickTier\(row, tier\) \{[\s\S]+?\n  \}/)?.[0] || ''

  assert.match(workspaceSource, /function buildOptimisticRoll\(row, tier\)/)
  assert.match(workspaceSource, /function removeOptimisticRollFromEcho\(echoId, optimisticRollId\)/)
  assert.match(workspaceSource, /function replaceOptimisticRollInEcho\(echoId, optimisticRollId, roll\)/)
  assert.match(clickTierBody, /optimisticRoll = buildOptimisticRoll\(row, tier\)/)
  assert.match(clickTierBody, /appendRollToEcho\(echo\.id, optimisticRoll\)[\s\S]+const roll = await addSubstat/)
  assert.match(clickTierBody, /replaceOptimisticRollInEcho\(echo\.id, optimisticRoll\.id, roll\)/)
  assert.match(clickTierBody, /removeOptimisticRollFromEcho\(optimisticEchoId, optimisticRoll\.id\)/)
})

test('new echo creation lets backend allocate echo uid', async () => {
  const source = await readFile(new URL('./features/workspace/useEchoWorkspace.js', import.meta.url), 'utf8')

  assert.doesNotMatch(source, /generateNumericEchoUid/)
  assert.doesNotMatch(source, /nextEchoSequence/)
  assert.doesNotMatch(source, /function generateEchoUid/)
  assert.doesNotMatch(source, /echo_uid:\s*generateEchoUid\(\)/)
})

test('evaluation summary keeps original copy while styling dominant and auxiliary models differently', async () => {
  const source = await readFile(new URL('./features/evaluation/EvaluationOverview.vue', import.meta.url), 'utf8')

  assert.match(source, /const activeRows = weightRows\.value/)
  assert.match(source, /const dominantKey = modelDetailSummary\.value\.dominantModel \|\| activeRows\[0\]\?\.key \|\| null/)
  assert.match(source, /:class="evaluationSummaryParts\.dominant\.key \? `summary-dominant-\$\{evaluationSummaryParts\.dominant\.key\}` : ''"/)
  assert.match(source, /<strong :key="evaluationSummaryParts\.motionKey" class="evaluation-summary-copy">/)
  assert.match(source, /当前由<span/)
  assert.match(source, /<\/span>主导，<template/)
  assert.match(source, /<\/template>作为辅助。/)
  assert.doesNotMatch(source, /阶段，结论仍需结合样本规模判断。/)
  assert.match(source, /summary-model-link summary-model-link-dominant/)
  assert.match(source, /summary-model-link summary-model-link-auxiliary/)
})

test('model detail rows animate when expanded or collapsed', async () => {
  const backtestSource = await readFile(new URL('./features/evaluation/EvaluationBacktest.vue', import.meta.url), 'utf8')
  const styleSource = [
    await readFile(new URL('./style.css', import.meta.url), 'utf8'),
    await readFile(new URL('./styles/features/evaluation.css', import.meta.url), 'utf8'),
    await readFile(new URL('./styles/controls.css', import.meta.url), 'utf8'),
  ].join('\n')

  assert.match(backtestSource, /import chevronDownIcon from '\.\.\/\.\.\/assets\/icons\/chevron-down\.svg'/)
  assert.match(backtestSource, /const hasManualModelDetailInteraction = ref\(false\)/)
  assert.match(backtestSource, /if \(hasManualModelDetailInteraction\.value\) \{\s+return null/)
  assert.match(backtestSource, /function toggleModelDetail\(key\) \{\s+hasManualModelDetailInteraction\.value = true/)
  assert.match(backtestSource, /<Transition name="model-row-detail">/)
  assert.match(backtestSource, /class="ui-line-icon model-expand-chevron"/)
  assert.match(backtestSource, /iconMask\(chevronDownIcon\)/)
  assert.match(backtestSource, /v-if="expandedModelDetailKey === row\.key" class="model-row-detail"/)
  assert.match(styleSource, /\.model-row-detail-enter-active,\s+\.model-row-detail-leave-active \{/)
  assert.match(styleSource, /\.model-row-detail-enter-from \{/)
  assert.match(styleSource, /\.model-row-detail-leave-to \{/)
  assert.match(styleSource, /opacity 220ms ease/)
  assert.match(styleSource, /\.model-row-detail-enter-from \{[\s\S]+transform: translateY\(6px\);/)
  assert.match(styleSource, /\.model-row-detail-leave-to \{[\s\S]+transform: translateY\(0\);/)
  assert.doesNotMatch(styleSource, /\.model-row-detail-enter-from,\s+\.model-row-detail-leave-to \{[\s\S]+translateY\(-6px\)/)
  assert.match(styleSource, /\.model-bars article\.expanded \.model-expand-chevron \{\s+transform: rotate\(180deg\);/)
})

test('evaluation help markers use the shared Iconoir help icon', async () => {
  const backtestSource = await readFile(new URL('./features/evaluation/EvaluationBacktest.vue', import.meta.url), 'utf8')
  const styleSource = await readFile(new URL('./styles/features/evaluation.css', import.meta.url), 'utf8')
  const helpIconSource = await readFile(new URL('./assets/icons/help-circle.svg', import.meta.url), 'utf8')

  assert.match(backtestSource, /import helpCircleIcon from '\.\.\/\.\.\/assets\/icons\/help-circle\.svg'/)
  assert.match(backtestSource, /class="ui-line-icon evaluation-help-icon"/)
  assert.match(backtestSource, /iconMask\(helpCircleIcon\)/)
  assert.doesNotMatch(backtestSource, /<i title="[^"]+">\?<\/i>/)
  assert.match(styleSource, /\.model-bars-head \.evaluation-help-icon \{/)
  assert.match(styleSource, /\.model-side-title \.evaluation-help-icon \{/)
  assert.match(helpIconSource, /M12 22C17\.5228 22 22 17\.5228 22 12/)
})

test('disabled backtest models are de-emphasized and sorted last', async () => {
  const backtestSource = await readFile(new URL('./features/evaluation/EvaluationBacktest.vue', import.meta.url), 'utf8')
  const overviewSource = await readFile(new URL('./features/evaluation/EvaluationOverview.vue', import.meta.url), 'utf8')
  const styleSource = [
    await readFile(new URL('./style.css', import.meta.url), 'utf8'),
    await readFile(new URL('./styles/features/evaluation.css', import.meta.url), 'utf8'),
    await readFile(new URL('./styles/controls.css', import.meta.url), 'utf8'),
  ].join('\n')

  assert.match(backtestSource, /const disabled = row\.status === 'disabled' \|\| weight <= ACTIVE_MODEL_WEIGHT_EPSILON/)
  assert.match(backtestSource, /if \(a\.disabled !== b\.disabled\) \{\s+return a\.disabled \? 1 : -1/)
  assert.match(backtestSource, /const defaultExpandedModelDetailKey = computed\(\(\) => modelEvaluationRows\.value\.find\(\(row\) => !row\.disabled\)\?\.key \|\| null\)/)
  assert.match(backtestSource, /if \(selectedKey && selectedRow && !collapsedModelDetailKeys\.value\.has\(selectedKey\)\) \{/)
  assert.doesNotMatch(backtestSource, /selectedRow && !selectedRow\.disabled/)
  assert.match(backtestSource, /disabled: row\.disabled/)
  assert.match(backtestSource, /class="disabled-model-badge"/)
  assert.match(overviewSource, /样本不足，暂未参与融合/)
  assert.match(styleSource, /\.model-bars article\.disabled,/)
  assert.match(styleSource, /\.model-bars article\.disabled \.model-row-progress b \{/)
  assert.match(styleSource, /\.disabled-model-badge/)
})

test('disabled fusion weight cards are dynamically de-emphasized', async () => {
  const overviewSource = await readFile(new URL('./features/evaluation/EvaluationOverview.vue', import.meta.url), 'utf8')
  const styleSource = [
    await readFile(new URL('./style.css', import.meta.url), 'utf8'),
    await readFile(new URL('./styles/features/evaluation.css', import.meta.url), 'utf8'),
    await readFile(new URL('./styles/controls.css', import.meta.url), 'utf8'),
  ].join('\n')

  assert.match(overviewSource, /const disabled = weight <= ACTIVE_MODEL_WEIGHT_EPSILON \|\| modelDetailByKey\.value\.get\(key\)\?\.status === 'disabled'/)
  assert.match(overviewSource, /statusLabel: disabled \? '未启用' : weightDiagnosticText\(\{ weight \}\)/)
  assert.match(overviewSource, /statusTitle: disabled \? '样本不足，暂未参与融合' : `当前参与融合，权重 \$\{formatPercent\(weight\)\}`/)
  assert.match(overviewSource, /<em v-if="row\.disabled" class="fusion-disabled-badge">\{\{ row\.statusLabel \}\}<\/em>/)
  assert.match(overviewSource, /if \(row\.disabled\) \{\s+return `\$\{row\.label\}：\$\{row\.statusTitle\}`/)
  assert.match(overviewSource, /if \(row\?\.disabled\) \{\s+return 'disabled'/)
  assert.match(styleSource, /\.fusion-weight-card\.disabled,/)
  assert.match(styleSource, /\.fusion-disabled-badge/)
  assert.match(styleSource, /\.fusion-weight-card\.disabled b \{/)
})

test('rule model detail keeps only evidence and does not duplicate statistics charts', async () => {
  const appSource = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  const styleSource = [
    await readFile(new URL('./style.css', import.meta.url), 'utf8'),
    await readFile(new URL('./styles/features/evaluation.css', import.meta.url), 'utf8'),
    await readFile(new URL('./styles/controls.css', import.meta.url), 'utf8'),
  ].join('\n')
  const detailSource = await readFile(new URL('./services/modelDetails.js', import.meta.url), 'utf8')

  assert.doesNotMatch(appSource, /function ruleSummaryMetrics\(model\)/)
  assert.doesNotMatch(appSource, /v-if="model\.key === 'rule'" class="rule-summary-panel"/)
  assert.doesNotMatch(appSource, /完整副词条分布请在统计页查看。/)
  assert.doesNotMatch(appSource, /v-if="model\.key === 'rule'" class="rule-deviation-chart"/)
  assert.doesNotMatch(appSource, /<strong>均衡线<\/strong>/)
  assert.doesNotMatch(detailSource, /均衡线/)
  assert.doesNotMatch(styleSource, /\.rule-summary-panel \{/)
  assert.doesNotMatch(styleSource, /\.rule-summary-metrics \{/)
})

test('evaluation metrics use backend values instead of preview fallbacks', async () => {
  const backtestSource = await readFile(new URL('./features/evaluation/EvaluationBacktest.vue', import.meta.url), 'utf8')
  const detailSource = await readFile(new URL('./services/modelDetails.js', import.meta.url), 'utf8')

  assert.doesNotMatch(backtestSource, /preview:\s*(2\.16|0\.86|0\.11|0\.34|0\.52)/)
  assert.match(backtestSource, /if \(metric\?\.value == null\) \{\s+return '样本不足'/)
  assert.match(backtestSource, /const evaluationReady = computed\(\(\) => props\.evaluation\?\.status === 'ready'/)
  assert.doesNotMatch(detailSource, /MODEL_BACKTEST_PREVIEW/)
  assert.ok(detailSource.includes('hitRate: evaluation?.model_scores?.[key]?.hit_rate ?? null'))
  assert.ok(detailSource.includes('loss: evaluation?.model_scores?.[key]?.loss ?? null'))
})

test('evaluation page exposes evaluated sample counts and gates confidence labels', async () => {
  const backtestSource = await readFile(new URL('./features/evaluation/EvaluationBacktest.vue', import.meta.url), 'utf8')
  const overviewSource = await readFile(new URL('./features/evaluation/EvaluationOverview.vue', import.meta.url), 'utf8')
  const detailSource = await readFile(new URL('./services/modelDetails.js', import.meta.url), 'utf8')

  assert.ok(detailSource.includes('evaluated: evaluation?.model_scores?.[key]?.evaluated ?? 0'))
  assert.match(backtestSource, /const modelBacktestSummaryText = computed\(\(\) => \(modelBacktestSampleCount\.value \? `回测样本 \$\{modelBacktestSampleCount\.value\} 条` : '等待回测样本'\)\)/)
  assert.match(backtestSource, /<span :title="modelBacktestSummaryText">\{\{ modelBacktestSummaryText \}\}<\/span>/)
  assert.match(backtestSource, /:title="row\.evaluated \? `\$\{row\.label\}基于 \$\{row\.evaluated\} 条样本回测` : `\$\{row\.label\}等待回测样本`"/)
  assert.doesNotMatch(backtestSource, /function modelEvaluatedText/)
  assert.match(backtestSource, /isBest: !disabled && evaluationReady\.value && bestHitRate != null && row\.hitRate === bestHitRate/)
  assert.match(overviewSource, /if \(props\.evaluation && props\.evaluation\.status !== 'ready'\) \{\s+return '样本不足'/)
  assert.doesNotMatch(backtestSource, /<span>\{\{ modelEvaluatedText\(row\) \}\}<\/span>/)
})

test('coverage band nodes keep colored fills in dark mode', async () => {
  const backtestSource = await readFile(new URL('./features/evaluation/EvaluationBacktest.vue', import.meta.url), 'utf8')
  const styleSource = [
    await readFile(new URL('./style.css', import.meta.url), 'utf8'),
    await readFile(new URL('./styles/features/evaluation.css', import.meta.url), 'utf8'),
    await readFile(new URL('./styles/controls.css', import.meta.url), 'utf8'),
  ].join('\n')

  assert.match(backtestSource, /class="coverage-band-node"/)
  assert.match(backtestSource, /:class="coverageNodeClass\(index\)"/)
  assert.match(styleSource, /--coverage-node-color: #1769d2;/)
  assert.match(styleSource, /--coverage-node-glow: rgba\(23, 105, 210, 0\.24\);/)
  assert.match(styleSource, /\.coverage-band-node\.middle \{\s+--coverage-node-color: #218b93;/)
  assert.match(styleSource, /\.coverage-band-node\.end \{\s+--coverage-node-color: #2c9f70;/)
  assert.match(styleSource, /border: 1px solid rgba\(255, 255, 255, 0\.86\);/)
  assert.match(styleSource, /\.app-shell\.theme-dark \.coverage-band-node \{\s+border-color: rgba\(237, 244, 248, 0\.32\);/)
  assert.match(styleSource, /inset 0 1px 0 rgba\(255, 255, 255, 0\.24\);/)
  assert.doesNotMatch(styleSource, /\.app-shell\.theme-dark \.sample-stage-marker,\s+\.app-shell\.theme-dark \.coverage-band-node/)
})

test('stats page focuses on analytics charts instead of prediction diagnostics', async () => {
  const appSource = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  const viewSource = await readFile(new URL('./features/statistics/StatisticsView.vue', import.meta.url), 'utf8')
  const statisticsStyleSource = await readFile(new URL('./styles/features/statistics.css', import.meta.url), 'utf8')

  assert.match(appSource, /import StatisticsView from '\.\/features\/statistics\/StatisticsView\.vue'/)
  assert.match(appSource, /<StatisticsView[\s\S]+:stats="stats"/)
  assert.doesNotMatch(viewSource, /class="product-panel prediction-strip stats-prediction-strip"/)
  assert.doesNotMatch(viewSource, /<h2>预测依据<\/h2>/)
  assert.match(viewSource, /class="stats-summary-bar"/)
  assert.match(viewSource, /:class="item.tone"/)
  assert.match(viewSource, /:title="item.title"/)
  assert.doesNotMatch(viewSource, /class="stats-diagnostic-pill"/)
  assert.match(viewSource, /基于 \$\{stats\.total_rolls \|\| 0\} 条样本/)
  assert.match(viewSource, /class="stats-empty-state"/)
  assert.match(viewSource, /class="substat-deviation-chart"/)
  assert.match(viewSource, /class="deviation-axis-scale"/)
  assert.match(viewSource, /class="sample-stage-axis"/)
  assert.match(viewSource, /class="sample-stage-marker"/)
  assert.match(viewSource, /stage\.current/)
  assert.match(viewSource, /<em v-if="stage\.current">当前<\/em>/)
  assert.match(viewSource, /class="stats-chart-card sample-stage-card"/)
  assert.doesNotMatch(viewSource, /context-progress-list/)
  assert.doesNotMatch(viewSource, /最大偏高/)
  assert.doesNotMatch(viewSource, /最大偏低/)
  assert.match(viewSource, /当前偏高/)
  assert.match(viewSource, /当前偏低/)
  assert.doesNotMatch(viewSource, /上下文监控/)
  assert.match(viewSource, /v-for="row in sortedStatFrequency"/)
  assert.match(viewSource, /v-for="stage in sampleStageAxisRows"/)
  assert.doesNotMatch(viewSource, /contextProgressRows/)
  assert.match(statisticsStyleSource, /\.substat-deviation-row \{/)
  assert.match(statisticsStyleSource, /\.deviation-axis-scale \{/)
  assert.match(statisticsStyleSource, /\.sample-stage-marker \{/)
  assert.match(statisticsStyleSource, /\.stats-empty-state \{/)
  assert.match(statisticsStyleSource, /\.sample-stage-axis article\.current em \{/)
  assert.match(statisticsStyleSource, /\.sample-stage-axis \{/)
  assert.match(statisticsStyleSource, /\.sample-stage-card \{/)
  assert.match(statisticsStyleSource, /grid-template-columns: minmax\(0, 1fr\);/)
  assert.doesNotMatch(statisticsStyleSource, /\.context-progress-row \{/)
})
