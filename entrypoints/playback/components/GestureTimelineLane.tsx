import { GripVertical, MousePointerClick, Plus, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { useEditorStore } from '../editor/store';
import type { GestureClip } from '../editor/types';
import { createDefaultGestureSettings, getGestureClipDurationMs } from '../editor/types';

const MIN_CLIP_MS = 150;
const SNAP_MS = 50;

function snap(value: number) {
  return Math.round(value / SNAP_MS) * SNAP_MS;
}

export function GestureTimelineLane({ editedRecordingDurationMs, timelineDurationMs, interactionCount, onDragStateChange }: { editedRecordingDurationMs: number; timelineDurationMs: number; interactionCount: number; onDragStateChange: (lockedDurationMs: number | undefined) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const clips = useEditorStore((state) => state.gestureClips);
  const setClips = useEditorStore((state) => state.setGestureClips);
  const selection = useEditorStore((state) => state.selectedTimelineItem);
  const setSelection = useEditorStore((state) => state.setSelectedTimelineItem);
  const selectedId = selection?.kind === 'gesture' ? selection.id : undefined;

  const addClip = () => {
    if (interactionCount === 0) return;
    const clip: GestureClip = {
      id: crypto.randomUUID(),
      sourceStartMs: 0,
      sourceEndMs: Math.max(editedRecordingDurationMs, MIN_CLIP_MS),
      timelineStartMs: 0,
      settings: createDefaultGestureSettings(),
    };
    setClips([...clips, clip]);
    setSelection({ kind: 'gesture', id: clip.id });
  };

  const startDrag = (event: React.PointerEvent, index: number, interaction: 'clip' | 'start' | 'end') => {
    event.preventDefault();
    event.stopPropagation();
    const bounds = trackRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const initial = clips[index];
    const startX = event.clientX;
    const pixelsPerMs = bounds.width / timelineDurationMs;
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    onDragStateChange(timelineDurationMs);
    setSelection({ kind: 'gesture', id: initial.id });

    const move = (moveEvent: PointerEvent) => {
      const delta = snap((moveEvent.clientX - startX) / pixelsPerMs);
      setClips(clips.map((clip, clipIndex) => {
        if (clipIndex !== index) return clip;
        if (interaction === 'clip') return { ...clip, timelineStartMs: Math.max(0, initial.timelineStartMs + delta) };
        if (interaction === 'start') {
          const sourceStartMs = Math.max(0, Math.min(initial.sourceEndMs - MIN_CLIP_MS, initial.sourceStartMs + delta));
          return { ...clip, sourceStartMs, timelineStartMs: Math.max(0, initial.timelineStartMs + sourceStartMs - initial.sourceStartMs) };
        }
        return { ...clip, sourceEndMs: Math.min(editedRecordingDurationMs, Math.max(initial.sourceStartMs + MIN_CLIP_MS, initial.sourceEndMs + delta)) };
      }));
    };
    const stop = () => {
      if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
      onDragStateChange(undefined);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
    window.addEventListener('pointercancel', stop, { once: true });
  };

  return (
    <div ref={trackRef} className="relative h-12 shrink-0 border-t border-border/70 bg-primary-50/45">
      {clips.length === 0 && <button type="button" disabled={interactionCount === 0} onClick={addClip} className="absolute inset-1 rounded-lg border border-dashed border-primary-200 text-[8px] font-semibold text-primary-700 hover:bg-primary-50 disabled:cursor-not-allowed disabled:border-border disabled:text-muted"><span className="inline-flex items-center gap-1"><Plus className="size-3" /> {interactionCount > 0 ? `Add gesture effects · ${interactionCount} actions` : 'No recorded page actions'}</span></button>}
      {clips.length > 0 && <button type="button" aria-label="Add another gesture effects clip" onClick={addClip} className="absolute right-1 top-1 z-40 rounded-lg border border-primary-200 bg-surface p-1.5 text-primary-700 shadow-sm hover:bg-primary-50"><Plus className="size-3" /></button>}
        {clips.map((clip, index) => {
          const selected = clip.id === selectedId;
          const duration = getGestureClipDurationMs(clip);
          return (
            <div key={clip.id} data-clip className="absolute bottom-1 top-1 min-w-14 touch-none" style={{ left: `${clip.timelineStartMs / timelineDurationMs * 100}%`, width: `${duration / timelineDurationMs * 100}%` }}>
              <div role="button" tabIndex={0} aria-label="Gesture effects clip" onPointerDown={(event) => startDrag(event, index, 'clip')} onClick={() => setSelection({ kind: 'gesture', id: clip.id })} className={`absolute inset-0 cursor-grab overflow-hidden rounded-lg border-2 bg-[linear-gradient(135deg,var(--color-primary-700),var(--color-accent-500))] text-white active:cursor-grabbing ${selected ? 'border-white ring-2 ring-primary-500/30' : 'border-primary-300'}`}>
                <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle,white_1px,transparent_1.5px)] [background-size:12px_12px]" />
                <span className="pointer-events-none absolute inset-y-0 left-6 right-6 flex items-center gap-1.5 truncate text-[8px] font-semibold"><MousePointerClick className="size-3.5 shrink-0" /> Gesture effects</span>
              </div>
              <button type="button" aria-label="Trim start of gesture effects" onPointerDown={(event) => startDrag(event, index, 'start')} className="absolute inset-y-0 left-0 z-20 flex w-6 -translate-x-1/2 cursor-ew-resize items-center justify-center rounded-l-lg bg-ink/75 text-white"><GripVertical className="size-3" /></button>
              <button type="button" aria-label="Trim end of gesture effects" onPointerDown={(event) => startDrag(event, index, 'end')} className="absolute inset-y-0 right-0 z-20 flex w-6 translate-x-1/2 cursor-ew-resize items-center justify-center rounded-r-lg bg-ink/75 text-white"><GripVertical className="size-3" /></button>
              {selected && <button type="button" aria-label="Remove gesture effects clip" onClick={(event) => { event.stopPropagation(); setClips(clips.filter((item) => item.id !== clip.id)); setSelection(undefined); }} className="absolute right-1 top-1 z-30 rounded-md bg-surface p-1 text-danger shadow"><Trash2 className="size-3" /></button>}
            </div>
          );
        })}
    </div>
  );
}
