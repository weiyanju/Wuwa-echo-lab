import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('recognition review composable owns review state and presentation rows', async () => {
  const source = await readFile(new URL('./useRecognitionReview.js', import.meta.url), 'utf8')

  assert.match(source, /const sessions = ref\(\[\]\)/)
  assert.match(source, /const snapshots = ref\(\[\]\)/)
  assert.match(source, /const latestSession = computed\(\(\) => sessions\.value\[0\] \|\| null\)/)
  assert.match(source, /const reviewRows = computed\(\(\) => snapshots\.value\.filter/)
  assert.match(source, /const metrics = computed\(\(\) => \{/)
})

test('recognition review composable owns refresh feedback and cleanup', async () => {
  const source = await readFile(new URL('./useRecognitionReview.js', import.meta.url), 'utf8')

  assert.match(source, /async function refresh\(\{ silent = false \} = \{\}\)/)
  assert.match(source, /listRecognitionSessions\(selectedGameAccountId\.value\)/)
  assert.match(source, /listRecognitionSnapshots\(selectedGameAccountId\.value,/)
  assert.match(source, /function dispose\(\) \{\s+clearTimeout\(refreshFeedbackTimer\)/)
})

test('recognition review composable reverts snapshots without owning global refresh', async () => {
  const source = await readFile(new URL('./useRecognitionReview.js', import.meta.url), 'utf8')

  assert.match(source, /async function revert\(snapshot\)/)
  assert.match(source, /await revertRecognitionSnapshot\(snapshot\.snapshot_id\)/)
  assert.doesNotMatch(source, /refreshAll/)
})
