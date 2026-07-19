# 零样本极简入口实施记录

日期：2026-07-16

## 实施结果

统计诊断与模型评估的零样本页面已统一为极简入口：保留页面标题、`待录入` 状态、必要说明和唯一主操作，移除进度轨道、步骤列表、阶段说明、预测来源与远期提示。

统计诊断文案：

- 标题：这里将显示你的个人副词条分布
- 说明：录入第一条副词条即可开始。
- 操作：去工作台录入

模型评估文案：

- 标题：积累历史后自动开启模型评估
- 说明：先建立 20 条上下文，再积累 20 条有效回测。
- 操作：去工作台录入

## 视觉与交互

- 空状态使用近白表面、冷灰描边和 16px 圆角，不使用阴影。
- 主操作使用现有 Tethys 品牌蓝 token；`待录入` 保持中性灰蓝状态，不引入成功、警告或错误语义色。
- 内容在面板中居中，移动端主按钮扩展到可用宽度并限制最大宽度。
- 两个入口继续触发现有 `start-recording` 事件，不改变工作台跳转逻辑。

## 代码范围

- `WuwaFrontend/src/features/statistics/StatisticsView.vue`
- `WuwaFrontend/src/features/evaluation/EvaluationView.vue`
- `WuwaFrontend/src/features/evaluation/EvaluationReadinessState.vue`
- `WuwaFrontend/src/styles/sample-readiness.css`
- `WuwaFrontend/src/styles/features/statistics.css`
- `WuwaFrontend/src/styles/features/evaluation.css`
- `WuwaFrontend/src/styles/features/evaluation-layout.css`
- 对应统计、评估与架构测试

后端阈值、API、就绪语义、有数据页面、加载态和错误态均未改变。

## 验证记录

- 测试驱动：先更新最终设计断言，旧实现出现 5 个预期失败；完成实现后，统计、评估和架构定向测试 35/35 通过。
- 完整前端测试：`npm test`，302/302 通过。
- 生产构建：`npm run build` 通过。
- 浏览器检查：在 1440×900、520px 窄屏和深色模式下均无横向溢出；统计与评估最终文案、按钮、边框和表面色符合确认稿。
- 浏览器控制台未发现错误或警告，仅有 Vite 开发连接信息。

浏览器验证使用的临时零样本挂载页已在验证后删除，未修改或写入用户数据。
