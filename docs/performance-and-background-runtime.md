# 后台运行与性能规范

## 文档定位

本文定义 Wuwa Django 后端与 Vue Web 工作台拥有的运行和性能边界，并记录外部本地识别客户端必须满足的跨仓库契约。客户端内部状态机、窗口检测、截图、OCR worker、缓存实现和桌面指标由独立客户端仓库维护。

## 服务端原则

- recognition 写入保持认证、`GameAccount` ownership、幂等和回滚。
- API 查询避免无界列表与重复数据库访问。
- 后端不可达或请求失败时返回稳定错误，不以静默部分写入换取吞吐。
- 性能优化不能削弱数据归属、冲突、低置信度和回滚保护。

### Analytics 读取与重建

- `EchoRecord` 与 `SubstatRoll` 是事实源；每个 `GameAccount` 的 analytics state 是可重建的后端派生数据。
- ready 的 statistics、prediction、evaluation 不得回放账户全历史；新增调谐走增量追加。
- 删除、乱序、roll 移动到旧/新账户及 Echo 上下文变化必须只标脏关联账户，随后只对该单账户以 iterator 流式重建。
- repair 竞争在限定次数后仍不能提供 ready state 时，API 返回 `503` / `analytics_state_unavailable`，不返回部分或跨账户数据。
- 不引入 Redis 或 dedicated worker 作为本阶段前提；Redis 未来仅可选作加速/协调，不能取代数据库事实与 ownership。

## Web 原则

- 统计、预测和评估避免无意义重复请求与重复计算。
- 加载、空、错误、过期和刷新状态必须可见。
- 性能改动运行命中测试与生产构建，不以隐藏信息替代优化。
- 工作台初始 refresh 只请求统计并后台刷新当前声骸 prediction；evaluation 保留页面进入与 retry 的独立请求、loading 和错误状态。

## 外部本地识别客户端契约

- 自动识别关闭或未找到目标窗口时不得运行 OCR。
- 常规流程只提交结构化结果，不上传完整截图。
- 相同截图 hash 应重复抑制。
- OCR 不阻塞 UI，且同一时间最多一个 worker。
- 后端不可达时不得无限快速重试或造成任务无界堆积。
- 低置信度或字段缺失不能绕过复核与回滚保护。

上述客户端实现细节、测量指标和桌面验收在客户端仓库维护；本仓库只在 API 和数据边界变化时验证兼容性。

## 验证

- Django recognition、ownership、幂等和回滚测试。
- Vue 命中测试与生产构建。
- API 响应形状和错误契约测试。
- 改变外部客户端契约时同步两个仓库或提供兼容期。
