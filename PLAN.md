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
- [ ] List, rename, preview, and delete recordings
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
- [x] Add preset and manual canvas sizes with reset controls
- [x] Add direct centered recorded-media scale/position controls with reset
- [x] Replace timeline trim sliders with direct draggable clip edges and playhead
- [x] Preserve timeline gaps and support freely positioned clips
- [x] Keep the timeline ruler stable, support a manual maximum duration with empty trailing space, and add slider-based horizontal time zoom for precise clip editing
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
- [ ] Add simple text, blur, and spotlight annotations
- [ ] Add undo and redo

## Phase 7 — Processing and Export

- [x] Package FFmpeg core assets in an extension-safe way
- [x] Configure extension CSP and worker loading for FFmpeg WASM
- [x] Show processing progress
- [ ] Add processing cancellation controls
- [x] Export styled WebM through Remotion's browser renderer
- [x] Export styled MP4 where WebCodecs support permits
- [x] Export styled animated GIF through FFmpeg WASM
- [ ] Add output resolution and quality presets
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
