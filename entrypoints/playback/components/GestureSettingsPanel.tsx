import { MousePointer2, Move, MousePointerClick, Palette, Sparkles, WandSparkles } from 'lucide-react';

import { useEditorStore } from '../editor/store';
import type { GestureAction, GestureAnimation, GestureSettings } from '../editor/types';
import { EditorRange } from './EditorRange';
import { InspectorSection } from './InspectorSection';

const ACTIONS: Array<{ value: GestureAction; label: string; description: string }> = [
  { value: 'pointer', label: 'Pointer movement', description: 'Show the cursor as it moves.' },
  { value: 'click', label: 'Clicks', description: 'Animate single-click feedback.' },
  { value: 'double-click', label: 'Double clicks', description: 'Use a distinct two-beat effect.' },
  { value: 'drag', label: 'Drag and move', description: 'Trace drag paths and endpoints.' },
  { value: 'scroll', label: 'Scrolling', description: 'Show scroll direction and motion.' },
];

const ANIMATIONS: Array<{ value: GestureAnimation; label: string }> = [
  { value: 'pulse', label: 'Pulse' },
  { value: 'ripple', label: 'Ripple' },
  { value: 'burst', label: 'Burst' },
];

function MiniSwitch({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input aria-label={label} type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} className="peer sr-only" />
      <span className="relative h-5 w-9 rounded-full bg-border transition peer-checked:bg-primary-500 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-400 after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-4" />
    </label>
  );
}

function ColorControl({ label, value, onChange, onBlur }: { label: string; value: string; onChange: (value: string) => void; onBlur?: () => void }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-xl border border-border bg-control px-2.5 py-2 text-[9px] font-semibold text-muted">
      {label}
      <span className="relative size-7 overflow-hidden rounded-lg border border-border shadow-sm" style={{ background: value }}>
        <input aria-label={`${label} color`} type="color" value={value} onChange={(event) => onChange(event.currentTarget.value)} onBlur={onBlur} className="absolute -inset-2 size-12 cursor-pointer opacity-0" />
      </span>
    </label>
  );
}

import { useHistoryStore } from '../editor/history';

