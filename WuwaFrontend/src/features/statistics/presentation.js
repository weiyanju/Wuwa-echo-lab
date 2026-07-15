import { sampleStageAxisDefinitions } from '../../data/modelPresentation.js'

export function statDeviation(row) {
  return (row?.observed_rate ?? 0) - (row?.baseline_rate ?? 0)
}

export function statDiagnosticClass(row) {
  const deviation = statDeviation(row)
  if (deviation >= 0.03) {
    return 'hot'
  }
  if (deviation <= -0.03) {
    return 'warn'
  }
  return 'cool'
}

export function buildSortedStatFrequency(stats) {
  return Object.values(stats?.substat_frequency || {})
    .map((row) => {
      const deviation = statDeviation(row)
      return {
        ...row,
        deviation,
        absDeviation: Math.abs(deviation),
      }
    })
    .sort((left, right) => right.absDeviation - left.absDeviation)
}

export function statsReliabilityNote(total) {
  const sampleTotal = Math.trunc(normalizeSampleTotal(total))
  const prefix = `基于 ${sampleTotal} 条样本，`

  if (sampleTotal >= 50000) {
    return `${prefix}可进入长期权重优化。`
  }
  if (sampleTotal >= 10000) {
    return `${prefix}偏差趋势可作为长期观察依据。`
  }
  if (sampleTotal >= 3000) {
    return `${prefix}偏差可辅助判断，极端值仍需保守看待。`
  }
  if (sampleTotal >= 500) {
    return `${prefix}偏差可作初步参考。`
  }
  return `${prefix}当前偏差仅作趋势提示。`
}

function clampUnit(value) {
  return Math.min(Math.max(value, 0), 1)
}

function normalizeSampleTotal(total) {
  const numericTotal = Number(total)
  return Number.isFinite(numericTotal) ? Math.max(numericTotal, 0) : 0
}

const sampleStageAxisScalePower = 0.5
const sampleStageAxisMaximum = Math.max(
  ...sampleStageAxisDefinitions.map((stage) => stage.threshold).filter(Number.isFinite),
  1,
)

function sampleStageAxisPosition(index) {
  const threshold = sampleStageAxisDefinitions[index]?.threshold ?? 0
  if (threshold <= 0) {
    return 0
  }
  return clampUnit(Math.pow(threshold / sampleStageAxisMaximum, sampleStageAxisScalePower))
}

export function buildSampleStageProgress(total) {
  const safeTotal = normalizeSampleTotal(total)
  let currentStageIndex = 0

  sampleStageAxisDefinitions.forEach((stage, index) => {
    if (safeTotal >= stage.threshold) {
      currentStageIndex = index
    }
  })

  const currentStage = sampleStageAxisDefinitions[currentStageIndex]
  const nextStage = sampleStageAxisDefinitions[currentStageIndex + 1] || null

  if (!nextStage) {
    return {
      total: safeTotal,
      currentStage,
      nextStage,
      remainingToNext: 0,
      stageProgress: 1,
      axisProgress: 1,
    }
  }

  const stageSpan = nextStage.threshold - currentStage.threshold
  const stageProgress = stageSpan > 0 ? clampUnit((safeTotal - currentStage.threshold) / stageSpan) : 0
  const axisStart = sampleStageAxisPosition(currentStageIndex)
  const axisEnd = sampleStageAxisPosition(currentStageIndex + 1)

  return {
    total: safeTotal,
    currentStage,
    nextStage,
    remainingToNext: Math.max(nextStage.threshold - safeTotal, 0),
    stageProgress,
    axisProgress: clampUnit(axisStart + stageProgress * Math.max(axisEnd - axisStart, 0)),
  }
}

export function buildSampleStageAxisRows(total) {
  const safeTotal = normalizeSampleTotal(total)
  const lastStageIndex = sampleStageAxisDefinitions.length - 1

  return sampleStageAxisDefinitions.map((stage, index) => {
    const axisProgress = sampleStageAxisPosition(index)
    const nextAxisProgress = index < lastStageIndex ? sampleStageAxisPosition(index + 1) : axisProgress
    const showCaption = index < lastStageIndex

    return {
      ...stage,
      active: safeTotal >= stage.threshold,
      current: safeTotal >= stage.threshold && safeTotal < stage.max,
      displayLabel: String(stage.threshold),
      showCaption,
      axisProgress,
      captionProgress: showCaption ? axisProgress + (nextAxisProgress - axisProgress) / 2 : null,
    }
  })
}
