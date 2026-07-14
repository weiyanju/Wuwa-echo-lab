# UID 菜单退出项样式恢复实施记录

## 结果

- “退出登录”恢复为用户确认的原版视觉：顶部细分隔线、透明背景、无圆角、左对齐纯文字。
- 浅色与暗色主题使用相同结构；hover / focus-visible 只提高危险文字色，并保留全局键盘焦点轮廓。
- UID 列表、新增 UID、单色蓝色“确认添加”、菜单定位、事件和焦点恢复行为保持不变。

## 实现范围

- 更新 `WuwaFrontend/src/styles/shell.css` 中退出项的默认、hover、focus-visible 与暗色样式。
- 更新 `WuwaFrontend/src/components/controls/UidSwitcher.test.js`，锁定分隔线纯文字样式，同时继续锁定确认按钮的单色主蓝规则。
- 同步 `DESIGN.md` 与 UID 菜单专项设计中的最终长期规则。

## 验证

- 聚焦运行 `UidSwitcher.test.js`，确认退出项样式契约和既有 UID 菜单行为通过。
- 运行前端完整测试、生产构建与 `git diff --check`。
- 在本地 UID 菜单 fixture 中核对默认视觉，并确认退出项与参考图保持相同的分隔线纯文字层级。
