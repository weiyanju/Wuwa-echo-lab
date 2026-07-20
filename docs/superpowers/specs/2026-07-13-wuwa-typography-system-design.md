# Wuwa / Tethys Web 字体设计系统

**状态：** Final

**日期：** 2026-07-13

**适用范围：** `WuwaFrontend` 登录页、UID 绑定页、工作台、历史记录、本地识别、统计与模型评估

**关联规范：** `DESIGN.md`、`docs/web-ui-design-system-v2.md`、`docs/product-interface-principles.md`

---

## 1. 设计结论

Wuwa Web 采用 **IBM Plex 超级字体家族**，构建“中文、英文、数字分别调校，但整体气质统一”的产品字体系统。

- 中文与常规界面：`IBM Plex Sans SC`。
- 英文品牌与拉丁术语：使用独立的 `--font-latin` 语义入口；首版仍由 `IBM Plex Sans SC` 的配套拉丁字形承担。
- 数字与指标：使用独立的 `--font-data` 语义入口；首版仍由 `IBM Plex Sans SC` 承担，并强制等宽数字特性。
- 技术状态与短协议文本：`IBM Plex Mono`。
- 回退字体：`Noto Sans SC`、`Microsoft YaHei UI`、`system-ui`。

中文、英文和数字必须分开设计规则，但不引入三套无关风格的字体。首版只加载 IBM Plex Sans SC 与 IBM Plex Mono 两个物理字体家族，降低 Web 字体成本；语义入口保持独立，以便未来在不改组件的情况下替换拉丁或数字字体。

## 2. 项目背景与字体气质

Wuwa 是鸣潮玩家使用的声骸数据工作台，长期承载录入、核对、预测、统计和模型评估。它不是游戏营销页，也不是通用企业后台或开发者控制台。

字体应同时表达：

- **研究感：** 理性、精确、可信，适合概率、样本量和模型指标。
- **世界观：** 有轻微未来技术气质，但不依赖科幻展示字体。
- **工具性：** 12–16px 的高频界面文字清楚，长时间使用不疲劳。
- **统一性：** 中文、`TETHYS`、`UID`、`COST`、百分比和模型术语处于同一视觉系统。
- **低噪音：** 层级来自稳定比例，而不是任意字重、夸张字距或大量全大写英文。

IBM Plex 的“自然与工程并存”符合泰缇斯研究台的产品定位；Plex Sans SC 的中文、拉丁与数字能够维持一致的笔画密度，Plex Mono 则提供受控的终端语气。

## 3. 目标与非目标

### 3.1 目标

1. 建立固定、可复用、可测试的字体令牌。
2. 让页面标题、控件、正文、标签和数据形成稳定层级。
3. 清理当前只加载 400/500/700，却声明 610–900 等无效字重的问题。
4. 统一中文、英文缩写、品牌、数字和单位的混排方式。
5. 保证表格、概率、UID、排名和样本量具有稳定数字宽度。
6. 改善 10–12px 小字、评估页密集信息和暗色模式下的可读性。
7. 保持现有布局、颜色系统和产品结构，不借字体迁移重新设计页面。

### 3.2 非目标

- 不引入装饰性科幻字体、书法字体或衬线标题字体。
- 不把登录后的工作台改造成终端或 IDE。
- 不为单个页面建立独立字体体系。
- 不通过 800/900 字重制造“高级感”。
- 不用流体字号替代产品界面的固定层级。
- 不在本轮重写业务文案或改变业务流程。

## 4. 字体资源与许可

### 4.1 正式字体

| 角色 | 字体 | 资源 | 许可 |
|---|---|---|---|
| 中文/UI/数字/拉丁 | IBM Plex Sans SC | `@ibm/plex-sans-sc` | SIL OFL 1.1 |
| 技术文本 | IBM Plex Mono | `@ibm/plex-mono` | SIL OFL 1.1 |

