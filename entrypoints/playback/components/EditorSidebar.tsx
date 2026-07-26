import { Check, Frame, Gauge, LayoutTemplate, Palette, Shapes, Sparkles } from 'lucide-react';
import type { ComponentType } from 'react';
import { useEditorStore } from '../editor/store';
import type { BorderShape, ClipVisualSettings, FrameStyle, ShadowStyle } from '../editor/types';
import { getClipVisualSettings, getPlaybackRate } from '../editor/types';
import { BackgroundPanel } from './BackgroundPanel';
import { CanvasPanel } from './CanvasPanel';
import { EditorRange } from './EditorRange';
import { GestureSettingsPanel } from './GestureSettingsPanel';
import { TextSettingsPanel } from './TextSettingsPanel';

const FRAME_STYLES: Array<{ value: FrameStyle; label: string }> = [
  { value: 'default', label: 'Default' },
  { value: 'glass-light', label: 'Glass light' },
  { value: 'glass-dark', label: 'Glass dark' },
  { value: 'liquid-glass', label: 'Liquid Glass' },
  { value: 'inset-light', label: 'Inset light' },
  { value: 'inset-dark', label: 'Inset dark' },
  { value: 'outline', label: 'Outline' },
  { value: 'border', label: 'Border' },
];

function Section({ icon: Icon, title, children }: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border px-4 py-4 last:border-0">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-ink">
        <Icon className="size-3.5 text-primary-600" /> {title}
      </div>
      {children}
    </section>
  );
}

function framePreview(style: FrameStyle): React.CSSProperties {
  if (style === 'glass-light') return { background: 'rgba(255,255,255,.55)', border: '1px solid white', boxShadow: '0 5px 12px rgba(24,50,74,.14)' };
  if (style === 'glass-dark') return { background: 'rgba(24,50,74,.68)', border: '1px solid rgba(255,255,255,.3)' };
  if (style === 'liquid-glass') return { background: 'linear-gradient(135deg,rgba(255,255,255,.8),rgba(134,201,255,.28))', border: '1px solid white', boxShadow: 'inset 0 0 8px white' };
  if (style === 'inset-light') return { background: '#fffdf8', boxShadow: 'inset 0 4px 8px rgba(24,50,74,.18)' };
  if (style === 'inset-dark') return { background: '#18324a', boxShadow: 'inset 0 4px 8px rgba(0,0,0,.4)' };
  if (style === 'outline') return { background: '#86c9ff', outline: '2px solid white', outlineOffset: 2 };
  if (style === 'border') return { background: '#86c9ff', border: '4px solid #fffdf8' };
  return { background: '#86c9ff' };
}

function LightBox({ x, y, onChange }: { x: number; y: number; onChange: (x: number, y: number) => void }) {
  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const update = (clientX: number, clientY: number) => onChange(
      Math.max(0, Math.min(100, (clientX - bounds.left) / bounds.width * 100)),
      Math.max(0, Math.min(100, (clientY - bounds.top) / bounds.height * 100)),
    );
    update(event.clientX, event.clientY);
    const onMove = (moveEvent: PointerEvent) => update(moveEvent.clientX, moveEvent.clientY);
    const stop = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop, { once: true });
  };

  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[10px] text-muted">
        <span>Light direction</span><span className="font-mono text-ink">{Math.round(x)} · {Math.round(y)}</span>
      </div>
      <div role="application" aria-label="Move adaptive shadow light" onPointerDown={move} className="relative h-24 cursor-crosshair overflow-hidden rounded-2xl border border-primary-200 bg-[radial-gradient(circle_at_25%_20%,white,transparent_32%),linear-gradient(145deg,var(--color-primary-100),var(--color-primary-300))] shadow-inner">
        <div className="absolute left-1/2 top-1/2 h-10 w-14 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-surface shadow-xl" style={{ boxShadow: `${(50 - x) * .2}px ${(50 - y) * .2}px 14px rgba(24,50,74,.35)` }} />
        <span className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary-600 shadow-md" style={{ left: `${x}%`, top: `${y}%` }} />
      </div>
    </div>
  );
}

