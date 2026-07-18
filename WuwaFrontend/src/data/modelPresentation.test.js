import assert from 'node:assert/strict'
import test from 'node:test'

import { modelOrder, sampleStageAxisDefinitions } from './modelPresentation.js'

test('sample stage axis definitions lock the approved model-weight schedule', () => {
  const stages = sampleStageAxisDefinitions.map(({ caption, rangeLabel, focus, weights }) => ({
    caption,
    rangeLabel,
    focus,
    weights,
  }))

  assert.deepEqual(stages, [
    {
      caption: '规则基线',
      rangeLabel: '0–499 条',
      focus: '规则对照',
      weights: { rule: 70, bayes: 10, markov: 10, cycle: 10, context: 0 },
    },
    {
      caption: '总体偏差',
      rangeLabel: '500–2,999 条',
      focus: '整体分布',
      weights: { rule: 48, bayes: 26, markov: 12, cycle: 14, context: 0 },
    },
    {
      caption: '上下文检验',
      rangeLabel: '3,000–9,999 条',
      focus: 'COST、套装、位置',
      weights: { rule: 36, bayes: 30, markov: 12, cycle: 16, context: 6 },
    },
    {
      caption: '顺序依赖',
      rangeLabel: '10,000–49,999 条',
      focus: '前后词条关联',
      weights: { rule: 28, bayes: 34, markov: 10, cycle: 18, context: 10 },
    },
    {
      caption: '权重优化',
      rangeLabel: '50,000+ 条',
      focus: '模型融合配比',
      weights: { rule: 25, bayes: 35, markov: 10, cycle: 20, context: 10 },
    },
  ])

  for (const stage of sampleStageAxisDefinitions) {
    assert.deepEqual(Object.keys(stage.weights), modelOrder)
    assert.equal(Object.values(stage.weights).reduce((sum, weight) => sum + weight, 0), 100)
  }
})
