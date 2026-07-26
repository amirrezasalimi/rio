import { MousePointer2, Move, MousePointerClick, Palette, Sparkles, WandSparkles } from 'lucide-react';

import { useEditorStore } from '../editor/store';
import type { GestureAction, GestureAnimation, GestureSettings } from '../editor/types';
import { EditorRange } from './EditorRange';

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

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-xl border border-border bg-cream-50 px-2.5 py-2 text-[9px] font-semibold text-muted">
      {label}
      <span className="relative size-7 overflow-hidden rounded-lg border border-border shadow-sm" style={{ background: value }}>
        <input aria-label={`${label} color`} type="color" value={value} onChange={(event) => onChange(event.currentTarget.value)} className="absolute -inset-2 size-12 cursor-pointer opacity-0" />
      </span>
    </label>
  );
}

export function GestureSettingsPanel() {
  const selectedId = useEditorStore((state) => state.selectedTimelineItem?.kind === 'gesture' ? state.selectedTimelineItem.id : undefined);
  const clip = useEditorStore((state) => state.gestureClips.find((item) => item.id === selectedId));
  const updateGestureSettings = useEditorStore((state) => state.updateGestureSettings);
  if (!clip) return null;

  const update = (patch: Partial<GestureSettings>) => updateGestureSettings(clip.id, patch);
  const setAction = (action: GestureAction, enabled: boolean) => update({ enabled: { ...clip.settings.enabled, [action]: enabled } });

  return (
    <div>
      <section className="border-b border-border px-4 py-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-ink"><MousePointerClick className="size-3.5 text-primary-600" /> Recorded actions</div>
        <div className="space-y-1.5">
          {ACTIONS.map((action) => (
            <div key={action.value} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-cream-50 px-2.5 py-2 transition hover:border-primary-200">
              <span className="min-w-0"><span className="block text-[10px] font-semibold text-ink">{action.label}</span><span className="block truncate text-[8px] text-muted">{action.description}</span></span>
              <MiniSwitch label={`Enable ${action.label}`} checked={clip.settings.enabled[action.value]} onChange={(checked) => setAction(action.value, checked)} />
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-border px-4 py-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-ink"><WandSparkles className="size-3.5 text-primary-600" /> Animation</div>
        <div className="grid grid-cols-3 gap-1.5">
          {ANIMATIONS.map((animation) => (
            <button key={animation.value} type="button" onClick={() => update({ animation: animation.value })} className={`rounded-xl border px-2 py-2.5 text-[9px] font-semibold transition ${clip.settings.animation === animation.value ? 'border-primary-400 bg-primary-50 text-primary-800' : 'border-border bg-cream-50 text-muted hover:border-primary-200'}`}>
              <span className={`mx-auto mb-1.5 block rounded-full bg-primary-400 ${animation.value === 'pulse' ? 'size-3 shadow-[0_0_0_5px_rgba(50,143,223,.16)]' : animation.value === 'ripple' ? 'size-5 border-2 border-primary-500 bg-transparent' : 'size-4 rotate-45 rounded-sm'}`} />
              {animation.label}
            </button>
          ))}
        </div>
        <EditorRange className="mt-3" label="Effect duration" value={clip.settings.durationMs} min={200} max={1_500} step={50} suffix="ms" onChange={(durationMs) => update({ durationMs })} />
        <EditorRange className="mt-3" label="Effect size" value={clip.settings.effectSize} min={20} max={140} suffix="px" onChange={(effectSize) => update({ effectSize })} />
        <EditorRange className="mt-3" label="Opacity" value={clip.settings.opacity} min={10} max={100} suffix="%" onChange={(opacity) => update({ opacity })} />
      </section>

      <section className="border-b border-border px-4 py-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-ink"><Palette className="size-3.5 text-primary-600" /> Colors</div>
        <div className="grid grid-cols-2 gap-1.5">
          <ColorControl label="Cursor" value={clip.settings.cursorColor} onChange={(cursorColor) => update({ cursorColor })} />
          <ColorControl label="Click" value={clip.settings.clickColor} onChange={(clickColor) => update({ clickColor })} />
          <ColorControl label="Drag" value={clip.settings.dragColor} onChange={(dragColor) => update({ dragColor })} />
          <ColorControl label="Scroll" value={clip.settings.scrollColor} onChange={(scrollColor) => update({ scrollColor })} />
        </div>
      </section>

      <section className="px-4 py-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-ink"><Sparkles className="size-3.5 text-primary-600" /> Pointer style</div>
        <EditorRange label="Cursor size" value={clip.settings.cursorSize} min={8} max={48} suffix="px" onChange={(cursorSize) => update({ cursorSize })} />
        <EditorRange className="mt-3" label="Drag trail" value={clip.settings.trailWidth} min={1} max={18} suffix="px" onChange={(trailWidth) => update({ trailWidth })} />
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary-100 bg-primary-50/70 p-2.5 text-[8px] leading-relaxed text-primary-800"><Move className="size-3.5 shrink-0" /><span>Gesture timing follows edited recording clips. Move or trim this layer to retime the effects.</span><MousePointer2 className="size-3.5 shrink-0" /></div>
      </section>
    </div>
  );
}
