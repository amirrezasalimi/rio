import {
  ChevronLeft,
  ChevronRight,
  GripVertical,

  RotateCcw,
  Scissors,
} from 'lucide-react';

import { useEffect, useRef, useState } from 'react';
import { formatDuration } from '../../shared/recording/media';
import { deleteSelectedTimelineItem, duplicateSelectedTimelineItem, splitSelectedTimelineItemAudio } from '../editor/clipActions';
import { useEditorStore } from '../editor/store';
import { captureSelectedTimelineStarts, moveSelectedTimelineItems, selectionKey } from '../editor/timelineSelection';
import type { EditorClip, GestureClip, TimelineAssetSource, TimelineMediaItem } from '../editor/types';
import { createDefaultGestureSettings, createDefaultTextClip, createDefaultZoomClip, getClipDurationMs, getEditedDurationMs, getPlaybackRate, getTimelineItemDurationMs, getGestureClipDurationMs } from '../editor/types';
import { AudioWaveform } from './AudioWaveform';
import { ClipContextMenu } from './ClipContextMenu';
import { GestureTimelineLane } from './GestureTimelineLane';
import { MediaLibrary, MediaTimelineLane } from './MediaTimelineLane';
import { TextTimelineLane } from './TextTimelineLane';
import { TimelineMaxTimeInput } from './TimelineMaxTimeInput';
import { TimelineRuler } from './TimelineRuler';
import { TimelineZoomControls } from './TimelineZoomControls';
import { ZoomTimelineLane } from './ZoomTimelineLane';

