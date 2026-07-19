# Resumable Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a correctly authenticated system account with no bound game UID to re-enter UID initialization from the registration tab, without turning registration into a second login path for completed accounts.

**Architecture:** Extend the existing registration endpoint into a backend-owned create-or-resume onboarding state machine. The backend verifies credentials, decides whether onboarding is incomplete, establishes the session only for `created` or `resumed`, and returns stable outcomes/error codes; the frontend then reuses its existing `/me/`, game-account load, and `workspaceLocked` routing.

**Tech Stack:** Django, PostgreSQL, Django session authentication, Vue 3 composables, native Fetch API, Node test runner, Vite.

---

## File Structure

- `Wuwa/accounts/services.py`: owns create-or-resume registration business rules and race fallback.
- `Wuwa/accounts/views.py`: parses the registration request, maps service outcomes to HTTP/session responses.
- `Wuwa/api/responses.py`: preserves the existing `error` contract while optionally adding a stable error `code`.
- `Wuwa/api/tests/test_views.py`: verifies real HTTP/session behavior for created, resumed, invalid, and completed registrations.
- `Wuwa/api/tests/test_account_services.py`: verifies the service race fallback without putting business logic in the view.
- `Wuwa/api/tests/test_backend_structure.py`: locks the shared response and service ownership contracts.
- `WuwaFrontend/src/services/http.js`: exposes backend error `status` and `code` without breaking `Error.message`.
- `WuwaFrontend/src/services/http.test.js`: verifies structured API errors with real request-helper behavior.
- `WuwaFrontend/src/composables/useAuth.js`: stops issuing a second login request after successful registration.
- `WuwaFrontend/src/composables/useAuth.test.js`: verifies created/resumed session consumption and locked-account routing.
- `WuwaFrontend/src/App.test.js`: locks reuse of the existing `signUp → loadGameAccounts → workspaceLocked` flow.
- `docs/api-and-data-contracts.md`: defines registration outcomes and error codes.
- `docs/security-privacy-and-data-boundaries.md`: defines credential/session requirements for resume.
- `DESIGN.md`: records that the registration entry may resume only unfinished UID onboarding.
- `docs/web-homepage-terminal-design.md`: records the page-specific registration recovery behavior.
- `docs/archive/2026-07-19-resumable-registration-implementation.md`: records delivered behavior and verification evidence.

### Task 1: Backend create-or-resume state machine

**Files:**
- Create: `Wuwa/api/tests/test_account_services.py`
- Modify: `Wuwa/api/tests/test_views.py`
- Modify: `Wuwa/api/tests/test_backend_structure.py`
- Modify: `Wuwa/accounts/services.py`
- Modify: `Wuwa/accounts/views.py`
- Modify: `Wuwa/api/responses.py`

- [ ] **Step 1: Write failing endpoint tests**

Update `test_register_login_and_me` so a new registration:

```python
self.assertEqual(response.status_code, 201)
self.assertEqual(response.json()["registration_outcome"], "created")
self.assertEqual(self.client.get(reverse("me")).status_code, 200)
```

Do not issue a separate login request before `/me/`.

Add these tests to `ApiViewTests`:

```python
def test_register_resumes_unfinished_account_with_matching_credentials(self):
    user = User.objects.create_user(username="unfinished", password="pw12345")
    default_account = user.game_accounts.get(is_default=True)

    response = self.client.post(
        reverse("register"),
        data=json.dumps({"username": "unfinished", "password": "pw12345"}),
        content_type="application/json",
    )

    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.json()["registration_outcome"], "resumed")
    self.assertEqual(response.json()["default_game_account"]["id"], default_account.id)
    self.assertEqual(User.objects.filter(username="unfinished").count(), 1)
    self.assertEqual(user.game_accounts.count(), 1)
    self.assertEqual(self.client.get(reverse("me")).status_code, 200)


def test_register_rejects_unfinished_account_with_wrong_credentials(self):
    User.objects.create_user(username="unfinished", password="pw12345")

    response = self.client.post(
        reverse("register"),
        data=json.dumps({"username": "unfinished", "password": "wrong-password"}),
        content_type="application/json",
    )

    self.assertEqual(response.status_code, 400)
    self.assertEqual(response.json()["code"], "registration_credentials_invalid")
    self.assertEqual(self.client.get(reverse("me")).status_code, 401)


def test_register_rejects_completed_account_even_with_matching_credentials(self):
    response = self.client.post(
        reverse("register"),
        data=json.dumps({"username": "tester", "password": "pw12345"}),
        content_type="application/json",
    )

    self.assertEqual(response.status_code, 409)
    self.assertEqual(response.json()["code"], "registration_complete")
    self.assertEqual(self.client.get(reverse("me")).status_code, 401)
```

