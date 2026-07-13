# Compact TETHYS Wordmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the authenticated workbench topbar's visible `Tethys System` label and gradient dot with a compact `TETHYS` wordmark and a single-color orbital-node symbol, without changing the rest of the header.

**Architecture:** Keep the change inside the existing application-shell boundary. `App.vue` owns the accessible link markup, `styles/shell.css` owns the visual symbol and typography, and `App.test.js` locks the contract with source-level tests that match the project's current testing style. No new component, asset, dependency, breakpoint, or product-wide rename is needed.

**Tech Stack:** Vue 3 single-file components, CSS pseudo-elements, Node.js built-in test runner, Vite.

---

## File map

- Modify `WuwaFrontend/src/App.test.js`: add the wordmark markup, styling, accessibility, and unchanged-hero regression contract.
- Modify `WuwaFrontend/src/App.vue:241`: render the new visible label and decorative symbol while preserving the existing navigation behavior.
- Modify `WuwaFrontend/src/styles/shell.css:272-290`: replace the current heavy wordmark and gradient-dot styling with the compact wordmark and orbital node.
- Read-only guard `WuwaFrontend/src/architecture.test.js:10-22`: confirm `App.vue` stays at or below 320 lines and `shell.css` stays at or below 880 lines.

### Task 1: Lock and implement the compact wordmark

**Files:**
- Modify: `WuwaFrontend/src/App.test.js:92`
- Modify: `WuwaFrontend/src/App.vue:241`
- Modify: `WuwaFrontend/src/styles/shell.css:272-290`
- Test: `WuwaFrontend/src/App.test.js`
- Test: `WuwaFrontend/src/architecture.test.js`

- [ ] **Step 1: Write the failing wordmark contract test**

Insert this test immediately before `topbar renders the shared uid switcher for game account selection` in `WuwaFrontend/src/App.test.js`:

```js
test('topbar uses a compact accessible TETHYS wordmark without changing the hero', async () => {
  const appSource = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  const shellStyleSource = await readFile(new URL('./styles/shell.css', import.meta.url), 'utf8')

  assert.match(appSource, /<a class="wordmark" href="#" aria-label="返回 Tethys System 工作台" @click\.prevent="page = 'workspace'"><span class="wordmark-symbol" aria-hidden="true"><\/span>TETHYS<\/a>/)
  assert.doesNotMatch(appSource, /<a class="wordmark"[^>]*>Tethys System<\/a>/)
  assert.match(appSource, /<section class="hero-band compact">[\s\S]+<h1>你好，漂泊者<\/h1>/)
  assert.match(appSource, /<span>历史声骸<\/span>[\s\S]+<span>总样本<\/span>[\s\S]+<span>置信度<\/span>/)
  assert.match(shellStyleSource, /\.wordmark \{[\s\S]+font-size: 16px;[\s\S]+font-weight: 700;[\s\S]+letter-spacing: 0\.08em;/)
  assert.match(shellStyleSource, /\.wordmark-symbol::before \{[^}]+border: 1\.5px solid var\(--primary\);/)
  assert.match(shellStyleSource, /\.wordmark-symbol::after \{[^}]+background: var\(--primary\);/)
  assert.doesNotMatch(shellStyleSource, /\.wordmark::before \{[^}]+linear-gradient/)
})
```

- [ ] **Step 2: Run the focused test and confirm the new contract fails**

Run from `WuwaFrontend`:

```powershell
node --test src/App.test.js
```

Expected: the new `topbar uses a compact accessible TETHYS wordmark without changing the hero` test fails because `App.vue` still renders `Tethys System` and `shell.css` still uses `.wordmark::before` with `linear-gradient`; the pre-existing tests pass.

- [ ] **Step 3: Replace the topbar wordmark markup**

Replace the existing topbar anchor in `WuwaFrontend/src/App.vue` with this single line so the entry file does not grow:

```vue
<a class="wordmark" href="#" aria-label="返回 Tethys System 工作台" @click.prevent="page = 'workspace'"><span class="wordmark-symbol" aria-hidden="true"></span>TETHYS</a>
```

Do not change the separate `brand-mark`, login page, UID setup page, navigation buttons, account actions, or `hero-band` markup.

