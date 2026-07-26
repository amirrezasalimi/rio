import { GripVertical, MousePointerClick } from 'lucide-react';
import { useRef } from 'react';
import { deleteSelectedTimelineItem, duplicateSelectedTimelineItem } from '../editor/clipActions';
import { useEditorStore } from '../editor/store';
import { captureSelectedTimelineStarts, moveSelectedTimelineItems, selectionKey } from '../editor/timelineSelection';
import { getGestureClipDurationMs } from '../editor/types';
import { ClipContextMenu } from './ClipContextMenu';

const MIN_CLIP_MS = 150;
const SNAP_MS = 50;

function snap(value: number) {
  return Math.round(value / SNAP_MS) * SNAP_MS;
}

export function GestureTimelineLane({ editedRecordingDurationMs, timelineDurationMs, onDragStateChange }: { editedRecordingDurationMs: number; timelineDurationMs: number; onDragStateChange: (lockedDurationMs: number | undefined) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const clips = useEditorStore((state) => state.gestureClips);
  const setClips = useEditorStore((state) => state.setGestureClips);
  const selectedItems = useEditorStore((state) => state.selectedTimelineItems);
  const selectItem = useEditorStore((state) => state.selectTimelineItem);
  const setSelection = useEditorStore((state) => state.setSelectedTimelineItem);




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
    const itemSelection = { kind: 'gesture' as const, id: initial.id };
    const alreadySelected = useEditorStore.getState().selectedTimelineItems.some((item) => selectionKey(item) === selectionKey(itemSelection));
    if (event.shiftKey) selectItem(itemSelection, true);
    else if (!alreadySelected) selectItem(itemSelection, false);
    const initialStarts = captureSelectedTimelineStarts();
    const minimumStart = Math.min(...initialStarts.values());

    const move = (moveEvent: PointerEvent) => {
      const delta = snap((moveEvent.clientX - startX) / pixelsPerMs);
      if (interaction === 'clip') {
        moveSelectedTimelineItems(Math.max(-minimumStart, delta), initialStarts);
        return;
      }
      setClips((current) => current.map((clip) => {
        if (clip.id !== initial.id) return clip;
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

  if (clips.length === 0) return null;

  return (
    <div ref={trackRef} className="relative h-12 shrink-0 border-t border-border/70 bg-primary-50/45">
        {clips.map((clip, index) => {
          const selected = selectedItems.some((item) => item.kind === 'gesture' && item.id === clip.id);
          const duration = getGestureClipDurationMs(clip);
          return (
            <div key={clip.id} data-clip className="absolute bottom-1 top-1 min-w-14 touch-none" style={{ left: `${clip.timelineStartMs / timelineDurationMs * 100}%`, width: `${duration / timelineDurationMs * 100}%` }}>
              <div role="button" tabIndex={0} aria-label="Gesture effects clip" onPointerDown={(event) => startDrag(event, index, 'clip')} onClick={(event) => { if (event.detail === 0) selectItem({ kind: 'gesture', id: clip.id }, event.shiftKey); }} className={`absolute inset-0 cursor-grab overflow-hidden rounded-lg border-2 bg-[linear-gradient(135deg,var(--color-primary-700),var(--color-accent-500))] text-white active:cursor-grabbing ${selected ? 'border-white ring-2 ring-primary-500/30' : 'border-primary-300'}`}>
                <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle,white_1px,transparent_1.5px)] [background-size:12px_12px]" />
                <span className="pointer-events-none absolute inset-y-0 left-6 right-6 flex items-center gap-1.5 truncate text-[8px] font-semibold"><MousePointerClick className="size-3.5 shrink-0" /> Gesture effects</span>
              </div>
              <button type="button" aria-label="Trim start of gesture effects" onPointerDown={(event) => startDrag(event, index, 'start')} className="absolute inset-y-0 left-0 z-20 flex w-5 cursor-ew-resize items-center justify-center rounded-l-lg bg-ink/75 text-white"><GripVertical className="size-3" /></button>
              <button type="button" aria-label="Trim end of gesture effects" onPointerDown={(event) => startDrag(event, index, 'end')} className="absolute inset-y-0 right-0 z-20 flex w-5 cursor-ew-resize items-center justify-center rounded-r-lg bg-ink/75 text-white"><GripVertical className="size-3" /></button>
              <ClipContextMenu label="Gesture effects" onOpen={() => setSelection({ kind: 'gesture', id: clip.id })} onDuplicate={duplicateSelectedTimelineItem} onDelete={deleteSelectedTimelineItem} />
            </div>
          );
        })}
    </div>
  );
}
