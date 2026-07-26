# Rio Recorder — Project Instructions

## Required Workflow

1. Before changing code in a new task, inspect the project tree to understand the current structure.
2. Read the relevant files before editing them.
3. Keep changes focused on the requested task and consistent with existing patterns.
4. After implementation, run the most relevant validation commands. At minimum, use `bun run compile`; run `bun run build` when entrypoints, dependencies, configuration, or production behavior change.
5. Update `PLAN.md` when a planned milestone is completed or an architectural decision changes.

## Package Manager

- Use Bun for installing packages and running scripts.
- Do not introduce npm, pnpm, or Yarn lockfiles.

## Required Technology

- Use Tailwind CSS v4 for styling.
- Use the semantic design tokens defined in `entrypoints/shared/styles/globals.css`; avoid arbitrary colors when an existing token fits.
- Use Zustand for shared client-side application state.
- Use FFmpeg WASM for video processing, conversion, and export operations.
- Use `lucide-react` for interface icons. Import icons directly from the package; do not handwrite SVG icons unless Lucide has no suitable equivalent.

## React and TypeScript

- Keep `.tsx` component files at or below 500 lines.
- Split large interfaces into focused components before they exceed the limit.
- Move substantial reusable behavior into custom hooks.
- Keep hook files at or below 500 lines.
- Keep types explicit around browser APIs, media streams, messages, and persisted data.
- Preserve accessibility labels for icon-only controls.

## Browser Extension Architecture

- Treat the browser-action popup as short-lived; it must not own long-running media streams or recording state.
- Request screen, window, tab, microphone, and audio access only after a direct user action and only when enabled.
- Chrome's secure source picker is authoritative; do not imply that the extension can bypass user source approval.
- Keep long-running recording work in a persistent extension context.
- Keep communication between extension contexts typed and centralized in shared modules.
- Store completed recording data in extension-owned storage rather than page-local state.

## UI and Styling

- Follow the existing light-blue, cream, coral, and deep-navy design system.
- Use semantic utilities such as `primary`, `accent`, `canvas`, `surface`, `ink`, `muted`, and `border`.
- Keep recording controls compact, clear, and keyboard accessible.
- Prefer smooth state transitions and explicit loading, permission, error, recording, paused, and saving states.

## Code Quality

- Fix root causes rather than adding UI-only workarounds.
- Avoid duplicate components, stale entrypoints, and unused styles.
- Do not add comments that merely restate the code.
- Keep recording, persistence, processing, and presentation concerns separated.
