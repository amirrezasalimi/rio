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

function formatTime(milliseconds: number) {
  const totalSeconds = Math.max(0, milliseconds) / 1_000;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${(totalSeconds % 60).toFixed(1).padStart(4, '0')}`;
}

import { useHistoryStore } from '../editor/history';

export function GestureTimelineLane({ editedRecordingDurationMs, timelineDurationMs, onDragStateChange }: { editedRecordingDurationMs: number; timelineDurationMs: number; onDragStateChange: (lockedDurationMs: number | undefined) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const clips = useEditorStore((state) => state.gestureClips);
  const setClips = useEditorStore((state) => state.setGestureClips);
  const gestureSources = useEditorStore((state) => state.gestureSources);
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
    useHistoryStore.getState().beginTransaction(interaction === 'clip' ? 'Move timeline items' : 'Trim gesture clip');
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
        const sourceDurationMs = initial.sourceAssetId ? gestureSources.find((source) => source.id === initial.sourceAssetId)?.durationMs ?? editedRecordingDurationMs : editedRecordingDurationMs;
        return { ...clip, sourceEndMs: Math.min(sourceDurationMs, Math.max(initial.sourceStartMs + MIN_CLIP_MS, initial.sourceEndMs + delta)) };
      }));
    };
    const stop = () => {
      if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
      onDragStateChange(undefined);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      useHistoryStore.getState().commitTransaction();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
    window.addEventListener('pointercancel', stop, { once: true });
  };

  if (clips.length === 0) return null;

  return (
    <div ref={trackRef} className="relative h-12 shrink-0 border-t border-border/70 bg-surface/60">
        {clips.map((clip, index) => {
          const selected = selectedItems.some((item) => item.kind === 'gesture' && item.id === clip.id);
          const duration = getGestureClipDurationMs(clip);
          const timelineEndMs = clip.timelineStartMs + duration;
          return (
            <div key={clip.id} data-clip className="absolute bottom-1 top-1 min-w-14 touch-none" style={{ left: `${clip.timelineStartMs / timelineDurationMs * 100}%`, width: `${duration / timelineDurationMs * 100}%` }}>
              <div role="button" tabIndex={0} aria-label={`Gesture effects clip from ${formatTime(clip.timelineStartMs)} to ${formatTime(timelineEndMs)}`} onPointerDown={(event) => startDrag(event, index, 'clip')} onClick={(event) => { if (event.detail === 0) selectItem({ kind: 'gesture', id: clip.id }, event.shiftKey); }} className={`rio-timeline-gesture absolute inset-0 cursor-grab overflow-hidden rounded-lg border text-white active:cursor-grabbing ${selected ? 'border-selection-border ring-1 ring-selection-border/35' : 'border-border'}`}>
                <div className="rio-timeline-pattern pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle,white_1px,transparent_1.5px)] [background-size:12px_12px]" />
                <span className="pointer-events-none absolute left-6 right-6 top-0.5 flex items-center justify-center gap-1 truncate text-[9px] font-semibold"><MousePointerClick className="size-3 shrink-0" /> Gesture effects</span>
                <span className="pointer-events-none absolute bottom-0.5 left-6 right-6 flex justify-between gap-1 overflow-hidden text-[9px] font-semibold tabular-nums text-white/90"><span>{formatTime(clip.timelineStartMs)}</span><span>{formatTime(timelineEndMs)}</span></span>
              </div>
              <button type="button" aria-label="Trim start of gesture effects" onPointerDown={(event) => startDrag(event, index, 'start')} className="absolute inset-y-0 left-0 z-20 flex w-5 cursor-ew-resize items-center justify-center rounded-l-lg bg-[var(--color-timeline-handle)] text-white"><GripVertical className="size-3" /></button>
              <button type="button" aria-label="Trim end of gesture effects" onPointerDown={(event) => startDrag(event, index, 'end')} className="absolute inset-y-0 right-0 z-20 flex w-5 cursor-ew-resize items-center justify-center rounded-r-lg bg-[var(--color-timeline-handle)] text-white"><GripVertical className="size-3" /></button>
              <ClipContextMenu label="Gesture effects" onOpen={() => setSelection({ kind: 'gesture', id: clip.id })} onDuplicate={duplicateSelectedTimelineItem} onDelete={deleteSelectedTimelineItem} />
            </div>
          );
        })}
    </div>
  );
}
