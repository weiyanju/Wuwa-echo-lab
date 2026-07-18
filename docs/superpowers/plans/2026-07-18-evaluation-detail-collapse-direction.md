# Evaluation Detail Collapse Direction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make evaluation submodel details close without a downward-fold illusion while preserving the existing disclosure semantics and arrow states.

**Architecture:** Keep the existing Vue state and native disclosure button unchanged. Remove layout-property transitions from the detail panel, retain a short opacity/transform entrance, and let close immediately complete the document-flow change while the existing chevron rotation communicates the state change.

**Tech Stack:** Vue 3, CSS, Node.js built-in test runner, Vite

---

### Task 1: Lock the motion contract with a failing test

**Files:**
- Modify: `WuwaFrontend/src/App.test.js`
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js`

- [x] Replace the old source-presence assertions with rule-level assertions that reject `max-height`, height, margin, padding, and position transitions for `model-row-detail`.
- [x] Assert that only the enter phase has a 140ms opacity/transform transition.
- [x] Assert that close has no detail-panel leave transition and therefore completes the layout change immediately.
- [x] Assert that light and dark detail surfaces both clip overflow.
- [x] Run the targeted tests and confirm they fail against the legacy CSS for the expected reasons.

### Task 2: Apply the minimal CSS fix

**Files:**
- Modify: `WuwaFrontend/src/styles/features/evaluation.css`

- [x] Remove the fixed `max-height: 980px`.
- [x] Remove all leave-phase layout transitions and collapsed margin/padding states.
- [x] Keep a 140ms opacity/transform enter transition anchored at the top.
- [x] Change the dark-theme detail rule from `overflow: visible` to `overflow: hidden`.
- [x] Update the final reduced-motion override so the enter transition and chevron rotation switch directly to their final states.
- [x] Run the targeted tests and confirm they pass.

### Task 3: Document and verify the fix

**Files:**
- Create: `docs/archive/2026-07-18-evaluation-detail-collapse-direction-implementation.md`

- [x] Record the root cause, implementation, affected files, data-boundary impact, verification, and visual-validation limits.
- [x] Run the full frontend test suite.
- [x] Run the production build.
- [x] Run `git diff --check` and inspect `git status --short`.
- [x] Perform browser validation if an authenticated evaluation fixture is available; otherwise document why geometry could not be observed with real evaluation data.
