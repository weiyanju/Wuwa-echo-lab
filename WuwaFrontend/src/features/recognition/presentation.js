export function recognitionStatusText(status) {
  return {
    saved: '已保存',
    conflict: '需复查',
    rejected: '已丢弃',
    ignored_duplicate: '重复快照',
    reverted: '已回滚',
  }[status] || status || '未知'
}

export function recognitionStatusClass(snapshot) {
  return `recognition-status-${snapshot.status || 'unknown'}`
}

export function recognitionSnapshotTitle(snapshot) {
  if (snapshot.status === 'saved') {
    return `快照 #${snapshot.snapshot_id} 已写入 ${snapshot.created_roll_count || 0} 条词条`
  }
  if (snapshot.error_code === 'duplicate_detail_screenshot_hash') {
    return `快照 #${snapshot.snapshot_id} 与已有截图重复`
  }
  return `快照 #${snapshot.snapshot_id} ${recognitionStatusText(snapshot.status)}`
}
