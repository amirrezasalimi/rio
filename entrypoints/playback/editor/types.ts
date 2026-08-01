import type { CSSProperties } from 'react';
import type { CropArea, RecordedInteraction } from '../../shared/recording/types';

export type FrameStyle =
  | 'default'
  | 'glass-light'
  | 'glass-dark'
  | 'liquid-glass'
  | 'inset-light'
  | 'inset-dark'
  | 'outline'
  | 'border';

export type BorderShape = 'curved' | 'rounded' | 'sharp';
export type ShadowStyle = 'none' | 'spread' | 'huge' | 'adaptive';
export type ExportFormat = 'webm' | 'mp4' | 'gif';
export type ExportQuality = '4k' | '1440p' | '1080p' | '720p' | '480p';
export type ExportFps = 15 | 24 | 30 | 60;
export interface ExportSettings {
  quality: ExportQuality;
  fps: ExportFps;
}
export type BackgroundType = 'transparent' | 'solid' | 'gradient' | 'radiant' | 'mesh' | 'image';
export type CanvasRatio = '16:9' | '4:3' | '1:1' | '9:16' | 'custom';
export type NoiseType = 'grain' | 'paper' | 'dots' | 'scanlines';
export type MeshMode = 'preset' | 'custom';
export type TimelineMediaType = 'image' | 'video' | 'audio';
export type MediaAspectRatio = 'source' | '16:9' | '4:3' | '1:1' | '9:16';
export type MediaCropShape = 'rectangle' | 'circle';
export type MediaContentFit = 'cover' | 'contain' | 'fill';
export type TimelineSelection =
  | { kind: 'recording'; id: string }
  | { kind: 'media'; id: string }
  | { kind: 'gesture'; id: string }
  | { kind: 'text'; id: string }
  | { kind: 'zoom'; id: string };
export type GestureAction = 'pointer' | 'click' | 'double-click' | 'drag' | 'scroll';
export type GestureAnimation = 'pulse' | 'ripple' | 'burst';
export type ZoomAnimation = 'smooth' | 'ease-in' | 'ease-out' | 'linear' | 'snap';
export type ZoomTarget =
  | { kind: 'canvas' }
  | { kind: 'recording'; id: string }
  | { kind: 'media'; id: string };

export interface ZoomPoint {
  id: string;
  timeMs: number;
  positionX: number;
  positionY: number;
  zoom: number;
}

export interface ZoomClip {
  id: string;
  timelineStartMs: number;
  durationMs: number;
  target: ZoomTarget;
  animation: ZoomAnimation;
  transitionDurationMs: number;
  selectedPointId?: string;
  points: ZoomPoint[];
}

export interface GestureSettings {
  enabled: Record<GestureAction, boolean>;
  animation: GestureAnimation;
  cursorColor: string;
  clickColor: string;
  dragColor: string;
  scrollColor: string;
  cursorSize: number;
  effectSize: number;
  trailWidth: number;
  durationMs: number;
  opacity: number;
}

export interface GestureDataSource {
  id: string;
  name: string;
  durationMs: number;
  interactions: RecordedInteraction[];
  crop?: CropArea;
}

export interface GestureClip {
  id: string;
  sourceAssetId?: string;
  sourceStartMs: number;
  sourceEndMs: number;
  timelineStartMs: number;
  settings: GestureSettings;
}

export type TextFill =
  | { type: 'solid'; color: string }
  | { type: 'gradient'; colorA: string; colorB: string; angle: number };

export interface TextClip {
  id: string;
  text: string;
  timelineStartMs: number;
  durationMs: number;
  positionX: number;
  positionY: number;
  fontSize: number;
  scale: number;
  rotation: number;
  fontFamily: string;
  fontWeight: number;
  fill: TextFill;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  backgroundColor: string;
  backgroundOpacity: number;
  backgroundRadius: number;
}

export interface ClipVisualSettings {
  frameStyle: FrameStyle;
  borderShape: BorderShape;
  cornerRadius: number;
  cornerSmoothing: number;
  borderOpacity: number;
  borderWidth: number;
  borderColor: string;
  shadowStyle: ShadowStyle;
  shadowOpacity: number;
  shadowLightX: number;
  shadowLightY: number;
}

