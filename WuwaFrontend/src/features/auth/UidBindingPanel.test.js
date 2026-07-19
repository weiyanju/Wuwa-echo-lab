import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readPanel() {
  return readFile(new URL('./UidBindingPanel.vue', import.meta.url), 'utf8')
}

async function readAuthStyles() {
  return readFile(new URL('../../styles/features/auth.css', import.meta.url), 'utf8')
}

test('uid binding panel validates normalized input before emitting bind', async () => {
  const source = await readPanel()

  assert.match(source, /import \{ validateUidBinding \} from '\.\/uidBinding\.js'/)
  assert.match(source, /uidBinding\.value = normalizePlayerUid\(uidBinding\.value\)/)
  assert.match(source, /const \{ uid, error \} = validateUidBinding\(uidBinding\.value\)/)
  assert.match(source, /if \(error\) \{\s+validationError\.value = error\s+return\s+\}\s+emit\('bind', uid\)/)
})

test('uid binding panel uses one non-interactive full-width heading above the form', async () => {
  const source = await readPanel()
  const header = source.match(/<header class="terminal-uid-header">[\s\S]*?<\/header>/)?.[0] ?? ''

  assert.match(source, /class="terminal-uid-actions"/)
  assert.match(source, /class="terminal-uid-return"/)
  assert.match(source, /aria-label="退出当前账号并返回登录"/)
  assert.match(source, /title="退出当前账号并返回登录"/)
  assert.match(source, /@click="emit\('cancel'\)"/)
  assert.match(source, />\s*返回登录\s*<\/button>/)
  assert.match(header, /<h2>绑定 UID<\/h2>/)
  assert.doesNotMatch(header, /<button|role="tab"|terminal-tab/)
  assert.match(source, /<\/header>\s*<p class="terminal-uid-intro">首次进入需要绑定一个游戏账号。<\/p>/)
  assert.doesNotMatch(source, /绑定游戏 UID|terminal-uid-title/)
  assert.doesNotMatch(source, /terminal-uid-back|<svg/)
  assert.doesNotMatch(source, /uid-setup-shell|uid-setup-topbar|disabled-tabs/)
})

test('uid binding heading reuses authentication tab typography and spacing tokens', async () => {
  const styles = await readAuthStyles()
  const headerRule = styles.match(/\.terminal-uid-header\s*\{[\s\S]*?\}/)?.[0] ?? ''
  const titleRule = styles.match(/\.terminal-uid-header h2\s*\{[\s\S]*?\}/)?.[0] ?? ''

  assert.match(headerRule, /border-bottom: 1px solid var\(--terminal-text\)/)
  assert.match(headerRule, /margin-bottom: clamp\(24px, 2vw, 32px\)/)
  assert.match(titleRule, /padding: 0 0 12px/)
  assert.match(titleRule, /font-size: var\(--text-control\)/)
  assert.match(titleRule, /font-weight: var\(--weight-control\)/)
  assert.match(titleRule, /line-height: var\(--leading-control\)/)
  assert.match(titleRule, /letter-spacing: var\(--tracking-cjk\)/)
  assert.doesNotMatch(styles, /\.terminal-uid-title/)
})

test('uid binding panel associates errors and hints and focuses the uid input', async () => {
  const source = await readPanel()

  assert.match(source, /const uidInput = ref\(null\)/)
  assert.match(source, /onMounted\(\(\) => uidInput\.value\?\.focus\(\)\)/)
  assert.match(source, /ref="uidInput"/)
  assert.match(source, /aria-errormessage="uid-binding-error"/)
  assert.match(source, /:aria-describedby="inputDescription"/)
  assert.match(source, /id="uid-binding-error"[^>]*role="alert"/)
  assert.match(source, /id="uid-binding-hint"/)
})

test('uid binding panel disables every command while busy', async () => {
  const source = await readPanel()

  assert.equal((source.match(/:disabled="busy"/g) || []).length, 3)
  assert.match(source, /\{\{ busy \? 'BINDING\(\)' : 'BIND_AND_ENTER\(\)' \}\}/)
})
