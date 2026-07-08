const localSampleStages = [
  { min: 0, max: 500, key: 'recording', label: '0-500 条：规则基线主导' },
  { min: 500, max: 3000, key: 'bayes', label: '500-3000 条：周期规律检测' },
  { min: 3000, max: 10000, key: 'context', label: '3000-10000 条：上下文变量检测' },
  { min: 10000, max: 50000, key: 'markov', label: '10000-50000 条：顺序依赖检测' },
  { min: 50000, max: Number.POSITIVE_INFINITY, key: 'optimized', label: '50000+ 条：融合权重优化' },
]

function localSampleStage(totalRolls) {
  return localSampleStages.find((stage) => totalRolls >= stage.min && totalRolls < stage.max) || localSampleStages[0]
}

function localContextStatus(totalRolls) {
  return totalRolls < 3000 ? 'insufficient_data' : 'monitoring'
}

function adjustFrequencyTotals(substatFrequency, substatType, delta, nextTotal) {
  if (!substatFrequency) return substatFrequency

  return Object.fromEntries(Object.entries(substatFrequency).map(([key, row]) => {
    const nextCount = Math.max((Number(row.count) || 0) + (key === substatType ? delta : 0), 0)
    const observedRate = nextTotal ? nextCount / nextTotal : 0
    const baselineRate = Number(row.baseline_rate) || 0

    return [key, {
      ...row,
      count: nextCount,
      observed_rate: observedRate,
      deviation: nextTotal ? observedRate - baselineRate : 0,
    }]
  }))
}

function adjustContextFactorSampleSizes(contextFactors, nextTotal) {
  if (!contextFactors) return contextFactors
  const status = localContextStatus(nextTotal)
  return Object.fromEntries(Object.entries(contextFactors).map(([key, row]) => [key, {
    ...row,
    status,
    sample_size: nextTotal,
  }]))
}

export function adjustWorkspaceStatsForSubstat(currentStats, substatType, delta) {
  if (!currentStats) return currentStats
  const nextTotal = Math.max((Number(currentStats.total_rolls) || 0) + delta, 0)

  return {
    ...currentStats,
    total_rolls: nextTotal,
    sample_stage: localSampleStage(nextTotal),
    substat_frequency: adjustFrequencyTotals(currentStats.substat_frequency, substatType, delta, nextTotal),
    context_factors: adjustContextFactorSampleSizes(currentStats.context_factors, nextTotal),
  }
}
