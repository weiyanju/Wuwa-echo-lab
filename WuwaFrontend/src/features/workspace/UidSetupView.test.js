import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('uid setup owns uid input normalization and validation', async () => {
  const source = await readFile(new URL('./UidSetupView.vue', import.meta.url), 'utf8')

  assert.match(source, /import \{ normalizePlayerUid \} from '\.\.\/\.\.\/services\/playerUid'/)
  assert.match(source, /const uidBinding = ref\(''\)/)
  assert.match(source, /function handleUidBindingInput\(\) \{\s+uidBinding\.value = normalizePlayerUid\(uidBinding\.value\)/)
  assert.match(source, /if \(!uid\) \{\s+validationError\.value = '请填写游戏 UID。'/)
})

test('uid setup emits workflow and shell commands', async () => {
  const source = await readFile(new URL('./UidSetupView.vue', import.meta.url), 'utf8')

  assert.match(source, /const emit = defineEmits\(\['bind', 'toggle-theme', 'sign-out'\]\)/)
  assert.match(source, /emit\('bind', uid\)/)
  assert.match(source, /@click="emit\('toggle-theme'\)"/)
  assert.match(source, /@click="emit\('sign-out'\)"/)
  assert.match(source, /<section class="uid-setup-shell">/)
})