IBM 官方 Web 包提供 WOFF2 与字形切片 CSS。实施时自托管资源，不依赖运行时第三方 CDN。

### 4.2 加载规则

- 仅正式使用 400、500、600、700 四档 Sans 字重。
- Mono 仅加载 500、600 两档。
- 使用 `font-display: swap` 或字体包等价策略。
- 项目自己的 `tokens.css` 不编写 `local()`；允许 IBM 官方 split CSS 保留与精确家族名、字重绑定的 `local()` 回退，正式 Web 源仍以随后声明的 WOFF2 为准。
- 禁止浏览器伪造粗体和斜体：`font-synthesis: none`。
- 构建后确认不输出未使用的 100/200/300/800 字重和斜体资源。
- 字体加载失败时必须回退到系统中文字体，页面不得出现不可读文本或布局崩溃。

### 4.3 字体入口

```css
--font-cjk:
  "IBM Plex Sans SC",
  "Noto Sans SC",
  "Microsoft YaHei UI",
  system-ui,
  sans-serif;

--font-ui: var(--font-cjk);
--font-title: var(--font-cjk);
--font-latin: "IBM Plex Sans SC", system-ui, sans-serif;
--font-data: var(--font-latin);
--font-mono: "IBM Plex Mono", ui-monospace, Consolas, monospace;
```

即使首版 `--font-cjk`、`--font-latin` 和 `--font-data` 最终由同一物理字体渲染，组件仍必须使用正确语义入口。

## 5. 字重系统

| 字重 | 语义 | 使用场景 |
|---:|---|---|
| 400 | Regular | 正文、说明、输入内容、长句 |
| 500 | Medium | 次级信息、图表刻度、辅助标签、单位 |
| 600 | Semibold | 导航、按钮、字段标签、状态、普通数据 |
| 700 | Bold | 页面标题、关键标题、声骸名称、核心数据 |

### 5.1 命名令牌

```css
--weight-body: 400;
--weight-supporting: 500;
--weight-label: 600;
--weight-control: 600;
--weight-data: 600;
--weight-title: 700;
--weight-emphasis: 700;
```

### 5.2 禁止规则

- 禁止 610、620、650、680、720、740、750、760 等“假精度”字重。
- 禁止常规 UI 使用 800、900。
- 禁止使用 `bolder`、`lighter` 让结果依赖父级。
- 12px 文字不得使用 400；必须使用 500 或 600。
- 大字号不自动等于粗体；关键程度由语义决定。

## 6. 产品字号系统

### 6.1 基础文字层级

| 令牌 | 字号 | 字重 | 行高 | 字距 | 用途 |
|---|---:|---:|---:|---:|---|
| `--text-page-title` | 28px | 700 | 1.12 | 0 | 页面标题、工作台问候语 |
| `--text-section-title` | 21px | 700 | 1.20 | 0 | 统计、评估等大区块标题 |
| `--text-card-title` | 16px | 700 | 1.25 | 0 | 卡片、图表和面板标题 |
| `--text-body` | 15px | 400 | 1.50 | 0 | 正文、表单说明、帮助信息 |
| `--text-control` | 14px | 600 | 1.25 | 0 | 按钮、导航、选择项 |
| `--text-label` | 13px | 600 | 1.30 | 0 | 字段、状态、badge、表头 |
| `--text-caption` | 12px | 500 | 1.35 | 0 | 单位、时间、技术说明 |
| `--text-micro` | 11px | 500 | 1.20 | 0 | 图表极小刻度；不可用于操作文本 |

### 6.2 数据层级

| 令牌 | 字号 | 字重 | 行高 | 用途 |
|---|---:|---:|---:|---|
| `--text-data-sm` | 15px | 600 | 1.10 | UID、紧凑表格数值 |
| `--text-data-md` | 18px | 600 | 1.08 | 概率、词条档位、普通指标 |
| `--text-data-lg` | 24px | 700 | 1.05 | 卡片核心指标、评分 |
| `--text-data-xl` | 30px | 700 | 1.00 | 页面级样本量、置信度 |

