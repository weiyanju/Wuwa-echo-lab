export const ACTIVE_MODEL_WEIGHT_EPSILON = 0.0001

const MODEL_ORDER = ['rule', 'bayes', 'markov', 'cycle', 'context']
const MODEL_TABS = [
  { key: 'distribution', label: '模型细节' },
  { key: 'evidence', label: '指标说明' },
]
const PROBABILITY_KEYS = {
  rule: 'p_rule',
  bayes: 'p_bayes',
  markov: 'p_markov',
  cycle: 'p_cycle',
  context: 'p_context',
}
const MODEL_BACKTEST_PREVIEW = {
  rule: { hitRate: 0.31, loss: 2.07 },
  bayes: { hitRate: 0.36, loss: 1.94 },
  markov: { hitRate: 0.28, loss: 2.22 },
  cycle: { hitRate: 0.33, loss: 2.02 },
  context: { hitRate: 0.19, loss: 2.45 },
}
const MODEL_LABELS = {
  rule: '规则均衡',
  bayes: '周期规律',
  markov: '近期序列',
  cycle: '词条窗口',
  context: '上下文监测',
}
const WINDOW_LABELS = {
  double: '双爆窗口',
  single_rate: '暴击率窗口',
  single_damage: '暴击伤害窗口',
  cooldown: '冷却窗口',
}
const GROUP_LABELS = {
  attack: '攻击组',
  hp: '生命组',
  defense: '防御组',
  damage_bonus: '伤害加成组',
  energy: '共鸣效率',
}
const SUBSTAT_GROUPS = {
  attack: { label: '攻击组', types: ['atk_percent', 'flat_atk'] },
  hp: { label: '生命组', types: ['hp_percent', 'flat_hp'] },
  defense: { label: '防御组', types: ['def_percent', 'flat_def'] },
  damage_bonus: { label: '伤害加成组', types: ['basic_attack_damage', 'skill_damage', 'heavy_attack_damage', 'liberation_damage'] },
  energy: { label: '共鸣效率', types: ['energy_regen'] },
}
const MODEL_DEFINITIONS = {
  rule: {
    title: '规则均衡',
    role: '看长期分布，把出偏的词条拉回来',
    detail: '规则均衡负责兜底：某类词条出得太多就降一点，长期偏少就补一点，让整体分布不被短期运气带歪。',
    chartTitle: '全局偏差',
    chartNote: '实际分布偏得越明显，系统拉回均衡的力度越强。',
    evidence: ['全局频率偏差', '当前合法候选池', '指数型均衡修正'],
  },
  bayes: {
    title: '周期规律',
    role: '看历史片段，找当前最像的走势',
    detail: '周期规律会拿当前出词顺序去对照历史。',
    chartTitle: '片段路径',
    chartNote: 'Exact 高说明当前走势很像历史原片段；Wildcard 高说明完整样本不够，需要用相似走势补判断。',
    evidence: ['P_bayes_exact', 'P_bayes_wildcard', '动态 alpha 平滑'],
  },
  markov: {
    title: '近期序列',
    role: '看最近记录，给短期连出降温',
    detail: '近期序列只盯最近 12 条。某个候选短时间内出得太密，就先降温；没明显连出时，它不会主动改判断。',
    chartTitle: '最近 12 条时间带',
    chartNote: '最近窗口里重复越密集，短期冷却越明显。',
    evidence: ['最近 12 条窗口', '过热阈值 >= 3', '只惩罚不奖励'],
  },
  cycle: {
    title: '词条窗口',
    role: '看双爆节奏，也看普通词条大类',
    detail: '词条窗口先判断双爆现在是升温、单边偏向还是冷却，再观察攻击、生命、防御等普通词条大类有没有接棒趋势。',
    chartTitle: '词条窗口信号',
    chartNote: '双爆窗口看暴击类是否还在热；通用词条组看其他大类谁更可能接下来冒头。',
    evidence: ['双爆 / 单爆 / 冷却', '攻击/生命/防御/伤害加成/共鸣效率', '组内分配'],
  },
  context: {
    title: '上下文监测',
    role: '看装备条件，样本够了才相信',
    detail: '上下文监测会分开记录套装、COST、主词条和位置。样本还少时只做观察，避免把巧合当成规律。',
    chartTitle: '启用条件',
    chartNote: '只有样本够多、差异也稳定时，上下文模型才会真正参与判断。',
    evidence: ['set name', 'cost', 'main stat', 'position'],
  },
}

