export function formatPercent(value, digits = 2) {
  const numericValue = Number.isFinite(value) ? value : 0
  return `${(numericValue * 100).toFixed(digits)}%`
}

export function formatSignedPercent(value, digits = 2) {
  const numericValue = Number.isFinite(value) ? value : 0
  const sign = numericValue >= 0 ? '+' : ''
  return `${sign}${formatPercent(numericValue, digits)}`
}

const flatSubstatTypes = new Set(['flat_atk', 'flat_hp', 'flat_def'])

export function formatSubstatTierNumber(substatType, value) {
  const numericValue = Number.isFinite(value) ? value : 0
  return String(numericValue)
}

export function formatSubstatTierUnit(substatType) {
  return flatSubstatTypes.has(substatType) ? '' : '%'
}

export function formatSubstatTierValue(substatType, value) {
  return `${formatSubstatTierNumber(substatType, value)}${formatSubstatTierUnit(substatType)}`
}

export function sampleStageText(stage) {
  return stage?.label || '暂无样本阶段'
}

export function confidenceText(confidence) {
  const labels = {
    low: '低',
    medium: '中',
    high: '高',
  }
  return labels[confidence] || confidence || '未知'
}

export function statusText(status) {
  const labels = {
    recording: '记录中',
    monitoring: '监控中',
    insufficient_data: '样本不足',
    not_started: '未启动',
    active: '已启用',
  }
  return labels[status] || status || '未知'
}

export function modelWeightLabel(key) {
  const labels = {
    rule: '规则均衡',
    bayes: '周期规律',
    markov: '近期序列',
    context: '上下文监测',
  }
  return labels[key] || key
}
