# Web 顶部品牌标识与导航居中实施记录

## 目标

在不改动产品整体结构的前提下，降低原有英文全称在中文工作台中的突兀感，将登录后顶部品牌收敛为简短的 `TETHYS` 标识，并保证主导航按整个视口真正居中。

## 实际完成内容

- 登录后的顶部品牌由完整英文名称收敛为轨道符号加 `TETHYS` 短标识。
- 登录、加载和 UID 初始化等入口场景继续使用完整的中英品牌表达，形成“入口完整、工作台简写”的品牌层级。
- 顶部主导航改为相对整个顶栏容器居中，不再受左侧品牌或右侧 UID、主题和退出控件宽度影响。
- 保持工作台、统计、评估的导航文案、顺序和选中语义不变。
- 补充组件测试，约束短品牌标识与导航居中结构。

## 修改模块与文件

- `WuwaFrontend/src/App.vue`
- `WuwaFrontend/src/App.test.js`
- `WuwaFrontend/src/styles/shell.css`
- `docs/superpowers/plans/2026-07-13-topbar-wordmark.md`
- `docs/web-homepage-terminal-design.md`
- `docs/web-ui-design-system-v2.md`
- `DESIGN.md`

## API、数据库与数据边界变化

无。只调整 Web 顶部品牌和导航布局，不修改账号、UID、接口或数据模型。

## 性能与资源影响

无明显影响。标识使用现有 CSS 图形与字体，不增加图片、网络请求或运行时依赖。

## 测试与验收结果

- 2026-07-13 执行 `cd WuwaFrontend; ..\.tools\node\npm.cmd test`，211 项前端测试通过。
- 2026-07-13 执行 `cd WuwaFrontend; ..\.tools\node\npm.cmd run build`，Vite 生产构建通过。
- 已在本地浏览器检查桌面工作台：`TETHYS` 标识与 UID 控件保持稳定，工作台、统计、评估导航按视口中线居中。

## 与原计划的偏差

最终保留了登录前完整品牌、登录后短品牌的双层表达，没有把全站统一替换成同一段中文或英文文案。这样既保留入口识别度，也降低高频工作台顶栏的噪音。

## 遗留问题

无。

## 长期规范同步

已同步 `DESIGN.md`、`docs/web-homepage-terminal-design.md`、`docs/web-ui-design-system-v2.md` 与 `docs/product-interface-principles.md`，明确入口完整品牌与登录后短品牌的使用边界。

## 下一阶段入口

后续新增全局页面时复用现有顶部壳层，不为单页创建新的品牌写法或偏移导航中心。
