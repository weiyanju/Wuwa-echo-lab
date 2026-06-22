import { computed, ref } from 'vue'

import { createGameAccount, listGameAccounts, updateGameAccount } from '../services/gameAccountApi.js'

const MAX_BOUND_ACCOUNTS = 5

export function useGameAccount() {
  const accounts = ref([])
  const selectedAccountId = ref(null)
  const pendingOperations = ref(0)
  const error = ref('')
  let operationGeneration = 0
  let operationQueue = Promise.resolve()

  const boundAccounts = computed(() => accounts.value.filter((account) => !account.workspace_locked))
  const currentAccount = computed(() => (
    boundAccounts.value.find((account) => account.id === selectedAccountId.value) || null
  ))
  const defaultAccount = computed(() => (
    currentAccount.value || accounts.value.find((account) => account.is_default) || accounts.value[0] || null
  ))
  const workspaceLocked = computed(() => boundAccounts.value.length === 0)
  const canAddAccount = computed(() => boundAccounts.value.length < MAX_BOUND_ACCOUNTS)
  const loading = computed(() => pendingOperations.value > 0)

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

  function beginOperation() {
    operationGeneration += 1
    error.value = ''
    return operationGeneration
  }

  function enqueueAccountOperation(generation, operation) {
    pendingOperations.value += 1
    const result = operationQueue.then(operation)
    operationQueue = result.catch(() => undefined)
    return result
      .catch((err) => {
        if (generation === operationGeneration) {
          error.value = err?.message || '游戏账号请求失败。'
        }
        throw err
      })
      .finally(() => {
        pendingOperations.value -= 1
      })
  }

  async function loadGameAccounts() {
    const generation = beginOperation()
    return enqueueAccountOperation(generation, async () => {
      const data = await listGameAccounts()
      accounts.value = data.results || []

      const selected = boundAccounts.value.find((account) => account.is_default)
      if (selected) {
        selectedAccountId.value = selected.id
        return accounts.value
      }

      const firstBound = boundAccounts.value[0]
      if (firstBound) {
        selectedAccountId.value = firstBound.id
        const updated = await updateGameAccount(firstBound.id, { is_default: true })
        replaceAccount(updated)
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
    const generation = beginOperation()
    return enqueueAccountOperation(generation, async () => {
      const emptyAccount = findEmptyAccount()
      if (!emptyAccount) {
        throw new Error('没有可用的空账号可绑定 UID。')
      }
      const updated = await updateGameAccount(emptyAccount.id, { uid, is_default: true })
      return replaceAccount(updated)
    })
  }

  async function addGameAccount(uid) {
    const generation = beginOperation()
    return enqueueAccountOperation(generation, async () => {
      if (!canAddAccount.value) {
        throw new Error('最多只能绑定 5 个游戏账号。')
      }
      if (findEmptyAccount()) {
        const emptyAccount = findEmptyAccount()
        const updated = await updateGameAccount(emptyAccount.id, { uid, is_default: true })
        return replaceAccount(updated)
      }
      const created = await createGameAccount({ uid, is_default: true })
      return replaceAccount(created)
    })
  }

  async function switchGameAccount(id) {
    const generation = beginOperation()
    return enqueueAccountOperation(generation, async () => {
      const target = boundAccounts.value.find((account) => account.id === id)
      if (!target) {
        throw new Error('所选账号不存在或尚未绑定。')
      }
      if (currentAccount.value?.id === id && target.is_default) {
        return currentAccount.value
      }
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