export interface EditorClip {
  id: string;
  sourceStartMs: number;
  sourceEndMs: number;
  timelineStartMs: number;
  playbackRate?: number;
  volume?: number;
  audioDetached?: boolean;
  visual?: Partial<ClipVisualSettings>;
  media?: MediaTransform;
}

export interface TimelineMediaItem {
  id: string;
  assetId: string;
  type: TimelineMediaType;
  name: string;
  assetDurationMs: number;
  sourceStartMs: number;
  sourceEndMs: number;
  timelineStartMs: number;
  playbackRate?: number;
  scale: number;
  positionX: number;
  positionY: number;
  opacity: number;
  volume: number;
  fadeInMs: number;
  fadeOutMs: number;
  holdLastFrame: boolean;
  aspectRatio?: MediaAspectRatio;
  cropShape?: MediaCropShape;
  contentFit?: MediaContentFit;
  contentScale?: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  visual?: Partial<ClipVisualSettings>;
}

export interface MeshPoint {
  id: string;
  x: number;
  y: number;
  color: string;
  size: number;
  opacity: number;
}

export interface BackgroundSettings {
  type: BackgroundType;
  colorA: string;
  colorB: string;
  colorC: string;
  colorD: string;
  variant: number;
  meshMode: MeshMode;
  imageUrl?: string;
  imageCredit?: string;
  imageCreditUrl?: string;
  scale: number;
  positionX: number;
  positionY: number;
  blur: number;
  noise: number;
  noiseType: NoiseType;
  meshPoints: MeshPoint[];
}

export interface MediaTransform {
  scale: number;
  positionX: number;
  positionY: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
}

export interface CanvasSettings {
  ratio: CanvasRatio;
  width: number;
  height: number;
}

export interface TimelineAssetSource {
  id: string;
  url: string;
  name: string;
  type: TimelineMediaType;
  mimeType: string;
  durationMs: number;
  width: number;
  height: number;
  gestureDurationMs?: number;
  interactions?: RecordedInteraction[];
  crop?: CropArea;
}

export interface EditorSettings {
  clips: EditorClip[];
  timelineMedia: TimelineMediaItem[];
  gestureClips: GestureClip[];
  textClips: TextClip[];
  zoomClips: ZoomClip[];
  timelineLimitMs: number;
  frameStyle: FrameStyle;
  borderShape: BorderShape;
  cornerRadius: number;
  cornerSmoothing: number;
  borderOpacity: number;
  borderWidth: number;
  borderColor: string;
  shadowStyle: ShadowStyle;
  shadowOpacity: number;
  shadowLightX: number;
  shadowLightY: number;
  background: BackgroundSettings;
  media: MediaTransform;
  canvas: CanvasSettings;
  sceneSpeed?: number;
}

export interface BackgroundVariant {
  id: number;
  label: string;
  preview: (colorA: string, colorB: string) => string;
}

export const FPS = 30;
export const DEFAULT_EXPORT_SETTINGS: ExportSettings = { quality: '1080p', fps: 30 };
export const EXPORT_QUALITY_OPTIONS: Array<{ value: ExportQuality; label: string; longEdge: number }> = [
  { value: '4k', label: '4K', longEdge: 3840 },
  { value: '1440p', label: '1440p', longEdge: 2560 },
  { value: '1080p', label: '1080p', longEdge: 1920 },
  { value: '720p', label: '720p', longEdge: 1280 },
  { value: '480p', label: '480p', longEdge: 854 },
];
export const EXPORT_FPS_OPTIONS: ExportFps[] = [15, 24, 30, 60];

export function getExportDimensions(canvas: Pick<CanvasSettings, 'width' | 'height'>, quality: ExportQuality): { width: number; height: number } {
  const preset = EXPORT_QUALITY_OPTIONS.find((option) => option.value === quality) ?? EXPORT_QUALITY_OPTIONS[2];
  const safeWidth = Math.max(1, canvas.width);
  const safeHeight = Math.max(1, canvas.height);
  const scale = preset.longEdge / Math.max(safeWidth, safeHeight);
  const makeEven = (value: number) => Math.max(2, Math.round(value / 2) * 2);
  return { width: makeEven(safeWidth * scale), height: makeEven(safeHeight * scale) };
}

