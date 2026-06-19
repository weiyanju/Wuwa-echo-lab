# Web 认证页样式拆分实施记录

## 目标

将登录/注册页布局、说明卡和响应式规则从全局 `style.css` 迁移到 auth feature 所有者，同时保持认证流程与共享控件语义不变。

## 实际完成内容

- 新增 `WuwaFrontend/src/styles/features/auth.css`。
- 迁移 `auth-*` 与 `login-info-*` 的布局、背景、暗色主题和响应式规则。
- `button-buy`、`checkbox-row`、`error-text` 等跨 auth 与 UID 页面使用的规则继续留在共享入口。
- `style.css` 物理行数从 6553 降至 6323。
- 新增 auth 样式所有权与行数守卫测试，并更新主题测试读取实际样式所有者。
- 修复 520px 下登录说明段落禁止换行造成的横向溢出。

## 修改文件

- `WuwaFrontend/src/style.css`
- `WuwaFrontend/src/styles/features/auth.css`
- `WuwaFrontend/src/architecture.test.js`
- `WuwaFrontend/src/App.test.js`

## API、数据库与行为边界

无变化。未修改认证 API、账号模型、登录/注册命令或本地用户名记忆行为。

## 测试与视觉验收

- `npm test`：89 个测试全部通过。
- `npm run build`：生产构建通过。
- 浏览器验证桌面浅色和暗色登录页。
- 520px 下说明文字恢复正常换行，文档滚动宽度从 543px 降至 505px，小于 520px 视口。
- 浏览器控制台无 warning 或 error。

## 性能与资源影响

- 未新增依赖、网络请求或运行时状态。
- 生产 CSS 151.38 kB，gzip 27.43 kB；JavaScript 165.84 kB，gzip 57.56 kB。

## 下一阶段入口

继续阶段 3，拆分 workspace/UID 与共享控件样式，进一步缩小全局入口。
