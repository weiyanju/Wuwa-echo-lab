# Wuwa Echo Terminal - UI 架构与设计系统 V2.0

## 文档定位与优先级

本文档是 `Wuwa` 前端 UI 重构阶段的最高优先级设计依据。

当本文档与以下文档中的视觉、布局、组件或交互细节发生冲突时，前端 UI 实现优先遵循本文档：

- `docs/product-interface-principles.md`
- `docs/web-workbench-ui-guidelines.md`
- `docs/web-homepage-terminal-design.md`

以下长期约束仍然有效，除非本文档未来明确改写：

- 产品边界与非目标范围
- 账号、`GameAccount` 与 UID 数据隔离
- 本地识别、隐私与安全边界
- 错误恢复、数据可信与可回滚原则
- 不展示假数据、不引入游戏自动化、不破坏架构 owner 边界

## 设计基准

设计基准参考 Visual Studio Code / Cursor IDE 架构。

核心特征：

- 键盘优先（Keyboard-First）
- 高数据密度（High Data Density）
- 极度克制（Hyper-Minimalism）
- 命令面板驱动（Command-Palette Driven）

## 一、核心设计理念

### 1.1 界面即编辑器

放弃传统 Web 网站的“页面（Page）”概念，转为“视图（View）”与“面板（Panel）”概念。

用户不是在“浏览网站”，而是在“操作软件”。

### 1.2 内容绝对优先

UI 外壳（Chrome）必须退隐。

移除所有不必要的卡片底色、阴影和装饰性边框。数据、文本、树状结构和命令入口本身就是界面的骨架。

### 1.3 键盘可访问性

所有核心操作必须有对应的快捷键，并在 UI 上通过明确的 `<kbd>` 标签展示。

快捷键设计不是附加能力，而是前端信息架构的一部分。

### 1.4 瞬间反馈

放弃弹性和缓动动画。交互反馈必须是瞬间的，建议范围为 `0ms - 100ms`。

允许：

- 颜色突变
- 透明度切换
- 细边框状态变化
- 行背景高亮

禁止：

- Hover 上浮
- Hover 缩放
- 弹性动画
- bounce / spring 动画
- 由交互触发布局重排的位移动画

## 二、设计令牌体系

基于 VS Code / Cursor 的 Dark / Light Theme 架构，建立双模式语义化令牌。

Dark Mode（深色/极客模式）是本设计系统的基准模式。

### 2.1 颜色系统

组件中禁止写死 Hex 色值，必须通过 CSS 变量调用。

#### 画布与面板

```css
--bg-root: #000000;
--bg-panel: #0a0a0a;
--bg-surface: #111111;
```

用途：

- `--bg-root`：最底层纯黑画布
- `--bg-panel`：工作区、侧边栏、活动栏背景
- `--bg-surface`：悬浮菜单、下拉框、命令面板背景

#### 交互与高亮

```css
--accent-primary: #0066ff;
--accent-glow: rgba(0, 102, 255, 0.15);
```

用途：

- `--accent-primary`：激活 tab、选中行、主要操作、焦点边框
- `--accent-glow`：极微弱聚焦状态，不用于装饰性发光

#### 边框系统

```css
--border-subtle: #222222;
--border-strong: #333333;
```

用途：

- `--border-subtle`：常规模块分割
- `--border-strong`：输入框、悬浮面板、命令面板边框

VS Code 风格的关键不是无边框，而是细不可察但结构明确的边框。

#### 文本层级

```css
--text-primary: #ededed;
--text-secondary: #a1a1aa;
--text-tertiary: #52525b;
```

用途：

- `--text-primary`：标题、输入值、当前选中内容
- `--text-secondary`：列表项、辅助文案、普通元数据
- `--text-tertiary`：占位符、快捷键提示、弱说明文本

### 2.2 空间与网格

采用严密的 `4px` 基准网格系统。

```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
```

原则：

