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
  assert.match(source, /{{ formatSubstatTierValue\(row\.substat_type, tier\.value\) }}/)
  assert.doesNotMatch(source, /formatPercent\(row\.candidate\.p_final\)/)
  assert.doesNotMatch(source, /formatSignedPercent\(row\.candidate\.baseline_deviation\)/)
  assert.doesNotMatch(source, /<small v-if="row\.candidate">/)
})

test('workspace styles keep long substat titles and recorded rows stable', async () => {
  const source = await readFile(new URL('./EchoWorkbenchView.vue', import.meta.url), 'utf8')
  const style = await readFile(new URL('../../styles/features/workspace.css', import.meta.url), 'utf8')

  assert.match(source, /class="substat-title-line"/)
  assert.match(source, /class="top-predicted-pill"/)
  assert.match(style, /\.substat-title-line \{[\s\S]+grid-template-columns: minmax\(0, 1fr\) auto;/)
  assert.match(style, /\.top-predicted-pill \{[\s\S]+white-space: nowrap;/)
  assert.match(style, /\.substat-row \{[\s\S]+min-height: 70px;/)
  assert.match(style, /\.substat-meta \{[\s\S]+min-height: 46px;/)
  assert.match(style, /\.substat-row\.top-predicted-row \{[\s\S]+box-shadow: inset 4px 0 0 var\(--success\);/)
  assert.match(style, /\.substat-row\.recorded \{[\s\S]+box-shadow: inset 4px 0 0 transparent;/)
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
