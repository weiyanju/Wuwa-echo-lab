# 多游戏 UID 首次启用与切换实施计划

> **供执行代理使用：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，逐任务执行本计划。所有步骤使用复选框跟踪状态。

**目标：** 改善首次 UID 绑定页，并让一个系统账号安全绑定、切换最多五个九位游戏 UID。

**架构：** Django `accounts` 领域服务负责九位 UID、最多五个、不可修改和唯一默认账号等强约束；Vue `useGameAccount` 负责当前账号与容量状态；首次启用视图和顶栏切换器只负责交互；`App.vue` 在账号范围变化时统一失效旧请求并刷新各 feature。WPF 仅同步九位 UID 和空账号契约，不在本轮新增多账号菜单。

**技术栈：** Django、Vue 3 Composition API、Node.js test runner、Vite、WPF/.NET 8

---

## 文件结构

- 修改 `Wuwa/accounts/services.py`：UID 领域校验、容量锁和账号写入规则。
- 修改 `Wuwa/accounts/views.py`：将明确的领域错误映射到现有错误响应。
- 修改 `Wuwa/api/tests/test_views.py`：账号 API 契约回归。
- 修改 `WuwaFrontend/src/services/playerUid.js`：九位 UID 规范化与校验。
- 修改 `WuwaFrontend/src/services/playerUid.test.js`：UID 规则单元测试。
- 修改 `WuwaFrontend/src/composables/useGameAccount.js`：当前账号、首次绑定、新增与切换状态机。
- 修改 `WuwaFrontend/src/composables/useGameAccount.test.js`：账号状态机行为测试。
- 修改 `WuwaFrontend/src/features/workspace/UidSetupView.vue`：简洁双栏首次启用页。
- 修改 `WuwaFrontend/src/features/workspace/UidSetupView.test.js`：首次启用页边界测试。
- 新建 `WuwaFrontend/src/components/controls/UidSwitcher.vue`：顶栏 UID 列表与行内新增表单。
- 新建 `WuwaFrontend/src/components/controls/UidSwitcher.test.js`：浮层交互边界测试。
- 修改 `WuwaFrontend/src/App.vue`、`WuwaFrontend/src/App.test.js`：应用级切换与跨 feature 刷新。
- 修改 `WuwaFrontend/src/styles/shell.css`、`WuwaFrontend/src/styles/features/workspace.css`：胶囊和首次启用页样式。
- 修改 `WuwaFrontend/src/architecture.test.js`：新组件归属与入口复杂度保护。
- 修改 `WuwaAssistant/WuwaAssistant/LoginWindow.xaml.cs`、`MainWindow.xaml.cs`：WPF 契约同步。
- 修改 `WuwaAssistant/WuwaAssistant.Tests/Program.cs`：WPF 九位 UID 与空账号回归。
- 新建 `docs/archive/2026-06-22-multi-game-uid-onboarding-switcher-implementation.md`：中文实施归档。

### 任务 1：后端锁定 UID 与账号数量契约

**文件：**
- 修改：`Wuwa/api/tests/test_views.py`
- 修改：`Wuwa/accounts/services.py`
- 修改：`Wuwa/accounts/views.py`

- [ ] **步骤 1：先写失败的 API 测试**

在 `ApiViewTests` 增加以下行为测试：

```python
def test_game_account_uid_must_be_exactly_nine_digits(self):
    self.client.login(username="tester", password="pw12345")
    for uid in ("12345678", "1234567890", "12345abcd"):
        response = self.client.post(
            reverse("game_account_list"),
            data=json.dumps({"uid": uid}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

def test_game_account_rejects_sixth_bound_uid(self):
    self.client.login(username="tester", password="pw12345")
    for uid in ("200000001", "200000002", "200000003", "200000004"):
        response = self.client.post(
            reverse("game_account_list"),
            data=json.dumps({"uid": uid}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
    response = self.client.post(
        reverse("game_account_list"),
        data=json.dumps({"uid": "200000005"}),
        content_type="application/json",
    )
    self.assertEqual(response.status_code, 400)

def test_bound_game_account_uid_cannot_change_or_clear(self):
    self.client.login(username="tester", password="pw12345")
    account = self.user.game_accounts.get(is_default=True)
    for uid in ("987654321", ""):
        response = self.client.patch(
            reverse("game_account_detail", args=[account.id]),
            data=json.dumps({"uid": uid}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
```

再补两个用例：`POST` 空 UID 返回 400；初始空默认账号可 `PATCH` 为九位 UID 且设为默认。

