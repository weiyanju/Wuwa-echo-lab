# Floating History Panel Unified Transitions Design

## Problem

The floating history panel currently represents compact, showcase, and minimized states with two independent booleans. During showcase minimization, the showcase boolean is cleared before the exit animation completes. Vue therefore renders the compact layout while the panel is still visible, producing an unintended showcase → compact → terminal sequence.

The three transitions also use separate timing values and blur amounts, which makes the same panel feel like three unrelated components.

## Approved behavior

- The panel has exactly three mutually exclusive modes: `compact`, `showcase`, and `minimized`.
- Compact and showcase minimize directly to the terminal without rendering an intermediate mode.
- Expanding the terminal restores the last non-minimized mode:
  - compact → minimized → compact
  - showcase → minimized → showcase
- Compact ↔ showcase uses the same motion language as expanded ↔ minimized.
- The panel remains draggable and keeps the existing corner-based positioning behavior.

## State model

Create a small pure state module owned by the history feature:

```js
export const HISTORY_PANEL_MODE = Object.freeze({
  COMPACT: 'compact',
  SHOWCASE: 'showcase',
  MINIMIZED: 'minimized',
})
```

`historyPanelMode` is the only rendered mode. `lastExpandedMode` remembers either `compact` or `showcase` and is persisted so a terminal that survives a page reload still restores the correct expanded shape. A pure transition resolver accepts the current state and an intent (`toggle-minimized` or `toggle-showcase`) and returns one target state. It never emits an intermediate mode.

Existing `isHistoryMinimized` and `isHistoryShowcase` values become computed projections for readable template conditions and existing drag logic; they are not independently mutable.

## Motion choreography

Every mode change uses one `transitionFloatingHistoryPanel(intent)` function:

1. Ignore a second transition request while one is active.
2. Capture the current panel rectangle, position, and nearest viewport corner.
3. Fade the visible mode out with opacity and a short 8px corner-relative translation over 120ms.
4. While the element is fully transparent and hidden, atomically apply the target mode and target position.
5. Wait for Vue to render the target layout with `nextTick()`.
6. Fade the target mode in from a 6px inverse translation over 140ms.
7. Clear inline animation styles and constrain the final saved position.

Width, height, border radius, blur, and layout are not animated. This prevents dense record cards from being compressed or reflowing while visible and follows the project motion tokens.

When `prefers-reduced-motion: reduce` is active, both animation phases resolve immediately; the mode changes atomically without a visible intermediate frame.

## Position behavior

- Minimizing uses the current panel's nearest corner and reuses the prior terminal position when available.
- Expanding restores the last expanded position when available, constrained to the current viewport.
- Compact → showcase remembers the compact position; showcase → compact restores it.
- Dragging an expanded panel invalidates stale restore coordinates so the next transition starts from the user's latest position.

## Accessibility and interaction

- Existing button names, titles, click targets, drag suppression, pinned behavior, and terminal icon rotation remain intact.
- During a transition, repeated clicks are ignored to prevent overlapping promises and contradictory state updates.
- Hidden content continues to use `aria-hidden` and `inert` in minimized mode.

## Verification

Automated tests cover the pure transition model and component integration contracts. Browser QA covers all directed transitions:

- compact → showcase
- showcase → compact
- compact → minimized
- minimized → compact
- showcase → minimized
- minimized → showcase

Each transition must show only its source and target modes, preserve the expected restore mode, avoid visible list reflow, and produce no console errors.
