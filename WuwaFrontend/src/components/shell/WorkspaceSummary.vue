<script setup>
import { computed } from 'vue'

import { confidenceText } from '../../services/formatters.js'
import { EMPTY_METRIC_TEXT, sampleTotal } from '../../shared/sampleExperience.js'

const props = defineProps({
  historyCount: { type: Number, default: 0 },
  totalSamples: { type: Number, default: null },
  confidence: { type: [String, Number], default: null },
  historyDelta: { type: Number, default: 0 },
  sampleDelta: { type: Number, default: 0 },
  busy: { type: Boolean, default: false },
  requestStatus: { type: String, default: 'idle' },
})

const dataLoading = computed(() => props.busy || (props.totalSamples === null && props.requestStatus === 'loading'))
const dataFailed = computed(() => !dataLoading.value && props.totalSamples === null && props.requestStatus === 'error')
const totalDisplay = computed(() => sampleTotal(props.totalSamples))
const confidenceDisplay = computed(() => (
  totalDisplay.value === 0 || props.confidence === null
    ? EMPTY_METRIC_TEXT
    : confidenceText(props.confidence)
))
</script>

<template>
  <section class="hero-band compact">
    <div><h1>你好，漂泊者</h1></div>
    <div class="hero-stats">
      <div class="hero-stat hero-stat-with-delta">
        <strong>{{ historyCount }}</strong>
        <Transition name="metric-delta"><em v-if="historyDelta" class="metric-delta-badge">+{{ historyDelta }}</em></Transition>
        <span>历史声骸</span>
      </div>
      <div class="hero-stat hero-stat-with-delta">
        <span v-if="dataLoading" class="hero-metric-skeleton" aria-label="总样本加载中"></span>
        <strong v-else-if="dataFailed" class="hero-metric-error">加载失败</strong>
        <strong v-else>{{ totalDisplay }}</strong>
        <Transition name="metric-delta"><em v-if="sampleDelta" class="metric-delta-badge">+{{ sampleDelta }}</em></Transition>
        <span>总样本</span>
      </div>
      <div class="hero-stat">
        <span v-if="dataLoading" class="hero-metric-skeleton" aria-label="置信度加载中"></span>
        <strong v-else-if="dataFailed" class="hero-metric-error">加载失败</strong>
        <strong
          v-else
          class="hero-confidence-value"
          :class="{ 'metric-placeholder': confidenceDisplay === EMPTY_METRIC_TEXT }"
          :aria-label="confidenceDisplay === EMPTY_METRIC_TEXT ? '置信度尚未形成' : `置信度${confidenceDisplay}`"
        >{{ confidenceDisplay }}</strong>
        <span>置信度</span>
      </div>
    </div>
  </section>
</template>
