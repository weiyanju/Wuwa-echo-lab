<script setup>
import { computed } from 'vue'

import { formatPercent, formatSignedPercent, sampleStageText } from '../../services/formatters.js'
import {
  buildSampleStageAxisRows,
  buildSortedStatFrequency,
  statDiagnosticClass,
  statsReliabilityText,
} from './presentation.js'

const props = defineProps({
  stats: { type: Object, default: null },
})

const sortedStatFrequency = computed(() => buildSortedStatFrequency(props.stats))
const maxAbsStatDeviation = computed(() => Math.max(...sortedStatFrequency.value.map((row) => row.absDeviation), 0.01))
const hottestStatRow = computed(() => sortedStatFrequency.value.find((row) => row.deviation > 0) || null)
const coldestStatRow = computed(() => [...sortedStatFrequency.value].reverse().find((row) => row.deviation < 0) || null)
const sampleStageProgress = computed(() => Math.min(Math.max((props.stats?.total_rolls || 0) / 50000, 0), 1))
const visualSampleStageProgress = computed(() => (
  sampleStageProgress.value > 0 ? Math.max(sampleStageProgress.value, 0.012) : 0
))
const sampleStageAxisRows = computed(() => buildSampleStageAxisRows(props.stats?.total_rolls || 0))
const statsSummaryItems = computed(() => {
  const total = props.stats?.total_rolls || 0
  return [
    {
      label: '样本可信度',
      value: props.stats ? statsReliabilityText(total) : '等待样本',
      tone: 'primary',
      title: `基于 ${total} 条样本判断当前统计可信度`,
    },
    {
      label: '总样本',
      value: `${total} 条`,
      title: `基于 ${total} 条已录入副词条样本`,
    },
    {
      label: '当前偏高',
      value: hottestStatRow.value ? `${hottestStatRow.value.label} ${formatSignedPercent(hottestStatRow.value.deviation)}` : '暂无',
      title: hottestStatRow.value ? `基于 ${total} 条样本，${hottestStatRow.value.label} 当前观察值高于基线 ${formatSignedPercent(hottestStatRow.value.deviation)}` : `基于 ${total} 条样本，暂无偏高项`,
    },
    {
      label: '当前偏低',
      value: coldestStatRow.value ? `${coldestStatRow.value.label} ${formatSignedPercent(coldestStatRow.value.deviation)}` : '暂无',
      title: coldestStatRow.value ? `基于 ${total} 条样本，${coldestStatRow.value.label} 当前观察值低于基线 ${formatSignedPercent(coldestStatRow.value.deviation)}` : `基于 ${total} 条样本，暂无偏低项`,
    },
  ]
})

function valueParts(value) {
  return String(value)
    .split(/([+-]?\d+(?:\.\d+)?%?)/g)
    .filter(Boolean)
    .map((text) => ({ text, numeric: /^[+-]?\d/.test(text) }))
}
</script>

<template>
  <section class="product-panel full-panel stats-analytics-panel">
    <div class="stats-diagnostic-head">
      <div>
        <h2>统计诊断</h2>
        <p v-if="stats">{{ sampleStageText(stats.sample_stage) }}</p>
        <p v-else>等待样本录入后生成统计图表。</p>
      </div>
    </div>

    <div v-if="stats" class="stats-summary-bar">
      <article v-for="item in statsSummaryItems" :key="item.label" :class="item.tone" :title="item.title">
        <span>{{ item.label }}</span>
        <strong>
          <span v-for="(part, index) in valueParts(item.value)" :key="`${item.label}-${index}`" :class="{ 'stats-number': part.numeric }">{{ part.text }}</span>
        </strong>
      </article>
    </div>
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
        <div class="stats-section-heading compact">
          <h3>样本阶段</h3>
          <span><span class="stats-number">{{ stats.total_rolls }}</span> / <span class="stats-number">50000+</span></span>
        </div>
        <div class="sample-stage-axis" role="img" aria-label="当前样本阶段">
          <div class="sample-stage-track" aria-hidden="true">
            <b :style="{ width: formatPercent(visualSampleStageProgress) }"></b>
            <i class="sample-stage-marker" :style="{ left: formatPercent(sampleStageProgress) }"></i>
          </div>
          <article v-for="stage in sampleStageAxisRows" :key="stage.label" :class="{ active: stage.active, current: stage.current }">
            <strong>
              <span v-for="(part, index) in valueParts(stage.label)" :key="`${stage.label}-${index}`" :class="{ 'stats-number': part.numeric }">{{ part.text }}</span>
            </strong>
            <span><span v-for="(part, index) in valueParts(stage.caption)" :key="`${stage.caption}-${index}`" :class="{ 'stats-number': part.numeric }">{{ part.text }}</span><em v-if="stage.current">当前</em></span>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
