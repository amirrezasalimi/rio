import { Minus, Plus } from 'lucide-react';
import type { CSSProperties } from 'react';

export function TimelineZoomControls({ zoom, min, max, step, onChange }: { zoom: number; min: number; max: number; step: number; onChange: (zoom: number) => void }) {
  return (
    <div className="flex items-center rounded-xl border border-border bg-control p-1">
      <button type="button" aria-label="Zoom timeline out" disabled={zoom <= min} onClick={() => onChange(zoom - step)} className="rounded-lg p-1.5 hover:bg-surface disabled:opacity-25"><Minus className="size-3.5" /></button>
      <button type="button" title="Fit timeline" onClick={() => onChange(1)} className="min-w-11 rounded-lg px-1.5 py-1 text-center font-mono text-[9px] font-semibold hover:bg-surface">{Math.round(zoom * 100)}%</button>
      <input aria-label="Timeline zoom" title="Timeline zoom" type="range" min={min} max={max} step={step} value={zoom} onChange={(event) => onChange(event.currentTarget.valueAsNumber)} className="rio-range w-24" style={{ '--rio-range-progress': `${((zoom - min) / (max - min)) * 100}%` } as CSSProperties} />
      <button type="button" aria-label="Zoom timeline in" disabled={zoom >= max} onClick={() => onChange(zoom + step)} className="rounded-lg p-1.5 hover:bg-surface disabled:opacity-25"><Plus className="size-3.5" /></button>
    </div>
  );
}
