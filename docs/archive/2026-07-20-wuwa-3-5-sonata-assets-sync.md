# 3.5 合鸣效果与声骸资源同步记录

**日期：** 2026-07-20

## 实际结果

- 将合鸣效果数据同步到 `Arikatsu/WutheringWaves_Data` 的 `3.5` 分支。
- 前端套装列表从 31 个更新为 34 个，新增 `羽落空尘之歌`、`清邪荡煞之心`、`冥途夜行之灯`。
- `冥途夜行之灯` 成为当前最新套装，排序继续按套装 id 倒序展示。
- 新增 3 个套装图标到 `WuwaFrontend/public/sonata-effects/`。
- 新增 3.5 套装对应声骸图片到 `WuwaFrontend/public/echo-images/images/`，并在 `sonataEchoes.raw.json` 中按 COST 4、COST 3、COST 1 分组。

## 数据与资源来源

- 数据：`https://github.com/Arikatsu/WutheringWaves_Data/tree/3.5/BinData`
- 资源优先级：`alt3ri/WW_Asset` Global 分支，缺失时回退到呜哇维基 CDN。
- 3.5 新套装图标和新增声骸图当前通过 CDN fallback 补齐。

## 验证证据

- `node --test scripts/wuwa-sonata-assets.test.mjs`：6 项通过。
- `npm test -- src\data\sonataEffects.test.js src\services\formatters.test.js`：15 项通过。
