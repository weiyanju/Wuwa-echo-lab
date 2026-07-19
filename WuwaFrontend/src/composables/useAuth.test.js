import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test, { after, beforeEach } from 'node:test'

const originalDocument = globalThis.document
const originalFetch = globalThis.fetch

globalThis.document = {
  cookie: 'csrftoken=test-token',
  createElement() {
    return {}
  },
}

const calls = []
const responses = []
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url, options })
  if (responses.length === 0) {
    throw new Error(`Unexpected fetch without a queued response: ${url}`)
  }
  const queuedResponse = responses.shift()
  const response = await (typeof queuedResponse === 'function'
    ? queuedResponse(url, options)
    : queuedResponse)
  if (response instanceof Error) throw response
  return {
    ok: response?.ok ?? true,
    status: response?.status ?? 200,
    async json() {
      return response?.body ?? response
    },
  }
}

const { useAuth } = await import('./useAuth.js')
const { useGameAccount } = await import('./useGameAccount.js')

function queue(...bodies) {
  responses.push(...bodies)
}

beforeEach(() => {
  calls.length = 0
  responses.length = 0
})

after(() => {
  if (originalDocument === undefined) {
    delete globalThis.document
  } else {
    globalThis.document = originalDocument
  }
  if (originalFetch === undefined) {
    delete globalThis.fetch
  } else {
    globalThis.fetch = originalFetch
  }
})

test('auth composable owns login lifecycle state', async () => {
  await access(new URL('./useAuth.js', import.meta.url))
  const source = await readFile(new URL('./useAuth.js', import.meta.url), 'utf8')
  const signUpSource = source.match(/async function signUp\(payload\) \{([\s\S]*?)\n  \}/)?.[1] || ''

  assert.match(source, /export function useAuth\(\)/)
  assert.match(source, /const user = ref\(null\)/)
  assert.match(source, /const isAuthenticated = computed/)
  assert.match(source, /async function loadMe\(\)/)
  assert.match(source, /async function signIn\(payload\)/)
  assert.match(source, /async function signUp\(payload\)/)
  assert.match(source, /async function signOut\(\)/)
  assert.match(source, /from '\.\.\/services\/authApi\.js'/)
  assert.match(source, /async function signIn\(payload\) \{[\s\S]*?await login\(payload\)[\s\S]*?user\.value = await getMe\(\)[\s\S]*?finally \{[\s\S]*?loading\.value = false/)
  assert.match(source, /async function signOut\(\) \{[\s\S]*?await logout\(\)[\s\S]*?user\.value = null[\s\S]*?finally \{[\s\S]*?loading\.value = false/)
  assert.match(signUpSource, /await register\(payload\)[\s\S]*?user\.value = await getMe\(\)/)
  assert.doesNotMatch(signUpSource, /await login\(payload\)/)
})

test('signUp consumes the backend registration session without a second login', async () => {
  queue(
    { registration_outcome: 'resumed' },
    { id: 7, username: 'unfinished' },
  )
  const state = useAuth()

  const user = await state.signUp({ username: 'unfinished', password: 'pw12345' })

  assert.deepEqual(user, { id: 7, username: 'unfinished' })
  assert.deepEqual(calls.map((call) => call.url), [
    '/api/auth/register/',
    '/api/me/',
  ])
  assert.equal(state.user.value.id, 7)
  assert.equal(state.loading.value, false)
})

test('resumed registration keeps the existing game-account lock routing', async () => {
  queue(
    { registration_outcome: 'resumed' },
    { id: 7, username: 'unfinished' },
    {
      results: [{
        id: 11,
        uid: '',
        is_default: true,
        workspace_locked: true,
      }],
    },
  )
  const auth = useAuth()
  const gameAccount = useGameAccount()

  await auth.signUp({ username: 'unfinished', password: 'pw12345' })
  await gameAccount.loadGameAccounts()

  assert.deepEqual(calls.map((call) => call.url), [
    '/api/auth/register/',
    '/api/me/',
    '/api/game-accounts/',
  ])
  assert.equal(auth.isAuthenticated.value, true)
  assert.deepEqual(gameAccount.accounts.value, [{
    id: 11,
    uid: '',
    is_default: true,
    workspace_locked: true,
  }])
  assert.equal(gameAccount.workspaceLocked.value, true)
  assert.equal(gameAccount.currentAccount.value, null)
})
