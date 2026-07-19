# 模型评估核心回测与融合权重优化实施记录

## 目标

在不改变 API、评估算法和子模型回测模块的前提下，落实模型评估页已确认的视觉方案：

- 核心回测改为真实比例的同基线水平比较条。
- Top3、Top5 的新增覆盖使用百分点表达，并放在相邻累计命中率之间。
- 横轴随最大命中率自适应，避免数据超过 20% 后溢出或失真。
- 当前融合权重移除蓝绿装饰渐变，区分当前权重、基础权重和未启用状态。
- 1180px 保持五列，1000px 以下直接转换为逐模型单行布局，不出现 3+2。

## 实际完成内容

### 核心回测

- 将固定位置的渐变横轴、发光节点和说明框替换为 Top1、Top3、Top5 三条同基线水平比较条。
- 比较条长度按真实数值和当前横轴上限计算，当前示例分别显示 11.59%、13.04%、18.84%。
- Top3 相对 Top1 显示 `+1.45pp`，Top5 相对 Top3 显示 `+5.80pp`；桌面端标注位于相邻两行数值之间。
- Log Loss 和 Brier Score 保留为紧凑的事实指标，不增加无基准的好坏判断。
- 新增自适应横轴工具：低值阶段保持 0–20%，数据提高后依次扩展到 30%、40%……100%，并保留 0、50%、100% 三个相对刻度位置。
- 缺少单项指标时显示 `--`，不伪造 0 值；评估整体零样本状态继续由现有 readiness 页面统一处理。

### 当前融合权重

- 当前权重条统一使用语义品牌蓝 `var(--primary)`。
- 基础权重标记改为中性 `var(--steel)`，移除阴影和光晕。
- 未启用模型的权重条和基础标记使用 `var(--stone)`，卡片使用弱表面，继续保留明确状态文本。
- 图例同步改为纯色品牌蓝和中性灰，不再使用蓝绿渐变。
- 未改变权重数据、排序、状态判断、摘要联动或子模型回测交互。

### 响应式

- 1440px 及以上：核心比较图限制最大宽度，避免无限拉长。
- 1180px：融合权重仍保持五列。
- 1000px 以下：五个模型直接转为五条单行分析行，每行左侧为模型与当前权重，右侧为当前/基础比较条。
- 860px：核心模块指标头部允许换行，数据列保持对齐。
- 520px：核心图隐藏横轴刻度，名称、数值和增量优先显示，比较条单独占一行；融合权重转为纵向卡片内容，无横向溢出。

## 修改文件

- `WuwaFrontend/src/features/evaluation/EvaluationCoreBacktest.vue`
- `WuwaFrontend/src/features/evaluation/coverageScale.js`
- `WuwaFrontend/src/features/evaluation/coverageScale.test.js`
- `WuwaFrontend/src/features/evaluation/EvaluationCoreBacktest.test.js`
- `WuwaFrontend/src/features/evaluation/EvaluationOverview.test.js`
- `WuwaFrontend/src/styles/features/evaluation.css`
- `WuwaFrontend/src/styles/features/evaluation-layout.css`
- `WuwaFrontend/src/App.test.js`
- `WuwaFrontend/src/architecture.test.js`

## API、数据结构与业务边界

无变化。继续读取现有 `top_1_hit_rate`、`top_3_hit_rate`、`top_5_hit_rate`、`log_loss`、`brier_score` 和融合权重字段；没有新增网络请求、持久化状态或计算口径。

## 测试与验收

- 自适应横轴工具使用测试驱动完成，覆盖低值、50% 高值、无效值和 100% 上限。
- 核心回测组件测试覆盖比例计算、百分点文案、校准指标、语义类名和旧装饰结构清理。
- 融合权重测试覆盖纯色当前权重、中性基础标记、禁用状态和断点布局。
- `npm test`：320 项测试全部通过。
- `npm run build`：Vite 生产构建通过。
- `git diff --check`：通过。
- 浏览器验收：
  - 1180px：五列单行，无横向溢出。
  - 999px：五条单行分析行，不出现 3+2。
  - 520px：无横向溢出，横轴和增量按移动端规则重排。
  - 深色模式：当前权重无渐变，基础标记无阴影，信息结构与浅色模式一致。

## 与方案的偏差

无业务范围偏差。没有调整子模型回测，也没有引入 100% 构成条或额外解释文本，以避免重复信息和页面文字负担。

## 长期规范同步

本次实现复用现有颜色、字体、间距和主题 token，没有引入新的公共组件规则，因此无需修改长期设计规范。