- [ ] **步骤 2：运行测试确认 RED**

在 `Wuwa/` 执行：

```powershell
.\.venv\Scripts\python.exe manage.py test api.tests.test_views.ApiViewTests --keepdb -v 2
```

预期：新增格式、上限和不可变测试失败；既有 ownership 与重复 UID 测试继续通过。

- [ ] **步骤 3：在领域 service 实现最小约束**

在 `accounts/services.py` 增加：

```python
import re

MAX_BOUND_GAME_ACCOUNTS = 5
GAME_UID_PATTERN = re.compile(r"^\d{9}$")


def validate_game_uid(uid, *, allow_empty=False):
    if not uid and allow_empty:
        return uid
    if not GAME_UID_PATTERN.fullmatch(uid):
        raise ValueError("游戏 UID 必须由 9 位数字组成。")
    return uid


def lock_account_owner(user):
    return User.objects.select_for_update().get(pk=user.pk)


def ensure_bound_account_capacity(user):
    if user.game_accounts.exclude(uid="").count() >= MAX_BOUND_GAME_ACCOUNTS:
        raise ValueError("最多只能绑定 5 个游戏 UID。")
```

调整 `create_game_account`：先锁用户行，要求 `uid` 非空且合法，检查容量，再处理默认账号并保存。调整 `update_game_account`：锁用户行；旧 UID 非空且新 UID 不同即拒绝；空 UID 首次写入时执行九位校验与容量检查。未传 `uid` 的默认切换不触发不可变错误。

- [ ] **步骤 4：运行后端账号测试确认 GREEN**

```powershell
.\.venv\Scripts\python.exe manage.py test api.tests.test_views.ApiViewTests --keepdb -v 2
```

预期：账号 API 测试全部通过。

- [ ] **步骤 5：提交后端契约**

```powershell
git add Wuwa/accounts/services.py Wuwa/accounts/views.py Wuwa/api/tests/test_views.py
git commit -m "feat: enforce game uid account limits"
```

### 任务 2：建立前端 UID 规则和多账号状态机

**文件：**
- 修改：`WuwaFrontend/src/services/playerUid.js`
- 修改：`WuwaFrontend/src/services/playerUid.test.js`
- 修改：`WuwaFrontend/src/composables/useGameAccount.js`
- 修改：`WuwaFrontend/src/composables/useGameAccount.test.js`
- 修改：`WuwaFrontend/src/services/gameAccountApi.js`

- [ ] **步骤 1：为九位规则和账号状态写失败测试**

将 `playerUid.test.js` 的示例改为九位 UID，并增加：

```js
import { isValidPlayerUid, normalizePlayerUid } from './playerUid.js'

test('accepts only exactly nine normalized digits', () => {
  assert.equal(normalizePlayerUid('UID 123 456 789'), '123456789')
  assert.equal(isValidPlayerUid('123456789'), true)
  assert.equal(isValidPlayerUid('12345678'), false)
  assert.equal(isValidPlayerUid('1234567890'), false)
})
```

在 `useGameAccount.test.js` 使用可排队的 `fetch` 响应，验证：默认空账号加一个已绑定账号时选择已绑定账号并 `PATCH is_default`；没有已绑定账号时 `workspaceLocked` 为真；新增账号发送 `{ uid, is_default: true }`；五个已绑定账号时 `canAddAccount` 为假；切换后只有目标账号 `is_default=true`。

- [ ] **步骤 2：运行目标测试确认 RED**

在 `WuwaFrontend/` 执行：

```powershell
& '..\.tools\node\node.exe' --test src\services\playerUid.test.js src\composables\useGameAccount.test.js
```

预期：缺少 `isValidPlayerUid`、`currentAccount`、`canAddAccount`、`addGameAccount` 和 `switchGameAccount` 而失败。

- [ ] **步骤 3：实现 UID helper 和账号状态机**

`playerUid.js` 保留纯后端无关 helper：

```js
export function normalizePlayerUid(value) {
  return String(value || '').replace(/\D/g, '')
}

export function isValidPlayerUid(value) {
  return /^\d{9}$/.test(normalizePlayerUid(value))
}
```

删除未被产品路径使用的本地 recent UID 存储函数及对应测试，避免形成第二套 UID 列表。

`useGameAccount` 导入 `createGameAccount`，并暴露：

```js
const boundAccounts = computed(() => accounts.value.filter((account) => !account.workspace_locked))
const currentAccount = computed(() => (
  accounts.value.find((account) => account.id === selectedAccountId.value)
  || boundAccounts.value.find((account) => account.is_default)
  || boundAccounts.value[0]
  || null
))
const workspaceLocked = computed(() => boundAccounts.value.length === 0)
const canAddAccount = computed(() => boundAccounts.value.length < 5)
```

