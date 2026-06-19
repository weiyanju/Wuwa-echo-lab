import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { ref } from 'vue'

import { useRecognitionReview } from './useRecognitionReview.js'

function jsonResponse(data) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
}

function deferred() {
  let resolve
  const promise = new Promise((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

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
  assert.match(source, /const accountId = selectedGameAccountId\.value/)
  assert.match(source, /listRecognitionSessions\(accountId\)/)
  assert.match(source, /listRecognitionSnapshots\(accountId,/)
  assert.match(source, /function dispose\(\) \{\s+reset\(\)/)
})

test('recognition review composable reverts snapshots without owning global refresh', async () => {
  const source = await readFile(new URL('./useRecognitionReview.js', import.meta.url), 'utf8')

  assert.match(source, /async function revert\(snapshot\)/)
  assert.match(source, /await revertRecognitionSnapshot\(snapshotId\)/)
  assert.doesNotMatch(source, /refreshAll/)
})

test('reset prevents an old account refresh from restoring recognition data', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const sessions = deferred()
  const snapshots = deferred()
  globalThis.document = { cookie: '' }
  globalThis.fetch = async (url) => {
    if (String(url).includes('/recognition/sessions/')) {
      return sessions.promise
    }
    return snapshots.promise
  }

  try {
    const selectedGameAccountId = ref(1)
    const review = useRecognitionReview({
      selectedGameAccountId,
      saving: ref(false),
      onError: () => {},
    })
    const refreshPromise = review.refresh()

    selectedGameAccountId.value = 2
    review.reset()
    sessions.resolve(jsonResponse({ results: [{ id: 11 }] }))
    snapshots.resolve(jsonResponse({ results: [{ snapshot_id: 'old-account' }] }))
    await refreshPromise

    assert.deepEqual(review.sessions.value, [])
    assert.deepEqual(review.snapshots.value, [])
    assert.equal(review.refreshing.value, false)
  } finally {
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('reset invalidates an in-flight snapshot revert', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const revertResponse = deferred()
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async () => revertResponse.promise

  try {
    const selectedGameAccountId = ref(1)
    const review = useRecognitionReview({
      selectedGameAccountId,
      saving: ref(false),
      onError: () => {},
    })
    const revertPromise = review.revert({ snapshot_id: 'old-account' })

    selectedGameAccountId.value = 2
    review.reset()
    revertResponse.resolve(jsonResponse({ status: 'reverted' }))

    assert.equal(await revertPromise, false)
    assert.equal(review.revertingSnapshotId.value, null)
  } finally {
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})
