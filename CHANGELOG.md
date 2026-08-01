# Changelog

All notable changes to Rio Recorder are documented in this file.

## [0.1.4] - 2026-08-01

### Media editing

- Added horizontal and vertical flip controls for recording clips and imported media.
- Kept recorded gesture overlays aligned with flipped video content during preview and export.
- Increased the media corner-radius range and switched cropped media to a rectangular shape when border controls are edited.

### Editor and recording controls

- Improved editor behavior in shorter windows by removing the fixed minimum height and containing sidebar scrolling.
- Reset the settings sidebar to the top when the selected timeline item changes.
- Kept the webcam preview centered above draggable recording controls.

## [0.1.3] - 2026-08-01

### Webcam recording

- Added an optional Webcam toggle to recording setup and persisted popup recording preferences locally between sessions.
- Added camera permission handling that reuses an existing grant when available and presents an explicit enable flow only when permission is still needed.
- Record webcam video alongside tab, window, screen, and region captures as a separate editor-owned media asset.
- Add recorded webcam media to new projects as an independent timeline clip, allowing it to be moved, resized, trimmed, duplicated, and edited like other media.
- Added a real-time circular webcam avatar centered 8 px above the recording controls.
- Relay the recorder-owned camera stream to the in-page preview over WebRTC, avoiding competing camera streams and false “Camera unavailable” states.
- Default webcam clips to a circular 1:1 lower-right placement with spacing, outline, shadow, muted audio, and cover fitting.
- Keep webcam recording pause, resume, stop, persistence, and cleanup synchronized with the primary recording lifecycle.
- Preserve the authoritative session duration for recorded webcam assets when Chromium reports invalid WebM duration metadata.
- Migrate projects affected by the previous five-second webcam duration fallback without changing intentionally trimmed clips.

### Media editing

- Added media aspect-ratio controls for Original, 1:1, 16:9, 4:3, and 9:16 layouts.
- Added rectangular and circular crop-shape controls.
- Added Cover, Contain, and Fill content-fit modes and wired them to Remotion’s media `objectFit` property.
- Added content zoom controls from 50% to 300% independently of clip size and position.
- Improved canvas media transforms so circular clips and non-source ratios remain fully selectable and editable.

### Audio editing

- Added decoded audio waveforms to recording and media timeline clips.
- Added support for detaching a recording clip’s audio into an independently editable timeline item.
- Preserve recording audio availability metadata so the editor only offers audio actions when the source contains audio.

### Text editing

- Added text opacity controls.
- Added configurable text backgrounds with fill styling.

### Extension architecture and reliability

- Pass webcam state through typed capture and recording-control messages.
- Added a web-accessible webcam preview entrypoint for embedded extension controls.
- Keep long-running screen and webcam capture in the recorder extension context rather than the short-lived popup.
- Improved webcam asset finalization so saving waits for webcam recorder output without allowing the controls to remain stuck indefinitely.

[0.1.4]: https://github.com/amirrezasalimi/rio/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/amirrezasalimi/rio/compare/v0.1.2...v0.1.3
