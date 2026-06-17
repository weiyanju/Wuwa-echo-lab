export const canonicalModelLabels = {
  rule: '规则均衡',
  bayes: '周期规律',
  markov: '近期序列',
  cycle: '词条窗口',
  context: '上下文监测',
}

export const modelBacktestNotes = {
  rule: '全局分布修正',
  bayes: '历史片段匹配',
  markov: '近期重复冷却',
  cycle: '窗口信号监测',
  context: '样本不足，暂未参与融合',
}

export const modelOrder = ['rule', 'bayes', 'markov', 'cycle', 'context']

export const evaluationMetricDefinitions = [
  {
    key: 'log_loss',
    label: 'Log Loss',
    target: '越低越好',
    description: '概率分布是否把真实词条放在高概率区间',
  },
  {
    key: 'brier_score',
    label: 'Brier Score',
    target: '越低越好',
    description: '预测概率和真实结果的平方误差',
  },
  {
    key: 'top_1_hit_rate',
    label: 'Top 1 命中率',
    target: '越高越好',
    description: '概率第一名是否命中真实词条',
  },
  {
    key: 'top_3_hit_rate',
    label: 'Top 3 命中率',
    target: '越高越好',
    description: '前三名候选是否覆盖真实词条',
  },
  {
    key: 'top_5_hit_rate',
    label: 'Top 5 命中率',
    target: '越高越好',
    description: '前五名候选是否覆盖真实词条',
  },
]

export const sampleStageDefinitions = [
  { label: '0-500', text: '规则基线', min: 0, max: 500 },
  { label: '500-3000', text: '总体偏差', min: 500, max: 3000 },
  { label: '3000-10000', text: '上下文检验', min: 3000, max: 10000 },
  { label: '10000-50000', text: '顺序依赖', min: 10000, max: 50000 },
  { label: '50000+', text: '权重优化', min: 50000, max: Number.POSITIVE_INFINITY },
]

export const sampleStageAxisDefinitions = [
  { label: '0', caption: '规则基线', threshold: 0, max: 500 },
  { label: '500', caption: '总体偏差', threshold: 500, max: 3000 },
  { label: '3000', caption: '上下文检验', threshold: 3000, max: 10000 },
  { label: '10000', caption: '顺序依赖', threshold: 10000, max: 50000 },
  { label: '50000+', caption: '权重优化', threshold: 50000, max: Number.POSITIVE_INFINITY },
]