export const GRADIENT_VARIANTS: BackgroundVariant[] = [
  { id: 0, label: 'Drift', preview: (a, b) => `linear-gradient(135deg, ${a}, ${b})` },
  { id: 1, label: 'Horizon', preview: (a, b) => `linear-gradient(90deg, ${a}, ${b})` },
  { id: 2, label: 'Dawn', preview: (a, b) => `linear-gradient(180deg, ${a}, ${b})` },
  { id: 3, label: 'Ember', preview: (a, b) => `linear-gradient(35deg, ${a} 8%, ${b} 82%)` },
  { id: 4, label: 'Silk', preview: (a, b) => `linear-gradient(155deg, ${a} 0%, color-mix(in srgb, ${a}, ${b} 45%) 48%, ${b} 100%)` },
  { id: 5, label: 'Split', preview: (a, b) => `linear-gradient(115deg, ${a} 0 48%, ${b} 52% 100%)` },
  { id: 6, label: 'Prism', preview: (a, b) => `linear-gradient(135deg, ${a}, ${b} 45%, ${a})` },
  { id: 7, label: 'Soft beam', preview: (a, b) => `linear-gradient(120deg, ${a} 10%, color-mix(in srgb, ${a}, white 40%) 48%, ${b} 88%)` },
  { id: 8, label: 'Midnight', preview: (a, b) => `linear-gradient(165deg, color-mix(in srgb, ${a}, #152a44 35%), ${a} 52%, ${b})` },
  { id: 9, label: 'Wash', preview: (a, b) => `linear-gradient(25deg, ${b}, color-mix(in srgb, ${a}, white 28%) 58%, ${a})` },
];

export const RADIANT_VARIANTS: BackgroundVariant[] = [
  { id: 0, label: 'Center', preview: (a, b) => `radial-gradient(circle at 50% 50%, ${a}, ${b})` },
  { id: 1, label: 'Top glow', preview: (a, b) => `radial-gradient(circle at 50% 0%, ${a}, ${b} 72%)` },
  { id: 2, label: 'Sunrise', preview: (a, b) => `radial-gradient(circle at 18% 82%, ${a}, ${b} 68%)` },
  { id: 3, label: 'Halo', preview: (a, b) => `radial-gradient(circle, ${a} 0 18%, color-mix(in srgb, ${a}, ${b} 50%) 38%, ${b} 74%)` },
  { id: 4, label: 'Corner', preview: (a, b) => `radial-gradient(circle at 100% 0%, ${a}, ${b} 70%)` },
  { id: 5, label: 'Bloom', preview: (a, b) => `radial-gradient(ellipse at 30% 30%, white 0%, ${a} 18%, ${b} 76%)` },
  { id: 6, label: 'Dual', preview: (a, b) => `radial-gradient(circle at 15% 20%, ${a}, transparent 45%), radial-gradient(circle at 85% 80%, ${b}, ${a} 110%)` },
  { id: 7, label: 'Spotlight', preview: (a, b) => `radial-gradient(ellipse at 50% 100%, ${a} 0%, ${b} 72%)` },
  { id: 8, label: 'Aurora', preview: (a, b) => `radial-gradient(circle at 20% 80%, ${a}, transparent 48%), radial-gradient(circle at 75% 15%, ${b}, #152a44 105%)` },
  { id: 9, label: 'Vignette', preview: (a, b) => `radial-gradient(ellipse, ${a} 0%, color-mix(in srgb, ${a}, ${b} 48%) 48%, ${b} 100%)` },
];