Update `test_api_response_helpers_preserve_existing_payload_contracts`:

```python
coded_error = responses.error_response(
    "registration complete",
    status=409,
    code="registration_complete",
)
self.assertEqual(
    json.loads(coded_error.content),
    {"error": "registration complete", "code": "registration_complete"},
)
```

Update the account-service ownership assertion so `start_registration` is callable.

- [ ] **Step 2: Write the failing race-fallback service test**

Create `Wuwa/api/tests/test_account_services.py`:

```python
from unittest.mock import patch

from django.contrib.auth.models import User
from django.db import IntegrityError
from django.test import TestCase

from accounts.services import start_registration


class AccountRegistrationServiceTests(TestCase):
    def test_create_race_resumes_the_committed_unfinished_user(self):
        existing = User.objects.create_user(username="racing-user", password="pw12345")

        with patch("accounts.services.register_user", side_effect=IntegrityError):
            result = start_registration("racing-user", "pw12345")

        self.assertEqual(result.user.id, existing.id)
        self.assertEqual(result.outcome, "resumed")
        self.assertEqual(User.objects.filter(username="racing-user").count(), 1)
        self.assertEqual(existing.game_accounts.count(), 1)
```

- [ ] **Step 3: Run backend tests and verify RED**

From `Wuwa/` run:

```powershell
.\.venv\Scripts\python.exe manage.py test api.tests.test_views.ApiViewTests.test_register_login_and_me api.tests.test_views.ApiViewTests.test_register_resumes_unfinished_account_with_matching_credentials api.tests.test_views.ApiViewTests.test_register_rejects_unfinished_account_with_wrong_credentials api.tests.test_views.ApiViewTests.test_register_rejects_completed_account_even_with_matching_credentials api.tests.test_account_services api.tests.test_backend_structure.BackendStructureTests.test_api_response_helpers_preserve_existing_payload_contracts api.tests.test_backend_structure.BackendStructureTests.test_domain_services_own_account_and_echo_write_workflows
```

Expected: failures because repeat registration still returns the old duplicate-name error, new registration does not establish a session or expose `registration_outcome`, the response helper has no `code`, and `start_registration` does not exist.

- [ ] **Step 4: Add structured error responses**

Change `Wuwa/api/responses.py`:

```python
def error_response(message, status, code=None):
    payload = {"error": message}
    if code:
        payload["code"] = code
    return JsonResponse(payload, status=status)
```

Existing callers without `code` must keep the exact `{"error": message}` response shape.

- [ ] **Step 5: Implement the registration service**

In `Wuwa/accounts/services.py`, import `dataclass` and `IntegrityError`, then add:

```python
@dataclass(frozen=True)
class RegistrationResult:
    user: User
    outcome: str


class RegistrationCredentialsInvalid(Exception):
    pass


class RegistrationAlreadyComplete(Exception):
    pass


def _resume_registration(user, password):
    if not user.check_password(password):
        raise RegistrationCredentialsInvalid
    if user.game_accounts.exclude(uid="").exists():
        raise RegistrationAlreadyComplete
    return RegistrationResult(user=user, outcome="resumed")


def start_registration(username, password):
    try:
        with transaction.atomic():
            user = register_user(username, password)
    except (UsernameAlreadyExists, IntegrityError):
        user = User.objects.get(username=username)
        return _resume_registration(user, password)
    return RegistrationResult(user=user, outcome="created")
```

