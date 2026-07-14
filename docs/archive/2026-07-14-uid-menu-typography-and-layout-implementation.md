# UID 菜单数据排版与布局实施记录

## 实际变更

- 在 `WuwaFrontend/src/styles/shell.css` 中统一账号 UID 与新增 UID 输入的数字排版：使用 `--font-data`、`--text-data-sm`、`--weight-data`、`--leading-control`、`--tracking-data` 和 `tabular-nums`。
- “新增 UID”标签改为 Label（13px / 600）；“确认添加”和“添加 UID”继续使用 Control（14px / 600）。
- 账号行、输入框、确认按钮和默认新增入口统一为至少 44px 高、12px 圆角；账号行和输入框统一为 12px 水平内边距。
- 账号列表行间距改为 8px；账号区到新增字段为 14px；标签到输入为 8px；输入到确认按钮为 10px。
- 浅色与暗色当前账号选中态均改为纯色浅蓝表面，移除横向渐变；蓝色边框和既有勾选图标继续共同表达 selected。
- 为 UID 新增输入补充局部 focus-visible 规则，恢复 3px 蓝色轮廓、3px offset 并移除该状态下的装饰性阴影，不改变全局输入框规则。
- `WuwaFrontend/src/components/controls/UidSwitcher.test.js` 新增视觉契约测试，覆盖上述排版、尺寸、间距、选中态和焦点规则。
- `DESIGN.md` 增加 UID 菜单数据排版与控件几何的长期规则。
- `UidSwitcher.vue` 的模板、状态、事件、校验和焦点恢复逻辑未修改。
- “退出登录”保持分隔线后的透明纯文字命令：44px 最小高度、无圆角、14px / 600 左对齐文字，hover / focus-visible 仅提高危险文字色。

## 验证

- TDD RED：新增契约测试先因现有 `gap: 7px` 失败；同轮现有退出登录回归测试通过，证明失败来自待实施样式。
- 聚焦 GREEN：`node --test src/components/controls/UidSwitcher.test.js src/architecture.test.js` 通过 22 项，0 失败。
- 完整前端测试：`node --test --test-reporter=tap` 通过 256 项，0 失败、0 跳过。
- 生产构建：`npm run build` 成功，Vite 完成 production build。
- 架构边界：`shell.css` 最终为 915 行，未提高 920 行上限。
- 样式契约核对：浅色/暗色 current 规则均不含 gradient；账号、输入、提交和新增入口均为 44px；退出登录规则与修改前一致。
- 临时 `visual-uid-menu-fixture.html` 已删除，临时 Vite 服务已停止，没有新增运行态文件。

## 偏差

- 应用内浏览器在刷新 `127.0.0.1` 临时 fixture 时被本地 URL 安全策略阻止，因此未取得自动截图，也未执行浏览器计算样式与 390px / 200% 缩放的最终渲染核对。
- 未绕过该限制或切换到未授权的浏览器控制方式；改用源代码视觉契约、架构测试、完整测试、生产构建和最终 CSS 声明核对完成可自动验证部分。
- 产品实现与已确认方案无其他偏差。
