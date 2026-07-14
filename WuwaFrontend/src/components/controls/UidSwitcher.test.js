import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readComponent() {
  return readFile(new URL('./UidSwitcher.vue', import.meta.url), 'utf8')
}

async function readShellStyles() {
  return readFile(new URL('../../styles/shell.css', import.meta.url), 'utf8')
}

test('uid switcher declares its public props and emits without local storage state', async () => {
  const source = await readComponent()

  assert.match(source, /defineProps\(\{[\s\S]+accounts:[\s\S]+currentAccount:[\s\S]+canAddAccount:[\s\S]+busy:[\s\S]+error:/)
  assert.match(source, /const emit = defineEmits\(\['select', 'add', 'sign-out'\]\)/)
  assert.doesNotMatch(source, /localStorage/)
})

test('uid switcher uses one asymmetric action row for default and adding states', async () => {
  const source = await readComponent()

  assert.match(source, /<div class="uid-switcher-actions" role="none">/)
  assert.match(source, /v-if="adding"[\s\S]*class="uid-switcher-submit"[\s\S]*form="uid-switcher-add-form"[\s\S]*>确认添加<\/button>/)
  assert.match(source, /v-else[\s\S]*ref="addButton"[\s\S]*class="uid-switcher-add"[\s\S]*添加 UID/)
  assert.match(source, /v-if="adding"[\s\S]*class="uid-switcher-cancel"[\s\S]*@click="cancelAddAccount"[\s\S]*>取消<\/button>/)
  assert.match(source, /v-else[\s\S]*class="uid-switcher-sign-out"[\s\S]*role="menuitem"[\s\S]*@click="emit\('sign-out'\)"[\s\S]*>退出登录<\/button>/)
  assert.doesNotMatch(source, /uid-switcher-footer/)
})

test('cancelling uid entry restores the add action and its focus', async () => {
  const source = await readComponent()

  assert.match(source, /const addButton = ref\(null\)/)
  assert.match(source, /function cancelAddAccount\(\) \{[\s\S]*resetAddForm\(\)[\s\S]*nextTick\(\(\) => \{[\s\S]*addButton\.value\?\.focus\(\)/)
  assert.match(source, /<form\s+v-if="adding"\s+id="uid-switcher-add-form"/)
})

test('uid menu keeps a solid primary action and a low-frequency asymmetric secondary action', async () => {
  const styles = await readShellStyles()
  const switcherRule = styles.match(/^\.uid-switcher \{([^}]+)\}/m)?.[1] || ''
  const menuRule = styles.match(/^\.uid-switcher-menu \{([^}]+)\}/m)?.[1] || ''
  const menuTopRule = styles.match(/^\.uid-switcher-menu-top \{([^}]+)\}/m)?.[1] || ''
  const menuCountRule = styles.match(/^\.uid-switcher-menu-top strong \{([^}]+)\}/m)?.[1] || ''
  const actionsRule = styles.match(/^\.uid-switcher-actions \{([^}]+)\}/m)?.[1] || ''
  const submitRule = styles.match(/^\.uid-switcher-submit \{([^}]+)\}/m)?.[1] || ''
  const addRule = styles.match(/^\.uid-switcher-add \{([^}]+)\}/m)?.[1] || ''
  const signOutRule = styles.match(/^\.uid-switcher-sign-out,\r?\n\.uid-switcher-cancel \{([^}]+)\}/m)?.[1] || ''
  const darkAddRule = styles.match(/^\.app-shell\.theme-dark \.uid-switcher-add \{([^}]+)\}/m)?.[1] || ''

  assert.match(switcherRule, /position: relative/)
  assert.match(menuRule, /right: 0/)
  assert.match(menuRule, /width: min\(320px, calc\(100vw - 32px\)\)/)
  assert.match(menuRule, /border-radius: 16px/)
  assert.match(menuRule, /padding: 16px/)
  assert.match(menuRule, /background: #ffffff/)
  assert.match(menuRule, /box-shadow: 0 8px 12px rgba\(39, 55, 71, 0\.1\)/)
  assert.doesNotMatch(menuRule, /gradient/)
  assert.match(menuTopRule, /font-size: var\(--text-label\)/)
  assert.match(menuCountRule, /font-family: var\(--font-data\)/)
  assert.match(menuCountRule, /font-variant-numeric: tabular-nums/)
  assert.match(actionsRule, /display: grid/)
  assert.match(actionsRule, /grid-template-columns: minmax\(0, 1fr\) 88px/)
  assert.match(actionsRule, /gap: 8px/)
  assert.match(actionsRule, /align-items: stretch/)
  assert.match(submitRule, /border: 1px solid var\(--primary\)/)
  assert.match(submitRule, /background: var\(--primary\)/)
  assert.match(submitRule, /box-shadow: none/)
  assert.match(submitRule, /width: 100%/)
  assert.match(submitRule, /min-width: 0/)
  assert.doesNotMatch(submitRule, /margin-top/)
  assert.doesNotMatch(submitRule, /gradient/)
  assert.match(styles, /\.uid-switcher-submit:hover:not\(:disabled\)[^{]*\{[^}]*background: var\(--primary-deep\)/)
  assert.match(addRule, /width: 100%/)
  assert.match(addRule, /min-width: 0/)
  assert.match(addRule, /min-height: 44px/)
  assert.match(addRule, /border: 1px solid rgba\(23, 105, 210, 0\.24\)/)
  assert.doesNotMatch(addRule, /dashed/)
  assert.match(addRule, /background: rgba\(23, 105, 210, 0\.06\)/)
  assert.match(signOutRule, /width: 100%/)
  assert.match(signOutRule, /min-width: 0/)
  assert.match(signOutRule, /min-height: 44px/)
  assert.match(signOutRule, /border: 0/)
  assert.match(signOutRule, /border-radius: 8px/)
  assert.match(signOutRule, /background: transparent/)
  assert.match(signOutRule, /font-size: var\(--text-label\)/)
  assert.match(signOutRule, /font-weight: var\(--weight-supporting\)/)
  assert.match(styles, /^\.uid-switcher-sign-out:hover,\s*\.uid-switcher-sign-out:focus-visible[^{]*\{[^}]*color: var\(--critical\)[^}]*background: rgba\(228, 30, 63, 0\.07\)/m)
  assert.match(styles, /^\.uid-switcher-cancel:hover,\s*\.uid-switcher-cancel:focus-visible[^{]*\{[^}]*color: #2f4659[^}]*background: rgba\(82, 102, 117, 0\.08\)/m)
  assert.match(darkAddRule, /border-color: rgba\(93, 168, 255, 0\.32\)/)
  assert.match(styles, /^\.app-shell\.theme-dark \.uid-switcher-sign-out,\s*\.app-shell\.theme-dark \.uid-switcher-cancel[^{]*\{[^}]*color: #aebdca/m)
  assert.match(styles, /^\.app-shell\.theme-dark \.uid-switcher-sign-out:hover,\s*\.app-shell\.theme-dark \.uid-switcher-sign-out:focus-visible[^{]*\{[^}]*color: #ffd4db[^}]*background: rgba\(255, 105, 128, 0\.12\)/m)
  assert.match(styles, /^\.app-shell\.theme-dark \.uid-switcher-cancel:hover,\s*\.app-shell\.theme-dark \.uid-switcher-cancel:focus-visible[^{]*\{[^}]*color: #eef5f9[^}]*background: rgba\(255, 255, 255, 0\.08\)/m)
  assert.doesNotMatch(styles, /\.uid-switcher-footer \{/)
})

test('uid menu aligns data typography, 44px controls, and flat selected states', async () => {
  const styles = await readShellStyles()
  const fieldRule = styles.match(/^\.uid-switcher-field \{([^}]+)\}/m)?.[1] || ''
  const labelRule = styles.match(/^\.uid-switcher-field label \{([^}]+)\}/m)?.[1] || ''
  const inputRule = styles.match(/^\.uid-switcher-field input \{([^}]+)\}/m)?.[1] || ''
  const focusRule = styles.match(/^\.uid-switcher-field input:focus-visible \{([^}]+)\}/m)?.[1] || ''
  const listRule = styles.match(/^\.uid-recent-list \{([^}]+)\}/m)?.[1] || ''
  const accountRule = styles.match(/^\.uid-recent-list button \{([^}]+)\}/m)?.[1] || ''
  const currentRule = styles.match(/^\.uid-recent-list button\.current \{([^}]+)\}/m)?.[1] || ''
  const darkCurrentRule = styles.match(/^\.app-shell\.theme-dark \.uid-recent-list button\.current \{([^}]+)\}/m)?.[1] || ''
  const submitRule = styles.match(/^\.uid-switcher-submit \{([^}]+)\}/m)?.[1] || ''
  const addRule = styles.match(/^\.uid-switcher-add \{([^}]+)\}/m)?.[1] || ''

  assert.match(fieldRule, /gap: 8px/)
  assert.match(fieldRule, /margin-top: 2px/)
  assert.match(labelRule, /font-size: var\(--text-label\)/)
  assert.match(labelRule, /font-weight: var\(--weight-label\)/)
  assert.match(inputRule, /min-height: 44px/)
  assert.match(inputRule, /padding: 10px 12px/)
  assert.match(inputRule, /font-family: var\(--font-data\)/)
  assert.match(inputRule, /font-size: var\(--text-data-sm\)/)
  assert.match(inputRule, /font-weight: var\(--weight-data\)/)
  assert.match(inputRule, /line-height: var\(--leading-control\)/)
  assert.match(inputRule, /font-variant-numeric: tabular-nums/)
  assert.match(focusRule, /outline: 3px solid rgba\(0, 100, 224, 0\.26\)/)
  assert.match(focusRule, /outline-offset: 3px/)
  assert.match(focusRule, /box-shadow: none/)
  assert.match(listRule, /gap: 8px/)
  assert.match(accountRule, /min-height: 44px/)
  assert.match(accountRule, /padding: 10px 12px/)
  assert.match(accountRule, /font-family: var\(--font-data\)/)
  assert.match(accountRule, /font-size: var\(--text-data-sm\)/)
  assert.match(accountRule, /font-weight: var\(--weight-data\)/)
  assert.match(accountRule, /line-height: var\(--leading-control\)/)
  assert.match(accountRule, /font-variant-numeric: tabular-nums/)
  assert.match(currentRule, /background: rgba\(23, 105, 210, 0\.08\)/)
  assert.doesNotMatch(currentRule, /gradient/)
  assert.match(darkCurrentRule, /background: rgba\(93, 168, 255, 0\.13\)/)
  assert.doesNotMatch(darkCurrentRule, /gradient/)
  assert.match(submitRule, /min-height: 44px/)
  assert.match(submitRule, /padding: 10px 12px/)
  assert.doesNotMatch(submitRule, /margin-top/)
  assert.match(addRule, /min-height: 44px/)
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

test('uid switcher validates inline add input before emitting the original nine digit uid', async () => {
  const source = await readComponent()

  assert.match(source, /const UID_ERROR_MESSAGE = '请输入 9 位数字 UID。'/)
  assert.doesNotMatch(source, /replace\(\/\\D\/g/)
  assert.match(source, /function isValidUid\(uid\) \{[\s\S]+return \/\^\[0-9\]\{9\}\$\/\.test\(uid\)/)
  assert.match(source, /function submitAddAccount\(\) \{[\s\S]+const uid = String\(draftUid\.value \?\? ''\)[\s\S]+if \(!isValidUid\(uid\)\) \{[\s\S]+validationError\.value = UID_ERROR_MESSAGE[\s\S]+return[\s\S]+emit\('add', uid\)/)
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
