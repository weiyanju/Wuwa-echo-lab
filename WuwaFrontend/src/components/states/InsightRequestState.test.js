import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('request state separates loading skeletons from actionable errors', async () => {
  const source = await readFile(new URL('./InsightRequestState.vue', import.meta.url), 'utf8')
  assert.match(source, /status === 'loading'/)
  assert.match(source, /aria-busy="true"/)
  assert.match(source, /role="alert"/)
  assert.match(source, />重新加载<\/button>/)
  assert.match(source, /emit\('retry'\)/)
  assert.doesNotMatch(source, />\s*--\s*</)
})
