<script setup>
import { computed } from 'vue'

import { formatPercent, formatSignedPercent, sampleStageText } from '../../services/formatters.js'
import {
  buildSampleStageProgress,
  buildSampleStageAxisRows,
  buildSortedStatFrequency,
  statDiagnosticClass,
  statsReliabilityNote,
  statsReliabilityText,
} from './presentation.js'

const props = defineProps({
  stats: { type: Object, default: null },
})

const sortedStatFrequency = computed(() => buildSortedStatFrequency(props.stats))
const maxAbsStatDeviation = computed(() => Math.max(...sortedStatFrequency.value.map((row) => row.absDeviation), 0.01))
const hottestStatRow = computed(() => sortedStatFrequency.value.find((row) => row.deviation > 0) || null)
const coldestStatRow = computed(() => [...sortedStatFrequency.value].reverse().find((row) => row.deviation < 0) || null)
const totalSamples = computed(() => props.stats?.total_rolls || 0)
const sampleStageStatus = computed(() => buildSampleStageProgress(totalSamples.value))
const sampleStageProgress = computed(() => sampleStageStatus.value.axisProgress)
const sampleStageAxisRows = computed(() => buildSampleStageAxisRows(totalSamples.value))
const sampleStageSegmentRows = computed(() => sampleStageAxisRows.value.filter((stage) => stage.showCaption))
const sampleStageLabelParts = computed(() => {
  const text = sampleStageText(props.stats?.sample_stage)
  const [rangePart = '', driverPart = ''] = text.split('：')
  return {
    range: rangePart.replace(/\s*条$/, '').trim(),
    driver: driverPart.trim(),
  }
})
const sampleStageRangeText = computed(() => {
  if (sampleStageLabelParts.value.range && sampleStageLabelParts.value.range !== '暂无样本阶段') {
    return sampleStageLabelParts.value.range
  }
  const currentStage = sampleStageStatus.value.currentStage
  const nextStage = sampleStageStatus.value.nextStage
  return nextStage ? `${currentStage.threshold}-${nextStage.threshold}` : `${currentStage.threshold}+`
})
const sampleStageDriverText = computed(() => (
  sampleStageLabelParts.value.driver || `${sampleStageStatus.value.currentStage.caption}主导`
))
const sampleStageTargetLabel = computed(() => String(
  sampleStageStatus.value.nextStage?.threshold ?? sampleStageStatus.value.currentStage.threshold,
))
const sampleStagePercentText = computed(() => formatPercent(sampleStageStatus.value.stageProgress, 1))
const sampleStageGoalText = computed(() => (
  sampleStageStatus.value.nextStage
    ? `${sampleStagePercentText.value} 完成，距「${sampleStageStatus.value.nextStage.caption}」还差 ${sampleStageStatus.value.remainingToNext} 条`
    : `${sampleStagePercentText.value} 完成，已达 50000 条`
))
const sampleStageAriaLabel = computed(() => (
  `当前样本阶段：${sampleStageStatus.value.currentStage.caption}，${sampleStageStatus.value.total} 条样本，${sampleStageGoalText.value}`
))

function deviationTitle(row, direction) {
  if (!row) {
    return `基于 ${totalSamples.value} 条样本，暂无${direction}项`
  }
  const relation = direction === '偏高' ? '高于' : '低于'
  return `基于 ${totalSamples.value} 条样本，${row.label} 当前观察值${relation}基线 ${formatSignedPercent(row.deviation)}`
}
</script>

