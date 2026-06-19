import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('echo workspace composable owns core state and derived presentation data', async () => {
  const source = await readFile(new URL('./useEchoWorkspace.js', import.meta.url), 'utf8')

  assert.match(source, /const echoes = ref\(\[\]\)/)
  assert.match(source, /const activeEchoId = ref\(null\)/)
  assert.match(source, /const prediction = ref\(null\)/)
  assert.match(source, /const stats = ref\(null\)/)
  assert.match(source, /const evaluation = ref\(null\)/)
  assert.match(source, /const matrixRows = computed/)
  assert.match(source, /const modelDetailCards = computed/)
})

test('echo workspace composable owns persistence and optimistic roll workflows', async () => {
  const source = await readFile(new URL('./useEchoWorkspace.js', import.meta.url), 'utf8')

  assert.match(source, /async function createEchoWithConfig/)
  assert.match(source, /async function applyEchoConfig/)
  assert.match(source, /async function discardActiveEcho/)
  assert.match(source, /async function clickTier/)
  assert.match(source, /appendRollToEcho\(echo\.id, optimisticRoll\)[\s\S]+await addSubstat/)
  assert.match(source, /removeOptimisticRollFromEcho\(optimisticEchoId, optimisticRoll\.id\)/)
  assert.match(source, /async function undoActiveSubstat/)
})

test('echo workspace composable exposes refresh and cleans up timers without crossing feature boundaries', async () => {
  const source = await readFile(new URL('./useEchoWorkspace.js', import.meta.url), 'utf8')

  assert.match(source, /async function refresh\(\)/)
  assert.match(source, /function dispose\(\) \{[\s\S]+clearTimeout\(insightsRefreshTimer\)[\s\S]+clearTimeout\(activeRefreshTimer\)/)
  assert.doesNotMatch(source, /useAuth|useGameAccount|Recognition|recognition/)
})

test('echo workspace clears stale errors before user commands', async () => {
  const source = await readFile(new URL('./useEchoWorkspace.js', import.meta.url), 'utf8')

  assert.match(source, /async function applyEchoConfig\(partialConfig\) \{\s+onError\(''\)/)
  assert.match(source, /async function discardActiveEcho\(\) \{[\s\S]+?onError\(''\)/)
  assert.match(source, /async function clickTier\(row, tier\) \{[\s\S]+?onError\(''\)/)
  assert.match(source, /async function undoActiveSubstat\(\) \{[\s\S]+?onError\(''\)/)
})
