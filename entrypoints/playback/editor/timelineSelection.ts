import { useHistoryStore } from './history';
import { useEditorStore } from './store';
import type { TimelineSelection } from './types';

export const selectionKey = (selection: TimelineSelection) => `${selection.kind}:${selection.id}`;

export function isTimelineItemSelected(selection: TimelineSelection): boolean {
  return useEditorStore.getState().selectedTimelineItems.some((item) => selectionKey(item) === selectionKey(selection));
}

export function selectTimelineItem(selection: TimelineSelection, additive: boolean): void {
  useEditorStore.getState().selectTimelineItem(selection, additive);
}

export function getGroupMoveDelta(requestedDeltaMs: number): number {
  const state = useEditorStore.getState();
  const starts = state.selectedTimelineItems.flatMap((selection) => {
    if (selection.kind === 'recording') return state.clips.find((item) => item.id === selection.id)?.timelineStartMs ?? [];
    if (selection.kind === 'media') return state.timelineMedia.find((item) => item.id === selection.id)?.timelineStartMs ?? [];
    if (selection.kind === 'gesture') return state.gestureClips.find((item) => item.id === selection.id)?.timelineStartMs ?? [];
    if (selection.kind === 'text') return state.textClips.find((item) => item.id === selection.id)?.timelineStartMs ?? [];
    return state.zoomClips.find((item) => item.id === selection.id)?.timelineStartMs ?? [];
  });
  return Math.max(starts.length ? -Math.min(...starts) : 0, requestedDeltaMs);
}

export function setTimelineItemSelection(selection: TimelineSelection | undefined) {
  useEditorStore.getState().setSelectedTimelineItem(selection);
}

export function moveSelectedTimelineItems(deltaMs: number, initialStarts: Map<string, number>): void {
  useHistoryStore.getState().beginTransaction('Move timeline items');
  const state = useEditorStore.getState();
  const selected = new Set(state.selectedTimelineItems.map(selectionKey));
  const move = <T extends { id: string; timelineStartMs: number }>(kind: TimelineSelection['kind'], item: T): T => {
    const key = `${kind}:${item.id}`;
    const initial = initialStarts.get(key);
    return selected.has(key) && initial !== undefined ? { ...item, timelineStartMs: initial + deltaMs } : item;
  };
  state.setClips((items) => items.map((item) => move('recording', item)));
  state.setTimelineMedia((items) => items.map((item) => move('media', item)));
  state.setGestureClips((items) => items.map((item) => move('gesture', item)));
  state.setTextClips((items) => items.map((item) => move('text', item)));
  state.setZoomClips((items) => items.map((item) => move('zoom', item)));
}

export function captureSelectedTimelineStarts(): Map<string, number> {
  const state = useEditorStore.getState();
  const starts = new Map<string, number>();
  for (const selection of state.selectedTimelineItems) {
    const item = selection.kind === 'recording'
      ? state.clips.find((candidate) => candidate.id === selection.id)
      : selection.kind === 'media'
        ? state.timelineMedia.find((candidate) => candidate.id === selection.id)
        : selection.kind === 'gesture'
          ? state.gestureClips.find((candidate) => candidate.id === selection.id)
          : selection.kind === 'text'
            ? state.textClips.find((candidate) => candidate.id === selection.id)
            : state.zoomClips.find((candidate) => candidate.id === selection.id);
    if (item) starts.set(selectionKey(selection), item.timelineStartMs);
  }
  return starts;
}
