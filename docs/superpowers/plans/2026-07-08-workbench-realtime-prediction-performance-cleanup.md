# Workbench Realtime Prediction Performance Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep "predict after every substat entry" realtime while removing the earlier image-switch hypothesis code and moving heavy model evaluation out of the entry path.

**Architecture:** Split the workbench into a critical entry lane and an insight lane. The critical lane is `save substat -> optimistic UI -> fast next prediction`; the insight lane is `stats/model evaluation/model detail` and must not run after every tier click. Image asset selection is treated as identity metadata only, with simple coalesced persistence and no interaction with prediction refresh.

**Tech Stack:** Vue 3 composables and `node:test` for frontend behavior; Django 6 service/view tests for prediction API behavior; existing Django ORM and in-process caching only, no Redis in this pass.

---

## File Map

- Modify `WuwaFrontend/src/features/workspace/useEchoWorkspace.js`
  - Remove automatic `refreshInsightsInBackground()` from tier entry and undo.
  - Stop canceling prediction when selecting an echo image.
  - Stop deferring image PATCH around tier save.
- Modify `WuwaFrontend/src/features/workspace/echoAssetIdentity.js`
  - Collapse the overbuilt pause/abort/retry persistence logic back to simple debounce + latest-write-wins.
- Modify `WuwaFrontend/src/features/workspace/echoPredictionRefresh.js`
  - Keep request cancellation for stale prediction refreshes.
  - Explicitly request fast prediction mode.
- Modify `WuwaFrontend/src/services/analyticsApi.js`
  - Support `mode=fast` query for prediction requests while preserving `AbortSignal`.
- Modify `WuwaFrontend/src/features/workspace/useEchoWorkspace.test.js`
  - Replace tests that encode the old image-switch hypothesis.
  - Add tests proving tier entry only starts fast prediction, not stats/evaluation.
- Modify `Wuwa/analytics/services/prediction.py`
  - Add `include_diagnostics=True` parameter to `predict_next_substat`.
  - Skip `model_diagnostics` construction when fast mode is requested.
- Modify `Wuwa/analytics/views.py`
  - Read `?mode=fast` and call the lightweight prediction path.
- Modify `Wuwa/api/tests/test_prediction.py`
  - Add service-level coverage for fast prediction omitting diagnostics while keeping candidates.
- Modify `Wuwa/api/tests/test_views.py`
  - Add API-level coverage for `?mode=fast`.

---

## Task 1: Lock The Correct Frontend Behavior With Failing Tests

**Files:**
- Modify: `WuwaFrontend/src/features/workspace/useEchoWorkspace.test.js`

- [ ] **Step 1: Replace the old image cancellation test**

Find the test named:

```js
test('echo image selection cancels prediction refresh without starting a new one', async () => {
```

Replace that whole test with:

```js
test('echo image selection does not cancel a pending prediction refresh', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const testSetName = sonataEffects[0].name
  const previewEcho = {
    id: 60000006,
    name: 'prediction-idle-preview',
    cost: 1,
    image: '/echo-images/prediction-idle-preview.png',
  }
  let predictionRequests = 0
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) {
      return jsonResponse({
        results: [{
          id: 94,
          status: 'in_progress',
          substats: [{ id: 941, position: 1, substat_type: 'crit_rate', tier_value: 6.3 }],
          set_name: testSetName,
          cost: 1,
          main_stat: 'atk_percent',
          is_continuous_tuning: true,
        }],
      })
    }
    if (path.endsWith('/echoes/94/') && options.method === 'PATCH') {
      const payload = JSON.parse(options.body)
      return jsonResponse({
        id: 94,
        status: 'in_progress',
        substats: [{ id: 941, position: 1, substat_type: 'crit_rate', tier_value: 6.3 }],
        set_name: testSetName,
        cost: 1,
        main_stat: 'atk_percent',
        ...payload,
        is_continuous_tuning: true,
      })
    }
    if (path.includes('/prediction/')) {
      predictionRequests += 1
      return jsonResponse({ candidates: [] })
    }
    if (path.includes('/stats/') || path.includes('/model-evaluation/')) return jsonResponse({})
    throw new Error(`Unexpected request: ${path}`)
  }

  const workspace = useEchoWorkspace({
    selectedGameAccountId: ref(1),
    boundPlayerUid: ref('123456789'),
    workspaceLocked: ref(false),
    onError: () => {},
  })

  try {
    await workspace.refresh()
    await new Promise((resolve) => setTimeout(resolve, 300))
    await workspace.selectEchoAsset({ ...previewEcho, set_name: testSetName })
    await new Promise((resolve) => setTimeout(resolve, 800))

    assert.equal(predictionRequests, 1)
  } finally {
    workspace.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})
```