实现 `bindInitialUid(uid)`、`addGameAccount(uid)` 和 `switchGameAccount(accountId)`。所有成功写入都通过一个 `replaceAccount(updated)` helper 清除其他行的本地默认标记，并更新 `selectedAccountId`。`loadGameAccounts()` 按设计顺序选择账号；默认为空但存在可用账号时调用 `switchGameAccount` 持久化回退选择。

- [ ] **步骤 4：运行目标测试确认 GREEN**

```powershell
& '..\.tools\node\node.exe' --test src\services\playerUid.test.js src\composables\useGameAccount.test.js src\services\api.test.js
```

预期：目标测试全部通过，API helper 路径不变。

- [ ] **步骤 5：提交前端账号状态机**

```powershell
git add WuwaFrontend/src/services/playerUid.js WuwaFrontend/src/services/playerUid.test.js WuwaFrontend/src/services/gameAccountApi.js WuwaFrontend/src/composables/useGameAccount.js WuwaFrontend/src/composables/useGameAccount.test.js
git commit -m "feat: add multi uid account state"
```

### 任务 3：重做首次 UID 启用页

**文件：**
- 修改：`WuwaFrontend/src/features/workspace/UidSetupView.vue`
- 修改：`WuwaFrontend/src/features/workspace/UidSetupView.test.js`
- 修改：`WuwaFrontend/src/styles/features/workspace.css`

- [ ] **步骤 1：先更新首次启用页边界测试**

断言视图使用 `isValidPlayerUid`，无效输入显示“请输入 9 位数字 UID”，提交按钮文案为“绑定并进入”，并存在 `.uid-setup-media`、`.uid-setup-card` 与 UID 查找提示；断言不存在多账号上限、删除规则和冗长产品功能文案。

- [ ] **步骤 2：运行视图测试确认 RED**

```powershell
& '..\.tools\node\node.exe' --test src\features\workspace\UidSetupView.test.js
```

预期：旧单栏 `locked-workbench` 结构和非空校验不能满足新断言。

- [ ] **步骤 3：实现已确认的简洁双栏卡片**

表单校验使用：

```js
if (!isValidPlayerUid(uid)) {
  validationError.value = '请输入 9 位数字 UID。'
  return
}
```

模板主体收敛为：

```vue
<section class="uid-setup-card">
  <div class="uid-setup-media" aria-hidden="true">
    <div class="uid-setup-orbit"><i></i><i></i></div>
  </div>
  <form class="uid-binding-form" @submit.prevent="submitUidBinding">
    <h2>绑定游戏 UID</h2>
    <p>绑定后即可进入工作台。</p>
    <label>UID <input inputmode="numeric" autocomplete="off" /></label>
    <button class="button-buy" type="submit">绑定并进入</button>
    <small>可在游戏个人信息页查看 UID</small>
  </form>
</section>
```

CSS 实现桌面双栏、浅色/深色、860px 上下布局和 `prefers-reduced-motion` 静态降级；媒体槽不引入外部素材。

- [ ] **步骤 4：运行首次启用页与结构测试**

```powershell
& '..\.tools\node\node.exe' --test src\features\workspace\UidSetupView.test.js src\architecture.test.js
```

预期：测试通过且 `UidSetupView.vue` 不突破结构基线；如合理增长，先拆出纯媒体组件而不是放宽无上限基线。

- [ ] **步骤 5：提交首次启用页**

```powershell
git add WuwaFrontend/src/features/workspace/UidSetupView.vue WuwaFrontend/src/features/workspace/UidSetupView.test.js WuwaFrontend/src/styles/features/workspace.css WuwaFrontend/src/architecture.test.js
git commit -m "feat: improve uid first run setup"
```

### 任务 4：实现顶栏 UID 胶囊菜单

**文件：**
- 新建：`WuwaFrontend/src/components/controls/UidSwitcher.vue`
- 新建：`WuwaFrontend/src/components/controls/UidSwitcher.test.js`
- 修改：`WuwaFrontend/src/styles/shell.css`
- 修改：`WuwaFrontend/src/architecture.test.js`

- [ ] **步骤 1：写组件失败测试**

测试断言组件接收 `accounts`、`currentAccount`、`canAddAccount`、`busy` 和 `error`；发出 `select`、`add`；使用 `check.svg` 与 `chevron-down.svg`；具有 `aria-expanded`、`aria-controls`、`role="menu"`、`Escape` 和外部点击清理；不读取 localStorage，不展示 `nickname`。

