import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('echo workbench owns setup and active echo presentation', async () => {
  const source = await readFile(new URL('./EchoWorkbenchView.vue', import.meta.url), 'utf8')

  assert.match(source, /import \{ sonataEffects \} from '\.\.\/\.\.\/data\/sonataEffects'/)
  assert.match(source, /import \{ mainStatLabels, mainStatsByCost, substatLabels \} from '\.\.\/\.\.\/data\/substats'/)
  assert.match(source, /const legalMainStats = computed\(\(\) => mainStatsByCost\[props\.config\.cost\] \|\| \[\]\)/)
  assert.match(source, /const progressPercent = computed\(\(\) => Math\.min\(\(\(props\.activeEcho\?\.substats\.length \|\| 0\) \/ 5\) \* 100, 100\)\)/)
  assert.match(source, /class="product-panel create-panel"/)
  assert.match(source, /class="gallery-panel"/)
})

test('echo workbench keeps substat rows focused on entry by default', async () => {
  const source = await readFile(new URL('./EchoWorkbenchView.vue', import.meta.url), 'utf8')

  assert.match(source, /formatSubstatTierValue/)
  assert.match(source, /{{ formatSubstatTierValue\(roll\.substat_type, roll\.tier_value\) }}/)
  assert.match(source, /{{ formatSubstatTierValue\(row\.substat_type, row\.recorded\.tier_value\) }}/)
  assert.match(source, /formatSubstatTierNumber\(row\.substat_type, tier\.value\)/)
  assert.doesNotMatch(source, /formatPercent\(row\.candidate\.p_final\)/)
  assert.doesNotMatch(source, /formatSignedPercent\(row\.candidate\.baseline_deviation\)/)
  assert.doesNotMatch(source, /<small v-if="row\.candidate">/)
})

test('echo workbench keeps tier values calm and probabilities secondary', async () => {
  const source = await readFile(new URL('./EchoWorkbenchView.vue', import.meta.url), 'utf8')
  const style = await readFile(new URL('../../styles/features/workspace.css', import.meta.url), 'utf8')

  assert.match(source, /formatSubstatTierNumber/)
  assert.match(source, /formatSubstatTierUnit/)
  assert.match(source, /class="tier-value"/)
  assert.match(source, /class="tier-unit"/)
  assert.match(source, /class="tier-probability"/)
  assert.match(source, /formatPercent\(tier\.probability, 1\)/)
  assert.match(style, /\.tier-grid button \{[\s\S]+padding: 5px 10px;/)
  assert.match(style, /\.tier-value \{[\s\S]+font-size: 17px; font-weight: 700;/)
  assert.match(style, /\.tier-unit \{[\s\S]+font-size: 0\.72em;/)
  assert.match(style, /\.tier-probability \{[\s\S]+font-size: 11px; font-weight: 400;/)
  assert.match(style, /\.tier-probability \{[\s\S]+font-variant-numeric: tabular-nums;/)
})

test('workspace styles keep long substat titles and recorded rows stable', async () => {
  const source = await readFile(new URL('./EchoWorkbenchView.vue', import.meta.url), 'utf8')
  const style = await readFile(new URL('../../styles/features/workspace.css', import.meta.url), 'utf8')
  const topPredictedIcon = await readFile(new URL('../../assets/icons/fast-arrow-up.svg', import.meta.url), 'utf8')

  assert.match(source, /class="substat-title-line"/)
  assert.match(source, /import topPredictedIcon from '\.\.\/\.\.\/assets\/icons\/fast-arrow-up\.svg'/)
  assert.match(source, /class="top-predicted-indicator"/)
  assert.match(source, /aria-label="预测概率提升"/)
  assert.match(source, /class="ui-line-icon top-predicted-icon"/)
  assert.doesNotMatch(source, />预测最高<\/span>/)
  assert.match(style, /\.substat-title-line \{[\s\S]+grid-template-columns: minmax\(0, 1fr\) auto;/)
  assert.match(style, /\.top-predicted-indicator \{[\s\S]+width: 24px; height: 24px;/)
  assert.match(style, /\.top-predicted-icon \{[\s\S]+width: 14px; height: 14px;/)
  assert.match(topPredictedIcon, /M6 11L12 5L18 11/)
  assert.match(topPredictedIcon, /M6 19L12 13L18 19/)
  assert.doesNotMatch(topPredictedIcon, /a2 2 0 0 0/)
  assert.match(style, /\.substat-row \{[\s\S]+min-height: 70px;/)
  assert.match(style, /\.substat-meta \{[\s\S]+min-height: 46px;/)
  assert.match(style, /\.substat-row\.top-predicted-row \{[\s\S]+box-shadow: inset 4px 0 0 var\(--success\);/)
  assert.match(style, /\.substat-row\.recorded \{[\s\S]+box-shadow: inset 4px 0 0 transparent;/)
})

test('echo setup keeps main stat changes compact and softly animated', async () => {
  const source = await readFile(new URL('./EchoWorkbenchView.vue', import.meta.url), 'utf8')
  const style = await readFile(new URL('../../styles/features/workspace.css', import.meta.url), 'utf8')

  assert.match(source, /<TransitionGroup name="main-stat-option" tag="div" class="option-row main-stat-row">/)
  assert.match(style, /\.main-stat-row \{[\s\S]+align-content: start;/)
  assert.doesNotMatch(style, /\.main-stat-row \{[\s\S]+min-height: 148px;/)
  assert.match(style, /\.main-stat-option-enter-active,\s+\.main-stat-option-leave-active \{[\s\S]+transition: opacity 140ms ease-out, transform 140ms ease-out;/)
  assert.match(style, /\.main-stat-option-enter-from,\s+\.main-stat-option-leave-to \{[\s\S]+opacity: 0;/)
})

test('echo workbench emits commands without owning persistence', async () => {
  const source = await readFile(new URL('./EchoWorkbenchView.vue', import.meta.url), 'utf8')

  assert.match(source, /defineEmits\(\['config-change', 'undo', 'discard', 'next', 'select-tier'\]\)/)
  assert.match(source, /emit\('config-change', \{ sonata: effect\.name \}\)/)
  assert.match(source, /emit\('select-tier', \{ row, tier \}\)/)
  assert.doesNotMatch(source, /from '\.\.\/\.\.\/services\/api'/)
})

test('echo workbench owns setup panel height synchronization', async () => {
  const source = await readFile(new URL('./EchoWorkbenchView.vue', import.meta.url), 'utf8')

  assert.match(source, /const createPanelRef = ref\(null\)/)
  assert.match(source, /const galleryPanelRef = ref\(null\)/)
  assert.match(source, /window\.addEventListener\('resize', syncSetupPanelHeight\)/)
  assert.match(source, /window\.removeEventListener\('resize', syncSetupPanelHeight\)/)
})