function clamp(value, min = 0, max = 1) {
  if (!Number.isFinite(value)) return min
  return Math.min(Math.max(value, min), max)
}

function asNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback
}

function collectionValues(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') return Object.values(value)
  return []
}

function collectionEntries(value) {
  if (Array.isArray(value)) return value.map((item, index) => [item.key || `${index}`, item])
  if (value && typeof value === 'object') return Object.entries(value)
  return []
}

function normalizeBars(rows) {
  const maxValue = Math.max(...rows.map((row) => Math.abs(row.value)), 0)
  return rows.map((row) => ({
    ...row,
    width: maxValue > 0 ? clamp(Math.abs(row.value) / maxValue) : 0,
  }))
}

function statusForWeight(weight) {
  if (weight <= ACTIVE_MODEL_WEIGHT_EPSILON) return { status: 'disabled', statusLabel: '未启用' }
  if (weight >= 0.35) return { status: 'dominant', statusLabel: '主导' }
  if (weight <= 0.05) return { status: 'muted', statusLabel: '低权重' }
  return { status: 'active', statusLabel: '参与中' }
}

function candidateProbabilityBars(prediction, key, count = 5) {
  const probabilityKey = PROBABILITY_KEYS[key]
  return normalizeBars(
    (prediction?.candidates || [])
      .slice()
      .sort((left, right) => asNumber(right[probabilityKey]) - asNumber(left[probabilityKey]))
      .slice(0, count)
      .map((candidate) => ({
        label: candidate.label || candidate.substat_type,
        value: asNumber(candidate[probabilityKey]),
        type: 'percent',
        caption: '当前候选概率',
        tone: candidate.substat_type?.includes('crit') ? 'hot' : 'cool',
      })),
  )
}

function ruleDeviationBars(stats, prediction) {
  const statRows = collectionValues(stats?.substat_frequency)
    .map((row) => ({
      label: row.label || row.substat_type,
      value: asNumber(row.observed_rate) - asNumber(row.baseline_rate),
      type: 'signedPercent',
      caption: `观察 ${Math.round(asNumber(row.observed_rate) * 10000) / 100}% / 基线 ${Math.round(asNumber(row.baseline_rate) * 10000) / 100}%`,
      tone: asNumber(row.observed_rate) >= asNumber(row.baseline_rate) ? 'hot' : 'warn',
    }))
    .sort((left, right) => Math.abs(right.value) - Math.abs(left.value))
    .slice(0, 6)
  return statRows.length ? normalizeBars(statRows) : candidateProbabilityBars(prediction, 'rule')
}

function sortedEchoes(echoes) {
  return (echoes || []).slice().sort((left, right) => {
    const leftTime = new Date(left.created_at || left.createdAt || 0).getTime()
    const rightTime = new Date(right.created_at || right.createdAt || 0).getTime()
    if (leftTime !== rightTime) return leftTime - rightTime
    return asNumber(left.id) - asNumber(right.id)
  })
}

function recentSubstatSequence(echoes, labels, windowSize = 12) {
  const sequence = []
  for (const echo of sortedEchoes(echoes)) {
    for (const roll of echo.substats || []) {
      sequence.push({
        type: roll.substat_type,
        label: roll.label || labels?.[roll.substat_type] || roll.substat_type,
      })
    }
  }
  return withSequenceCounts(sequence.slice(-windowSize))
}

function recentSequenceFromDiagnostics(diagnostics, echoes, labels) {
  if (Array.isArray(diagnostics?.markov?.recent_sequence)) {
    return withSequenceCounts(diagnostics.markov.recent_sequence.map((item) => ({
      type: item.substat_type || item.type,
      label: item.label || labels?.[item.substat_type || item.type] || item.substat_type || item.type,
    })))
  }
  return recentSubstatSequence(echoes, labels)
}

function withSequenceCounts(sequence) {
  const counts = sequence.reduce((nextCounts, item) => {
    nextCounts[item.type] = (nextCounts[item.type] || 0) + 1
    return nextCounts
  }, {})
  return sequence.map((item) => ({
    ...item,
    count: counts[item.type] || 0,
    overheated: (counts[item.type] || 0) >= 3,
  }))
}

