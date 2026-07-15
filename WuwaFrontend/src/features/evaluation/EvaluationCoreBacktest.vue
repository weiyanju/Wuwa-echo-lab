<script setup>
import { computed } from 'vue'

import { evaluationMetricDefinitions } from '../../data/modelPresentation.js'
import { formatPercent, formatSignedPercent } from '../../services/formatters.js'

const props = defineProps({
  evaluation: { type: Object, default: null },
})

const evaluationMetrics = computed(() =>
  evaluationMetricDefinitions.map((metric) => ({
    ...metric,
    value: props.evaluation?.[metric.key],
  })),
)
const hitRateMetrics = computed(() => evaluationMetrics.value.filter((metric) => metric.label.includes('命中率')))
const technicalEvaluationMetrics = computed(() => evaluationMetrics.value.filter((metric) => !metric.label.includes('命中率')))
const evaluationReady = computed(() => props.evaluation?.status === 'ready')

function evaluationMetricText(metric) {
  if (metric?.value == null) return '样本不足'
  return metric.label.includes('命中率') ? formatPercent(metric.value) : metric.value.toFixed(2)
}

function coverageNodePosition(index) {
  return [10, 50, 90][index] ?? 50
}

function coverageNodeClass(index) {
  return ['start', 'middle', 'end'][index] || ''
}

function coverageGainText(metrics) {
  const first = metrics[0]
  const last = metrics.at(-1)
  if (!first || !last || first.value == null || last.value == null) return '回测样本不足'
  return `前五相对首选命中率提升 ${formatSignedPercent(last.value - first.value)}`
}

function coverageMetricLabel(metric) {
  if (metric.key === 'top_1_hit_rate') return '首选 · 第一候选'
  if (metric.key === 'top_3_hit_rate') return '前三 · 推荐参考'
  return '前五 · 补充检查'
}

function calibrationSummaryText() {
  const logLoss = technicalEvaluationMetrics.value.find((metric) => metric.label === 'Log Loss')
  const brier = technicalEvaluationMetrics.value.find((metric) => metric.label === 'Brier Score')
  return `概率校准：Log Loss ${evaluationMetricText(logLoss)} · Brier ${evaluationMetricText(brier)}`
}
</script>

<template>
  <section class="evaluation-card evaluation-module evaluation-core-module">
    <header class="evaluation-module-header">
      <h3>核心回测</h3>
      <span class="evaluation-technical-meta">{{ calibrationSummaryText() }}</span>
    </header>

    <div class="evaluation-core-content">
      <div class="chart-heading chart-heading-stacked">
        <h4>预测范围命中率</h4>
      </div>
      <div
        class="coverage-band-chart"
        role="img"
        aria-label="首选到前五预测范围命中率"
        title="首选表示第一候选；前三表示推荐参考；前五表示补充检查。"
      >
        <div class="coverage-band-track" aria-hidden="true">
          <span class="coverage-band-fill"></span>
          <i
            v-for="(metric, index) in hitRateMetrics"
            :key="metric.label"
            class="coverage-band-node"
            :class="coverageNodeClass(index)"
            :style="{ left: `${coverageNodePosition(index)}%` }"
          ></i>
        </div>
        <div class="coverage-labels">
          <article
            v-for="(metric, index) in hitRateMetrics"
            :key="metric.label"
            :title="`${metric.label} ${evaluationMetricText(metric)}`"
            :style="{ left: `${coverageNodePosition(index)}%` }"
          >
            <strong>{{ evaluationMetricText(metric) }}</strong>
            <span>{{ coverageMetricLabel(metric) }}</span>
          </article>
        </div>
        <div class="coverage-gain-note">
          <strong>{{ coverageGainText(hitRateMetrics) }}</strong>
          <span>{{ evaluationReady ? '前三适合作为推荐参考，前五适合做补充检查。' : '积累更多副词条记录后自动计算。' }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
