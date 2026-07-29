import { create } from 'zustand';
import { useEditorStore } from './store';
import type { EditorSettings, TimelineSelection } from './types';

export interface HistoryEntry {
  id: string;
  label: string;
  timestamp: number;
  document: EditorSettings;
}

interface HistoryStore {
  past: HistoryEntry[];
  future: HistoryEntry[];
  activeTransaction: { label: string; document: EditorSettings } | null;
  record: (label: string) => void;
  beginTransaction: (label: string) => void;
  commitTransaction: () => void;
  cancelTransaction: () => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

export function getDocumentSnapshot(): EditorSettings {
  const state = useEditorStore.getState();
  return {
    clips: state.clips,
    timelineMedia: state.timelineMedia,
    gestureClips: state.gestureClips,
    textClips: state.textClips,
    zoomClips: state.zoomClips,
    timelineLimitMs: state.timelineLimitMs,
    frameStyle: state.frameStyle,
    borderShape: state.borderShape,
    cornerRadius: state.cornerRadius,
    cornerSmoothing: state.cornerSmoothing,
    borderOpacity: state.borderOpacity,
    borderWidth: state.borderWidth,
    borderColor: state.borderColor,
    shadowStyle: state.shadowStyle,
    shadowOpacity: state.shadowOpacity,
    shadowLightX: state.shadowLightX,
    shadowLightY: state.shadowLightY,
    background: state.background,
    media: state.media,
    canvas: state.canvas,
    sceneSpeed: state.sceneSpeed ?? 1,
  };
}

function reconcileSelection(state: { selectedTimelineItem?: TimelineSelection }, nextDoc: EditorSettings): TimelineSelection | undefined {
  const sel = state.selectedTimelineItem;
  if (!sel) return undefined;
  let exists = false;
  if (sel.kind === 'recording') exists = nextDoc.clips.some((c) => c.id === sel.id);
  else if (sel.kind === 'media') exists = nextDoc.timelineMedia.some((c) => c.id === sel.id);
  else if (sel.kind === 'gesture') exists = nextDoc.gestureClips.some((c) => c.id === sel.id);
  else if (sel.kind === 'text') exists = nextDoc.textClips.some((c) => c.id === sel.id);
  else if (sel.kind === 'zoom') exists = nextDoc.zoomClips.some((c) => c.id === sel.id);
  return exists ? sel : undefined;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  past: [],
  future: [],
  activeTransaction: null,
  record: (label) => {
    if (get().activeTransaction) return;
    const document = getDocumentSnapshot();
    set((state) => {
      const last = state.past[state.past.length - 1];
      if (last && JSON.stringify(last.document) === JSON.stringify(document)) {
        return state;
      }
      const nextPast = [...state.past, { id: crypto.randomUUID(), label, timestamp: Date.now(), document }];
      if (nextPast.length > 100) nextPast.shift();
      return { past: nextPast, future: [] };
    });
  },
  beginTransaction: (label) => {
    if (get().activeTransaction) return;
    set({ activeTransaction: { label, document: getDocumentSnapshot() } });
  },
  commitTransaction: () => {
    const transaction = get().activeTransaction;
    if (!transaction) return;
    set((state) => {
      const current = getDocumentSnapshot();
      if (JSON.stringify(transaction.document) === JSON.stringify(current)) {
        return { activeTransaction: null };
      }
      const nextPast = [...state.past, { id: crypto.randomUUID(), label: transaction.label, timestamp: Date.now(), document: transaction.document }];
      if (nextPast.length > 100) nextPast.shift();
      return { past: nextPast, future: [], activeTransaction: null };
    });
  },
  cancelTransaction: () => set({ activeTransaction: null }),
  undo: () => {
    set((state) => {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      const current = getDocumentSnapshot();
      const newFuture = [{ id: crypto.randomUUID(), label: previous.label, timestamp: Date.now(), document: current }, ...state.future];

      useEditorStore.setState((edState) => {
        const sel = reconcileSelection(edState, previous.document);
        return { ...previous.document, selectedTimelineItem: sel, selectedTimelineItems: sel ? [sel] : [] };
      });

      return { past: newPast, future: newFuture, activeTransaction: null };
    });
  },
  redo: () => {
    set((state) => {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      const current = getDocumentSnapshot();
      const newPast = [...state.past, { id: crypto.randomUUID(), label: next.label, timestamp: Date.now(), document: current }];

      useEditorStore.setState((edState) => {
        const sel = reconcileSelection(edState, next.document);
        return { ...next.document, selectedTimelineItem: sel, selectedTimelineItems: sel ? [sel] : [] };
      });

      return { past: newPast, future: newFuture, activeTransaction: null };
    });
  },
  clear: () => set({ past: [], future: [], activeTransaction: null }),
}));

export function jumpToHistory(index: number, direction: 'past' | 'future') {
  const state = useHistoryStore.getState();
  if (direction === 'past') {
    const steps = state.past.length - index;
    for (let i = 0; i < steps; i++) useHistoryStore.getState().undo();
  } else {
    const steps = index + 1;
    for (let i = 0; i < steps; i++) useHistoryStore.getState().redo();
  }
}
