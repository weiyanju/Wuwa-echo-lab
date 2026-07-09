<script setup>
import { computed, ref } from 'vue'
import moonIcon from '../../assets/icons/moon.svg'
import sunIcon from '../../assets/icons/sun.svg'
import { normalizePlayerUid } from '../../services/playerUid'
import { validateUidBinding } from './uidSetup.js'

const props = defineProps({
  boundUid: {
    type: String,
    default: '',
  },
  saving: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
  isDarkTheme: {
    type: Boolean,
    default: false,
  },
  themeToggleLabel: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['bind', 'clear-error', 'toggle-theme', 'sign-out'])
const uidBinding = ref('')
const validationError = ref('')
const displayedError = computed(() => validationError.value || props.error)
const disabled = computed(() => props.saving || props.loading)
const inputDescription = computed(() => (displayedError.value ? 'uid-binding-error uid-binding-hint' : 'uid-binding-hint'))

function iconMask(source) {
  return { '--icon-url': `url("${source}")` }
}

function handleUidBindingInput() {
  uidBinding.value = normalizePlayerUid(uidBinding.value)
  validationError.value = ''
  emit('clear-error')
}

function submitUidBinding() {
  validationError.value = ''
  const { uid, error } = validateUidBinding(uidBinding.value)
  uidBinding.value = uid
  if (error) {
    validationError.value = error
    return
  }
  emit('bind', uid)
}
</script>

<template>
  <section class="uid-setup-shell">
    <header class="uid-setup-topbar">
      <a class="wordmark" href="#" @click.prevent>Tethys System</a>
      <nav class="pill-tabs disabled-tabs" aria-label="页面">
        <button class="active" type="button" disabled>工作台</button>
        <button type="button" disabled>统计</button>
        <button type="button" disabled>评估</button>
      </nav>
      <div class="account-actions uid-switcher">
        <div class="uid-chip">
          <i class="uid-status-dot" aria-hidden="true"></i>
          <span class="uid-chip-label">UID</span>
          <span class="uid-chip-value">{{ boundUid || '未绑定' }}</span>
        </div>
        <button
          class="theme-toggle-button"
          type="button"
          :aria-pressed="isDarkTheme"
          :aria-label="themeToggleLabel"
          :title="themeToggleLabel"
          @click="emit('toggle-theme')"
        >
          <span class="ui-line-icon theme-toggle-icon" :style="iconMask(isDarkTheme ? sunIcon : moonIcon)" aria-hidden="true"></span>
        </button>
        <button class="button-ghost" type="button" @click="emit('sign-out')">退出</button>
      </div>
    </header>

    <div class="uid-setup-content">
      <section class="uid-setup-card">
        <div class="uid-setup-media" aria-hidden="true">
          <span class="uid-media-orbit"></span>
          <span class="uid-media-core"></span>
          <span class="uid-media-dot"></span>
        </div>
        <form class="uid-binding-form" @submit.prevent="submitUidBinding">
          <div class="uid-binding-copy">
            <h1>绑定游戏 UID</h1>
            <p>绑定后即可进入工作台。</p>
          </div>
          <label class="uid-binding-field" for="uid-binding-input">
            UID
            <input
              id="uid-binding-input"
              v-model="uidBinding"
              inputmode="numeric"
              autocomplete="off"
              placeholder="输入你的 UID"
              :disabled="disabled"
              :aria-invalid="Boolean(displayedError)"
              aria-errormessage="uid-binding-error"
              :aria-describedby="inputDescription"
              @input="handleUidBindingInput"
            />
          </label>
          <p v-if="displayedError" id="uid-binding-error" class="error-text" role="alert">{{ displayedError }}</p>
          <button class="button-buy" type="submit" :disabled="disabled">
            {{ saving ? '绑定中' : '绑定并进入' }}
          </button>
          <p id="uid-binding-hint" class="uid-binding-hint">可在游戏个人信息页查看 UID</p>
        </form>
      </section>
    </div>
  </section>
</template>