function timelineNodesFromSequence(sequence) {
  const displaySequence = [...sequence].reverse()
  const lastIndex = Math.max(displaySequence.length - 1, 1)
  return displaySequence.map((item, index) => ({
    ...item,
    index,
    progress: displaySequence.length > 1 ? index / lastIndex : 0,
    track: index % 2 === 0 ? 'upper' : 'lower',
  }))
}

function recentSequenceBars(echoes, labels) {
  const counts = new Map()
  for (const item of recentSubstatSequence(echoes, labels)) {
    counts.set(item.type, {
      key: item.type,
      label: item.label,
      value: (counts.get(item.type)?.value || 0) + 1,
    })
  }
  return normalizeBars(Array.from(counts.values())
    .sort((left, right) => right.value - left.value)
    .slice(0, 6)
    .map((row) => ({
      ...row,
      type: 'number',
      caption: row.value >= 3 ? '达到过热阈值' : '未触发降温',
      tone: row.value >= 3 ? 'warn' : 'cool',
    })))
}

function bayesSegments(totalRolls) {
  const sampleRatio = clamp(asNumber(totalRolls) / 2000)
  const wildcard = 0.15 + (0.35 - 0.15) * sampleRatio
  return [
    { label: 'Exact', value: 1 - wildcard },
    { label: 'Wildcard', value: wildcard },
  ]
}

function bayesSegmentsFromDiagnostics(diagnostics, totalRolls) {
  if (diagnostics?.bayes?.exact_weight != null && diagnostics?.bayes?.wildcard_weight != null) {
    return [
      { label: 'Exact', value: diagnostics.bayes.exact_weight },
      { label: 'Wildcard', value: diagnostics.bayes.wildcard_weight },
    ]
  }
  return bayesSegments(totalRolls)
}

function cycleWindowRows(echoes) {
  const recent = recentSubstatSequence(echoes, {}, 12)
  const recent5 = recent.slice(-5)
  const rateCount = recent5.filter((item) => item.type === 'crit_rate').length
  const damageCount = recent5.filter((item) => item.type === 'crit_damage').length
  const critCount = rateCount + damageCount
  const raw = [
    { key: 'double', label: '双爆窗口', value: 0.28 + Math.min(rateCount, damageCount) * 0.11, tone: 'hot' },
    { key: 'single_rate', label: '暴击率窗口', value: 0.24 + Math.max(rateCount - damageCount, 0) * 0.13, tone: 'cool' },
    { key: 'single_damage', label: '暴击伤害窗口', value: 0.24 + Math.max(damageCount - rateCount, 0) * 0.13, tone: 'cool' },
    { key: 'cooldown', label: '冷却窗口', value: 0.24 + Math.max(critCount - 2, 0) * 0.08, tone: 'warn' },
  ]
  const total = raw.reduce((sum, row) => sum + row.value, 0) || 1
  return raw.map((row) => ({ ...row, value: row.value / total, type: 'percent' }))
}

function cycleWindowRowsFromDiagnostics(diagnostics, echoes) {
  if (diagnostics?.cycle?.windows) {
    return collectionEntries(diagnostics.cycle.windows).map(([key, value]) => ({
      key,
      label: WINDOW_LABELS[key] || key,
      value: asNumber(value?.value ?? value),
      type: 'percent',
      tone: key === 'double' ? 'hot' : key === 'cooldown' ? 'warn' : 'cool',
    }))
  }
  return cycleWindowRows(echoes)
}

function countRecentTypes(echoes, types, windowSize = 30) {
  const typeSet = new Set(types)
  return recentSubstatSequence(echoes, {}, windowSize).filter((item) => typeSet.has(item.type)).length
}

function groupCycleBars(echoes) {
  return normalizeBars(Object.entries(SUBSTAT_GROUPS).map(([key, group]) => {
    const count = countRecentTypes(echoes, group.types)
    return {
      key,
      label: group.label,
      value: count,
      type: 'number',
      caption: count ? `近 30 条出现 ${count} 次` : '近 30 条未出现',
      tone: count >= 3 ? 'hot' : 'cool',
    }
  }))
}

function groupCycleBarsFromDiagnostics(diagnostics, echoes) {
  if (diagnostics?.cycle?.group_scores) {
    return normalizeBars(collectionEntries(diagnostics.cycle.group_scores).map(([key, value]) => ({
      key,
      label: GROUP_LABELS[key] || key,
      value: asNumber(value?.value ?? value),
      type: 'percent',
      caption: '后端周期组评分',
      tone: asNumber(value?.value ?? value) >= 0.25 ? 'hot' : 'cool',
    })))
  }
  return groupCycleBars(echoes)
}

