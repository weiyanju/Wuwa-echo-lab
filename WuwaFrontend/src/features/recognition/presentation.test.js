import assert from 'node:assert/strict'
import test from 'node:test'

import {
  recognitionSnapshotTitle,
  recognitionStatusClass,
  recognitionStatusText,
} from './presentation.js'

test('recognition presentation maps stable snapshot states', () => {
  assert.equal(recognitionStatusText('saved'), '已保存')
  assert.equal(recognitionStatusText('conflict'), '需复查')
  assert.equal(recognitionStatusText('ignored_duplicate'), '重复快照')
  assert.equal(recognitionStatusClass({ status: 'rejected' }), 'recognition-status-rejected')
})

test('recognition snapshot title explains saved and duplicate results', () => {
  assert.equal(
    recognitionSnapshotTitle({ snapshot_id: 18, status: 'saved', created_roll_count: 2 }),
    '快照 #18 已写入 2 条词条',
  )
  assert.equal(
    recognitionSnapshotTitle({ snapshot_id: 19, status: 'ignored_duplicate', error_code: 'duplicate_detail_screenshot_hash' }),
    '快照 #19 与已有截图重复',
  )
})
