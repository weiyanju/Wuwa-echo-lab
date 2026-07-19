import { sampleStageDefinitions } from '../data/modelPresentation.js'

export const EMPTY_METRIC_TEXT = '--'
export const EVALUATION_READY_TARGET = 20

const maturityDefinitions = Object.freeze([
  { key: 'optimized', min: 50000, label: '可优化权重' },
  { key: 'stable', min: 10000, label: '稳定观察' },
  { key: 'reference', min: 3000, label: '可作参考' },
  { key: 'initial', min: 500, label: '初步观察' },
  { key: 'recording', min: 1, label: '起步观察' },
])

export function sampleTotal(source = 0) {
  const rawValue = typeof source === 'object' && source !== null ? source.total_rolls : source
  const numericValue = Number(rawValue)
  return Number.isFinite(numericValue) ? Math.max(Math.trunc(numericValue), 0) : 0
}

export function hasRecordedSamples(source) {
  return sampleTotal(source) > 0
}

export function sampleMaturityState(source) {
  const total = sampleTotal(source)
  if (total === 0) return { key: 'empty', label: '待录入', tone: 'neutral', total, hasSamples: false }
  const maturity = maturityDefinitions.find(({ min }) => total >= min)
  return { ...maturity, tone: 'active', total, hasSamples: true }
}

export function sampleStageState(source) {
  const total = sampleTotal(source)
  const stage =
    sampleStageDefinitions.find(({ min, max }) => total >= min && total < max) ||
    sampleStageDefinitions.at(-1)
  const rangeLabel = Number.isFinite(stage.max)
    ? `${stage.min}–${stage.max} 条`
    : `${stage.min}+ 条`
  return { ...stage, total, rangeLabel }
}

export function evaluationReadinessState(evaluation) {
  const evaluated = sampleTotal(evaluation?.evaluated_count)
  const ready = evaluation?.status === 'ready'
  return {
    key: ready ? 'ready' : evaluated > 0 ? 'collecting' : 'empty',
    ready,
    evaluated,
    target: EVALUATION_READY_TARGET,
    progress: ready ? 1 : Math.min(evaluated / EVALUATION_READY_TARGET, 1),
  }
}

export function formatOptionalMetric(value, formatter = String) {
  if (value === null || value === undefined || value === '') return EMPTY_METRIC_TEXT
  const numeric = Number(value)
  return Number.isFinite(numeric) ? formatter(numeric) : EMPTY_METRIC_TEXT
}
