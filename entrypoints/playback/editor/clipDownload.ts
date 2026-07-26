import { fetchFile } from '@ffmpeg/util';
import type { RecordedInteraction } from '../../shared/recording/types';
import { getFfmpeg, loadFfmpeg } from '../../shared/utils/ffmpeg';
import type { EditorClip } from './types';
import { embedGestureMetadata } from './gestureMetadata';

const CORE_URL = new URL('/ffmpeg/ffmpeg-core.js', window.location.href).href;
const WASM_URL = new URL('/ffmpeg/ffmpeg-core.wasm', window.location.href).href;

export async function downloadRecordingClip(source: Blob, clip: EditorClip, interactions: RecordedInteraction[], crop: Parameters<typeof embedGestureMetadata>[1]['crop']): Promise<void> {
  const extension = source.type.includes('mp4') ? 'mp4' : 'webm';
  const input = `rio-clip-source.${extension}`;
  const output = `rio-clip.${extension}`;
  const ffmpeg = await loadFfmpeg({ coreURL: CORE_URL, wasmURL: WASM_URL });
  try {
    await ffmpeg.writeFile(input, await fetchFile(source));
    const exitCode = await ffmpeg.exec(['-ss', String(clip.sourceStartMs / 1_000), '-to', String(clip.sourceEndMs / 1_000), '-i', input, '-map', '0', '-c', 'copy', output]);
    if (exitCode !== 0) throw new Error('Could not extract this clip without re-encoding.');
    const data = await ffmpeg.readFile(output);
    if (typeof data === 'string') throw new Error('FFmpeg returned unexpected clip data.');
    const bytes = new Uint8Array(data.byteLength);
    bytes.set(data);
    const clipInteractions = interactions
      .filter((event) => event.timestampMs >= clip.sourceStartMs && event.timestampMs <= clip.sourceEndMs)
      .map((event) => ({ ...event, timestampMs: event.timestampMs - clip.sourceStartMs }));
    const video = embedGestureMetadata(new Blob([bytes], { type: source.type }), {
      version: 1,
      durationMs: clip.sourceEndMs - clip.sourceStartMs,
      interactions: clipInteractions,
      crop,
    });
    const url = URL.createObjectURL(video);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `rio-clip-${(clip.sourceStartMs / 1_000).toFixed(1)}-${(clip.sourceEndMs / 1_000).toFixed(1)}.${extension}`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  } finally {
    await Promise.all([input, output].map((path) => getFfmpeg().deleteFile(path).catch(() => false)));
  }
}
