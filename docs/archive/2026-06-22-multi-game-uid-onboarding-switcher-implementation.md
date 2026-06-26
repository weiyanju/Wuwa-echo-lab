# 多游戏 UID 首次启用与切换实施归档

日期：2026-06-26

## 范围

本轮完成一个系统账号绑定、切换最多五个游戏 UID 的基础能力，并同步首次启用体验、后端契约、WPF 助手契约和三端回归。

已完成内容：

- 后端限制游戏 UID 必须是 9 位 ASCII 数字，最多 5 个已绑定游戏账号，已绑定 UID 不可修改。
- 前端移除本地 recent UID，账号状态统一来自后端 `GameAccount`。
- 首次进入未绑定 UID 时展示简洁双栏绑定页；导航不可操作，仅保留主题和退出。
- 右上角 UID 胶囊提供账号列表、新增 UID、当前项勾选和容量显示。
- App 级账号变更统一先清空旧工作台/识别数据，再变更账号，成功后刷新；刷新失败保持空态并允许重试。
- WPF 助手同步 9 位 ASCII UID 校验，账号列表为空时报告后端账号状态异常，不再主动创建空账号。

未纳入本轮：

- WPF 多账号切换 UI。
- OCR、截图和后台识别能力开发。
- 新增数据库字段或改变既有 API 路径。

## 关键提交

- `e207c16` 后端账号容量、UID 不可修改和九位 UID 契约。
- `a910203` 后端 UID 校验收紧为 ASCII 数字。
- `7eb20d0` 前端多 UID 账号状态。
- `9226602` 稳定默认账号持久化重试。
- `92362e2` 首次 UID 绑定页可访问性、校验 helper 和样式拆分。
- `75883fc` 顶栏 UID 切换菜单组件。
- `dd0acd9` UID 菜单新增输入改为原始 9 位 ASCII 校验。
- `02d90a3` App 接入 UID 菜单和账号范围刷新。
- `749d5e8` 账号刷新失败后保持可重试。
- `b2f6633` WPF 同步九位 UID 和空账号契约。
- `150be0a` WPF UID 校验改为 ASCII 数字。
- `eb3e3a3` WPF UID 输入不再折叠全角数字。
- `e7fdf6d` 后端同一用户下游戏 UID 唯一性改为按 `user + uid`，并忽略隐藏的 server/nickname 写入。
- `fc18a1e` 后端响应隐藏历史 server/nickname，并在迁移中检查重复 UID、清理遗留 metadata。

## 自动化验证

已通过：

- Django：`manage.py test --keepdb -v 1`，125/125 通过。
- Django：`manage.py check`，无问题。
- Vue：`npm test`，124/124 通过。
- Vite：`npm run build`，通过。
- WPF：`dotnet run --project WuwaAssistant\WuwaAssistant.Tests\WuwaAssistant.Tests.csproj`，全部 PASS。
- WPF：`dotnet build WuwaAssistant\WuwaAssistant.slnx`，0 warning / 0 error。

## 浏览器验收

使用 in-app browser 验收 `http://127.0.0.1:5173/`：

- 新账号注册后进入首次绑定页，只显示简洁双栏 UID 绑定卡片，工作台/统计/评估导航禁用。
- 输入 `12345678` 显示行内错误 `请输入 9 位数字 UID。`，输入框 `aria-invalid=true`。
- 输入 `123456789` 后可绑定并进入工作台，顶部胶囊显示当前 UID。
- UID 胶囊打开后 `aria-expanded=true`，菜单 `role=menu`，容量显示 `1 / 5`。
- 菜单新增非法 UID 显示同样的行内错误。
- 菜单新增 `987654321` 后自动切换到新 UID，工作台数据范围刷新。
- 从菜单切回 `123456789` 后，胶囊和工作台 echo 范围同步回旧 UID。
- 深色模式可切换，按钮 aria label 从“切换到夜间模式”变为“切换到日间模式”。
- 860px 视口下 topbar 和 account actions 纵向排列，无横向溢出。
- 860px 深色模式下无横向溢出，UID 菜单仍在视口内，容量显示 `2 / 5`。

## 注意事项

- 本地 PostgreSQL 开发密码记录在已忽略文件 `docs/local-development.private.md`，不进入版本库。
- WPF 对 UID 只做 `Trim()`，不会再通过 FormKC 把全角数字折叠为 ASCII；这与后端 `[0-9]{9}` 契约保持一致。
- 前端 `UidSwitcher` 的新增输入不清洗非数字，必须原始输入完整匹配 9 位 ASCII 数字。
- 后端仍保留 `server` / `nickname` 字段以兼容旧响应结构，但 API 不再写入或回显这两个隐藏字段；同一用户下同一 UID 不能通过不同 server 重复绑定。迁移会在添加新唯一约束前检查历史重复 UID，并清理遗留 metadata。
