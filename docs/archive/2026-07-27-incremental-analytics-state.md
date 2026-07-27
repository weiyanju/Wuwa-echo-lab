# Incremental Analytics State

The analytics app now owns a per-`GameAccount` durable projection used to rebuild
incremental model inputs without replaying roll history on every future read.

- `GameAccountAnalyticsState` isolates projection lifecycle, source versions and errors per account.
- Pure accumulation keeps count, set, bounded sequence, conditional pattern and bounded dynamic-outcome data.
- Rebuilds stream ordered roll rows once and use a source-version compare-and-swap before persistence.
- Roll mutations mark the matching account projection dirty; the management command repairs dirty states by default.

The current prediction, statistics and evaluation read paths intentionally remain on their legacy replay source. A later integration batch may switch ready-state reads to this projection.