- [ ] **Step 4: Replace the wordmark CSS without exceeding the shell line budget**

In `WuwaFrontend/src/styles/shell.css`, replace the existing `.wordmark` and `.wordmark::before` blocks with:

```css
.wordmark {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--ink-deep);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-decoration: none;
}

.wordmark-symbol { position: relative; flex: 0 0 auto; width: 20px; height: 20px; }
.wordmark-symbol::before { position: absolute; inset: 2px; border: 1.5px solid var(--primary); border-radius: 50%; content: ""; }
.wordmark-symbol::after { position: absolute; top: 1px; right: 0; width: 7px; height: 7px; border-radius: 50%; background: var(--primary); content: ""; }
```

The compact pseudo-element rules intentionally replace the longer gradient-dot block. Do not raise the architecture baseline; `shell.css` is currently 879 lines against an 880-line cap.

- [ ] **Step 5: Run focused and architecture tests**

Run from `WuwaFrontend`:

```powershell
node --test src/App.test.js src/architecture.test.js
```

Expected: all selected tests pass, including the new wordmark contract and both entry-file line-count guards.

- [ ] **Step 6: Review the scoped diff**

Run from the repository root:

```powershell
git diff --check -- WuwaFrontend/src/App.vue WuwaFrontend/src/App.test.js WuwaFrontend/src/styles/shell.css
git diff -- WuwaFrontend/src/App.vue WuwaFrontend/src/App.test.js WuwaFrontend/src/styles/shell.css
```

Expected: no whitespace errors; the diff contains only the topbar wordmark markup, its test, and the replacement wordmark styles. The welcome band, metrics, navigation, UID switcher, theme toggle, and sign-out button remain unchanged.

- [ ] **Step 7: Commit the implementation**

```powershell
git add WuwaFrontend/src/App.vue WuwaFrontend/src/App.test.js WuwaFrontend/src/styles/shell.css
git commit -m "feat: refine topbar TETHYS wordmark"
```

### Task 2: Verify the complete frontend and visual states

**Files:**
- Verify: `WuwaFrontend/src/App.vue`
- Verify: `WuwaFrontend/src/styles/shell.css`
- Test: all files discovered by `node --test`

- [ ] **Step 1: Run the complete frontend test suite**

Run from `WuwaFrontend`:

```powershell
npm test
```

Expected: 191 tests pass, 0 fail. The count is the current 190-test baseline plus the new wordmark contract.

- [ ] **Step 2: Produce a production build**

Run from `WuwaFrontend`:

```powershell
npm run build
```

Expected: Vite completes successfully and writes the production bundle to `WuwaFrontend/dist` without CSS or Vue compilation errors.

- [ ] **Step 3: Inspect the authenticated workbench at desktop width**

Run from `WuwaFrontend`:

```powershell
npm run dev -- --host 127.0.0.1
```

Open the authenticated workbench in the browser at the printed local URL with a viewport of at least 1360px. Confirm all of the following:

- The top-left link shows the orbital-node symbol followed by `TETHYS`.
- The label is visually lighter and shorter than the previous `Tethys System` wordmark.
- “工作台 / 统计 / 评估”, UID, theme, and exit controls retain their original positions.
- “你好，漂泊者”, “历史声骸”, “总样本”, and “置信度” remain unchanged.
- Clicking `TETHYS` returns to the workbench.

- [ ] **Step 4: Inspect dark and responsive states**

Using the same browser session:

1. Toggle dark mode and confirm `TETHYS` uses the existing light foreground mapping while the orbital node remains brand blue.
2. Inspect at 860px and 520px viewport widths; confirm the shorter wordmark does not overflow, disappear, or reorder the navigation.
3. Use keyboard Tab navigation; confirm the wordmark receives the browser's visible focus outline and its accessible name is “返回 Tethys System 工作台”.

Expected: all three states are readable and structurally identical to the pre-change header except for the new wordmark.

- [ ] **Step 5: Record final repository status**

Run from the repository root:

```powershell
git status --short
```

Expected: the wordmark implementation is committed. Any unrelated pre-existing worktree changes remain untouched and are reported separately rather than included in the wordmark commit.
