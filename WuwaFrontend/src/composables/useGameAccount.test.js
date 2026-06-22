import assert from 'node:assert/strict'
import test, { beforeEach } from 'node:test'

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
  const response = await responses.shift()
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
  responses.push(...bodies)
}

beforeEach(() => {
  calls.length = 0
  responses.length = 0
})

function deferred() {
  let resolve
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
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

test('keeps the fallback bound account selected when persisting its default fails', async () => {
  const empty = account(1, '', { is_default: true })
  const bound = account(2, '123456789')
  queue(
    { results: [empty, bound] },
    { ok: false, status: 500, body: { error: '默认账号保存失败' } },
  )
  const state = useGameAccount()

  await assert.rejects(state.loadGameAccounts(), /默认账号保存失败/)

  assert.equal(state.currentAccount.value.id, 2)
  assert.equal(state.defaultAccount.value.id, 2)
  assert.equal(state.workspaceLocked.value, false)
  assert.equal(state.error.value, '默认账号保存失败')
})

test('locks the workspace when no bound account exists', async () => {
  queue({ results: [account(1, '', { is_default: true })] })
  const state = useGameAccount()

  await state.loadGameAccounts()

  assert.equal(state.currentAccount.value, null)
  assert.equal(state.workspaceLocked.value, true)
})

test('keeps loading true while a request is pending and resets it afterward', async () => {
  const response = deferred()
  queue(response.promise)
  const state = useGameAccount()

  const request = state.loadGameAccounts()
  assert.equal(state.loading.value, true)

  response.resolve({ results: [] })
  await request
  assert.equal(state.loading.value, false)
})

test('exposes a backend error and resets loading after rejection', async () => {
  queue({ ok: false, status: 400, body: { error: 'UID 已绑定' } })
  const state = useGameAccount()

  await assert.rejects(state.loadGameAccounts(), /UID 已绑定/)

  assert.equal(state.error.value, 'UID 已绑定')
  assert.equal(state.loading.value, false)
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

  await assert.rejects(state.addGameAccount('987654321'), /最多只能绑定 5 个/)

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
  await assert.rejects(state.switchGameAccount(999), /不存在或尚未绑定/)
  assert.equal(calls.length, callCount)
})

test('keeps the newest switch when overlapping responses finish out of order', async () => {
  const first = account(1, '123456789', { is_default: true })
  const second = account(2, '223456789')
  const third = account(3, '323456789')
  queue({ results: [first, second, third] })
  const state = useGameAccount()
  await state.loadGameAccounts()

  const olderResponse = deferred()
  const newerResponse = deferred()
  queue(olderResponse.promise, newerResponse.promise)
  const olderSwitch = state.switchGameAccount(2)
  const newerSwitch = state.switchGameAccount(3)
  assert.equal(state.loading.value, true)

  newerResponse.resolve({ ...third, is_default: true })
  await newerSwitch
  assert.equal(state.currentAccount.value.id, 3)
  assert.equal(state.loading.value, true)

  olderResponse.resolve({ ...second, is_default: true })
  await olderSwitch
  assert.equal(state.currentAccount.value.id, 3)
  assert.deepEqual(state.accounts.value.map((item) => item.is_default), [false, false, true])
  assert.equal(state.loading.value, false)
})

test('does not let an older load overwrite a newer account mutation', async () => {
  const first = account(1, '123456789', { is_default: true })
  const second = account(2, '223456789')
  queue({ results: [first, second] })
  const state = useGameAccount()
  await state.loadGameAccounts()

  const olderLoadResponse = deferred()
  const newerSwitchResponse = deferred()
  queue(olderLoadResponse.promise, newerSwitchResponse.promise)
  const olderLoad = state.loadGameAccounts()
  const newerSwitch = state.switchGameAccount(2)

  newerSwitchResponse.resolve({ ...second, is_default: true })
  await newerSwitch
  assert.equal(state.currentAccount.value.id, 2)
  assert.equal(state.loading.value, true)

  olderLoadResponse.resolve({ results: [first, second] })
  await olderLoad
  assert.equal(state.currentAccount.value.id, 2)
  assert.equal(state.loading.value, false)
})

test('returns the current account without fetching when switching to it', async () => {
  const current = account(1, '123456789', { is_default: true })
  queue({ results: [current] })
  const state = useGameAccount()
  await state.loadGameAccounts()
  const callCount = calls.length

  const result = await state.switchGameAccount(1)

  assert.equal(result, state.currentAccount.value)
  assert.equal(calls.length, callCount)
})

test('clears a previous error when switching to the current account without fetching', async () => {
  const current = account(1, '123456789', { is_default: true })
  queue({ results: [current] })
  const state = useGameAccount()
  await state.loadGameAccounts()
  await assert.rejects(state.switchGameAccount(999), /不存在或尚未绑定/)
  const callCount = calls.length

  await state.switchGameAccount(1)

  assert.equal(state.error.value, '')
  assert.equal(calls.length, callCount)
})
