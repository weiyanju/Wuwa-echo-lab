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

export function statsReliabilityText(total) {
  if (total >= 50000) {
    return '可优化权重'
  }
  if (total >= 10000) {
    return '稳定观察'
  }
  if (total >= 3000) {
    return '可作参考'
  }
  if (total >= 500) {
    return '初步观察'
  }
  return '起步观察'
}

export function buildSampleStageAxisRows(total) {
  return sampleStageAxisDefinitions.map((stage) => ({
    ...stage,
    active: total >= stage.threshold,
    current: total >= stage.threshold && total < stage.max,
  }))
}