- [ ] **Step 2: Add a test proving tier entry does not start insight refresh**

Place this test after `tier entry keeps prediction refresh out of the immediate save path`:

```js
test('tier entry refreshes next prediction without starting stats or model evaluation', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const requestOrder = []
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) {
      return jsonResponse({
        results: [{
          id: 193,
          status: 'in_progress',
          substats: [{ id: 1931, position: 1, substat_type: 'crit_rate', tier_value: 6.3 }],
          set_name: sonataEffects[0].name,
          cost: 1,
          main_stat: 'atk_percent',
          is_continuous_tuning: true,
        }],
      })
    }
    if (path.includes('/prediction/')) {
      requestOrder.push('prediction')
      return jsonResponse({ candidates: [] })
    }
    if (path.includes('/stats/')) {
      requestOrder.push('stats')
      return jsonResponse({})
    }
    if (path.includes('/model-evaluation/')) {
      requestOrder.push('model-evaluation')
      return jsonResponse({})
    }
    if (path.includes('/substats/') && options.method === 'POST') {
      requestOrder.push('substat-save')
      return jsonResponse({ id: 1932, position: 2, substat_type: 'crit_damage', tier_value: 12.6 })
    }
    throw new Error(`Unexpected request: ${path}`)
  }

  const workspace = useEchoWorkspace({
    selectedGameAccountId: ref(1),
    boundPlayerUid: ref('123456789'),
    workspaceLocked: ref(false),
    onError: () => {},
  })

  try {
    await workspace.refresh()
    requestOrder.length = 0

    await workspace.clickTier(
      { recorded: null, substat_type: 'crit_damage' },
      { value: 12.6 },
    )
    await new Promise((resolve) => setTimeout(resolve, 1200))

    assert.deepEqual(requestOrder, ['substat-save', 'prediction'])
  } finally {
    workspace.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})
```

- [ ] **Step 3: Run the failing frontend tests**

Run:

```powershell
cd WuwaFrontend
..\.tools\node\npm.cmd test -- src/features/workspace/useEchoWorkspace.test.js
```

Expected: FAIL. The first new test fails because `selectEchoAsset` currently cancels the pending prediction refresh. The second new test fails because `clickTier` currently schedules stats/model-evaluation through `refreshInsightsInBackground()`.

---

## Task 2: Keep Tier Entry On The Critical Prediction Lane Only

**Files:**
- Modify: `WuwaFrontend/src/features/workspace/useEchoWorkspace.js`
- Test: `WuwaFrontend/src/features/workspace/useEchoWorkspace.test.js`

- [ ] **Step 1: Remove insight refresh timer state**

In `useEchoWorkspace.js`, remove:

```js
  let insightsRefreshTimer = null
```

In `reset()`, remove:

```js
    clearTimeout(insightsRefreshTimer)
    insightsRefreshTimer = null
```

- [ ] **Step 2: Delete the background insight refresh function**

Delete this full function:

```js
  function refreshInsightsInBackground() {
    const accountId = selectedGameAccountId.value
    if (!accountId) return
    const generation = lifecycleGeneration
    const isCurrent = () => generation === lifecycleGeneration && accountId === selectedGameAccountId.value
    clearTimeout(insightsRefreshTimer)
    insightsRefreshTimer = setTimeout(() => {
      Promise.all([getStats(accountId), getModelEvaluation(accountId)])
        .then(([nextStats, nextEvaluation]) => {
          if (!isCurrent()) return
          stats.value = nextStats
          evaluation.value = nextEvaluation
        })
        .catch((err) => {
          if (isCurrent()) reportError(err)
        })
    }, 1000)
  }
```

- [ ] **Step 3: Remove insight refresh calls from entry mutations**

In `clickTier`, change:

```js
      nextDraft.prepare()
      refreshActiveInBackground()
      refreshInsightsInBackground()
```

to:

```js
      nextDraft.prepare()
      refreshActiveInBackground()
```

In `undoActiveSubstat`, change:

```js
      replaceEcho(result.echo)
      refreshActiveInBackground()
      refreshInsightsInBackground()
```

to:

```js
      replaceEcho(result.echo)
      refreshActiveInBackground()
```

- [ ] **Step 4: Run the targeted frontend tests**

Run:

```powershell
cd WuwaFrontend
..\.tools\node\npm.cmd test -- src/features/workspace/useEchoWorkspace.test.js
```

Expected: the new insight-refresh test passes. The image-selection test still fails until Task 3.

---

## Task 3: Remove The Image-Switch Hypothesis Code

**Files:**
- Modify: `WuwaFrontend/src/features/workspace/useEchoWorkspace.js`
- Modify: `WuwaFrontend/src/features/workspace/echoAssetIdentity.js`
- Modify: `WuwaFrontend/src/features/workspace/useEchoWorkspace.test.js`

- [ ] **Step 1: Stop image selection from touching prediction**

In `useEchoWorkspace.js`, change:

```js
  async function selectEchoAsset(asset) {
    cancelActivePredictionRefresh()
    nextDraft.clear()
    await echoAssetIdentity.selectEchoAsset(asset)
  }
```

to:

```js
  async function selectEchoAsset(asset) {
    nextDraft.clear()
    await echoAssetIdentity.selectEchoAsset(asset)
  }
```

- [ ] **Step 2: Stop tier entry from pausing image persistence**

In `clickTier`, remove:

```js
    echoAssetIdentity.deferPendingEchoAssetUpdate()
```

In the `finally` block of `clickTier`, remove:

```js
      echoAssetIdentity.resumeDeferredEchoAssetUpdate()
```

- [ ] **Step 3: Simplify `echoAssetIdentity.js` state**

Replace the state block:

```js
  let pendingPersist = null
  let persistTimer = null
  let persistInFlight = false
  let inFlightPersistRequest = null
  let persistAbortController = null
  let persistPaused = false
  let persistToken = 0
```

with:

```js
  let pendingPersist = null
  let persistTimer = null
  let persistToken = 0
```

Replace `resetEchoAsset()` with:

```js
  function resetEchoAsset() {
    selectedEchoAsset.value = null
    pendingPersist = null
    persistToken += 1
    clearTimeout(persistTimer)
    persistTimer = null
  }
```

- [ ] **Step 4: Replace the scheduler and flush logic**

Delete `deferPendingEchoAssetUpdate()` and `resumeDeferredEchoAssetUpdate()`.

Replace `schedulePendingPersist()` and `flushPendingPersist()` with:

```js
  function schedulePendingPersist(delay = echoAssetPersistDelayMs) {
    clearTimeout(persistTimer)
    persistTimer = setTimeout(flushPendingPersist, delay)
  }

  async function flushPendingPersist() {
    persistTimer = null
    if (!pendingPersist) return

    const request = pendingPersist
    pendingPersist = null
    const token = ++persistToken
    try {
      const updated = await updateEcho(request.echoId, request.fields)
      const hasNewerPendingForEcho = pendingPersist?.echoId === request.echoId
      if (
        token === persistToken
        && !hasNewerPendingForEcho
        && request.generation === lifecycleGeneration()
        && request.accountId === selectedGameAccountId.value
        && activeEchoId.value === request.echoId
        && activeEcho.value
      ) {
        replaceEcho({
          ...activeEcho.value,
          echo_asset_id: updated.echo_asset_id ?? request.fields.echo_asset_id,
          echo_name: updated.echo_name ?? request.fields.echo_name,
          echo_image: updated.echo_image ?? request.fields.echo_image,
        })
      }
    } catch (err) {
      if (request.generation === lifecycleGeneration() && request.accountId === selectedGameAccountId.value) {
        reportError(err)
      }
    } finally {
      if (pendingPersist) schedulePendingPersist()
    }
  }
```

- [ ] **Step 5: Return only the image identity public API**

Change:

```js
  return { deferPendingEchoAssetUpdate, resetEchoAsset, resumeDeferredEchoAssetUpdate, selectedEchoAssetFieldsForConfig, selectEchoAsset }
```

to:

```js
  return { resetEchoAsset, selectedEchoAssetFieldsForConfig, selectEchoAsset }
```

- [ ] **Step 6: Delete tests that encode pause/abort behavior**

Remove these full tests from `useEchoWorkspace.test.js`:

```js
test('tier entry defers pending echo image patches off the save path', async () => {
test('tier entry keeps deferred echo image patches paused until substat save settles', async () => {
test('tier entry aborts in-flight echo image patches and retries them later', async () => {
```