export function EditorSidebar() {
  const store = useEditorStore();
  const shapes: BorderShape[] = ['curved', 'rounded', 'sharp'];
  const shadows: ShadowStyle[] = ['none', 'spread', 'huge', 'adaptive'];
  const selectedText = store.selectedTimelineItem?.kind === 'text'
    ? store.textClips.find((clip) => clip.id === store.selectedTimelineItem?.id)
    : undefined;
  const selectedGesture = store.selectedTimelineItem?.kind === 'gesture'
    ? store.gestureClips.find((clip) => clip.id === store.selectedTimelineItem?.id)
    : undefined;
  const selectedClip = store.selectedTimelineItem?.kind === 'recording'
    ? store.clips.find((clip) => clip.id === store.selectedTimelineItem?.id)
    : undefined;
  const selectedMedia = store.selectedTimelineItem?.kind === 'media'
    ? store.timelineMedia.find((item) => item.id === store.selectedTimelineItem?.id)
    : undefined;
  const selectedVisualMedia = selectedMedia && selectedMedia.type !== 'audio' ? selectedMedia : undefined;
  const visual = selectedClip
    ? getClipVisualSettings(selectedClip, store)
    : selectedVisualMedia
      ? { ...store, ...selectedVisualMedia.visual }
      : store;
  const updateVisual = (patch: Partial<ClipVisualSettings>) => {
    if (selectedClip) store.updateSelectedClipVisual(patch);
    else if (selectedVisualMedia) {
      store.updateTimelineMediaItem(selectedVisualMedia.id, {
        visual: { ...selectedVisualMedia.visual, ...patch },
      });
    }
  };
  const hasSelection = Boolean(selectedClip || selectedMedia || selectedGesture || selectedText);
  const supportsVisualSettings = Boolean(selectedClip || selectedVisualMedia);
  const speedItem = selectedClip ?? (selectedMedia?.type === 'video' ? selectedMedia : undefined);
  const playbackRate = speedItem ? getPlaybackRate(speedItem) : 1;
  const updatePlaybackRate = (rate: number) => {
    if (selectedClip) store.updateSelectedClip({ playbackRate: rate });
    else if (selectedMedia?.type === 'video') store.updateTimelineMediaItem(selectedMedia.id, { playbackRate: rate });
  };
  const selectedLabel = selectedMedia
    ? `${selectedMedia.type[0].toUpperCase()}${selectedMedia.type.slice(1)} settings`
    : selectedClip
      ? 'Recording settings'
      : selectedGesture
        ? 'Gesture effects'
        : selectedText
          ? 'Text settings'
          : 'Project settings';

  return (
    <aside className="min-h-0 overflow-y-auto border-r border-border bg-surface">
      <div className="sticky top-0 z-20 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-primary-700">{hasSelection ? 'Selected item' : 'Canvas'}</p>
        <p className="mt-0.5 truncate text-xs font-semibold text-ink">{selectedMedia?.name ?? selectedLabel}</p>
      </div>

      {selectedGesture && <GestureSettingsPanel />}
      {selectedText && <TextSettingsPanel />}

      {speedItem && <Section icon={Gauge} title="Playback speed">
        <div className="grid grid-cols-5 gap-1">{[0.5, 0.75, 1, 1.5, 2].map((rate) => <button key={rate} type="button" onClick={() => updatePlaybackRate(rate)} className={`rounded-lg border px-1 py-2 font-mono text-[9px] font-semibold transition ${playbackRate === rate ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-border bg-cream-50 text-muted hover:border-primary-200'}`}>{rate}×</button>)}</div>
        <EditorRange className="mt-3" label="Custom speed" value={playbackRate} min={0.25} max={4} step={0.05} suffix="×" onChange={updatePlaybackRate} />
        <p className="mt-2 text-[8px] leading-relaxed text-muted">Higher speed shortens the clip on the timeline. Source trimming remains non-destructive.</p>
      </Section>}

      {!selectedGesture && !selectedText && supportsVisualSettings && <Section icon={Frame} title="Media frame">
        <div className="grid grid-cols-2 gap-1.5">
          {FRAME_STYLES.map((style) => (
            <button key={style.value} type="button" onClick={() => updateVisual({ frameStyle: style.value })} className={`rounded-xl border p-1.5 text-left transition ${visual.frameStyle === style.value ? 'border-primary-400 bg-primary-50' : 'border-border bg-cream-50 hover:border-primary-200'}`}>
              <span className="relative block h-10 rounded-lg bg-[linear-gradient(135deg,var(--color-cream-200),var(--color-primary-200))]"><span className="absolute inset-2 rounded-md" style={framePreview(style.value)} /></span>
              <span className="mt-1 flex items-center justify-between px-0.5 text-[9px] font-semibold text-muted">{style.label}{visual.frameStyle === style.value && <Check className="size-3 text-primary-600" />}</span>
            </button>
          ))}
        </div>
      </Section>}

      {!selectedGesture && !selectedText && supportsVisualSettings && <Section icon={Shapes} title="Border shape">
        <div className="grid grid-cols-3 gap-1.5">
          {shapes.map((shape) => (
            <button key={shape} type="button" onClick={() => updateVisual({ borderShape: shape })} className={`rounded-xl border p-1.5 ${visual.borderShape === shape ? 'border-primary-400 bg-primary-50' : 'border-border'}`}>
              <span className="mx-auto block h-9 w-12 bg-primary-300" style={{ borderRadius: shape === 'sharp' ? 0 : shape === 'rounded' ? 10 : '42% 42% 36% 36% / 52% 52% 34% 34%' }} />
              <span className="mt-1 block text-[9px] font-semibold capitalize text-muted">{shape}</span>
            </button>
          ))}
        </div>
        {visual.borderShape !== 'sharp' && <EditorRange className="mt-3" label="Radius" value={visual.cornerRadius} min={8} max={72} suffix="px" onChange={(cornerRadius) => updateVisual({ cornerRadius })} />}
        {visual.borderShape === 'curved' && <EditorRange className="mt-3" label="Curve" value={visual.cornerSmoothing} min={0} max={1} step={0.01} onChange={(cornerSmoothing) => updateVisual({ cornerSmoothing })} />}
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <EditorRange label="Stroke" value={visual.borderWidth} min={0} max={16} suffix="px" onChange={(borderWidth) => updateVisual({ borderWidth })} />
          <label className="block text-[10px] text-muted">Color<input aria-label="Border color" type="color" value={visual.borderColor} onChange={(event) => updateVisual({ borderColor: event.target.value })} className="mt-1 block size-8 cursor-pointer rounded-lg border-0 bg-transparent" /></label>
        </div>
        <EditorRange className="mt-3" label="Border opacity" value={visual.borderOpacity} min={0} max={100} suffix="%" onChange={(borderOpacity) => updateVisual({ borderOpacity })} />
        <div className="mt-2 flex gap-1.5">{['#ffffff', '#328fdf', '#ed674e', '#18324a'].map((color) => <button key={color} type="button" aria-label={`Border color ${color}`} onClick={() => updateVisual({ borderColor: color })} className="size-6 rounded-full border-2 border-white shadow-sm" style={{ background: color }} />)}</div>
      </Section>}

      {!hasSelection && <Section icon={Palette} title="Background"><BackgroundPanel /></Section>}
      {!hasSelection && <Section icon={LayoutTemplate} title="Canvas"><CanvasPanel mode="general" /></Section>}
      {hasSelection && !selectedGesture && !selectedText && <Section icon={LayoutTemplate} title={selectedMedia ? `${selectedMedia.type[0].toUpperCase()}${selectedMedia.type.slice(1)} controls` : 'Recording controls'}><CanvasPanel mode="selection" /></Section>}

      {!selectedGesture && !selectedText && supportsVisualSettings && <Section icon={Sparkles} title="Shadow">
        <div className="grid grid-cols-4 gap-1.5">
          {shadows.map((shadow) => (
            <button key={shadow} type="button" onClick={() => updateVisual({ shadowStyle: shadow })} className={`rounded-xl border px-1 py-2 ${visual.shadowStyle === shadow ? 'border-primary-400 bg-primary-50' : 'border-border'}`}>
              <span className="mx-auto block size-7 rounded-lg bg-surface" style={{ boxShadow: shadow === 'none' ? 'none' : shadow === 'spread' ? '0 5px 8px 3px rgba(24,50,74,.2)' : shadow === 'huge' ? '0 8px 14px rgba(24,50,74,.32)' : '5px 6px 10px rgba(50,143,223,.35)' }} />
              <span className="mt-1.5 block truncate text-[8px] font-semibold capitalize text-muted">{shadow}</span>
            </button>
          ))}
        </div>
        {visual.shadowStyle !== 'none' && <EditorRange className="mt-3" label="Opacity" value={visual.shadowOpacity} min={0} max={100} suffix="%" onChange={(shadowOpacity) => updateVisual({ shadowOpacity })} />}
        {visual.shadowStyle === 'adaptive' && <div className="mt-3"><LightBox x={visual.shadowLightX} y={visual.shadowLightY} onChange={(shadowLightX, shadowLightY) => updateVisual({ shadowLightX, shadowLightY })} /></div>}
      </Section>}
    </aside>
  );
}
