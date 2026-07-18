import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('app delegates sample summary and page refresh without owning zero-state copy', async () => {
  const source = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  assert.match(source, /import WorkspaceSummary from '\.\/components\/shell\/WorkspaceSummary\.vue'/)
  assert.match(source, /useDashboardNavigation\(\{ refreshStats, refreshEvaluation \}\)/)
  assert.match(source, /<WorkspaceSummary/)
  assert.match(source, /:first-entry="stats !== null && !stats\.total_rolls"/)
  assert.match(source, /@start-recording="openPage\('workspace'\)"/)
  assert.match(source, /:request-status="evaluationRequestStatus"/)
  assert.match(source, /@retry="refreshEvaluation"/)
  assert.doesNotMatch(source, /prediction \? confidenceText/)
})

function findElementsByClassToken(source, classToken) {
  const elements = []
  const openingTagPattern = /<([a-z][\w-]*)\b(?=[^>]*\sclass\s*=\s*"([^"]*)")[^>]*>/gi

  for (const match of source.matchAll(openingTagPattern)) {
    const classTokens = match[2].split(/\s+/).filter(Boolean)
    if (!classTokens.includes(classToken)) continue

    const closingTag = `</${match[1]}>`
    const closingStart = source.indexOf(closingTag, match.index + match[0].length)
    elements.push({
      tagName: match[1].toLowerCase(),
      classTokens,
      start: match.index,
      end: closingStart,
      section: closingStart >= 0 ? source.slice(match.index, closingStart + closingTag.length) : '',
    })
  }

  return elements
}

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
    await readFile(new URL('./styles/page-summary.css', import.meta.url), 'utf8'),
    await readFile(new URL('./styles/features/evaluation.css', import.meta.url), 'utf8'),
    await readFile(new URL('./styles/controls.css', import.meta.url), 'utf8'),
    await readFile(new URL('./styles/features/statistics.css', import.meta.url), 'utf8'),
  ].join('\n')
  const shellStyleSource = await readFile(new URL('./styles/shell.css', import.meta.url), 'utf8')
  const historyStyleSource = await readFile(new URL('./styles/features/history.css', import.meta.url), 'utf8')
  const authStyleSource = await readFile(new URL('./styles/features/auth.css', import.meta.url), 'utf8')
  const workspaceStyleSource = [
    await readFile(new URL('./styles/features/workspace.css', import.meta.url), 'utf8'),
    await readFile(new URL('./styles/features/workspace-active.css', import.meta.url), 'utf8'),
  ].join('\n')

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
  assert.match(workspaceStyleSource, /\.app-shell\.theme-dark \.active-echo-stage,/)
  assert.match(workspaceStyleSource, /\.app-shell\.theme-dark \.active-record-panel \{/)
  assert.match(workspaceStyleSource, /\.app-shell\.theme-dark \.active-summary \{/)
  assert.match(workspaceStyleSource, /\.app-shell\.theme-dark \.tier-grid button \{/)
  assert.match(shellStyleSource, /\.app-shell\.theme-dark \.topbar \.pill-tabs \{/)
  assert.match(authStyleSource, /\.app-shell\.theme-dark \.terminal-home \{/)
  assert.match(authStyleSource, /\.app-shell\.theme-dark \.terminal-auth-card \{/)
  assert.match(styleSource, /\.app-shell\.theme-dark \.button-buy \{/)
  assert.match(styleSource, /\.app-shell\.theme-dark \.error-text \{/)
  assert.match(styleSource, /\.app-shell\.theme-dark \.stats-task-card \{/)
  assert.match(styleSource, /\.app-shell\.theme-dark \.page-summary-chip \{/)
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

test('topbar uses a compact accessible TETHYS wordmark without changing the hero', async () => {
  const appSource = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  const summarySource = await readFile(new URL('./components/shell/WorkspaceSummary.vue', import.meta.url), 'utf8')
  const shellStyleSource = await readFile(new URL('./styles/shell.css', import.meta.url), 'utf8')

  assert.match(appSource, /<a class="wordmark" href="#" aria-label="返回 Tethys System 工作台" @click\.prevent="openPage\('workspace'\)"><span class="wordmark-symbol" aria-hidden="true"><\/span>TETHYS<\/a>/)
  assert.doesNotMatch(appSource, /<a class="wordmark"[^>]*>Tethys System<\/a>/)
  assert.match(appSource, /<WorkspaceSummary/)
  assert.match(summarySource, /<section class="hero-band compact">[\s\S]+<h1>你好，漂泊者<\/h1>/)
  assert.match(summarySource, /<span>历史声骸<\/span>[\s\S]+<span>总样本<\/span>[\s\S]+<span>置信度<\/span>/)
  assert.match(shellStyleSource, /\.wordmark \{[\s\S]+gap: 10px;[\s\S]+font-family: var\(--font-latin\);[\s\S]+font-size: 16px;[\s\S]+font-weight: var\(--weight-control\);[\s\S]+letter-spacing: var\(--tracking-brand\);/)
  assert.match(shellStyleSource, /\.wordmark-symbol \{[^}]+position: relative;[^}]+flex: 0 0 auto;[^}]+width: 20px;[^}]+height: 20px;/)
  assert.match(shellStyleSource, /\.wordmark-symbol::before \{[^}]+border: 1\.5px solid var\(--primary\);/)
  assert.match(shellStyleSource, /\.wordmark-symbol::after \{[^}]+background: var\(--primary\);/)
  assert.doesNotMatch(shellStyleSource, /\.wordmark-symbol(?:::(?:before|after))? \{[^}]+linear-gradient/)
  assert.doesNotMatch(shellStyleSource, /\.wordmark::before \{[^}]+linear-gradient/)
})

test('homepage and browser tab share the compact TETHYS brand mark', async () => {
  const loginSource = await readFile(new URL('./features/auth/LoginView.vue', import.meta.url), 'utf8')
  const authStyleSource = await readFile(new URL('./styles/features/auth.css', import.meta.url), 'utf8')
  const indexSource = await readFile(new URL('../index.html', import.meta.url), 'utf8')

  assert.match(loginSource, /<img class="terminal-brand-icon" src="\/tethys-mark\.svg" alt="" aria-hidden="true" \/>\s*<span class="terminal-brand-wordmark">TETHYS<\/span>/)
  assert.doesNotMatch(loginSource, /Tethys System <span>\| 泰缇斯枢纽<\/span>/)
  assert.match(authStyleSource, /\.terminal-brand-icon \{[^}]+display: block;[^}]+width: 24px;[^}]+height: 24px;/)
  assert.doesNotMatch(authStyleSource, /\.terminal-brand-icon::after/)
  assert.doesNotMatch(authStyleSource, /\.terminal-brand span:last-child/)
  assert.doesNotMatch(authStyleSource, /@media \(max-width: 520px\) \{[\s\S]*?\.terminal-brand \{[^}]*flex-wrap: wrap;/)
  assert.match(indexSource, /<link rel="icon" type="image\/svg\+xml" href="\/tethys-mark\.svg" \/>/)
  assert.match(indexSource, /<title>泰缇斯枢纽<\/title>/)

  const markSource = await readFile(new URL('../public/tethys-mark.svg', import.meta.url), 'utf8')
  assert.match(markSource, /viewBox="0 0 24 24"/)
  assert.match(markSource, /<circle cx="10\.5" cy="12\.5" r="9\.5" stroke="#0064e0" stroke-width="1\.75" \/>/)
  assert.match(markSource, /<circle cx="18\.5" cy="5\.5" r="4\.25" fill="#0064e0" \/>/)
})

test('topbar centers page navigation between asymmetric side controls', async () => {
  const shellStyleSource = await readFile(new URL('./styles/shell.css', import.meta.url), 'utf8')

  assert.match(shellStyleSource, /\.topbar \{[^}]*display: grid;[^}]*grid-template-columns: minmax\(0, 1fr\) auto minmax\(0, 1fr\);/)
  assert.match(shellStyleSource, /\.wordmark \{[^}]*justify-self: start;/)
  assert.match(shellStyleSource, /\.account-actions \{[^}]*justify-self: end;/)
  assert.match(shellStyleSource, /@media \(max-width: 860px\) \{[\s\S]*?\.topbar \{[^}]*display: flex;[^}]*flex-direction: column;/)
})

test('workbench shell uses a shorter hero and accessible small control targets', async () => {
  const shellStyleSource = await readFile(new URL('./styles/shell.css', import.meta.url), 'utf8')
  const recognitionStyleSource = await readFile(new URL('./styles/features/recognition.css', import.meta.url), 'utf8')
  const activeStyleSource = await readFile(new URL('./styles/features/workspace-active.css', import.meta.url), 'utf8')

  assert.match(shellStyleSource, /\.hero-band\.compact \{[^}]+min-height: 80px;[^}]+padding: 8px 18px;/)
  assert.match(shellStyleSource, /\.hero-band\.compact h1 \{[^}]+display: flex;[^}]+width: max-content;[^}]+transform: translateY\(4px\);/)
  assert.match(shellStyleSource, /\.hero-band\.compact \.hero-stats div \{[^}]+padding: 5px 20px 3px;/)
  assert.match(shellStyleSource, /\.topbar \.pill-tabs button \{[^}]+min-height: 40px;/)
  assert.match(recognitionStyleSource, /\.recognition-refresh-button \{[^}]+width: 40px;[^}]+height: 40px;[^}]+min-height: 40px;/)
  assert.match(activeStyleSource, /\.active-echo-nav \{[^}]+width: 40px;[^}]+height: 40px;/)
})