- 控件内部优先使用 `4px / 8px`
- 面板内部模块优先使用 `8px / 16px`
- 大区块分割优先使用 `16px / 24px`
- 新增间距 token 必须先证明现有 token 无法表达

### 2.3 排版缩放

采用“双字体引擎”。

```css
--font-ui: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif;
--font-code: "Geist Mono", "Fira Code", Menlo, Consolas, monospace;
```

用途：

- `--font-ui`：普通 UI、按钮、表单、说明文本
- `--font-code`：状态栏、快捷键、命令面板、路径、代码式数据、协议标签

字号极度克制，强调密集感：

```css
--text-xs: 11px;
--text-sm: 13px;
--text-base: 14px;
--text-lg: 18px;
--text-xl: 24px;
```

用途：

- `--text-xs`：底栏状态、快捷键、极弱提示
- `--text-sm`：侧边栏、表格数据、树状图
- `--text-base`：输入框、按钮、普通表单
- `--text-lg`：面板标题
- `--text-xl`：视图大标题

视图大标题可配合 `letter-spacing: -0.04em`，但不得低于 `-0.04em`。

## 三、核心架构布局

前端工作台放弃传统“头-身-底”网页布局，采用 IDE 四分栏架构。

### 3.1 活动栏

活动栏位于最左侧，宽度通常为 `48px`。

用途：

- 切换全局视图
- 承载一级入口
- 保持纯图标化与高密度

可承载视图：

- 首页
- 声骸仓库
- 数据预测面板
- 识别复核
- 设置

### 3.2 侧边栏

侧边栏位于活动栏右侧，宽度通常为 `240px - 300px`。

用途：

- 展示树状目录（Tree View）
- 展示 UID / GameAccount 列表
- 展示最近调谐记录 timeline
- 展示可折叠筛选器

侧边栏不使用重卡片堆叠。

### 3.3 编辑器区域

编辑器区域占据核心视觉空间。

结构：

- 顶部为类文件标签页（Tabs）
- 内部展示当前主工作台视图
- 支持多视图并列与可关闭面板

标签页应像编辑器文件，而不是传统网站导航菜单。

### 3.4 状态栏

状态栏位于浏览器最底部，高度约 `24px`。

风格：

- 等宽字体
- 高信息密度
- 低视觉权重

可展示：

- `SYSTEM.ONLINE`
- 当前 UID
- 当前 `GameAccount`
- 后台服务连接状态
- OCR / snapshot 队列状态
- 快捷键提示

## 四、核心 UI 组件规范

### 4.1 命令面板与输入框

命令面板是本设计系统的核心组件。

视觉特征：

- 无圆角或仅 `2px` 微圆角
- 背景色与所处面板同级或略深
- 默认边框为 `1px solid var(--border-strong)`

Focus 状态：

```css
border-color: var(--accent-primary);
box-shadow: 0 0 0 1px var(--accent-primary) inset;
```

禁止使用外部粗大阴影。

快捷键提示应常驻在搜索框右侧，例如：

```html
<kbd>Ctrl</kbd><kbd>K</kbd>
```

### 4.2 按钮系统

按钮采用紧凑、贴合文本的矩形结构。

#### 主按钮

规范：

- 背景：`var(--accent-primary)`
- 文字：`#ffffff`
- 圆角：`2px`
- 高度：`28px - 32px`
- Hover：调整背景亮度或透明度

禁止：

- Hover 上浮
- Hover 缩放
- 大圆角
- 大阴影

#### 次按钮 / Ghost Button

规范：

- 默认无背景
- 文字为 `var(--text-secondary)`
- Hover 背景为 `rgba(255, 255, 255, 0.05)`
- Hover 文字变为 `var(--text-primary)`

### 4.3 标签页与面包屑

标签页取代传统网页导航菜单。

Tabs 规范：

- 顶部带文件或视图图标
- 未选中 tab 文字弱化
- 选中 tab 背景与主工作区融合
- 选中 tab 文字高亮
- 顶部使用 `1px` `var(--accent-primary)` 激活线

