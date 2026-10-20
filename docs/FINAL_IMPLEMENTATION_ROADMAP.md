# Final Implementation Roadmap

No time estimates are included; scope and dependencies must be refined after each acceptance gate.

Statuses are current audit states, not promises. Mark `DONE` only after the acceptance criteria and test evidence are recorded in `PROJECT_STATUS.md` and `IMPLEMENTATION_WORKLOG.md`.

## Phase 1 — Stability and baseline

| ID | Task | Priority | Dependencies | Files/modules | Acceptance criteria | Verification | Status / risk |
|---|---|---|---|---|---|---|---|
| BASE-001 | Establish a source-control baseline for A and B without overwriting existing work. | P1 | Owner approval / repository policy | Both project roots | Clean tracked baseline or documented existing origin; no user changes lost. | Git status/diff review, backup and branch/tag policy | BLOCKED: directories are not Git worktrees; do not initialize or commit without authorization. |
| BASE-002 | Define real A lint, test, syntax and build checks. | P1 | BASE-001 | `A/package.json`, test scripts | Commands validate intended source and fail on injected syntax/type/test errors; build produces/verifies actual release output. | Run each command in CI and locally | NOT STARTED: current A lint is narrow and build is placeholder. |
| BASE-003 | Secure config read/write and API exposure. | P1 | BASE-001 | `A/src/config/index.js`, config routes/controller, UI | API never returns raw secrets; writes are escaped, atomic, and only to documented writable path; failures surface clearly. | Auth tests, serialization tests, permission/Windows path tests | NOT STARTED: key response and multi-path persistence risk identified. |
| BASE-004 | Define SQLite/state backup, restore and migration baseline. | P1 | BASE-001 | `A/data`, `A/state`, DB startup/migrations | Backup can be restored to a disposable copy; schema upgrades are repeatable and non-destructive. | Backup/restore and migration tests on copied data | NOT STARTED: no backup/migration validation performed. |

## Phase 2 — UI/UX completion

| ID | Task | Priority | Dependencies | Files/modules | Acceptance criteria | Verification | Status / risk |
|---|---|---|---|---|---|---|---|
| UI-001 | Complete page/component inventory and B-to-A mapping. | P1 | None | `B/src/App.tsx`, components, `A/app`, `A/overlay` | Every B page, modal, component, state and interaction is listed with A counterpart or explicit non-adoption reason. | Review `FEATURE_PARITY_MATRIX.md`; browser inventory | PARTIAL: primary component inventory captured; no exhaustive state-by-state run. |
| UI-002 | Compare and implement agreed B visual patterns page by page while preserving A runtime. | P1 | UI-001 | A app/overlay HTML/CSS/JS | Each relevant page meets agreed screenshot and interaction criteria; A's backend remains authoritative. | Browser screenshots at agreed viewports; keyboard/focus checks | NOT STARTED as full parity; current work is selective. |
| UI-003 | Verify all visible controls and forms. | P1 | UI-001, BASE-002 | A app controller/API | No important decorative controls; actions show pending/success/error; data is real or explicitly unavailable. | Playwright/browser tests with network/API assertions | NOT STARTED. |
| UI-004 | Validate responsive/OBS aspect variants. | P1 | UI-002 | `A/app/app.js`, `A/overlay/chat.css`, other overlay CSS | 16:9, 9:16 and 1:1 render without clipping; platform selectors and copied URLs match preview. | Browser viewport matrix + OBS Browser Source smoke test | PARTIAL; URL/code exists, visual proof absent. |
| UI-005 | Verify TTS user experience using A services and browser voice behavior. | P2 | UI-003 | A audio section and integration | Voice settings persist; unavailable voices are handled; queue/test controls have observable outcome and fallback. | Browser test on supported Windows/browser and backend tests | IMPLEMENTED, NOT VERIFIED. |

## Phase 3 — Backend and JuleTik

| ID | Task | Priority | Dependencies | Files/modules | Acceptance criteria | Verification | Status / risk |
|---|---|---|---|---|---|---|---|
| SDK-001 | Define one owner for TikTok connection lifecycle and status. | P1 | BASE-002 | `juleTikSdk.js`, `tiktokService.js`, `tiktokViewer.js` | One connection instance; truthful connecting/connected/live/offline/error states; clean shutdown. | State-machine unit tests and mocked integration tests | PARTIAL: wrapper/service exist; duplicated viewer path and state ownership need review. |
| SDK-002 | Implement or remove unsupported reconnect/timeout claims. | P1 | SDK-001 | JuleTik and service | Bounded retries with cancellation/backoff and timeouts, or explicit no-auto-retry contract. | Fake connector tests including stop/reconnect races | NOT STARTED; wrapper options are currently not a reconnect implementation. |
| SDK-003 | Test event contract for chat, gift, like, follow, share, member and room status. | P1 | SDK-001 | SDK/service/overlay API | Each supported event maps once to documented A schema; duplicate/listener cleanup is verified. | Mocked connector integration tests | PARTIAL: chat/gift helper tests only. |
| SDK-004 | Validate real TikTok connection and report unsupported cases honestly. | P1 | SDK-002, SDK-003 | TikTok service, status API/UI | Authorized live test records actual connector version, room handshake, events and shutdown; no unsupported WAF/auth claims. | Controlled live test with operator-provided stream | BLOCKED until a live account/room and approved test window are available. |
| SDK-005 | Decide and execute legacy TikTok API-key deprecation. | P1 | SDK-001, BASE-003 | Config, controller, viewer, service, README/env example | No visible UI requirement; compatibility/migration is documented; no secret leaks or misleading API-key failure messages. | Config migration tests, source/lock search | PARTIAL: field removed but legacy key code remains. |
| API-001 | Document and test A API contracts used by UI. | P1 | BASE-002 | `A/src/api/routes`, controllers, `A/app/app.js` | Request/response schemas and error states match; tests cover main bot/config/livechat/stats/overlay flows. | API contract tests | NOT STARTED. |

