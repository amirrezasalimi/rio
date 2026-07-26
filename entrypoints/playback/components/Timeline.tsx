import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Minus,
  Plus,
  RotateCcw,
  Scissors,
  Trash2,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { formatDuration } from '../../shared/recording/media';
import { useEditorStore } from '../editor/store';
import type { EditorClip, TimelineAssetSource } from '../editor/types';
import { getClipDurationMs, getEditedDurationMs } from '../editor/types';
import { MediaLibrary, MediaTimelineLane } from './MediaTimelineLane';

const MIN_CLIP_MS = 150;
const SNAP_MS = 50;
const MIN_ZOOM = 1;
const MAX_ZOOM = 16;
const ZOOM_STEP = 0.5;

function locateSourceTime(
  clips: EditorClip[],
  editedTimeMs: number,
): { clipIndex: number; sourceTimeMs: number } | undefined {
  for (let index = clips.length - 1; index >= 0; index -= 1) {
    const clip = clips[index];
    const length = getClipDurationMs(clip);
    if (
      editedTimeMs >= clip.timelineStartMs &&
      editedTimeMs <= clip.timelineStartMs + length
    ) {
      return {
        clipIndex: index,
        sourceTimeMs:
          clip.sourceStartMs + editedTimeMs - clip.timelineStartMs,
      };
    }
  }
  return undefined;
}

function timeLabel(milliseconds: number): string {
  const seconds = Math.max(0, milliseconds) / 1000;
  return seconds < 10 ? `${seconds.toFixed(1)}s` : formatDuration(milliseconds);
}

function snap(value: number): number {
  return Math.round(value / SNAP_MS) * SNAP_MS;
}

