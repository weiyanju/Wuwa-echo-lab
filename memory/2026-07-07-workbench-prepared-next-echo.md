# 2026-07-07 Workbench Prepared Next Echo

When optimizing tier-entry flow, keep the "next echo" click path off the full refresh/create chain.

- After the fifth recorded substat, `useEchoWorkspace` asks `echoWorkspaceDrafts` to prepare the next draft in the background.
- The next draft is keyed by source echo id plus normalized sonata/cost/main stat so stale drafts are not reused after config changes.
- Reset, account change, preview image selection, selection change, discard, and undo must clear the prepared draft token.
- `createNextEchoFromActive()` should consume the prepared draft first and only fall back to `createEchoWithConfig()`.
- Preview image PATCH responses must merge only image identity fields into the latest active echo. Do not replace the full echo object with a stale PATCH response because it can roll substats from 5 back to 4 and cause the next add-substat request to hit backend position validation.
