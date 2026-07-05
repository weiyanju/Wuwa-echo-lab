<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

import chevronDownIcon from '../../assets/icons/chevron-down.svg'
import helpCircleIcon from '../../assets/icons/help-circle.svg'
import {
  evaluationMetricDefinitions,
  modelBacktestNotes,
  modelOrder,
} from '../../data/modelPresentation.js'
import { formatPercent, formatSignedPercent } from '../../services/formatters.js'
import { ACTIVE_MODEL_WEIGHT_EPSILON } from '../../services/modelDetails.js'

const props = defineProps({
  evaluation: { type: Object, default: null },
  modelDetails: { type: Array, default: () => [] },
  prediction: { type: Object, default: null },
})

const modelInsightViews = ref({})
const selectedModelDetailKey = ref(null)
const collapsedModelDetailKeys = ref(new Set())
const hasManualModelDetailInteraction = ref(false)
const markovAxisDrag = ref(null)

const modelDetailByKey = computed(() => new Map(props.modelDetails.map((model) => [model.key, model])))
const evaluationMetrics = computed(() =>
  evaluationMetricDefinitions.map((metric) => ({
    ...metric,
    value: props.evaluation?.[metric.key],
  })),
)
const hitRateMetrics = computed(() => evaluationMetrics.value.filter((metric) => metric.label.includes('命中率')))
const technicalEvaluationMetrics = computed(() => evaluationMetrics.value.filter((metric) => !metric.label.includes('命中率')))
const evaluationReady = computed(() => props.evaluation?.status === 'ready')
const modelEvaluationRows = computed(() => {
  const rows = props.modelDetails.filter((model) => model?.key)
  const hitRates = rows.map((row) => row.hitRate).filter((value) => value != null)
  const bestHitRate = hitRates.length ? Math.max(...hitRates) : null
  const modelOrderByKey = new Map(modelOrder.map((key, index) => [key, index]))
  return rows
    .map((row) => {
      const weight = props.prediction?.weights?.[row.key] ?? { rule: 0.7, bayes: 0.1, markov: 0.1, cycle: 0.1, context: 0 }[row.key]
      const disabled = row.status === 'disabled' || weight <= ACTIVE_MODEL_WEIGHT_EPSILON
      return {
        key: row.key,
        label: row.title,
        hitRate: row.hitRate,
        loss: row.loss,
        evaluated: row.evaluated,
        note: modelBacktestNotes[row.key] || row.role,
        weight,
        disabled,
        statusLabel: row.statusLabel,
        modelOrder: modelOrderByKey.get(row.key) ?? 999,
        relativeHitRate: bestHitRate > 0 && row.hitRate != null ? row.hitRate / bestHitRate : 0,
        isBest: !disabled && evaluationReady.value && bestHitRate != null && row.hitRate === bestHitRate,
      }
    })
    .sort((a, b) => {
      if (a.disabled !== b.disabled) {
        return a.disabled ? 1 : -1
      }
      if (a.disabled && b.disabled) {
        return a.modelOrder - b.modelOrder
      }
      return (b.hitRate ?? -1) - (a.hitRate ?? -1)
    })
})
const modelBacktestSampleCount = computed(() => Math.max(...modelEvaluationRows.value.map((row) => row.evaluated || 0), 0))
const modelBacktestSummaryText = computed(() => (modelBacktestSampleCount.value ? `回测样本 ${modelBacktestSampleCount.value} 条` : '等待回测样本'))
const defaultExpandedModelDetailKey = computed(() => modelEvaluationRows.value.find((row) => !row.disabled)?.key || null)
const expandedModelDetailKey = computed(() => {
  const selectedKey = selectedModelDetailKey.value
  const selectedRow = modelEvaluationRows.value.find((row) => row.key === selectedKey)
  if (selectedKey && selectedRow && !collapsedModelDetailKeys.value.has(selectedKey)) {
    return selectedKey
  }
  if (hasManualModelDetailInteraction.value) {
    return null
  }
  const defaultKey = defaultExpandedModelDetailKey.value
  if (defaultKey && !collapsedModelDetailKeys.value.has(defaultKey)) {
    return defaultKey
  }
  return null
})

function iconMask(source) {
  return { '--icon-url': `url("${source}")` }
}

