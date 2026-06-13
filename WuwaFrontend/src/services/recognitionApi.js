import { request, withGameAccount } from './http.js'

export function listRecognitionSessions(gameAccountId = null) {
  return request(withGameAccount('/recognition/sessions/', gameAccountId))
}

export function listRecognitionSnapshots(gameAccountId = null, statuses = []) {
  const statusQuery = statuses.length ? `?status=${encodeURIComponent(statuses.join(','))}` : ''
  return request(withGameAccount(`/recognition/snapshots/${statusQuery}`, gameAccountId))
}

export function revertRecognitionSnapshot(snapshotId) {
  return request(`/recognition/snapshots/${snapshotId}/revert/`, { method: 'POST' })
}