Keep `register_user()` as the single low-level user creator so existing structure contracts remain valid.

- [ ] **Step 6: Map the service to HTTP and session behavior**

Update `Wuwa/accounts/views.py` imports and replace direct `register_user()` use with:

```python
try:
    result = start_registration(username, password)
except RegistrationCredentialsInvalid:
    return error_response(
        "无法继续创建档案，请检查账号与访问密钥。",
        status=400,
        code="registration_credentials_invalid",
    )
except RegistrationAlreadyComplete:
    return error_response(
        "档案已完成，请使用终端登录。",
        status=409,
        code="registration_complete",
    )

login(request, result.user)
default_account = default_game_account(result.user)
return success_response(
    {
        "id": result.user.id,
        "username": result.user.username,
        "registration_outcome": result.outcome,
        "default_game_account": serialize_game_account(default_account),
    },
    status=201 if result.outcome == "created" else 200,
)
```

Do not establish a session in either exception path.

- [ ] **Step 7: Run focused backend tests and verify GREEN**

Run the command from Step 3.

Expected: all selected tests pass.

- [ ] **Step 8: Run the complete backend test suite**

From `Wuwa/` run:

```powershell
.\.venv\Scripts\python.exe manage.py test
```

Expected: all backend tests pass using the configured local PostgreSQL test database.

- [ ] **Step 9: Commit Task 1**

```powershell
git add Wuwa/accounts/services.py Wuwa/accounts/views.py Wuwa/api/responses.py Wuwa/api/tests/test_views.py Wuwa/api/tests/test_account_services.py Wuwa/api/tests/test_backend_structure.py
git commit -m "feat: resume incomplete registrations"
```

### Task 2: Frontend session consumption and structured errors

**Files:**
- Create: `WuwaFrontend/src/services/http.test.js`
- Modify: `WuwaFrontend/src/services/http.js`
- Modify: `WuwaFrontend/src/composables/useAuth.test.js`
- Modify: `WuwaFrontend/src/composables/useAuth.js`
- Modify: `WuwaFrontend/src/App.test.js`

- [ ] **Step 1: Write the failing HTTP error metadata test**

Create `WuwaFrontend/src/services/http.test.js`:

```javascript
import assert from 'node:assert/strict'
import test from 'node:test'

globalThis.document = { cookie: 'csrftoken=test-token' }

const { request } = await import('./http.js')

test('request preserves backend status and stable error code', async () => {
  globalThis.fetch = async () => ({
    ok: false,
    status: 409,
    async json() {
      return {
        error: '档案已完成，请使用终端登录。',
        code: 'registration_complete',
      }
    },
  })

  await assert.rejects(
    request('/auth/register/', { method: 'POST', body: '{}' }),
    (error) => {
      assert.equal(error.message, '档案已完成，请使用终端登录。')
      assert.equal(error.status, 409)
      assert.equal(error.code, 'registration_complete')
      return true
    },
  )
})
```

- [ ] **Step 2: Write failing real-flow auth composable tests**

Expand `WuwaFrontend/src/composables/useAuth.test.js` with a response queue and real Fetch calls. Add:

```javascript
test('signUp consumes the backend registration session without a second login', async () => {
  queue(
    { registration_outcome: 'resumed' },
    { id: 7, username: 'unfinished' },
  )
  const state = useAuth()

  const user = await state.signUp({ username: 'unfinished', password: 'pw12345' })

  assert.deepEqual(user, { id: 7, username: 'unfinished' })
  assert.deepEqual(calls.map((call) => call.url), [
    '/api/auth/register/',
    '/api/me/',
  ])
  assert.equal(state.user.value.id, 7)
  assert.equal(state.loading.value, false)
})


test('resumed registration keeps the existing game-account lock routing', async () => {
  queue(
    { registration_outcome: 'resumed' },
    { id: 7, username: 'unfinished' },
    {
      results: [{
        id: 11,
        uid: '',
        is_default: true,
        workspace_locked: true,
      }],
    },
  )
  const auth = useAuth()
  const gameAccount = useGameAccount()

  await auth.signUp({ username: 'unfinished', password: 'pw12345' })
  await gameAccount.loadGameAccounts()

  assert.equal(auth.isAuthenticated.value, true)
  assert.equal(gameAccount.workspaceLocked.value, true)
  assert.equal(gameAccount.currentAccount.value, null)
})
```

