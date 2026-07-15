<script setup>
import { computed } from 'vue'

import { evaluationMetricDefinitions } from '../../data/modelPresentation.js'
import { formatPercent, sampleStageText } from '../../services/formatters.js'
import EvaluationBacktest from './EvaluationBacktest.vue'
import EvaluationCoreBacktest from './EvaluationCoreBacktest.vue'
import EvaluationOverview from './EvaluationOverview.vue'

const props = defineProps({
  evaluation: { type: Object, default: null },
  modelDetails: { type: Array, default: () => [] },
  prediction: { type: Object, default: null },
  stats: { type: Object, default: null },
})

const topThreeMetric = computed(() => {
  const definition = evaluationMetricDefinitions.find((metric) => metric.key === 'top_3_hit_rate')
  return { ...definition, value: props.evaluation?.top_3_hit_rate }
})

function evaluationMetricText(metric) {
  return metric?.value == null ? '样本不足' : formatPercent(metric.value)
}

function evaluationStatusText() {
  if (props.evaluation && props.evaluation.status !== 'ready') return '样本不足'
  const total = props.stats?.total_rolls || 0
  if (total >= 3000) return '稳定'
  if (total >= 500) return '可参考'
  return '观察中'
}
</script>

<template>
  <section class="product-panel full-panel evaluation-panel">
    <header class="evaluation-status-bar">
      <h2>模型评估</h2>
      <div class="evaluation-status-chips" aria-label="评估摘要">
        <span class="evaluation-status-chip state"><i aria-hidden="true"></i>{{ evaluationStatusText() }}</span>
        <span class="evaluation-status-chip"><small>阶段</small>{{ stats ? sampleStageText(stats.sample_stage).split('：')[0] : '等待样本' }}</span>
        <span class="evaluation-status-chip"><small>前三命中</small>{{ evaluationMetricText(topThreeMetric) }}</span>
      </div>
    </header>

    <div class="evaluation-module-stack">
      <EvaluationCoreBacktest :evaluation="evaluation" />
      <EvaluationOverview :evaluation="evaluation" :model-details="modelDetails" :prediction="prediction" />
      <EvaluationBacktest :evaluation="evaluation" :model-details="modelDetails" :prediction="prediction" />
    </div>
  </section>
</template>