数据字号可以响应式降一级，但不得使用 `clamp()` 连续缩放。产品 UI 使用明确断点，避免同一层级随窗口宽度产生不可预测变化。

### 6.3 小字号底线

- 常规可读文本最低 12px。
- 11px 仅用于非交互图表刻度、极短 metadata。
- 禁止 10px。
- 禁止 11.5px、12.5px、14.5px 等半像素字号。
- 错误、警告、按钮、字段标签不得使用 11px。

## 7. 行高系统

```css
--leading-data: 1.05;
--leading-title: 1.15;
--leading-control: 1.25;
--leading-label: 1.30;
--leading-caption: 1.35;
--leading-body: 1.50;
```

规则：

- 单行标题和大数字使用紧凑行高，确保视觉中心稳定。
- 按钮与输入文字使用 1.25，由控件高度和 Flex 对齐承担垂直居中。
- 多行说明使用 1.5，不通过额外段落 margin 代替行高。
- 图表文字使用 1.2–1.35，避免轴标签互相碰撞。
- 禁止使用小于 0.98 的行高。

## 8. 字距系统

### 8.1 令牌

```css
--tracking-cjk: 0;
--tracking-latin: 0;
--tracking-abbr: 0.02em;
--tracking-caps: 0.06em;
--tracking-brand: 0.08em;
--tracking-data: 0;
```

### 8.2 使用规则

| 文本 | 字距 | 示例 |
|---|---:|---|
| 中文标题、正文、按钮 | 0 | 统计诊断、初始化声骸 |
| 普通英文术语 | 0 | Log Loss、Brier |
| 短缩写 | 0.02em | UID、COST |
| 短全大写状态 | 0.06em | SYSTEM.ONLINE |
| 品牌 | 0.08em | TETHYS |
| 数字、百分比 | 0 | 9.3%、123456789 |

禁止：

- 为中文统一增加字距。
- 为中文标题使用负字距压缩。
- 为所有英文统一增加字距。
- 使用 px 字距；字距使用 em 或 0。
- 品牌字距超过 0.10em。

## 9. 数字设计

所有可比较数字必须使用 `--font-data` 并启用等宽数字：

```css
font-family: var(--font-data);
font-variant-numeric: tabular-nums;
font-feature-settings: "tnum";
letter-spacing: var(--tracking-data);
```

适用内容：

- UID。
- 样本量与历史声骸数量。
- 概率、百分比、评分、排名。
- `0/5` 进度。
- COST 数值。
- 图表坐标、模型权重、Loss、Brier。

格式规则：

- 百分号紧跟数字：`9.3%`。
- 小数位由业务精度决定，同一比较组必须一致。
- 比例保持紧凑：`0/5`。
- 数字与中文量词在模板中分为两个 span，以 2–4px gap 控制，不依赖普通空格。
- 单位使用 500 字重，字号比主数值小一级。
- 表格数字右对齐，卡片核心数字按组件布局居中或右对齐。
- 禁止用等宽编程字体显示普通概率和统计数字。

## 10. 中英数混排

### 10.1 字体选择

- 中文句子以 `--font-cjk` 为主。
- 独立英文品牌、短术语和数字可显式使用 `--font-latin` / `--font-data`。
- 中文句子中的英文缩写不必拆出 DOM；Plex Sans SC 的配套拉丁字形可以保持自然混排。
- 大型数据组件应将 label、value、unit 拆成独立元素，分别应用令牌。

### 10.2 空格与分隔

- `COST 4`：英文术语和数字之间保留一个空格。
- `9.3%`：数值和百分号之间不加空格。
- `276 条`：视觉间距由 CSS gap 控制。
- 并列 metadata 使用 `·`：`碎梦亡鬼之殇 · COST 4 · 攻击百分比`。
- `/` 只表示比例或路径，不作为普通 metadata 分隔符。
- 中文标签、按钮和状态不添加句号；完整说明、帮助与错误信息使用完整标点。

