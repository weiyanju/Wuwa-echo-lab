import assert from 'node:assert/strict'
import test from 'node:test'

globalThis.document = { cookie: 'csrftoken=test-token' }

const calls = []
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url, options })
  return {
    ok: true,
    async json() {
      return { ok: true }
    },
  }
}

const api = await import('./api.js')

test('game account helpers call the MVP account endpoints', async () => {
  calls.length = 0

  await api.listGameAccounts()
  await api.createGameAccount({ uid: '123456789' })
  await api.updateGameAccount(7, { is_default: true })

  assert.equal(calls[0].url, '/api/game-accounts/')
  assert.equal(calls[1].url, '/api/game-accounts/')
  assert.equal(calls[1].options.method, 'POST')
  assert.equal(calls[1].options.body, JSON.stringify({ uid: '123456789' }))
  assert.equal(calls[2].url, '/api/game-accounts/7/')
  assert.equal(calls[2].options.method, 'PATCH')
})

test('game-account-scoped reads append query parameters', async () => {
  calls.length = 0

  await api.listEchoes(3)
  await api.getStats(3)
  await api.getModelEvaluation(3)

  assert.equal(calls[0].url, '/api/echoes/?game_account_id=3')
  assert.equal(calls[1].url, '/api/stats/?game_account_id=3')
  assert.equal(calls[2].url, '/api/model-evaluation/?game_account_id=3')
})

test('prediction helper requests fast mode by default', async () => {
  calls.length = 0

  await api.getPrediction(1)

  assert.equal(calls[0].url, '/api/echoes/1/prediction/?mode=fast')
})

test('prediction helper can request detailed diagnostics mode', async () => {
  calls.length = 0

  await api.getPrediction(7, { mode: 'detail' })

  assert.equal(calls[0].url, '/api/echoes/7/prediction/?mode=detail')
})

test('create echo includes game account id when provided separately', async () => {
  calls.length = 0

  await api.createEcho({ cost: 1 }, 5)

  assert.equal(calls[0].url, '/api/echoes/')
  assert.equal(calls[0].options.body, JSON.stringify({ cost: 1, game_account_id: 5 }))
})

test('recognition helpers call session, snapshot list, and revert endpoints', async () => {
  calls.length = 0

  await api.listRecognitionSessions(9)
  await api.listRecognitionSnapshots(9, ['saved', 'conflict'])
  await api.revertRecognitionSnapshot(12)

  assert.equal(calls[0].url, '/api/recognition/sessions/?game_account_id=9')
  assert.equal(calls[1].url, '/api/recognition/snapshots/?status=saved%2Cconflict&game_account_id=9')
  assert.equal(calls[2].url, '/api/recognition/snapshots/12/revert/')
  assert.equal(calls[2].options.method, 'POST')
})
