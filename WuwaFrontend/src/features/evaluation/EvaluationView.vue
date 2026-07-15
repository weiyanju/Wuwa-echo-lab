<script setup>
import { computed } from 'vue'

import InsightRequestState from '../../components/states/InsightRequestState.vue'
import { formatPercent } from '../../services/formatters.js'
import {
  EMPTY_METRIC_TEXT,
  evaluationReadinessState,
  formatOptionalMetric,
  sampleMaturityState,
  sampleStageState,
  sampleTotal,
} from '../../shared/sampleExperience.js'
import EvaluationBacktest from './EvaluationBacktest.vue'
import EvaluationCoreBacktest from './EvaluationCoreBacktest.vue'
import EvaluationOverview from './EvaluationOverview.vue'
import EvaluationReadinessState from './EvaluationReadinessState.vue'

const props = defineProps({
  evaluation: { type: Object, default: null },
  modelDetails: { type: Array, default: () => [] },
  prediction: { type: Object, default: null },
  stats: { type: Object, default: null },
  requestStatus: { type: String, default: 'idle' },
})
const emit = defineEmits(['retry', 'start-recording'])

const totalSamples = computed(() => sampleTotal(props.stats))
const maturity = computed(() => sampleMaturityState(totalSamples.value))
const stage = computed(() => sampleStageState(totalSamples.value))
const readiness = computed(() => evaluationReadinessState(props.evaluation))
const topThreeText = computed(() => (
  readiness.value.ready
    ? formatOptionalMetric(props.evaluation?.top_3_hit_rate, (value) => formatPercent(value))
    : EMPTY_METRIC_TEXT
))
</script>

<template>
  <section
    class="product-panel full-panel evaluation-panel"
    :class="{ 'evaluation-panel--empty': evaluation && !readiness.ready }"
  >
    <header class="evaluation-status-bar">
      <h2>模型评估</h2>
      <div v-if="stats" class="page-summary-chips" role="group" aria-label="评估摘要">
        <span class="page-summary-chip" :class="maturity.hasSamples ? 'page-summary-chip--state' : 'page-summary-chip--neutral'">
          <i v-if="maturity.hasSamples" aria-hidden="true"></i>{{ maturity.label }}
        </span>
        <span v-if="maturity.hasSamples" class="page-summary-chip">
          <small>阶段</small><span class="page-summary-chip__value">{{ stage.rangeLabel }}</span>
        </span>
        <span v-if="maturity.hasSamples" class="page-summary-chip">
          <small>前三命中</small>
          <span
            class="page-summary-chip__value"
            :class="{ 'page-summary-chip__value--empty': topThreeText === EMPTY_METRIC_TEXT }"
            :aria-label="topThreeText === EMPTY_METRIC_TEXT ? '前三命中率尚未形成' : `前三命中率${topThreeText}`"
          >{{ topThreeText }}</span>
        </span>
      </div>
    </header>

    <InsightRequestState
      v-if="!evaluation"
      :status="requestStatus === 'error' ? 'error' : 'loading'"
      title="正在读取模型评估"
      description="模型评估加载失败，请重新加载。"
      @retry="emit('retry')"
    />

    <div v-else-if="readiness.ready" class="evaluation-module-stack">
      <EvaluationCoreBacktest :evaluation="evaluation" />
      <EvaluationOverview :evaluation="evaluation" :model-details="modelDetails" :prediction="prediction" />
      <EvaluationBacktest :evaluation="evaluation" :model-details="modelDetails" :prediction="prediction" />
    </div>

    <EvaluationReadinessState
      v-else-if="evaluation"
      @start-recording="emit('start-recording')"
    />
  </section>
</template>
