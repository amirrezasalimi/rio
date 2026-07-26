import { useEditorStore } from './store';
import type { EditorClip, GestureClip, TextClip, TimelineMediaItem, TimelineSelection } from './types';
import { getClipDurationMs, getGestureClipDurationMs, getTimelineItemDurationMs } from './types';

type ClipboardItem =
  | { kind: 'recording'; item: EditorClip }
  | { kind: 'media'; item: TimelineMediaItem }
  | { kind: 'gesture'; item: GestureClip }
  | { kind: 'text'; item: TextClip };

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
  const item = state.textClips.find((clip) => clip.id === selection.id);
  return item ? { kind: selection.kind, item: clone(item) } : undefined;
}

function duration(item: ClipboardItem): number {
  if (item.kind === 'recording') return getClipDurationMs(item.item);
  if (item.kind === 'media') return getTimelineItemDurationMs(item.item);
  if (item.kind === 'gesture') return getGestureClipDurationMs(item.item);
  return item.item.durationMs;
}

function insert(item: ClipboardItem): TimelineSelection {
  const state = useEditorStore.getState();
  const copy = { ...clone(item.item), id: crypto.randomUUID(), timelineStartMs: item.item.timelineStartMs + duration(item) };
  if (item.kind === 'recording') state.setClips((current) => [...current, copy as EditorClip]);
  else if (item.kind === 'media') state.setTimelineMedia((current) => [...current, copy as TimelineMediaItem]);
  else if (item.kind === 'gesture') state.setGestureClips((current) => [...current, copy as GestureClip]);
  else state.setTextClips((current) => [...current, copy as TextClip]);
  const selection = { kind: item.kind, id: copy.id } as TimelineSelection;
  state.setSelectedTimelineItem(selection);
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
  insert(item);
  return true;
}

export function deleteSelectedTimelineItem(): boolean {
  const state = useEditorStore.getState();
  const selection = state.selectedTimelineItem;
  if (!selection) return false;
  if (selection.kind === 'recording') state.setClips((current) => current.filter((item) => item.id !== selection.id));
  else if (selection.kind === 'media') state.setTimelineMedia((current) => current.filter((item) => item.id !== selection.id));
  else if (selection.kind === 'gesture') state.setGestureClips((current) => current.filter((item) => item.id !== selection.id));
  else state.setTextClips((current) => current.filter((item) => item.id !== selection.id));
  const next = useEditorStore.getState();
  const fallback = next.clips[0]
    ? { kind: 'recording' as const, id: next.clips[0].id }
    : next.timelineMedia[0]
      ? { kind: 'media' as const, id: next.timelineMedia[0].id }
      : next.gestureClips[0]
        ? { kind: 'gesture' as const, id: next.gestureClips[0].id }
        : next.textClips[0]
          ? { kind: 'text' as const, id: next.textClips[0].id }
          : undefined;
  state.setSelectedTimelineItem(fallback);
  return true;
}
