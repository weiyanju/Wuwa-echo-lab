# 安全、隐私与数据边界规范

## 1. 文档定位

本文定义 `Wuwa` 长期安全、隐私和数据边界。

它覆盖系统账号、UID、`GameAccount`、截图、OCR、诊断日志、本地缓存、后端数据库和未来云端部署。

如果某个功能会改变截图、OCR、账号、用户数据或云端存储边界，必须先对照本文确认。

---

## 2. 核心原则

### 2.1 用户数据归属必须清楚

所有重要业务数据必须绑定 authenticated user 和 `GameAccount`。

后端必须拒绝未登录访问、跨用户访问、跨 `GameAccount` 访问和 locked `GameAccount` 正式写入。

### 2.2 OCR 默认本地离线

本地 OCR 是当前主路径。

默认不上传完整截图做云端 OCR。

未来后端和 Web 部署到云服务器，不等于启用云端 OCR。

### 2.3 不触碰游戏进程

当前明确禁止：

- 读取游戏内存
- 注入游戏进程
- 修改游戏文件
- 自动操作游戏
- 绕过游戏正常 UI 做数据采集

本地助手只通过窗口检测、截图和本地离线 OCR 获取用户可见信息。

---

## 3. 账号与认证边界

规则：

- 系统账号由后端管理。
- Web 和 WPF 使用后端认证结果。
- 普通用户 UI 不展示后端地址。
- 密码不写入诊断日志。
- token、cookie、session 信息不写入普通日志。
- 登录失败提示不应泄露额外信息，除非后端已明确设计。

未来认证方式变化时，必须同时评估 Web 调用方式、WPF 调用方式、CSRF 或 token 策略、本地保存内容、登出和过期行为。

---

## 4. `GameAccount` 与 UID 边界

规则：

- UID 属于 `GameAccount`，不是单纯前端状态。
- UID 修改必须走后端 API。
- `GameAccount` 所有权只能由后端判断。
- Web 与 WPF 不能用本地缓存判断最终权限。
- locked `GameAccount` 不能写入正式声骸或识别结果。

风险信号：

- 客户端自行拼接用户 ID
- 客户端信任本地默认 UID 直接写入
- 后端接口不校验资源归属
- 识别快照缺少 `game_account_id`

---

## 5. 截图与 OCR 隐私边界

默认规则：

- 完整截图不进入常规后端上传路径。
- OCR 在本地离线完成。
- 后端只接收结构化识别结果、hash、置信度、耗时和必要诊断信息。
- 截图 hash 可以用于去重，但不能反推出原图内容。
- 本地截图缓存必须有清理策略。

允许本地保存：

- 临时截图
- 裁剪区域截图
- screenshot hash
- OCR 结果缓存
- OCR 耗时和错误码

默认不允许常规保存或上传：

- 完整屏幕截图
- 与识别无关的屏幕区域
- 用户本地文件路径
- 其他窗口标题列表
- 敏感系统环境信息

如果未来需要上传截图样本，必须单独确认用户授权、上传范围、存储位置、保留时间、删除方式和用途。

---

## 6. 诊断日志边界

诊断日志用于定位问题，不是数据仓库。

允许记录：

- 后台状态转换
- 窗口检测是否成功
- 截图耗时
- OCR 耗时
- OCR provider 名称和版本
- screenshot hash
- 缓存命中情况
- API 状态码
- 错误码

默认不记录：

- 密码
- session/cookie/token
- 完整截图
- 完整 OCR 原文中的敏感无关内容
- 用户本地绝对路径
- 其他应用窗口内容

日志应有大小限制、轮转或清理策略、用户可查看的简化错误和开发者可用的诊断细节。

---

## 7. 本地缓存边界

本地缓存只能服务性能和体验。

允许缓存：

- 当前选择的 `GameAccount`
- 检测频率偏好
- OCR provider 设置
- screenshot hash
- OCR result cache
- 最近诊断状态

不应缓存：

- 密码
- 可长期替代后端业务数据的声骸正式记录
- 可绕过后端权限的用户数据
- 不受清理策略约束的大量截图

规则：

- 缓存 key 必须包含足够边界，例如 `game_account_id`。
- OCR provider 或 parser 版本变化时，不无条件复用旧缓存。
- 清理策略必须存在。

---

## 8. 后端与数据库边界

后端必须保证：

- 所有业务写入需要认证。
- 所有 `GameAccount` 资源访问需要 ownership 校验。
- recognition session 和 snapshot 不能跨用户或跨 `GameAccount`。
- duplicate hash 和 client event id 保持幂等。
- 回滚不能影响其他用户或其他 `GameAccount`。

数据库约束、后端校验和测试应共同保护这些边界。

客户端校验只能改善体验，不能替代后端安全。

---

## 9. 云端部署边界

未来后端和 Web 可以迁移到云服务器。

云端部署允许：

- 云端后端 API
- 云端数据库
- 云端 Web 静态资源
- WPF 连接云端 API

云端部署不自动允许：

- 云端 OCR
- 上传完整截图
- 上传本地日志
- 上传本地缓存
- 收集用户设备环境

任何新增云端数据流都必须说明上传什么、为什么上传、保存多久、谁能访问、如何删除、用户是否能关闭。

---

## 10. 安全变更验收

涉及认证、`GameAccount`、UID、识别写入、识别回滚、截图、OCR、日志、本地缓存、云端部署的变更必须提高验证要求。

默认验证问题：

- 是否仍需要登录？
- 是否仍校验 ownership？
- 是否会跨 `GameAccount` 泄露或写入？
- 是否上传了新的本地数据？
- 是否记录了敏感信息？
- 是否改变了 OCR 隐私边界？
- 是否有测试覆盖越权和回滚？

---

## 11. 与其他长期文档的关系

- 产品边界见 [`product-principles-and-scope.md`](./product-principles-and-scope.md)。
- 架构 owner 见 [`architecture.md`](./architecture.md)。
- API 与数据契约见 [`api-and-data-contracts.md`](./api-and-data-contracts.md)。
- 后台性能和 OCR 运行时见 [`performance-and-background-runtime.md`](./performance-and-background-runtime.md)。
- 工程质量见 [`engineering-quality.md`](./engineering-quality.md)。
- 发布策略见 [`versioning-and-release-policy.md`](./versioning-and-release-policy.md)。

---

## 12. 给 Codex 与后续协作者的默认约束

- 不把云端部署误写成云端 OCR。
- 不把截图上传做成默认路径。
- 不让客户端校验替代后端权限。
- 不在日志里写密码、token、cookie 或完整截图。
- 任何改变隐私边界的功能都必须先确认。
