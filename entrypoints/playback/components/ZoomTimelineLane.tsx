import { GripVertical, Search } from 'lucide-react';
import { useRef } from 'react';
import { deleteSelectedTimelineItem, duplicateSelectedTimelineItem } from '../editor/clipActions';
import { useEditorStore } from '../editor/store';
import { captureSelectedTimelineStarts, moveSelectedTimelineItems, selectionKey } from '../editor/timelineSelection';
import { ClipContextMenu } from './ClipContextMenu';

const MIN_CLIP_MS = 150;
const SNAP_MS = 50;
const snap = (value: number) => Math.round(value / SNAP_MS) * SNAP_MS;

export function ZoomTimelineLane({ timelineDurationMs, onDragStateChange }: { timelineDurationMs: number; onDragStateChange: (duration: number | undefined) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const clips = useEditorStore((state) => state.zoomClips);
  const setClips = useEditorStore((state) => state.setZoomClips);
  const selectItem = useEditorStore((state) => state.selectTimelineItem);
  const selectedItems = useEditorStore((state) => state.selectedTimelineItems);
  const setSelection = useEditorStore((state) => state.setSelectedTimelineItem);

  const startClipDrag = (event: React.PointerEvent, index: number, interaction: 'clip' | 'start' | 'end') => {
    event.preventDefault();
    event.stopPropagation();
    const bounds = trackRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const initial = clips[index];
    const startX = event.clientX;
    const pixelsPerMs = bounds.width / timelineDurationMs;
    const selection = { kind: 'zoom' as const, id: initial.id };
    const alreadySelected = useEditorStore.getState().selectedTimelineItems.some((item) => selectionKey(item) === selectionKey(selection));
    if (event.shiftKey) selectItem(selection, true);
    else if (!alreadySelected) selectItem(selection, false);
    setClips((current) => current.map((clip) => clip.id === initial.id ? { ...clip, selectedPointId: undefined } : clip));
    const initialStarts = captureSelectedTimelineStarts();
    const minimumStart = Math.min(...initialStarts.values());
    onDragStateChange(timelineDurationMs);
    const move = (moveEvent: PointerEvent) => {
      const delta = snap((moveEvent.clientX - startX) / pixelsPerMs);
      if (interaction === 'clip') return moveSelectedTimelineItems(Math.max(-minimumStart, delta), initialStarts);
      setClips((current) => current.map((clip) => {
        if (clip.id !== initial.id) return clip;
        if (interaction === 'start') {
          const applied = Math.max(-initial.timelineStartMs, Math.min(initial.durationMs - MIN_CLIP_MS, delta));
          return { ...clip, timelineStartMs: initial.timelineStartMs + applied, durationMs: initial.durationMs - applied, points: clip.points.map((point) => ({ ...point, timeMs: Math.max(0, point.timeMs - applied) })).filter((point) => point.timeMs <= initial.durationMs - applied) };
        }
        const durationMs = Math.max(MIN_CLIP_MS, initial.durationMs + delta);
        return { ...clip, durationMs, points: clip.points.map((point) => ({ ...point, timeMs: Math.min(point.timeMs, durationMs) })) };
      }));
    };
    const stop = () => { onDragStateChange(undefined); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
  };

  const addPoint = (event: React.PointerEvent<HTMLDivElement>, clipId: string) => {
    if ((event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    event.stopPropagation();
    const bounds = event.currentTarget.getBoundingClientRect();
    const clip = clips.find((item) => item.id === clipId);
    if (!clip) return;
    const point = { id: crypto.randomUUID(), timeMs: snap(Math.max(0, Math.min(clip.durationMs, (event.clientX - bounds.left) / bounds.width * clip.durationMs))), positionX: 50, positionY: 50, zoom: 1 };
    setClips((current) => current.map((item) => item.id === clipId ? { ...item, selectedPointId: point.id, points: [...item.points, point].sort((a, b) => a.timeMs - b.timeMs) } : item));
    setSelection({ kind: 'zoom', id: clipId });
  };

  const dragPoint = (event: React.PointerEvent<HTMLButtonElement>, clipId: string, pointId: string) => {
    event.preventDefault();
    event.stopPropagation();
    const clip = clips.find((item) => item.id === clipId);
    const point = clip?.points.find((item) => item.id === pointId);
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!clip || !point || !bounds) return;
    setClips((current) => current.map((item) => item.id === clipId ? { ...item, selectedPointId: pointId } : item));
    setSelection({ kind: 'zoom', id: clipId });
    const update = (moveEvent: PointerEvent) => setClips((current) => current.map((item) => item.id === clipId ? { ...item, points: item.points.map((candidate) => candidate.id === pointId ? { ...candidate, timeMs: snap(Math.max(0, Math.min(item.durationMs, (moveEvent.clientX - bounds.left) / bounds.width * item.durationMs))) } : candidate).sort((a, b) => a.timeMs - b.timeMs) } : item));
    const stop = () => { window.removeEventListener('pointermove', update); window.removeEventListener('pointerup', stop); };
    window.addEventListener('pointermove', update);
    window.addEventListener('pointerup', stop, { once: true });
  };

  if (clips.length === 0) return null;
  return <div ref={trackRef} className="relative h-14 shrink-0 border-t border-border/70 bg-ink/90">
    {clips.map((clip, index) => {
      const selected = selectedItems.some((item) => item.kind === 'zoom' && item.id === clip.id);
      return <div key={clip.id} data-clip className="absolute bottom-1.5 top-1.5 min-w-16 touch-none" style={{ left: `${clip.timelineStartMs / timelineDurationMs * 100}%`, width: `${clip.durationMs / timelineDurationMs * 100}%` }}>
        <div role="button" tabIndex={0} aria-label="Zoom clip. Click to add a zoom point." onPointerDown={(event) => { if (event.currentTarget === event.target) addPoint(event, clip.id); }} className={`absolute inset-0 cursor-crosshair rounded-lg border bg-ink/70 ${selected ? 'border-primary-300 ring-2 ring-primary-300/30' : 'border-white/25 hover:border-white/50'}`}>
          <span className="pointer-events-none absolute left-6 top-1 flex items-center gap-1 text-[8px] font-semibold text-white/65"><Search className="size-3" /> Zoom · click to add</span>
          {clip.points.map((point) => <button key={point.id} type="button" aria-label={`Zoom point ${point.zoom.toFixed(1)} times`} onPointerDown={(event) => dragPoint(event, clip.id, point.id)} className={`absolute bottom-1/2 z-20 -translate-x-1/2 translate-y-1/2 rounded-full border-2 bg-transparent shadow-sm transition ${point.zoom > 1.01 ? 'size-6 border-white' : 'size-3 border-white/65'} ${clip.selectedPointId === point.id ? 'ring-2 ring-primary-300 ring-offset-1 ring-offset-ink' : ''}`} style={{ left: `${point.timeMs / clip.durationMs * 100}%` }} />)}
        </div>
        <button type="button" aria-label="Trim start of zoom clip" onPointerDown={(event) => startClipDrag(event, index, 'start')} className="absolute inset-y-0 left-0 z-30 flex w-4 cursor-ew-resize items-center justify-center rounded-l-lg bg-white/15 text-white"><GripVertical className="size-3" /></button>
        <button type="button" aria-label="Trim end of zoom clip" onPointerDown={(event) => startClipDrag(event, index, 'end')} className="absolute inset-y-0 right-0 z-30 flex w-4 cursor-ew-resize items-center justify-center rounded-r-lg bg-white/15 text-white"><GripVertical className="size-3" /></button>
        <button type="button" aria-label="Move zoom clip" onPointerDown={(event) => startClipDrag(event, index, 'clip')} className="absolute bottom-0 left-5 right-5 top-7 z-10 cursor-grab bg-transparent" />
        <ClipContextMenu label="Zoom clip" onOpen={() => setSelection({ kind: 'zoom', id: clip.id })} onDuplicate={duplicateSelectedTimelineItem} onDelete={deleteSelectedTimelineItem} />
      </div>;
    })}
  </div>;
}