## Phase 4 — Feature and data integration

| ID | Task | Priority | Dependencies | Files/modules | Acceptance criteria | Verification | Status / risk |
|---|---|---|---|---|---|---|---|
| INT-001 | Preserve and regression-test A YouTube live chat and platform services. | P1 | BASE-002, API-001 | `A/src/integrations/youtube`, bot/event handlers | Existing YouTube workflows work with current configuration and no data regression. | Mocked tests, then authorized live test | NOT VERIFIED in this audit. |
| INT-002 | Verify all existing A bot, point, command, game and leaderboard flows. | P1 | BASE-002, DB-001 | `A/commands`, `A/games`, `A/features`, overlays | Representative existing workflows persist and render correctly; no B merge breaks them. | Regression suite against disposable database | NOT STARTED for comprehensive coverage. |
| INT-003 | Integrate only B features that map to A runtime contracts. | P2 | UI-001, API-001, SDK-003 | A UI/API/services | Each adopted component is connected to A data/services or marked unavailable; no dummy data masquerades as runtime. | UI/API integration tests | PARTIAL by design; full adoption not approved/evidenced. |

## Phase 5 — QA and hardening

| ID | Task | Priority | Dependencies | Files/modules | Acceptance criteria | Verification | Status / risk |
|---|---|---|---|---|---|---|---|
| QA-001 | Add unit/integration/regression coverage and execute clean suite. | P1 | BASE-002, API-001, SDK-003, INT-002 | A test tree | All declared tests pass on a clean install; expected failures are documented and blocking. | CI and local test run | PARTIAL: one 3-test SDK suite exists and passes. |
| QA-002 | Run browser and visual checks for every primary page. | P1 | UI-002, UI-003 | A app and overlays | No console errors, failed requests, clipped layouts or unverified key controls; screenshots saved as test artifacts. | Browser automation; viewport matrix | NOT STARTED. |
| QA-003 | Run dependency review and lockfile consistency checks. | P2 | BASE-001 | A/B package manifests and lockfiles | No accidental package manager mixing; upgrades are justified and tested; unused dependencies are removed only with proof. | `npm ls`, lockfile checks, targeted tests | NOT STARTED. |
| QA-004 | Validate Electron packaging/install/start/shutdown. | P1 | BASE-002, DB-001 | Electron config and Windows scripts | Fresh install starts, persists to intended user data path, shuts down cleanly, and keeps data on upgrade. | Disposable Windows package/install test | NOT STARTED. |
| QA-005 | Run authorized platform recovery and event stress tests. | P1 | SDK-004, INT-001 | Platform services | Offline stream, interruption, restart and duplicate/repeated events produce truthful status and no unbounded memory/listener growth. | Controlled live test plus telemetry | BLOCKED pending live test access. |

## Phase 6 — Final release

| ID | Task | Priority | Dependencies | Files/modules | Acceptance criteria | Verification | Status / risk |
|---|---|---|---|---|---|---|---|
| REL-001 | Resolve release blockers and complete acceptance checklist. | P1 | All prior phases | Whole project | Every required item in `FINAL_ACCEPTANCE_CHECKLIST.md` is pass or formally accepted with an owner/risk. | Signed checklist and CI artifacts | NOT STARTED. |
| REL-002 | Update user/developer docs, sample config, known limitations and support procedure. | P2 | SDK-004, QA-004 | Root/A docs | Instructions match observed release; no secrets are present; rollback/recovery steps are actionable. | Documentation review against release build | PARTIAL; current audit docs created, release docs remain. |
| REL-003 | Produce versioned release artifact and rollback package. | P1 | REL-001, REL-002 | Electron/build output | Artifact hash/version, install path, backup and rollback are recorded. | Fresh-machine install smoke test | NOT STARTED. |

## Suggested execution order

1. BASE-001 (source-control baseline, only with owner approval), BASE-003 (secret handling), and BASE-004 (data safety).
2. BASE-002 and API-001 to make subsequent checks meaningful.
3. SDK-001 through SDK-003 and INT-001/INT-002 to stabilize existing runtime functionality.
4. UI-001 through UI-005, validating each user-visible flow against A data.
5. SDK-004 and QA-005 when an authorized real live stream is available.
6. QA-001 through QA-004, then REL-001 through REL-003.

