import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('floating history owns its filters and panel interaction state', async () => {
  const source = await readFile(new URL('./FloatingHistoryPanel.vue', import.meta.url), 'utf8')

  assert.match(source, /defineProps\(\{[\s\S]+echoes:[\s\S]+activeEchoId:/)
  assert.match(source, /isDarkTheme:/)
  assert.match(source, /import historyTerminalDarkIcon from '\.\.\/\.\.\/assets\/icons\/pangu-terminal-dark\.png'/)
  assert.match(source, /import historyTerminalIcon from '\.\.\/\.\.\/assets\/icons\/rovers-terminal-expand\.png'/)
  assert.match(source, /const historyFilter = ref\('all'\)/)
  assert.match(source, /const floatingHistoryPosition = ref\(readFloatingHistoryPosition\(\)\)/)
  assert.match(source, /const isHistoryMinimized = ref\(localStorage\.getItem\('wuwa-floating-history-minimized'\) === 'true'\)/)
  assert.match(source, /const isHistoryPinned = ref\(localStorage\.getItem\('wuwa-floating-history-pinned'\) === 'true'\)/)
  assert.match(source, /const isHistoryShowcase = ref\(false\)/)
  assert.match(source, /class="history-action-icon terminal-expand-icon"/)
  assert.match(source, /minimizedHistoryTerminalIcon/)
  assert.match(source, /terminalExpandIconStyle/)
})

test('floating history emits selection and cleans up document listeners', async () => {
  const source = await readFile(new URL('./FloatingHistoryPanel.vue', import.meta.url), 'utf8')

  assert.match(source, /const emit = defineEmits\(\['select'\]\)/)
  assert.match(source, /@click="emit\('select', echo\.id\)"/)
  assert.match(source, /onBeforeUnmount\(\(\) => \{[\s\S]+endFloatingHistoryDrag\(\)[\s\S]+window\.removeEventListener\('resize', constrainSavedFloatingHistoryPosition\)/)
  assert.match(source, /document\.removeEventListener\('pointermove', moveFloatingHistory\)/)
  assert.match(source, /document\.removeEventListener\('pointerup', endFloatingHistoryDrag\)/)
  assert.match(source, /document\.removeEventListener\('pointercancel', endFloatingHistoryDrag\)/)
})
