import assert from 'node:assert/strict'
import test from 'node:test'

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
  const response = responses.shift()
  if (response instanceof Error) throw response
  return {
    ok: response?.ok ?? true,
    status: response?.status ?? 200,
    async json() {
      return response?.body ?? response
    },
  }
}

const { useGameAccount } = await import('./useGameAccount.js')

function queue(...bodies) {
  calls.length = 0
  responses.push(...bodies)
}

function account(id, uid, options = {}) {
  return {
    id,
    uid,
    is_default: false,
    workspace_locked: !uid,
    ...options,
  }
}

test('selects the first bound account and persists it when default is empty', async () => {
  const empty = account(1, '', { is_default: true })
  const bound = account(2, '123456789')
  queue({ results: [empty, bound] }, { ...bound, is_default: true })
  const state = useGameAccount()

  await state.loadGameAccounts()

  assert.equal(state.currentAccount.value.id, 2)
  assert.equal(state.workspaceLocked.value, false)
  assert.equal(calls[1].url, '/api/game-accounts/2/')
  assert.equal(calls[1].options.method, 'PATCH')
  assert.equal(calls[1].options.body, JSON.stringify({ is_default: true }))
})

test('locks the workspace when no bound account exists', async () => {
  queue({ results: [account(1, '', { is_default: true })] })
  const state = useGameAccount()

  await state.loadGameAccounts()

  assert.equal(state.currentAccount.value, null)
  assert.equal(state.workspaceLocked.value, true)
})

test('initial binding reuses the preferred empty account and makes it current', async () => {
  const empty = account(1, '', { is_default: true })
  const updated = account(1, '123456789', { is_default: true, workspace_locked: false })
  queue({ results: [empty] }, updated)
  const state = useGameAccount()
  await state.loadGameAccounts()

  await state.bindInitialUid('123456789')

  assert.equal(calls[1].options.body, JSON.stringify({ uid: '123456789', is_default: true }))
  assert.equal(state.currentAccount.value.uid, '123456789')
})

test('adds a new default account with POST and selects it', async () => {
  const first = account(1, '123456789', { is_default: true })
  const created = account(2, '987654321', { is_default: true })
  queue({ results: [first] }, created)
  const state = useGameAccount()
  await state.loadGameAccounts()

  await state.addGameAccount('987654321')

  assert.equal(calls[1].url, '/api/game-accounts/')
  assert.equal(calls[1].options.method, 'POST')
  assert.equal(calls[1].options.body, JSON.stringify({ uid: '987654321', is_default: true }))
  assert.equal(state.currentAccount.value.id, 2)
  assert.deepEqual(state.accounts.value.map((item) => item.is_default), [false, true])
})

test('refuses a sixth bound account without making a request', async () => {
  const five = Array.from({ length: 5 }, (_, index) => account(index + 1, `12345678${index}`, { is_default: index === 0 }))
  queue({ results: five })
  const state = useGameAccount()
  await state.loadGameAccounts()
  const callCount = calls.length

  await assert.rejects(state.addGameAccount('987654321'), /maximum of 5/i)

  assert.equal(state.canAddAccount.value, false)
  assert.equal(calls.length, callCount)
})

test('switches only to a bound listed account and clears other defaults', async () => {
  const first = account(1, '123456789', { is_default: true })
  const second = account(2, '987654321')
  queue({ results: [first, second] }, { ...second, is_default: true })
  const state = useGameAccount()
  await state.loadGameAccounts()

  await state.switchGameAccount(2)

  assert.equal(calls[1].options.body, JSON.stringify({ is_default: true }))
  assert.equal(state.selectedAccountId.value, 2)
  assert.deepEqual(state.accounts.value.map((item) => item.is_default), [false, true])
  const callCount = calls.length
  await assert.rejects(state.switchGameAccount(999), /bound game account/i)
  assert.equal(calls.length, callCount)
})
