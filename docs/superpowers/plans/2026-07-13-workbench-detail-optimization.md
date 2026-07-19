# Workbench Detail Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the fast “select to create” workflow while making the workbench setup column stable, the 1366px layout dense, and all saving and recorded states visually unambiguous.

**Architecture:** Keep persistence and creation feedback in `useEchoWorkspace`, keep setup filtering and DOM measurement in the workbench feature, and express visual equal-height/sticky behavior entirely in CSS. Add one small pure history-position helper so the new default dock can be tested without mounting the Vue component.

**Tech Stack:** Vue 3 Composition API, Vite 8, native `node:test`, CSS custom properties and responsive media queries.

---

## Working-tree safety

The worktree already contains uncommitted typography changes in several overlapping Vue and CSS files. During execution, inspect the targeted diff after every task and do not stage or commit those files automatically. The implementation checkpoints below replace task-level commits until the existing typography diff and this feature diff can be reviewed together.

## File map

- `WuwaFrontend/src/features/workspace/useEchoWorkspace.js`: immediate-create semantics, duplicate-selection guard, transient creation announcement.
- `WuwaFrontend/src/features/workspace/useEchoWorkspace.test.js`: persistence and announcement behavior tests.
- `WuwaFrontend/src/App.vue`: pass the creation announcement into the workbench.
- `WuwaFrontend/src/App.test.js`: verify application wiring and compact shell hit targets.
- `WuwaFrontend/src/features/workspace/EchoWorkbenchView.vue`: setup search, creation behavior hint, live status, matrix saving and recorded-tier classes.
- `WuwaFrontend/src/features/workspace/EchoWorkbenchView.test.js`: source-level component and CSS contract tests used by this repository.
- `WuwaFrontend/src/features/workspace/useEchoWorkbenchLayout.js`: retain active-option scrolling and main-stat animation while removing height synchronization; own the pure setup filter.
- `WuwaFrontend/src/features/workspace/useEchoWorkbenchLayout.test.js`: pure filtering and active-option scrolling tests.
- `WuwaFrontend/src/styles/features/workspace.css`: equal-height outer columns, sticky inner setup, search, notices, matrix hierarchy, compact desktop breakpoint.
- `WuwaFrontend/src/styles/features/workspace-active.css`: compact desktop active-echo dimensions and title truncation.
- `WuwaFrontend/src/styles/shell.css`: shorter hero and enlarged topbar navigation hit area.
- `WuwaFrontend/src/styles/features/recognition.css`: enlarged refresh hit area.
- `WuwaFrontend/src/features/history/floatingHistoryPosition.js`: pure default dock-position calculation.
- `WuwaFrontend/src/features/history/floatingHistoryPosition.test.js`: desktop default-position tests.
- `WuwaFrontend/src/features/history/FloatingHistoryPanel.vue`: consume the tested default position without changing saved positions.
- `WuwaFrontend/src/features/history/FloatingHistoryPanel.test.js`: integration contract for the helper.

### Task 1: Preserve immediate creation and expose explicit feedback

**Files:**
- Modify: `WuwaFrontend/src/features/workspace/useEchoWorkspace.test.js`
- Modify: `WuwaFrontend/src/features/workspace/useEchoWorkspace.js`
- Modify: `WuwaFrontend/src/App.test.js`
- Modify: `WuwaFrontend/src/App.vue`

- [ ] **Step 1: Add failing workflow tests**

Add a functional test that loads an echo with one substat, applies a different sonata, and verifies immediate creation, preservation of the old echo, activation of the new 0/5 echo, an announcement, and no duplicate creation when the active configuration is clicked again:

```js
test('config selection immediately creates and announces a new echo after recording has started', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const firstSet = sonataEffects[0]
  const nextSet = sonataEffects.find((effect) => effect.name !== firstSet.name)
  const records = [{
    id: 41,
    status: 'in_progress',
    substats: [{ id: 401, position: 1, substat_type: 'crit_rate', tier_value: 6.3 }],
    set_name: firstSet.name,
    cost: firstSet.availableCosts[0],
    main_stat: mainStatsByCost[firstSet.availableCosts[0]][0],
    is_continuous_tuning: true,
  }]
  let createRequests = 0
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) return jsonResponse({ results: records })
    if (path.endsWith('/echoes/') && options.method === 'POST') {
      createRequests += 1
      const payload = JSON.parse(options.body)
      const echo = {
        id: 41 + createRequests,
        status: 'draft',
        substats: [],
        set_name: payload.set_name,
        cost: payload.cost,
        main_stat: payload.main_stat,
        is_continuous_tuning: true,
      }
      records.unshift(echo)
      return jsonResponse(echo)
    }
    if (path.includes('/prediction/')) return jsonResponse({ candidates: [] })
    if (path.includes('/stats/') || path.includes('/model-evaluation/')) return jsonResponse({})
    throw new Error(`Unexpected request: ${path}`)
  }

  const workspace = useEchoWorkspace({
    selectedGameAccountId: ref(1),
    boundPlayerUid: ref('123456789'),
    workspaceLocked: ref(false),
    onError: () => {},
  })
  try {
    await workspace.refresh()
    await workspace.applyEchoConfig({ sonata: nextSet.name })

    assert.equal(createRequests, 1)
    assert.equal(workspace.activeEcho.value.id, 42)
    assert.equal(workspace.activeEcho.value.substats.length, 0)
    assert.equal(workspace.echoes.value.find((echo) => echo.id === 41).substats.length, 1)
    assert.match(workspace.configCreationNotice.value, new RegExp(`^已新建：${nextSet.name} · COST `))

    await workspace.applyEchoConfig({ sonata: workspace.echoForm.value.sonata })
    assert.equal(createRequests, 1)
  } finally {
    workspace.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})
```

