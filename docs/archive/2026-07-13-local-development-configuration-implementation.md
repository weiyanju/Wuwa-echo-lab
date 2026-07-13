# 本地开发配置收口实施记录

## 背景与决策

项目当前处于 pre-release 本地开发阶段，Django 实际使用本机 PostgreSQL。用户明确要求保留一套可直接使用的本地默认值，避免开发者或自动化协作者重复询问数据库方案、改用 SQLite，或绕开既有 PostgreSQL 路径。

当前批准的本地默认值为：

- 数据库：`wuwa_dev`
- 角色：`PostgreSQL`
- 密码：`root`
- 主机：`127.0.0.1`
- 端口：`5432`

密码默认值是唯一的凭据型临时例外，只适用于本机回环开发数据库。它不得用于远端、共享或生产环境；开始正式服务器部署后应删除该默认值并完成独立安全改造。

## 实施结果

### Django 配置

- 用命名常量表达本地数据库密码和本地 Django secret 占位值，避免把它们误解为生产值。
- 增加 `WUWA_ENV=development|production` 环境边界，以及布尔值和逗号分隔列表的解析。
- development 默认保留 localhost 的 host、CORS 和 CSRF 配置，并允许环境变量覆盖。
- production 不使用本地数据库密码或 secret 回退，不继承 localhost 来源，并要求显式提供 `DJANGO_SECRET_KEY`、`DB_PASSWORD` 与 `DJANGO_ALLOWED_HOSTS`。
- production 默认关闭 `DEBUG`；显式开启时拒绝启动。
- 更新冲突测试，使结构守卫与运行时设置测试共同验证当前策略。

### 本地启动器

- 从 `start-dev.bat` 删除旧的远端主机、SSH 用户、本机私钥路径和重连隧道窗口。
- 启动器只接受 `127.0.0.1` 或 `localhost`，远端主机会在执行任何服务启动前失败。
- 保留本地 PostgreSQL 发现、初始化、Windows 服务启动、数据库确保、迁移、后端和前端启动能力。
- 扩展 PowerShell 静态测试，守卫本地默认值、local-only 提示、SSH 相关 token 和用户绝对路径。

### 长期文档与仓库卫生

- 同步 `AGENTS.md`、`README.md`、开发入门手册与安全边界规范，记录唯一临时例外及生产切换条件。
- 保持 `DESIGN.md` 和 `.impeccable/design.json` 的 Impeccable 侧边强调规则不变；该规则已在前一轮设计复核中确认。
- 删除未被产品或源码引用的 `_crop_check.png` 和 `translated_probability_formula_cn.png`。
- 更新项目全局文档审查记录，将相关问题标记为按当前阶段策略解决。

## 变更文件

- `AGENTS.md`
- `README.md`
- `Wuwa/wuwa/settings.py`
- `Wuwa/api/tests/test_backend_structure.py`
- `Wuwa/wuwa/tests/test_database_settings.py`
- `start-dev.bat`
- `scripts/test-start-dev-script.ps1`
- `docs/developer-onboarding.md`
- `docs/security-privacy-and-data-boundaries.md`
- `docs/archive/2026-07-13-project-documentation-audit.md`
- `docs/superpowers/plans/2026-07-13-local-development-configuration.md`
- 两张根目录临时 PNG（删除）

## 验证证据

实施过程已完成以下验证：

- Django 聚焦配置测试：16 项通过。
- `scripts/test-start-dev-script.ps1`：通过。
- `start-dev.bat --check`：通过，确认未启动服务。
- Django 全量测试：使用现有专用测试库执行 131 项，全部通过。
- 固定字符串扫描：`start-dev.bat`、README 和开发入门文档中未发现旧 SSH/远端 token 或用户本地绝对路径。
- `git diff --check`：通过；仅显示 Git 的现有 LF/CRLF 转换提示，没有空白错误。

首次直接执行全量测试时，Django 发现已有 `test_wuwa_dev` 并在非交互环境等待删除确认，因 EOF 未进入测试。为避免擅自删除本地测试库，随后使用 `--keepdb` 完成全量验证；这不是测试断言失败。

## 未完成的生产工作

本次只建立了防止误用开发默认值的生产门槛，不代表已完成生产部署。服务器阶段仍需：

- 通过部署环境安全提供真实 secret、数据库密码、域名和必要来源；
- 确认 TLS、反向代理、静态资源、数据库网络边界、备份和密钥轮换；
- 在实际目标环境运行 Django 部署检查、迁移演练、端到端验证和安全审查；
- 删除仓库内的本地数据库密码默认值，并更新本记录和长期文档。