- [ ] **步骤 2：运行组件测试确认 RED**

```powershell
& '..\.tools\node\node.exe' --test src\components\controls\UidSwitcher.test.js
```

预期：组件尚不存在而失败。

- [ ] **步骤 3：实现列表与行内新增模式**

核心状态保持在组件内部：

```js
const open = ref(false)
const mode = ref('list')
const uidInput = ref('')
const localError = ref('')

function submitUid() {
  const uid = normalizePlayerUid(uidInput.value)
  if (!isValidPlayerUid(uid)) {
    localError.value = '请输入 9 位数字 UID。'
    return
  }
  emit('add', uid)
}
```

当前项只显示高亮和 SVG 勾号；胶囊使用 SVG 下拉图标；菜单顶部显示 `${accounts.length} / 5`。达到上限时按钮禁用并显示“已达上限”。`onMounted`/`onBeforeUnmount` 对称注册和清理 `pointerdown`、`keydown` 监听器，关闭时把焦点还给胶囊按钮。

- [ ] **步骤 4：运行组件、样式归属和构建测试**

```powershell
& '..\.tools\node\node.exe' --test src\components\controls\UidSwitcher.test.js src\architecture.test.js
& '..\.tools\node\npm.cmd' run build
```

预期：测试与生产构建通过。

- [ ] **步骤 5：提交 UID 菜单**

```powershell
git add WuwaFrontend/src/components/controls/UidSwitcher.vue WuwaFrontend/src/components/controls/UidSwitcher.test.js WuwaFrontend/src/styles/shell.css WuwaFrontend/src/architecture.test.js
git commit -m "feat: add uid switcher menu"
```

### 任务 5：接入应用级账号切换与安全刷新

**文件：**
- 修改：`WuwaFrontend/src/App.vue`
- 修改：`WuwaFrontend/src/App.test.js`
- 修改：`WuwaFrontend/src/features/workspace/useEchoWorkspace.test.js`
- 修改：`WuwaFrontend/src/features/recognition/useRecognitionReview.test.js`

- [ ] **步骤 1：先写应用编排失败测试**

把旧的“UID 胶囊不提供切换”测试改为断言导入并渲染 `UidSwitcher`，`selectedGameAccountId` 与 `boundPlayerUid` 来自 `gameAccount.currentAccount`。新增源码边界测试，要求切换和新增都先调用 `resetWorkspaceState()`，再调用账号 composable，最后 `refreshAll()`；错误路径重新加载账号列表且不恢复旧页面状态。

继续保留并扩展 `useEchoWorkspace`、`useRecognitionReview` 的代次测试：切换 `selectedGameAccountId` 后，旧请求完成不能恢复旧 UID 数据。

- [ ] **步骤 2：运行应用相关测试确认 RED**

```powershell
& '..\.tools\node\node.exe' --test src\App.test.js src\features\workspace\useEchoWorkspace.test.js src\features\recognition\useRecognitionReview.test.js
```

预期：App 仍绑定 `defaultAccount`，且没有新增/切换命令而失败。

- [ ] **步骤 3：实现统一账号范围变更流程**

将 App 派生状态改为：

```js
const selectedGameAccountId = computed(() => gameAccount.currentAccount.value?.id || null)
const boundPlayerUid = computed(() => gameAccount.currentAccount.value?.uid || '')
```

首次绑定调用 `bindInitialUid`。新增和切换共用：

```js
async function changeGameAccount(change) {
  error.value = ''
  saving.value = true
  resetWorkspaceState()
  try {
    await change()
    await refreshAll()
  } catch (err) {
    error.value = err.message
    await gameAccount.loadGameAccounts().catch(() => {})
    resetWorkspaceState()
  } finally {
    saving.value = false
  }
}
```

分别封装 `addGameAccount(uid)` 和 `selectGameAccount(id)`，并把账号列表、当前账号、容量、busy 和错误传入 `UidSwitcher`。切换失败后页面保持清空，不显示旧 UID 数据；用户可重试。

- [ ] **步骤 4：运行完整前端测试**

```powershell
& '..\.tools\node\npm.cmd' test
```

预期：全部前端测试通过；测试总数高于当前 94 项。

- [ ] **步骤 5：提交应用编排**