function evaluationMetricText(metric) {
  if (metric?.value == null) {
    return '样本不足'
  }
  if (metric.label.includes('命中率')) {
    return formatPercent(metric.value)
  }
  return metric.value.toFixed(2)
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
  if (!first || !last || first.value == null || last.value == null) {
    return '回测样本不足'
  }
  return `前五相对首选命中率提升 ${formatSignedPercent(last.value - first.value)}，`
}

function coverageMetricLabel(metric) {
  if (metric.key === 'top_1_hit_rate') {
    return '首选 · 第一候选'
  }
  if (metric.key === 'top_3_hit_rate') {
    return '前三 · 推荐参考'
  }
  return '前五 · 补充检查'
}

function calibrationSummaryText() {
  const logLoss = technicalEvaluationMetrics.value.find((metric) => metric.label === 'Log Loss')
  const brier = technicalEvaluationMetrics.value.find((metric) => metric.label === 'Brier Score')
  return `概率校准：Log Loss ${evaluationMetricText(logLoss)} · Brier ${evaluationMetricText(brier)}`
}

function modelMetricText(metric) {
  if (metric.type === 'percent') {
    return formatPercent(metric.value)
  }
  if (metric.type === 'signedPercent') {
    return formatSignedPercent(metric.value)
  }
  if (metric.type === 'decimal') {
    return Number(metric.value || 0).toFixed(2)
  }
  return `${Math.round(metric.value || 0)}`
}

function modelHitRateText(row) {
  return row.hitRate == null ? '样本不足' : formatPercent(row.hitRate)
}

function modelLossText(row) {
  return row.loss == null ? '样本不足' : row.loss.toFixed(2)
}

function modelProgressTitle(row) {
  if (row.hitRate == null || !modelEvaluationRows.value[0]?.hitRate) {
    return '回测样本不足，暂不显示相对命中率。'
  }
  return `仅表示相对命中率：${formatPercent(row.hitRate)} / ${formatPercent(modelEvaluationRows.value[0].hitRate)}`
}

function modelBarText(bar) {
  if (bar.type === 'percent') {
    return formatPercent(bar.value)
  }
  if (bar.type === 'signedPercent') {
    return formatSignedPercent(bar.value)
  }
  return `${Math.round(bar.value || 0)}`
}

function modelBarStyle(bar) {
  const width = Math.max(bar.value ? 5 : 0, Math.min((bar.width || 0) * 100, 100))
  return { width: `${width}%` }
}

function modelSegmentStyle(segment) {
  return { width: formatPercent(segment.value) }
}

function bayesContributionStyle(segment) {
  return { width: formatPercent(segment.value) }
}

function bayesSegmentRole(segment) {
  return segment.label === 'Exact' ? '主路径' : '泛化补充'
}

function bayesSegmentDescription(segment) {
  return segment.label === 'Exact'
    ? '历史里出现过同样走势，当前判断更有底。'
    : '完整片段不够时，用相似走势补充参考。'
}

