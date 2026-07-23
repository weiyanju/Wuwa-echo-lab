<script setup>
import { computed, ref } from 'vue'

import UidBindingPanel from './UidBindingPanel.vue'
import { useTitleAnimation } from './useTitleAnimation.js'
const props = defineProps({
  error: { type: String, default: '' },
  uidBusy: { type: Boolean, default: false },
  view: {
    type: String,
    default: 'auth',
    validator: (value) => ['auth', 'uid'].includes(value),
  },
})

const emit = defineEmits(['submit', 'bind', 'clear-error', 'sign-out'])

const terminalTitle = '欢迎回家，漂泊者'
const { displayedTitle: displayedTerminalTitle, phase: terminalTitlePhase, indicatorState: terminalTitleIndicator, isAuthReady: isTerminalAuthReady } = useTitleAnimation(terminalTitle)
const showsTerminalTitleIndicator = computed(() => ['typing', 'punctuation', 'resolving'].includes(terminalTitlePhase.value))

const terminalFeatures = [
  { title: '历史调谐记录', path: 'M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2-6h6m2 8h6' },
  { title: '本地截图识别', path: 'M6 3H3v3m15-3h3v3M6 21H3v-3m15 3h3v-3M3 12h18' },
  { title: '多账号独立管理', path: 'M4 6a8 3 0 1016 0A8 3 0 104 6zm0 0v12a8 3 0 1016 0V6' },
  { title: '副词条预测', path: 'M3 21h18M3 21V3m4 12l4-4 4 4 5-9' },
]
const authTabs = [
  { mode: 'login', label: '终端登录' },
  { mode: 'register', label: '创建档案' },
]
const authForm = ref({
  username: localStorage.getItem('wuwa-login-username') || '',
  password: '',
  mode: 'login',
})
const confirmPassword = ref('')
const saveLogin = ref(localStorage.getItem('wuwa-save-login') === 'true')
const validationError = ref('')
const displayedError = computed(() => validationError.value || props.error)
const isRegister = computed(() => authForm.value.mode === 'register')
const authModeIndex = computed(() => (isRegister.value ? 1 : 0))
const cardTransitionName = computed(() => (props.view === 'uid' ? 'terminal-card-forward' : 'terminal-card-back'))

function selectAuthMode(mode) {
  authForm.value.mode = mode
  validationError.value = ''
}

function submitAuth() {
  validationError.value = ''
  const username = authForm.value.username.trim()
  const password = authForm.value.password
  if (!username || !password) {
    validationError.value = '请填写用户名和密码。'
    return
  }
  if (isRegister.value && password !== confirmPassword.value) {
    validationError.value = '两次输入的访问密钥不一致。'
    return
  }
  emit('submit', {
    username,
    password,
    mode: authForm.value.mode,
    saveLogin: saveLogin.value,
  })
}
</script>

<template>
  <section class="terminal-home">
    <nav class="terminal-navbar">
      <div class="terminal-brand">
        <img class="terminal-brand-icon" src="/tethys-mark.svg" alt="" aria-hidden="true" />
        <span class="terminal-brand-wordmark">TETHYS</span>
      </div>
      <div class="terminal-system-status"><span></span>SYSTEM.ONLINE</div>
    </nav>

    <main class="terminal-main-wrapper">
      <div class="terminal-container">
        <div class="terminal-hero-content">
          <span class="terminal-subtitle">ECHO ANALYSIS PROTOCOL</span>
          <div class="terminal-title-wrapper">
            <h1 class="terminal-title" :aria-label="terminalTitle">
              <span aria-hidden="true">{{ displayedTerminalTitle }}</span>
              <span v-if="showsTerminalTitleIndicator" class="terminal-title-indicator" :class="`terminal-title-indicator--${terminalTitleIndicator}`" aria-hidden="true"></span>
            </h1>
          </div>
          <div class="terminal-features-grid">
            <div v-for="feature in terminalFeatures" :key="feature.title" class="terminal-feature-item">
              <div class="terminal-feature-icon"><svg viewBox="0 0 24 24"><path :d="feature.path" /></svg></div>
              <div class="terminal-feature-text"><h4>{{ feature.title }}</h4></div>
            </div>
          </div>
        </div>

        <Transition name="terminal-auth">
          <div v-if="isTerminalAuthReady" class="terminal-auth-wrapper">
            <div class="terminal-auth-card">
              <Transition :name="cardTransitionName" mode="out-in">
                <div v-if="view === 'auth'" key="auth" class="terminal-card-page terminal-credentials-page">
                  <div class="terminal-auth-tabs">
                    <button v-for="tab in authTabs" :key="tab.mode" class="terminal-tab-btn" :class="{ active: authForm.mode === tab.mode }" type="button" @click="selectAuthMode(tab.mode)">{{ tab.label }}</button>
                    <div class="terminal-tab-indicator" :style="{ transform: `translateX(${authModeIndex * 100}%)` }"></div>
                  </div>

                  <form class="terminal-form-view" @submit.prevent="submitAuth">
                    <label class="terminal-input-group">
                      {{ isRegister ? '新建操作员账号' : '操作员账号' }}
                      <input v-model="authForm.username" class="terminal-standard-input" autocomplete="username" placeholder="请输入账号" :aria-invalid="Boolean(displayedError)" :aria-errormessage="displayedError ? 'auth-form-error' : undefined" />
                    </label>
                    <label class="terminal-input-group">
                      {{ isRegister ? '设置访问密钥' : '访问密钥' }}
                      <input v-model="authForm.password" class="terminal-standard-input" type="password" :autocomplete="isRegister ? 'new-password' : 'current-password'" placeholder="••••••••" :aria-invalid="Boolean(displayedError)" :aria-errormessage="displayedError ? 'auth-form-error' : undefined" />
                    </label>
                    <label v-if="isRegister" class="terminal-input-group">
                      确认访问密钥
                      <input v-model="confirmPassword" class="terminal-standard-input" type="password" autocomplete="new-password" placeholder="再次输入密钥" :aria-invalid="Boolean(displayedError)" :aria-errormessage="displayedError ? 'auth-form-error' : undefined" />
                    </label>
                    <label v-else class="terminal-form-options"><input v-model="saveLogin" type="checkbox" /> 保持连接状态</label>
                    <p v-if="displayedError" id="auth-form-error" class="error-text" role="alert">{{ displayedError }}</p>
                    <button class="terminal-primary-btn" type="submit">{{ isRegister ? 'INIT_REGISTER()' : 'EXECUTE_LOGIN()' }}</button>
                  </form>
                </div>
                <UidBindingPanel
                  v-else
                  key="uid"
                  :busy="uidBusy"
                  :error="error"
                  @bind="emit('bind', $event)"
                  @clear-error="emit('clear-error')"
                  @cancel="emit('sign-out')"
                />
              </Transition>
            </div>
          </div>
        </Transition>
      </div>
    </main>
  </section>
</template>