function markovCountBarsFromDiagnostics(diagnostics, echoes, labels) {
  if (diagnostics?.markov?.recent_counts) {
    return normalizeBars(collectionEntries(diagnostics.markov.recent_counts).map(([key, row]) => ({
      key,
      label: row?.label || labels?.[key] || key,
      value: asNumber(row?.value ?? row),
      type: 'number',
      caption: asNumber(row?.value ?? row) >= 3 ? '达到过热阈值' : '未触发降温',
      tone: asNumber(row?.value ?? row) >= 3 ? 'warn' : 'cool',
    }))).slice(0, 6)
  }
  return recentSequenceBars(echoes, labels)
}

function markovPenaltyBarsFromDiagnostics(diagnostics, labels) {
  if (!diagnostics?.markov?.penalties) return []
  return normalizeBars(collectionEntries(diagnostics.markov.penalties)
    .map(([key, row]) => ({
      key,
      label: row?.label || labels?.[key] || key,
      value: asNumber(row?.value ?? row),
      type: 'percent',
      caption: asNumber(row?.value ?? row) > 0 ? '短期降温' : '未惩罚',
      tone: asNumber(row?.value ?? row) > 0 ? 'warn' : 'cool',
    }))
    .filter((row) => row.value > 0)
    .sort((left, right) => right.value - left.value)
    .slice(0, 6))
}

function contextBars(stats, diagnostics) {
  const factors = diagnostics?.context?.factors || stats?.context_factors || {}
  const rows = Object.entries(factors).map(([key, factor]) => ({
    label: factor?.label || key,
    value: asNumber(factor?.sample_size),
    type: 'number',
    caption: factor?.status === 'active' || factor?.status === 'monitoring' ? '监测中' : '样本不足',
    tone: factor?.status === 'active' || factor?.status === 'monitoring' ? 'hot' : 'warn',
  }))
  return rows.length ? normalizeBars(rows) : normalizeBars([
    { label: 'set name', value: 0, type: 'number', caption: '待采样', tone: 'warn' },
    { label: 'cost', value: 0, type: 'number', caption: '待采样', tone: 'warn' },
    { label: 'main stat', value: 0, type: 'number', caption: '待采样', tone: 'warn' },
    { label: 'position', value: 0, type: 'number', caption: '待采样', tone: 'warn' },
  ])
}

function contextChecksFromDiagnostics(diagnostics, stats) {
  const context = diagnostics?.context
  const factors = context?.factors || stats?.context_factors || {}
  return Object.entries(factors).map(([key, factor]) => ({
    key,
    label: factor?.label || key,
    status: factor?.status || context?.status || 'insufficient_data',
    sampleSize: asNumber(factor?.sample_size ?? context?.sample_size),
    recommended: asNumber(context?.recommended_samples, 3000),
  }))
}

function modelMetrics(key, { prediction, stats, echoes, diagnostics }) {
  const totalRolls = asNumber(stats?.total_rolls ?? prediction?.sample_size)
  const candidates = prediction?.candidates || []
  const weight = asNumber(prediction?.weights?.[key])
  if (key === 'rule') {
    const maxDeviation = Math.max(
      ...collectionValues(stats?.substat_frequency).map((row) => Math.abs(asNumber(row.observed_rate) - asNumber(row.baseline_rate))),
      0,
    )
    return [
      { label: '当前权重', value: weight, type: 'percent' },
      { label: '最大偏差', value: maxDeviation, type: 'signedPercent' },
      { label: '候选数', value: candidates.length, type: 'number' },
    ]
  }
  if (key === 'bayes') {
    const wildcard = bayesSegmentsFromDiagnostics(diagnostics, totalRolls)[1].value
    const alpha = diagnostics?.bayes?.alpha ?? (5 - (5 - 1) * clamp(totalRolls / 500))
    return [
      { label: 'Exact 权重', value: 1 - wildcard, type: 'percent' },
      { label: 'Wildcard 权重', value: wildcard, type: 'percent' },
      { label: 'Alpha', value: alpha, type: 'decimal' },
    ]
  }
  if (key === 'markov') {
    const sequence = recentSubstatSequence(echoes, {}, 12)
    const overheated = markovCountBarsFromDiagnostics(diagnostics, echoes, {}).filter((bar) => bar.value >= 3).length
    return [
      { label: '窗口长度', value: sequence.length || diagnostics?.markov?.window_size || 12, type: 'number' },
      { label: '过热项', value: overheated, type: 'number' },
      { label: '触发阈值', value: 3, type: 'number' },
    ]
  }
  if (key === 'cycle') {
    return [
      { label: '双爆窗口信号', value: 0.75, type: 'percent' },
      { label: '通用组周期', value: 0.25, type: 'percent' },
      { label: '候选数', value: candidates.length, type: 'number' },
    ]
  }
  return [
    { label: '当前权重', value: weight, type: 'percent' },
    { label: '当前样本', value: diagnostics?.context?.sample_size ?? totalRolls, type: 'number' },
    { label: '建议样本', value: diagnostics?.context?.recommended_samples ?? 3000, type: 'number' },
  ]
}

