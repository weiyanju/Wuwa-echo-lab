# 评估子模型判断摘要跟随可见父卡片实施记录

## 目标

修正判断摘要表面色 owner，使外层回测行、展开详情和判断摘要使用同一个可见状态色：

- 最高命中为绿色。
- 普通展开为蓝色。
- 未启用为灰色。
- 模型身份色只用于数据图形。

## 根因

上一版 `--model-surface-accent` 定义在 `.model-insight-card`，但生产页面中的该卡片背景被 `.model-row-detail .model-insight-card` 覆盖为透明。用户实际看到的父表面来自外层回测行和 `.model-row-detail`，后者还写死了绿色。因此最高命中的 Bayes“周期规律”出现了绿色父卡片和紫色判断摘要。

原静态测试只验证孤立的 `.model-insight-card`，没有覆盖真实嵌套层级和 CSS 级联。

## 实施内容

- 将 `--model-surface-accent` 移到外层 `.model-bars > article`。
- 普通状态使用蓝色，`.best` 覆盖为绿色，`.disabled` 覆盖为灰色。
- `.model-row-detail`、判断摘要和判断标签继承外层 token。
- 删除 `model-bayes`、`model-markov`、`model-cycle` 和内层 disabled 对表面 token 的覆盖。
- 保留 `--model-accent` 和现有图表局部颜色，模型数据图形未改变。
- hover 只消费已有 token，不修改 token，因此不会驱动摘要变色。

## 自动化验证

- 聚焦测试：22/22 通过。
- 完整前端测试：340/340 通过。
- Vite 生产构建：通过。
- `.impeccable/design.json` 解析：通过。
- `git diff --check`：通过。

## 浏览器视觉验收

临时验收页使用生产 `src/style.css` 和真实嵌套层级，验收后已删除：

- 最高命中 Bayes：外层、详情和判断摘要统一为绿色，计算 token 均为 `#2c9f70`。
- 普通展开 Markov：外层、详情和判断摘要统一为蓝色，计算 token 均为 `#1769d2`。
- 未启用 Context：外层、详情和判断摘要统一为灰色，计算 token 均为 `#677481`。
- 浅色和深色主题语义一致。
- 520px 时页面、主题区块和每个模型行均无横向溢出。
- 控制台无 warning 或 error。
- hover 不修改 token 的行为由聚焦回归测试锁定。

## API、数据与业务边界

无变化。没有修改 API、数据库、模型算法、内部 key、展示名称、权重、命中率、Loss、排序或回测口径。

## 长期规则

`DESIGN.md` 与 `.impeccable/design.json` 已改为“可见父卡片状态拥有表面 token”；上一版模型身份表面规则已被取代。
