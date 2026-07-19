# UID Binding Single Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the UID binding page's duplicate large title with one full-width, non-interactive header that matches the authentication tab geometry.

**Architecture:** Keep the change inside `UidBindingPanel.vue` and the existing auth feature stylesheet. Preserve all form events and application routing; use source-contract tests to lock the markup and shared token usage.

**Tech Stack:** Vue 3 SFC, CSS custom properties, Node test runner, Vite.

---

### Task 1: Lock the single-header contract

**Files:**
- Modify: `WuwaFrontend/src/features/auth/UidBindingPanel.test.js`
- Modify: `WuwaFrontend/src/App.test.js`

- [ ] **Step 1: Write the failing tests**

Require the UID panel to contain:

```html
<header class="terminal-uid-header">
  <h2>绑定 UID</h2>
</header>
<p class="terminal-uid-intro">首次进入需要绑定一个游戏账号。</p>
```

Also require that the header contains no button and that the removed title `绑定游戏 UID` does not remain.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
..\.tools\node\node.exe --test src/features/auth/UidBindingPanel.test.js src/App.test.js
```

Expected: the new single-header assertions fail because production markup still contains `terminal-uid-title` and `绑定游戏 UID`.

### Task 2: Implement the approved header and document it

**Files:**
- Modify: `WuwaFrontend/src/features/auth/UidBindingPanel.vue`
- Modify: `WuwaFrontend/src/styles/features/auth.css`
- Modify: `DESIGN.md`
- Modify: `docs/web-homepage-terminal-design.md`

- [ ] **Step 1: Implement the minimal markup**

Replace the old nested title wrapper with:

```html
<header class="terminal-uid-header">
  <h2>绑定 UID</h2>
</header>
<p class="terminal-uid-intro">首次进入需要绑定一个游戏账号。</p>
```

- [ ] **Step 2: Match the authentication heading geometry**

Style `.terminal-uid-header` with the existing authentication header spacing and a full-width semantic border. Style its `<h2>` with `--text-control`, `--weight-control`, `--leading-control`, `--tracking-cjk`, and `--terminal-text`. Keep `.terminal-uid-intro` and `.terminal-uid-hint` on the existing supporting-text roles.

- [ ] **Step 3: Update long-term rules**

Record that UID onboarding uses one centered, full-width, non-interactive heading while its description, field, and hint retain the normal left baseline.

- [ ] **Step 4: Verify GREEN and the full frontend**

Run:

```powershell
..\.tools\node\node.exe --test src/features/auth/UidBindingPanel.test.js src/App.test.js
..\.tools\node\npm.cmd test
..\.tools\node\npm.cmd run build
```

Expected: all focused and full tests pass; Vite production build exits successfully.
