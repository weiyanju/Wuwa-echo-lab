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

- `DESIGN.md` frontmatter 哈希保持为 `11d386e9a9597a827f95eefff311f418732e0ec06c24ebdd69834edbbde75094`。
- `.impeccable/design.json` 非 narrative 数据哈希保持为 `e855f67c76cc651883782353d9807fc2eb49b08909a877ed89debb8275babb02`。
- `.impeccable/design.json` 通过 JSON 解析。
- 四项核心治理规则在两份设计入口中保持镜像。
- 前端基线测试 216/216 通过。
- `git diff --check` 通过。
