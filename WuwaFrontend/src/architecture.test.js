import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function lineCount(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8')
  return source.split(/\r?\n/).length
}

test('frontend high-attraction entry files do not grow beyond the refactor baseline', async () => {
  assert.ok(await lineCount('./App.vue') <= 2850, 'App.vue must not grow beyond 2850 lines')
  assert.ok(await lineCount('./style.css') <= 8850, 'style.css must not grow beyond 8850 lines')
})
