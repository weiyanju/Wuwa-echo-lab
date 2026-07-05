<script setup>
import { computed, ref } from 'vue'

import {
  canonicalModelLabels,
  evaluationMetricDefinitions,
} from '../../data/modelPresentation.js'
import { formatPercent, modelWeightLabel, sampleStageText } from '../../services/formatters.js'
import { ACTIVE_MODEL_WEIGHT_EPSILON } from '../../services/modelDetails.js'

const props = defineProps({
  evaluation: { type: Object, default: null },
  modelDetails: { type: Array, default: () => [] },
  prediction: { type: Object, default: null },
  stats: { type: Object, default: null },
})

const highlightedSummaryModelKey = ref(null)

function canonicalModelLabel(key, fallback) {
  return canonicalModelLabels[key] || fallback || modelWeightLabel(key)
}

const modelDetailSummary = computed(() => props.modelDetails.summary || {})
const modelDetailByKey = computed(() => new Map(props.modelDetails.map((model) => [model.key, model])))
const weightRows = computed(() =>
  Object.entries(props.prediction?.weights || {}).map(([key, weight]) => {
    const disabled = weight <= ACTIVE_MODEL_WEIGHT_EPSILON || modelDetailByKey.value.get(key)?.status === 'disabled'
    return {
      key,
      label: canonicalModelLabel(key, props.prediction?.model_labels?.[key]),
      weight,
      baseWeight: props.prediction?.base_weights?.[key],
      adjustment: props.prediction?.weight_adjustments?.[key] || null,
      disabled,
      statusLabel: disabled ? '未启用' : weightDiagnosticText({ weight }),
      statusTitle: disabled ? '样本不足，暂未参与融合' : `当前参与融合，权重 ${formatPercent(weight)}`,
    }
  }),
)
const evaluationMetrics = computed(() =>
  evaluationMetricDefinitions.map((metric) => ({
    ...metric,
    value: props.evaluation?.[metric.key],
  })),
)

function evaluationMetricText(metric) {
  if (metric?.value == null) {
    return '样本不足'
  }
  if (metric.label.includes('命中率')) {
    return formatPercent(metric.value)
  }
  return metric.value.toFixed(2)
}

function evaluationStatusText() {
  if (props.evaluation && props.evaluation.status !== 'ready') {
    return '样本不足'
  }
  const total = props.stats?.total_rolls || 0
  if (total >= 3000) {
    return '稳定'
  }
  if (total >= 500) {
    return '可参考'
  }
  return '观察中'
}

function percentPosition(value) {
  return `${Math.min(Math.max((value ?? 0) * 100, 0), 100)}%`
}

function fusionWeightTooltip(row) {
  if (row.disabled) {
    return `${row.label}：${row.statusTitle}`
  }
  const baseText = `基础 ${formatPercent(row.baseWeight)}`
  const directionText = row.adjustment?.direction === 'up'
    ? '上调'
    : row.adjustment?.direction === 'down'
      ? '下调'
      : '持平'
  return `${baseText} · ${directionText}至 ${formatPercent(row.weight)}`
}

const evaluationSummaryParts = computed(() => {
  const activeRows = weightRows.value
    .filter((row) => (row.weight ?? 0) > ACTIVE_MODEL_WEIGHT_EPSILON)
    .sort((left, right) => (right.weight ?? 0) - (left.weight ?? 0))
  const dominantKey = modelDetailSummary.value.dominantModel || activeRows[0]?.key || null
  const diagnosticAuxiliaryKeys = modelDetailSummary.value.auxiliaryModels || []
  const auxiliaryKeys = diagnosticAuxiliaryKeys.length
    ? diagnosticAuxiliaryKeys
    : activeRows
      .filter((row) => row.key !== dominantKey)
      .slice(0, 2)
      .map((row) => row.key)
  const dominantLabel = dominantKey
    ? canonicalModelLabel(dominantKey, modelDetailSummary.value.dominantLabel)
    : modelDetailSummary.value.dominantLabel || '暂无主导模型'
  const auxiliaries = auxiliaryKeys.length
    ? auxiliaryKeys.map((key, index) => ({
      key,
      label: canonicalModelLabel(key, modelDetailSummary.value.auxiliaryLabels?.[index]),
      weight: props.prediction?.weights?.[key] ?? null,
    }))
    : [{ key: null, label: modelDetailSummary.value.auxiliaryLabels?.[0] || '暂无辅助信号', weight: null }]
  return {
    dominant: {
      key: dominantKey,
      label: dominantLabel,
      weight: props.prediction?.weights?.[dominantKey] ?? null,
    },
    auxiliaries,
    motionKey: [
      dominantKey || 'none',
      ...auxiliaries.map((model) => model.key || model.label),
      evaluationStatusText(),
    ].join(':'),
  }
})

function setSummaryModelHighlight(key) {
  highlightedSummaryModelKey.value = key
}

