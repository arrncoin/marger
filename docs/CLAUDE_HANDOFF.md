# Claude Code Handoff

## Current project condition

- Workspace root: `C:\Users\confi\Downloads\marger`.
- Project A (`A/`) is the primary runtime and source of truth for backend, API, database, bot, YouTube, and existing application behavior.
- Project B (`B/`) is a React/TypeScript/Vite UI and TikTok connector reference. Do not replace A's backend with B's server.
- TikTok visible settings in A now center on username, but legacy API key configuration remains in backend/config. Do not reintroduce a key requirement or remove legacy config blindly.
- `A/src/integrations/tiktok/juleTikSdk.js` wraps `tiktok-live-connector`; unit tests pass but do not prove a real live connection. Reconnect fields do not currently amount to an implemented retry loop.
- A has existing game, point, YouTube, database and OBS overlay functionality that must be preserved.
- TikTool identifier search found no matches in searched A/B source trees. Re-run scoped searches before release; do not re-add a TikTool package or cookie flow.
- A/B are not Git repositories in the current workspace. Establishing source control requires owner approval; never invent a clean baseline or overwrite user work.

## Read these documents first

1. `docs/PROJECT_STATUS.md`
2. `docs/TECHNICAL_DEBT.md`
3. `docs/FEATURE_PARITY_MATRIX.md`
4. `docs/UI_UX_MIGRATION.md`
5. `docs/FINAL_IMPLEMENTATION_ROADMAP.md`
6. `docs/FINAL_ACCEPTANCE_CHECKLIST.md`
7. `docs/IMPLEMENTATION_WORKLOG.md`

## Highest-priority next work

1. Investigate and fix secret exposure in A's public config serialization and verify route protections.
2. Establish a safe source-control baseline with approval; preserve all local data and work.
3. Replace A's narrow lint/placeholder build with meaningful checks and a test script.
4. Clarify TikTok connection lifecycle/status ownership, reconnect and timeout behavior; add tests for all events.
5. Keep the connector's actual access limitations explicit; run a controlled live test only with an authorized active stream.
6. Complete A/B screen inventory and browser-based visual/interactions comparison; adopt compatible B UX without changing A's runtime contracts.

## Do not repeat or do blindly

- Do not restart the merge from scratch or copy Project B wholesale.
- Do not overwrite, delete, or migrate A's database/state or user configuration without backup and approval.
- Do not reintroduce TikTool/TikTools or system cookies to make UI appear to work.
- Do not claim TikTok connected/live until a connector handshake proves it.
- Do not claim full UI parity, live event support, production build success, or end-to-end tests without fresh evidence.
- Do not remove legacy TikTok key config until all consumers and user-config migration are understood.
- Do not commit secrets or expose raw config values.

## Architecture and implementation boundaries

- A owns backend, API, persistent data, bot, YouTube service, and production runtime.
- B is a reference for UI composition and its observed TikTok connector flow. Reuse patterns selectively and maintain A's contracts.
- Keep one authoritative owner for each connection and event listener.
- Prefer small, testable changes; inspect current code before editing; preserve unrelated user changes.
- Avoid data fixtures in production displays. Label unavailable data honestly.
- Use one package manager per project and keep its lockfile consistent.

## Required completion discipline

After every implementation:

1. Run focused tests plus the relevant broader check.
2. Record exact commands and outputs in `docs/IMPLEMENTATION_WORKLOG.md`.
3. Update status and evidence in `docs/PROJECT_STATUS.md`.
4. Update the corresponding row/status and blocker in `docs/FINAL_IMPLEMENTATION_ROADMAP.md`.
5. Update parity and acceptance checklists when user-visible behavior changes.
6. Mark complete only when its stated acceptance criteria pass; otherwise keep `PARTIAL`, `BLOCKED`, or `NOT STARTED`.
7. Never include secrets in docs, logs, screenshots, or test output.