const MIN_CLIP_MS = 150;
const SNAP_MS = 50;
const MIN_ZOOM = 1;
const MAX_ZOOM = 16;
const ZOOM_STEP = 0.5;
function locateSourceTime(clips: EditorClip[], editedTimeMs: number): { clipIndex: number; sourceTimeMs: number } | undefined {
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
          clip.sourceStartMs + (editedTimeMs - clip.timelineStartMs) * getPlaybackRate(clip),
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
import { useHistoryStore } from '../editor/history';

export function Timeline({
  currentTimeMs,
  sourceDurationMs,
  recordingUrl,
  hasAudio,
  onSeek,
  assets,
  onUploadMedia,
  onDropMedia,
  onDeleteAsset,
  interactionCount,
  onDownloadClip,
}: {
  currentTimeMs: number;
  sourceDurationMs: number;
  recordingUrl?: string;
  hasAudio: boolean;
  onSeek: (timeMs: number) => void;
  assets: TimelineAssetSource[];
  onUploadMedia: (files: FileList) => void;
  onDropMedia: (files: FileList, timelineStartMs: number) => void;
  onDeleteAsset: (assetId: string) => void;
  interactionCount: number;
  onDownloadClip: (clip: EditorClip) => void;
}) {
  const clips = useEditorStore((state) => state.clips);
  const setClips = useEditorStore((state) => state.setClips);
  const timelineMedia = useEditorStore((state) => state.timelineMedia);
  const gestureClips = useEditorStore((state) => state.gestureClips);
  const textClips = useEditorStore((state) => state.textClips);
  const zoomClips = useEditorStore((state) => state.zoomClips);
  const setZoomClips = useEditorStore((state) => state.setZoomClips);
  const setGestureClips = useEditorStore((state) => state.setGestureClips);
  const setTextClips = useEditorStore((state) => state.setTextClips);
  const setTimelineMedia = useEditorStore((state) => state.setTimelineMedia);
  const selection = useEditorStore((state) => state.selectedTimelineItem);
  const selectedItems = useEditorStore((state) => state.selectedTimelineItems);
  const selectItem = useEditorStore((state) => state.selectTimelineItem);
  const setSelection = useEditorStore((state) => state.setSelectedTimelineItem);
  const [zoom, setZoom] = useState(1);
  const [preciseRuler, setPreciseRuler] = useState(() => localStorage.getItem('rio.timeline.precise-ruler') === 'true');
  const [lockedDragDurationMs, setLockedDragDurationMs] = useState<number>();
  const [panelHeight, setPanelHeight] = useState(() => {
    const saved = Number(localStorage.getItem('rio.timeline.height'));
    return Number.isFinite(saved) && saved >= 190 ? saved : 260;
  });
  const timelineLimitMs = useEditorStore((state) => state.timelineLimitMs);
  const setTimelineLimitMs = useEditorStore((state) => state.setTimelineLimitMs);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const editedRecordingDurationMs = getEditedDurationMs(clips);
  const contentDurationMs = getEditedDurationMs(clips, timelineMedia, gestureClips, textClips, zoomClips);
  const projectDurationMs = Math.max(timelineLimitMs, contentDurationMs, 1_000);
  const trailingEditSpaceMs = Math.max(5_000, projectDurationMs * 0.2);
  // Keep empty space after the final item so an end handle never sits against
  // the viewport boundary. Lock the ruler while dragging so it cannot move
  // underneath the pointer as the item duration changes.
  const timelineDurationMs = lockedDragDurationMs ?? projectDurationMs + trailingEditSpaceMs;
  useEffect(() => {
    const track = viewportRef.current;
    if (!track) return;
    const zoomTimeline = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      setZoom((current) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current * Math.exp(-event.deltaY * 0.01))));
    };
    track.addEventListener('wheel', zoomTimeline, { passive: false });
    return () => track.removeEventListener('wheel', zoomTimeline);
  }, []);
  const selectedId = selection?.kind === 'recording' ? selection.id : undefined;
  const selectedIndex = clips.findIndex((clip) => clip.id === selectedId);
  const setSafeZoom = (value: number) =>
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value)));

  const addOriginal = () => {
    useHistoryStore.getState().record('Add recording clip');
    const clip: EditorClip = { id: crypto.randomUUID(), sourceStartMs: 0, sourceEndMs: Math.max(sourceDurationMs, MIN_CLIP_MS), timelineStartMs: currentTimeMs };
    setClips((current) => [...current, clip]);
    setSelection({ kind: 'recording', id: clip.id });
  };
  const addText = () => {
    useHistoryStore.getState().record('Add text clip');
    const clip = createDefaultTextClip(currentTimeMs);
    setTextClips((current) => [...current, clip]);
    setSelection({ kind: 'text', id: clip.id });
  };
  const addZoom = () => {
    useHistoryStore.getState().record('Add zoom clip');
    const clip = createDefaultZoomClip(currentTimeMs, Math.max(1_000, Math.min(5_000, projectDurationMs - currentTimeMs)));
    setZoomClips((current) => [...current, clip]);
    setSelection({ kind: 'zoom', id: clip.id });
  };
  const addGesture = () => {
    useHistoryStore.getState().record('Add gesture clip');
    const fallbackSource = interactionCount === 0 ? assets.find((asset) => asset.type === 'video' && asset.interactions?.length) : undefined;
    const sourceDurationMs = fallbackSource?.gestureDurationMs ?? editedRecordingDurationMs;
    if (sourceDurationMs < MIN_CLIP_MS) return;
    const clip: GestureClip = { id: crypto.randomUUID(), sourceAssetId: fallbackSource?.id, sourceStartMs: 0, sourceEndMs: sourceDurationMs, timelineStartMs: 0, settings: createDefaultGestureSettings() };
    setGestureClips((current) => [...current, clip]);
    setSelection({ kind: 'gesture', id: clip.id });
  };

  const resetCuts = () => {
    useHistoryStore.getState().record('Reset cuts');
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
    setClips((current) => {
      const currentIndex = current.findIndex((clip) => clip.id === selectedId);
      const currentTarget = currentIndex + direction;
      if (currentIndex < 0 || currentTarget < 0 || currentTarget >= current.length) return current;
      const next = [...current];
      [next[currentIndex], next[currentTarget]] = [next[currentTarget], next[currentIndex]];
      return next;
    });
  };

  const split = () => {
    if (selection) {
      if (selection.kind === 'recording') {
        const index = clips.findIndex((c) => c.id === selection.id);
        if (index !== -1) {
          const clip = clips[index];
          const durationMs = getClipDurationMs(clip);
          if (currentTimeMs > clip.timelineStartMs && currentTimeMs < clip.timelineStartMs + durationMs) {
            const rate = getPlaybackRate(clip);
            const sourceTimeMs = clip.sourceStartMs + (currentTimeMs - clip.timelineStartMs) * rate;
            const minimumSourceDurationMs = MIN_CLIP_MS * rate;
            if (
              sourceTimeMs - clip.sourceStartMs >= minimumSourceDurationMs &&
              clip.sourceEndMs - sourceTimeMs >= minimumSourceDurationMs
            ) {
              useHistoryStore.getState().record('Split clip');
              const first = {
                ...clip,
                id: crypto.randomUUID(),
                sourceEndMs: sourceTimeMs,
              };
              const second = {
                ...clip,
                id: crypto.randomUUID(),
                sourceStartMs: sourceTimeMs,
                timelineStartMs: currentTimeMs,
              };
              setClips([
                ...clips.slice(0, index),
                first,
                second,
                ...clips.slice(index + 1),
              ]);
              setSelection({ kind: 'recording', id: second.id });
              return;
            }
          }
        }
      } else if (selection.kind === 'media') {
        const index = timelineMedia.findIndex((m) => m.id === selection.id);
        if (index !== -1) {
          const item = timelineMedia[index];
          const durationMs = getTimelineItemDurationMs(item);
          if (currentTimeMs > item.timelineStartMs && currentTimeMs < item.timelineStartMs + durationMs) {
            const rate = item.type === 'video' ? getPlaybackRate(item) : 1;
            const sourceTimeMs = item.sourceStartMs + (currentTimeMs - item.timelineStartMs) * rate;
            const minimumSourceDurationMs = MIN_CLIP_MS * rate;
            if (
              sourceTimeMs - item.sourceStartMs >= minimumSourceDurationMs &&
              item.sourceEndMs - sourceTimeMs >= minimumSourceDurationMs
            ) {
              useHistoryStore.getState().record('Split media placement');
              const firstId = crypto.randomUUID();
              const secondId = crypto.randomUUID();
              const first: TimelineMediaItem = {
                ...item,
                id: firstId,
                sourceEndMs: sourceTimeMs,
                fadeOutMs: 0,
              };
              const second: TimelineMediaItem = {
                ...item,
                id: secondId,
                sourceStartMs: sourceTimeMs,
                timelineStartMs: currentTimeMs,
                fadeInMs: 0,
              };
              setTimelineMedia([
                ...timelineMedia.slice(0, index),
                first,
                second,
                ...timelineMedia.slice(index + 1),
              ]);
              setSelection({ kind: 'media', id: secondId });
              return;
            }
          }
        }
      } else if (selection.kind === 'gesture') {
        const index = gestureClips.findIndex((g) => g.id === selection.id);
        if (index !== -1) {
          const clip = gestureClips[index];
          const durationMs = getGestureClipDurationMs(clip);
          if (currentTimeMs > clip.timelineStartMs && currentTimeMs < clip.timelineStartMs + durationMs) {
            const sourceTimeMs = clip.sourceStartMs + (currentTimeMs - clip.timelineStartMs);
            const minimumSourceDurationMs = MIN_CLIP_MS;
            if (
              sourceTimeMs - clip.sourceStartMs >= minimumSourceDurationMs &&
              clip.sourceEndMs - sourceTimeMs >= minimumSourceDurationMs
            ) {
              const firstId = crypto.randomUUID();
              const secondId = crypto.randomUUID();
              const first = {
                ...clip,
                id: firstId,
                sourceEndMs: sourceTimeMs,
              };
              const second = {
                ...clip,
                id: secondId,
                sourceStartMs: sourceTimeMs,
                timelineStartMs: currentTimeMs,
              };
              setGestureClips([
                ...gestureClips.slice(0, index),
                first,
                second,
                ...gestureClips.slice(index + 1),
              ]);
              setSelection({ kind: 'gesture', id: secondId });
              return;
            }
          }
        }
      } else if (selection.kind === 'text') {
        const index = textClips.findIndex((t) => t.id === selection.id);
        if (index !== -1) {
          const clip = textClips[index];
          if (currentTimeMs > clip.timelineStartMs && currentTimeMs < clip.timelineStartMs + clip.durationMs) {
            const firstDuration = currentTimeMs - clip.timelineStartMs;
            const secondDuration = clip.timelineStartMs + clip.durationMs - currentTimeMs;
            if (firstDuration >= MIN_CLIP_MS && secondDuration >= MIN_CLIP_MS) {
              const firstId = crypto.randomUUID();
              const secondId = crypto.randomUUID();
              const first = {
                ...clip,
                id: firstId,
                durationMs: firstDuration,
              };
              const second = {
                ...clip,
                id: secondId,
                timelineStartMs: currentTimeMs,
                durationMs: secondDuration,
              };
              setTextClips([
                ...textClips.slice(0, index),
                first,
                second,
                ...textClips.slice(index + 1),
              ]);
              setSelection({ kind: 'text', id: secondId });
              return;
            }
          }
        }
      }
    }

    const located = locateSourceTime(clips, currentTimeMs);
    if (!located) return;
    const clip = clips[located.clipIndex];
    const minimumSourceDurationMs = MIN_CLIP_MS * getPlaybackRate(clip);
    if (
      located.sourceTimeMs - clip.sourceStartMs < minimumSourceDurationMs ||
      clip.sourceEndMs - located.sourceTimeMs < minimumSourceDurationMs
    ) return;

    useHistoryStore.getState().record('Split recording clip');
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

    const initial = clips[index];
    const minimumSourceDurationMs = MIN_CLIP_MS * getPlaybackRate(initial);
    const itemSelection = { kind: 'recording' as const, id: initial.id };
    const alreadySelected = useEditorStore.getState().selectedTimelineItems.some((item) => selectionKey(item) === selectionKey(itemSelection));
    if (event.shiftKey) selectItem(itemSelection, true);
    else if (!alreadySelected) selectItem(itemSelection, false);
    useHistoryStore.getState().beginTransaction(interaction === 'clip' ? 'Move timeline items' : 'Trim recording clip');
    const initialStarts = captureSelectedTimelineStarts();
    const minimumStart = Math.min(...initialStarts.values());
    const startX = event.clientX;
    const pixelsPerMs = bounds.width / timelineDurationMs;

    const onMove = (moveEvent: PointerEvent) => {
      const delta = snap((moveEvent.clientX - startX) / pixelsPerMs);
      const sourceDelta = delta * getPlaybackRate(initial);
      if (interaction === 'clip') {
        moveSelectedTimelineItems(Math.max(-minimumStart, delta), initialStarts);
        return;
      }
      setClips((current) =>
        current.map((clip) => {
          if (clip.id !== initial.id) return clip;
          if (interaction === 'start') {
            const sourceStartMs = Math.max(
              0,
              Math.min(
                initial.sourceEndMs - minimumSourceDurationMs,
                initial.sourceStartMs + sourceDelta,
              ),
            );
            return {
              ...clip,
              sourceStartMs,
              timelineStartMs: Math.max(
                0,
                initial.timelineStartMs +
                  (sourceStartMs - initial.sourceStartMs) /
                  getPlaybackRate(initial),
              ),
            };
          }
          return {
            ...clip,
            sourceEndMs: Math.max(
              initial.sourceStartMs + minimumSourceDurationMs,
              initial.sourceEndMs + sourceDelta,
            ),
          };
        }),
      );
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      useHistoryStore.getState().commitTransaction();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };

  const seekFromPointer = (event: React.PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('[data-clip]')) return;
    event.preventDefault();
    event.stopPropagation();
    setSelection(undefined);
    const bounds = contentRef.current?.getBoundingClientRect();
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
            onAddGesture={addGesture}
            onAddOriginal={addOriginal}
            onAddText={addText}
            onAddZoom={addZoom}
            onSplitClip={split}
            canAddGesture={interactionCount > 0 || assets.some((asset) => asset.type === 'video' && asset.interactions?.length)}
          />
          <TimelineMaxTimeInput valueSeconds={Math.ceil(projectDurationMs / 1_000)} minimumSeconds={Math.max(1, Math.ceil(contentDurationMs / 1_000))} onCommit={(seconds) => setTimelineLimitMs(Math.max(contentDurationMs, 1_000, seconds * 1_000))} />
          <TimelineZoomControls zoom={zoom} min={MIN_ZOOM} max={MAX_ZOOM} step={ZOOM_STEP} onChange={setSafeZoom} />
          <button type="button" aria-pressed={preciseRuler} title="Show timeline marks every 0.5 seconds" onClick={() => setPreciseRuler((current) => { localStorage.setItem('rio.timeline.precise-ruler', String(!current)); return !current; })} className={`rounded-xl border px-2.5 py-2 text-[9px] font-semibold transition ${preciseRuler ? 'border-primary-300 bg-primary-100 text-primary-800' : 'border-border bg-control text-muted hover:bg-surface'}`}>0.5s ticks</button>

          <div className="flex items-center rounded-xl border border-border bg-control p-1">
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

          </div>
        </div>
      </div>

      <div ref={viewportRef} className="min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-xl border border-border bg-cream-100">
        <div ref={contentRef} onPointerDown={seekFromPointer} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }} onDrop={(event) => {
          event.preventDefault();
          if (!event.dataTransfer.files.length) return;
          const bounds = contentRef.current?.getBoundingClientRect();
          if (!bounds) return;
          const timelineStartMs = Math.max(0, Math.min(timelineDurationMs, (event.clientX - bounds.left) / bounds.width * timelineDurationMs));
          onDropMedia(event.dataTransfer.files, timelineStartMs);
        }} className="relative flex min-h-full flex-col" style={{ width: `${zoom * 100}%`, minWidth: '100%' }}>
          <TimelineRuler currentTimeMs={currentTimeMs} timelineDurationMs={timelineDurationMs} preciseTicks={preciseRuler} />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 top-6 z-30 w-8 -translate-x-1/2"
            style={{
              left: `${Math.min(100, (currentTimeMs / timelineDurationMs) * 100)}%`,
            }}
          >
            <span className="rio-timeline-playhead absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--color-timeline-playhead)]" />
          </div>
          {clips.length > 0 && <div
            ref={trackRef}
            className="relative h-[74px] min-h-[74px] max-h-[74px] shrink-0 cursor-crosshair bg-[linear-gradient(90deg,transparent_0,transparent_calc(25%-1px),var(--color-border)_25%,transparent_calc(25%+1px),transparent_calc(50%-1px),var(--color-border)_50%,transparent_calc(50%+1px),transparent_calc(75%-1px),var(--color-border)_75%,transparent_calc(75%+1px))] p-1.5"
          >
            {clips.map((clip, index) => {
              const clipDuration = getClipDurationMs(clip);
              const selected = selectedItems.some((item) => item.kind === 'recording' && item.id === clip.id);
              const audioDetached = clip.audioDetached || timelineMedia.some((item) =>
                item.assetId === 'original-recording-audio'
                && item.sourceStartMs === clip.sourceStartMs
                && item.sourceEndMs === clip.sourceEndMs
                && item.timelineStartMs === clip.timelineStartMs
              );
              return (
                <div
                  data-clip
                  key={clip.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Clip ${index + 1}`}
                  onPointerDown={(event) => startDrag(event, index, 'clip')}
                  onClick={(event) => { if (event.detail === 0) selectItem({ kind: 'recording', id: clip.id }, event.shiftKey); }}
                  className={`rio-timeline-recording group absolute bottom-1.5 top-1.5 max-h-[62px] min-w-14 cursor-grab touch-none rounded-lg border text-left transition active:cursor-grabbing ${
                    selected
                      ? 'border-selection-border ring-1 ring-selection-border/35'
                      : 'border-border hover:border-selection-border'
                  }`}
                  style={{
                    left: `${(clip.timelineStartMs / timelineDurationMs) * 100}%`,
                    width: `${(clipDuration / timelineDurationMs) * 100}%`,
                  }}
                >
                  <div className="rio-timeline-pattern absolute inset-0 overflow-hidden rounded-md opacity-20 [background-image:repeating-linear-gradient(90deg,transparent_0,transparent_17px,rgba(255,255,255,.7)_18px)]" />
                  <button
                    type="button"
                    aria-label={`Trim start of clip ${index + 1}`}
                    className="absolute inset-y-0 left-0 z-20 flex w-5 cursor-ew-resize touch-none items-center justify-center bg-[var(--color-timeline-handle)] text-white opacity-80 transition hover:opacity-100 focus:opacity-100"
                    onPointerDown={(event) => startDrag(event, index, 'start')}
                  >
                    <GripVertical className="size-3" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Trim end of clip ${index + 1}`}
                    className="absolute inset-y-0 right-0 z-20 flex w-5 cursor-ew-resize touch-none items-center justify-center bg-[var(--color-timeline-handle)] text-white opacity-80 transition hover:opacity-100 focus:opacity-100"
                    onPointerDown={(event) => startDrag(event, index, 'end')}
                  >
                    <GripVertical className="size-3" />
                  </button>
                  <span className="pointer-events-none absolute left-6 top-2 rounded bg-overlay/72 px-1.5 py-0.5 font-mono text-[9px] text-white">
                    Clip {index + 1}
                  </span>
                  {hasAudio && !audioDetached && <AudioWaveform src={recordingUrl} sourceStartMs={clip.sourceStartMs} sourceEndMs={clip.sourceEndMs} sourceDurationMs={sourceDurationMs} volume={clip.volume} className="left-0 bottom-0 h-5 text-primary-950" />}
                  <span className="pointer-events-none absolute bottom-1.5 left-6 z-10 rounded bg-selection/75 px-1 font-mono text-[9px] font-semibold text-primary-950 backdrop-blur-[1px]">
                    {timeLabel(clipDuration)} · {getPlaybackRate(clip)}×
                  </span>
                  <ClipContextMenu label={`Clip ${index + 1}`} onOpen={() => setSelection({ kind: 'recording', id: clip.id })} onDownload={() => onDownloadClip(clip)} onDuplicate={duplicateSelectedTimelineItem} onDelete={deleteSelectedTimelineItem} onSplitAudio={hasAudio && !audioDetached ? splitSelectedTimelineItemAudio : undefined} />
                </div>
              );
            })}
          </div>}
          <ZoomTimelineLane timelineDurationMs={timelineDurationMs} onDragStateChange={setLockedDragDurationMs} />
          <TextTimelineLane timelineDurationMs={timelineDurationMs} onDragStateChange={setLockedDragDurationMs} />
          <GestureTimelineLane editedRecordingDurationMs={editedRecordingDurationMs} timelineDurationMs={timelineDurationMs} onDragStateChange={setLockedDragDurationMs} />
          <MediaTimelineLane
            items={timelineMedia}
            assets={assets}
            recordingUrl={recordingUrl}
            recordingDurationMs={sourceDurationMs}
            timelineDurationMs={timelineDurationMs}
            onItemsChange={setTimelineMedia}
            onDragStateChange={setLockedDragDurationMs}
          />
        </div>
      </div>
    </section>
  );
}
