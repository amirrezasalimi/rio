# Rio Recorder

A local-first screen recorder and video editor for Chromium.

<video src="https://github.com/amirrezasalimi/rio/raw/main/assets/demo.mp4" controls autoplay loop muted width="100%"></video>

Record a tab, window, screen, or selected page area. Edit the result on a multi-track timeline, add gesture effects and text, then export to WebM, MP4, or GIF—all in the browser.

> Rio is an early pre-release. Chromium is the current supported target.

## Highlights

- **Four capture modes:** tab, window, screen, and selected page area
- **Optional audio:** microphone and supported source audio
- **Non-destructive timeline:** trim, split, move, duplicate, delete, gaps, and multi-select
- **Media layers:** drag and drop videos, images, and audio onto the canvas or timeline
- **Recorded gestures:** pointer movement, clicks, double-clicks, drags, and scrolling
- **Text clips:** installed fonts, weight, size, scale, rotation, fills, gradients, and strokes
- **Video speed:** `0.25×` to `4×`, synchronized with gestures and export
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

Rio keeps the toolbar popup short-lived. Recording runs in a persistent extension context, while completed recordings and editor state are stored locally in IndexedDB.

The editor uses Remotion for preview and browser rendering. FFmpeg WASM handles GIF conversion and original-quality trimmed clip extraction.

## Gesture recording and privacy

Rio records limited interaction metadata from the webpage where recording starts. It does **not** record typed text.

Captured interaction data can include pointer coordinates, scrolling, mouse buttons, modifier keys, and limited element descriptors such as tag, ID, role, name, or input type.

Important limits:

- Window and screen recordings cannot observe actions in other applications.
- Rio cannot capture interactions in browser UI, restricted pages, or unrelated tabs.
- Area recording works on ordinary webpages, not `chrome://` pages.
- Chrome's secure picker always controls which source is shared.
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
| `Shift + click` | Multi-select timeline items |
| `Escape` | Close transient UI or leave move mode |
| Trackpad pinch / `Ctrl + wheel` | Zoom timeline time |

## Tech stack

WXT · React · TypeScript · Tailwind CSS v4 · Zustand · Remotion · FFmpeg WASM · IndexedDB

## Status

Rio is actively developed. Camera capture, interrupted-recording recovery, undo/redo, and full cross-browser support are not finished.

See [`PLAN.md`](./PLAN.md) for the detailed roadmap and architecture decisions.

## License

No license has been added yet.
