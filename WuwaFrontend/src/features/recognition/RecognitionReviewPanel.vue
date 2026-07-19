<script setup>
import { computed } from 'vue'

import checkIcon from '../../assets/icons/check.svg'
import refreshIcon from '../../assets/icons/refresh-cw.svg'
import xIcon from '../../assets/icons/x.svg'
import {
  recognitionSnapshotTitle,
  recognitionStatusClass,
  recognitionStatusText,
} from './presentation.js'

const props = defineProps({
  latestSession: { type: Object, default: null },
  metrics: { type: Array, default: () => [] },
  refreshDisabled: { type: Boolean, default: false },
  refreshStatus: { type: String, default: '' },
  refreshing: { type: Boolean, default: false },
  revertingSnapshotId: { type: [Number, String], default: null },
  reviewRows: { type: Array, default: () => [] },
})

const emit = defineEmits(['refresh', 'revert'])

const refreshIconSource = computed(() => {
  if (props.refreshStatus === 'success') {
    return checkIcon
  }
  if (props.refreshStatus === 'error') {
    return xIcon
  }
  return refreshIcon
})

function iconMask(source) {
  return { '--icon-url': `url("${source}")` }
}
</script>

<template>
  <section
    class="recognition-panel product-panel"
    :class="{ 'recognition-panel-empty': !reviewRows.length }"
  >
    <div class="recognition-panel-head">
      <div class="recognition-title-lockup">
        <span class="recognition-live-dot" aria-hidden="true"></span>
        <div>
          <span class="eyebrow">本地识别</span>
          <h2>本地自动识别</h2>
        </div>
      </div>
      <button
        class="recognition-refresh-button icon-button"
        type="button"
        :class="[refreshStatus, { refreshing }]"
        :disabled="refreshDisabled"
        :aria-busy="refreshing"
        aria-label="刷新识别结果"
        title="刷新识别结果"
        @click="emit('refresh')"
      >
        <span class="ui-line-icon" :style="iconMask(refreshIconSource)" aria-hidden="true"></span>
      </button>
    </div>

    <div class="recognition-summary-strip" aria-label="识别会话摘要">
      <div class="recognition-state-copy">
        <strong>{{ reviewRows.length ? `${reviewRows.length} 条记录待查看` : '暂无待处理记录' }}</strong>
      </div>
      <div class="recognition-metric-grid">
        <article v-for="metric in metrics" :key="metric.key">
          <strong>{{ metric.value }}</strong>
          <span>{{ metric.label }}</span>
        </article>
      </div>
    </div>

    <div v-if="reviewRows.length" class="recognition-review-list" aria-label="识别快照列表">
      <article
        v-for="snapshot in reviewRows"
        :key="snapshot.snapshot_id"
        class="recognition-review-row"
        :class="recognitionStatusClass(snapshot)"
      >
        <div>
          <strong>{{ recognitionSnapshotTitle(snapshot) }}</strong>
          <span>{{ recognitionStatusText(snapshot.status) }}</span>
        </div>
        <button
          v-if="snapshot.status === 'saved'"
          type="button"
          :disabled="revertingSnapshotId === snapshot.snapshot_id"
          @click="emit('revert', snapshot)"
        >
          {{ revertingSnapshotId === snapshot.snapshot_id ? '回滚中' : '回滚' }}
        </button>
      </article>
    </div>
  </section>
</template>