Keep the existing empty-draft PATCH test’s strict fetch stub, which throws for any unexpected POST, and add `assert.equal(workspace.activeEcho.value.id, 41)` after `applyEchoConfig`. This proves a 0/5 configuration change remains on the same record.

- [ ] **Step 2: Run the workflow test and verify RED**

Run from `WuwaFrontend`:

```powershell
node --test --test-name-pattern="config selection immediately creates" src/features/workspace/useEchoWorkspace.test.js
```

Expected: FAIL because `configCreationNotice` is not returned and clicking the active configuration still creates a duplicate echo.

- [ ] **Step 3: Implement the creation guard and announcement**

Import the main-stat labels and add announcement state next to the existing workspace refs:

```js
import { mainStatLabels, substatLabels, substatOrder, tierTables } from '../../data/substats.js'

const configCreationNotice = ref('')
let configCreationNoticeTimer = null

function echoConfigMatches(echo, config) {
  return Boolean(echo)
    && echo.set_name === config.sonata
    && Number(echo.cost) === Number(config.cost)
    && echo.main_stat === config.main_stat
}

function clearConfigCreationNotice() {
  clearTimeout(configCreationNoticeTimer)
  configCreationNoticeTimer = null
  configCreationNotice.value = ''
}

function announceConfigCreation(config) {
  clearConfigCreationNotice()
  configCreationNotice.value = `已新建：${config.sonata} · COST ${config.cost} · ${mainStatLabels[config.main_stat] || config.main_stat}`
  configCreationNoticeTimer = setTimeout(clearConfigCreationNotice, 2600)
}
```

In `reset()`, insert `clearConfigCreationNotice()` immediately after `cancelActivePredictionRefresh()`. In the existing public return object, insert `configCreationNotice,` immediately after `clickTier,`.

Replace the body of `applyEchoConfig` after normalization with the guarded flow:

```js
const nextConfig = normalizeEchoConfig({ ...echoForm.value, ...partialConfig })
if (echoConfigMatches(activeEcho.value, nextConfig)) return activeEcho.value
echoForm.value = nextConfig
if (!activeEcho.value) {
  await createEchoWithConfig(nextConfig)
  await refresh()
  return activeEcho.value
}
if (isReusableDraft(activeEcho.value)) {
  try {
    const updated = await updateEcho(activeEcho.value.id, {
      cost: nextConfig.cost,
      set_name: nextConfig.sonata,
      main_stat: nextConfig.main_stat,
      is_continuous_tuning: true,
      ...echoAssetIdentity.selectedEchoAssetFieldsForConfig(nextConfig),
    })
    replaceEcho(updated)
    activateEcho(updated)
    refreshActiveInBackground()
    return updated
  } catch (err) {
    reportError(err)
    return null
  }
}
const created = await createEchoWithConfig(nextConfig)
if (created) {
  announceConfigCreation(nextConfig)
  await refresh()
}
return created
```

Expose `configCreationNotice` from the composable. In `App.vue`, destructure it and pass it to the workbench:

```vue
<EchoWorkbenchView
  :config="echoForm"
  :active-echo="activeEcho"
  :matrix-rows="matrixRows"
  :saving="saving"
  :pending-tier-key="pendingTierKey"
  :config-creation-notice="configCreationNotice"
  @config-change="applyEchoConfig"
  @undo="undoActiveSubstat"
  @discard="discardActiveEcho"
  @next="createNextEchoFromActive"
  @preview-change="selectEchoAsset"
  @select-tier="clickTier($event.row, $event.tier)"
/>
```

- [ ] **Step 4: Add and run the wiring test**

Add to `App.test.js`:

```js
test('app wires immediate config creation feedback into the workbench', async () => {
  const source = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  assert.match(source, /configCreationNotice,/)
  assert.match(source, /:config-creation-notice="configCreationNotice"/)
})
```