### 10.3 大小写

- 品牌固定为 `TETHYS`。
- 正式缩写保留大写：`UID`、`COST`。
- 模型名尊重正式拼写：`Log Loss`、`Brier`。
- 只有短状态码使用全大写；普通功能名称不得为了“科技感”强制全大写。

## 11. 文本颜色与强调

文字层级优先使用既有语义色：

| 层级 | 颜色令牌 | 适用 |
|---|---|---|
| 强标题/关键数字 | `--ink-strong` | 页面标题、核心结果 |
| 正文/控件 | `--ink-main` | 正文、按钮、常规标签 |
| 次级说明 | `--text-muted` | 描述、单位、表头 |
| 低优先级 metadata | `--decorative-muted` | 时间、补充信息 |

规则：

- 不得只靠变细字重降低层级。
- 12px 文字不得同时使用最低对比颜色。
- 成功、警告、错误文本必须保持可读对比，并配合文字语义。
- 暗色模式必须单独检查 `--text-muted` 和 `--decorative-muted`，不可直接沿用浅色值。
- `--ink-deep`、`--ink`、`--steel` 和 `--stone` 仅作为迁移期兼容别名保留；新增或修改样式使用 canonical token。

## 12. 文本宽度、换行与截断

- 中文说明的舒适行宽约 30–40 个汉字。
- 大段帮助内容最大宽度不超过 65–75ch。
- 导航、按钮、状态和短标签保持单行。
- 声骸名称允许在窄屏换行，但不得在桌面端任意断字。
- UID、概率、`COST 4`、`0/5` 使用 `white-space: nowrap`。
- 表格和卡片只在确有空间约束时使用省略号，并提供 title 或可访问的完整文本。
- 禁止为了容纳文本把字号降到 11px 以下。

## 13. 页面级应用规范

### 13.1 顶部导航

| 元素 | 规范 |
|---|---|
| `TETHYS` | `--font-latin`；16px/600；`--tracking-brand`；1.1 |
| 主导航 | 14px/600；字距 0 |
| UID 标签 | 12px/600；`--tracking-abbr` |
| UID 数值 | `--font-data`；15px/600；等宽数字 |
| 退出 | 14px/600 |

### 13.2 工作台摘要

| 元素 | 规范 |
|---|---|
| 问候语 | 28px/700/1.12 |
| 核心指标 | `--text-data-xl` |
| 指标名称 | 13px/600 |
| 增量 badge | 11px/600，仅显示短数字 |

### 13.3 初始化与配置区

| 元素 | 规范 |
|---|---|
| 区块标题 | 21px/700 |
| 说明 | 15px/400/1.5 |
| legend | 13px/600 |
| 套装/主词条选项 | 14px/600 |
| COST | `--tracking-abbr` |

### 13.4 当前声骸与预测

| 元素 | 规范 |
|---|---|
| 声骸名称 | 28px/700/1.1；窄屏降为 24px |
| metadata 胶囊 | 12px/600 |
| 录入序号和名称 | 14px/600 |
| 词条数值 | 18px/600；等宽数字 |
| 预测标题 | 12px/600 |
| 预测名称 | 12px/600 |
| 预测概率 | 12px/600；等宽数字 |

### 13.5 档位矩阵

| 元素 | 规范 |
|---|---|
| 词条名称 | 16px/700 |
| 档位值 | 18px/600 |
| 单位 | 13px/500 |
| 概率 | 12px/500 |

### 13.6 统计页

| 元素 | 规范 |
|---|---|
| 页面标题 | 21px/700 |
| 诊断标签 | 13px/600 |
| 卡片数值 | 24px/700 |
| 图表分类 | 13px/600 |
| 图表刻度 | 12px/500；极限 11px |
| 说明 | 13–15px/400或500 |