function clearSummaryModelHighlight() {
  highlightedSummaryModelKey.value = null
}

function weightDiagnosticClass(row) {
  if (row?.disabled) {
    return 'disabled'
  }
  if ((row?.weight ?? 0) >= 0.35) {
    return 'hot'
  }
  if ((row?.weight ?? 0) <= 0.05) {
    return 'warn'
  }
  return 'cool'
}

function weightDiagnosticText(row) {
  if ((row?.weight ?? 0) <= ACTIVE_MODEL_WEIGHT_EPSILON) {
    return '未启用'
  }
  if ((row?.weight ?? 0) >= 0.35) {
    return '主导'
  }
  if ((row?.weight ?? 0) <= 0.05) {
    return '低权重'
  }
  return '参与'
}
</script>

<template>
  <div class="evaluation-status-bar">
    <h2>模型评估</h2>
    <div class="evaluation-status-chips" aria-label="评估摘要">
      <span class="evaluation-status-chip state">
        <i aria-hidden="true"></i>
        {{ evaluationStatusText() }}
      </span>
      <span class="evaluation-status-chip">
        <small>阶段</small>
        {{ stats ? sampleStageText(stats.sample_stage).split('：')[0] : '等待样本' }}
      </span>
      <span class="evaluation-status-chip">
        <small>前三命中</small>
        {{ evaluationMetricText(evaluationMetrics[3]) }}
      </span>
    </div>
  </div>

  <div class="evaluation-section-title">
    <div>
      <h3>当前融合权重</h3>
    </div>
    <div class="fusion-title-tools">
      <div class="fusion-shared-legend" aria-label="融合权重图例">
        <small>标记说明</small>
        <span title="当前权重：当前融合后用于最终概率的模型贡献"><i class="legend-current-line"></i>当前权重</span>
        <span title="基础权重：低样本阶段的默认初始权重"><i class="legend-base-line"></i>基础权重</span>
      </div>
      <span class="fusion-live-pill">{{ prediction ? '实时' : '预览' }}</span>
    </div>
  </div>

  <div class="fusion-weight-grid">
    <article
      v-for="row in weightRows"
      :key="row.key"
      :class="[weightDiagnosticClass(row), { 'summary-linked': highlightedSummaryModelKey === row.key }]"
      class="fusion-weight-card"
      :title="fusionWeightTooltip(row)"
    >
      <div>
        <span>{{ row.label }}<em v-if="row.disabled" class="fusion-disabled-badge">{{ row.statusLabel }}</em></span>
        <strong>{{ formatPercent(row.weight) }}</strong>
      </div>
      <i
        class="fusion-weight-track"
        :aria-label="fusionWeightTooltip(row)"
      >
        <b :style="{ width: formatPercent(row.weight) }" :title="`当前 ${formatPercent(row.weight)}`"></b>
        <span
          class="weight-marker base-marker"
          :style="{ left: percentPosition(row.baseWeight) }"
          :title="`基础 ${formatPercent(row.baseWeight)}`"
        ></span>
      </i>
    </article>
  </div>

  <section
    class="evaluation-summary-line"
    :class="evaluationSummaryParts.dominant.key ? `summary-dominant-${evaluationSummaryParts.dominant.key}` : ''"
  >
    <span class="evaluation-summary-kicker">结论摘要</span>
    <strong :key="evaluationSummaryParts.motionKey" class="evaluation-summary-copy">
      当前由<span
        class="summary-model-link summary-model-link-dominant"
        :class="{ active: evaluationSummaryParts.dominant.key && highlightedSummaryModelKey === evaluationSummaryParts.dominant.key }"
        :tabindex="evaluationSummaryParts.dominant.key ? 0 : -1"
        :title="`定位到${evaluationSummaryParts.dominant.label}`"
        @mouseenter="setSummaryModelHighlight(evaluationSummaryParts.dominant.key)"
        @mouseleave="clearSummaryModelHighlight"
        @focus="setSummaryModelHighlight(evaluationSummaryParts.dominant.key)"
        @blur="clearSummaryModelHighlight"
      >{{ evaluationSummaryParts.dominant.label }}</span>主导，<template v-for="(model, index) in evaluationSummaryParts.auxiliaries" :key="`${model.key || model.label}-${index}`"><span
          class="summary-model-link summary-model-link-auxiliary"
          :class="{ active: model.key && highlightedSummaryModelKey === model.key }"
          :tabindex="model.key ? 0 : -1"
          :title="`定位到${model.label}`"
          @mouseenter="setSummaryModelHighlight(model.key)"
          @mouseleave="clearSummaryModelHighlight"
          @focus="setSummaryModelHighlight(model.key)"
          @blur="clearSummaryModelHighlight"
        >{{ model.label }}</span><template v-if="index < evaluationSummaryParts.auxiliaries.length - 1"> / </template></template>作为辅助。
    </strong>
  </section>
</template>