Run:

```powershell
node --test src/features/workspace/useEchoWorkspace.test.js src/App.test.js
```

Expected: PASS.

- [ ] **Step 5: Review the task diff without staging**

```powershell
git diff -- WuwaFrontend/src/features/workspace/useEchoWorkspace.js WuwaFrontend/src/features/workspace/useEchoWorkspace.test.js WuwaFrontend/src/App.vue WuwaFrontend/src/App.test.js
```

Expected: only the immediate-create guard, announcement lifecycle, prop wiring, and their tests are added on top of the existing typography diff.

### Task 2: Add setup filtering and explicit creation guidance

**Files:**
- Modify: `WuwaFrontend/src/features/workspace/useEchoWorkbenchLayout.test.js`
- Modify: `WuwaFrontend/src/features/workspace/useEchoWorkbenchLayout.js`
- Modify: `WuwaFrontend/src/features/workspace/EchoWorkbenchView.test.js`
- Modify: `WuwaFrontend/src/features/workspace/EchoWorkbenchView.vue`
- Modify: `WuwaFrontend/src/styles/features/workspace.css`

- [ ] **Step 1: Add failing pure filtering tests**

Update the import and append:

```js
import { filterSonataEffects, sonataScrollTopForActiveButton } from './useEchoWorkbenchLayout.js'

test('sonata filtering ignores spaces and case without changing the source list', () => {
  const effects = [{ name: 'Echo Setup' }, { name: '碎梦亡鬼之魇' }]
  assert.deepEqual(filterSonataEffects(effects, ' echoSET '), [{ name: 'Echo Setup' }])
  assert.deepEqual(filterSonataEffects(effects, '碎 梦'), [{ name: '碎梦亡鬼之魇' }])
  assert.equal(effects.length, 2)
})

test('empty sonata filtering returns every option', () => {
  const effects = [{ name: 'A' }, { name: 'B' }]
  assert.deepEqual(filterSonataEffects(effects, '   '), effects)
})
```

- [ ] **Step 2: Run the layout test and verify RED**

```powershell
node --test src/features/workspace/useEchoWorkbenchLayout.test.js
```

Expected: FAIL because `filterSonataEffects` is not exported.

- [ ] **Step 3: Implement the pure filter and component state**

Add to `useEchoWorkbenchLayout.js`:

```js
function normalizedSonataSearch(value) {
  return String(value || '').replace(/\s+/g, '').toLocaleLowerCase('zh-CN')
}

export function filterSonataEffects(effects, query) {
  const normalizedQuery = normalizedSonataSearch(query)
  if (!normalizedQuery) return effects
  return effects.filter((effect) => normalizedSonataSearch(effect.name).includes(normalizedQuery))
}
```

In `EchoWorkbenchView.vue`, import `ref` and `filterSonataEffects`, add the notice prop and setup state:

```js
const sonataQuery = ref('')
const filteredSonataEffects = computed(() => filterSonataEffects(sonataEffects, sonataQuery.value))
const visibleSonataNames = computed(() => filteredSonataEffects.value.map((effect) => effect.name))
const configChangeCreatesEcho = computed(() => Boolean(props.activeEcho?.substats?.length))
```

Add this prop beside `pendingTierKey`:

```js
configCreationNotice: {
  type: String,
  default: '',
},
```

Wrap the existing heading and form in `<div class="setup-panel-content">`. Add this before the list and replace the list loop with `filteredSonataEffects`:

```vue
<label class="sonata-search-field">
  <span class="sr-only">搜索套装</span>
  <input v-model="sonataQuery" type="search" inputmode="search" placeholder="搜索套装" autocomplete="off" />
</label>
<p v-if="configChangeCreatesEcho" class="setup-behavior-hint">选择其他配置将新建声骸</p>
<div ref="sonataGridRef" class="sonata-grid">
  <button
    v-for="effect in filteredSonataEffects"
    :key="effect.id"
    type="button"
    :class="{ active: config.sonata === effect.name }"
    :aria-current="config.sonata === effect.name ? 'true' : null"
    @click="emit('config-change', { sonata: effect.name })"
  >
    <img :src="effect.icon" :alt="effect.name" />
    <span>{{ effect.name }}</span>
  </button>
  <p v-if="!filteredSonataEffects.length" class="sonata-empty-state">未找到匹配套装</p>
</div>
```

Add the non-blocking live result after the form:

```vue
<Transition name="config-notice">
  <p v-if="configCreationNotice" class="setup-creation-notice" role="status" aria-live="polite">
    {{ configCreationNotice }}
  </p>
</Transition>
```

Pass `visibleSonataNames` as the third argument to `useEchoWorkbenchLayout` so clearing a query re-centers the active option:

```js
export function useEchoWorkbenchLayout(props, legalMainStats, visibleSonataNames) {
  const mainStatRowRef = ref(null)
  const sonataGridRef = ref(null)
```

Add the restrained setup-control styles to `workspace.css`:

```css
.sonata-search-field {
  display: block;
  margin-bottom: 8px;
}

.sonata-search-field input {
  width: 100%;
  min-height: 40px;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  padding: 8px 12px;
  color: var(--ink-deep);
  background: var(--canvas);
  font: inherit;
}

.sonata-search-field input:focus-visible {
  border-color: rgba(23, 105, 210, 0.46);
  outline: 3px solid rgba(23, 105, 210, 0.14);
  outline-offset: 1px;
}

.setup-behavior-hint,
.setup-creation-notice,
.sonata-empty-state {
  margin: 0;
  color: var(--steel);
  font-size: var(--text-caption);
  line-height: var(--leading-caption);
}

.setup-behavior-hint { margin-bottom: 8px; }

.setup-creation-notice {
  margin-top: 10px;
  border: 1px solid rgba(23, 105, 210, 0.16);
  border-radius: 10px;
  padding: 8px 10px;
  color: var(--primary-deep);
  background: rgba(23, 105, 210, 0.06);
}

.sonata-empty-state {
  place-self: center;
  padding: 20px 8px;
  text-align: center;
}

.config-notice-enter-active,
.config-notice-leave-active {
  transition: opacity 160ms ease-out, transform 160ms cubic-bezier(0.19, 1, 0.22, 1);
}
.config-notice-enter-from,
.config-notice-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.app-shell.theme-dark .sonata-search-field input {
  border-color: rgba(100, 123, 141, 0.42);
  color: #e8eef3;
  background: #121c24;
}

.app-shell.theme-dark .setup-creation-notice {
  border-color: rgba(80, 152, 255, 0.26);
  color: #b8d5ff;
  background: rgba(43, 105, 184, 0.14);
}
```

- [ ] **Step 4: Add component contract tests and verify GREEN**

Add to `EchoWorkbenchView.test.js`:

```js
test('echo setup filters sonata options and explains immediate creation', async () => {
  const source = await readFile(new URL('./EchoWorkbenchView.vue', import.meta.url), 'utf8')
  assert.match(source, /const sonataQuery = ref\(''\)/)
  assert.match(source, /filterSonataEffects\(sonataEffects, sonataQuery\.value\)/)
  assert.match(source, /type="search"[\s\S]+placeholder="搜索套装"/)
  assert.match(source, /v-for="effect in filteredSonataEffects"/)
  assert.match(source, /未找到匹配套装/)
  assert.match(source, /选择其他配置将新建声骸/)
  assert.match(source, /role="status" aria-live="polite"/)
})
```

Run:

```powershell
node --test src/features/workspace/useEchoWorkbenchLayout.test.js src/features/workspace/EchoWorkbenchView.test.js
```

Expected: PASS.

- [ ] **Step 5: Review the task diff without staging**

```powershell
git diff -- WuwaFrontend/src/features/workspace/useEchoWorkbenchLayout.js WuwaFrontend/src/features/workspace/useEchoWorkbenchLayout.test.js WuwaFrontend/src/features/workspace/EchoWorkbenchView.vue WuwaFrontend/src/features/workspace/EchoWorkbenchView.test.js WuwaFrontend/src/styles/features/workspace.css
```

### Task 3: Replace measured height synchronization with equal outer columns and sticky setup content

**Files:**
- Modify: `WuwaFrontend/src/features/workspace/EchoWorkbenchView.test.js`
- Modify: `WuwaFrontend/src/features/workspace/useEchoWorkbenchLayout.js`
- Modify: `WuwaFrontend/src/features/workspace/EchoWorkbenchView.vue`
- Modify: `WuwaFrontend/src/styles/features/workspace.css`

- [ ] **Step 1: Replace the old synchronization test with a failing CSS-layout contract**

```js
test('echo workbench uses equal outer columns with viewport-sticky setup content', async () => {
  const source = await readFile(new URL('./EchoWorkbenchView.vue', import.meta.url), 'utf8')
  const layout = await readFile(new URL('./useEchoWorkbenchLayout.js', import.meta.url), 'utf8')
  const style = await readFile(new URL('../../styles/features/workspace.css', import.meta.url), 'utf8')

  assert.match(source, /class="setup-panel-content"/)
  assert.doesNotMatch(source, /setupPanelStyle|:style="setupPanelStyle"/)
  assert.doesNotMatch(layout, /setupPanelHeight|syncSetupPanelHeight|getBoundingClientRect\(\)\.height/)
  assert.match(style, /\.workspace-grid \{[\s\S]+align-items: stretch;/)
  assert.match(style, /\.workspace-sidebar \{[\s\S]+align-self: stretch;/)
  assert.match(style, /\.setup-panel-content \{[\s\S]+position: sticky;[\s\S]+max-height: calc\(100dvh - 104px\);/)
  assert.match(style, /\.create-panel \.sonata-grid \{[\s\S]+overflow-y: auto;/)
})
```