function cardBars(key, context) {
  if (key === 'rule') return ruleDeviationBars(context.stats, context.prediction)
  if (key === 'markov') {
    const bars = markovCountBarsFromDiagnostics(context.diagnostics, context.echoes, context.labels)
    return bars.length ? bars : candidateProbabilityBars(context.prediction, key)
  }
  if (key === 'context') return contextBars(context.stats, context.diagnostics)
  return candidateProbabilityBars(context.prediction, key)
}

function cardSegments(key, stats, diagnostics) {
  if (key === 'bayes') return bayesSegmentsFromDiagnostics(diagnostics, stats?.total_rolls)
  return []
}

function dominantModelFromWeights(weights) {
  const entries = Object.entries(weights).filter(([, value]) => value > 0)
  if (!entries.length) return null
  return entries.sort((left, right) => right[1] - left[1])[0][0]
}

export function buildModelDetailCards({ prediction = null, stats = null, evaluation = null, echoes = [], labels = {} } = {}) {
  const diagnostics = prediction?.model_diagnostics || null
  const cards = MODEL_ORDER.map((key) => {
    const definition = MODEL_DEFINITIONS[key]
    const weight = asNumber(prediction?.weights?.[key])
    const baseWeight = asNumber(prediction?.base_weights?.[key], weight)
    const status = statusForWeight(weight)
    return {
      key,
      ...definition,
      title: prediction?.model_labels?.[key] || definition.title,
      weight,
      baseWeight,
      adjustment: prediction?.weight_adjustments?.[key] || null,
      hitRate: evaluation?.model_scores?.[key]?.hit_rate ?? MODEL_BACKTEST_PREVIEW[key]?.hitRate ?? null,
      loss: evaluation?.model_scores?.[key]?.loss ?? MODEL_BACKTEST_PREVIEW[key]?.loss ?? null,
      playerNote: diagnostics?.[key]?.player_note || definition.detail,
      ...status,
      metrics: modelMetrics(key, { prediction, stats, echoes, diagnostics }),
      bars: cardBars(key, { prediction, stats, echoes, labels, diagnostics }),
      segments: cardSegments(key, stats, diagnostics),
      tabs: MODEL_TABS,
      windows: key === 'cycle' ? cycleWindowRowsFromDiagnostics(diagnostics, echoes) : [],
      groupBars: key === 'cycle' ? groupCycleBarsFromDiagnostics(diagnostics, echoes) : [],
      penaltyBars: key === 'markov' ? markovPenaltyBarsFromDiagnostics(diagnostics, labels) : [],
      contextChecks: key === 'context' ? contextChecksFromDiagnostics(diagnostics, stats) : [],
      recentSequence: key === 'markov' ? recentSequenceFromDiagnostics(diagnostics, echoes, labels) : [],
      timelineNodes: key === 'markov' ? timelineNodesFromSequence(recentSequenceFromDiagnostics(diagnostics, echoes, labels)) : [],
    }
  })
  const summary = diagnostics?.summary || {}
  const dominantModel = summary.dominant_model || dominantModelFromWeights(prediction?.weights || {})
  cards.summary = {
    dominantModel,
    dominantLabel: MODEL_LABELS[dominantModel] || '暂无',
    auxiliaryModels: summary.auxiliary_models || [],
    auxiliaryLabels: (summary.auxiliary_models || []).map((key) => MODEL_LABELS[key] || key),
    contextStatus: summary.context_status || (prediction?.weights?.context > 0 ? 'enabled' : 'disabled'),
    confidenceNote: summary.confidence_note || '等待更多样本形成稳定判断',
  }
  return cards
}
