# Recorder Extension Plan

This document is the implementation checklist for the recorder extension. We will complete and verify one phase at a time before moving to the next.

## Phase 1 — Foundation

- [x] Use Bun for dependency management and scripts
- [x] Install and configure Tailwind CSS v4
- [x] Install Zustand and add the initial recorder store
- [x] Install FFmpeg WASM packages and add a lazy loader
- [x] Define the base semantic color system
- [x] Install Lucide and use it for interface icons
- [x] Verify TypeScript compilation
- [x] Verify a production extension build

## Phase 2 — Product Definition and Extension Architecture

- [ ] Define the first release's recording modes and supported browsers
- [x] Define initial extension pages (popup setup, recorder host, floating controls, playback)
- [ ] Design permissions and Manifest V3 architecture
- [ ] Decide how recordings and user preferences are persisted
- [ ] Define privacy, retention, and recording-consent behavior

## Phase 3 — Recording Engine

- [x] Capture a browser tab through the secure source picker
- [x] Capture a selected screen, window, or tab
- [x] Select an area directly on the current page and record that fixed viewport region while the page remains interactive
- [x] Add optional microphone input
- [x] Add optional system/tab audio where supported
- [ ] Add optional camera overlay
- [x] Implement start, pause, resume, and stop controls
- [x] Handle on-demand permissions, cancellation, and basic capture errors
- [x] Keep recording controls available in a movable window outside the popup

## Phase 4 — Recording Experience

- [x] Build the recording setup panel in the toolbar popup
- [ ] Add a pre-recording countdown
- [x] Show elapsed time and active recording indicators
- [ ] Add microphone and camera toggles while recording
- [x] Add editor keyboard shortcuts for playback, seeking, confirm, and escape states
- [ ] Warn before closing or losing an active recording

## Phase 5 — Storage and Recovery

- [x] Save completed recordings into IndexedDB
- [ ] Stream recording chunks into durable local storage during capture
- [ ] Recover interrupted or crashed recordings
- [x] List, preview, open, and delete projects from a dedicated projects page
- [ ] Rename recordings
- [x] Open a playback tab after stopping
- [ ] Display storage usage and limits
- [ ] Add retention and cleanup controls

## Phase 6 — Editor

