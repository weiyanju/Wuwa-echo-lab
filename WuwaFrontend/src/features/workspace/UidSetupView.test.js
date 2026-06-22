import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readView() {
  return readFile(new URL('./UidSetupView.vue', import.meta.url), 'utf8')
}

test('uid setup normalizes input without silently truncating it and validates nine digits', async () => {
  const source = await readView()

  assert.match(source, /import \{ normalizePlayerUid, isValidPlayerUid \} from '\.\.\/\.\.\/services\/playerUid'/)
  assert.match(source, /uidBinding\.value = normalizePlayerUid\(uidBinding\.value\)/)
  assert.match(source, /if \(!isValidPlayerUid\(uid\)\) \{\s+validationError\.value = '请输入 9 位数字 UID。'/)
  assert.doesNotMatch(source, /maxlength=/)
  assert.match(source, /emit\('bind', uid\)/)
})

test('uid setup presents the compact two-column first-run card', async () => {
  const source = await readView()

  assert.match(source, /<section class="uid-setup-card">/)
  assert.match(source, /<div class="uid-setup-media" aria-hidden="true">/)
  assert.match(source, /<form class="uid-binding-form" @submit\.prevent="submitUidBinding">/)
  assert.match(source, /<h1>绑定游戏 UID<\/h1>/)
  assert.match(source, /<p>绑定后即可进入工作台。<\/p>/)
  assert.match(source, /<label[^>]*>\s*UID/)
  assert.match(source, /placeholder="输入你的 UID"/)
  assert.match(source, /\{\{ saving \? '绑定中' : '绑定并进入' \}\}/)
  assert.match(source, /可在游戏个人信息页查看 UID/)
})

test('uid setup keeps shell commands and excludes rejected explanatory copy', async () => {
  const source = await readView()

  assert.match(source, /const emit = defineEmits\(\['bind', 'toggle-theme', 'sign-out'\]\)/)
  assert.match(source, /@click="emit\('toggle-theme'\)"/)
  assert.match(source, /@click="emit\('sign-out'\)"/)
  assert.match(source, /<section class="uid-setup-shell">/)
  assert.doesNotMatch(source, /最多\s*5\s*个|数据隔离|不可删除|统计功能|识别功能/)
  assert.doesNotMatch(source, /locked-workbench/)
})