### 13.7 评估页

评估页是本轮最高优先级迁移区域：

- 页面/大区块标题：21px/700。
- 卡片标题：16px/700。
- 模型名称：16px/600。
- 指标值：18–24px/600或700。
- 表头、图例、状态：12–13px/500或600。
- 技术说明：12–13px/500/1.45。
- 图表最小刻度：11px/500。
- 禁止 10px、半像素字号和 720/740/760 等字重。
- `Loss`、`Log Loss`、`Brier` 使用普通拉丁字距，不使用 Mono。

### 13.8 历史记录与本地识别

- 面板标题：16px/700。
- 列表主信息：14px/600。
- 状态：12px/600。
- 时间、次级 metadata：12px/500。
- 数值：15px/600，等宽数字。

### 13.9 登录页

- 产品品牌：16px/600，品牌字距。
- 主标题：48–56px/700；移动端固定 36px，不使用连续流体缩放。
- 功能标题：16px/600。
- 表单标签与按钮：14px/600。
- 输入内容：14–15px/400。
- `SYSTEM.ONLINE` 等短状态：Plex Mono 12px/600，`--tracking-caps`。
- 协议说明可使用 Plex Mono 12px/500；中文正文不得使用 Mono。

### 13.10 UID 绑定

- 标题：28px/700。
- 说明：15px/400。
- 输入内容：15px/400。
- UID：`--font-data`，等宽数字。
- 帮助和错误：12–13px/500，完整句子。

## 14. 响应式规则

- 产品文字使用固定层级和明确断点，不使用 `clamp()` 让常规 UI 连续变化。
- 860px 以下：页面标题可从 28px 降至 24px；数据 XL 从 30px 降至 24px。
- 520px 以下：登录页展示标题降至 36px；工作台卡片标题不低于 16px。
- 控件文字不得因窄屏降至 12px 以下，应优先换行、缩短容器间距或改变布局。
- 横向数据矩阵保持数值字号，优先允许区域横向滚动。

## 15. 可访问性与国际化

- 正文默认不低于 15px；关键说明不低于 13px。
- 禁止用颜色、字重或大小中的单一维度表达唯一状态。
- 文本放大到 200% 时，导航、按钮、表单和关键数据仍可访问。
- 英文和数字字体必须覆盖当前模型术语、标点和箭头。
- 动态数值更新不应因数字宽度变化造成布局跳动。
- 截断文本提供完整可访问名称。
- 中文、英文和数字保持可复制的真实文本，不用图片或 SVG 路径替代。

## 16. 性能规范

- 字体资源自托管，不从 Google Fonts 或其他 CDN 运行时请求。
- 优先 WOFF2。
- 通过 IBM 官方 `fonts/split/woff2` CSS 只引入 Regular、Medium、SemiBold、Bold 四档 Sans，以及 Medium、SemiBold 两档 Mono；禁止引入包级 `all.css` / `default.css`。
- 浏览器依靠 `unicode-range` 只请求当前页面命中的字形切片；构建产物可以包含四档正式字重的 split assets，但不得引用 complete 版 3–4MB 单文件。
- 构建产物中不得包含 100/200/300/800 字重与斜体。
- 首屏只需 Sans；Mono 可与登录页或技术区域一起按需加载，若当前构建拆分成本过高，可先同步加载两档 Mono。
- 保持 `font-display: swap`，避免不可见文本。
- 字体切换后的 CLS 必须通过截图和性能检查验证。

## 17. CSS 令牌目标