- [x] Build compact Remotion video playback and timeline controls
- [x] Trim the beginning and end non-destructively
- [x] Split, remove, and reorder timeline ranges
- [x] Add video-frame presets (default, glass, liquid glass, inset, outline, and border)
- [x] Add curved squircle, rounded, and sharp frame shapes with adjustable geometry
- [x] Add transparent, solid, gradient, radiant, Unsplash, and custom-photo backgrounds
- [x] Add 10 customizable gradient and 10 customizable radiant layouts
- [x] Add curated gradient palettes and four-point mesh gradients
- [x] Add background scale, position, blur, and noise controls
- [x] Add multiple previewable noise styles with adjustable opacity
- [x] Add a full visual mesh editor with movable points, layouts, palettes, blur, and noise
- [x] Add preview-first frame, shape, background, texture, and shadow controls
- [x] Make frame preset edges use adjustable stroke width, color, and opacity without adding a separate frame layer
- [x] Add optional adjustable shadow treatments, including None
- [x] Add ratio, social-media, and manual canvas size presets with reset controls
- [x] Add direct centered recorded-media scale/position controls with reset
- [x] Replace timeline trim sliders with direct draggable clip edges and playhead
- [x] Preserve timeline gaps and support freely positioned clips
- [x] Keep the timeline ruler stable, support a manual maximum duration with empty trailing space, add slider-based horizontal time zoom, and provide an optional persistent 0.5-second ruler mode for precise clip editing
- [x] Add a persistent project media library for uploaded images, videos, and audio with reusable timeline placements
- [x] Support moving, trimming, selecting, and removing uploaded media on a shared synchronized timeline
- [x] Add a pan-and-zoom canvas workspace with fit controls
- [x] Keep canvas wheel zoom isolated from browser page zoom and allow preview controls to be hidden
- [x] Add color-aware adaptive shadows with a movable light source
- [x] Increase custom slider hit targets while preserving the minimal blue track and line handle
- [x] Persist per-recording editor settings, clips, media placements, and timeline duration in IndexedDB with debounced and page-hide synchronization
- [x] Persist the vertically resizable timeline workspace height in localStorage
- [x] Make the first recording clip selected by default and bind sidebar visual/media controls to the selected clip
- [x] Show selection-specific sidebar controls, keep timeline clip heights compact, move the dismissible media library into the timeline header, and support holding an uploaded video's last frame through trailing timeline space
- [x] Give every uploaded media placement its own compact timeline row and allow video placements to extend beyond source duration by freezing their final frame
- [x] Separate project-wide background/canvas settings from item controls and clear timeline selection when the canvas viewport is clicked
- [x] Share frame, border, shape, and shadow settings across recording, uploaded video, and uploaded image items, and keep video end handles unobstructed when extending placements
- [x] Control uploaded audio volume and add optional per-clip fade-in and fade-out envelopes
- [ ] Control microphone and captured-audio volume
- [x] Persist pause-aware page interaction metadata for pointer movement, clicks, double-clicks, drags, and scrolling alongside each recording
- [x] Add movable and trimmable gesture-effect clips with per-action toggles and customizable cursor, click, drag, and scroll animations
- [x] Add manual zoom-effect clips with canvas/media targets, editable timeline points, focal-position dragging, wheel level control, and preview/export parity
- [ ] Add automatic zoom effects driven by recorded interactions
- [x] Add movable, rotatable, trimmable text clips with installed-font selection, typography, solid/gradient fills, and strokes
- [x] Add per-video clip playback speed controls with timeline, gesture, preview, and export synchronization
- [x] Add right-click duplicate/delete context menus and copy, paste, duplicate, and delete keyboard shortcuts for all timeline items
- [x] Hide empty recording, media, gesture, text, and zoom timeline lanes
- [x] Support Shift multi-selection and synchronized movement across timeline item types
- [x] Keep the original recording as a permanent Add item source while allowing all recording placements to be removed
- [x] Add a File menu for new projects, recent projects, full ZIP import/export, and complete current-project deletion
- [x] Add blank projects, original-quality recording clip downloads, and reusable gesture metadata sources from project videos
- [x] Drop image, video, and audio files directly onto the canvas or timeline to import and place them
- [ ] Add blur and spotlight annotations
- [ ] Add project-wide undo/redo and a compact history panel
  - [ ] Define a serializable editor-document snapshot containing all persisted `EditorSettings`, while excluding playback time, canvas viewport pan/zoom, open menus/modals, export progress, object URLs, recording blobs, and other runtime-only state
  - [ ] Add bounded in-memory history state to the Zustand editor store with labeled past/future entries, `canUndo`/`canRedo`, history reset on project initialization, and redo invalidation after a new edit
  - [ ] Add transaction APIs for begin, update, commit, cancel, and coalescing so pointer drags, wheel gestures, sliders, color inputs, and text typing create one meaningful history entry instead of one entry per event
  - [ ] Route every editor mutation through history-aware actions: timeline add/move/trim/split/reorder/delete/duplicate/paste; multi-selection movement; media, gesture, text, and zoom edits; zoom-point edits; canvas/background/mesh/frame/border/shadow settings; playback speed; and timeline duration
  - [ ] Restore or reconcile timeline selection after undo/redo without treating selection-only changes as document history
  - [ ] Add keyboard shortcuts: `Cmd/Ctrl+Z` for undo, `Cmd/Ctrl+Shift+Z` and `Ctrl+Y` for redo, while preserving native undo inside inputs, textareas, selects, and contenteditable controls
  - [ ] Add compact Undo and Redo buttons to the editor header with disabled states, accessible labels, shortcut tooltips, and the next action label
  - [ ] Add a small dismissible history popover/panel listing recent labeled actions, the current position, and clickable time travel to an earlier or later state
  - [ ] Keep autosave synchronized with restored document state, but do not persist the session history stack across editor reloads in the first version
  - [ ] Make imported-asset placement undoable without copying media blobs into snapshots; design library-asset deletion as reversible IndexedDB soft deletion/tombstoning, and keep whole-project deletion/import/navigation outside session undo with explicit confirmation
  - [ ] Add focused tests for stack semantics, redo invalidation, no-op suppression, bounded history, transaction grouping, selection reconciliation, and asset tombstone restoration
  - [ ] Verify representative UI flows for timeline drags, range sliders, canvas movement, mesh-point dragging, text typing, zoom focal movement/wheel changes, multi-item edits, and delete/restore behavior