Set `globalThis.document`, install a queued Fetch stub before importing `useAuth` and `useGameAccount`, and reset calls/responses with `beforeEach`.

Update the existing source contract to require `register(payload)` followed by `getMe()` inside `signUp()`, and to reject `register(payload)` followed by `login(payload)`.

- [ ] **Step 3: Lock App orchestration without adding a new page branch**

Add an `App.test.js` assertion:

```javascript
assert.match(
  appSource,
  /if \(mode === 'register'\) \{\s+await auth\.signUp\(payload\)[\s\S]+await gameAccount\.loadGameAccounts\(\)[\s\S]+if \(gameAccount\.workspaceLocked\.value\)/,
)
assert.doesNotMatch(appSource, /registration_outcome|registration_complete|resumeRegistration/)
```

This confirms `App.vue` remains orchestration-only and reuses the existing UID lock path.

- [ ] **Step 4: Run frontend tests and verify RED**

From `WuwaFrontend/` run:

```powershell
..\.tools\node\node.exe --test src/services/http.test.js src/composables/useAuth.test.js src/App.test.js
```

Expected: failures because HTTP errors lack `status`/`code` and `signUp()` still issues `/auth/login/`.

- [ ] **Step 5: Preserve structured HTTP errors**

Update `WuwaFrontend/src/services/http.js`:

```javascript
export class ApiError extends Error {
  constructor(message, { status, code = '' } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}
```

Replace the error throw with:

```javascript
throw new ApiError(
  data.error || `Backend responded with ${response.status}`,
  { status: response.status, code: data.code || '' },
)
```

- [ ] **Step 6: Consume the backend-created session**

Change only the `signUp()` success path in `WuwaFrontend/src/composables/useAuth.js`:

```javascript
try {
  await register(payload)
  user.value = await getMe()
  return user.value
}
```

Keep `login()` imported and used by `signIn()`. Do not add a registration outcome branch to `App.vue`.

- [ ] **Step 7: Run focused frontend tests and verify GREEN**

Run the command from Step 4.

Expected: all selected tests pass and Fetch calls contain no `/api/auth/login/` during `signUp()`.

- [ ] **Step 8: Run the complete frontend test suite and build**

From `WuwaFrontend/` run:

```powershell
..\.tools\node\npm.cmd test
..\.tools\node\npm.cmd run build
```

Expected: all frontend tests pass and Vite completes the production build.

- [ ] **Step 9: Commit Task 2**

```powershell
git add WuwaFrontend/src/services/http.js WuwaFrontend/src/services/http.test.js WuwaFrontend/src/composables/useAuth.js WuwaFrontend/src/composables/useAuth.test.js WuwaFrontend/src/App.test.js
git commit -m "feat: resume uid onboarding from registration"
```

### Task 3: Long-term contract documentation

**Files:**
- Modify: `docs/api-and-data-contracts.md`
- Modify: `docs/security-privacy-and-data-boundaries.md`
- Modify: `DESIGN.md`
- Modify: `docs/web-homepage-terminal-design.md`

- [ ] **Step 1: Document the API state machine**

Add to the authentication API section of `docs/api-and-data-contracts.md`:

```markdown
`POST /api/auth/register/` 同时承担创建与恢复未完成开户：

- 新用户返回 `201` 和 `registration_outcome: "created"`；
- 凭据正确且不存在任何已绑定 UID 的既有用户返回 `200` 和 `registration_outcome: "resumed"`；
- 凭据不正确返回 `400` 和 `code: "registration_credentials_invalid"`；
- 已有任意绑定 UID 的账户返回 `409` 和 `code: "registration_complete"`。

只有 `created` 与 `resumed` 建立 session。恢复判断由后端依据密码校验和 `GameAccount` UID 状态完成，客户端不得根据错误文案或本地缓存推断。
```

