# WPF 独立仓库迁移实施记录

**日期：** 2026-07-20

## 实际结果

- 使用 `git subtree split --prefix=WuwaAssistant` 提取了 WPF 目录历史。
- 创建并验证了 private 的 `Wuwa-Assistant` 独立仓库。
- 目标仓库根目录包含 WPF UI、Core、Tests、解决方案和独立长期规范。
- 目标默认后端地址统一为 `http://127.0.0.1:8001`，并保留本地覆盖能力。
- 目标仓库测试路径定位已适配拆分后的根目录结构。
- Wuwa 源仓库删除了 WPF 活跃工程和活跃 WPF UI 专项规范。
- Django recognition、识别会话/快照、回滚和 Vue 复核能力继续保留。
- `GameAccount.server` 与 `nickname` 保留为未废弃的预留可选字段；当前仍不恢复业务写入。

## 边界变化

Wuwa 现在拥有 Django 后端、Vue Web 工作台和服务端 API 契约。独立客户端仓库拥有 Windows UI、本地截图、离线 OCR、缓存、后台运行和客户端 API 消费。

## 历史资料

既有 `docs/archive/`、`docs/superpowers/` 与 `memory/` 中的 WPF 路径和实现说明作为历史证据保留，不再覆盖当前长期规范。

## 验证证据

- 目标仓库测试：13 项通过。
- 目标仓库构建：通过，0 个警告、0 个错误。
- 目标远端 private、`main` 与本地提交一致：通过。
- 源仓库 Django 测试：141 项通过；因已有 `test_wuwa_dev`，使用 `--keepdb` 安全复用测试库。
- 源仓库 Vue 测试：345 项通过。
- 源仓库 Vue 生产构建：通过。
- `git diff --check`：通过。
