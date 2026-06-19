import { computed, ref } from 'vue'
import {
  listRecognitionSessions,
  listRecognitionSnapshots,
  revertRecognitionSnapshot,
} from '../../services/api.js'

export function useRecognitionReview({ selectedGameAccountId, saving, onError }) {
  const sessions = ref([])
  const snapshots = ref([])
  const revertingSnapshotId = ref(null)
  const refreshing = ref(false)
  const refreshStatus = ref('')
  let refreshFeedbackTimer = null
  let lifecycleGeneration = 0
  let refreshRequestId = 0

  const latestSession = computed(() => sessions.value[0] || null)
  const reviewRows = computed(() => snapshots.value.filter((snapshot) => (
    ['saved', 'conflict', 'rejected', 'ignored_duplicate'].includes(snapshot.status)
  )))
  const metrics = computed(() => {
    const session = latestSession.value || {}
    return [
      { key: 'saved_roll_count', label: '保存词条', value: session.saved_roll_count || 0 },
      { key: 'snapshot_count', label: '识别快照', value: session.snapshot_count || 0 },
      { key: 'conflict_count', label: '待处理', value: session.conflict_count || 0 },
    ]
  })
  const refreshDisabled = computed(() => saving.value || refreshing.value || Boolean(refreshStatus.value))

  function setRefreshStatus(status) {
    clearTimeout(refreshFeedbackTimer)
    refreshStatus.value = status
    if (status) {
      refreshFeedbackTimer = setTimeout(() => {
        refreshStatus.value = ''
        refreshFeedbackTimer = null
      }, 900)
    }
  }

  function reset() {
    lifecycleGeneration += 1
    refreshRequestId += 1
    clearTimeout(refreshFeedbackTimer)
    refreshFeedbackTimer = null
    sessions.value = []
    snapshots.value = []
    revertingSnapshotId.value = null
    refreshing.value = false
    refreshStatus.value = ''
  }

  async function refresh({ silent = false } = {}) {
    const accountId = selectedGameAccountId.value
    if (!accountId) {
      reset()
      return
    }
    if (refreshing.value) {
      return
    }
    const generation = lifecycleGeneration
    const requestId = ++refreshRequestId
    const isCurrent = () => (
      generation === lifecycleGeneration
      && requestId === refreshRequestId
      && accountId === selectedGameAccountId.value
    )
    refreshing.value = true
    if (!silent) {
      refreshStatus.value = ''
    }
    try {
      const [sessionData, snapshotData] = await Promise.all([
        listRecognitionSessions(accountId),
        listRecognitionSnapshots(accountId, ['saved', 'conflict', 'rejected', 'ignored_duplicate']),
      ])
      if (!isCurrent()) return
      sessions.value = sessionData.results || []
      snapshots.value = snapshotData.results || []
      if (!silent) {
        setRefreshStatus('success')
      }
    } catch (err) {
      if (!isCurrent()) return
      if (!silent) {
        onError(err.message)
        setRefreshStatus('error')
        return
      }
      throw err
    } finally {
      if (isCurrent()) refreshing.value = false
    }
  }

  async function revert(snapshot) {
    if (!snapshot?.snapshot_id || revertingSnapshotId.value) {
      return false
    }
    const snapshotId = snapshot.snapshot_id
    const accountId = selectedGameAccountId.value
    const generation = lifecycleGeneration
    revertingSnapshotId.value = snapshotId
    try {
      await revertRecognitionSnapshot(snapshotId)
      return generation === lifecycleGeneration && accountId === selectedGameAccountId.value
    } finally {
      if (generation === lifecycleGeneration && revertingSnapshotId.value === snapshotId) {
        revertingSnapshotId.value = null
      }
    }
  }

  function dispose() {
    reset()
  }

  return {
    dispose,
    latestSession,
    metrics,
    refresh,
    refreshDisabled,
    refreshing,
    refreshStatus,
    reset,
    revert,
    revertingSnapshotId,
    reviewRows,
    sessions,
    snapshots,
  }
}
