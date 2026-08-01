import { Check, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { RIO_CONTENT_COLORS } from '../editor/designPresets';
import { useEditorStore } from '../editor/store';
import { createDefaultMeshPoints, getBackgroundCss, getNoiseStyle, GRADIENT_PALETTES, type MeshPoint, type NoiseType } from '../editor/types';
import { EditorRange } from './EditorRange';



import { useHistoryStore } from '../editor/history';

const LAYOUTS = [
  { label: 'Corners', positions: [[12, 14], [88, 16], [16, 86], [86, 84]] },
  { label: 'Bloom', positions: [[24, 28], [70, 18], [48, 72], [86, 78]] },
  { label: 'Orbit', positions: [[50, 8], [88, 48], [50, 90], [12, 54]] },
  { label: 'Editorial', positions: [[4, 35], [38, 10], [72, 55], [96, 78]] },
  { label: 'Cloud', positions: [[22, 64], [48, 30], [72, 62], [88, 20]] },
] as const;
const NOISES: Array<{ value: NoiseType; label: string }> = [{ value: 'grain', label: 'Grain' }, { value: 'paper', label: 'Paper' }, { value: 'dots', label: 'Dots' }, { value: 'scanlines', label: 'Lines' }];

export function MeshEditorModal({ onClose }: { onClose: () => void }) {
  const background = useEditorStore((state) => state.background);
  const update = useEditorStore((state) => state.updateBackground);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(background.meshPoints[0]?.id);
  const selected = background.meshPoints.find((point) => point.id === selectedId);

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  const setPoints = (meshPoints: MeshPoint[]) => update({ type: 'mesh', meshMode: 'custom', meshPoints });
  const patchPoint = (id: string, patch: Partial<MeshPoint>) => setPoints(background.meshPoints.map((point) => point.id === id ? { ...point, ...patch } : point));
  const movePoint = (event: React.PointerEvent, point: MeshPoint) => {
    event.preventDefault(); event.stopPropagation(); setSelectedId(point.id);
    useHistoryStore.getState().beginTransaction('Move mesh point');
    const bounds = surfaceRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const move = (moveEvent: PointerEvent) => patchPoint(point.id, {
      x: Math.max(0, Math.min(100, (moveEvent.clientX - bounds.left) / bounds.width * 100)),
      y: Math.max(0, Math.min(100, (moveEvent.clientY - bounds.top) / bounds.height * 100)),
    });
    const stop = () => { 
      window.removeEventListener('pointermove', move); 
      window.removeEventListener('pointerup', stop); 
      useHistoryStore.getState().commitTransaction();
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', stop, { once: true });
  };
  const applyPalette = (palette: readonly string[]) => {
    useHistoryStore.getState().record('Apply mesh palette');
    setPoints(background.meshPoints.map((point, index) => ({ ...point, color: palette[index % palette.length] })));
  };
  const addPoint = () => {
    useHistoryStore.getState().record('Add mesh point');
    const point: MeshPoint = { id: crypto.randomUUID(), x: 50, y: 50, color: RIO_CONTENT_COLORS.primaryLight, size: 42, opacity: 90 };
    setPoints([...background.meshPoints, point]); setSelectedId(point.id);
  };

  return <div role="dialog" aria-modal="true" aria-label="Mesh background editor" className="fixed inset-0 z-[200] grid place-items-center bg-ink/25 p-5 backdrop-blur-sm" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="flex h-[min(720px,calc(100vh-32px))] w-[min(1040px,calc(100vw-32px))] flex-col overflow-hidden rounded-3xl border border-white/70 bg-surface shadow-2xl shadow-ink/25">
      <header className="flex items-center justify-between border-b border-border px-5 py-3.5"><div><h2 className="text-sm font-semibold">Mesh studio</h2><p className="text-[10px] text-muted">Build a soft multi-point background. Drag the lights directly.</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => { useHistoryStore.getState().record('Reset mesh'); setPoints(createDefaultMeshPoints()); }} className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[10px] font-semibold hover:bg-control"><RotateCcw className="size-3" /> Reset</button><button type="button" onClick={onClose} aria-label="Close mesh editor" className="rounded-xl p-2 hover:bg-control-hover"><X className="size-4" /></button></div></header>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_270px]">
        <div className="flex min-h-0 flex-col gap-3 bg-cream-100/50 p-5">
          <div ref={surfaceRef} className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/80 shadow-xl shadow-ink/10">
            <div className="absolute inset-0 scale-105" style={{ background: getBackgroundCss({ ...background, type: 'mesh' }), filter: background.blur ? `blur(${background.blur}px)` : undefined }} />
            {background.noise > 0 && <div className="pointer-events-none absolute inset-0" style={{ opacity: background.noise / 100, ...getNoiseStyle(background.noiseType) }} />}
            {background.meshPoints.map((point, index) => <button key={point.id} type="button" aria-label={`Mesh point ${index + 1}`} onPointerDown={(event) => movePoint(event, point)} className={`absolute size-7 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-[3px] border-white shadow-lg transition active:cursor-grabbing ${selectedId === point.id ? 'ring-4 ring-primary-300/60' : ''}`} style={{ left: `${point.x}%`, top: `${point.y}%`, background: point.color }}><span className="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink/50" /></button>)}
          </div>
          <div className="flex items-center justify-between"><p className="text-[10px] text-muted">Tip: overlap large points for smooth Figma-style color clouds.</p><button type="button" onClick={addPoint} className="flex items-center gap-1.5 rounded-xl bg-primary-500 px-3 py-2 text-[10px] font-semibold text-on-primary hover:bg-primary-600"><Plus className="size-3.5" /> Add point</button></div>
        </div>
        <aside className="min-h-0 overflow-y-auto border-l border-border p-4">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted">Layouts</p>
          <div className="grid grid-cols-5 gap-1.5">{LAYOUTS.map((layout) => <button key={layout.label} type="button" title={layout.label} onClick={() => { useHistoryStore.getState().record('Change mesh layout'); setPoints(background.meshPoints.map((point, index) => ({ ...point, x: layout.positions[index % layout.positions.length][0], y: layout.positions[index % layout.positions.length][1] }))); }} className="relative aspect-square rounded-lg border border-border bg-selection">{layout.positions.map(([x, y], index) => <span key={index} className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500" style={{ left: `${x}%`, top: `${y}%` }} />)}</button>)}</div>
          <p className="mb-2 mt-4 text-[9px] font-semibold uppercase tracking-wider text-muted">Palettes</p><div className="grid grid-cols-5 gap-1.5">{GRADIENT_PALETTES.map((palette, index) => <button key={index} type="button" aria-label={`Mesh palette ${index + 1}`} onClick={() => applyPalette(palette)} className="aspect-square rounded-lg border-2 border-surface shadow-sm hover:border-primary-300" style={{ background: `linear-gradient(135deg,${palette.join(',')})` }} />)}</div>
          <div className="my-4 h-px bg-border" />
          <div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold">Color points</p><span className="rounded-full bg-selection px-2 py-1 text-[9px] text-primary-700">{background.meshPoints.length} points</span></div>
          <div className="mb-4 grid grid-cols-5 gap-1.5">{background.meshPoints.map((point, index) => <button key={point.id} type="button" onClick={() => setSelectedId(point.id)} aria-label={`Select point ${index + 1}`} className={`relative aspect-square rounded-xl border-2 ${selectedId === point.id ? 'border-primary-500' : 'border-border'}`} style={{ background: point.color }}>{selectedId === point.id && <Check className="absolute bottom-1 right-1 size-3 rounded-full bg-white p-0.5 text-primary-600" />}</button>)}</div>
          {selected && <div className="space-y-3 rounded-2xl border border-border bg-control p-3"><label className="flex items-center justify-between text-[10px] text-muted">Point color <input type="color" value={selected.color} onChange={(event) => patchPoint(selected.id, { color: event.target.value })} onBlur={() => useHistoryStore.getState().record('Change mesh point color')} className="size-8 cursor-pointer rounded-lg border-0 bg-transparent" /></label><EditorRange label="Glow size" value={selected.size} min={12} max={80} suffix="%" onChange={(size) => patchPoint(selected.id, { size })} /><EditorRange label="Opacity" value={selected.opacity} min={0} max={100} suffix="%" onChange={(opacity) => patchPoint(selected.id, { opacity })} /><button type="button" disabled={background.meshPoints.length <= 2} onClick={() => { useHistoryStore.getState().record('Remove mesh point'); setPoints(background.meshPoints.filter((point) => point.id !== selected.id)); setSelectedId(background.meshPoints.find((point) => point.id !== selected.id)?.id); }} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-danger-border py-2 text-[10px] font-semibold text-danger hover:bg-danger-soft disabled:opacity-30"><Trash2 className="size-3" /> Remove point</button></div>}
          <div className="my-4 h-px bg-border" />
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted">Texture</p><div className="mb-3 grid grid-cols-4 gap-1">{NOISES.map((noise) => <button key={noise.value} type="button" onClick={() => update({ noiseType: noise.value, noise: Math.max(10, background.noise) })} className={`rounded-lg border p-1 ${background.noiseType === noise.value ? 'border-selection-border' : 'border-border'}`}><span className="block h-6 rounded bg-primary-200" style={getNoiseStyle(noise.value)} /><span className="mt-1 block text-[9px] text-muted">{noise.label}</span></button>)}</div>
          <div className="space-y-3"><EditorRange label="Background blur" value={background.blur} min={0} max={40} suffix="px" onChange={(blur) => update({ blur })} /><EditorRange label="Noise opacity" value={background.noise} min={0} max={40} suffix="%" onChange={(noise) => update({ noise })} /></div>
        </aside>
      </div>
    </div>
  </div>;
}
