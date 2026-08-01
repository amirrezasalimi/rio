import { CircleDot, Focus, Trash2 } from 'lucide-react';
import { useEditorStore } from '../editor/store';
import type { ZoomAnimation, ZoomTarget } from '../editor/types';
import { EditorRange } from './EditorRange';
import { InspectorSection } from './InspectorSection';

import { useHistoryStore } from '../editor/history';

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
    useHistoryStore.getState().record('Change zoom scene');
    if (value === 'canvas') return store.updateZoomClip(clip.id, { target: { kind: 'canvas' } });
    const [kind, id] = value.split(':');
    store.updateZoomClip(clip.id, { target: { kind: kind as 'recording' | 'media', id } });
  };

  return <>
    <InspectorSection icon={Focus} title="Target" summary={targets.find((target) => (target.value.kind === 'canvas' ? 'canvas' : `${target.value.kind}:${target.value.id}`) === targetValue)?.label} defaultOpen>
      <select aria-label="Scene to zoom" value={targetValue} onChange={(event) => updateTarget(event.currentTarget.value)} className="w-full rounded-xl border border-border bg-control px-3 py-2 text-[10px] font-semibold outline-none focus:border-selection-border">
        {targets.map((target) => <option key={target.value.kind === 'canvas' ? 'canvas' : `${target.value.kind}:${target.value.id}`} value={target.value.kind === 'canvas' ? 'canvas' : `${target.value.kind}:${target.value.id}`}>{target.label}</option>)}
      </select>
      <p className="mt-2 text-[9px] leading-relaxed text-muted">Choose one visual clip or zoom the composed canvas including its background and overlays.</p>
    </InspectorSection>
    {point && <InspectorSection icon={CircleDot} title="Selected point" summary={`${point.zoom}× · ${(point.timeMs / 1_000).toFixed(2)}s`} defaultOpen>
      <div className="mb-1 flex items-center justify-between"><p className="text-[9px] text-muted">Drag on canvas · wheel changes level</p><button type="button" aria-label="Delete selected zoom point" onClick={() => { useHistoryStore.getState().record('Delete zoom point'); store.updateZoomClip(clip.id, { points: clip.points.filter((item) => item.id !== point.id), selectedPointId: undefined }); }} className="rounded-lg p-2 text-danger hover:bg-danger-soft"><Trash2 className="size-3.5" /></button></div>
      <EditorRange className="mt-3" label="Zoom level" value={point.zoom} min={1} max={5} step={0.1} suffix="×" onChange={(zoom) => store.updateZoomPoint(clip.id, point.id, { zoom })} />
      <EditorRange className="mt-2" label="Point time" value={point.timeMs / 1_000} min={0} max={clip.durationMs / 1_000} step={0.05} suffix="s" onChange={(seconds) => store.updateZoomPoint(clip.id, point.id, { timeMs: seconds * 1_000 })} />
    </InspectorSection>}
    <InspectorSection icon={CircleDot} title="Transition" summary={ANIMATIONS.find((animation) => animation.value === clip.animation)?.label}>
      <div className="space-y-1">{ANIMATIONS.map((animation) => <button key={animation.value} type="button" aria-pressed={clip.animation === animation.value} onClick={() => { useHistoryStore.getState().record('Change zoom animation'); store.updateZoomClip(clip.id, { animation: animation.value }); }} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${clip.animation === animation.value ? 'border-selection-border bg-selection' : 'border-border bg-control hover:border-primary-200'}`}><span className="text-[9px] font-semibold">{animation.label}</span><span className="text-[9px] text-muted">{animation.description}</span></button>)}</div>
      {clip.animation !== 'snap' && <EditorRange className="mt-3" label="Transition duration" value={(clip.transitionDurationMs ?? 400) / 1_000} min={0.1} max={2} step={0.05} suffix="s" onChange={(seconds) => store.updateZoomClip(clip.id, { transitionDurationMs: seconds * 1_000 })} />}
      <p className="mt-2 text-[9px] leading-relaxed text-muted">Each point starts a short transition, then holds its zoom until the next point.</p>
    </InspectorSection>
  </>;
}