test('app wires immediate config creation feedback into the workbench', async () => {
  const source = await readFile(new URL('./App.vue', import.meta.url), 'utf8')

  assert.match(source, /configCreationNotice,/)
  assert.match(source, /:config-creation-notice="configCreationNotice"/)
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
  assert.match(appSource, /<UidSwitcher[\s\S]+:accounts="gameAccount\.boundAccounts\.value"[\s\S]+:current-account="gameAccount\.currentAccount\.value"[\s\S]+:can-add-account="gameAccount\.canAddAccount\.value"[\s\S]+:busy="appBusy \|\| gameAccount\.loading\.value"[\s\S]+:error="error"[\s\S]+@select="selectGameAccount"[\s\S]+@add="addGameAccount"[\s\S]+@sign-out="signOut"/)
  assert.doesNotMatch(appSource, /<button class="button-ghost" @click="signOut">退出<\/button>/)
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

test('workspace hero owns a visible history count after the history panel extraction', async () => {
  const appSource = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  const summarySource = await readFile(new URL('./components/shell/WorkspaceSummary.vue', import.meta.url), 'utf8')
  const workspaceSource = await readFile(new URL('./features/workspace/useEchoWorkspace.js', import.meta.url), 'utf8')

  assert.match(workspaceSource, /import \{ buildNextEchoConfig, isReusableDraft, sortVisibleEchoHistory \} from '\.\.\/\.\.\/services\/echoWorkflow\.js'/)
  assert.match(workspaceSource, /const visibleEchoCount = computed\(\(\) => sortVisibleEchoHistory\(echoes\.value\)\.length\)/)
  assert.match(appSource, /:history-count="visibleEchoCount"/)
  assert.match(summarySource, /<strong>\{\{ historyCount \}\}<\/strong>[\s\S]+<span>历史声骸<\/span>/)
  assert.doesNotMatch(appSource, /\{\{ sortedEchoes\.length \}\}/)
})

test('workspace hero centers metrics and shows separate corner deltas', async () => {
  const appSource = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  const summarySource = await readFile(new URL('./components/shell/WorkspaceSummary.vue', import.meta.url), 'utf8')
  const workspaceSource = await readFile(new URL('./features/workspace/useEchoWorkspace.js', import.meta.url), 'utf8')
  const sessionDeltaSource = await readFile(new URL('./features/workspace/echoSessionDeltas.js', import.meta.url), 'utf8')
  const shellStyleSource = await readFile(new URL('./styles/shell.css', import.meta.url), 'utf8')

  assert.match(workspaceSource, /createEchoSessionDeltaController/)
  assert.match(sessionDeltaSource, /const sessionEchoDelta = ref\(0\)/)
  assert.match(sessionDeltaSource, /const sessionSampleDelta = ref\(0\)/)
  assert.match(sessionDeltaSource, /const visibleSessionEchoDelta = ref\(0\)/)
  assert.match(sessionDeltaSource, /const visibleSessionSampleDelta = ref\(0\)/)
  assert.match(workspaceSource, /sessionEchoDelta,/)
  assert.match(workspaceSource, /sessionSampleDelta,/)
  assert.match(workspaceSource, /visibleSessionEchoDelta,/)
  assert.match(workspaceSource, /visibleSessionSampleDelta,/)
  assert.match(appSource, /sessionEchoDelta,/)
  assert.match(appSource, /sessionSampleDelta,/)
  assert.match(appSource, /visibleSessionEchoDelta,/)
  assert.match(appSource, /visibleSessionSampleDelta,/)
  assert.match(appSource, /:history-delta="visibleSessionEchoDelta"/)
  assert.match(appSource, /:sample-delta="visibleSessionSampleDelta"/)
  assert.match(summarySource, /class="hero-stat hero-stat-with-delta"[\s\S]+v-if="historyDelta"[\s\S]+>\+\{\{ historyDelta \}\}/)
  assert.match(summarySource, /class="hero-stat hero-stat-with-delta"[\s\S]+v-if="sampleDelta"[\s\S]+>\+\{\{ sampleDelta \}\}/)
  assert.match(summarySource, /<Transition name="metric-delta">/)
  assert.match(shellStyleSource, /\.metric-delta-badge \{/)
  assert.match(shellStyleSource, /\.metric-delta-enter-active,\s+\.metric-delta-leave-active \{[\s\S]+transition: opacity 180ms/)
  assert.match(shellStyleSource, /\.metric-delta-enter-from \{[\s\S]+transform: translateY\(4px\) scale\(0\.92\);/)
  assert.match(shellStyleSource, /\.metric-delta-leave-to \{[\s\S]+transform: translateY\(-8px\) scale\(0\.98\);/)
  assert.match(shellStyleSource, /\.hero-stat \{[\s\S]+text-align: center;/)
  assert.match(shellStyleSource, /\.hero-stat strong \{[\s\S]+text-align: center;/)
  assert.match(shellStyleSource, /prefers-reduced-motion: reduce/)
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
  assert.match(appSource, /<section v-else class="dashboard">/)
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
  const workspaceDraftSource = await readFile(new URL('./features/workspace/echoWorkspaceDrafts.js', import.meta.url), 'utf8')
  const insightSource = await readFile(new URL('./features/workspace/workspaceInsightRefresh.js', import.meta.url), 'utf8')

  assert.match(appSource, /selectedGameAccountId,/)
  assert.match(workspaceSource, /const accountId = selectedGameAccountId\.value/)
  assert.match(workspaceSource, /await listEchoes\(accountId\)/)
  assert.match(workspaceSource, /await createEcho\(createEchoPayload\(nextConfig, echoAssetIdentity\), accountId\)/)
  assert.match(workspaceDraftSource, /export function createEchoPayload[\s\S]+display_name: '',/)
  assert.match(workspaceDraftSource, /createEcho\(buildPayload\(nextConfig\), accountId\)/)
  assert.match(insightSource, /await getStats\(accountId\)/)
  assert.match(insightSource, /await getModelEvaluation\(accountId\)/)
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
  assert.ok(appSource.indexOf('<RecognitionReviewPanel') > appSource.indexOf('class="workspace-grid"'))
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
  const predictionRefreshSource = await readFile(new URL('./features/workspace/echoPredictionRefresh.js', import.meta.url), 'utf8')
  const workspaceStyleSource = await readFile(new URL('./styles/features/workspace.css', import.meta.url), 'utf8')
  const clickTierBody = workspaceSource.match(/async function clickTier\(row, tier\) \{[\s\S]+?\n  \}/)?.[0] || ''
  const undoBody = workspaceSource.match(/async function undoActiveSubstat\(\) \{[\s\S]+?\n  \}/)?.[0] || ''

  assert.match(workspaceSource, /import \{ createActivePredictionRefreshController \} from '\.\/echoPredictionRefresh\.js'/)
  assert.match(workspaceSource, /const activePredictionRefresh = createActivePredictionRefreshController\(/)
  assert.match(workspaceSource, /function appendRollToEcho\(echoId, roll\)/)
  assert.doesNotMatch(workspaceSource, /function refreshInsightsInBackground\(\)/)
  assert.match(workspaceSource, /function refreshActiveInBackground\(\)/)
  assert.match(workspaceSource, /const pendingTierKey = ref\(''\)/)
  assert.match(workspaceSource, /function cancelActivePredictionRefresh\(\) \{ activePredictionRefresh\.cancel\(\) \}/)
  assert.match(workspaceSource, /function refreshActiveInBackground\(\) \{\s+activePredictionRefresh\.refreshInBackground\(\)\s+\}/)
  assert.match(predictionRefreshSource, /const activePredictionRefreshDelayMs = 650/)
  assert.match(predictionRefreshSource, /let activePredictionRefreshToken = 0/)
  assert.match(predictionRefreshSource, /new AbortController\(\)/)
  assert.match(predictionRefreshSource, /getPrediction\(echoId, \{ mode: 'fast', signal: controller\.signal \}\)/)
  assert.match(predictionRefreshSource, /setTimeout\(\(\) => refresh\(\)\.catch/)
  assert.doesNotMatch(workspaceSource, /let insightsRefreshTimer = null/)
  assert.doesNotMatch(workspaceSource, /clearTimeout\(insightsRefreshTimer\)/)
  assert.match(clickTierBody, /const roll = await addSubstat/)
  assert.match(clickTierBody, /appendRollToEcho\(echo\.id, optimisticRoll\)/)
  assert.match(clickTierBody, /replaceOptimisticRollInEcho\(echo\.id, optimisticRoll\.id, roll\)/)
  assert.match(clickTierBody, /refreshActiveInBackground\(\)/)
  assert.doesNotMatch(clickTierBody, /refreshInsightsInBackground\(\)/)
  assert.doesNotMatch(clickTierBody, /saving\.value = true/)
  assert.doesNotMatch(clickTierBody, /await refreshActive\(\)/)
  assert.doesNotMatch(clickTierBody, /refreshAll\(\)/)
  assert.match(workbenchSource, /:disabled="Boolean\(row\.recorded\) \|\| Boolean\(pendingTierKey\)"/)
  assert.match(workbenchSource, /function rowPendingTierKey\(row\)/)
  assert.match(workbenchSource, /v-memo="\[row\.recorded\?\.id, row\.recorded\?\.tier_value, row\.candidate\?\.p_final, row\.candidate\?\.baseline_deviation, row\.topPredicted, Boolean\(props\.pendingTierKey\), rowPendingTierKey\(row\)\]"/)
  assert.doesNotMatch(workbenchSource, /:disabled="Boolean\(row\.recorded\) \|\| saving"/)
  assert.doesNotMatch(workspaceSource, /activeEchoId\.value\}:\$\{activeEcho\.value\?\.substats\.length/)
  assert.match(workspaceStyleSource, /\.substat-row \{[\s\S]+contain: layout paint;/)
  assert.match(undoBody, /replaceEcho\(result\.echo\)/)
  assert.doesNotMatch(undoBody, /refreshInsightsInBackground\(\)/)
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

test('model detail rows keep disclosure semantics with bounded enter motion', async () => {
  const backtestSource = await readFile(new URL('./features/evaluation/EvaluationBacktest.vue', import.meta.url), 'utf8')
  const styleSource = [
    await readFile(new URL('./style.css', import.meta.url), 'utf8'),
    await readFile(new URL('./styles/features/evaluation.css', import.meta.url), 'utf8'),
    await readFile(new URL('./styles/controls.css', import.meta.url), 'utf8'),
  ].join('\n')

  assert.match(backtestSource, /import chevronDownIcon from '\.\.\/\.\.\/assets\/icons\/chevron-down\.svg'/)
  assert.match(backtestSource, /const selectedModelDetailKey = ref\(null\)/)
  assert.match(backtestSource, /return selectedRow \? selectedKey : null/)
  assert.match(backtestSource, /selectedModelDetailKey\.value = expandedModelDetailKey\.value === key \? null : key/)
  assert.match(backtestSource, /<Transition name="model-row-detail" @leave="finishModelDetailLeave">/)
  assert.match(backtestSource, /class="ui-line-icon model-expand-chevron"/)
  assert.match(backtestSource, /iconMask\(chevronDownIcon\)/)
  assert.match(backtestSource, /v-if="expandedModelDetailKey === row\.key" class="model-row-detail"/)
  assert.match(styleSource, /\.model-row-detail-enter-active \{/)
  assert.match(styleSource, /\.model-row-detail-enter-from \{/)
  assert.match(styleSource, /opacity 140ms ease/)
  assert.match(styleSource, /transform 140ms ease/)
  assert.match(styleSource, /\.model-row-detail-enter-from \{[\s\S]+transform: translateY\(6px\);/)
  assert.doesNotMatch(styleSource, /\.model-row-detail-leave-active/)
  assert.doesNotMatch(styleSource, /\.model-row-detail-leave-to/)
  assert.match(styleSource, /\.model-bars article\.expanded \.model-expand-chevron \{\s+transform: rotate\(180deg\);/)
})

test('evaluation reduced motion overrides are declared after evaluation animations', async () => {
  const styleSource = await readFile(new URL('./styles/features/evaluation.css', import.meta.url), 'utf8')
  const reducedMotionIndex = styleSource.lastIndexOf('@media (prefers-reduced-motion: reduce)')
  const finalAnimationIndex = styleSource.lastIndexOf('@keyframes summary-card-flash')

  assert.ok(reducedMotionIndex > finalAnimationIndex)

  const reducedMotionSource = styleSource.slice(reducedMotionIndex)
  assert.match(
    reducedMotionSource,
    /\.evaluation-summary-copy,[\s\S]+\.summary-model-link:hover,[\s\S]+\.fusion-weight-card\.summary-linked \{[\s\S]+animation: none;/,
  )
  assert.match(
    reducedMotionSource,
    /\.summary-model-link,[\s\S]+\.model-expand-chevron,[\s\S]+\.model-row-detail-enter-active \{[\s\S]+transition: none;/,
  )
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
  assert.match(backtestSource, /const expandedModelDetailKey = computed\(\(\) => \{/)
  assert.match(backtestSource, /return selectedRow \? selectedKey : null/)
  assert.doesNotMatch(backtestSource, /defaultExpandedModelDetailKey|collapsedModelDetailKeys/)
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
  const coreBacktestSource = await readFile(
    new URL('./features/evaluation/EvaluationCoreBacktest.vue', import.meta.url),
    'utf8',
  )
  const backtestSource = await readFile(new URL('./features/evaluation/EvaluationBacktest.vue', import.meta.url), 'utf8')
  const detailSource = await readFile(new URL('./services/modelDetails.js', import.meta.url), 'utf8')

  assert.doesNotMatch(coreBacktestSource, /preview:\s*(2\.16|0\.86|0\.11|0\.34|0\.52)/)
  assert.match(coreBacktestSource, /Number\.isFinite\(value\) \? formatPercent\(value\) : '--'/)
  assert.match(backtestSource, /const evaluationReady = computed\(\(\) => props\.evaluation\?\.status === 'ready'/)
  assert.doesNotMatch(detailSource, /MODEL_BACKTEST_PREVIEW/)
  assert.ok(detailSource.includes('hitRate: evaluation?.model_scores?.[key]?.hit_rate ?? null'))
  assert.ok(detailSource.includes('loss: evaluation?.model_scores?.[key]?.loss ?? null'))
})

test('evaluation page exposes evaluated sample counts and gates confidence labels', async () => {
  const backtestSource = await readFile(new URL('./features/evaluation/EvaluationBacktest.vue', import.meta.url), 'utf8')
  const viewSource = await readFile(new URL('./features/evaluation/EvaluationView.vue', import.meta.url), 'utf8')
  const detailSource = await readFile(new URL('./services/modelDetails.js', import.meta.url), 'utf8')

  assert.ok(detailSource.includes('evaluated: evaluation?.model_scores?.[key]?.evaluated ?? 0'))
  assert.match(backtestSource, /const modelBacktestSummaryText = computed\(\(\) => \(modelBacktestSampleCount\.value \? `回测样本 \$\{modelBacktestSampleCount\.value\} 条` : '等待回测样本'\)\)/)
  assert.match(backtestSource, /<span :title="modelBacktestSummaryText">\{\{ modelBacktestSummaryText \}\}<\/span>/)
  assert.match(backtestSource, /:title="row\.evaluated \? `\$\{row\.label\}基于 \$\{row\.evaluated\} 条样本回测` : `\$\{row\.label\}等待回测样本`"/)
  assert.doesNotMatch(backtestSource, /function modelEvaluatedText/)
  assert.match(backtestSource, /isBest: !disabled && evaluationReady\.value && bestHitRate != null && row\.hitRate === bestHitRate/)
  assert.match(viewSource, /evaluationReadinessState\(props\.evaluation\)/)
  assert.match(viewSource, /v-else-if="readiness\.ready" class="evaluation-module-stack"/)
  assert.doesNotMatch(backtestSource, /<span>\{\{ modelEvaluatedText\(row\) \}\}<\/span>/)
})

test('core coverage chart uses one semantic fill in both themes', async () => {
  const coreBacktestSource = await readFile(
    new URL('./features/evaluation/EvaluationCoreBacktest.vue', import.meta.url),
    'utf8',
  )
  const styleSource = await readFile(
    new URL('./styles/features/evaluation.css', import.meta.url),
    'utf8',
  )

  assert.match(coreBacktestSource, /class="coverage-bar-fill"/)
  assert.match(styleSource, /\.coverage-bar-fill \{[\s\S]+background: var\(--primary\);/)
  assert.doesNotMatch(coreBacktestSource, /coverage-band-node/)
  assert.doesNotMatch(styleSource, /\.coverage-band-node/)
})

test('stats page focuses on analytics charts instead of prediction diagnostics', async () => {
  const appSource = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  const viewSource = await readFile(new URL('./features/statistics/StatisticsView.vue', import.meta.url), 'utf8')
  const axisSource = await readFile(new URL('./features/statistics/SampleStageAxis.vue', import.meta.url), 'utf8')
  const statisticsStyleSource = await readFile(new URL('./styles/features/statistics.css', import.meta.url), 'utf8')
  const pageSummaryStyleSource = await readFile(new URL('./styles/page-summary.css', import.meta.url), 'utf8')
  const headerElements = findElementsByClassToken(viewSource, 'stats-diagnostic-head')
  const statsOwnerRule = statisticsStyleSource.match(/^\.stats-analytics-panel \{([^}]+)\}/m)?.[1] || ''

  assert.match(appSource, /import StatisticsView from '\.\/features\/statistics\/StatisticsView\.vue'/)
  assert.match(appSource, /<StatisticsView[\s\S]+:stats="stats"/)
  assert.doesNotMatch(viewSource, /<h2>预测依据<\/h2>/)
  assert.match(viewSource, /class="stats-diagnostic-title-row"/)
  assert.match(viewSource, /class="stats-diagnostic-title-stack"/)
  assert.equal(headerElements.length, 1)
  assert.equal(headerElements[0].tagName, 'header')
  assert.ok(headerElements[0].start >= 0 && headerElements[0].start < headerElements[0].end)
  const headerSection = headerElements[0].section
  const summaryElements = findElementsByClassToken(headerSection, 'page-summary-chips')
  const headerChipElements = findElementsByClassToken(headerSection, 'page-summary-chip')

  assert.doesNotMatch(headerSection, /最大偏差/)
  assert.equal(headerChipElements.length, 2)
  assert.equal(summaryElements.length, 1)
  assert.ok(summaryElements[0].start >= 0 && summaryElements[0].start < summaryElements[0].end)
  const summarySection = summaryElements[0].section
  const chipElements = findElementsByClassToken(summarySection, 'page-summary-chip')
  const stateChipElements = chipElements.filter(({ section }) => section.includes('maturity.label'))
  const stageChipElements = chipElements.filter(({ section }) => section.includes('<small>阶段</small>'))

  assert.equal(chipElements.length, 2)
  assert.ok(chipElements.every(({ start, end }) => start >= 0 && start < end))
  assert.equal(stateChipElements.length, 1)
  assert.equal(stageChipElements.length, 1)
  for (const obsoleteClassToken of [
    'stats-prediction-strip',
    'stats-diagnostic-tags',
    'stats-diagnostic-stage-meta',
    'stats-diagnostic-stage-chip',
    'stats-diagnostic-sample-pill',
    'sample-reliability-value',
    'sample-stage-current',
    'sample-stage-current-name',
    'sample-stage-current-note',
    'stats-diagnostic-panel',
    'stats-diagnostic-note',
    'stats-summary-bar',
    'stats-diagnostic-pill',
    'sample-stage-node',
    'sample-stage-tick',
    'context-progress-list',
  ]) {
    assert.equal(
      findElementsByClassToken(viewSource, obsoleteClassToken).length,
      0,
      `obsolete class token remains: ${obsoleteClassToken}`,
    )
  }
  assert.match(viewSource, /class="sample-reliability-title"/)
  assert.match(viewSource, /import SampleStageWeightGuide from '\.\/SampleStageWeightGuide\.vue'/)
  assert.match(viewSource, /<SampleStageWeightGuide/)
  assert.doesNotMatch(viewSource, /sample-reliability-basis-tag/)
  assert.doesNotMatch(viewSource, /sampleStageDriverText/)
  assert.match(viewSource, /class="sample-stage-summary"/)
  assert.match(viewSource, /class="sample-stage-count-value"/)
  assert.doesNotMatch(viewSource, /<span>样本<\/span>/)
  assert.doesNotMatch(viewSource, /sampleStageText\(stats\.sample_stage\)/)
  assert.match(viewSource, /class="stats-task-stack"/)
  assert.match(viewSource, /class="stats-task-card sample-reliability-card"/)
  assert.match(viewSource, /class="stats-task-card substat-deviation-card"/)
  assert.match(viewSource, /class="stats-diagnostic-context"/)
  assert.match(viewSource, /statsReliabilityNote\(totalSamples\.value\)/)
  assert.match(viewSource, /class="stats-diagnostic-deviations"/)
  assert.match(viewSource, /class="stats-diagnostic-deviation hot"/)
  assert.match(viewSource, /class="stats-diagnostic-deviation warn"/)
  assert.doesNotMatch(viewSource, /statsSummaryItems/)
  assert.match(viewSource, /基于 \$\{stats\.total_rolls \|\| 0\} 条样本/)
  assert.doesNotMatch(viewSource, /class="stats-empty-state"/)
  assert.match(viewSource, /class="substat-deviation-chart"/)
  assert.match(viewSource, /class="deviation-axis-scale"/)
  assert.match(viewSource, /<SampleStageAxis/)
  assert.match(axisSource, /class="sample-stage-axis"/)
  assert.match(axisSource, /class="sample-stage-marker"/)
  assert.match(axisSource, /class="sample-stage-boundary-tick"/)
  assert.match(axisSource, /class="sample-stage-boundaries"/)
  assert.match(axisSource, /class="sample-stage-segments"/)
  assert.match(viewSource, /sampleStageGoalText/)
  assert.match(viewSource, /距「\$\{sampleStageStatus\.value\.nextStage\.caption\}」还差/)
  assert.doesNotMatch(viewSource, /<em>当前<\/em>/)
  assert.match(viewSource, /buildSampleStageProgress/)
  assert.match(viewSource, /sampleStagePercentText/)
  assert.match(viewSource, /sampleStageSegmentRows/)
  assert.match(axisSource, /:style="\{ left: formatPercent\(stage\.axisProgress\) \}"/)
  assert.match(axisSource, /:style="\{ left: formatPercent\(stage\.captionProgress\) \}"/)
  assert.match(axisSource, /stage\.displayLabel/)
  assert.match(axisSource, /stage\.current/)
  assert.match(viewSource, /class="stats-task-card sample-reliability-card"/)
  assert.doesNotMatch(viewSource, /最大偏高/)
  assert.doesNotMatch(viewSource, /最大偏低/)
  assert.match(viewSource, /当前偏高/)
  assert.match(viewSource, /当前偏低/)
  assert.doesNotMatch(viewSource, /上下文监控/)
  assert.match(viewSource, /v-for="row in sortedStatFrequency"/)
  assert.match(axisSource, /v-for="stage in rows"/)
  assert.match(axisSource, /v-for="stage in segments"/)
  assert.doesNotMatch(viewSource, /contextProgressRows/)
  assert.match(statisticsStyleSource, /\.substat-deviation-row \{/)
  assert.match(statisticsStyleSource, /\.stats-diagnostic-title-row \{/)
  assert.match(statisticsStyleSource, /\.stats-diagnostic-title-stack \{/)
  assert.match(pageSummaryStyleSource, /\.page-summary-chips \{/)
  assert.match(pageSummaryStyleSource, /\.page-summary-chip \{/)
  assert.match(pageSummaryStyleSource, /\.page-summary-chip--state i \{/)
  assert.match(statisticsStyleSource, /\.sample-reliability-header \{/)
  assert.match(statisticsStyleSource, /\.sample-stage-count-value \{/)
  assert.doesNotMatch(statisticsStyleSource, /\.stats-diagnostic-tags(?![\w-])/)
  assert.doesNotMatch(statisticsStyleSource, /\.stats-diagnostic-stage-meta(?![\w-])/)
  assert.doesNotMatch(statisticsStyleSource, /\.stats-diagnostic-stage-chip(?![\w-])/)
  assert.doesNotMatch(statisticsStyleSource, /\.sample-reliability-value(?![\w-])/)
  assert.doesNotMatch(statisticsStyleSource, /\.sample-stage-current(?:-name|-note)?(?![\w-])/)
  assert.doesNotMatch(statisticsStyleSource, /\.stats-diagnostic-sample-pill(?![\w-])/)
  assert.match(statisticsStyleSource, /\.stats-diagnostic-context \{[\s\S]+font-weight: var\(--weight-supporting\);/)
  assert.doesNotMatch(statisticsStyleSource, /\.stats-diagnostic-note(?![\w-])/)
  assert.doesNotMatch(statisticsStyleSource, /\.stats-diagnostic-meta(?![\w-])/)
  assert.match(statsOwnerRule, /display: grid/)
  assert.doesNotMatch(statsOwnerRule, /border|box-shadow|background/)
  assert.match(statisticsStyleSource, /\.stats-task-stack \{/)
  assert.match(statisticsStyleSource, /\.stats-diagnostic-deviation \{/)
  assert.doesNotMatch(statisticsStyleSource, /\.stats-summary-bar(?![\w-])/)
  assert.match(statisticsStyleSource, /\.deviation-axis-scale \{/)
  assert.match(statisticsStyleSource, /\.sample-stage-marker \{/)
  assert.match(statisticsStyleSource, /--sample-stage-axis-inset: 32px;/)
  assert.match(statisticsStyleSource, /\.sample-stage-track \{[\s\S]+margin-inline: var\(--sample-stage-axis-inset\);/)
  assert.match(statisticsStyleSource, /\.sample-stage-boundary-tick \{/)
  assert.match(statisticsStyleSource, /\.sample-stage-boundaries span \{[\s\S]+position: absolute;/)
  assert.match(statisticsStyleSource, /\.sample-stage-segments span \{[\s\S]+position: absolute;/)
  assert.doesNotMatch(statisticsStyleSource, /\.sample-stage-node(?![\w-])/)
  assert.doesNotMatch(statisticsStyleSource, /\.sample-stage-milestones(?![\w-])/)
  assert.doesNotMatch(statisticsStyleSource, /\.stats-empty-state \{/)
  assert.match(statisticsStyleSource, /\.sample-stage-boundaries span\.current strong \{/)
  assert.match(statisticsStyleSource, /\.sample-stage-axis \{/)
  assert.match(statisticsStyleSource, /\.sample-stage-summary \{/)
  assert.match(statisticsStyleSource, /\.stats-analytics-panel \{[^}]+min-width: 0;/)
  assert.match(statisticsStyleSource, /\.stats-task-card \{[^}]+min-width: 0;/)
  assert.match(statisticsStyleSource, /\.stats-task-stack \{[^}]+min-width: 0;/)
  assert.match(statisticsStyleSource, /@media \(max-width: 860px\)[\s\S]+\.sample-stage-summary \{[^}]+justify-items: start;/)
  assert.doesNotMatch(statisticsStyleSource, /\.context-progress-row(?![\w-])/)
})