- [ ] **Step 2: Run the contract test and verify RED**

```powershell
node --test --test-name-pattern="equal outer columns" src/features/workspace/EchoWorkbenchView.test.js
```

Expected: FAIL because the component still binds a measured height and the grid aligns items to the start.

- [ ] **Step 3: Remove the measurement lifecycle**

Remove `createPanelRef`, `galleryPanelRef`, `setupPanelHeight`, `setupPanelStyle`, `syncSetupPanelHeight`, resize listeners, and `syncSetupPanelLayout` from `useEchoWorkbenchLayout.js`. Keep `focusActiveSonata`, the main-stat height animation, and these watches:

```js
onMounted(focusActiveSonata)

watch(
  () => `${props.activeEcho?.id || ''}:${props.config.cost}:${props.config.main_stat}:${props.config.sonata}`,
  focusActiveSonata,
  { flush: 'post' },
)

watch(
  () => visibleSonataNames.value.join('|'),
  focusActiveSonata,
  { flush: 'post' },
)
```

Remove the obsolete refs and inline style from `EchoWorkbenchView.vue`.

- [ ] **Step 4: Implement the equal-outer/sticky-inner CSS**

Replace the existing workspace/sidebar/create-panel rules with:

```css
.workspace-grid {
  display: grid;
  grid-template-columns: minmax(292px, 352px) minmax(0, 1fr);
  align-items: stretch;
  gap: 24px;
  min-height: 0;
}

.workspace-sidebar {
  align-self: stretch;
  min-width: 0;
  min-height: 0;
}

.create-panel {
  min-height: 100%;
  overflow: visible;
}

.setup-panel-content {
  position: sticky;
  top: 88px;
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 104px);
  min-height: 0;
}

.create-panel .echo-form {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

.create-panel .echo-form fieldset:first-of-type {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

.create-panel .sonata-grid {
  flex: 1 1 auto;
  min-height: 160px;
  max-height: none;
  overflow-y: auto;
}
```

Below the compact desktop range, stack the main workspace so the tier grid is not squeezed. Reset `.setup-panel-content` to normal flow and retain the existing 320px list cap:

```css
@media (max-width: 1179px) {
  .workspace-grid {
    grid-template-columns: 1fr;
    align-items: start;
  }
  .setup-panel-content {
    position: static;
    max-height: none;
  }
  .create-panel { min-height: 0; }
  .create-panel .sonata-grid { max-height: 320px; }
}
```

- [ ] **Step 5: Run layout tests and review the diff**

```powershell
node --test src/features/workspace/useEchoWorkbenchLayout.test.js src/features/workspace/EchoWorkbenchView.test.js
git diff -- WuwaFrontend/src/features/workspace/useEchoWorkbenchLayout.js WuwaFrontend/src/features/workspace/EchoWorkbenchView.vue WuwaFrontend/src/styles/features/workspace.css
```

Expected: PASS; no remaining JS path measures the gallery height.

### Task 4: Make pending and recorded matrix states explicit

**Files:**
- Modify: `WuwaFrontend/src/features/workspace/EchoWorkbenchView.test.js`
- Modify: `WuwaFrontend/src/features/workspace/EchoWorkbenchView.vue`
- Modify: `WuwaFrontend/src/styles/features/workspace.css`

- [ ] **Step 1: Add failing matrix-state tests**

```js
test('tier saving disables the full matrix and recorded rows emphasize only the chosen tier', async () => {
  const source = await readFile(new URL('./EchoWorkbenchView.vue', import.meta.url), 'utf8')
  const style = await readFile(new URL('../../styles/features/workspace.css', import.meta.url), 'utf8')

  assert.match(source, /:disabled="Boolean\(row\.recorded\) \|\| Boolean\(pendingTierKey\)"/)
  assert.match(source, /'recorded-tier': isRecordedTier\(row, tier\)/)
  assert.match(source, /'saving-tier': isTierPending\(row, tier\)/)
  assert.match(source, /:aria-busy="isTierPending\(row, tier\)"/)
  assert.match(source, />保存中</)
  assert.match(source, /Boolean\(props\.pendingTierKey\)/)
  assert.match(style, /\.tier-grid button\.recorded-tier:disabled/)
  assert.match(style, /\.tier-grid button\.saving-tier:disabled/)
  assert.doesNotMatch(style, /\.substat-row\.recorded \{[\s\S]+box-shadow: inset 4px/)
})
```

- [ ] **Step 2: Run the matrix test and verify RED**