<template>
  <section class="product-panel full-panel stats-analytics-panel">
    <div class="stats-diagnostic-head">
      <div class="stats-diagnostic-title-row">
        <div class="stats-diagnostic-title-stack">
          <h2>统计诊断</h2>
          <p v-if="stats" class="stats-diagnostic-context">{{ statsReliabilityNote(totalSamples) }}</p>
          <p v-else>等待样本录入后生成统计图表。</p>
        </div>
        <div
          v-if="stats"
          class="stats-diagnostic-tags stats-diagnostic-stage-meta"
          :aria-label="`当前阶段 ${sampleStageRangeText}，${sampleStageDriverText}，基于 ${totalSamples} 条样本`"
          :title="`当前阶段 ${sampleStageRangeText}，${sampleStageDriverText}，基于 ${totalSamples} 条样本`"
        >
          <span class="stats-diagnostic-stage-chip">
            <span>阶段</span>
            <strong class="stats-number">{{ sampleStageRangeText }}</strong>
          </span>
          <span class="stats-diagnostic-stage-chip muted">{{ sampleStageDriverText }}</span>
        </div>
      </div>
    </div>

    <section v-if="stats" class="stats-diagnostic-panel" :aria-label="`统计诊断：${statsReliabilityText(totalSamples)}，${totalSamples} 条样本`">
      <article class="stats-diagnostic-primary" :title="`基于 ${totalSamples} 条样本判断当前统计可信度`">
        <span>样本可信度</span>
        <strong>{{ statsReliabilityText(totalSamples) }}</strong>
      </article>
      <div class="stats-diagnostic-deviations">
        <article class="stats-diagnostic-deviation hot" :title="deviationTitle(hottestStatRow, '偏高')">
          <span>当前偏高</span>
          <strong>{{ hottestStatRow?.label || '暂无明显偏高' }}</strong>
          <em v-if="hottestStatRow" class="stats-number">{{ formatSignedPercent(hottestStatRow.deviation) }}</em>
        </article>
        <article class="stats-diagnostic-deviation warn" :title="deviationTitle(coldestStatRow, '偏低')">
          <span>当前偏低</span>
          <strong>{{ coldestStatRow?.label || '暂无明显偏低' }}</strong>
          <em v-if="coldestStatRow" class="stats-number">{{ formatSignedPercent(coldestStatRow.deviation) }}</em>
        </article>
      </div>
    </section>
    <div v-else class="stats-empty-state">
      <strong>暂无统计样本</strong>
      <p>录入声骸副词条后，会在这里显示样本分布和阶段诊断。</p>
    </div>

    <section v-if="stats" class="stats-chart-card substat-deviation-card">
      <div class="stats-section-heading">
        <h3>副词条分布偏差</h3>
        <span>按偏差排序</span>
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
          <strong class="substat-deviation-value">{{ formatSignedPercent(row.deviation) }}</strong>
        </article>
      </div>
    </section>

    <div v-if="stats" class="stats-chart-grid">
      <section class="stats-chart-card sample-stage-card">
        <div class="stats-section-heading sample-stage-heading compact">
          <div>
            <h3>样本阶段</h3>
            <p class="sample-stage-current">
              <strong class="sample-stage-current-name">{{ sampleStageStatus.currentStage.caption }}</strong>
              <span class="sample-stage-current-note">当前阶段</span>
            </p>
          </div>
          <div class="sample-stage-count" :title="sampleStageAriaLabel">
            <span>
              <strong class="stats-number">{{ sampleStageStatus.total }}</strong>
              <span class="sample-stage-divider">/</span>
              <span class="stats-number">{{ sampleStageTargetLabel }}</span>
            </span>
            <small>{{ sampleStageGoalText }}</small>
          </div>
        </div>
        <div class="sample-stage-axis" role="img" :aria-label="sampleStageAriaLabel">
          <div class="sample-stage-track" aria-hidden="true">
            <b :style="{ width: formatPercent(sampleStageProgress) }"></b>
            <span
              v-for="stage in sampleStageAxisRows"
              :key="`tick-${stage.label}`"
              class="sample-stage-boundary-tick"
              :class="{ active: stage.active, current: stage.current }"
              :style="{ left: formatPercent(stage.axisProgress) }"
            ></span>
            <i class="sample-stage-marker" :style="{ left: formatPercent(sampleStageProgress) }"></i>
          </div>
          <div class="sample-stage-boundaries" aria-hidden="true">
            <span
              v-for="stage in sampleStageAxisRows"
              :key="`boundary-${stage.label}`"
              :class="{ active: stage.active, current: stage.current }"
              :style="{ left: formatPercent(stage.axisProgress) }"
            >
              <strong class="stats-number">{{ stage.displayLabel }}</strong>
            </span>
          </div>
          <div class="sample-stage-segments" aria-hidden="true">
            <span
              v-for="stage in sampleStageSegmentRows"
              :key="`segment-${stage.label}`"
              :class="{ active: stage.active, current: stage.current }"
              :style="{ left: formatPercent(stage.captionProgress) }"
            >{{ stage.caption }}</span>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