export const GRADIENT_PALETTES = [
  ['#dff1ff', '#328fdf', '#fff8e9', '#86c9ff'],
  ['#fff5f1', '#ed674e', '#ffd2c5', '#f8eacd'],
  ['#152a44', '#328fdf', '#27866f', '#dff1ff'],
  ['#f8eacd', '#dfb978', '#ed674e', '#fff5f1'],
  ['#204267', '#86c9ff', '#ffad98', '#fffdf8'],
  ['#18324a', '#61758a', '#b9e0ff', '#fffaf0'],
  ['#27866f', '#86c9ff', '#f8eacd', '#ed674e'],
  ['#43150f', '#d94b35', '#dfb978', '#fff8e9'],
  ['#1d5b9a', '#54adf7', '#ffad98', '#ffe7df'],
  ['#152a44', '#1d5b9a', '#ed674e', '#efd6a8'],
] as const;

export const MESH_VARIANTS: BackgroundVariant[] = [
  { id: 0, label: 'Figma bloom', preview: (a, b) => `radial-gradient(circle at 18% 18%, ${a}, transparent 42%), radial-gradient(circle at 82% 24%, ${b}, transparent 46%)` },
  { id: 1, label: 'Soft corners', preview: (a, b) => `radial-gradient(circle at 0% 0%, ${a}, transparent 52%), radial-gradient(circle at 100% 100%, ${b}, transparent 55%)` },
  { id: 2, label: 'Cloud', preview: (a, b) => `radial-gradient(ellipse at 30% 70%, ${a}, transparent 48%), radial-gradient(ellipse at 72% 30%, ${b}, transparent 52%)` },
  { id: 3, label: 'Orbit', preview: (a, b) => `radial-gradient(circle at 50% 8%, ${a}, transparent 38%), radial-gradient(circle at 14% 86%, ${b}, transparent 42%)` },
  { id: 4, label: 'Ribbon', preview: (a, b) => `radial-gradient(ellipse at 15% 45%, ${a}, transparent 38%), radial-gradient(ellipse at 84% 55%, ${b}, transparent 40%)` },
  { id: 5, label: 'Studio', preview: (a, b) => `radial-gradient(circle at 72% 18%, ${a}, transparent 38%), radial-gradient(circle at 32% 88%, ${b}, transparent 46%)` },
  { id: 6, label: 'Four light', preview: (a, b) => `radial-gradient(circle at 15% 20%, ${a}, transparent 35%), radial-gradient(circle at 85% 78%, ${b}, transparent 40%)` },
  { id: 7, label: 'Mist', preview: (a, b) => `radial-gradient(ellipse at 50% 100%, ${a}, transparent 48%), radial-gradient(ellipse at 50% 0%, ${b}, transparent 46%)` },
  { id: 8, label: 'Candy', preview: (a, b) => `radial-gradient(circle at 25% 35%, ${a}, transparent 38%), radial-gradient(circle at 75% 65%, ${b}, transparent 42%)` },
  { id: 9, label: 'Editorial', preview: (a, b) => `radial-gradient(ellipse at 0% 65%, ${a}, transparent 46%), radial-gradient(ellipse at 100% 25%, ${b}, transparent 48%)` },
];

export const CANVAS_SIZES: Record<Exclude<CanvasRatio, 'custom'>, { width: number; height: number }> = {
  '16:9': { width: 1280, height: 720 },
  '4:3': { width: 1200, height: 900 },
  '1:1': { width: 1080, height: 1080 },
  '9:16': { width: 720, height: 1280 },
};

export function getNoiseStyle(type: NoiseType): Pick<CSSProperties, 'backgroundImage' | 'backgroundSize' | 'mixBlendMode'> {
  if (type === 'paper') return { backgroundImage: 'repeating-linear-gradient(115deg,rgba(255,255,255,.55) 0 1px,transparent 1px 4px),repeating-linear-gradient(25deg,rgba(24,50,74,.16) 0 1px,transparent 1px 5px)', backgroundSize: '7px 7px', mixBlendMode: 'soft-light' };
  if (type === 'dots') return { backgroundImage: 'radial-gradient(circle,rgba(24,50,74,.55) 0 1px,transparent 1.2px)', backgroundSize: '6px 6px', mixBlendMode: 'overlay' };
  if (type === 'scanlines') return { backgroundImage: 'repeating-linear-gradient(0deg,rgba(24,50,74,.28) 0 1px,transparent 1px 4px)', backgroundSize: '100% 4px', mixBlendMode: 'soft-light' };
  return { backgroundImage: 'repeating-radial-gradient(circle at 17% 23%,rgba(255,255,255,.7) 0 1px,rgba(24,50,74,.35) 1px 2px,transparent 2px 4px)', backgroundSize: '5px 5px', mixBlendMode: 'soft-light' };
}

