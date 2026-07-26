import { create } from 'zustand';
import type { BackgroundSettings, BorderShape, CanvasRatio, ClipVisualSettings, EditorClip, EditorSettings, FrameStyle, MediaTransform, ShadowStyle, TimelineMediaItem, TimelineSelection } from './types';
import { CANVAS_SIZES, createInitialSettings } from './types';

interface EditorStore extends EditorSettings {
  selectedTimelineItem?: TimelineSelection;
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
  setClips: (clips: EditorClip[]) => void;
  setTimelineMedia: (timelineMedia: TimelineMediaItem[]) => void;
  setTimelineLimitMs: (timelineLimitMs: number) => void;
  setSelectedTimelineItem: (selection: TimelineSelection | undefined) => void;
  updateTimelineMediaItem: (id: string, patch: Partial<TimelineMediaItem>) => void;
  updateSelectedClip: (patch: Partial<EditorClip>) => void;
  updateSelectedClipVisual: (patch: Partial<ClipVisualSettings>) => void;
}

const initial = createInitialSettings(100);

export const useEditorStore = create<EditorStore>((set) => ({
  ...initial,
  initialize: (durationMs, saved) => {
    const settings = saved ?? createInitialSettings(durationMs);
    set({ ...settings, selectedTimelineItem: settings.clips[0] ? { kind: 'recording', id: settings.clips[0].id } : undefined });
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
  setClips: (clips) => set({ clips }),
  setTimelineMedia: (timelineMedia) => set({ timelineMedia }),
  setTimelineLimitMs: (timelineLimitMs) => set({ timelineLimitMs: Math.max(1_000, timelineLimitMs) }),
  setSelectedTimelineItem: (selectedTimelineItem) => set({ selectedTimelineItem }),
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
