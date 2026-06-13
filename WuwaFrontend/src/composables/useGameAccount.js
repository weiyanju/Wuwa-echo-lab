import { computed, ref } from 'vue'

import { listGameAccounts, updateGameAccount } from '../services/gameAccountApi.js'

export function useGameAccount() {
  const accounts = ref([])
  const loading = ref(false)
  const error = ref('')
  const defaultAccount = computed(() => accounts.value.find((account) => account.is_default) || accounts.value[0] || null)
  const workspaceLocked = computed(() => Boolean(defaultAccount.value?.workspace_locked ?? true))

  async function loadGameAccounts() {
    loading.value = true
    error.value = ''
    try {
      const data = await listGameAccounts()
      accounts.value = data.results || []
      return accounts.value
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function bindDefaultUid(uid) {
    if (!defaultAccount.value) {
      throw new Error('No default game account.')
    }
    loading.value = true
    error.value = ''
    try {
      const updated = await updateGameAccount(defaultAccount.value.id, { uid })
      accounts.value = accounts.value.map((account) => (account.id === updated.id ? updated : account))
      return updated
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    accounts,
    bindDefaultUid,
    defaultAccount,
    error,
    loadGameAccounts,
    loading,
    workspaceLocked,
  }
}

