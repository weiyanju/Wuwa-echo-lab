# Wuwa Design Governance and Audit Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the approved Wuwa interface the default design baseline and constrain Impeccable audit findings to verified, explicitly approved changes without altering current colors, typography, or frontend behavior.

**Architecture:** Add a governance section and named rules to `DESIGN.md`, then mirror those rules in `.impeccable/design.json`. Protect the structured design data with before/after hashes, validate JSON and cross-file rule parity, and record the completed documentation change without touching Vue or CSS.

**Tech Stack:** Markdown, JSON, PowerShell, bundled Node.js

---

### Task 1: Establish the human-readable governance contract

**Files:**
- Modify: `DESIGN.md:179-405`
- Reference: `docs/superpowers/specs/2026-07-14-design-governance-and-audit-boundary-design.md`

- [x] **Step 1: Record the immutable structured frontmatter hash**

Run from the repository root:

```powershell
.\.tools\node\node.exe -e "const fs=require('fs'),c=require('crypto');const s=fs.readFileSync('DESIGN.md','utf8');const end=s.indexOf('\n---',4)+4;console.log(c.createHash('sha256').update(s.slice(0,end)).digest('hex'))"
```

Expected: print one SHA-256 hash. Record it as `DESIGN_FRONTMATTER_HASH`; the same command must produce the same value after editing.

- [x] **Step 2: Add the governance section before `## 1. Overview`**

Insert this exact section after the second frontmatter delimiter:

```markdown
## 0. 使用方式与审查边界

本文件是 Wuwa Web 当前设计的最高视觉入口，但它不把任何外部工具的通用规则自动升级为项目决策。当前已经被用户确认的页面截图、浏览器渲染结果、稳定实现和明确设计决策共同构成批准基线；后续改动默认在此基础上渐进演进。

Impeccable `audit` 是技术诊断和候选问题清单，不是设计定稿，也不直接授权修改颜色、字体、圆角、阴影、动效或组件结构。Audit 的严重等级、健康分数、命令建议和颜色字面量数量都不能替代项目判断。

当本文件、`.impeccable/design.json` 与实现冲突时，不自动修改代码迎合文档，也不自动降低文档迎合代码。先将冲突标记为待决策项，用户批准具体方案后再同步文档、实现和测试。

每项审查发现必须先归入以下类型：

- **无视觉修复**：语义 HTML、ARIA 关联、焦点管理和内容默认可见等；可以在保持截图稳定的前提下实施。
- **实测后决定**：动画性能、CSS 与字体加载、响应式溢出和点击目标；先取得浏览器或性能数据。
- **视觉提案**：配色、字体层级、圆角、阴影、按钮造型和动效语言；必须提供局部前后对比并获得用户批准。
- **项目例外**：真实表达路径、进度、数据结构或品牌交互的功能图形；记录后不再按装饰性反模式反复整改。

颜色 token 化、主题变量收敛和 CSS ownership 整理的第一阶段必须保持零视觉漂移：只能改变命名和引用方式，不能改变最终计算颜色、字体角色、字号、字重、间距或组件几何。
```

- [x] **Step 3: Replace the baseline and contrast rules**

Replace `The Normative Baseline Rule` with these rules:

```markdown
**The Approved Baseline Rule.** 当前已经被用户确认的页面截图、浏览器渲染结果、稳定实现和明确设计决策共同构成批准基线；Impeccable 或其他通用工具的规则只能提供候选问题，不能自动覆盖该基线。

**The Audit Triage Rule.** Audit 发现必须先归类为无视觉修复、实测后决定、视觉提案或项目例外；只有无视觉修复可以在保持渲染稳定的前提下直接实施，视觉提案必须获得用户批准。

**The No Visual Drift Rule.** Token 化、主题收敛和样式重构默认只改变命名与引用，不改变最终色值、字体、间距或几何；任何视觉变化必须限定范围、说明用户价值并提供前后截图。
```

Replace `The Contrast Floor Rule` with:

```markdown
**The Readability Guardrail Rule.** 关键正文、表单值、操作标签、错误信息和焦点状态必须清楚可读；对比度用于发现文字过灰和状态不可辨等真实回归，不用于按 audit 分数批量重映射项目色板。禁用内容、装饰线、非文字图形和低权重图表刻度按实际语义判断。
```

- [x] **Step 4: Add token layering and approved exceptions**

Append these rules to the Colors section after the named color rules:

