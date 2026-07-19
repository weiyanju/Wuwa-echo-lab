# Documentation and Design Governance Sync Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 以当前代码、配置、测试和有效长期规范为证据，完成一次不改变产品行为的全仓文档与设计规范同步，并把无法仅凭仓库证据裁决的冲突单独记录。

**Architecture:** 本次只修改文档。长期规范仅吸收已经由多处实现与测试证明的稳定事实；涉及产品契约、运行端口或视觉决策的分歧不自动改写任一方，而是在归档记录和最终交付中给出双方证据、选项与建议。

**Tech Stack:** Markdown、Git、PowerShell、Vue/Vite、Django、WPF/.NET

---

### Task 1: 同步 Vue 稳定共享 owner

**Files:**
- Modify: `docs/developer-onboarding.md`
- Modify: `docs/architecture.md`
- Modify: `docs/code-organization-and-style.md`

- [x] 将已经存在并被多页面复用的 `WuwaFrontend/src/shared/` 加入当前结构与代码落点说明。
- [x] 明确 `shared/` 只承接稳定的跨 feature 纯逻辑；当前 `sampleExperience.js` 统一样本成熟度、评估就绪和空指标语义。
- [x] 将 `components/` 补入架构树，保持与现有组件目录和架构测试一致。
- [x] 不扩大 `shared/` 的职责，不把 feature 页面状态或 API 调用迁入该目录。

### Task 2: 同步前端质量证据

**Files:**
- Modify: `docs/engineering-quality.md`

- [x] 将过时的前端测试覆盖摘要更新为当前稳定覆盖面。
- [x] 纳入跨 feature 样本语义、可复用 UI、feature 工作流、视觉/架构约束和无障碍状态等当前测试事实。
- [x] 保留“按风险运行命中测试或构建”的原则，不写死易过期的测试数量。

### Task 3: 记录审计边界、结论和待确认冲突

**Files:**
- Create: `docs/archive/2026-07-20-documentation-and-design-governance-sync.md`

- [x] 记录审计范围、证据优先级和已同步的长期事实。
- [x] 记录未修改的文档及原因，避免把历史归档改写成当前规范。
- [x] 为后端端口、`GameAccount` 字段契约、暗色静态表面、设计 Token 命名和字体加载分别列出文档证据、实现证据、不可自动裁决原因、A/B 选项与建议。
- [x] 加入面向当前稳定能力的文档覆盖矩阵，并标明仍需产品决策的缺口。

### Task 4: 验证并提交

**Files:**
- Verify: all modified documentation

- [x] 运行 `git diff --check`，确认没有空白错误。
- [x] 检查修改文档中的相对链接、命令引用、敏感信息和本地绝对路径。
- [x] 解析 `.impeccable/design.json`，并核对与 `DESIGN.md` 的结构化设计入口仍可读取；不把已记录冲突误报为已解决。
- [x] 运行与文档风险匹配的前端、后端和 WPF 验证，并如实记录未执行或失败项。
- [x] 只显式暂存本计划列出的文档，提交信息使用 `docs: synchronize project and design governance`。
- [x] 不推送；提交后确认工作区干净并记录分支名与提交 SHA。
