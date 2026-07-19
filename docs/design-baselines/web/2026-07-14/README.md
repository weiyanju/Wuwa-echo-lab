# Wuwa Web 视觉基线（2026-07-14）

## 用途

本目录保存当前已批准 Web 界面的浅色与暗色浏览器渲染，用于后续局部视觉修改的前后对照。截图是特定页面状态的证据，不替代 `DESIGN.md` 中的 token、组件语言和治理规则。

## 捕获条件

- 本地地址：`http://127.0.0.1:5173/`
- 桌面视口：1280 × 720 CSS px
- 浏览器：Codex 内置浏览器
- 数据：当前本地开发账号与本地 PostgreSQL 中已有数据
- 原则：不为了截图创建第二套页面实现，不在捕获过程中修改业务数据
- 业务页：捕获滚动起点的固定首屏视口，避免 sticky 顶栏在整页拼接中被重复记录

## 文件清单

| 页面 | 浅色 | 暗色 |
|---|---|---|
| 登录 | `login-light.png` | `login-dark.png` |
| 工作台 | `workspace-light.png` | `workspace-dark.png` |
| 统计 | `statistics-light.png` | `statistics-dark.png` |
| 评估 | `evaluation-light.png` | `evaluation-dark.png` |

所有截图使用同一桌面视口。登录页暗色基线通过已登录页面的主题切换后退出获得，用于同时验证“退出后首页保留暗色主题”的既有行为。
