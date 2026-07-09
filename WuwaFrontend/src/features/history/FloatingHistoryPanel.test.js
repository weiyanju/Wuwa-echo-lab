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

test('floating history presents echo names instead of internal ids', async () => {
  const source = await readFile(new URL('./FloatingHistoryPanel.vue', import.meta.url), 'utf8')

  assert.match(source, /import \{ displayEchoName \} from '\.\.\/\.\.\/services\/echoDisplay'/)
  assert.match(source, /\{\{ displayEchoName\(echo\) \}\}/)
  assert.doesNotMatch(source, /displayEchoNumericId/)
})

test('floating history presents echo config as the pre-pill inline metadata row', async () => {
  const source = await readFile(new URL('./FloatingHistoryPanel.vue', import.meta.url), 'utf8')
  const style = await readFile(new URL('../../styles/features/history.css', import.meta.url), 'utf8')

  assert.match(source, /\{\{ echo\.cost \}\}C · \{\{ echo\.set_name \}\} · \{\{ mainStatLabels\[echo\.main_stat\] \|\| echo\.main_stat \}\} · \{\{ echo\.substats\.length \}\}\/5/)
  assert.doesNotMatch(source, /class="echo-name"/)
  assert.doesNotMatch(source, /class="echo-meta-line"/)
  assert.doesNotMatch(source, /class="echo-progress"/)
  assert.doesNotMatch(source, /class="echo-meta-pills"/)
  assert.doesNotMatch(source, /class="echo-meta-pill/)
  assert.match(style, /\.echo-item-head > span \{[\s\S]+font-size: 12px;/)
  assert.doesNotMatch(style, /\.echo-meta-line/)
  assert.doesNotMatch(style, /\.echo-progress/)
})

test('floating history keeps the title and filters compact', async () => {
  const style = await readFile(new URL('../../styles/features/history.css', import.meta.url), 'utf8')

  assert.match(style, /\.floating-history-handle \{[\s\S]+margin: -4px -4px 0;/)
  assert.match(style, /\.floating-history-handle \{[\s\S]+padding: 4px 154px 0 4px;/)
  assert.match(style, /\.floating-history-handle\.section-heading \{[\s\S]+margin-bottom: 0;/)
  assert.match(style, /\.history-filter-bar \{[\s\S]+margin: 0 0 2px;/)
  assert.match(style, /\.compact-heading \{[\s\S]+margin-bottom: 0;/)
  assert.match(style, /\.history-records \{[\s\S]+gap: 8px;/)
  assert.match(style, /\.history-records h2 \{[\s\S]+margin-bottom: 0;/)
})
