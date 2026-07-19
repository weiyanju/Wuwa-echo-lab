# 百分比差值展示实施记录

**日期：** 2026-07-19

## 实施结果

- 统计诊断的偏高、偏低和逐行偏差统一显示为带正负号的 `%`。
- 模型评估 Top3、Top5 的新增覆盖统一显示为带正负号的 `%`，可访问名称保留明确比较对象。
- 统计与评估统一复用 `formatSignedPercent`，旧的单位专属格式化函数已经删除。
- 比例原始值、绝对差计算、排序、图表比例、API 和数据契约均未改变。

## 文档边界

- `DESIGN.md`、`docs/product-interface-principles.md`、`docs/web-ui-design-system-v2.md` 与 `.impeccable/design.json` 已同步为当前有效的百分号差值展示规则。
- 既有计划和归档继续保留当时的原始设计事实，没有批量改写。

## 验证

- `npm test`：通过。
- `npm run build`：通过。
- 活跃前端源码、`DESIGN.md`、`docs/product-interface-principles.md`、`docs/web-ui-design-system-v2.md` 和 `.impeccable/design.json` 的旧单位静态检查：无匹配。
- `git diff --check`：通过。
