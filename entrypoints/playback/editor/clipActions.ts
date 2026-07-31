import { useEditorStore } from './store';
import { useHistoryStore } from './history';
import type { EditorClip, GestureClip, TextClip, TimelineMediaItem, TimelineSelection, ZoomClip } from './types';
import { getClipDurationMs, getGestureClipDurationMs, getTimelineItemDurationMs } from './types';

type ClipboardItem =
  | { kind: 'recording'; item: EditorClip }
  | { kind: 'media'; item: TimelineMediaItem }
  | { kind: 'gesture'; item: GestureClip }
  | { kind: 'text'; item: TextClip }
  | { kind: 'zoom'; item: ZoomClip };

let clipboard: ClipboardItem | undefined;
const clone = <T,>(value: T): T => structuredClone(value);

function selectedItem(): ClipboardItem | undefined {
  const state = useEditorStore.getState();
  const selection = state.selectedTimelineItem;
  if (!selection) return undefined;
  if (selection.kind === 'recording') {
    const item = state.clips.find((clip) => clip.id === selection.id);
    return item ? { kind: selection.kind, item: clone(item) } : undefined;
  }
  if (selection.kind === 'media') {
    const item = state.timelineMedia.find((media) => media.id === selection.id);
    return item ? { kind: selection.kind, item: clone(item) } : undefined;
  }
  if (selection.kind === 'gesture') {
    const item = state.gestureClips.find((clip) => clip.id === selection.id);
    return item ? { kind: selection.kind, item: clone(item) } : undefined;
  }
  if (selection.kind === 'text') {
    const item = state.textClips.find((clip) => clip.id === selection.id);
    return item ? { kind: selection.kind, item: clone(item) } : undefined;
  }
  const item = state.zoomClips.find((clip) => clip.id === selection.id);
  return item ? { kind: selection.kind, item: clone(item) } : undefined;
}

function duration(item: ClipboardItem): number {
  if (item.kind === 'recording') return getClipDurationMs(item.item);
  if (item.kind === 'media') return getTimelineItemDurationMs(item.item);
  if (item.kind === 'gesture') return getGestureClipDurationMs(item.item);
  return item.item.durationMs;
}

function insert(item: ClipboardItem): TimelineSelection {
  useHistoryStore.getState().beginTransaction('Paste item');
  const state = useEditorStore.getState();
  const copy = { ...clone(item.item), id: crypto.randomUUID(), timelineStartMs: item.item.timelineStartMs + duration(item) };
  if (item.kind === 'recording') state.setClips((current) => [...current, copy as EditorClip]);
  else if (item.kind === 'media') state.setTimelineMedia((current) => [...current, copy as TimelineMediaItem]);
  else if (item.kind === 'gesture') state.setGestureClips((current) => [...current, copy as GestureClip]);
  else if (item.kind === 'text') state.setTextClips((current) => [...current, copy as TextClip]);
  else state.setZoomClips((current) => [...current, copy as ZoomClip]);
  const selection = { kind: item.kind, id: copy.id } as TimelineSelection;
  state.setSelectedTimelineItem(selection);
  useHistoryStore.getState().commitTransaction();
  return selection;
}

export function copySelectedTimelineItem(): boolean {
  const item = selectedItem();
  if (!item) return false;
  clipboard = item;
  return true;
}

export function pasteTimelineItem(): boolean {
  if (!clipboard) return false;
  const pasted = { ...clipboard, item: clone(clipboard.item) } as ClipboardItem;
  insert(pasted);
  clipboard = { ...pasted, item: { ...pasted.item, timelineStartMs: pasted.item.timelineStartMs + duration(pasted) } } as ClipboardItem;
  return true;
}

export function duplicateSelectedTimelineItem(): boolean {
  const item = selectedItem();
  if (!item) return false;
  useHistoryStore.getState().beginTransaction('Duplicate item');
  insert(item);
  useHistoryStore.getState().commitTransaction();
  return true;
}

