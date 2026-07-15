<script setup>
import { computed } from 'vue'

import InsightRequestState from '../../components/states/InsightRequestState.vue'
import SampleReadinessPanel from '../../components/states/SampleReadinessPanel.vue'
import { formatPercent, formatSignedPercentagePoints, sampleStageText } from '../../services/formatters.js'
import { hasRecordedSamples, sampleMaturityState, sampleStageState } from '../../shared/sampleExperience.js'
import {
  buildSampleStageProgress,
  buildSampleStageAxisRows,
  buildSortedStatFrequency,
  statDiagnosticClass,
  statsReliabilityNote,
} from './presentation.js'
import SampleStageAxis from './SampleStageAxis.vue'

const props = defineProps({
  stats: { type: Object, default: null },
  requestStatus: { type: String, default: 'idle' },
})
const emit = defineEmits(['retry', 'start-recording'])

const sortedStatFrequency = computed(() => buildSortedStatFrequency(props.stats))
const maxAbsStatDeviation = computed(() => Math.max(...sortedStatFrequency.value.map((row) => row.absDeviation), 0.01))
const hottestStatRow = computed(() => sortedStatFrequency.value.find((row) => row.deviation > 0) || null)
const coldestStatRow = computed(() => sortedStatFrequency.value.find((row) => row.deviation < 0) || null)
const totalSamples = computed(() => props.stats?.total_rolls || 0)
const hasSamples = computed(() => hasRecordedSamples(props.stats))
const maturity = computed(() => sampleMaturityState(totalSamples.value))
const stage = computed(() => sampleStageState(totalSamples.value))
const statisticsContextText = computed(() => (
  hasSamples.value
    ? statsReliabilityNote(totalSamples.value)
    : '尚无样本。录入第一条副词条后开始生成个人分布。'
))
const sampleStageStatus = computed(() => buildSampleStageProgress(totalSamples.value))
const sampleStageProgress = computed(() => sampleStageStatus.value.axisProgress)
const sampleStageAxisRows = computed(() => buildSampleStageAxisRows(totalSamples.value))
const sampleStageSegmentRows = computed(() => sampleStageAxisRows.value.filter((stage) => stage.showCaption))
const sampleStageDriverText = computed(() => {
  const text = sampleStageText(props.stats?.sample_stage)
  const [, driverPart = ''] = text.split('：')
  return driverPart.trim() || `${sampleStageStatus.value.currentStage.caption}主导`
})
const sampleStageTargetLabel = computed(() => String(
  sampleStageStatus.value.nextStage?.threshold ?? sampleStageStatus.value.currentStage.threshold,
))
const sampleStagePercentText = computed(() => formatPercent(sampleStageStatus.value.stageProgress, 1))
const sampleStageGoalText = computed(() => (
  sampleStageStatus.value.nextStage
    ? `${sampleStagePercentText.value} 完成，距「${sampleStageStatus.value.nextStage.caption}」还差 ${sampleStageStatus.value.remainingToNext} 条`
    : `${sampleStagePercentText.value} 完成，已达 50000 条`
))
const sampleStageSummaryText = computed(() => (
  sampleStageStatus.value.nextStage
    ? `${sampleStagePercentText.value} · 距「${sampleStageStatus.value.nextStage.caption}」${sampleStageStatus.value.remainingToNext} 条`
    : `已达 ${sampleStageStatus.value.currentStage.threshold} 条`
))
const sampleStageAriaLabel = computed(() => (
  `当前样本阶段：${sampleStageStatus.value.currentStage.caption}，${sampleStageStatus.value.total} 条样本，阶段进度 ${sampleStageGoalText.value}`
))

function deviationTitle(row, direction) {
  if (!row) {
    return `基于 ${totalSamples.value} 条样本，暂无${direction}项`
  }
  const relation = direction === '偏高' ? '高于' : '低于'
  return `基于 ${totalSamples.value} 条样本，${row.label} 当前观察值${relation}基线 ${formatSignedPercentagePoints(row.deviation)}`
}
</script>