```powershell
git add WuwaFrontend/src/App.vue WuwaFrontend/src/App.test.js WuwaFrontend/src/features/workspace/useEchoWorkspace.test.js WuwaFrontend/src/features/recognition/useRecognitionReview.test.js
git commit -m "feat: switch game account data scopes"
```

### 任务 6：同步 WPF 的九位 UID 和空账号契约

**文件：**
- 修改：`WuwaAssistant/WuwaAssistant/LoginWindow.xaml.cs`
- 修改：`WuwaAssistant/WuwaAssistant/MainWindow.xaml.cs`
- 修改：`WuwaAssistant/WuwaAssistant.Tests/Program.cs`

- [ ] **步骤 1：先写 WPF 自测断言**

更新样例 UID 为九位，并断言 `MainWindow` 使用九位校验；断言 `LoginWindow` 在账号列表为空时不再调用 `CreateGameAccountAsync("", ...)`，而是报告后端账号状态异常。保留“默认已绑定账号优先、首个已绑定账号回退”的选择测试。

- [ ] **步骤 2：运行 WPF 自测确认 RED**

在仓库根目录执行：

```powershell
dotnet run --project WuwaAssistant\WuwaAssistant.Tests\WuwaAssistant.Tests.csproj
```

预期：新增九位校验和空账号契约断言失败。

- [ ] **步骤 3：实现 WPF 契约同步**

`MainWindow` 在提交前执行：

```csharp
if (uid.Length != 9 || !uid.All(char.IsDigit))
{
    throw new InvalidOperationException("游戏 UID 必须由 9 位数字组成。");
}
```

`ResolveStartupAccountAsync` 在列表为空时抛出明确错误，不再通过公共创建 API制造空账号；注册后的初始空账号仍由后端信号创建。WPF 本轮不增加多账号切换 UI。

- [ ] **步骤 4：运行 WPF 自测和构建**

```powershell
dotnet run --project WuwaAssistant\WuwaAssistant.Tests\WuwaAssistant.Tests.csproj
dotnet build WuwaAssistant\WuwaAssistant.slnx
```

预期：全部自测通过，解决方案构建成功。

- [ ] **步骤 5：提交 WPF 契约同步**

```powershell
git add WuwaAssistant/WuwaAssistant/LoginWindow.xaml.cs WuwaAssistant/WuwaAssistant/MainWindow.xaml.cs WuwaAssistant/WuwaAssistant.Tests/Program.cs
git commit -m "fix: align assistant game uid validation"
```

### 任务 7：三端回归、浏览器验收与中文归档

**文件：**
- 新建：`docs/archive/2026-06-22-multi-game-uid-onboarding-switcher-implementation.md`

- [ ] **步骤 1：运行完整自动化验证**

```powershell
cd Wuwa
.\.venv\Scripts\python.exe manage.py test --keepdb -v 1
.\.venv\Scripts\python.exe manage.py check
cd ..\WuwaFrontend
& '..\.tools\node\npm.cmd' test
& '..\.tools\node\npm.cmd' run build
cd ..
dotnet run --project WuwaAssistant\WuwaAssistant.Tests\WuwaAssistant.Tests.csproj
dotnet build WuwaAssistant\WuwaAssistant.slnx
```

预期：Django、Vue、Vite、WPF 自测和构建全部通过。

- [ ] **步骤 2：执行浏览器验收**

按以下顺序检查浅色、深色和 860px：

1. 新账号首次进入只显示简洁双栏绑定卡片，导航不可操作。
2. 非九位 UID 显示行内错误，九位 UID 可绑定并进入工作台。
3. UID 胶囊展示当前 UID、SVG 箭头和正确焦点状态。
4. 浮层展示账号数量、当前勾选、行内新增表单和五账号上限。
5. 切换后工作台、识别、统计、评估全部属于目标 UID。
6. 切换期间不闪回旧 UID 数据；失败后旧数据不恢复。
7. `Escape`、外部点击和键盘焦点行为正确。

- [ ] **步骤 3：写中文实施归档**

归档必须记录后端契约、前端组件边界、WPF 同步、实际测试数量、构建结果、浏览器截图结论，以及动图素材仍未进入本轮实现。

- [ ] **步骤 4：检查最终差异**

```powershell
git diff --check
git status --short
git log --oneline -8
```

预期：无空白错误；工作区只包含归档文档和计划内改动。

- [ ] **步骤 5：提交归档并推送当前分支**

```powershell
git add docs/archive/2026-06-22-multi-game-uid-onboarding-switcher-implementation.md
git commit -m "docs: archive multi uid implementation"
git push
```

预期：当前分支与上游同步，阶段提交清晰可回退。
