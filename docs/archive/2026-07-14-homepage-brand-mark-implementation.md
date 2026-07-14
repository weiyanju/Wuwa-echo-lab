# 首页品牌标识与浏览器图标实施记录

## 实施结果

- 首页顶部品牌已替换为蓝色圆环圆点图标与 `TETHYS` 字标。
- 首页与浏览器 favicon 共用 `WuwaFrontend/public/tethys-mark.svg`。
- 浏览器标签标题继续保持 `泰缇斯枢纽`。
- 清理了窄屏下旧双语品牌遗留的换行规则，图标与字标保持同行。
- 登录流程、工作台顶部品牌、加载状态与 UID 绑定页未改变。

## 验证

- `..\.tools\node\npm.cmd test`：通过，228 项测试全部通过，0 失败。
- `..\.tools\node\npm.cmd run build`：通过，Vite 构建 68 个模块并成功生成产物。
- 1366×768 浏览器实测：首页品牌为 `TETHYS`，图标为 24×24px，图标与字标对齐；页面 `scrollWidth` 与 `clientWidth` 均为 1366。
- 390×844 响应式浏览器实测：有效内容宽度为 375px，图标与字标中心对齐，不与 `SYSTEM.ONLINE` 重叠，`scrollWidth` 与 `clientWidth` 均为 375。
- favicon 与文档标题：`/tethys-mark.svg` 正常引用，标题保持 `泰缇斯枢纽`。
- 内置浏览器截图接口在本次检查中超时，因此未保存截图；上述视觉验收基于真实页面 DOM 快照与布局几何数据。
