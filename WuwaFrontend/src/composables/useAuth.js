import { computed, ref } from 'vue'

import { getMe, login, logout, register } from '../services/authApi.js'

export function useAuth() {
  const user = ref(null)
  const loading = ref(false)
  const error = ref('')
  const isAuthenticated = computed(() => Boolean(user.value))

  async function loadMe() {
    loading.value = true
    error.value = ''
    try {
      user.value = await getMe()
      return user.value
    } catch (err) {
      user.value = null
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function signIn(payload) {
    loading.value = true
    error.value = ''
    try {
      await login(payload)
      user.value = await getMe()
      return user.value
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function signUp(payload) {
    loading.value = true
    error.value = ''
    try {
      await register(payload)
      user.value = await getMe()
      return user.value
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    loading.value = true
    error.value = ''
    try {
      await logout()
      user.value = null
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    error,
    isAuthenticated,
    loading,
    loadMe,
    signIn,
    signOut,
    signUp,
    user,
  }
}
