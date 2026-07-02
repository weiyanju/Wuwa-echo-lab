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
  assert.match(source, /<form class="terminal-form-view" @submit\.prevent="submitAuth">/)
})

test('login view recreates the terminal homepage design', async () => {
  const source = await readFile(new URL('./LoginView.vue', import.meta.url), 'utf8')

  assert.match(source, /class="terminal-home"/)
  assert.match(source, /class="terminal-navbar"/)
  assert.match(source, /SYSTEM\.ONLINE/)
  assert.match(source, /ECHO ANALYSIS PROTOCOL/)
  assert.match(source, /欢迎回家，漂泊者/)
  assert.match(source, /v-for="feature in terminalFeatures"/)
  assert.match(source, /历史调谐记录/)
  assert.match(source, /本地截图识别/)
  assert.match(source, /多账号独立管理/)
  assert.match(source, /副词条预测面板/)
})

test('login view presents login and register as terminal tabs', async () => {
  const source = await readFile(new URL('./LoginView.vue', import.meta.url), 'utf8')

  assert.match(source, /const authModeIndex = computed/)
  assert.match(source, /const confirmPassword = ref\(''\)/)
  assert.match(source, /authForm\.value\.mode = mode/)
  assert.match(source, /validationError\.value = '两次输入的访问密钥不一致。'/)
  assert.match(source, /终端登录/)
  assert.match(source, /创建档案/)
  assert.match(source, /:style="\{ transform: `translateX\(\$\{authModeIndex \* 100\}%\)` \}"/)
  assert.match(source, /EXECUTE_LOGIN\(\)/)
  assert.match(source, /INIT_REGISTER\(\)/)
})
