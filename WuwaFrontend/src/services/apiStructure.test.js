import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

const serviceFiles = [
  './http.js',
  './authApi.js',
  './gameAccountApi.js',
  './echoApi.js',
  './analyticsApi.js',
  './recognitionApi.js',
]

test('api services are split by responsibility', async () => {
  for (const file of serviceFiles) {
    await access(new URL(file, import.meta.url))
  }

  const apiSource = await readFile(new URL('./api.js', import.meta.url), 'utf8')

  assert.match(apiSource, /export \* from '\.\/authApi\.js'/)
  assert.match(apiSource, /export \* from '\.\/gameAccountApi\.js'/)
  assert.match(apiSource, /export \* from '\.\/echoApi\.js'/)
  assert.match(apiSource, /export \* from '\.\/analyticsApi\.js'/)
  assert.match(apiSource, /export \* from '\.\/recognitionApi\.js'/)
  assert.doesNotMatch(apiSource, /function getCookie/)
  assert.doesNotMatch(apiSource, /async function request/)
})
