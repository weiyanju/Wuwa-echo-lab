<script setup>
import { computed } from 'vue'

import { formatPercent, formatSignedPercent } from '../../services/formatters.js'
import { getCoverageScale } from './coverageScale.js'

const props = defineProps({ evaluation: { type: Object, default: null } })

const hitRateRows = computed(() => {
  const top1 = props.evaluation?.top_1_hit_rate
  const top3 = props.evaluation?.top_3_hit_rate
  const top5 = props.evaluation?.top_5_hit_rate

  return [
    { key: 'top1', label: '首选', code: 'Top1', value: top1, delta: null, deltaFrom: null },
    { key: 'top3', label: '前三', code: 'Top3', value: top3, delta: metricDelta(top3, top1), deltaFrom: '首选' },
    { key: 'top5', label: '前五', code: 'Top5', value: top5, delta: metricDelta(top5, top3), deltaFrom: '前三' },
  ]
})

const coverageScale = computed(() =>
  getCoverageScale(hitRateRows.value.map((row) => row.value)),
)

const calibrationMetrics = computed(() => [
  { label: 'Log Loss', value: props.evaluation?.log_loss },
  { label: 'Brier Score', value: props.evaluation?.brier_score },
])

const coverageAriaLabel = computed(() =>
  hitRateRows.value
    .map((row) => `${row.label} ${metricText(row.value)}`)
    .join('，'),
)

function metricDelta(current, previous) {
  return Number.isFinite(current) && Number.isFinite(previous)
    ? current - previous
    : null
}

function metricText(value) {
  return Number.isFinite(value) ? formatPercent(value) : '--'
}

function calibrationText(value) {
  return Number.isFinite(value) ? value.toFixed(2) : '--'
}

function coverageWidth(row) {
  if (!Number.isFinite(row.value) || coverageScale.value.max <= 0) return '0%'
  return formatPercent(Math.min(Math.max(row.value / coverageScale.value.max, 0), 1))
}

function deltaText(row) {
  return Number.isFinite(row.delta)
    ? formatSignedPercent(row.delta)
    : '--'
}

function deltaAriaLabel(row) {
  return `相对${row.deltaFrom}新增 ${formatSignedPercent(row.delta)}`
}
</script>

<template>
  <section class="evaluation-card evaluation-module evaluation-core-module">
    <header class="evaluation-module-header core-header">
      <h3>核心回测</h3>
      <dl class="calibration-metrics" aria-label="概率校准指标">
        <div v-for="metric in calibrationMetrics" :key="metric.label">
          <dt>{{ metric.label }}</dt>
          <dd>{{ calibrationText(metric.value) }}</dd>
        </div>
      </dl>
    </header>

    <div
      class="coverage-comparison"
      role="img"
      :aria-label="coverageAriaLabel"
    >
      <div class="coverage-axis" aria-hidden="true">
        <span></span>
        <div>
          <span v-for="tick in coverageScale.ticks" :key="tick">
            {{ formatPercent(tick, 0) }}
          </span>
        </div>
        <span></span>
      </div>

      <div
        v-for="row in hitRateRows"
        :key="row.key"
        class="coverage-row"
        :title="`${row.code} ${metricText(row.value)}`"
      >
        <div class="coverage-name">
          <strong>{{ row.label }}</strong>
          <span>{{ row.code }}</span>
        </div>
        <div class="coverage-bar" aria-hidden="true">
          <span class="coverage-bar-fill" :style="{ width: coverageWidth(row) }"></span>
        </div>
        <div class="coverage-value">
          <strong>{{ metricText(row.value) }}</strong>
          <span
            v-if="row.delta != null"
            class="coverage-delta"
            :aria-label="deltaAriaLabel(row)"
          >{{ deltaText(row) }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