## Phase 7 — Processing and Export

- [x] Package FFmpeg core assets in an extension-safe way
- [x] Configure extension CSP and worker loading for FFmpeg WASM
- [x] Show processing progress
- [ ] Add processing cancellation controls
- [x] Export styled WebM through Remotion's browser renderer
- [x] Export styled MP4 where WebCodecs support permits
- [x] Export styled animated GIF through FFmpeg WASM
- [x] Add aspect-ratio-aware output resolution presets from 480p through 4K and selectable export frame rates
- [x] Download exported files
- [ ] Add sharing destinations
- [ ] Handle large recordings without exhausting memory

## Phase 8 — Quality and Release

- [ ] Add unit tests for stores and media utilities
- [ ] Add integration tests for recording lifecycle behavior
- [ ] Test Chromium extension permissions and capture flows
- [ ] Test Firefox compatibility and document limitations
- [ ] Audit accessibility and keyboard navigation
- [ ] Audit privacy and security behavior
- [ ] Add production icons, metadata, onboarding, and documentation
- [ ] Package release builds

## Decisions Log

- 2026-07-26: Use Bun as the package manager.
- 2026-07-26: Use Tailwind CSS v4 for styling.
- 2026-07-26: Use Zustand for client-side application state.
- 2026-07-26: Use `@ffmpeg/ffmpeg` with lazy initialization; core asset hosting and extension CSP configuration are deferred to the export phase.
- 2026-07-26: Use light blue as the primary brand color, warm cream for surfaces, coral as the accent, and deep navy for text.
- 2026-07-26: Use direct `lucide-react` imports for interface icons instead of maintaining handwritten SVG paths.
- 2026-07-26: Keep all capture configuration in the toolbar popup and launch Chrome's secure Desktop Capture picker directly from it; after approval, use a compact movable extension window as the long-running recording owner.
- 2026-07-26: Use the browser's mandatory secure display picker for tab/window/screen permission. For Area mode, inject a temporary selector into the active page, capture that tab with `tabCapture`, and crop the selected viewport region through a canvas stream while leaving the page interactive.
- 2026-07-26: Implement in-page extension UI as React rendered through WXT's isolated Shadow Root UI lifecycle; keep the background worker free of DOM and presentation code.
- 2026-07-26: Register the dormant Area selector as a manifest content script instead of manually injecting WXT's generated bundle. This avoids fragile generated-file resolution; the selector mounts its React UI only after an Area request.
- 2026-07-26: Keep the media stream in an inactive extension host tab, not the short-lived toolbar popup or captured webpage. Render the only visible recorder controls as a draggable, collapsible React panel attached to the originating webpage, with session-scoped runtime messaging.
- 2026-07-26: Crop Area recordings with Chromium's insertable media streams (`MediaStreamTrackProcessor`, `VideoFrame`, and `MediaStreamTrackGenerator`) so frame production is driven by the captured stream and continues while the recorder host tab is inactive.
- 2026-07-26: Model editor changes as a non-destructive ordered clip list referencing the original recording; use the same list for Remotion preview and export.
- 2026-07-26: Use Remotion Player for the editor preview and `@remotion/web-renderer` for styled WebM/MP4 browser exports. Use locally packaged FFmpeg WASM only for GIF conversion, with extension CSP allowing `wasm-unsafe-eval`.
- 2026-07-26: Use nested/clipped `@squircle-js/react` surfaces for continuously curved video frames because the package intentionally does not draw borders itself.
- 2026-07-26: Represent backgrounds, canvas ratio, and recorded-media placement as typed non-destructive editor settings so preview and browser-rendered exports use identical transforms.
- 2026-07-26: Configure the Unsplash public Access Key through an ignored `WXT_PUBLIC_UNSPLASH_ACCESS_KEY` build variable, hotlink returned image URLs, display photographer attribution, and trigger the required Unsplash download event when a photo is selected. Never put the Unsplash Secret Key in the extension or any `WXT_PUBLIC_*` variable; public build variables are embedded in inspectable client code.
- 2026-07-26: Keep the Unsplash explorer as a sidebar-anchored popover rather than a modal so the canvas remains visible while browsing.
- 2026-07-26: Treat recorded-media dragging as a delta from its current center to avoid pointer-down jumps; Escape cancels move mode and Enter confirms it.
- 2026-07-26: Give every editor clip an explicit timeline start so trimming and moving clips can preserve intentional gaps; render those gaps transparently over the selected background.
- 2026-07-26: Persist editor projects separately from recording blobs in IndexedDB, keyed by recording ID, and autosave non-destructive settings after changes.
- 2026-07-26: Size recorded media from its actual encoded dimensions instead of assuming 16:9, and physically crop selected-area frames through OffscreenCanvas before encoding.
- 2026-07-26: Model mesh backgrounds as an editable list of positioned color points and persist noise type plus light position so preview and export remain identical.
- 2026-07-26: Make adaptive shadows derive their tint from the active background and their direction from a direct-manipulation light control.
- 2026-07-26: Treat canvas and background controls as project-wide, show frame/border/shadow controls only for recording clips, and expose transform, opacity, volume, and hold-last-frame settings only where the selected uploaded media type supports them.
- 2026-07-26: Keep the Area selector declaratively registered, but reinject its generated content-script bundle with the Scripting API when an already-open tab has no receiver after an extension install or reload.
- 2026-07-26: Capture privacy-limited DOM interaction metadata in the originating webpage content script, timestamp it against the recorder host's pause-aware media clock, and persist it with the recording blob. Browser security limits window/monitor recordings to interactions observable in that originating webpage; Rio does not capture typed text or interactions in other applications and restricted browser UI.
- 2026-07-26: Model recorded gestures as independently movable and trimmable editor effect clips. Keep source interaction data immutable, map it through recording trims/splits/timeline positions, and use one Remotion gesture renderer for preview and export. Treat each gesture clip's visible timeline range as an absolute mask over that edited interaction timeline, so gaps suppress effects and later gesture clips continue in sync instead of replaying events from an earlier source offset.
- 2026-07-26: Keep the editor preview at 30 FPS while allowing export-only resolution and frame-rate presets. Derive Remotion timeline timing from the active composition FPS and scale the project canvas proportionally at render time so export quality does not alter the editable canvas.
- 2026-07-26: Serialize and version editor-project writes so delayed autosaves, page-hide flushes, and concurrent editor tabs cannot overwrite newer timeline state. Allow an intentionally empty recording track while keeping the immutable original recording available as a permanent source asset.
- 2026-07-26: Centralize timeline item creation in one Add item menu and map trackpad pinch gestures to horizontal timeline time zoom while preserving ordinary scrolling.
- 2026-07-26: Use a versioned ZIP archive for complete project portability, containing the immutable source recording, interaction metadata, editor settings, and uploaded asset blobs. Imported projects receive fresh recording and asset IDs to avoid overwriting local work.
- 2026-07-26: Embed Rio gesture data in a versioned binary-safe video footer when downloading recording clips. Project video assets with that footer become selectable gesture-data sources, retaining source duration, action count, timestamps, and crop metadata.
- 2026-07-27: Download untrimmed original clips directly from the editor's user action. For trimmed clips, use a visible extension processor page, mount recording blobs into FFmpeg WASM through `WORKERFS`, stream-copy the selected range, and require an explicit Download clip click; this avoids duplicate editor memory and Chromium's hidden-renderer Blob download rejection.
- 2026-07-29: Model manual zoom as independently movable and trimmable effect clips containing ordered focal keyframes. Each point stores local time, canvas-relative focus, and a clamped 1×–5× level; the clip chooses whole-canvas or visual-item targeting plus a shared easing mode so Remotion preview and export resolve identical transforms.
- 2026-07-29: Treat each zoom point as a trigger rather than a distant interpolation endpoint. Zoom remains neutral before the first point, each point starts a short configurable transition, and the resolved zoom then holds until the next point; this prevents transitions from stretching across timeline gaps.