function modelJudgementSummary(model) {
  if (model.key === 'bayes') {
    const exact = model.segments.find((segment) => segment.label === 'Exact')?.value ?? 0
    const wildcard = model.segments.find((segment) => segment.label === 'Wildcard')?.value ?? 0
    return exact >= wildcard
      ? '若当前走势和历史完整片段接近，则判断更有把握。'
      : '当前完整片段不够明显，会更多参考相似走势。'
  }
  if (model.key === 'rule') {
    return '副词条分布越偏离基线，修正力度越强。'
  }
  if (model.key === 'markov') {
    return '按录入顺序查看最近 12 条，重复越密集，冷却越强。'
  }
  if (model.key === 'cycle') {
    return '实时观察双爆窗口和普通副词条组的当前倾向。'
  }
  return '观察套装、COST、主词条类型和副词条位置是否会对副词条出词倾向产生影响。'
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

function modelInsightClass(model) {
  return [weightDiagnosticClass(model), `model-${model.key}`, model.status]
}

function toggleModelDetail(key) {
  hasManualModelDetailInteraction.value = true
  const nextCollapsed = new Set(collapsedModelDetailKeys.value)
  if (expandedModelDetailKey.value === key) {
    nextCollapsed.add(key)
    if (selectedModelDetailKey.value === key) {
      selectedModelDetailKey.value = null
    }
  } else {
    selectedModelDetailKey.value = key
    nextCollapsed.delete(key)
  }
  collapsedModelDetailKeys.value = nextCollapsed
}

function modelDetailListForKey(key) {
  const model = modelDetailByKey.value.get(key) || null
  return model ? [model] : []
}

function sequenceItemClass(item) {
  const type = item?.type || ''
  const typeClass = type ? `seq-type-${type.replaceAll('_', '-')}` : ''
  return {
    [typeClass]: Boolean(typeClass),
    'seq-crit': type.includes('crit'),
    'seq-attack': type.includes('atk') || type.includes('attack'),
    'seq-hp': type.includes('hp'),
    'seq-defense': type.includes('def'),
    'seq-energy': type.includes('energy'),
    'seq-damage': type.includes('damage') && !type.includes('crit'),
    overheated: item?.overheated,
  }
}

function markovAxisTrackStyle(model) {
  const nodeCount = model?.timelineNodes?.length || 1
  const nodeWidth = 184
  return {
    '--node-count': nodeCount,
    minWidth: `max(${nodeCount * nodeWidth + 112}px, 100%)`,
  }
}

function markovAxisKey(model) {
  return model?.timelineNodes?.map((item) => `${item.index}:${item.type}`).join('|') || 'empty'
}

function clampNumber(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max)
}

function contextCheckProgress(check) {
  return clampNumber((check?.sampleSize || 0) / Math.max(check?.recommended || 1, 1))
}

function contextOverallCheck(model) {
  return model?.contextChecks?.[0] || { sampleSize: 0, recommended: 3000 }
}

function contextOverallProgress(model) {
  return contextCheckProgress(contextOverallCheck(model))
}

function moveMarkovAxis(event) {
  if (!markovAxisDrag.value) {
    return
  }
  const drag = markovAxisDrag.value
  const deltaX = event.clientX - drag.startX
  drag.element.scrollLeft = drag.startScrollLeft - deltaX
  if (Math.abs(deltaX) > 3) {
    drag.moved = true
  }
}

function endMarkovAxisDrag() {
  if (!markovAxisDrag.value) {
    return
  }
  markovAxisDrag.value.element.classList.remove('dragging')
  markovAxisDrag.value = null
  document.removeEventListener('pointermove', moveMarkovAxis)
  document.removeEventListener('pointerup', endMarkovAxisDrag)
  document.removeEventListener('pointercancel', endMarkovAxisDrag)
}

function startMarkovAxisDrag(event) {
  if (event.button !== 0) {
    return
  }
  const element = event.currentTarget
  if (!element || element.scrollWidth <= element.clientWidth) {
    return
  }
  markovAxisDrag.value = {
    element,
    startX: event.clientX,
    startScrollLeft: element.scrollLeft,
    moved: false,
  }
  element.classList.add('dragging')
  element.setPointerCapture?.(event.pointerId)
  document.addEventListener('pointermove', moveMarkovAxis)
  document.addEventListener('pointerup', endMarkovAxisDrag)
  document.addEventListener('pointercancel', endMarkovAxisDrag)
  event.preventDefault()
}

function modelInsightView(model) {
  if (model.key === 'context' || model.key === 'rule') {
    return 'evidence'
  }
  return modelInsightViews.value[model.key] || 'distribution'
}

function setModelInsightView(model, view) {
  modelInsightViews.value = {
    ...modelInsightViews.value,
    [model.key]: view,
  }
}

function modelInsightTabs(model) {
  if (model.key === 'context' || model.key === 'rule') {
    return model.tabs.filter((tab) => tab.key === 'evidence')
  }
  return model.tabs
}

function modelShowsInsightTabs(model) {
  return modelInsightTabs(model).length > 0
}

