# Wuwa Repository Instructions

本文件同时服务于 AI 编程工具和参与项目的开发者。进入仓库后，先按本文找到当前任务需要遵守的长期规范，再开始修改。

## 开发前必读

所有任务先阅读：

1. `docs/developer-onboarding.md`
2. `docs/product-principles-and-scope.md`
3. `docs/architecture.md`
4. `docs/engineering-quality.md`
5. 当前任务对应的长期规范

前端或 UI 任务还必须阅读：

1. `PRODUCT.md`
2. `DESIGN.md`
3. `docs/product-interface-principles.md`
4. `docs/web-ui-design-system-v2.md`
5. 对应页面规范，例如 `docs/web-workbench-ui-guidelines.md`
6. 涉及字体时阅读 `docs/superpowers/specs/2026-07-13-wuwa-typography-system-design.md`

后端、API 或数据库任务还必须阅读：

- `docs/api-and-data-contracts.md`
- `docs/security-privacy-and-data-boundaries.md`
- `docs/performance-and-background-runtime.md`

## 文档优先级

- 顶层长期规范定义当前有效规则。
- `DESIGN.md` 是 Web 视觉 token、字体、组件语言和交互状态的当前总入口。
- 页面专项规范补充具体页面规则，不能绕过产品、架构、安全和数据边界。
- `docs/superpowers/specs/`、`docs/superpowers/plans/`、`docs/archive/` 和 `memory/` 提供专项背景与历史决策，不自动覆盖长期规范。
- 文档与实现冲突时，不要静默修改文档去迎合代码，也不要凭个人判断改代码。先确认预期，再同步实现、测试和长期文档。

## 开发规则

- 新功能和独立重构使用功能分支，不直接在 `main` 上开发。
- 代码必须落在正确 owner 下，不继续加厚 `App.vue` 或 Django view。
- 影响产品流程、API、数据库、安全、隐私、OCR、后台性能或公共 UI 规则时，先更新或确认对应文档。
- recognition、认证、`GameAccount` 或稳定响应字段变化时，必须把外部本地识别客户端视为兼容调用方。
- UI 改动复用现有 token、字体角色、组件状态和 feature CSS，不为单页引入新视觉体系。
- 提交前运行与风险匹配的测试和构建，并记录没有执行的验证及原因。
- 独立功能完成后，将实际结果写入 `docs/archive/`，阶段计划不能代替实施记录。

## 仓库卫生

- 除下述唯一例外外，不提交密码、密钥、token、真实远端地址、用户本地绝对路径或私有配置：pre-release 阶段允许保留仅绑定本机回环 PostgreSQL 的开发默认密码 `root`，其适用范围和生产切换要求以 `docs/security-privacy-and-data-boundaries.md` 为准。
- 不提交 `.venv/`、`node_modules/`、`dist/`、`build/`、`tmp/`、日志、本地数据库或运行态 PID。
- 暂存前检查 `git status --short` 和 `git diff --check`。
