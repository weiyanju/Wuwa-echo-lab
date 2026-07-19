import assert from 'node:assert/strict'
import test, { after } from 'node:test'

const originalDocument = globalThis.document
const originalFetch = globalThis.fetch

globalThis.document = { cookie: 'csrftoken=test-token' }

const { request } = await import('./http.js')

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

test('request preserves backend status and stable error code', async () => {
  globalThis.fetch = async () => ({
    ok: false,
    status: 409,
    async json() {
      return {
        error: '档案已完成，请使用终端登录。',
        code: 'registration_complete',
      }
    },
  })

  await assert.rejects(
    request('/auth/register/', { method: 'POST', body: '{}' }),
    (error) => {
      assert.equal(error.message, '档案已完成，请使用终端登录。')
      assert.equal(error.status, 409)
      assert.equal(error.code, 'registration_complete')
      return true
    },
  )
})
