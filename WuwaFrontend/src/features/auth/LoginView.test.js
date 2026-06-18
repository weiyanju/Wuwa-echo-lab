import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('login view owns account form state and validation', async () => {
  const source = await readFile(new URL('./LoginView.vue', import.meta.url), 'utf8')

  assert.match(source, /const authForm = ref\(\{\s+username: localStorage\.getItem\('wuwa-login-username'\) \|\| '',\s+password: '',\s+mode: 'login'/)
  assert.match(source, /const saveLogin = ref\(localStorage\.getItem\('wuwa-save-login'\) === 'true'\)/)
  assert.match(source, /const validationError = ref\(''\)/)
  assert.match(source, /if \(!username \|\| !password\) \{\s+validationError\.value = '请填写用户名和密码。'/)
})

test('login view emits a normalized authentication command', async () => {
  const source = await readFile(new URL('./LoginView.vue', import.meta.url), 'utf8')

  assert.match(source, /const emit = defineEmits\(\['submit'\]\)/)
  assert.match(source, /emit\('submit', \{\s+username,\s+password,\s+mode: authForm\.value\.mode,\s+saveLogin: saveLogin\.value,/)
  assert.match(source, /<form class="auth-form product-panel" @submit\.prevent="submitAuth">/)
})
