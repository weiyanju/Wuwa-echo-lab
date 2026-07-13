# Wuwa / Tethys Web 字体系统实施记录

## 目标

建立适合中文声骸数据工作台的统一字体体系，让中文、英文、品牌、数据和技术 metadata 在高密度界面中各有稳定语义，同时消除无效字重、随意字距和数字宽度跳动。

## 实际完成内容

- 引入 IBM Plex Sans SC 的 400、500、600、700 四档真实字重，以及 IBM Plex Mono 的 500、600 两档字重。
- 建立 `--font-cjk`、`--font-latin`、`--font-data`、`--font-mono` 四个语义字体入口。
- 建立页面标题、区块标题、卡片标题、正文、控件、标签、说明和数据的字号、行高、字重与字距令牌。
- 中文和常规拉丁文本默认不增加字距；缩写、全大写状态和 `TETHYS` 品牌使用受控 tracking token。
- UID、概率、百分比、样本量、排名和分数启用稳定数字宽度。
- 全面迁移登录、UID 初始化、顶部壳层、工作台、历史记录、识别复核、统计和评估页面的排版声明。
- 新增架构与字体测试，禁止无效字重、负字距、过小交互文字和散落的临时字体栈。

## 修改模块与文件

- `WuwaFrontend/package.json`
- `WuwaFrontend/package-lock.json`
- `WuwaFrontend/src/styles/tokens.css`
- `WuwaFrontend/src/styles/base.css`
- `WuwaFrontend/src/styles/controls.css`
- `WuwaFrontend/src/styles/shell.css`
- `WuwaFrontend/src/styles/features/*.css`
- `WuwaFrontend/src/typography.test.js`
- `WuwaFrontend/src/architecture.test.js`
- `docs/superpowers/specs/2026-07-13-wuwa-typography-system-design.md`
- `docs/superpowers/plans/2026-07-13-wuwa-typography-system.md`
- `DESIGN.md`
- `.impeccable/design.json`

## API、数据库与数据边界变化

无。字体资源随前端构建产物本地提供，不依赖第三方字体 CDN，也不改变任何业务数据。

## 性能与资源影响

- 前端增加 IBM Plex Sans SC 与 IBM Plex Mono 的本地字体包依赖。
- 仅加载实际使用的 Sans 400、500、600、700 和 Mono 500、600 字重，避免下载无用字重。
- 中文字体使用拆分后的 WOFF2 包；生产构建已验证可正常解析和打包。

## 测试与验收结果

- 2026-07-13 执行 `cd WuwaFrontend; ..\.tools\node\npm.cmd test`，211 项前端测试通过，其中包含字体语义、真实字重、字号下限、字距与数字排版契约。
- 2026-07-13 执行 `cd WuwaFrontend; ..\.tools\node\npm.cmd run build`，Vite 生产构建通过。
- 已在本地浏览器检查工作台主要区域，中文、品牌、数字与说明层级显示稳定，无合成粗体和明显基线错位。

## 与原计划的偏差

早期讨论曾考虑只保留 400、500、700 三档，最终根据控件和数据层级需求增加 600，形成 400、500、600、700 四档真实 Sans 字重。该结果减少了 700 在按钮、标签和数据中的滥用。

## 遗留问题

当前部分旧样式仍存在与字体无关的彩色粗侧边强调，已在项目文档审查记录中列为后续视觉债务，不在本次字体实施范围内处理。

## 长期规范同步

字体体系已写入 `DESIGN.md` 和 `.impeccable/design.json`；专项设计与实施细节保存在 `docs/superpowers/specs/` 和 `docs/superpowers/plans/`。

## 下一阶段入口

新增或修改界面时优先使用现有字体、字号、字重、行高和 tracking token；确需新增语义层级时，先更新字体规范与测试，再修改组件。
