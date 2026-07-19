<script setup>
import { computed, onMounted, ref } from 'vue'

import { normalizePlayerUid } from '../../services/playerUid.js'
import { validateUidBinding } from './uidBinding.js'

const props = defineProps({
  busy: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['bind', 'clear-error', 'cancel'])
const uidBinding = ref('')
const uidInput = ref(null)
const validationError = ref('')
const displayedError = computed(() => validationError.value || props.error)
const inputDescription = computed(() => (
  displayedError.value ? 'uid-binding-error uid-binding-hint' : 'uid-binding-hint'
))

onMounted(() => uidInput.value?.focus())

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
  <form class="terminal-card-page terminal-uid-page" @submit.prevent="submitUidBinding">
    <header class="terminal-uid-header">
      <div class="terminal-uid-title">
        <h2>绑定游戏 UID</h2>
        <p>首次进入需要绑定一个游戏账号。</p>
      </div>
    </header>

    <label class="terminal-input-group terminal-uid-field" for="uid-binding-input">
      游戏 UID
      <input
        id="uid-binding-input"
        ref="uidInput"
        v-model="uidBinding"
        class="terminal-standard-input terminal-uid-input"
        inputmode="numeric"
        autocomplete="off"
        placeholder="输入你的 UID"
        :disabled="busy"
        :aria-invalid="Boolean(displayedError)"
        aria-errormessage="uid-binding-error"
        :aria-describedby="inputDescription"
        @input="handleUidBindingInput"
      />
    </label>
    <p v-if="displayedError" id="uid-binding-error" class="error-text" role="alert">{{ displayedError }}</p>
    <p id="uid-binding-hint" class="terminal-uid-hint">可在游戏个人信息页查看 UID</p>

    <div class="terminal-uid-actions">
      <button class="terminal-primary-btn" type="submit" :disabled="busy">
        {{ busy ? 'BINDING()' : 'BIND_AND_ENTER()' }}
      </button>
      <button
        class="terminal-uid-return"
        type="button"
        aria-label="退出当前账号并返回登录"
        title="退出当前账号并返回登录"
        :disabled="busy"
        @click="emit('cancel')"
      >
        返回登录
      </button>
    </div>
  </form>
</template>