function modelEvidenceNote(model, index) {
  const notes = {
    bayes: [
      '历史里出现过同样片段，说明这条走势更可靠。',
      '完整片段不够时，允许中间一步不同来找相似走势。',
      '样本少时会放缓判断，避免少量记录把结果带偏。',
    ],
    rule: [
      '比较实际出词和理论均分，判断哪些词条偏热或偏冷。',
      '只统计当前声骸真的可能出的副词条，避免无效选项干扰判断。',
      '偏离基线越远，修正力度越强。',
    ],
    markov: [
      '按录入顺序查看最近 12 条副词条。',
      '同一候选短时间内重复越多，越容易触发冷却。',
      '该子模型只负责降温，不会把冷门项主动抬高。',
    ],
    cycle: [
      '判断双爆现在是继续升温、单边偏向，还是进入冷却。',
      '观察普通副词条大类谁更可能接棒。',
      '在更可能接棒的大类里，进一步细分到具体词条。',
    ],
    context: [
      '记录声骸套装效果，如凝夜白霜、熔山裂谷、啸谷长风等。',
      '区分声骸 COST：COST 4 / COST 3 / COST 1。',
      '识别主词条类型，如暴击率、暴击伤害、攻击力、属性伤害等。',
      '标记副词条出现位置：第 1 / 2 / 3 / 4 / 5 条。',
    ],
  }
  return notes[model.key]?.[index] || model.chartNote
}

onBeforeUnmount(() => {
  endMarkovAxisDrag()
})
</script>