export function Timeline({
  currentTimeMs,
  sourceDurationMs,
  onSeek,
  assets,
  onUploadMedia,
  onDeleteAsset,
}: {
  currentTimeMs: number;
  sourceDurationMs: number;
  onSeek: (timeMs: number) => void;
  assets: TimelineAssetSource[];
  onUploadMedia: (files: FileList) => void;
  onDeleteAsset: (assetId: string) => void;
}) {
  const clips = useEditorStore((state) => state.clips);
  const setClips = useEditorStore((state) => state.setClips);
  const timelineMedia = useEditorStore((state) => state.timelineMedia);
  const setTimelineMedia = useEditorStore((state) => state.setTimelineMedia);
  const selection = useEditorStore((state) => state.selectedTimelineItem);
  const setSelection = useEditorStore((state) => state.setSelectedTimelineItem);
  const [zoom, setZoom] = useState(1);
  const [lockedDragDurationMs, setLockedDragDurationMs] = useState<number>();
  const [panelHeight, setPanelHeight] = useState(() => {
    const saved = Number(localStorage.getItem('rio.timeline.height'));
    return Number.isFinite(saved) && saved >= 190 ? saved : 260;
  });
  const timelineLimitMs = useEditorStore((state) => state.timelineLimitMs);
  const setTimelineLimitMs = useEditorStore((state) => state.setTimelineLimitMs);
  const trackRef = useRef<HTMLDivElement>(null);
  const contentDurationMs = getEditedDurationMs(clips, timelineMedia);
  const projectDurationMs = Math.max(timelineLimitMs, contentDurationMs, 1_000);
  const trailingEditSpaceMs = Math.max(5_000, projectDurationMs * 0.2);
  // Keep empty space after the final item so an end handle never sits against
  // the viewport boundary. Lock the ruler while dragging so it cannot move
  // underneath the pointer as the item duration changes.
  const timelineDurationMs = lockedDragDurationMs ?? projectDurationMs + trailingEditSpaceMs;

  useEffect(() => {
    if (timelineLimitMs < sourceDurationMs) setTimelineLimitMs(sourceDurationMs);
  }, [sourceDurationMs, timelineLimitMs, setTimelineLimitMs]);
  const selectedId = selection?.kind === 'recording' ? selection.id : undefined;
  const selectedIndex = clips.findIndex((clip) => clip.id === selectedId);

  const setSafeZoom = (value: number) =>
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value)));

  const resetCuts = () => {
    const restored = {
      id: crypto.randomUUID(),
      sourceStartMs: 0,
      sourceEndMs: Math.max(sourceDurationMs, MIN_CLIP_MS),
      timelineStartMs: 0,
    };
    setClips([restored]);
    setSelection({ kind: 'recording', id: restored.id });
    onSeek(0);
    setTimelineLimitMs(Math.max(sourceDurationMs, 1_000));
    setSafeZoom(1);
  };

  const moveOrder = (direction: -1 | 1) => {
    const target = selectedIndex + direction;
    if (selectedIndex < 0 || target < 0 || target >= clips.length) return;
    const next = [...clips];
    [next[selectedIndex], next[target]] = [next[target], next[selectedIndex]];
    setClips(next);
  };

  const split = () => {
    const located = locateSourceTime(clips, currentTimeMs);
    if (!located) return;
    const clip = clips[located.clipIndex];
    if (
      located.sourceTimeMs - clip.sourceStartMs < MIN_CLIP_MS ||
      clip.sourceEndMs - located.sourceTimeMs < MIN_CLIP_MS
    ) return;

    const first = {
      ...clip,
      id: crypto.randomUUID(),
      sourceEndMs: located.sourceTimeMs,
    };
    const second = {
      ...clip,
      id: crypto.randomUUID(),
      sourceStartMs: located.sourceTimeMs,
      timelineStartMs: currentTimeMs,
    };
    setClips([
      ...clips.slice(0, located.clipIndex),
      first,
      second,
      ...clips.slice(located.clipIndex + 1),
    ]);
    setSelection({ kind: 'recording', id: second.id });
  };

  const startDrag = (
    event: React.PointerEvent,
    index: number,
    interaction: 'clip' | 'start' | 'end',
  ) => {
    event.stopPropagation();
    event.preventDefault();
    const bounds = trackRef.current?.getBoundingClientRect();
    if (!bounds) return;

    setSelection({ kind: 'recording', id: clips[index].id });
    const startX = event.clientX;
    const initial = clips[index];
    const pixelsPerMs = bounds.width / timelineDurationMs;

    const onMove = (moveEvent: PointerEvent) => {
      const delta = snap((moveEvent.clientX - startX) / pixelsPerMs);
      setClips(
        clips.map((clip, clipIndex) => {
          if (clipIndex !== index) return clip;
          if (interaction === 'clip') {
            return {
              ...clip,
              timelineStartMs: Math.max(0, initial.timelineStartMs + delta),
            };
          }
          if (interaction === 'start') {
            const sourceStartMs = Math.max(
              0,
              Math.min(
                initial.sourceEndMs - MIN_CLIP_MS,
                initial.sourceStartMs + delta,
              ),
            );
            return {
              ...clip,
              sourceStartMs,
              timelineStartMs: Math.max(
                0,
                initial.timelineStartMs +
                  sourceStartMs -
                  initial.sourceStartMs,
              ),
            };
          }
          return {
            ...clip,
            sourceEndMs: Math.max(
              initial.sourceStartMs + MIN_CLIP_MS,
              initial.sourceEndMs + delta,
            ),
          };
        }),
      );
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };

  const seekFromPointer = (event: React.PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('[data-clip]')) return;
    event.preventDefault();
    event.stopPropagation();
    const bounds = trackRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const update = (clientX: number) =>
      onSeek(
        Math.max(
          0,
          Math.min(
            timelineDurationMs,
            ((clientX - bounds.left) / bounds.width) * timelineDurationMs,
          ),
        ),
      );
    update(event.clientX);

    const onMove = (moveEvent: PointerEvent) => update(moveEvent.clientX);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };

  const resizeTimeline = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = panelHeight;
    const update = (moveEvent: PointerEvent) => {
      const next = Math.max(190, Math.min(window.innerHeight * 0.72, startHeight + startY - moveEvent.clientY));
      setPanelHeight(next);
      localStorage.setItem('rio.timeline.height', String(Math.round(next)));
    };
    const stop = () => {
      window.removeEventListener('pointermove', update);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', update);
    window.addEventListener('pointerup', stop, { once: true });
  };

  return (
    <section className="relative flex shrink-0 select-none flex-col border-t border-border bg-surface px-4 pb-3 pt-4 [&_input]:select-text" style={{ height: panelHeight }}>
      <div role="separator" aria-label="Resize timeline vertically" aria-orientation="horizontal" onPointerDown={resizeTimeline} className="group absolute inset-x-0 top-0 z-50 h-3 -translate-y-1/2 cursor-row-resize touch-none"><span className="absolute left-1/2 top-1/2 h-1 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border transition group-hover:bg-primary-400" /></div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xs font-semibold">Timeline</h2>
            <p className="text-[9px] text-muted">
              Drag clips to move · Drag edges to trim · Empty space is preserved
            </p>
          </div>
          <span className="rounded-full bg-cream-100 px-2 py-1 font-mono text-[9px] text-muted">
            {formatDuration(contentDurationMs)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <MediaLibrary
            assets={assets}
            items={timelineMedia}
            timelineDurationMs={timelineDurationMs}
            currentTimeMs={currentTimeMs}
            onItemsChange={setTimelineMedia}
            onUpload={onUploadMedia}
            onDeleteAsset={onDeleteAsset}
          />
          <label className="flex items-center gap-1.5 rounded-xl border border-border bg-cream-50 px-2 py-1 text-[9px] font-semibold text-muted">
            Max time
            <input
              aria-label="Timeline maximum time in seconds"
              type="number"
              min={Math.max(1, Math.ceil(contentDurationMs / 1_000))}
              step={1}
              value={Math.ceil(projectDurationMs / 1_000)}
              onChange={(event) => {
                const seconds = event.currentTarget.valueAsNumber;
                if (!Number.isFinite(seconds)) return;
                setTimelineLimitMs(
                  Math.max(contentDurationMs, 1_000, Math.round(seconds * 1_000)),
                );
              }}
              className="w-14 rounded-lg border border-border bg-surface px-2 py-1 text-right font-mono text-[10px] text-ink outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
            <span>s</span>
          </label>
          <div className="flex items-center rounded-xl border border-border bg-cream-50 p-1">
            <button
              type="button"
              aria-label="Zoom timeline out"
              disabled={zoom <= MIN_ZOOM}
              onClick={() => setSafeZoom(zoom - ZOOM_STEP)}
              className="rounded-lg p-1.5 hover:bg-surface disabled:opacity-25"
            >
              <Minus className="size-3.5" />
            </button>
            <button
              type="button"
              title="Fit timeline"
              onClick={() => setSafeZoom(1)}
              className="min-w-11 rounded-lg px-1.5 py-1 text-center font-mono text-[9px] font-semibold hover:bg-surface"
            >
              {Math.round(zoom * 100)}%
            </button>
            <input
              aria-label="Timeline zoom"
              title="Timeline zoom"
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={ZOOM_STEP}
              value={zoom}
              onChange={(event) => setSafeZoom(event.currentTarget.valueAsNumber)}
              className="rio-range w-24"
              style={{
                '--rio-range-progress': `${((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100}%`,
              } as CSSProperties}
            />
            <button
              type="button"
              aria-label="Zoom timeline in"
              disabled={zoom >= MAX_ZOOM}
              onClick={() => setSafeZoom(zoom + ZOOM_STEP)}
              className="rounded-lg p-1.5 hover:bg-surface disabled:opacity-25"
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          <div className="flex items-center rounded-xl border border-border bg-cream-50 p-1">
            <button
              type="button"
              onClick={split}
              title="Split at playhead"
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold hover:bg-surface"
            >
              <Scissors className="size-3" /> Split
            </button>
            <button
              type="button"
              onClick={resetCuts}
              title="Restore the complete original recording"
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold hover:bg-surface"
            >
              <RotateCcw className="size-3" /> Reset cuts
            </button>
            <span className="mx-1 h-4 w-px bg-border" />
            <button
              type="button"
              aria-label="Move selected clip earlier in layer order"
              disabled={selectedIndex <= 0}
              onClick={() => moveOrder(-1)}
              className="rounded-lg p-1.5 hover:bg-surface disabled:opacity-25"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Move selected clip later in layer order"
              disabled={selectedIndex < 0 || selectedIndex === clips.length - 1}
              onClick={() => moveOrder(1)}
              className="rounded-lg p-1.5 hover:bg-surface disabled:opacity-25"
            >
              <ChevronRight className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Delete selected clip"
              disabled={selectedIndex < 0 || clips.length === 1}
              onClick={() => {
                const next = clips.filter((clip) => clip.id !== selectedId);
                setClips(next);
                setSelection(next[0] ? { kind: 'recording', id: next[0].id } : undefined);
              }}
              className="rounded-lg p-1.5 text-danger hover:bg-accent-50 disabled:opacity-25"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-xl border border-border bg-cream-100">
        <div className="relative flex min-h-full flex-col" style={{ width: `${zoom * 100}%`, minWidth: '100%' }}> 
          <div className="sticky top-0 z-40 flex h-6 shrink-0 items-end justify-between border-b border-border/70 bg-cream-100 px-2 pb-1 font-mono text-[8px] text-muted">
            <span>00:00</span>
            <span>{timeLabel(timelineDurationMs * 0.25)}</span>
            <span>{timeLabel(timelineDurationMs * 0.5)}</span>
            <span>{timeLabel(timelineDurationMs * 0.75)}</span>
            <span>{timeLabel(timelineDurationMs)}</span>
            <button
              type="button"
              aria-label="Drag timeline playhead"
              title="Drag playhead"
              onPointerDown={seekFromPointer}
              className="group absolute inset-y-0 z-50 w-10 -translate-x-1/2 cursor-ew-resize touch-none"
              style={{
                left: `${Math.min(100, (currentTimeMs / timelineDurationMs) * 100)}%`,
              }}
            >
              <span className="pointer-events-none absolute bottom-0 left-1/2 size-4 -translate-x-1/2 translate-y-1/2 rotate-45 rounded-[4px] bg-accent-500 shadow-[0_1px_4px_rgba(24,50,74,.28)] ring-2 ring-white transition-transform group-active:scale-110" />
            </button>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 top-6 z-30 w-8 -translate-x-1/2"
            style={{
              left: `${Math.min(100, (currentTimeMs / timelineDurationMs) * 100)}%`,
            }}
          >
            <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-accent-500 shadow-[0_0_0_1px_rgba(255,255,255,.85)]" />
          </div>
          <div
            ref={trackRef}
            onPointerDown={seekFromPointer}
            className="relative h-[74px] min-h-[74px] max-h-[74px] shrink-0 cursor-crosshair bg-[linear-gradient(90deg,transparent_0,transparent_calc(25%-1px),var(--color-border)_25%,transparent_calc(25%+1px),transparent_calc(50%-1px),var(--color-border)_50%,transparent_calc(50%+1px),transparent_calc(75%-1px),var(--color-border)_75%,transparent_calc(75%+1px))] p-1.5"
          >
            {clips.map((clip, index) => {
              const clipDuration = getClipDurationMs(clip);
              const selected = clip.id === selectedId;
              return (
                <div
                  data-clip
                  key={clip.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Clip ${index + 1}`}
                  onPointerDown={(event) => startDrag(event, index, 'clip')}
                  onClick={() => setSelection({ kind: 'recording', id: clip.id })}
                  className={`group absolute bottom-1.5 top-1.5 max-h-[62px] min-w-14 cursor-grab touch-none overflow-hidden rounded-lg border-2 text-left transition active:cursor-grabbing ${
                    selected
                      ? 'border-primary-600 shadow-[0_0_0_2px_rgba(50,143,223,.18)]'
                      : 'border-primary-200 hover:border-primary-400'
                  }`}
                  style={{
                    left: `${(clip.timelineStartMs / timelineDurationMs) * 100}%`,
                    width: `${(clipDuration / timelineDurationMs) * 100}%`,
                    background:
                      'linear-gradient(145deg, var(--color-primary-100), var(--color-primary-300))',
                  }}
                >
                  <div className="absolute inset-0 opacity-40 [background-image:repeating-linear-gradient(90deg,transparent_0,transparent_17px,rgba(255,255,255,.9)_18px)]" />
                  <button
                    type="button"
                    aria-label={`Trim start of clip ${index + 1}`}
                    className="absolute inset-y-0 left-0 z-20 flex w-5 cursor-ew-resize touch-none items-center justify-center bg-primary-600 text-white opacity-80 transition hover:opacity-100 focus:opacity-100"
                    onPointerDown={(event) => startDrag(event, index, 'start')}
                  >
                    <GripVertical className="size-3" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Trim end of clip ${index + 1}`}
                    className="absolute inset-y-0 right-0 z-20 flex w-5 cursor-ew-resize touch-none items-center justify-center bg-primary-600 text-white opacity-80 transition hover:opacity-100 focus:opacity-100"
                    onPointerDown={(event) => startDrag(event, index, 'end')}
                  >
                    <GripVertical className="size-3" />
                  </button>
                  <span className="pointer-events-none absolute left-6 top-2 rounded bg-ink/72 px-1.5 py-0.5 font-mono text-[8px] text-white">
                    Clip {index + 1}
                  </span>
                  <span className="pointer-events-none absolute bottom-2 left-6 font-mono text-[8px] font-semibold text-primary-950">
                    {timeLabel(clipDuration)}
                  </span>
                </div>
              );
            })}

          </div>
          <MediaTimelineLane
            items={timelineMedia}
            timelineDurationMs={timelineDurationMs}
            onItemsChange={setTimelineMedia}
            onDragStateChange={setLockedDragDurationMs}
          />
        </div>
      </div>
    </section>
  );
}
