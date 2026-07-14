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
  assert.match(source, /副词条预测/)
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

test('login view announces form errors and associates them with every credential field', async () => {
  const source = await readFile(new URL('./LoginView.vue', import.meta.url), 'utf8')

  assert.equal((source.match(/:aria-invalid="Boolean\(displayedError\)"/g) || []).length, 3)
  assert.equal((source.match(/:aria-errormessage="displayedError \? 'auth-form-error' : undefined"/g) || []).length, 3)
  assert.match(source, /<p v-if="displayedError" id="auth-form-error" class="error-text" role="alert">/)
})

test('login view keeps content visible without motion and defines a complete dark palette', async () => {
  const style = await readFile(new URL('../../styles/features/auth.css', import.meta.url), 'utf8')

  assert.match(style, /\.terminal-subtitle \{[\s\S]+opacity: 1;[\s\S]+animation:[^;]+ both;/)
  assert.match(style, /\.terminal-features-grid \{[\s\S]+opacity: 1;[\s\S]+animation:[^;]+ both;/)
  assert.match(style, /\.terminal-auth-wrapper \{ opacity: 1; \}/)
  assert.match(style, /\.terminal-auth-enter-active \{[^}]+160ms/)
  assert.match(style, /\.app-shell\.theme-dark \.terminal-home \{[\s\S]+--terminal-page: #0f1720;[\s\S]+--terminal-card: #17232d;[\s\S]+--terminal-text: #e7eef4;/)
  assert.match(style, /\.app-shell\.theme-dark \.terminal-navbar \{[^}]+background: rgba\(15, 23, 32, 0\.85\);/)
  assert.match(style, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]+\.terminal-title-caret \{ display: none; \}[\s\S]+\.terminal-auth-enter-active \{ transition: none; \}/)
})

test('login view reveals complete title graphemes before mounting the authentication card', async () => {
  const source = await readFile(new URL('./LoginView.vue', import.meta.url), 'utf8')

  assert.match(source, /import \{ useTitleAnimation \} from '\.\/useTitleAnimation\.js'/)
  assert.match(source, /const terminalTitle = '欢迎回家，漂泊者'/)
  assert.match(source, /const \{ displayedTitle: displayedTerminalTitle, isComplete: isTerminalTitleComplete \} = useTitleAnimation\(terminalTitle\)/)
  assert.match(source, /<h1 class="terminal-title" :aria-label="terminalTitle">\s*<span aria-hidden="true">\{\{ displayedTerminalTitle \}\}<\/span>\s*<span class="terminal-title-caret" aria-hidden="true"><\/span>\s*<\/h1>/)
  assert.match(source, /<Transition name="terminal-auth">\s*<div v-if="isTerminalTitleComplete" class="terminal-auth-wrapper">/)
  assert.doesNotMatch(source, /onMounted|onBeforeUnmount|matchMedia/)
})
