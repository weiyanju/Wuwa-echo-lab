import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readComponent() {
  return readFile(new URL('./UidSwitcher.vue', import.meta.url), 'utf8')
}

test('uid switcher declares its public props and emits without local storage state', async () => {
  const source = await readComponent()

  assert.match(source, /defineProps\(\{[\s\S]+accounts:[\s\S]+currentAccount:[\s\S]+canAddAccount:[\s\S]+busy:[\s\S]+error:/)
  assert.match(source, /const emit = defineEmits\(\['select', 'add'\]\)/)
  assert.doesNotMatch(source, /localStorage/)
})

test('uid switcher renders the current uid capsule and never exposes nicknames', async () => {
  const source = await readComponent()

  assert.match(source, /const currentUidText = computed\(\(\) => props\.currentAccount\?\.uid \|\| 'UID 未绑定'\)/)
  assert.match(source, /class="uid-chip-value">\{\{ currentUidText \}\}<\/span>/)
  assert.doesNotMatch(source, /nickname/)
})

test('uid switcher imports shared check and chevron icons as masked line icons', async () => {
  const source = await readComponent()

  assert.match(source, /import checkIcon from '\.\.\/\.\.\/assets\/icons\/check\.svg'/)
  assert.match(source, /import chevronDownIcon from '\.\.\/\.\.\/assets\/icons\/chevron-down\.svg'/)
  assert.match(source, /function iconMask\(source\)/)
  assert.match(source, /class="ui-line-icon uid-chip-chevron"/)
  assert.match(source, /iconMask\(chevronDownIcon\)/)
  assert.match(source, /class="ui-line-icon uid-account-check"/)
  assert.match(source, /iconMask\(checkIcon\)/)
})

test('uid switcher exposes menu a11y and closes with focus restoration', async () => {
  const source = await readComponent()

  assert.match(source, /aria-haspopup="menu"/)
  assert.match(source, /:aria-expanded="menuOpen\.toString\(\)"/)
  assert.match(source, /aria-controls="uid-switcher-menu"/)
  assert.match(source, /id="uid-switcher-menu"/)
  assert.match(source, /role="menu"/)
  assert.match(source, /function closeMenu\(\{ restoreFocus = true \} = \{\}\) \{[\s\S]+menuOpen\.value = false[\s\S]+if \(restoreFocus\) \{[\s\S]+chipButton\.value\?\.focus\(\)/)
  assert.match(source, /function handleKeydown\(event\) \{[\s\S]+if \(event\.key !== 'Escape'\) \{[\s\S]+closeMenu\(\)/)
  assert.match(source, /function handleDocumentPointerdown\(event\) \{[\s\S]+if \(!root\.value\?\.contains\(event\.target\)\) \{[\s\S]+closeMenu\(\)/)
  assert.match(source, /onMounted\(\(\) => \{[\s\S]+document\.addEventListener\('pointerdown', handleDocumentPointerdown\)[\s\S]+document\.addEventListener\('keydown', handleKeydown\)/)
  assert.match(source, /onBeforeUnmount\(\(\) => \{[\s\S]+document\.removeEventListener\('pointerdown', handleDocumentPointerdown\)[\s\S]+document\.removeEventListener\('keydown', handleKeydown\)/)
})

test('uid switcher lists accounts, emits selection, and marks only the current account', async () => {
  const source = await readComponent()

  assert.match(source, /\{\{ accounts\.length \}\} \/ 5/)
  assert.match(source, /v-for="account in accounts"/)
  assert.match(source, /:class="\{ current: account\.id === props\.currentAccount\?\.id \}"/)
  assert.match(source, /:disabled="busy \|\| account\.id === props\.currentAccount\?\.id"/)
  assert.match(source, /@click="selectAccount\(account\)"/)
  assert.match(source, /function selectAccount\(account\) \{[\s\S]+if \(props\.busy \|\| account\.id === props\.currentAccount\?\.id\) \{[\s\S]+return[\s\S]+emit\('select', account\)/)
  assert.match(source, /v-if="account\.id === props\.currentAccount\?\.id"/)
  assert.doesNotMatch(source, />当前<\/em>/)
})

test('uid switcher validates inline add input before emitting normalized uid', async () => {
  const source = await readComponent()

  assert.match(source, /const UID_ERROR_MESSAGE = '请输入 9 位数字 UID。'/)
  assert.match(source, /function normalizeUid\(uid\) \{[\s\S]+return String\(uid \?\? ''\)\.replace\(\/\\D\/g, ''\)/)
  assert.match(source, /function isValidUid\(uid\) \{[\s\S]+return \/\^\[0-9\]\{9\}\$\/\.test\(uid\)/)
  assert.match(source, /function submitAddAccount\(\) \{[\s\S]+const uid = normalizeUid\(draftUid\.value\)[\s\S]+if \(!isValidUid\(uid\)\) \{[\s\S]+validationError\.value = UID_ERROR_MESSAGE[\s\S]+return[\s\S]+emit\('add', uid\)/)
  assert.match(source, /v-model="draftUid"/)
  assert.doesNotMatch(source, /maxlength=/)
})

test('uid switcher disables add controls at capacity or while busy', async () => {
  const source = await readComponent()

  assert.match(source, /const addLimitReached = computed\(\(\) => accounts\.value\.length >= MAX_UID_ACCOUNTS \|\| !props\.canAddAccount\)/)
  assert.match(source, /const addDisabled = computed\(\(\) => props\.busy \|\| addLimitReached\.value\)/)
  assert.match(source, /@click="startAddAccount"/)
  assert.match(source, /:disabled="addDisabled"/)
  assert.match(source, /\{\{ addLimitReached \? '已达上限' : '添加 UID' \}\}/)
  assert.match(source, /function startAddAccount\(\) \{[\s\S]+if \(addDisabled\.value\) \{[\s\S]+return[\s\S]+adding\.value = true/)
})