```powershell
node --test --test-name-pattern="tier saving disables" src/features/workspace/EchoWorkbenchView.test.js
```

Expected: FAIL because only the exact pending tier is disabled and recorded rows still use a large blue treatment.

- [ ] **Step 3: Implement matrix semantics**

Add:

```js
function isRecordedTier(row, tier) {
  return Boolean(row.recorded) && Number(row.recorded.tier_value) === Number(tier.value)
}
```

Update each tier button:

```vue
<button
  v-for="tier in row.tier_table"
  :key="`${row.substat_type}-${tier.value}`"
  type="button"
  :class="{ 'recorded-tier': isRecordedTier(row, tier), 'saving-tier': isTierPending(row, tier) }"
  :disabled="Boolean(row.recorded) || Boolean(pendingTierKey)"
  :aria-busy="isTierPending(row, tier)"
  @click="emit('select-tier', { row, tier })"
>
  <strong class="tier-value">
    {{ formatSubstatTierNumber(row.substat_type, tier.value) }}<span v-if="formatSubstatTierUnit(row.substat_type)" class="tier-unit">{{ formatSubstatTierUnit(row.substat_type) }}</span>
  </strong>
  <span v-if="isTierPending(row, tier)" class="tier-probability tier-saving-label">保存中</span>
  <span v-else class="tier-probability">{{ formatPercent(tier.probability, 1) }}</span>
</button>
```

Include `Boolean(props.pendingTierKey)` in `v-memo` so every row updates its disabled state when saving begins or ends.

Replace the recorded-row visual mass with a quiet full-border treatment and selected-tier emphasis:

```css
.substat-row.recorded {
  border-color: rgba(23, 105, 210, 0.16);
  background: rgba(23, 105, 210, 0.025);
  box-shadow: none;
}

.substat-row.recorded .tier-grid button:disabled:not(.recorded-tier) {
  border-color: rgba(216, 226, 234, 0.56);
  color: #84929e;
  background: rgba(247, 249, 251, 0.72);
}

.tier-grid button.recorded-tier:disabled {
  border-color: rgba(23, 105, 210, 0.34);
  color: var(--primary-deep);
  background: rgba(23, 105, 210, 0.1);
}

.tier-grid button.saving-tier:disabled {
  border-color: rgba(23, 105, 210, 0.42);
  color: var(--primary-deep);
  background: rgba(23, 105, 210, 0.08);
}

.tier-saving-label {
  color: var(--primary-deep);
  font-weight: var(--weight-label);
}
```

Add the explicit dark-theme equivalents:

```css
.app-shell.theme-dark .substat-row.recorded {
  border-color: rgba(80, 152, 255, 0.2);
  background: rgba(43, 105, 184, 0.07);
}

.app-shell.theme-dark .substat-row.recorded .tier-grid button:disabled:not(.recorded-tier) {
  border-color: rgba(99, 121, 138, 0.28);
  color: #8293a0;
  background: rgba(20, 31, 40, 0.72);
}

.app-shell.theme-dark .tier-grid button.recorded-tier:disabled,
.app-shell.theme-dark .tier-grid button.saving-tier:disabled {
  border-color: rgba(80, 152, 255, 0.42);
  color: #b8d5ff;
  background: rgba(43, 105, 184, 0.18);
}

.app-shell.theme-dark .tier-saving-label { color: #b8d5ff; }
```

- [ ] **Step 4: Run component and workflow tests**

```powershell
node --test src/features/workspace/EchoWorkbenchView.test.js src/features/workspace/useEchoWorkspace.test.js
```

Expected: PASS.

- [ ] **Step 5: Review the task diff without staging**

```powershell
git diff -- WuwaFrontend/src/features/workspace/EchoWorkbenchView.vue WuwaFrontend/src/styles/features/workspace.css WuwaFrontend/src/features/workspace/EchoWorkbenchView.test.js
```

### Task 5: Add the compact desktop breakpoint and shell polish

**Files:**
- Modify: `WuwaFrontend/src/features/workspace/EchoWorkbenchView.test.js`
- Modify: `WuwaFrontend/src/App.test.js`
- Modify: `WuwaFrontend/src/styles/features/workspace.css`
- Modify: `WuwaFrontend/src/styles/features/workspace-active.css`
- Modify: `WuwaFrontend/src/styles/shell.css`
- Modify: `WuwaFrontend/src/styles/features/recognition.css`

- [ ] **Step 1: Add failing responsive and hit-area contracts**

Add to `EchoWorkbenchView.test.js`:

```js
test('workbench has a compact desktop layout that keeps eight tiers on one row', async () => {
  const workspace = await readFile(new URL('../../styles/features/workspace.css', import.meta.url), 'utf8')
  const active = await readFile(new URL('../../styles/features/workspace-active.css', import.meta.url), 'utf8')
  assert.match(workspace, /@media \(min-width: 1180px\) and \(max-width: 1440px\)/)
  assert.match(workspace, /grid-template-columns: repeat\(8, minmax\(0, 1fr\)\)/)
  assert.match(workspace, /grid-template-columns: minmax\(300px, 320px\) minmax\(0, 1fr\)/)
  assert.match(active, /grid-template-columns: minmax\(248px, 264px\) minmax\(0, 1fr\)/)
  assert.match(active, /grid-template-columns: minmax\(0, 1fr\) 176px/)
  assert.match(active, /\.active-echo-name-title \{[\s\S]+text-overflow: ellipsis;[\s\S]+white-space: nowrap;/)
})
```

Add to `App.test.js`:

```js
test('workbench shell keeps the hero compact and small controls easy to hit', async () => {
  const shell = await readFile(new URL('./styles/shell.css', import.meta.url), 'utf8')
  const recognition = await readFile(new URL('./styles/features/recognition.css', import.meta.url), 'utf8')
  assert.match(shell, /\.hero-band\.compact \{[\s\S]+min-height: 80px;[\s\S]+padding: 8px 18px;/)
  assert.match(shell, /\.topbar \.pill-tabs button \{[\s\S]+min-height: 40px;/)
  assert.match(recognition, /\.recognition-refresh-button \{[\s\S]+width: 40px;[\s\S]+height: 40px;/)
})
```

- [ ] **Step 2: Run the focused tests and verify RED**

```powershell
node --test --test-name-pattern="compact desktop|hero compact" src/features/workspace/EchoWorkbenchView.test.js src/App.test.js
```

Expected: FAIL because there is no 861–1440px layout and the current hero and refresh control are larger/smaller than the new contracts.

- [ ] **Step 3: Implement the compact desktop layout**

Add to `workspace.css` before the 860px breakpoint:

```css
@media (min-width: 1180px) and (max-width: 1440px) {
  .workspace-grid {
    grid-template-columns: minmax(300px, 320px) minmax(0, 1fr);
    gap: 16px;
  }

  .gallery-panel { padding: 18px; }

  .substat-row {
    grid-template-columns: minmax(172px, 200px) minmax(0, 1fr);
    gap: 8px;
    padding: 10px;
  }

  .tier-grid {
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 4px;
  }

  .tier-grid button {
    min-width: 0;
    padding: 5px 3px;
  }
}
```

Add to `workspace-active.css` before the 860px breakpoint:

```css
@media (min-width: 1180px) and (max-width: 1440px) {
  .active-summary {
    grid-template-columns: minmax(248px, 264px) minmax(0, 1fr);
    column-gap: 16px;
  }

  .active-echo-stage,
  .active-record-panel {
    min-height: 264px;
    height: 264px;
  }

  .active-record-panel { grid-template-columns: minmax(0, 1fr) 176px; }
  .active-record-main {
    gap: 8px;
    padding: 10px 16px;
  }
  .active-record-head {
    gap: 6px 14px;
    padding-bottom: 8px;
  }
  .roll-strip span,
  .roll-slot { min-height: 30px; }
  .active-action-rail {
    gap: 8px;
    padding: 10px;
  }
  .active-prediction-card { min-height: 112px; }

  .active-echo-name-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
```

- [ ] **Step 4: Implement hero and hit-area polish**

In `shell.css`, set the compact hero and metrics to:

```css
.hero-band.compact {
  min-height: 80px;
  padding: 8px 18px;
}

.hero-band.compact .hero-stats div {
  min-width: 96px;
  padding: 5px 20px 3px;
}

.topbar .pill-tabs button { min-height: 40px; }
```

In `recognition.css`, update the refresh control:

```css
.recognition-refresh-button {
  width: 40px;
  height: 40px;
  min-height: 40px;
}
```

In `workspace-active.css`, enlarge only the navigation hit area while leaving the icon unchanged:

```css
.active-echo-nav {
  width: 40px;
  height: 40px;
}
```

- [ ] **Step 5: Run focused tests and inspect overflow contracts**

```powershell
node --test src/features/workspace/EchoWorkbenchView.test.js src/App.test.js
git diff --check
```

Expected: PASS and no whitespace errors.

### Task 6: Dock a new minimized history control in the right safe area

**Files:**
- Create: `WuwaFrontend/src/features/history/floatingHistoryPosition.js`
- Create: `WuwaFrontend/src/features/history/floatingHistoryPosition.test.js`
- Modify: `WuwaFrontend/src/features/history/FloatingHistoryPanel.vue`
- Modify: `WuwaFrontend/src/features/history/FloatingHistoryPanel.test.js`

- [ ] **Step 1: Add the failing pure position test**

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultFloatingHistoryPosition } from './floatingHistoryPosition.js'