export function getMeshPresetPoints(variant: number, palette: readonly string[]): MeshPoint[] {
  const layouts = [
    [[18, 18], [82, 24], [28, 82], [80, 76]], [[0, 0], [100, 0], [0, 100], [100, 100]],
    [[30, 70], [72, 28], [50, 50], [86, 78]], [[50, 8], [14, 86], [86, 86], [50, 50]],
    [[15, 45], [85, 55], [50, 18], [50, 82]], [[72, 18], [32, 88], [18, 22], [82, 78]],
    [[15, 20], [85, 78], [85, 20], [15, 78]], [[50, 100], [50, 0], [8, 50], [92, 50]],
    [[25, 35], [75, 65], [75, 35], [25, 65]], [[0, 65], [100, 25], [50, 50], [50, 50]],
  ] as const;
  const positions = layouts[((variant % layouts.length) + layouts.length) % layouts.length];
  return positions.map(([x, y], index) => ({ id: crypto.randomUUID(), x, y, color: palette[index % palette.length], size: 42 + (index % 3) * 7, opacity: 76 + (index % 4) * 6 }));
}

export function getBackgroundCss(background: BackgroundSettings): string {
  if (background.type === 'transparent') return 'transparent';
  if (background.type === 'solid') return background.colorA;
  if (background.type === 'mesh') {
    const points = background.meshMode === 'preset' ? getMeshPresetPoints(background.variant, [background.colorA, background.colorB, background.colorC, background.colorD]) : background.meshPoints.length > 0 ? background.meshPoints : createDefaultMeshPoints();
    const layers = points.map((point) => `radial-gradient(circle at ${point.x}% ${point.y}%, color-mix(in srgb, ${point.color} ${point.opacity}%, transparent) 0%, transparent ${point.size}%)`);
    return `${layers.join(', ')}, linear-gradient(145deg, ${background.colorD}, ${background.colorC})`;
  }
  const variants = background.type === 'radiant' ? RADIANT_VARIANTS : GRADIENT_VARIANTS;
  return variants[background.variant % variants.length].preview(background.colorA, background.colorB);
}

export function getClipVisualSettings(clip: EditorClip, settings: ClipVisualSettings): ClipVisualSettings {
  return { ...settings, ...clip.visual };
}

export function getClipMediaTransform(clip: EditorClip, fallback: MediaTransform): MediaTransform {
  return clip.media ?? fallback;
}

export function getPlaybackRate(item: { playbackRate?: number }): number {
  return Math.max(0.25, Math.min(4, item.playbackRate ?? 1));
}

export function getClipDurationMs(clip: EditorClip): number {
  return Math.max(0, clip.sourceEndMs - clip.sourceStartMs) / getPlaybackRate(clip);
}

export function getTimelineItemDurationMs(item: Pick<TimelineMediaItem, 'sourceStartMs' | 'sourceEndMs' | 'playbackRate' | 'type'>): number {
  const rate = item.type === 'video' ? getPlaybackRate(item) : 1;
  return Math.max(0, item.sourceEndMs - item.sourceStartMs) / rate;
}

export function getGestureClipDurationMs(clip: GestureClip): number {
  return Math.max(0, clip.sourceEndMs - clip.sourceStartMs);
}