Keep the coalescing test:

```js
test('rapid preview changes defer and coalesce echo image patches', async () => {
```

It still describes the desired simple behavior.

- [ ] **Step 7: Run the targeted frontend tests**

Run:

```powershell
cd WuwaFrontend
..\.tools\node\npm.cmd test -- src/features/workspace/useEchoWorkspace.test.js
```

Expected: PASS.

---

## Task 4: Add Fast Prediction Mode For The Realtime Lane

**Files:**
- Modify: `Wuwa/analytics/services/prediction.py`
- Modify: `Wuwa/analytics/views.py`
- Modify: `Wuwa/api/tests/test_prediction.py`
- Modify: `Wuwa/api/tests/test_views.py`
- Modify: `WuwaFrontend/src/services/analyticsApi.js`
- Modify: `WuwaFrontend/src/features/workspace/echoPredictionRefresh.js`

- [ ] **Step 1: Add service-level failing test**

In `Wuwa/api/tests/test_prediction.py`, add this test inside `PredictionServiceTests`:

```python
    def test_fast_prediction_keeps_candidates_without_model_diagnostics(self):
        SubstatRoll.objects.create(echo=self.echo, position=1, substat_type="crit_rate", tier_value=6.3)

        result = predict_next_substat(self.echo, include_diagnostics=False)

        self.assertIn("candidates", result)
        self.assertGreater(len(result["candidates"]), 0)
        self.assertIsNone(result["model_diagnostics"])
```

- [ ] **Step 2: Add API-level failing test**

In `Wuwa/api/tests/test_views.py`, add this test near the existing prediction view tests:

```python
    def test_prediction_fast_mode_omits_model_diagnostics(self):
        self.client.force_login(self.user)
        echo = EchoRecord.objects.create(
            user=self.user,
            echo_uid="fast-prediction",
            cost=1,
            set_name="Set",
            main_stat="atk_percent",
        )
        SubstatRoll.objects.create(echo=echo, position=1, substat_type="crit_rate", tier_value=6.3)

        response = self.client.get(f"{reverse('echo_prediction', args=[echo.id])}?mode=fast")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("candidates", body)
        self.assertIsNone(body["model_diagnostics"])
```

- [ ] **Step 3: Run backend tests to verify failure**

Run:

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test api.tests.test_prediction api.tests.test_views
```

Expected: FAIL because `predict_next_substat` does not accept `include_diagnostics`.

- [ ] **Step 4: Add optional diagnostics to prediction service**

In `Wuwa/analytics/services/prediction.py`, change:

```python
def predict_next_substat(echo):
```

to:

```python
def predict_next_substat(echo, include_diagnostics=True):
```

Change:

```python
    diagnostics = _model_diagnostics(sequence, candidates, total_rolls, weights, distributions)
```

to:

```python
    diagnostics = _model_diagnostics(sequence, candidates, total_rolls, weights, distributions) if include_diagnostics else None
```

Keep the response key as:

```python
        "model_diagnostics": diagnostics,
```

- [ ] **Step 5: Route `mode=fast` through the view**

In `Wuwa/analytics/views.py`, change:

```python
    return success_response(predict_next_substat(echo))
```

to:

```python
    include_diagnostics = request.GET.get("mode") != "fast"
    return success_response(predict_next_substat(echo, include_diagnostics=include_diagnostics))
```

- [ ] **Step 6: Update frontend prediction API**

In `WuwaFrontend/src/services/analyticsApi.js`, replace:

```js
export function getPrediction(echoId, options = {}) {
  return request(`/echoes/${echoId}/prediction/`, options)
}
```

with:

```js
export function getPrediction(echoId, options = {}) {
  const { mode = 'fast', ...requestOptions } = options
  const query = mode ? `?mode=${encodeURIComponent(mode)}` : ''
  return request(`/echoes/${echoId}/prediction/${query}`, requestOptions)
}
```

- [ ] **Step 7: Make realtime refresh explicit**

In `WuwaFrontend/src/features/workspace/echoPredictionRefresh.js`, change:

```js
      const nextPrediction = await getPrediction(echoId, { signal: controller.signal })
```

to:

```js
      const nextPrediction = await getPrediction(echoId, { mode: 'fast', signal: controller.signal })
```

- [ ] **Step 8: Run backend and frontend targeted tests**

Run:

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test api.tests.test_prediction api.tests.test_views
```

Expected: PASS.

