import { CircleDot, Focus, Trash2 } from 'lucide-react';
import { useEditorStore } from '../editor/store';
import type { ZoomAnimation, ZoomTarget } from '../editor/types';
import { EditorRange } from './EditorRange';

const ANIMATIONS: Array<{ value: ZoomAnimation; label: string; description: string }> = [
  { value: 'smooth', label: 'Smooth', description: 'Soft ease on both sides' },
  { value: 'ease-in', label: 'Ease in', description: 'Starts slowly' },
  { value: 'ease-out', label: 'Ease out', description: 'Settles gently' },
  { value: 'linear', label: 'Linear', description: 'Constant speed' },
  { value: 'snap', label: 'Snap', description: 'Instant change' },
];

export function ZoomSettingsPanel() {
  const store = useEditorStore();
  const clip = store.selectedTimelineItem?.kind === 'zoom' ? store.zoomClips.find((item) => item.id === store.selectedTimelineItem?.id) : undefined;
  if (!clip) return null;
  const point = clip.points.find((item) => item.id === clip.selectedPointId);
  const targets: Array<{ value: ZoomTarget; label: string }> = [
    { value: { kind: 'canvas' }, label: 'Whole canvas' },
    ...store.clips.map((item, index) => ({ value: { kind: 'recording' as const, id: item.id }, label: `Recording clip ${index + 1}` })),
    ...store.timelineMedia.filter((item) => item.type !== 'audio').map((item) => ({ value: { kind: 'media' as const, id: item.id }, label: item.name })),
  ];
  const targetValue = clip.target.kind === 'canvas' ? 'canvas' : `${clip.target.kind}:${clip.target.id}`;
  const updateTarget = (value: string) => {
    if (value === 'canvas') return store.updateZoomClip(clip.id, { target: { kind: 'canvas' } });
    const [kind, id] = value.split(':');
    store.updateZoomClip(clip.id, { target: { kind: kind as 'recording' | 'media', id } });
  };

  return <>
    <section className="border-b border-border px-4 py-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold"><Focus className="size-3.5 text-primary-600" /> Scene to zoom</div>
      <select aria-label="Scene to zoom" value={targetValue} onChange={(event) => updateTarget(event.currentTarget.value)} className="w-full rounded-xl border border-border bg-cream-50 px-3 py-2 text-[10px] font-semibold outline-none focus:border-primary-400">
        {targets.map((target) => <option key={target.value.kind === 'canvas' ? 'canvas' : `${target.value.kind}:${target.value.id}`} value={target.value.kind === 'canvas' ? 'canvas' : `${target.value.kind}:${target.value.id}`}>{target.label}</option>)}
      </select>
      <p className="mt-2 text-[8px] leading-relaxed text-muted">Choose one visual clip or zoom the composed canvas including its background and overlays.</p>
    </section>
    <section className="border-b border-border px-4 py-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold"><CircleDot className="size-3.5 text-primary-600" /> Animation</div>
      <div className="space-y-1">{ANIMATIONS.map((animation) => <button key={animation.value} type="button" onClick={() => store.updateZoomClip(clip.id, { animation: animation.value })} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${clip.animation === animation.value ? 'border-primary-400 bg-primary-50' : 'border-border bg-cream-50 hover:border-primary-200'}`}><span className="text-[9px] font-semibold">{animation.label}</span><span className="text-[8px] text-muted">{animation.description}</span></button>)}</div>
      {clip.animation !== 'snap' && <EditorRange className="mt-3" label="Transition duration" value={(clip.transitionDurationMs ?? 400) / 1_000} min={0.1} max={2} step={0.05} suffix="s" onChange={(seconds) => store.updateZoomClip(clip.id, { transitionDurationMs: seconds * 1_000 })} />}
      <p className="mt-2 text-[8px] leading-relaxed text-muted">Each point starts a short transition, then holds its zoom until the next point.</p>
    </section>
    {point && <section className="border-b border-border px-4 py-4">
      <div className="mb-1 flex items-center justify-between"><div><p className="text-xs font-semibold">Selected zoom point</p><p className="text-[8px] text-muted">Drag on canvas · wheel changes level</p></div><button type="button" aria-label="Delete selected zoom point" onClick={() => store.updateZoomClip(clip.id, { points: clip.points.filter((item) => item.id !== point.id), selectedPointId: undefined })} className="rounded-lg p-2 text-danger hover:bg-accent-50"><Trash2 className="size-3.5" /></button></div>
      <EditorRange className="mt-3" label="Zoom level" value={point.zoom} min={1} max={5} step={0.1} suffix="×" onChange={(zoom) => store.updateZoomPoint(clip.id, point.id, { zoom })} />
      <EditorRange className="mt-2" label="Point time" value={point.timeMs / 1_000} min={0} max={clip.durationMs / 1_000} step={0.05} suffix="s" onChange={(seconds) => store.updateZoomPoint(clip.id, point.id, { timeMs: seconds * 1_000 })} />
    </section>}
  </>;
}