Breadcrumbs 规范：

- 使用 `>` 分隔层级
- 使用等宽字体
- 标明当前数据层级

示例：

```text
Terminal > UID:1000123 > 冥雷 > 预测面板
```

### 4.4 数据树与表格

数据列表应该像文件管理器一样直接陈列。

规范：

- 不使用被框起来的大卡片表格
- 数据行通过缩进、图标、hover 背景和选中态表达层级
- 可展开项使用 chevron 图标
- Hover 单行时整行背景变色

建议 hover 色：

```css
background: #111111;
```

### 4.5 快捷键标签

界面中所有需要提示操作的区域，使用标准 `<kbd>` UI。

规范：

- 字号：`11px`
- 字体：等宽字体
- 背景：`#1a1a1a`
- 边框：`1px solid #333333`
- 圆角：`2px`
- 底边框加粗：`border-bottom-width: 2px`

## 五、图标规范

图标的统一程度直接决定专业感。

规则：

- 禁用填充图标，除非是状态指示点
- 全部采用线形 SVG 图标
- stroke-width 强制在 `1.2px - 1.5px`
- 图标颜色继承父级 `currentColor`
- 同一模块内禁止出现多彩装饰图标

例外：

- 资源等级
- 警告 / 错误 / 成功状态
- 数据可视化中具有明确语义的颜色

## 六、动效与交互准则

在开发者工具语境中，快就是好。

### 6.1 Fade-in Only

面板切换、下拉菜单展开，只允许极短透明度渐变。

```css
transition: opacity 80ms linear;
```

允许范围：

- `80ms - 100ms`

### 6.2 Zero Translate

禁止使用会移动元素位置的 hover 效果。

禁止：

```css
transform: translateY(-1px);
transform: scale(1.02);
```

原因：

位置跳动会打断高强度数据作业时的鼠标肌肉记忆。

### 6.3 Skeleton Loading

数据请求时不使用旋转 Loader。

使用与当前行高一致的灰色微闪烁骨架屏，以保持界面结构稳定。

## 七、首页与工作台的关系

首页不直接套用完整 IDE 工作台框架。

首页职责：

- 产品介绍
- 登录 / 注册
- 引导登录后绑定 UID
- 建立终端气质

首页不展示：

- 工作台内部模块导航
- 当前 UID 状态栏
- 假声骸数据
- 假表格
- 统计 / 评估 / 识别复核入口

登录后才进入工作台 shell。

工作台 shell 才应用完整四分栏 IDE 架构。

## 八、当前文档缺口与后续补充项

本文档已足够作为 UI 重构的最高优先级方向，但仍建议后续补齐以下内容：

1. **Light Mode token 对照表**：当前 V2.0 以 Dark Mode 为基准，仍需定义等价 Light Mode 语义 token。
2. **组件状态矩阵**：每个组件需要列出 default、hover、focus、active、disabled、loading、error 状态。
3. **快捷键清单**：需要明确命令面板、保存、切换 UID、打开识别复核等核心快捷键。
4. **UID / GameAccount 信息架构**：需要定义它们在 Activity Bar、Side Bar、Status Bar 和 Editor Area 中分别如何出现。
5. **迁移阶段**：建议将 UI 重构拆成首页、shell、tokens、基础组件、工作台视图五个阶段。
6. **可访问性标准**：需要补充对比度、焦点可见性、键盘陷阱、屏幕阅读器 label 的验收标准。

## 九、结语

按照这套 V2.0 设计系统重构 Web 前端后，产品应彻底褪去“网页/SaaS”的皮囊，转向一个本地原生级别、嵌入操作系统工作流的声骸数据控制台。

高信息密度、快捷键优先、命令面板驱动和稳定的 IDE 式布局，将成为 `Wuwa Echo Terminal` 面向核心玩家的长期 UI 识别度。