export function getEditedDurationMs(clips: EditorClip[], timelineMedia: TimelineMediaItem[] = [], gestureClips: GestureClip[] = [], textClips: TextClip[] = [], zoomClips: ZoomClip[] = []): number {
  const clipEnd = clips.reduce((duration, clip) => Math.max(duration, clip.timelineStartMs + getClipDurationMs(clip)), 0);
  const mediaEnd = timelineMedia.reduce((duration, item) => Math.max(duration, item.timelineStartMs + getTimelineItemDurationMs(item)), clipEnd);
  const gestureEnd = gestureClips.reduce((duration, clip) => Math.max(duration, clip.timelineStartMs + getGestureClipDurationMs(clip)), mediaEnd);
  const textEnd = textClips.reduce((duration, clip) => Math.max(duration, clip.timelineStartMs + clip.durationMs), gestureEnd);
  return zoomClips.reduce((duration, clip) => Math.max(duration, clip.timelineStartMs + clip.durationMs), textEnd);
}

export function createDefaultZoomClip(timelineStartMs = 0, durationMs = 5_000): ZoomClip {
  const firstPoint: ZoomPoint = { id: crypto.randomUUID(), timeMs: 0, positionX: 50, positionY: 50, zoom: 1 };
  return {
    id: crypto.randomUUID(),
    timelineStartMs,
    durationMs: Math.max(150, durationMs),
    target: { kind: 'canvas' },
    animation: 'smooth',
    transitionDurationMs: 400,
    selectedPointId: firstPoint.id,
    points: [firstPoint],
  };
}

export function createDefaultTextClip(timelineStartMs = 0): TextClip {
  return {
    id: crypto.randomUUID(),
    text: 'Your text',
    timelineStartMs,
    durationMs: 5_000,
    positionX: 50,
    positionY: 50,
    fontSize: 72,
    scale: 100,
    rotation: 0,
    fontFamily: 'Arial',
    fontWeight: 700,
    fill: { type: 'solid', color: '#fffdf8' },
    strokeColor: '#18324a',
    strokeWidth: 0,
    opacity: 100,
    backgroundColor: '#000000',
    backgroundOpacity: 0,
    backgroundRadius: 8,
  };
}

export function createDefaultGestureSettings(): GestureSettings {
  return {
    enabled: { pointer: true, click: true, 'double-click': true, drag: true, scroll: true },
    animation: 'ripple',
    cursorColor: '#18324a',
    clickColor: '#328fdf',
    dragColor: '#ed674e',
    scrollColor: '#fffdf8',
    cursorSize: 18,
    effectSize: 54,
    trailWidth: 5,
    durationMs: 650,
    opacity: 90,
  };
}

export function createDefaultMeshPoints(): MeshPoint[] {
  return [
    { id: crypto.randomUUID(), x: 16, y: 18, color: '#86c9ff', size: 46, opacity: 100 },
    { id: crypto.randomUUID(), x: 84, y: 22, color: '#328fdf', size: 48, opacity: 88 },
    { id: crypto.randomUUID(), x: 28, y: 84, color: '#fff8e9', size: 52, opacity: 96 },
    { id: crypto.randomUUID(), x: 78, y: 78, color: '#ed674e', size: 42, opacity: 72 },
  ];
}

export function createInitialSettings(durationMs: number): EditorSettings {
  return {
    clips: [{ id: crypto.randomUUID(), sourceStartMs: 0, sourceEndMs: Math.max(durationMs, 100), timelineStartMs: 0 }],
    timelineMedia: [],
    gestureClips: [],
    textClips: [],
    zoomClips: [],
    timelineLimitMs: Math.max(durationMs, 1_000),
    frameStyle: 'default',
    borderShape: 'curved',
    cornerRadius: 32,
    cornerSmoothing: 0.72,
    borderOpacity: 100,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowStyle: 'adaptive',
    shadowOpacity: 35,
    shadowLightX: 24,
    shadowLightY: 18,
    background: {
      type: 'gradient', colorA: '#dff1ff', colorB: '#328fdf', colorC: '#fff8e9', colorD: '#86c9ff', variant: 0, meshMode: 'preset',
      scale: 100, positionX: 50, positionY: 50, blur: 0, noise: 0, noiseType: 'grain',
      meshPoints: createDefaultMeshPoints(),
    },
    media: { scale: 86, positionX: 50, positionY: 50, flipHorizontal: false, flipVertical: false },
    canvas: { ratio: '16:9', ...CANVAS_SIZES['16:9'] },
    sceneSpeed: 1,
  };
}
