import { create } from 'zustand';
import type { BackgroundSettings, BorderShape, CanvasRatio, ClipVisualSettings, EditorClip, EditorSettings, FrameStyle, GestureClip, GestureDataSource, GestureSettings, MediaTransform, ShadowStyle, TextClip, TimelineMediaItem, TimelineSelection } from './types';
import { CANVAS_SIZES, createInitialSettings } from './types';

interface EditorStore extends EditorSettings {
  selectedTimelineItem?: TimelineSelection;
  selectedTimelineItems: TimelineSelection[];
  gestureSources: GestureDataSource[];
  initialize: (durationMs: number, saved?: EditorSettings) => void;
  setFrameStyle: (frameStyle: FrameStyle) => void;
  setBorderShape: (borderShape: BorderShape) => void;
  setCornerRadius: (cornerRadius: number) => void;
  setCornerSmoothing: (cornerSmoothing: number) => void;
  setBorderOpacity: (borderOpacity: number) => void;
  setBorderStyle: (borderWidth: number, borderColor: string) => void;
  setShadowStyle: (shadowStyle: ShadowStyle) => void;
  setShadowOpacity: (shadowOpacity: number) => void;
  setShadowLight: (x: number, y: number) => void;
  updateBackground: (patch: Partial<BackgroundSettings>) => void;
  updateMedia: (patch: Partial<MediaTransform>) => void;
  resetMedia: () => void;
  setCanvasRatio: (ratio: CanvasRatio) => void;
  setCanvasSize: (width: number, height: number) => void;
  resetCanvas: () => void;
  setClips: (clips: EditorClip[] | ((current: EditorClip[]) => EditorClip[])) => void;
  setTimelineMedia: (timelineMedia: TimelineMediaItem[] | ((current: TimelineMediaItem[]) => TimelineMediaItem[])) => void;
  setGestureClips: (gestureClips: GestureClip[] | ((current: GestureClip[]) => GestureClip[])) => void;
  setGestureSources: (sources: GestureDataSource[]) => void;
  setTextClips: (textClips: TextClip[] | ((current: TextClip[]) => TextClip[])) => void;
  updateTextClip: (id: string, patch: Partial<TextClip>) => void;
  updateGestureClip: (id: string, patch: Partial<Omit<GestureClip, 'settings'>>) => void;
  updateGestureSettings: (id: string, patch: Partial<GestureSettings>) => void;
  setTimelineLimitMs: (timelineLimitMs: number) => void;
  setSelectedTimelineItem: (selection: TimelineSelection | undefined) => void;
  selectTimelineItem: (selection: TimelineSelection, additive: boolean) => void;
  updateTimelineMediaItem: (id: string, patch: Partial<TimelineMediaItem>) => void;
  updateSelectedClip: (patch: Partial<EditorClip>) => void;
  updateSelectedClipVisual: (patch: Partial<ClipVisualSettings>) => void;
}

const initial = createInitialSettings(100);

