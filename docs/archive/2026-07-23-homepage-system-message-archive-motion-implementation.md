# 首页系统消息归档动效实施记录

## 目标

保留“欢迎回家，漂泊者”的完整字素逐字输出，将标题末尾持续闪烁的输入光标改为一次性的系统状态归档：稳定竖条表达输出，中文逗号触发短暂停顿，末字后收束为点并把控制权交给认证卡片，完成页面保持静态。

## 实际完成内容

- 标题动画拆分为 `preparing`、`typing`、`punctuation`、`resolving`、`completed` 与 `static` 六个阶段。
- 输出指示器拆分为 `bar`、`compressed`、`dot` 与 `hidden` 四个状态；逐字阶段为 2px 泰缇斯蓝竖条，不闪烁。
- 中文逗号输出后指示条压缩 170ms；末字保持 166ms 后收束为点。
- 认证卡片在归档开始 40ms 后独立进入，使用 260ms 透明度与 12px 向上归位；指示点随后淡出并从完成页面移除。
- 认证可用性由 `isAuthReady` 独立门控，不再由标题完成或指示器可见性推导。
- 完整字素切分、标题字体预加载、隐藏页面切换、计时异常和卸载清理均保留明确状态路径。
- `prefers-reduced-motion: reduce`、520px 及以下窄屏、后台页面、字体失败或计时失败直接进入完整标题与认证卡片可用的静态状态。
- 动效样式收敛到独立的 `auth-motion.css`；没有引入新字体、颜色体系、动效库或全局状态。

## 修改模块与文件

- `WuwaFrontend/src/features/auth/titleAnimation.js`
- `WuwaFrontend/src/features/auth/useTitleAnimation.js`
- `WuwaFrontend/src/features/auth/LoginView.vue`
- `WuwaFrontend/src/styles/features/auth-motion.css`
- `WuwaFrontend/src/styles/features/auth.css`
- 对应标题、组合式状态、登录页、架构、色彩状态与字体测试
- `DESIGN.md`
- `docs/web-homepage-terminal-design.md`

## API、数据库与数据边界变化

无。登录、注册、UID 绑定、系统账号和游戏账号数据契约均未修改。

## 性能与资源影响

- 新动效只补间 `opacity` 与 `transform`，不动画宽度、高度、边距或定位属性。
- 所有计时任务由同一个控制器持有并在完成、静态降级或卸载时清理。
- 不增加网络请求、图片、字体、运行时依赖或长期循环动画。
- 新增 `auth-motion.css` 63 行；`LoginView.vue` 保持 143 行，均低于架构测试上限。

## 测试与验收结果

- 标题生命周期测试先观察到缺失新状态的 RED，再完成实现并转绿。
- 组合式状态测试先观察到旧 `isComplete` 契约的 RED，再完成实现并转绿。
- 登录页与样式治理测试先观察到旧 4px 闪烁光标、160ms 认证门控和缺失 motion owner 的 RED，再完成实现并转绿。
- 聚焦命令：`node --test src/features/auth/LoginView.test.js src/design-state-accent.test.js src/architecture.test.js src/typography.test.js`，44/44 通过。
- 完整前端命令：`npm test`，348/348 通过。
- 生产构建命令：`npm run build`，Vite 8.0.10 完成 89 个模块转换并成功输出生产资源。
- 应用内浏览器桌面验收命中实际逗号帧：标题为“欢迎回家，”，指示器类为 `compressed`、计算宽度 2px、`animation-name: none`，认证卡尚未挂载。
- 实际归档帧命中 `dot`，计算矩阵约为 `scaleX(2.19) / scaleY(0.13)`，认证卡已挂载；完成态标题完整、指示器移除、认证卡可用，控制台无页面错误。
- 1440、768、414、375 与 320px 内容区均检查标题、认证卡边界和横向溢出；支持下界没有组件越界。Windows 经典滚动条会让 320px 外层只剩 305px 内容区并触发仓库既有 `body { min-width: 320px; }`，因此使用 335px 外层复核了精确 320px 内容区；这不是本次动效回归，未扩大范围修改全站最小宽度。
- 浏览器控制面只提供视口能力，不能模拟 `prefers-reduced-motion`；该路径由组合式状态、登录页和 CSS 自动化测试覆盖。
- Hallmark 组件级预检为 `P5 H5 E5 S5 R5 V4`；最终 58 项 slop gate 未发现本次新增违规。

## 与原计划的偏差

- 用户明确选择在当前分支原地执行，因此没有创建 worktree。
- 浏览器在 `127.0.0.1` 已有登录态，为避免读取或清理用户浏览器存储，视觉验收改用同一服务的 `localhost` 独立源。
- 没有为组件级 Hallmark 运行新增或提交另一套 token 文件；实现复用 `DESIGN.md` 已锁定的 Tethys token 与字体角色。

## 遗留问题

无本功能阻塞项。浏览器系统级减少动态效果未能在当前控制能力中实时切换，但对应静态路径已有自动化契约。

## 长期规范同步

- `DESIGN.md` 已将旧 4px 打字光标规则升级为 2px 一次性输出归档指示器，并登记 260ms 首页交接例外。
- `docs/web-homepage-terminal-design.md` 已记录完整字素、字体准备、逗号压缩、末字归档、40ms 认证门控和静态降级规则。

## 下一阶段入口

无已确认的后续功能；本次结果可以独立合并或继续留在当前功能分支审阅。
