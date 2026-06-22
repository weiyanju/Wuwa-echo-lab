import { computed, ref } from 'vue'

import { createGameAccount, listGameAccounts, updateGameAccount } from '../services/gameAccountApi.js'

const MAX_BOUND_ACCOUNTS = 5

export function useGameAccount() {
  const accounts = ref([])
  const selectedAccountId = ref(null)
  const loading = ref(false)
  const error = ref('')

  const boundAccounts = computed(() => accounts.value.filter((account) => !account.workspace_locked))
  const currentAccount = computed(() => (
    boundAccounts.value.find((account) => account.id === selectedAccountId.value) || null
  ))
  const defaultAccount = computed(() => accounts.value.find((account) => account.is_default) || accounts.value[0] || null)
  const workspaceLocked = computed(() => boundAccounts.value.length === 0)
  const canAddAccount = computed(() => boundAccounts.value.length < MAX_BOUND_ACCOUNTS)

  function replaceAccount(updated) {
    const nextAccounts = updated.is_default
      ? accounts.value.map((account) => ({ ...account, is_default: false }))
      : [...accounts.value]
    const index = nextAccounts.findIndex((account) => account.id === updated.id)
    if (index === -1) {
      nextAccounts.push(updated)
    } else {
      nextAccounts[index] = updated
    }
    accounts.value = nextAccounts
    selectedAccountId.value = updated.id
    return updated
  }

  async function runAccountOperation(operation) {
    loading.value = true
    error.value = ''
    try {
      return await operation()
    } catch (err) {
      error.value = err?.message || 'Game account request failed.'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadGameAccounts() {
    return runAccountOperation(async () => {
      const data = await listGameAccounts()
      accounts.value = data.results || []

      const selected = boundAccounts.value.find((account) => account.is_default)
      if (selected) {
        selectedAccountId.value = selected.id
        return accounts.value
      }

      const firstBound = boundAccounts.value[0]
      if (firstBound) {
        replaceAccount(await updateGameAccount(firstBound.id, { is_default: true }))
      } else {
        selectedAccountId.value = null
      }
      return accounts.value
    })
  }

  function findEmptyAccount() {
    return accounts.value.find((account) => account.is_default && !account.uid)
      || accounts.value.find((account) => !account.uid)
  }

  async function bindInitialUid(uid) {
    return runAccountOperation(async () => {
      const emptyAccount = findEmptyAccount()
      if (!emptyAccount) {
        throw new Error('No empty game account is available for initial UID binding.')
      }
      const updated = await updateGameAccount(emptyAccount.id, { uid, is_default: true })
      return replaceAccount(updated)
    })
  }

  async function addGameAccount(uid) {
    if (!canAddAccount.value) {
      const err = new Error('A maximum of 5 bound game accounts is allowed.')
      error.value = err.message
      throw err
    }
    if (findEmptyAccount()) {
      return bindInitialUid(uid)
    }
    return runAccountOperation(async () => {
      const created = await createGameAccount({ uid, is_default: true })
      return replaceAccount(created)
    })
  }

  async function switchGameAccount(id) {
    const target = boundAccounts.value.find((account) => account.id === id)
    if (!target) {
      const err = new Error('The selected account is not a bound game account.')
      error.value = err.message
      throw err
    }
    if (currentAccount.value?.id === id) {
      return currentAccount.value
    }
    return runAccountOperation(async () => {
      const updated = await updateGameAccount(id, { is_default: true })
      return replaceAccount(updated)
    })
  }

  return {
    accounts,
    addGameAccount,
    bindDefaultUid: bindInitialUid,
    bindInitialUid,
    boundAccounts,
    canAddAccount,
    currentAccount,
    defaultAccount,
    error,
    loadGameAccounts,
    loading,
    selectedAccountId,
    switchGameAccount,
    workspaceLocked,
  }
}
