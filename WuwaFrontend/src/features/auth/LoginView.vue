<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  error: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['submit'])

const authForm = ref({
  username: localStorage.getItem('wuwa-login-username') || '',
  password: '',
  mode: 'login',
})
const saveLogin = ref(localStorage.getItem('wuwa-save-login') === 'true')
const validationError = ref('')
const displayedError = computed(() => validationError.value || props.error)

function submitAuth() {
  validationError.value = ''
  const username = authForm.value.username.trim()
  const password = authForm.value.password
  if (!username || !password) {
    validationError.value = '请填写用户名和密码。'
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
  <section class="auth-shell auth-shell-home">
    <div class="auth-hero">
      <div class="auth-copy">
        <span class="brand-mark">Wuwa Echo Lab</span>
        <h1>鸣潮声骸实验室</h1>
      </div>
      <div class="showcase-card login-info-card" aria-label="工具说明">
        <div>
          <span class="eyebrow">Echo tracker</span>
          <h2>声骸记录</h2>
          <p>记录套装、COST、主词条、副词条类型与数值档位，持续沉淀样本。</p>
        </div>
        <div class="login-info-grid">
          <div><strong>点击录入</strong><span>套装和档位都用按钮选择，减少手输。</span></div>
          <div><strong>概率排名</strong><span>输出候选副词条概率、基线偏离和依据。</span></div>
          <div><strong>谨慎判断</strong><span>套装、顺序、时间等变量只在样本足够时参与判断。</span></div>
        </div>
      </div>
    </div>

    <form class="auth-form product-panel" @submit.prevent="submitAuth">
      <label>
        用户名
        <input v-model="authForm.username" autocomplete="username" />
      </label>
      <label>
        密码
        <input v-model="authForm.password" type="password" autocomplete="current-password" />
      </label>
      <label class="checkbox-row save-login-row">
        <input v-model="saveLogin" type="checkbox" />
        记住用户名
      </label>
      <p v-if="displayedError" class="error-text">{{ displayedError }}</p>
      <div class="auth-mode-actions">
        <button :class="{ active: authForm.mode === 'login' }" type="button" @click="authForm.mode = 'login'">登录</button>
        <button :class="{ active: authForm.mode === 'register' }" type="button" @click="authForm.mode = 'register'">注册</button>
      </div>
      <button class="button-buy" type="submit">{{ authForm.mode === 'register' ? '创建账号并进入' : '进入研究台' }}</button>
    </form>
  </section>
</template>
