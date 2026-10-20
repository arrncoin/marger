# UI/UX Migration Audit

Audit date: 2026-10-20

## Project B UI inventory

The inspected B app is a single React application rooted at `B/src/App.tsx`. Its state selects these tabs: dashboard, chat, gifts, logs, and overlay. It imports:

- `Header`
- `StatsOverview`
- `GiftAlertBanner`
- `SingerQueueBar`
- `LiveChatPanel`
- `RecentGiftsPanel`
- `EventLogPanel`
- `SingerSettingsModal`
- `ConnectModal`
- `ConnectionGuideModal`
- `ObsOverlayView`
- `StandaloneObsOverlay`

It includes a browser Speech Synthesis-based singer engine, configurable event templates/settings, TikTok adapter modes, localStorage-backed settings, event deduplication, event/stat aggregation, and overlay URL behavior. Styling is primarily `B/src/index.css`, with icons from `lucide-react` and motion utilities.

This inventory is based on source imports and the app entrypoint, not a manual visual audit of every component state.

## Project A UI inventory

A uses a vanilla HTML/CSS/JavaScript app shell (`A/app/index.html`, `app.css`, `app.js`) with sidebar navigation for:

- Dashboard / overview
- Chat
- OBS Studio & overlays
- Games / mini-games
- Points and leaderboard
- AI audio / TTS
- Settings

A also serves independent OBS overlays under `A/overlay`, including chat, dashboard, leaderboard, voting, story, question, subscriber, and game pages. A's interface includes quick settings/license modals and bot controls. It uses a custom `react-icons.js` web component bridge rather than B's React/Lucide component system.

## Adoption matrix

| B screen/component | A counterpart | Status | Work remaining |
|---|---|---|---|
| Header / dashboard shell | A sidebar, top navigation, overview | PARTIAL | Compare hierarchy, spacing, mobile navigation and state behavior. |
| StatsOverview | A overview / stats endpoints | PARTIAL | Align metric contract and verify data against live runtime. |
| LiveChatPanel | A chat section and live chat API | PARTIAL | Compare message display, platform badges, loading/empty/error states and filters. |
| RecentGiftsPanel / GiftAlertBanner | A gift popup and chat overlay | PARTIAL | Verify real gift payload mapping and visual/behavioral parity. |
| EventLogPanel | A logs/chat state | PARTIAL | Align event categories, limits, scroll behavior and errors. |
| SingerQueueBar / SingerSettingsModal | A audio/TTS section | PARTIAL | Verify queue controls, browser voice availability, setting persistence and fallback behavior. |
| ConnectModal / ConnectionGuideModal | A settings/connect controls | PARTIAL | Ensure guidance describes the actual connector and connection evidence. |
| ObsOverlayView / StandaloneObsOverlay | A OBS hub and overlay pages | PARTIAL | Compare controls and overlay displays; test browser source modes. |
| B overlay aspect selection 16:9, 9:16, 1:1 | A overlay URL builder and selectors | IMPLEMENTED, NOT VERIFIED visually | Test exact viewport dimensions and CSS at each aspect. |
| B design system, Lucide icons, React transitions | A custom CSS / icon bridge | NOT STARTED as a full system migration | Decide which shared patterns are compatible; migrate only through per-screen acceptance. |

## Current interaction/data limitations

- Code presence does not prove every visible control is wired correctly. Run browser automation and inventory controls by page before release.
- No browser automation or screenshot comparison was performed during this audit.
- A must remain the data/runtime authority; do not copy B localStorage demo/config state into A as a replacement for A APIs or SQLite.
- No dummy/sample data should be used to make unavailable live values appear real.
- Loading, empty, permission/auth, API error, disconnected, offline, and success states need explicit review.
- A's settings page removed the TikTok API key field, but the config API still has legacy key support; settings and server contract need a deliberate compatibility decision.
- A's TTS/UI work is reported by earlier session notes and source presence, but no real speech/browser voice flow was run here.

## Visual and responsive verification plan

1. Capture the same B and A page at 1440x900, 1280x720, 1024x768, and 390x844.
2. Capture normal, loading, empty, error, connected, and disconnected states where applicable.
3. Compare content order, typography, spacing, component size, borders, radii, shadows, colors, iconography, animation, and focus/keyboard behavior.
4. Test each navigation tab, modal open/close/backdrop, form validation/save, overlay copy/reload/aspect/platform selectors, start/stop, and TTS controls.
5. Verify network/API calls and rendered values against A runtime, not fixtures.
6. Record a screenshot and test artifact per page; list intentional deviations and their reasons.

## Acceptance rule

Do not label a page “adopted” solely because the same feature name or theme color exists. Mark it complete only after the visual comparison, interaction checklist, real A data integration, responsive check, and regression test for the page pass.

