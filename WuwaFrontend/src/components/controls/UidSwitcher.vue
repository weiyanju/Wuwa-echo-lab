<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import checkIcon from '../../assets/icons/check.svg'
import chevronDownIcon from '../../assets/icons/chevron-down.svg'

const MAX_UID_ACCOUNTS = 5
const UID_ERROR_MESSAGE = '请输入 9 位数字 UID。'

const props = defineProps({
  accounts: {
    type: Array,
    default: () => [],
  },
  currentAccount: {
    type: Object,
    default: null,
  },
  canAddAccount: {
    type: Boolean,
    default: true,
  },
  busy: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['select', 'add', 'sign-out'])

const root = ref(null)
const chipButton = ref(null)
const addButton = ref(null)
const addInput = ref(null)
const menuOpen = ref(false)
const adding = ref(false)
const draftUid = ref('')
const validationError = ref('')

const accounts = computed(() => props.accounts || [])
const currentUidText = computed(() => props.currentAccount?.uid || 'UID 未绑定')
const addLimitReached = computed(() => accounts.value.length >= MAX_UID_ACCOUNTS || !props.canAddAccount)
const addDisabled = computed(() => props.busy || addLimitReached.value)
const displayedError = computed(() => validationError.value || props.error)

function iconMask(source) {
  return { '--icon-url': `url("${source}")` }
}

function isValidUid(uid) {
  return /^[0-9]{9}$/.test(uid)
}

function resetAddForm() {
  adding.value = false
  draftUid.value = ''
  validationError.value = ''
}

function closeMenu({ restoreFocus = true } = {}) {
  if (!menuOpen.value) {
    return
  }
  menuOpen.value = false
  resetAddForm()
  if (restoreFocus) {
    nextTick(() => {
      chipButton.value?.focus()
    })
  }
}

function toggleMenu() {
  if (props.busy) {
    return
  }
  if (menuOpen.value) {
    closeMenu()
    return
  }
  menuOpen.value = true
}

function selectAccount(account) {
  if (props.busy || account.id === props.currentAccount?.id) {
    return
  }
  emit('select', account)
  closeMenu()
}

function startAddAccount() {
  if (addDisabled.value) {
    return
  }
  adding.value = true
  validationError.value = ''
  nextTick(() => {
    addInput.value?.focus()
  })
}

function cancelAddAccount() {
  resetAddForm()
  nextTick(() => {
    addButton.value?.focus()
  })
}

function submitAddAccount() {
  if (addDisabled.value) {
    return
  }
  const uid = String(draftUid.value ?? '')
  validationError.value = ''
  if (!isValidUid(uid)) {
    validationError.value = UID_ERROR_MESSAGE
    return
  }
  emit('add', uid)
}

function handleDocumentPointerdown(event) {
  if (!root.value?.contains(event.target)) {
    closeMenu()
  }
}

function handleKeydown(event) {
  if (event.key !== 'Escape') {
    return
  }
  closeMenu()
}

watch(
  () => props.busy,
  (busy) => {
    if (busy) {
      closeMenu({ restoreFocus: false })
    }
  },
)

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerdown)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerdown)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div ref="root" class="uid-switcher">
    <button
      ref="chipButton"
      class="uid-chip uid-chip-button"
      type="button"
      aria-haspopup="menu"
      :aria-expanded="menuOpen.toString()"
      aria-controls="uid-switcher-menu"
      :disabled="busy"
      @click="toggleMenu"
    >
      <i class="uid-status-dot" aria-hidden="true"></i>
      <span class="uid-chip-label">UID</span>
      <span class="uid-chip-value">{{ currentUidText }}</span>
      <span class="ui-line-icon uid-chip-chevron" :style="iconMask(chevronDownIcon)" aria-hidden="true"></span>
    </button>

    <Transition name="uid-menu">
      <div v-if="menuOpen" id="uid-switcher-menu" class="uid-switcher-menu" role="menu">
        <div class="uid-switcher-menu-top">
          <span>账号</span>
          <strong>{{ accounts.length }} / 5</strong>
        </div>

        <div class="uid-recent-list" aria-label="UID 账号列表">
          <button
            v-for="account in accounts"
            :key="account.id"
            type="button"
            role="menuitem"
            :class="{ current: account.id === props.currentAccount?.id }"
            :disabled="busy || account.id === props.currentAccount?.id"
            @click="selectAccount(account)"
          >
            <span>{{ account.uid || 'UID 未绑定' }}</span>
            <span
              v-if="account.id === props.currentAccount?.id"
              class="ui-line-icon uid-account-check"
              :style="iconMask(checkIcon)"
              aria-hidden="true"
            ></span>
          </button>
        </div>

        <form v-if="adding" id="uid-switcher-add-form" class="uid-switcher-field" @submit.prevent="submitAddAccount">
          <label for="uid-switcher-add-input">新增 UID</label>
          <input
            id="uid-switcher-add-input"
            ref="addInput"
            v-model="draftUid"
            inputmode="numeric"
            autocomplete="off"
            placeholder="输入 9 位 UID"
            :disabled="busy"
            :aria-invalid="Boolean(displayedError)"
            aria-describedby="uid-switcher-add-error"
          />
          <p v-if="displayedError" id="uid-switcher-add-error" class="uid-switcher-error" role="alert">{{ displayedError }}</p>
        </form>

        <div class="uid-switcher-actions" role="none">
          <button v-if="adding" class="uid-switcher-submit" type="submit" form="uid-switcher-add-form" :disabled="busy">确认添加</button>
          <button
            v-else
            ref="addButton"
            class="uid-switcher-add"
            type="button"
            :disabled="addDisabled"
            @click="startAddAccount"
          >
            {{ addLimitReached ? '已达上限' : '添加 UID' }}
          </button>

          <button v-if="adding" class="uid-switcher-cancel" type="button" @click="cancelAddAccount">取消</button>
          <button v-else class="uid-switcher-sign-out" type="button" role="menuitem" @click="emit('sign-out')">退出登录</button>
        </div>
      </div>
    </Transition>
  </div>
</template>
