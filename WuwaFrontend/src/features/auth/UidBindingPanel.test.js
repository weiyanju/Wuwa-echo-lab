import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readPanel() {
  return readFile(new URL('./UidBindingPanel.vue', import.meta.url), 'utf8')
}

test('uid binding panel validates normalized input before emitting bind', async () => {
  const source = await readPanel()

  assert.match(source, /import \{ validateUidBinding \} from '\.\/uidBinding\.js'/)
  assert.match(source, /uidBinding\.value = normalizePlayerUid\(uidBinding\.value\)/)
  assert.match(source, /const \{ uid, error \} = validateUidBinding\(uidBinding\.value\)/)
  assert.match(source, /if \(error\) \{\s+validationError\.value = error\s+return\s+\}\s+emit\('bind', uid\)/)
})

test('uid binding panel exposes an in-card sign-out return action', async () => {
  const source = await readPanel()

  assert.match(source, /aria-label="退出当前账号并返回登录"/)
  assert.match(source, /title="退出当前账号并返回登录"/)
  assert.match(source, /@click="emit\('cancel'\)"/)
  assert.match(source, /<h2>绑定游戏 UID<\/h2>/)
  assert.doesNotMatch(source, /uid-setup-shell|uid-setup-topbar|disabled-tabs/)
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
