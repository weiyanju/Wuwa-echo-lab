# UID 绑定页单抬头实施记录

## 目标

将 UID 绑定页原有的独立大标题改为与登录 / 注册活动页签一致的全宽单抬头，使登录框内部页面使用同一套抬头语言，同时避免产生可点击页签或步骤条的错误暗示。

## 实施结果

- UID 绑定页顶部现在只显示居中的“绑定 UID”。
- 抬头复用认证页的 Control 字体角色、12px 底部内边距、响应式下方间距以及现有终端色彩 token。
- 深色 1px 规则线横跨登录框内容宽度。
- 抬头使用语义化 `<h2>`，不包含按钮、页签角色、步骤条或返回图标。
- 原“绑定游戏 UID”大标题已删除，说明文字移到抬头下方。
- UID 输入、校验、错误提示、自动聚焦、busy 状态、绑定按钮和底部“返回登录”行为均未改变。
- 登录 / 注册页面、登录框外框、认证逻辑和外层页面均未改变。

## 修改文件

- `WuwaFrontend/src/features/auth/UidBindingPanel.vue`
- `WuwaFrontend/src/features/auth/UidBindingPanel.test.js`
- `WuwaFrontend/src/App.test.js`
- `WuwaFrontend/src/styles/features/auth.css`
- `DESIGN.md`
- `docs/web-homepage-terminal-design.md`
- `docs/superpowers/specs/2026-07-19-single-uid-header-design.md`
- `docs/superpowers/plans/2026-07-19-single-uid-header.md`

## 测试驱动过程

- RED：聚焦测试 35/38 通过，3 项按预期因旧标题结构和旧样式失败。
- GREEN：实现单抬头后聚焦测试 38/38 通过。
- 首次完整测试暴露 `auth.css` 超过 420 行架构上限；未放宽阈值，而是让 UID 抬头与认证页共享既有 flex 对齐声明。
- 最终完整前端测试 345/345 通过。
- Vite 生产构建通过，89 个模块完成转换。
- `git diff --check` 通过；输出仅包含工作区既有评估页文件的换行提示。

## 浏览器验证边界

当前 `localhost:58378` 标签页是此前的 brainstorm 静态页面，并非正在运行的业务前端。为避免创建测试账号或改写本地业务数据，本次没有在该页面执行真实注册和 UID 绑定流程；视觉方案已在用户批准的独立预览中确认，生产结构、token 与响应式约束由组件和样式契约测试覆盖。

## 工作区边界

工作区中既有的评估页改动及其未跟踪实施记录不属于本任务，未被修改或暂存。
