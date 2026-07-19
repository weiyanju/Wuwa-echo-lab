# Fusion Weight Top1 Marker Removal Implementation

## Scope

- Removed the Top1 hit-rate legend and triangular markers from the fusion-weight overview.
- Removed Top1 hit-rate text from fusion-weight tooltips.
- Removed the CSS owned exclusively by those deleted markers.
- Kept current-weight bars and base-weight markers unchanged.

## Preserved Behavior

- The core backtest still presents Top1 through Top5 hit-rate evaluation.
- Model detail views still use `adjustment.hit_rate` where the metric is relevant.
- No API, data model, fusion algorithm, or backend behavior changed.

## Verification

- Confirmed the new boundary test failed before the overview cleanup and passed afterward.
- Targeted evaluation overview tests: 2 passed, 0 failed.
- Full frontend tests: 94 passed, 0 failed.
- Vite production build: passed; 51 modules transformed.

Browser visual acceptance remains a manual check because this change was verified through source-boundary tests and production compilation in the current environment.
