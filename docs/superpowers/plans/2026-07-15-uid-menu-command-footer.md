# UID Menu Command Footer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebalance the UID popover so account management stays prominent while sign-out becomes a clearly separated, right-aligned low-frequency footer command.

**Architecture:** Keep all account behavior and emitted events unchanged. Anchor the popover to the `UidSwitcher` component, add a semantic footer wrapper around the existing sign-out button, and express the new hierarchy entirely through shell-owned CSS. Lock the structure and visual contract with the existing source-based UID switcher tests before changing production code.

**Tech Stack:** Vue 3, CSS custom properties, Node.js built-in test runner, Vite.

---

## File map

- Modify `WuwaFrontend/src/components/controls/UidSwitcher.test.js`: require the footer wrapper, UID-local positioning, solid add affordance, and low-frequency sign-out styling.
- Modify `WuwaFrontend/src/components/controls/UidSwitcher.vue`: wrap the existing sign-out button in a footer container without changing its event or menu semantics.
- Modify `WuwaFrontend/src/styles/shell.css`: anchor the popover to `.uid-switcher`, remove the dashed add treatment, and implement the separated right-aligned footer command in light and dark themes.
- Modify `DESIGN.md`: replace the superseded full-width sign-out-row rule with the approved low-frequency footer hierarchy.
- Modify `docs/superpowers/specs/2026-07-14-uid-menu-action-hierarchy-design.md`: record the latest approved refinement.
- Create `docs/archive/2026-07-15-uid-menu-command-footer-implementation.md`: capture the verified result.

### Task 1: Lock the approved hierarchy with a failing test

- [x] Update the UID switcher structure test to require `class="uid-switcher-footer"` around the existing `role="menuitem"` sign-out button.
- [x] Update the shell-style test to assert `.uid-switcher { position: relative; }`, `.uid-switcher-add` uses a solid border rather than `dashed`, `.uid-switcher-footer` owns the full-width divider and right alignment, and `.uid-switcher-sign-out` has a 44px target with transparent default styling and Label typography.
- [x] Run `..\.tools\node\node.exe --test src\components\controls\UidSwitcher.test.js` from `WuwaFrontend` and confirm the new assertions fail against the current implementation.

### Task 2: Implement the minimal Vue and CSS change

- [x] Wrap the existing sign-out button in `<div class="uid-switcher-footer">` while preserving `role="menuitem"` and `@click="emit('sign-out')"`.
- [x] Add `position: relative` to `.uid-switcher` so `.uid-switcher-menu { right: 0; }` aligns with the UID chip rather than the surrounding theme-control group.
- [x] Change the add affordance to a solid weak-blue border and background, keeping its 44px size and centered label.
- [x] Give the footer a top divider, top padding, and `justify-content: flex-end`; render sign-out as a compact 44px transparent text target with right-side placement and danger styling only on hover/focus.
- [x] Add equivalent dark-theme footer, add-action, and sign-out colors.
- [x] Re-run the focused UID test and confirm it passes.

### Task 3: Synchronize durable design rules

- [x] Update `DESIGN.md` to state that sign-out is a right-aligned footer command separated from the account-management content, with no default filled container.
- [x] Update the action-hierarchy design spec so earlier full-width centered/lightweight-row examples are explicitly superseded.

### Task 4: Verify and archive

- [x] Run the UID switcher and architecture tests together.
- [x] Run the complete frontend test suite and require zero failures.
- [x] Run the Vite production build.
- [x] Run `git diff --check`, inspect the scoped diff, and preserve unrelated dirty-worktree changes.
- [x] Write the implementation archive with exact verification results and any visual-QA limitation.

No commit, stage, push, or pull request is part of this execution unless the user requests it separately.
