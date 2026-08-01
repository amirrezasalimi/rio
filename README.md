# Rio Recorder

A local-first screen recorder and video editor for Chromium.

[![Rio Demo](assets/demo.gif)](https://github.com/amirrezasalimi/rio/raw/main/assets/demo.mp4)

Record a tab, window, screen, or selected page area with optional microphone, source audio, and webcam video. Edit the result on a multi-track timeline, add gesture effects and text, then export to WebM, MP4, or GIF—all in the browser.

> Rio is an early pre-release. Chromium is the current supported target.

## Highlights

- **Four capture modes:** tab, window, screen, and selected page area
- **Optional webcam and audio:** record camera video, microphone audio, and supported source audio alongside the primary capture
- **Independent webcam layer:** move, resize, trim, crop, duplicate, and style webcam footage separately in the editor
- **Non-destructive timeline:** trim, split, move, duplicate, delete, add gaps, multi-select, and undo or redo edits
- **Media layers:** drag and drop videos, images, and audio onto the canvas or timeline
- **Media transforms:** aspect ratios, rectangular or circular crops, cover/contain/fill modes, content zoom, positioning, and horizontal or vertical flipping
- **Audio editing:** decoded timeline waveforms and detachable recording audio
- **Recorded gestures:** pointer movement, clicks, double-clicks, drags, and scrolling, synchronized with clip speed and flipping
- **Text clips:** installed fonts, weight, size, scale, rotation, opacity, backgrounds, fills, gradients, and strokes
- **Video speed:** `0.25×` to `4×`, synchronized with gestures and export
- **Scene control:** project-wide playback speed adjustment
- **Zoom effects:** manual canvas scaling and panning with timeline editing
- **Visual styling:** frames, borders, shadows, gradients, mesh backgrounds, and custom images
- **Social presets:** common canvas sizes for Instagram, YouTube, TikTok, Facebook, X, and LinkedIn
- **Export:** WebM, MP4, and GIF from `480p` to `4K`, with selectable FPS
- **Portable projects:** full ZIP import and export
- **Local storage:** recordings and project data stay in the extension's IndexedDB

## Install

Download the latest Chrome ZIP from [GitHub Releases](https://github.com/amirrezasalimi/rio/releases).

1. Extract the ZIP.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the extracted directory.

## Build from source

Requires [Bun](https://bun.sh/) and a current Chromium-based browser.

```sh
bun install
bun run build
```

Load `.output/chrome-mv3` from `chrome://extensions`.

For development:

```sh
bun run dev
```

## How Rio works

Rio keeps the toolbar popup short-lived. Screen and webcam recording run in a persistent extension context, while completed recordings, webcam assets, and editor state are stored locally in IndexedDB.

The editor uses Remotion for preview and browser rendering. FFmpeg WASM handles GIF conversion and original-quality trimmed clip extraction.

## Gesture recording and privacy

Rio records limited interaction metadata from the webpage where recording starts. It does **not** record typed text.

Captured interaction data can include pointer coordinates, scrolling, mouse buttons, modifier keys, and limited element descriptors such as tag, ID, role, name, or input type.

Important limits:

- Window and screen recordings cannot observe actions in other applications.
- Rio cannot capture interactions in browser UI, restricted pages, or unrelated tabs.
- Area recording works on ordinary webpages, not `chrome://` pages.
- Chrome's secure picker always controls which source is shared.
- Webcam and microphone access are requested only when enabled and require browser permission.
- Unsplash is the only optional external service; all project storage remains local.

## Optional Unsplash setup

Create `.env.local` with a public Unsplash Access Key:

```dotenv
WXT_PUBLIC_UNSPLASH_ACCESS_KEY=your_public_access_key
```

Never expose an Unsplash Secret Key in a `WXT_PUBLIC_*` variable.

## Main shortcuts

| Shortcut | Action |
| --- | --- |
| `Space` | Play or pause |
| `←` / `→` | Seek one second |
| `Delete` / `Backspace` | Delete selection |
| `Ctrl/Cmd + C` | Copy |
| `Ctrl/Cmd + V` | Paste |
| `Ctrl/Cmd + D` | Duplicate |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Y` or `Ctrl/Cmd + Shift + Z` | Redo |
| `Shift + click` | Multi-select timeline items |
| `Escape` | Close transient UI or leave move mode |
| Trackpad pinch / `Ctrl + wheel` | Zoom timeline time |

## Tech stack

WXT · React · TypeScript · Tailwind CSS v4 · Zustand · Remotion · FFmpeg WASM · IndexedDB

## Known bugs

- **Export GIF:** Exporting to GIF may fail or experience issues due to memory constraints or FFmpeg WASM limitations in the browser.

## Status

Rio is actively developed. Interrupted-recording recovery and full cross-browser support are not finished; Chromium remains the supported target.

## License

Rio Recorder is source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE.md).

You may use, study, modify, and distribute the software only for permitted noncommercial purposes. You may not use Rio Recorder or a modified version to provide a commercial product or service, earn revenue, receive monetary compensation, or gain commercial advantage without a separate commercial license from the copyright holder.

This is not an open-source license under the Open Source Definition. Contact the project owner for commercial licensing.
