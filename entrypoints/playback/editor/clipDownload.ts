import type { CropArea, RecordedInteraction } from '../../shared/recording/types';
import { embedGestureMetadata } from './gestureMetadata';
import type { EditorClip } from './types';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

export async function downloadRecordingClip(recording: { id: string; blob: Blob; mimeType: string; durationMs: number; interactions?: RecordedInteraction[]; crop?: CropArea }, clip: EditorClip): Promise<void> {
  const extension = recording.mimeType.includes('mp4') ? 'mp4' : 'webm';
  const filename = `rio-clip-${(clip.sourceStartMs / 1_000).toFixed(1)}-${(clip.sourceEndMs / 1_000).toFixed(1)}.${extension}`;
  const interactions = (recording.interactions ?? [])
    .filter((event) => event.timestampMs >= clip.sourceStartMs && event.timestampMs <= clip.sourceEndMs)
    .map((event) => ({ ...event, timestampMs: event.timestampMs - clip.sourceStartMs }));

  if (clip.sourceStartMs <= 1 && clip.sourceEndMs >= recording.durationMs - 1) {
    triggerDownload(embedGestureMetadata(recording.blob, { version: 1, durationMs: recording.durationMs, interactions, crop: recording.crop }), filename);
    return;
  }

  const query = new URLSearchParams({ recordingId: recording.id, startMs: String(clip.sourceStartMs), endMs: String(clip.sourceEndMs) });
  const tab = await browser.tabs.create({ url: chrome.runtime.getURL(`/clip-download.html?${query}`), active: true });
  if (!tab.id) throw new Error('Could not start the clip download.');
}
