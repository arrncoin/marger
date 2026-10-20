# Final Acceptance Checklist

Use this checklist to decide release readiness. A checkbox is complete only when evidence (test output, artifact, or reviewed result) is linked or recorded in the worklog. Unknown is not pass.

## Application and installation

- [ ] Clean dependency install succeeds from the documented lockfile.
- [ ] A lint/syntax/type-check commands cover the intended source rather than a small subset.
- [ ] A production build produces a real, versioned artifact; no echo-only build is accepted.
- [ ] Electron package can be installed on a clean supported Windows environment.
- [ ] App startup, health/status route, and orderly shutdown pass.
- [ ] Upgrade and rollback procedures are tested with existing user data preserved.

## UI, navigation and responsiveness

- [ ] Every A/B relevant page and modal is listed in `UI_UX_MIGRATION.md`.
- [ ] Dashboard, chat, gifts, logs, overlays, TTS, settings, games and leaderboard render expected states.
- [ ] Navigation, tabs, modal backdrop/close, forms, validation, save, copy, refresh, start/stop and TTS controls work.
- [ ] Loading, empty, success, disconnected, offline and error states are truthful and useful.
- [ ] No real runtime data is replaced by dummy or fixture data in production.
- [ ] Keyboard navigation, focus, labels and accessible button names are checked.
- [ ] Responsive behavior is checked at desktop, laptop, tablet and narrow mobile widths.
- [ ] OBS overlays render and are tested at 16:9, 9:16 and 1:1, including transparent background and Browser Source URLs.
- [ ] A/B screenshots are compared; any intentional differences are recorded.
- [ ] Browser console and network requests have no unexplained errors/failures.

## API and configuration

- [ ] All UI-used API routes and request/response/error contracts are documented and tested.
- [ ] No endpoint returns plaintext API keys, tokens, passwords, or other secrets.
- [ ] Access controls for private config and control endpoints are tested.
- [ ] Config validation rejects malformed values and reports errors without false success.
- [ ] Config writes are atomic, escaped, documented, and limited to intended writable paths.
- [ ] Legacy TikTok key migration/deprecation is explicit; existing user config is safely handled.
- [ ] Sample environment files contain placeholders only and match actual runtime requirements.

## TikTok / JuleTik

- [ ] Connector library/version and Node compatibility are reviewed and recorded.
- [ ] SDK tests cover initialization, success, offline room, timeout, connection error, disconnect, reconnect and shutdown.
- [ ] Tests cover chat, gift, like, follow, share, member and viewer/room state payloads.
- [ ] Duplicate event/listener behavior is tested.
- [ ] Connection status is only shown connected/live after a valid connector handshake.
- [ ] WAF/auth/offline/invalid response cases are reported accurately without bypass claims or hidden credentials.
- [ ] At least one authorized live TikTok session verifies actual room handshake, event delivery and shutdown.
- [ ] API-key configuration is not described as required unless the chosen connector actually requires it.

## YouTube and retained A functionality

- [ ] YouTube chat connect/disconnect, events and error recovery pass with approved test credentials.
- [ ] Bot start/stop and status transitions pass.
- [ ] Existing commands, points, games, leaderboard, AI and database-backed workflows pass regression tests.
- [ ] Overlay/event consumers continue to receive the expected A event contracts.
- [ ] No duplicate service, route or event listener is created by the merge.

## Database and operations

- [ ] Database schema/version is recorded and migrations are repeatable.
- [ ] Backup and restore are tested on a disposable copy.
- [ ] Existing data survives upgrade/restart and does not get overwritten by tests.
- [ ] Logs contain actionable errors but no secrets or unnecessary personal data.
- [ ] Recovery after process crash, stream end and network interruption is verified.
- [ ] Performance/resource checks cover expected event volume and long-running sessions.

## Dependencies, docs and release

- [ ] TikTool/TikTools source, manifests and lockfiles have no active references.
- [ ] Dependency tree and lockfile are consistent; upgrades are justified and tested.
- [ ] A and B build/type/test commands and their outputs are recorded.
- [ ] User setup and developer docs match the shipped app.
- [ ] Known limitations are visible; no unsupported official API or access claim is made.
- [ ] Release artifact, version/hash, installation test, backup and rollback procedure are recorded.
- [ ] All P0/P1 items in `TECHNICAL_DEBT.md` are resolved or formally risk-accepted.

## Release decision

- [ ] **GO** — every required item passes with evidence and no unaccepted P0/P1 risk.
- [ ] **NO-GO** — any required item is unknown/failed, or a P0/P1 risk lacks explicit acceptance.