<template>
  <section class="stats-analytics-panel">
    <header class="stats-diagnostic-head">
      <div class="stats-diagnostic-title-row">
        <div class="stats-diagnostic-title-stack">
          <h2>统计诊断</h2>
          <p v-if="stats" class="stats-diagnostic-context">{{ statisticsContextText }}</p>
          <p v-else class="stats-diagnostic-context">正在读取统计数据。</p>
        </div>
        <div v-if="stats" class="page-summary-chips" role="group" aria-label="统计摘要">
          <span
            class="page-summary-chip"
            :class="maturity.hasSamples ? 'page-summary-chip--state' : 'page-summary-chip--neutral'"
            :title="`统计可信度：${maturity.label}`"
          >
            <i v-if="maturity.hasSamples" aria-hidden="true"></i>
            {{ maturity.label }}
          </span>
          <span class="page-summary-chip" :title="`当前阶段 ${stage.rangeLabel}`">
            <small>阶段</small>
            <span class="page-summary-chip__value">{{ stage.rangeLabel }}</span>
          </span>
        </div>
      </div>
    </header>

    <InsightRequestState
      v-if="!stats"
      :status="requestStatus === 'error' ? 'error' : 'loading'"
      title="正在读取统计数据"
      description="统计数据加载失败，请重新加载。"
      @retry="emit('retry')"
    />

    <SampleReadinessPanel
      v-else-if="!hasSamples"
      title="从第一条样本开始建立统计诊断"
      description="录入一条副词条后即可查看实际分布；达到 500 条后进入总体偏差阶段。"
      :current="0"
      :target="500"
      progress-label="距离总体偏差阶段还差 500 条"
      strategy-text="当前由规则基线主导"
      action-label="去工作台录入第一条"
      @action="emit('start-recording')"
    >
      <template #detail>
        <SampleStageAxis
          :progress="sampleStageProgress"
          :rows="sampleStageAxisRows"
          :segments="sampleStageSegmentRows"
          :aria-label="sampleStageAriaLabel"
        />
      </template>
    </SampleReadinessPanel>

    <div v-else class="stats-task-stack">
      <section
        class="stats-task-card sample-reliability-card"
        :aria-label="`样本可信度：${sampleStageDriverText}，${totalSamples} 条样本`"
      >
        <header class="stats-task-header sample-reliability-header">
          <div class="sample-reliability-title">
            <h3>样本可信度</h3>
            <span class="sample-reliability-basis-tag" :title="`当前判断依据：${sampleStageDriverText}`">
              <strong>{{ sampleStageDriverText }}</strong>
            </span>
          </div>
          <div class="sample-stage-summary" :title="sampleStageAriaLabel">
            <p class="sample-stage-count-value">
              <strong class="stats-number">{{ sampleStageStatus.total }}</strong>
              <span class="sample-stage-divider">/</span>
              <span class="stats-number sample-stage-target">{{ sampleStageTargetLabel }}</span>
            </p>
            <small>{{ sampleStageSummaryText }}</small>
          </div>
        </header>

        <SampleStageAxis
          :progress="sampleStageProgress"
          :rows="sampleStageAxisRows"
          :segments="sampleStageSegmentRows"
          :aria-label="sampleStageAriaLabel"
        />
      </section>

      <section class="stats-task-card substat-deviation-card">
        <header class="stats-task-header">
          <h3>副词条分布偏差</h3>
          <span class="stats-task-meta">按偏差绝对值排序</span>
        </header>

        <div class="stats-diagnostic-deviations">
          <article class="stats-diagnostic-deviation hot" :title="deviationTitle(hottestStatRow, '偏高')">
            <span>当前偏高</span>
            <strong>{{ hottestStatRow?.label || '暂无明显偏高' }}</strong>
            <em v-if="hottestStatRow" class="stats-number">{{ formatSignedPercentagePoints(hottestStatRow.deviation) }}</em>
          </article>
          <article class="stats-diagnostic-deviation warn" :title="deviationTitle(coldestStatRow, '偏低')">
            <span>当前偏低</span>
            <strong>{{ coldestStatRow?.label || '暂无明显偏低' }}</strong>
            <em v-if="coldestStatRow" class="stats-number">{{ formatSignedPercentagePoints(coldestStatRow.deviation) }}</em>
          </article>
        </div>

        <div class="substat-deviation-chart" role="img" aria-label="副词条相对基线的偏差">
          <div class="deviation-axis-labels" aria-hidden="true">
            <span></span>
            <div class="deviation-axis-scale">
              <span>偏低</span>
              <strong>基线</strong>
              <span>偏高</span>
            </div>
            <span></span>
          </div>
          <article
            v-for="row in sortedStatFrequency"
            :key="row.substat_type"
            class="substat-deviation-row"
            :class="statDiagnosticClass(row)"
            :title="`基于 ${stats.total_rolls || 0} 条样本，${row.label}: ${row.count} 次，观察 ${formatPercent(row.observed_rate)}，基线 ${formatPercent(row.baseline_rate)}`"
          >
            <div class="substat-deviation-name">
              <strong>{{ row.label }}</strong>
              <span><span class="stats-number">{{ row.count }}</span> 次 · <span class="stats-number">{{ formatPercent(row.observed_rate) }}</span></span>
            </div>
            <div class="substat-deviation-track">
              <i aria-hidden="true"></i>
              <b :style="{ width: `${Math.max(row.absDeviation / maxAbsStatDeviation * 48, row.absDeviation ? 5 : 0)}%`, left: row.deviation >= 0 ? '50%' : 'auto', right: row.deviation < 0 ? '50%' : 'auto' }"></b>
            </div>
            <strong class="substat-deviation-value">{{ formatSignedPercentagePoints(row.deviation) }}</strong>
          </article>
        </div>
      </section>
    </div>

  </section>
</template>