<template>
  <div class="evaluation-section-title backtest-section-title">
    <div>
      <h3>核心回测</h3>
    </div>
    <span class="evaluation-technical-meta">{{ calibrationSummaryText() }}</span>
  </div>

  <div class="evaluation-grid compact-evaluation-grid evaluation-chart-strip">
    <section class="evaluation-card chart-card">
      <div class="chart-heading chart-heading-stacked">
        <div>
          <div class="chart-title-row">
            <h3>预测范围命中率</h3>
          </div>
        </div>
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
    </section>

    <section class="evaluation-card model-backtest-card">
      <div class="chart-heading">
        <h3>子模型回测</h3>
        <span :title="modelBacktestSummaryText">{{ modelBacktestSummaryText }}</span>
      </div>
      <div class="model-bars-head">
        <span>模型</span>
        <span>命中率<span class="ui-line-icon evaluation-help-icon" :style="iconMask(helpCircleIcon)" title="单个子模型独立预测第一候选时的首选回测命中率，不是整体融合模型命中率。" aria-label="命中率说明" role="img"></span></span>
        <span>Loss<span class="ui-line-icon evaluation-help-icon" :style="iconMask(helpCircleIcon)" title="单个子模型独立回测的损失值，越低表示概率排序和真实结果越接近。" aria-label="Loss 说明" role="img"></span></span>
        <span></span>
      </div>
      <div class="model-bars">
        <article
          v-for="row in modelEvaluationRows"
          :key="row.key"
          :class="{ best: row.isBest, expanded: expandedModelDetailKey === row.key, disabled: row.disabled }"
          :title="row.evaluated ? `${row.label}基于 ${row.evaluated} 条样本回测` : `${row.label}等待回测样本`"
        >
          <div
            class="model-bar-summary"
            role="button"
            tabindex="0"
            :aria-expanded="expandedModelDetailKey === row.key"
            @click="toggleModelDetail(row.key)"
            @keydown.enter="toggleModelDetail(row.key)"
            @keydown.space.prevent="toggleModelDetail(row.key)"
          >
            <strong>
              {{ row.label }}
              <em v-if="row.isBest">最高命中</em>
              <em v-else-if="row.disabled" class="disabled-model-badge">{{ row.statusLabel || '未启用' }}</em>
            </strong>
            <small><span>{{ row.note }}</span></small>
            <span class="model-hit-rate">{{ modelHitRateText(row) }}</span>
            <span class="model-loss">{{ modelLossText(row) }}</span>
            <button
              class="model-expand-state"
              type="button"
              :aria-expanded="expandedModelDetailKey === row.key"
              :aria-label="expandedModelDetailKey === row.key ? `收起${row.label}详情` : `展开${row.label}详情`"
              :title="expandedModelDetailKey === row.key ? '收起' : '展开'"
              @click.stop="toggleModelDetail(row.key)"
            >
              <span class="ui-line-icon model-expand-chevron" :style="iconMask(chevronDownIcon)" aria-hidden="true"></span>
            </button>
          </div>
          <i class="model-row-progress" :title="modelProgressTitle(row)">
            <b :style="{ width: row.hitRate == null ? '0%' : `${Math.max(row.relativeHitRate * 92, 8)}%` }"></b>
          </i>
          <Transition name="model-row-detail">
            <div v-if="expandedModelDetailKey === row.key" class="model-row-detail" @click.stop>
              <article
                v-for="model in modelDetailListForKey(row.key)"
                :key="model.key"
                class="model-insight-card inline-model-insight"
                :class="modelInsightClass(model)"
              >
                <div v-if="modelShowsInsightTabs(model)" class="model-insight-tabs" role="tablist" :aria-label="`${model.title} 展示模式`">
                  <button
                    v-for="tab in modelInsightTabs(model)"
                    :key="tab.key"
                    type="button"
                    :class="{ active: modelInsightView(model) === tab.key }"
                    @click="setModelInsightView(model, tab.key)"
                  >
                    {{ tab.label }}
                  </button>
                </div>

                <div class="model-insight-body">
                  <section v-if="modelInsightView(model) === 'distribution'" class="model-insight-chart" :class="`model-chart-${model.key}`">
                    <p class="model-judgement-summary">{{ modelJudgementSummary(model) }}</p>

                    <div v-if="model.key === 'bayes'" class="bayes-contribution-chart">
                      <div class="bayes-contribution-labels">
                        <span
                          v-for="segment in model.segments"
                          :key="`${segment.label}-label`"
                          :class="{ primary: segment.label === 'Exact', secondary: segment.label !== 'Exact' }"
                        >
                          {{ segment.label }} {{ formatPercent(segment.value) }}
                        </span>
                      </div>
                      <div class="bayes-contribution-bar" aria-hidden="true">
                        <i
                          v-for="segment in model.segments"
                          :key="`${segment.label}-bar`"
                          :class="{ primary: segment.label === 'Exact', secondary: segment.label !== 'Exact' }"
                          :style="bayesContributionStyle(segment)"
                        ></i>
                      </div>
                      <div class="bayes-path-list">
                        <article
                          v-for="segment in model.segments"
                          :key="segment.label"
                          :class="{ primary: segment.label === 'Exact', secondary: segment.label !== 'Exact' }"
                        >
                          <div class="bayes-path-nodes">
                            <span>A</span><i>→</i><span>{{ segment.label === 'Wildcard' ? '?' : 'B' }}</span><i>→</i><span>C</span>
                          </div>
                          <div class="bayes-path-copy">
                            <div>
                              <strong>{{ segment.label }}</strong>
                              <span>{{ bayesSegmentRole(segment) }}</span>
                            </div>
                            <p>{{ bayesSegmentDescription(segment) }}</p>
                            <i aria-hidden="true"><b :style="bayesContributionStyle(segment)"></b></i>
                          </div>
                        </article>
                      </div>
                    </div>

                    <div v-if="model.windows.length" class="cycle-window-grid">
                      <article
                        v-for="window in model.windows"
                        :key="window.key"
                        :class="[window.tone, { featured: window.key === 'double' }]"
                      >
                        <div class="cycle-window-card-body">
                          <span>{{ window.label }}</span>
                          <strong>{{ formatPercent(window.value) }}</strong>
                          <i><b :style="{ width: formatPercent(window.value) }"></b></i>
                        </div>
                      </article>
                    </div>

                    <div
                      v-if="model.segments.length && model.key !== 'bayes'"
                      class="model-segment-strip"
                      :class="`model-segment-strip-${model.key}`"
                    >
                      <div v-for="segment in model.segments" :key="segment.label" :style="modelSegmentStyle(segment)">
                        <span>{{ segment.label }}</span>
                        <strong>{{ formatPercent(segment.value) }}</strong>
                      </div>
                    </div>

                    <div v-if="model.key === 'markov' && model.timelineNodes.length" :key="markovAxisKey(model)" class="markov-axis-shell">
                      <div class="markov-axis-chart" @pointerdown="startMarkovAxisDrag">
                        <div class="markov-legend-row" aria-hidden="true">
                          <div class="markov-axis-legend">
                            <span><i class="normal-dot"></i>普通记录</span>
                            <span><i class="hot-dot"></i>触发冷却</span>
                          </div>
                        </div>
                        <div class="markov-axis-track" :style="markovAxisTrackStyle(model)">
                          <div class="markov-axis-line" aria-hidden="true"></div>
                          <div
                            v-for="item in model.timelineNodes"
                            :key="`${item.type}-${item.index}`"
                            class="markov-axis-node"
                            :class="[sequenceItemClass(item), item.track]"
                          >
                            <i></i>
                            <div class="markov-node-label">
                              <strong>{{ item.label }}</strong>
                              <span>#{{ item.index + 1 }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="markov-time-legend" aria-hidden="true"><b></b></div>
                    </div>

                    <div v-if="model.key === 'context'" class="context-check-grid" aria-label="上下文监测条件">
                      <div class="context-overall-progress">
                        <div>
                          <span>上下文样本</span>
                          <strong>{{ contextOverallCheck(model).sampleSize }} / {{ contextOverallCheck(model).recommended }}</strong>
                        </div>
                        <i aria-hidden="true"><b :style="{ width: formatPercent(contextOverallProgress(model)) }"></b></i>
                      </div>
                      <div class="context-check-head"><span>观测维度</span><span>状态</span></div>
                      <article
                        v-for="check in model.contextChecks"
                        :key="check.key"
                        class="context-check-row"
                        :class="check.status"
                        :title="check.label"
                      >
                        <strong class="context-check-name">{{ check.label }}</strong>
                        <span class="context-check-state">纳入观察</span>
                      </article>
                    </div>

                    <div v-if="model.key === 'markov' && model.penaltyBars.length" class="markov-penalty-grid">
                      <article v-for="bar in model.penaltyBars" :key="bar.key" :class="bar.tone">
                        <span>{{ bar.label }}</span>
                        <strong>{{ formatPercent(bar.value) }}</strong>
                        <small>{{ bar.caption }}</small>
                      </article>
                    </div>

                    <div v-if="model.key === 'cycle' && model.groupBars.length" class="model-group-bars">
                      <div v-for="bar in model.groupBars" :key="bar.key" :class="bar.tone">
                        <label><span>{{ bar.label }}</span><strong>{{ modelBarText(bar) }}</strong></label>
                        <i><b :style="modelBarStyle(bar)"></b></i>
                      </div>
                    </div>
                  </section>

                  <section v-else-if="modelInsightView(model) === 'evidence'" class="model-evidence-panel">
                    <p class="model-judgement-summary">{{ model.detail }}</p>
                    <ul>
                      <li v-for="(item, index) in model.evidence" :key="item">
                        <strong>{{ item }}</strong>
                        <span>{{ modelEvidenceNote(model, index) }}</span>
                      </li>
                    </ul>
                  </section>

                  <aside class="model-insight-side">
                    <div class="model-side-status-row">
                      <span class="model-side-status">{{ model.statusLabel }}</span>
                      <small>基础 {{ formatPercent(model.baseWeight) }}</small>
                    </div>
                    <section class="model-side-block">
                      <span class="model-side-title">
                        关键参数
                        <span class="ui-line-icon evaluation-help-icon" :style="iconMask(helpCircleIcon)" title="该子模型当前用于判断的核心参数，帮助解释模型内部依据；不是最终融合概率。" aria-label="关键参数说明" role="img"></span>
                      </span>
                      <div class="model-metric-grid">
                        <div v-for="metric in model.metrics" :key="metric.label">
                          <span>{{ metric.label }}</span>
                          <strong>{{ modelMetricText(metric) }}</strong>
                        </div>
                      </div>
                    </section>
                    <footer class="model-weight-change">
                      <span class="model-side-title">权重变化</span>
                      <template v-if="model.adjustment?.hit_rate != null">
                        当前模型命中 {{ formatPercent(model.adjustment.hit_rate) }}，权重{{ model.adjustment.direction === 'up' ? '上调' : model.adjustment.direction === 'down' ? '下调' : '持平' }}
                      </template>
                      <template v-else>当前阶段样本不足，维持基础权重。</template>
                    </footer>
                  </aside>
                </div>
              </article>
            </div>
          </Transition>
        </article>
      </div>
    </section>
  </div>
</template>