- [ ] **Step 2: Document the authentication boundary**

Add to the account/authentication section of `docs/security-privacy-and-data-boundaries.md`:

```markdown
- 注册入口恢复未完成开户前必须重新校验系统账户密码；用户名存在本身不能建立 session。
- 只有不存在任何已绑定 UID 的账户可以从注册入口恢复，已完成账户必须使用登录入口。
- 注册恢复不得覆盖密码、创建重复用户或重复默认 `GameAccount`，也不得记录凭据、cookie 或 session。
```

- [ ] **Step 3: Document the UI behavior without changing layout**

Add to `DESIGN.md` Authentication surface:

```markdown
“创建档案”是可恢复的开户入口：系统账户已创建但尚无任何绑定 UID 时，使用正确凭据再次提交会继续进入同一登录卡片内的 UID 初始化页；密码错误或已有绑定 UID 时保持在认证表单。该恢复不新增页面、卡片或普通登录捷径。
```

Add the equivalent page-specific rule to `docs/web-homepage-terminal-design.md` near the authentication-card flow:

```markdown
从 UID 初始化页返回登录后，未完成 UID 绑定的系统账户可用相同正确凭据再次从“创建档案”恢复到 UID 页。已完成 UID 绑定的账户仍需使用“终端登录”，页面不新增恢复卡片或额外步骤。
```

- [ ] **Step 4: Verify active docs**

From the repository root run:

```powershell
rg -n "registration_outcome|registration_credentials_invalid|registration_complete|可恢复的开户入口|再次从“创建档案”恢复" docs/api-and-data-contracts.md docs/security-privacy-and-data-boundaries.md DESIGN.md docs/web-homepage-terminal-design.md
git diff --check
```

Expected: each new contract appears in its intended active document and there are no whitespace errors.

- [ ] **Step 5: Commit Task 3**

```powershell
git add docs/api-and-data-contracts.md docs/security-privacy-and-data-boundaries.md DESIGN.md docs/web-homepage-terminal-design.md
git commit -m "docs: define resumable registration contract"
```

### Task 4: Final verification and implementation archive

**Files:**
- Create: `docs/archive/2026-07-19-resumable-registration-implementation.md`

- [ ] **Step 1: Run backend verification**

From `Wuwa/` run:

```powershell
.\.venv\Scripts\python.exe manage.py test
```

Record exact totals and failures.

- [ ] **Step 2: Run frontend verification**

From `WuwaFrontend/` run:

```powershell
..\.tools\node\npm.cmd test
..\.tools\node\npm.cmd run build
```

Record exact test totals, failures, Vite module count, and build result.

- [ ] **Step 3: Run repository checks**

From the repository root run:

```powershell
git diff --check
git status --short
git log --oneline -8
```

Confirm the unrelated evaluation files remain unmodified by this feature and outside its commits.

- [ ] **Step 4: Record the implementation**

Create `docs/archive/2026-07-19-resumable-registration-implementation.md` with:

- the final backend state machine and security boundary;
- endpoint statuses, outcomes, and error codes;
- frontend request sequence and reuse of `workspaceLocked`;
- RED/GREEN evidence from Tasks 1 and 2;
- backend/frontend full-test and build evidence;
- documentation changes;
- unchanged UID-page visuals;
- any unexecuted live browser scenario;
- confirmation that unrelated evaluation changes were preserved;
- confirmation that no merge or push occurred.

- [ ] **Step 5: Commit the archive**

```powershell
git add docs/archive/2026-07-19-resumable-registration-implementation.md
git commit -m "docs: record resumable registration delivery"
```

- [ ] **Step 6: Final review**

Review the complete range from `b2cad0c` through the archive commit for requirement coverage, authentication safety, API compatibility, test quality, documentation consistency, and accidental scope expansion. Fix every Critical or Important issue before handoff.