```markdown
### Token layering

- 全局语义 token 只承载主色、文字、表面、边框、成功、警告和错误。
- 评估模型、Bayes 路径、覆盖范围、识别和工作台专属语义使用 feature token。
- 数据图形内部允许保留表达具体数据含义的局部颜色，但必须提供需要的主题映射。
- 颜色字面量数量不等于设计缺陷数量；不得为了减少统计数字而改变现有视觉，也不得把全部图表颜色提升为全局 token。

### Approved functional graphic exceptions

- Bayes Exact / Wildcard 路径左侧的实线与虚线路径标记属于推理结构图形。
- 登录标题的 4px 打字光标及其已批准间距属于品牌交互图形。
- 真实表达进度、概率分布、模型路径或状态结构的线条属于功能图形。
- 例外只保护功能语义，不豁免溢出、遮挡、错误交互或不可读文字。
```

- [x] **Step 5: Update the Do and Don't guidance**

Add these entries under `### Do`:

```markdown
- **Do** 把当前批准渲染作为视觉改动的默认比较基线。
- **Do** 在修改颜色、字体、圆角、阴影或动效前提供局部前后截图并获得批准。
- **Do** 先以相同最终值完成全局 token、feature token 和局部数据可视化颜色的分层。
```

Replace the existing 4.5:1 Don't entry with these entries:

```markdown
- **Don't** 为提高 audit 分数、减少颜色字面量或满足通用偏好而批量替换现有配色、字体或组件造型。
- **Don't** 让关键正文、表单值、操作标签和错误信息使用不可读的浅灰色，也不要让 `colors.decorative-muted` 承载这些内容。
- **Don't** 把已登记的 Bayes 路径、登录打字光标或其他功能图形当作装饰性侧边条删除。
```

- [x] **Step 6: Verify the structured frontmatter is unchanged**

Run the Step 1 hash command again.

Expected: the output exactly equals `DESIGN_FRONTMATTER_HASH`.

### Task 2: Mirror governance in the machine-readable design file

**Files:**
- Modify: `.impeccable/design.json:536-642`
- Reference: `DESIGN.md`

- [x] **Step 1: Record the immutable structured design hash**

Run:

```powershell
.\.tools\node\node.exe -e "const fs=require('fs'),c=require('crypto');const d=JSON.parse(fs.readFileSync('.impeccable/design.json','utf8'));const {narrative,...structured}=d;console.log(c.createHash('sha256').update(JSON.stringify(structured)).digest('hex'))"
```

Expected: print one SHA-256 hash. Record it as `STRUCTURED_DESIGN_HASH`.

- [x] **Step 2: Extend `narrative.overview`**

Append these paragraphs to the existing overview string:

```text

当前已经被用户确认的页面截图、浏览器渲染结果、稳定实现和明确设计决策共同构成批准基线。Impeccable audit 是技术诊断和候选问题清单，不是设计定稿，也不直接授权修改视觉语言。

当文档与实现冲突时先记录为待决策项。Token 化、主题收敛和样式重构默认保持零视觉漂移；任何配色、字体、圆角、阴影、动效或组件造型变化必须提供局部前后对比并获得用户批准。
```

- [x] **Step 3: Replace and extend `narrative.rules`**

Remove `The Normative Baseline Rule` and `The Contrast Floor Rule`. Add these rule objects while preserving all unrelated rules:

```json
{
  "name": "The Approved Baseline Rule",
  "body": "当前已经被用户确认的页面截图、浏览器渲染结果、稳定实现和明确设计决策共同构成批准基线；Impeccable 或其他通用工具的规则只能提供候选问题，不能自动覆盖该基线。",
  "section": "overview"
},
{
  "name": "The Audit Triage Rule",
  "body": "Audit 发现必须先归类为无视觉修复、实测后决定、视觉提案或项目例外；只有无视觉修复可以在保持渲染稳定的前提下直接实施，视觉提案必须获得用户批准。",
  "section": "overview"
},
{
  "name": "The No Visual Drift Rule",
  "body": "Token 化、主题收敛和样式重构默认只改变命名与引用，不改变最终色值、字体、间距或几何；任何视觉变化必须限定范围、说明用户价值并提供前后截图。",
  "section": "overview"
},
{
  "name": "The Readability Guardrail Rule",
  "body": "关键正文、表单值、操作标签、错误信息和焦点状态必须清楚可读；对比度用于发现文字过灰和状态不可辨等真实回归，不用于按 audit 分数批量重映射项目色板。禁用内容、装饰线、非文字图形和低权重图表刻度按实际语义判断。",
  "section": "colors"
},
{
  "name": "The Token Layering Rule",
  "body": "全局 token 只承载跨页面语义；评估模型、Bayes 路径、覆盖范围、识别和工作台专属语义使用 feature token；局部数据图形可以保留有明确含义和主题映射的颜色。颜色字面量数量不等于设计缺陷数量。",
  "section": "colors"
},
{
  "name": "The Functional Graphic Exception Rule",
  "body": "Bayes Exact / Wildcard 路径标记、登录标题 4px 打字光标及真实表达进度、概率分布、模型路径或状态结构的线条属于功能图形，不按装饰性侧边条处理。",
  "section": "components"
}
```