export const useEditorStore = create<EditorStore>((set) => ({
  ...initial,
  selectedTimelineItems: initial.clips[0] ? [{ kind: 'recording', id: initial.clips[0].id }] : [],
  gestureSources: [],
  initialize: (durationMs, saved) => {
    const fallback = createInitialSettings(durationMs);
    const settings = saved
      ? {
          ...fallback,
          ...saved,
          clips: saved.clips ?? fallback.clips,
          timelineMedia: saved.timelineMedia ?? [],
          gestureClips: saved.gestureClips ?? [],
          textClips: saved.textClips ?? [],
        }
      : fallback;
    const selection = settings.clips[0] ? { kind: 'recording' as const, id: settings.clips[0].id } : undefined;
    set((state) => ({ ...settings, gestureSources: state.gestureSources, selectedTimelineItem: selection, selectedTimelineItems: selection ? [selection] : [] }));
  },
  setFrameStyle: (frameStyle) => set({ frameStyle }),
  setBorderShape: (borderShape) => set({ borderShape }),
  setCornerRadius: (cornerRadius) => set({ cornerRadius }),
  setCornerSmoothing: (cornerSmoothing) => set({ cornerSmoothing }),
  setBorderOpacity: (borderOpacity) => set({ borderOpacity }),
  setBorderStyle: (borderWidth, borderColor) => set({ borderWidth, borderColor }),
  setShadowStyle: (shadowStyle) => set({ shadowStyle }),
  setShadowOpacity: (shadowOpacity) => set({ shadowOpacity }),
  setShadowLight: (shadowLightX, shadowLightY) => set({ shadowLightX, shadowLightY }),
  updateBackground: (patch) => set((state) => ({ background: { ...state.background, ...patch } })),
  updateMedia: (patch) => set((state) => ({ media: { ...state.media, ...patch } })),
  resetMedia: () => set({ media: { scale: 86, positionX: 50, positionY: 50 } }),
  setCanvasRatio: (ratio) => {
    if (ratio === 'custom') return set((state) => ({ canvas: { ...state.canvas, ratio } }));
    set({ canvas: { ratio, ...CANVAS_SIZES[ratio] } });
  },
  setCanvasSize: (width, height) => set({ canvas: { ratio: 'custom', width: Math.max(320, Math.round(width)), height: Math.max(320, Math.round(height)) } }),
  resetCanvas: () => set({ canvas: { ratio: '16:9', ...CANVAS_SIZES['16:9'] } }),
  setClips: (next) => set((state) => ({ clips: typeof next === 'function' ? next(state.clips) : next })),
  setTimelineMedia: (next) => set((state) => ({ timelineMedia: typeof next === 'function' ? next(state.timelineMedia) : next })),
  setGestureClips: (next) => set((state) => ({ gestureClips: typeof next === 'function' ? next(state.gestureClips) : next })),
  setGestureSources: (gestureSources) => set({ gestureSources }),
  setTextClips: (next) => set((state) => ({ textClips: typeof next === 'function' ? next(state.textClips) : next })),
  updateTextClip: (id, patch) => set((state) => ({
    textClips: state.textClips.map((clip) => clip.id === id ? { ...clip, ...patch } : clip),
  })),
  updateGestureClip: (id, patch) => set((state) => ({
    gestureClips: state.gestureClips.map((clip) => clip.id === id ? { ...clip, ...patch } : clip),
  })),
  updateGestureSettings: (id, patch) => set((state) => ({
    gestureClips: state.gestureClips.map((clip) => clip.id === id ? { ...clip, settings: { ...clip.settings, ...patch } } : clip),
  })),
  setTimelineLimitMs: (timelineLimitMs) => set({ timelineLimitMs: Math.max(1_000, timelineLimitMs) }),
  setSelectedTimelineItem: (selectedTimelineItem) => set({ selectedTimelineItem, selectedTimelineItems: selectedTimelineItem ? [selectedTimelineItem] : [] }),
  selectTimelineItem: (selection, additive) => set((state) => {
    const matches = (item: TimelineSelection) => item.kind === selection.kind && item.id === selection.id;
    if (!additive) {
      if (state.selectedTimelineItems.some(matches)) return { selectedTimelineItem: selection };
      return { selectedTimelineItem: selection, selectedTimelineItems: [selection] };
    }
    const selected = state.selectedTimelineItems.some(matches);
    const selectedTimelineItems = selected
      ? state.selectedTimelineItems.filter((item) => !matches(item))
      : [...state.selectedTimelineItems, selection];
    return { selectedTimelineItem: selected ? selectedTimelineItems.at(-1) : selection, selectedTimelineItems };
  }),
  updateTimelineMediaItem: (id, patch) => set((state) => ({
    timelineMedia: state.timelineMedia.map((item) => item.id === id ? { ...item, ...patch } : item),
  })),
  updateSelectedClip: (patch) => set((state) => {
    if (state.selectedTimelineItem?.kind !== 'recording') return state;
    return {
      clips: state.clips.map((clip) => clip.id === state.selectedTimelineItem?.id ? { ...clip, ...patch } : clip),
    };
  }),
  updateSelectedClipVisual: (patch) => set((state) => {
    if (state.selectedTimelineItem?.kind !== 'recording') return state;
    return {
      clips: state.clips.map((clip) => clip.id === state.selectedTimelineItem?.id ? { ...clip, visual: { ...clip.visual, ...patch } } : clip),
    };
  }),
}));
