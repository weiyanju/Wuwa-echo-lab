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