Run:

```powershell
cd WuwaFrontend
..\.tools\node\npm.cmd test -- src/features/workspace/useEchoWorkspace.test.js src/services/api.test.js
```

Expected: PASS, except `src/services/api.test.js` may need its prediction URL assertion updated to `/api/echoes/<id>/prediction/?mode=fast`.

---

## Task 5: Update API URL Tests If Needed

**Files:**
- Modify: `WuwaFrontend/src/services/api.test.js`

- [ ] **Step 1: Update prediction URL expectation**

If `api.test.js` expects the old URL, change:

```js
  assert.equal(calls[0].url, '/api/echoes/1/prediction/')
```

to:

```js
  assert.equal(calls[0].url, '/api/echoes/1/prediction/?mode=fast')
```

- [ ] **Step 2: Add explicit detailed prediction option test**

Add this test if the file has room next to existing analytics API tests:

```js
test('getPrediction can request detailed diagnostics mode', async () => {
  const originalFetch = globalThis.fetch
  const originalDocument = globalThis.document
  const calls = []
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options })
    return new Response(JSON.stringify({ candidates: [] }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  }

  try {
    await api.getPrediction(7, { mode: 'detail' })

    assert.equal(calls[0].url, '/api/echoes/7/prediction/?mode=detail')
  } finally {
    globalThis.fetch = originalFetch
    globalThis.document = originalDocument
  }
})
```

- [ ] **Step 3: Run service tests**

Run:

```powershell
cd WuwaFrontend
..\.tools\node\npm.cmd test -- src/services/api.test.js
```

Expected: PASS.

---

## Task 6: Full Verification

**Files:**
- No code changes in this task.

- [ ] **Step 1: Run full frontend tests**

Run:

```powershell
cd WuwaFrontend
..\.tools\node\npm.cmd test
```

Expected: PASS.

- [ ] **Step 2: Run frontend production build**

Run:

```powershell
cd WuwaFrontend
..\.tools\node\npm.cmd run build
```

Expected: PASS.

- [ ] **Step 3: Run backend tests focused on prediction/evaluation/views**

Run:

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test api.tests.test_prediction api.tests.test_evaluation api.tests.test_roll_summary api.tests.test_views
```

Expected: PASS.

- [ ] **Step 4: Manual browser verification**

Start the app using the existing dev script:

```powershell
.\start-dev.bat
```

Manual scenario:

1. Open the workbench.
2. Wait until the initial prediction appears.
3. Record four substats quickly.
4. Switch echo image several times.
5. Record the next substat immediately.
6. Confirm the click responds immediately with optimistic UI.
7. Confirm the next prediction updates after the configured prediction delay.
8. Confirm Network shows no `/model-evaluation/` request after each tier click.
9. Confirm image PATCH requests are coalesced when switching images quickly.

Expected: substat entry remains responsive before and after image switching. Prediction still refreshes after every saved substat.

---

## Cleanup Decision Table

Keep:

- `Wuwa/analytics/services/roll_summary.py`
- `Wuwa/analytics/signals.py`
- `WuwaFrontend/src/features/workspace/echoPredictionRefresh.js`
- `WuwaFrontend/src/features/workspace/echoWorkspaceDrafts.js`
- UI layout and active prediction panel polish

Simplify or remove:

- `echoAssetIdentity.deferPendingEchoAssetUpdate`
- `echoAssetIdentity.resumeDeferredEchoAssetUpdate`
- image PATCH in-flight abort/retry state
- `selectEchoAsset` calling `cancelActivePredictionRefresh`
- `clickTier` and `undoActiveSubstat` calling stats/model-evaluation background refresh
- tests that enforce image PATCH pause/abort behavior

Out of scope for this pass:

- Redis.
- Celery/RQ background workers.
- Persistent database cache tables for prediction/evaluation.
- Changing model math.

Those are valid later scaling options, but this pass should first remove the accidental coupling that makes local interactive entry feel blocked.

---

## Self-Review

- Spec coverage: The plan keeps realtime next prediction, removes heavy model evaluation from the entry path, and cleans up the image-switch hypothesis code.
- Placeholder scan: No task uses open-ended "add appropriate" or "fill in later" language. Each code task includes exact target snippets.
- Type consistency: `getPrediction(echoId, { mode, signal })` matches `echoPredictionRefresh.js`; `predict_next_substat(echo, include_diagnostics=False)` matches `analytics.views.echo_prediction`.