```css
:root {
  --font-cjk: "IBM Plex Sans SC", "Noto Sans SC", "Microsoft YaHei UI", system-ui, sans-serif;
  --font-ui: var(--font-cjk);
  --font-title: var(--font-cjk);
  --font-latin: "IBM Plex Sans SC", system-ui, sans-serif;
  --font-data: var(--font-latin);
  --font-mono: "IBM Plex Mono", ui-monospace, Consolas, monospace;

  --text-page-title: 1.75rem;
  --text-section-title: 1.3125rem;
  --text-card-title: 1rem;
  --text-body: 0.9375rem;
  --text-control: 0.875rem;
  --text-label: 0.8125rem;
  --text-caption: 0.75rem;
  --text-micro: 0.6875rem;
  --text-data-sm: 0.9375rem;
  --text-data-md: 1.125rem;
  --text-data-lg: 1.5rem;
  --text-data-xl: 1.875rem;

  --weight-body: 400;
  --weight-supporting: 500;
  --weight-label: 600;
  --weight-control: 600;
  --weight-data: 600;
  --weight-title: 700;
  --weight-emphasis: 700;

  --leading-data: 1.05;
  --leading-title: 1.15;
  --leading-control: 1.25;
  --leading-label: 1.3;
  --leading-caption: 1.35;
  --leading-body: 1.5;

  --tracking-cjk: 0;
  --tracking-latin: 0;
  --tracking-abbr: 0.02em;
  --tracking-caps: 0.06em;
  --tracking-brand: 0.08em;
  --tracking-data: 0;
}
```

## 18. 迁移映射

### 18.1 字重

| 现有声明 | 目标 |
|---:|---:|
| 400 | 400 |
| 500 | 500 |
| 600、610、620 | 按语义映射到 500 或 600 |
| 650、680 | 600 或 700 |
| 700、720、740、750、760 | 700 或 `--weight-data` |
| 800、900 | 700 |

不得进行不看语义的全局数值替换。辅助说明中的 650 应降到 500；按钮中的 650 应改为 600；标题中的 650 应改为 700。

### 18.2 字号

| 现有声明 | 目标 |
|---:|---:|
| 10px | 11px 或 12px |
| 11px、11.5px | 11px 或 12px |
| 12px、12.5px | 12px 或 13px |
| 13px | 13px |
| 14px、14.5px | 14px 或 15px |
| 15px | 15px |
| 16px、17px | 16px 或 18px |
| 18px、19px | 18px |
| 20px、21px、22px | 21px 或 24px |
| 23px、24px、25px | 24px |
| 28px | 28px |
| 30px、31px | 30px |
| 32px、33px、34px | 30px 或 32px，按页面角色决定 |

## 19. 验收标准

### 19.1 自动化验收

- `package.json` 使用 IBM Plex 正式包。
- `tokens.css` 定义本规范全部语义令牌。
- CSS 中不存在 400/500/600/700 以外的数字字重。
- CSS 中不存在 10px 和半像素字号。
- 非零字距只通过 tracking 令牌使用。
- 可比较数字使用 `--font-data` 与 `tabular-nums`。
- 原有单元测试与构建全部通过。

### 19.2 视觉验收

桌面宽度 1920、1366，移动宽度 390 分别检查：

1. 登录页。
2. UID 绑定页。
3. 工作台顶部和摘要。
4. 初始化、当前声骸、预测和档位矩阵。
5. 历史记录浮层。
6. 本地识别。
7. 统计页。
8. 评估总览和展开后的子模型详情。
9. 浅色与暗色模式。

每个页面检查：

- 中文是否清楚、无异常 fallback。
- 品牌和英文缩写字距是否克制。
- 数字是否对齐、更新时是否跳动。
- 小字是否可读。
- 标题是否形成稳定层级。
- 换行、截断和移动端布局是否正常。
- 字体加载前后是否出现明显布局位移。

## 20. 官方参考

- IBM Plex 设计理念：<https://www.ibm.com/plex/concept/>
- IBM Plex Sans SC 发布说明：<https://www.ibm.com/design/language/whats-new/>
- IBM Plex 官方仓库与 OFL：<https://github.com/IBM/plex>
- IBM Plex Sans SC Web 包：<https://www.npmjs.com/package/@ibm/plex-sans-sc>