export function splitSelectedTimelineItemAudio(): boolean {
  const item = selectedItem();
  if (!item || item.kind !== 'recording') return false;

  const state = useEditorStore.getState();
  const clip = item.item;
  const alreadyDetached = clip.audioDetached || state.timelineMedia.some((media) =>
    media.assetId === 'original-recording-audio'
    && media.sourceStartMs === clip.sourceStartMs
    && media.sourceEndMs === clip.sourceEndMs
    && media.timelineStartMs === clip.timelineStartMs
  );
  if (alreadyDetached) return false;

  // Create an audio-only media item that matches the clip's properties
  const audioItem: TimelineMediaItem = {
    id: crypto.randomUUID(),
    assetId: 'original-recording-audio', // Using a special ID to indicate it's from the original recording
    type: 'audio',
    name: 'Recording Audio',
    assetDurationMs: clip.sourceEndMs, // Roughly, though could be longer
    sourceStartMs: clip.sourceStartMs,
    sourceEndMs: clip.sourceEndMs,
    timelineStartMs: clip.timelineStartMs,
    playbackRate: clip.playbackRate,
    scale: 0,
    positionX: 50,
    positionY: 50,
    opacity: 0,
    volume: clip.volume ?? 100,
    fadeInMs: 0,
    fadeOutMs: 0,
    holdLastFrame: false,
  };

  useHistoryStore.getState().beginTransaction('Detach audio');

  // Mute the original clip
  state.updateSelectedClip({ volume: 0, audioDetached: true });

  // Add the detached audio item
  state.setTimelineMedia((current) => [...current, audioItem]);

  // Select the new audio item
  state.setSelectedTimelineItem({ kind: 'media', id: audioItem.id });

  useHistoryStore.getState().commitTransaction();
  return true;
}

export function deleteSelectedZoomPoint(): boolean {
  const state = useEditorStore.getState();
  const selection = state.selectedTimelineItem;
  if (selection?.kind !== 'zoom') return false;
  const clip = state.zoomClips.find((item) => item.id === selection.id);
  if (!clip?.selectedPointId || !clip.points.some((point) => point.id === clip.selectedPointId)) return false;
  useHistoryStore.getState().record('Delete zoom point');
  state.updateZoomClip(clip.id, {
    points: clip.points.filter((point) => point.id !== clip.selectedPointId),
    selectedPointId: undefined,
  });
  return true;
}

export function deleteSelectedTimelineItem(): boolean {
  const state = useEditorStore.getState();
  const selection = state.selectedTimelineItem;
  if (!selection) return false;
  useHistoryStore.getState().record('Delete item');
  if (selection.kind === 'recording') state.setClips((current) => current.filter((item) => item.id !== selection.id));
  else if (selection.kind === 'media') state.setTimelineMedia((current) => current.filter((item) => item.id !== selection.id));
  else if (selection.kind === 'gesture') state.setGestureClips((current) => current.filter((item) => item.id !== selection.id));
  else if (selection.kind === 'text') state.setTextClips((current) => current.filter((item) => item.id !== selection.id));
  else state.setZoomClips((current) => current.filter((item) => item.id !== selection.id));
  const next = useEditorStore.getState();
  const fallback = next.clips[0]
    ? { kind: 'recording' as const, id: next.clips[0].id }
    : next.timelineMedia[0]
      ? { kind: 'media' as const, id: next.timelineMedia[0].id }
      : next.gestureClips[0]
        ? { kind: 'gesture' as const, id: next.gestureClips[0].id }
        : next.textClips[0]
          ? { kind: 'text' as const, id: next.textClips[0].id }
          : next.zoomClips[0]
            ? { kind: 'zoom' as const, id: next.zoomClips[0].id }
            : undefined;
  state.setSelectedTimelineItem(fallback);
  return true;
}
