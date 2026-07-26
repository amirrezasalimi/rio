import { FFFSType } from '@ffmpeg/ffmpeg';
import { getRecording } from '../shared/recording/storage';
import { getFfmpeg, loadFfmpeg } from '../shared/utils/ffmpeg';
import { embedGestureMetadata } from '../playback/editor/gestureMetadata';

const CORE_URL = new URL('/ffmpeg/ffmpeg-core.js', window.location.href).href;
const WASM_URL = new URL('/ffmpeg/ffmpeg-core.wasm', window.location.href).href;

document.body.style.cssText = 'margin:0;font-family:system-ui;background:#fffaf0;color:#18324a';
const status = document.createElement('main');
status.style.cssText = 'min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;text-align:center';
status.innerHTML = '<div><h1 style="font-size:18px;margin:0 0 8px">Preparing original-quality clip…</h1><p style="font-size:13px;color:#65788a;margin:0">Keep this tab open while Rio extracts the selected range.</p></div>';
document.body.append(status);

function showDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  status.innerHTML = '';
  const panel = document.createElement('div');
  const heading = document.createElement('h1');
  heading.textContent = 'Your clip is ready';
  heading.style.cssText = 'font-size:20px;margin:0 0 8px';
  const detail = document.createElement('p');
  detail.textContent = 'The original encoded quality and Rio gesture metadata are preserved.';
  detail.style.cssText = 'font-size:13px;color:#65788a;margin:0 0 20px';
  const button = document.createElement('a');
  button.href = url;
  button.download = filename;
  button.textContent = 'Download clip';
  button.style.cssText = 'display:inline-block;border-radius:12px;background:#328fdf;color:white;padding:11px 18px;font-size:13px;font-weight:700;text-decoration:none';
  button.addEventListener('click', () => window.setTimeout(() => { URL.revokeObjectURL(url); window.close(); }, 5_000), { once: true });
  panel.append(heading, detail, button);
  status.append(panel);
}

async function prepareClip() {
  const query = new URLSearchParams(window.location.search);
  const recordingId = query.get('recordingId');
  const sourceStartMs = Number(query.get('startMs'));
  const sourceEndMs = Number(query.get('endMs'));
  if (!recordingId || !Number.isFinite(sourceStartMs) || !Number.isFinite(sourceEndMs) || sourceEndMs <= sourceStartMs) throw new Error('The requested clip range is invalid.');
  const recording = await getRecording(recordingId);
  if (!recording) throw new Error('The original recording could not be found.');
  const extension = recording.mimeType.includes('mp4') ? 'mp4' : 'webm';
  const interactions = (recording.interactions ?? []).filter((event) => event.timestampMs >= sourceStartMs && event.timestampMs <= sourceEndMs).map((event) => ({ ...event, timestampMs: event.timestampMs - sourceStartMs }));
  const mountPoint = '/rio-source';
  const input = `${mountPoint}/recording.${extension}`;
  const output = `rio-clip.${extension}`;
  const ffmpeg = await loadFfmpeg({ coreURL: CORE_URL, wasmURL: WASM_URL });
  let clip: Blob;
  try {
    await ffmpeg.createDir(mountPoint).catch(() => false);
    await ffmpeg.mount(FFFSType.WORKERFS, { blobs: [{ name: `recording.${extension}`, data: recording.blob }] }, mountPoint);
    const exitCode = await ffmpeg.exec(['-ss', String(sourceStartMs / 1_000), '-to', String(sourceEndMs / 1_000), '-i', input, '-map', '0', '-c', 'copy', output]);
    if (exitCode !== 0) throw new Error('Could not extract this clip without re-encoding.');
    const data = await ffmpeg.readFile(output);
    if (typeof data === 'string') throw new Error('FFmpeg returned unexpected clip data.');
    clip = new Blob([data.slice()], { type: recording.mimeType });
  } finally {
    await ffmpeg.unmount(mountPoint).catch(() => false);
    await ffmpeg.deleteFile(output).catch(() => false);
    getFfmpeg().terminate();
  }
  const video = embedGestureMetadata(clip, { version: 1, durationMs: sourceEndMs - sourceStartMs, interactions, crop: recording.crop });
  showDownload(video, `rio-clip-${(sourceStartMs / 1_000).toFixed(1)}-${(sourceEndMs / 1_000).toFixed(1)}.${extension}`);
}

void prepareClip().catch((error: unknown) => {
  status.innerHTML = `<div><h1 style="font-size:18px;margin:0 0 8px;color:#b42318">Could not prepare this clip</h1><p style="font-size:13px;color:#65788a;margin:0">${error instanceof Error ? error.message : 'Unknown processing error.'}</p></div>`;
});
