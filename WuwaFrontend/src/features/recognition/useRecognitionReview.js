import { computed, ref } from 'vue'
import {
  listRecognitionSessions,
  listRecognitionSnapshots,
  revertRecognitionSnapshot,
} from '../../services/api'

export function useRecognitionReview({ selectedGameAccountId, saving, onError }) {
  const sessions = ref([])
  const snapshots = ref([])
  const revertingSnapshotId = ref(null)
  const refreshing = ref(false)
  const refreshStatus = ref('')
  let refreshFeedbackTimer = null

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
    sessions.value = []
    snapshots.value = []
  }

  async function refresh({ silent = false } = {}) {
    if (!selectedGameAccountId.value) {
      reset()
      return
    }
    if (refreshing.value) {
      return
    }
    refreshing.value = true
    if (!silent) {
      refreshStatus.value = ''
    }
    try {
      const [sessionData, snapshotData] = await Promise.all([
        listRecognitionSessions(selectedGameAccountId.value),
        listRecognitionSnapshots(selectedGameAccountId.value, ['saved', 'conflict', 'rejected', 'ignored_duplicate']),
      ])
      sessions.value = sessionData.results || []
      snapshots.value = snapshotData.results || []
      if (!silent) {
        setRefreshStatus('success')
      }
    } catch (err) {
      if (!silent) {
        onError(err.message)
        setRefreshStatus('error')
        return
      }
      throw err
    } finally {
      refreshing.value = false
    }
  }

  async function revert(snapshot) {
    if (!snapshot?.snapshot_id || revertingSnapshotId.value) {
      return false
    }
    revertingSnapshotId.value = snapshot.snapshot_id
    try {
      await revertRecognitionSnapshot(snapshot.snapshot_id)
      return true
    } finally {
      revertingSnapshotId.value = null
    }
  }

  function dispose() {
    clearTimeout(refreshFeedbackTimer)
    refreshFeedbackTimer = null
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
