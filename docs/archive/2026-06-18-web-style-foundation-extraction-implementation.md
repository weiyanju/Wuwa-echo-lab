# Web 样式基础层拆分实施记录

## 目标

将全局设计 token 和基础 reset 从大型 `style.css` 中迁入独立样式文件，保持现有变量值、选择器语义和页面视觉不变。

## 实际完成内容

- 新增 `styles/tokens.css`，集中保存现有全局颜色、阴影、字体和平滑渲染变量。
- 新增 `styles/base.css`，集中保存 box sizing、页面基础样式、表单字体、按钮状态和应用根节点规则。
- `style.css` 通过显式 `@import` 保持原有加载顺序。
- 增加样式结构测试，防止全局 token 再次回流到入口文件。
- 将 `style.css` 增长守卫从 8850 行下调到 8790 行。

## 修改模块与文件

- `WuwaFrontend/src/style.css`
- `WuwaFrontend/src/styles/tokens.css`
- `WuwaFrontend/src/styles/base.css`
- `WuwaFrontend/src/architecture.test.js`

## API、数据库与数据边界变化

无。

## 性能与资源影响

- 没有新增网络请求、运行时状态或 JavaScript 模块。
- CSS 仍由 Vite 合并为单个生产资源，构建产物结构不变。

## 测试与验收结果

- `npm test`：60 个测试通过。
- `npm run build`：生产构建通过。
- `style.css` 从 8843 个物理行下降到 8786 行。
- `git diff --check`：通过。

## 与原计划的偏差

无。本阶段只迁移已有规则，没有修改颜色值或 feature 选择器。

## 遗留问题

- feature 和 shell 样式仍集中在 `style.css`，需要继续按业务边界拆分。
- 浏览器视觉基线仍需在浏览器运行时可用后补做。

## 长期规范同步

本次落实既有样式 token 和入口文件变薄规则，不需要修改长期规范。

## 下一阶段入口

优先拆分 shell 与已独立的 recognition、statistics feature 样式；每次只移动一组选择器并执行构建与浏览器视觉验证。