- [x] **Step 4: Synchronize `narrative.dos` and `narrative.donts`**

Append these `dos` strings:

```json
"**Do** 把当前批准渲染作为视觉改动的默认比较基线。",
"**Do** 在修改颜色、字体、圆角、阴影或动效前提供局部前后截图并获得批准。",
"**Do** 先以相同最终值完成全局 token、feature token 和局部数据可视化颜色的分层。"
```

Replace the existing 4.5:1 `donts` string with:

```json
"**Don't** 为提高 audit 分数、减少颜色字面量或满足通用偏好而批量替换现有配色、字体或组件造型。",
"**Don't** 让关键正文、表单值、操作标签和错误信息使用不可读的浅灰色，也不要让 `colors.decorative-muted` 承载这些内容。",
"**Don't** 把已登记的 Bayes 路径、登录打字光标或其他功能图形当作装饰性侧边条删除。"
```

- [x] **Step 5: Parse JSON and verify structured data is unchanged**

Run:

```powershell
.\.tools\node\node.exe -e "JSON.parse(require('fs').readFileSync('.impeccable/design.json','utf8')); console.log('design.json valid')"
.\.tools\node\node.exe -e "const fs=require('fs'),c=require('crypto');const d=JSON.parse(fs.readFileSync('.impeccable/design.json','utf8'));const {narrative,...structured}=d;console.log(c.createHash('sha256').update(JSON.stringify(structured)).digest('hex'))"
```

Expected: first command prints `design.json valid`; second command exactly equals `STRUCTURED_DESIGN_HASH`.

- [x] **Step 6: Verify rule parity across both files**

Run:

```powershell
.\.tools\node\node.exe -e "const fs=require('fs');const md=fs.readFileSync('DESIGN.md','utf8');const d=JSON.parse(fs.readFileSync('.impeccable/design.json','utf8'));const names=['The Approved Baseline Rule','The Audit Triage Rule','The No Visual Drift Rule','The Readability Guardrail Rule'];for(const name of names){if(!md.includes(name)||!d.narrative.rules.some(r=>r.name===name))throw new Error('missing '+name)}console.log('governance rules mirrored')"
```

Expected: print `governance rules mirrored`.

### Task 3: Record and verify the documentation-only implementation

**Files:**
- Create: `docs/archive/2026-07-14-design-governance-and-audit-boundary-implementation.md`
- Modify: `docs/superpowers/plans/2026-07-14-design-governance-and-audit-boundary.md`

- [x] **Step 1: Create the implementation record**

Create the archive file with:

```markdown
# Wuwa 设计治理与 Impeccable 审查边界实施记录

## 结果

- 将当前已批准的页面渲染和明确设计决策设为默认视觉基线。
- 明确 Impeccable audit 只产生候选问题，不自动授权视觉改造。
- 建立无视觉修复、实测后决定、视觉提案和项目例外四类审查分流。
- 要求 token 化、主题收敛和样式重构首先保持零视觉漂移。
- 保留 Bayes 路径、登录标题打字光标和真实数据结构线条的功能图形例外。
- 将可读性作为防止浅灰文字等回归的底线，而不是按 audit 分数批量调色的目标。

## 范围

- 更新 `DESIGN.md` 与 `.impeccable/design.json` 的治理叙述。
- 没有修改 Vue、CSS、图片、字体资源或运行时行为。
- 没有改变结构化颜色、字体、圆角、间距和组件值。

## 验证

- `DESIGN.md` frontmatter 哈希保持不变。
- `.impeccable/design.json` 非 narrative 数据哈希保持不变。
- `.impeccable/design.json` 通过 JSON 解析。
- 四项核心治理规则在两份设计入口中保持镜像。
- `git diff --check` 通过。
```

- [x] **Step 2: Run final documentation checks**

Run:

```powershell
git diff --check
git status --short
git diff --name-only
```

Expected: `git diff --check` exits 0. No new Vue, CSS, image, or font changes are introduced by this plan; existing unrelated workspace changes remain unstaged.

- [x] **Step 3: Review the exact staged scope**

Stage only:

```powershell
git add DESIGN.md .impeccable/design.json docs/superpowers/plans/2026-07-14-design-governance-and-audit-boundary.md docs/archive/2026-07-14-design-governance-and-audit-boundary-implementation.md
git diff --cached --check
git diff --cached --name-only
```

Expected staged files are exactly the four listed paths. Because `DESIGN.md` and `.impeccable/design.json` already contain the previously approved regenerated design state, review their complete staged diff before committing; do not stage any other workspace files.

- [x] **Step 4: Commit the approved design entry state**

```powershell
git commit -m "docs: establish design audit governance"
```

Expected: commit succeeds with only the four reviewed documentation paths.
