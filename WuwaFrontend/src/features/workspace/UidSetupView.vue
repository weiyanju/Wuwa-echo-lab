<script setup>
import { computed, ref } from 'vue'
import moonIcon from '../../assets/icons/moon.svg'
import sunIcon from '../../assets/icons/sun.svg'
import { normalizePlayerUid } from '../../services/playerUid'

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

const emit = defineEmits(['bind', 'toggle-theme', 'sign-out'])
const uidBinding = ref('')
const validationError = ref('')
const displayedError = computed(() => validationError.value || props.error)
const disabled = computed(() => props.saving || props.loading)

function iconMask(source) {
  return { '--icon-url': `url("${source}")` }
}

function handleUidBindingInput() {
  uidBinding.value = normalizePlayerUid(uidBinding.value)
  validationError.value = ''
}

function submitUidBinding() {
  validationError.value = ''
  const uid = normalizePlayerUid(uidBinding.value)
  uidBinding.value = uid
  if (!uid) {
    validationError.value = '请填写游戏 UID。'
    return
  }
  emit('bind', uid)
}
</script>

<template>
  <section class="uid-setup-shell">
    <header class="uid-setup-topbar">
      <a class="wordmark" href="#" @click.prevent>Wuwa Echo Lab</a>
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
      <p v-if="displayedError" class="error-text">{{ displayedError }}</p>

      <section class="locked-workbench product-panel">
        <div class="section-heading">
          <h2>绑定鸣潮 UID</h2>
          <p>用于保存声骸记录和统计数据。</p>
        </div>
        <form class="uid-binding-form" @submit.prevent="submitUidBinding">
          <label>
            UID
            <input
              v-model="uidBinding"
              inputmode="numeric"
              autocomplete="off"
              placeholder="输入你的 UID"
              :disabled="disabled"
              @input="handleUidBindingInput"
            />
          </label>
          <button class="button-buy" type="submit" :disabled="disabled">
            {{ saving ? '保存中' : '保存' }}
          </button>
        </form>
      </section>
    </div>
  </section>
</template>