export function GestureSettingsPanel() {
  const selectedId = useEditorStore((state) => state.selectedTimelineItem?.kind === 'gesture' ? state.selectedTimelineItem.id : undefined);
  const clip = useEditorStore((state) => state.gestureClips.find((item) => item.id === selectedId));
  const updateGestureSettings = useEditorStore((state) => state.updateGestureSettings);
  const updateGestureClip = useEditorStore((state) => state.updateGestureClip);
  const sources = useEditorStore((state) => state.gestureSources);
  if (!clip) return null;

  const update = (patch: Partial<GestureSettings>) => updateGestureSettings(clip.id, patch);
  const setAction = (action: GestureAction, enabled: boolean) => { useHistoryStore.getState().record(`Toggle ${action} gesture`); update({ enabled: { ...clip.settings.enabled, [action]: enabled } }); };
  const setSource = (sourceId: string) => {
    useHistoryStore.getState().record('Change gesture source');
    const source = sources.find((item) => item.id === sourceId);
    if (!source) return;
    updateGestureClip(clip.id, { sourceAssetId: sourceId === 'current' ? undefined : sourceId, sourceStartMs: 0, sourceEndMs: source.durationMs });
  };

  return (
    <div>
      <InspectorSection icon={MousePointerClick} title="Source & actions" summary={`${clip.settings.enabled ? Object.values(clip.settings.enabled).filter(Boolean).length : 0} action types enabled`} searchTerms="video pointer movement click double click drag scroll enabled recorded" defaultOpen>
        <label className="block text-[9px] font-semibold text-muted">Source video<select value={clip.sourceAssetId ?? 'current'} onChange={(event) => setSource(event.currentTarget.value)} className="mt-1.5 w-full rounded-xl border border-border bg-control px-2.5 py-2 text-[10px] font-semibold text-ink outline-none focus:border-selection-border">{sources.map((source) => <option key={source.id} value={source.id}>{source.name} · {(source.durationMs / 1_000).toFixed(1)}s · {source.interactions.length} actions</option>)}</select></label>
        <p className="mb-2 mt-3 text-[10px] font-semibold text-ink">Recorded actions</p>
        <div className="space-y-1.5">
          {ACTIONS.map((action) => (
            <div key={action.value} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-control px-2.5 py-2 transition hover:border-primary-200">
              <span className="min-w-0"><span className="block text-[10px] font-semibold text-ink">{action.label}</span><span className="block truncate text-[9px] text-muted">{action.description}</span></span>
              <MiniSwitch label={`Enable ${action.label}`} checked={clip.settings.enabled[action.value]} onChange={(checked) => setAction(action.value, checked)} />
            </div>
          ))}
        </div>
      </InspectorSection>

      <InspectorSection icon={WandSparkles} title="Effect" summary={`${ANIMATIONS.find((animation) => animation.value === clip.settings.animation)?.label} · ${clip.settings.durationMs}ms`} searchTerms="animation pulse ripple burst duration size opacity" defaultOpen>
        <div className="grid grid-cols-3 gap-1.5">
          {ANIMATIONS.map((animation) => (
            <button key={animation.value} type="button" aria-pressed={clip.settings.animation === animation.value} onClick={() => { useHistoryStore.getState().record('Change gesture animation'); update({ animation: animation.value }); }} className={`rounded-xl border px-2 py-2.5 text-[9px] font-semibold transition ${clip.settings.animation === animation.value ? 'border-selection-border bg-selection text-primary-800' : 'border-border bg-control text-muted hover:border-primary-200'}`}>
              <span className={`mx-auto mb-1.5 block rounded-full bg-primary-400 ${animation.value === 'pulse' ? 'size-3 shadow-[0_0_0_5px_rgba(50,143,223,.16)]' : animation.value === 'ripple' ? 'size-5 border-2 border-primary-500 bg-transparent' : 'size-4 rotate-45 rounded-sm'}`} />
              {animation.label}
            </button>
          ))}
        </div>
        <EditorRange className="mt-3" label="Effect duration" value={clip.settings.durationMs} min={200} max={1_500} step={50} suffix="ms" onChange={(durationMs) => update({ durationMs })} />
        <EditorRange className="mt-3" label="Effect size" value={clip.settings.effectSize} min={20} max={140} suffix="px" onChange={(effectSize) => update({ effectSize })} />
        <EditorRange className="mt-3" label="Opacity" value={clip.settings.opacity} min={10} max={100} suffix="%" onChange={(opacity) => update({ opacity })} />
      </InspectorSection>

      <InspectorSection icon={Palette} title="Colors" summary="Cursor, click, drag and scroll" searchTerms="pointer cursor click drag scroll color">
        <div className="grid grid-cols-2 gap-1.5">
          <ColorControl label="Cursor" value={clip.settings.cursorColor} onChange={(cursorColor) => update({ cursorColor })} onBlur={() => useHistoryStore.getState().record('Change cursor color')} />
          <ColorControl label="Click" value={clip.settings.clickColor} onChange={(clickColor) => update({ clickColor })} onBlur={() => useHistoryStore.getState().record('Change click color')} />
          <ColorControl label="Drag" value={clip.settings.dragColor} onChange={(dragColor) => update({ dragColor })} onBlur={() => useHistoryStore.getState().record('Change drag color')} />
          <ColorControl label="Scroll" value={clip.settings.scrollColor} onChange={(scrollColor) => update({ scrollColor })} onBlur={() => useHistoryStore.getState().record('Change scroll color')} />
        </div>
      </InspectorSection>

      <InspectorSection icon={Sparkles} title="Pointer" summary={`${clip.settings.cursorSize}px cursor · ${clip.settings.trailWidth}px trail`} searchTerms="cursor size drag trail width timing">
        <EditorRange label="Cursor size" value={clip.settings.cursorSize} min={8} max={48} suffix="px" onChange={(cursorSize) => update({ cursorSize })} />
        <EditorRange className="mt-3" label="Drag trail" value={clip.settings.trailWidth} min={1} max={18} suffix="px" onChange={(trailWidth) => update({ trailWidth })} />
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary-100 bg-selection/70 p-2.5 text-[9px] leading-relaxed text-primary-800"><Move className="size-3.5 shrink-0" /><span>Gesture timing follows edited recording clips. Move or trim this layer to retime the effects.</span><MousePointer2 className="size-3.5 shrink-0" /></div>
      </InspectorSection>
    </div>
  );
}