test('a new minimized history panel starts in the desktop bottom-right safe area', () => {
  assert.deepEqual(defaultFloatingHistoryPosition({
    viewportWidth: 1366,
    viewportHeight: 768,
    minimized: true,
  }), { x: 1266, y: 668 })
})

test('the expanded desktop default remains unchanged', () => {
  assert.deepEqual(defaultFloatingHistoryPosition({
    viewportWidth: 1366,
    viewportHeight: 768,
    minimized: false,
  }), { x: 32, y: 150 })
})
```

- [ ] **Step 2: Run the pure test and verify RED**

```powershell
node --test src/features/history/floatingHistoryPosition.test.js
```

Expected: FAIL because the helper module does not exist.

- [ ] **Step 3: Implement and consume the helper**

Create `floatingHistoryPosition.js`:

```js
const MINIMIZED_SIZE = 76
const SAFE_INSET = 24

export function defaultFloatingHistoryPosition({ viewportWidth, viewportHeight, minimized }) {
  if (!minimized) return { x: 32, y: 150 }
  return {
    x: Math.max(12, viewportWidth - MINIMIZED_SIZE - SAFE_INSET),
    y: Math.max(12, viewportHeight - MINIMIZED_SIZE - SAFE_INSET),
  }
}
```

In `FloatingHistoryPanel.vue`, import the helper, initialize `isHistoryMinimized` before `floatingHistoryPosition`, and pass the state into the reader:

```js
const isHistoryMinimized = ref(localStorage.getItem('wuwa-floating-history-minimized') === 'true')
const floatingHistoryPosition = ref(readFloatingHistoryPosition(isHistoryMinimized.value))

function readFloatingHistoryPosition(minimized) {
  try {
    const stored = JSON.parse(localStorage.getItem('wuwa-floating-history-position') || 'null')
    if (Number.isFinite(stored?.x) && Number.isFinite(stored?.y)) return stored
  } catch {
    // Ignore invalid saved panel coordinates.
  }
  return defaultFloatingHistoryPosition({
    viewportWidth: typeof window === 'undefined' ? 1366 : window.innerWidth,
    viewportHeight: typeof window === 'undefined' ? 768 : window.innerHeight,
    minimized,
  })
}
```

Saved user positions continue to win, so this only changes the first minimized placement.

- [ ] **Step 4: Add the component contract and run tests**

Add to `FloatingHistoryPanel.test.js`:

```js
test('floating history uses the safe default only when no saved position exists', async () => {
  const source = await readFile(new URL('./FloatingHistoryPanel.vue', import.meta.url), 'utf8')
  assert.match(source, /import \{ defaultFloatingHistoryPosition \} from '\.\/floatingHistoryPosition'/)
  assert.match(source, /readFloatingHistoryPosition\(isHistoryMinimized\.value\)/)
  assert.match(source, /if \(Number\.isFinite\(stored\?\.x\) && Number\.isFinite\(stored\?\.y\)\) return stored/)
})
```

Run:

```powershell
node --test src/features/history/floatingHistoryPosition.test.js src/features/history/FloatingHistoryPanel.test.js
```

Expected: PASS.

- [ ] **Step 5: Review the task diff without staging**

```powershell
git diff -- WuwaFrontend/src/features/history
```

### Task 7: Full verification and live visual QA

**Files:**
- Verify only: `WuwaFrontend/src/**`

- [ ] **Step 1: Run the complete frontend test suite**

```powershell
npm test
```

Run from `WuwaFrontend`. Expected: all tests pass with zero failures.

- [ ] **Step 2: Build the production bundle**

```powershell
npm run build
```

Expected: Vite completes successfully with no new warnings.

- [ ] **Step 3: Run static diff checks**

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; status contains the pre-existing typography work plus the intentional workbench files only.

- [ ] **Step 4: Verify the live page at desktop widths**

Use the authenticated local workbench and check light and dark themes at 1700px, 1366×768, 1180px, and 860px:

- Outer left and right columns remain visually coordinated.
- The setup content sticks after scrolling while the outer left surface continues with the workbench.
- COST and main-stat controls are reachable without scrolling to the bottom of the matrix.
- All eight tiers remain on one row from 1180px through 1440px.
- The active title truncates rather than wrapping at 1366px.
- No horizontal scrollbar appears.
- Recorded rows emphasize one selected tier; prediction green remains semantically distinct.
- Search, empty search state, keyboard focus, and `aria-live` feedback are visible and readable.
- While a tier save is pending, every tier is visibly disabled and the selected cell reads “保存中”.
- A new minimized history control starts in the lower-right safe area when no saved position exists.

- [ ] **Step 5: Restore test state and report evidence**

Restore the original theme and viewport, leave existing user data unchanged, collect browser console errors and warnings, and report the exact test/build results plus any remaining visual limitation.
