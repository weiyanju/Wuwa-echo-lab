# Product

This file is a concise `impeccable` project context summary. The full product and UI rules remain in:

- `docs/product-principles-and-scope.md`
- `docs/product-interface-principles.md`
- `docs/web-ui-design-system-v2.md`
- `docs/web-workbench-ui-guidelines.md`
- `docs/security-privacy-and-data-boundaries.md`

## Register

product

## Users

Wuwa serves Wuthering Waves players who manage many echoes, tuning records, UID-bound game data, and long-running recognition history. They use the Web workbench when they actively want to review, enter, compare, audit, or analyze echo data with more structure than the local helper window provides.

## Product Purpose

Wuwa is an echo data management and local offline recognition assistant. The Web app is the deep workbench for echo records, UID management, statistics, prediction, evaluation, recognition review, rollback, and conflict handling. Its success depends on trustworthy data ownership, clear current account and UID context, and low-noise workflows that make dense data scannable.

## Brand Personality

Clear, restrained, professional, and task-focused. For the Web frontend UI refactor, `docs/web-ui-design-system-v2.md` is the highest-priority visual and interaction reference: IDE-like, keyboard-first, high-density, command-palette-driven, and hyper-minimal. Game context should appear through terminology, data model, and workflow, not through decorative hero artwork or visual effects.

## Anti-references

The UI should not feel like a marketing landing page, a visual-effects showcase, a generic enterprise admin system, a debug console, or a separate product with a different account/UID mental model. Avoid fake data previews, heavy glass effects, decorative card stacks, oversized heroes, and exposing developer concepts such as backend addresses.

## Design Principles

1. Frontend UI visual systems, layout architecture, component states, shortcuts, and interaction details follow `docs/web-ui-design-system-v2.md` first.
2. Account and UID context come before data operations.
3. Data readability and trust are more important than display effects.
4. Web is the deep workbench; WPF remains the low-distraction local assistant.
5. Errors and unavailable states must explain what the user can do next.

## Accessibility & Inclusion

Target WCAG AA contrast for text and controls. Preserve visible keyboard focus, 44px touch targets where practical, readable Chinese text at narrow widths, non-color-only states, and reduced-motion alternatives for non-essential transitions.
