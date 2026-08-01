import {
  FileAudio,
  FileImage,
  FileVideo,
  GripVertical,
  ImagePlus,
  MousePointerClick,
  Plus,
  Search,
  Scissors,
  Trash2,
  Type,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { deleteSelectedTimelineItem, duplicateSelectedTimelineItem } from '../editor/clipActions';
import { useEditorStore } from '../editor/store';
import { captureSelectedTimelineStarts, moveSelectedTimelineItems, selectionKey } from '../editor/timelineSelection';
import type {
  TimelineAssetSource,
  TimelineMediaItem,
  TimelineMediaType,
} from '../editor/types';
import { getPlaybackRate, getTimelineItemDurationMs } from '../editor/types';
import { createTimelineMediaPlacement } from '../editor/mediaPlacement';
import { AudioWaveform } from './AudioWaveform';
import { ClipContextMenu } from './ClipContextMenu';

const MIN_ITEM_MS = 150;
const SNAP_MS = 50;

interface MediaLibraryProps {
  assets: TimelineAssetSource[];
  items: TimelineMediaItem[];
  timelineDurationMs: number;
  currentTimeMs: number;
  onItemsChange: (items: TimelineMediaItem[]) => void;
  onUpload: (files: FileList) => void;
  onDeleteAsset: (assetId: string) => void;
  onAddGesture: () => void;
  onAddOriginal: () => void;
  onAddText: () => void;
  onAddZoom: () => void;
  onSplitClip: () => void;
  canAddGesture: boolean;
}

interface MediaTimelineLaneProps {
  items: TimelineMediaItem[];
  assets: TimelineAssetSource[];
  recordingUrl?: string;
  recordingDurationMs: number;
  timelineDurationMs: number;
  onItemsChange: (items: TimelineMediaItem[]) => void;
  onDragStateChange: (lockedDurationMs: number | undefined) => void;
}

const TYPE_STYLES: Record<TimelineMediaType, string> = {
  image: 'border-border bg-[var(--color-timeline-image)] text-ink',
  video: 'border-border bg-[var(--color-timeline-video)] text-ink',
  audio: 'border-border bg-[var(--color-timeline-audio)] text-ink',
};

function TypeIcon({ type }: { type: TimelineMediaType }) {
  const className = 'size-3.5 shrink-0';
  if (type === 'image') return <FileImage className={className} />;
  if (type === 'audio') return <FileAudio className={className} />;
  return <FileVideo className={className} />;
}

function snap(value: number): number {
  return Math.round(value / SNAP_MS) * SNAP_MS;
}

function timeLabel(milliseconds: number): string {
  const seconds = Math.max(0, milliseconds) / 1_000;
  return seconds < 10 ? `${seconds.toFixed(1)}s` : `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

function AudioEnvelope({ item }: { item: TimelineMediaItem }) {
  const durationMs = Math.max(MIN_ITEM_MS, getTimelineItemDurationMs(item));
  const fadeInX = Math.min(50, Math.max(0, item.fadeInMs / durationMs * 100));
  const fadeOutX = Math.min(50, Math.max(0, item.fadeOutMs / durationMs * 100));
  const levelY = 30 - Math.max(0, Math.min(100, item.volume)) * 0.22;
  const startY = fadeInX > 0 ? 34 : levelY;
  const endY = fadeOutX > 0 ? 34 : levelY;
  const fadeOutStartX = 100 - fadeOutX;
  const curve = [
    `M 0 ${startY}`,
    fadeInX > 0
      ? `C ${fadeInX * 0.18} ${startY}, ${fadeInX * 0.58} ${levelY}, ${fadeInX} ${levelY}`
      : `L 0 ${levelY}`,
    `L ${fadeOutStartX} ${levelY}`,
    fadeOutX > 0
      ? `C ${fadeOutStartX + fadeOutX * 0.42} ${levelY}, ${100 - fadeOutX * 0.18} ${endY}, 100 ${endY}`
      : `L 100 ${levelY}`,
  ].join(' ');

  return (
    <svg aria-hidden="true" viewBox="0 0 100 36" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full text-cream-950/55">
      <path d={`${curve} L 100 36 L 0 36 Z`} fill="currentColor" opacity="0.12" />
      <path d={curve} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

import { useHistoryStore } from '../editor/history';

export function MediaLibrary({
  assets,
  items,
  timelineDurationMs,
  currentTimeMs,
  onItemsChange,
  onUpload,
  onDeleteAsset,
  onAddGesture,
  onAddOriginal,
  onAddText,
  onAddZoom,
  onSplitClip,
  canAddGesture,
}: MediaLibraryProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ left: 0, top: 0, maxHeight: 320 });
  const setSelection = useEditorStore((state) => state.setSelectedTimelineItem);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !popoverRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside, true);
    return () => document.removeEventListener('pointerdown', closeOutside, true);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const positionPopover = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const margin = 12;
      const gap = 8;
      const width = popoverRef.current?.offsetWidth ?? 288;
      const height = popoverRef.current?.offsetHeight ?? 320;
      const hasRoomOnRight = trigger.right + gap + width <= window.innerWidth - margin;
      const left = hasRoomOnRight ? trigger.right + gap : Math.max(margin, trigger.left - gap - width);
      const top = Math.max(margin, Math.min(trigger.top, window.innerHeight - margin - height));
      setPopoverPosition({ left, top, maxHeight: window.innerHeight - margin * 2 });
    };
    positionPopover();
    window.addEventListener('resize', positionPopover);
    window.addEventListener('scroll', positionPopover, true);
    return () => {
      window.removeEventListener('resize', positionPopover);
      window.removeEventListener('scroll', positionPopover, true);
    };
  }, [open, assets.length]);

  const addPlacement = (asset: TimelineAssetSource) => {
    useHistoryStore.getState().record('Add media placement');
    const start = Math.max(
      0,
      Math.min(currentTimeMs, timelineDurationMs - MIN_ITEM_MS),
    );
    const placement = createTimelineMediaPlacement(asset, start);
    onItemsChange([...items, placement]);
    setSelection({ kind: 'media', id: placement.id });
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-xl border border-border bg-control px-2.5 py-2 text-[10px] font-semibold transition hover:border-primary-300 hover:bg-control-hover"
      >
        <Plus className="size-3.5" /> Add item
      </button>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          if (event.currentTarget.files?.length) onUpload(event.currentTarget.files);
          event.currentTarget.value = '';
          setOpen(false);
        }}
      />
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*"
        className="hidden"
        onChange={(event) => {
          if (event.currentTarget.files?.length) {
            onUpload(event.currentTarget.files);
            setOpen(false);
          }
          event.currentTarget.value = '';
        }}
      />

      {open && createPortal(
        <div ref={popoverRef} role="dialog" aria-label="Add timeline item" className="fixed z-[100] w-72 overflow-y-auto rounded-2xl border border-border bg-surface p-2 shadow-2xl shadow-ink/15" style={{ left: popoverPosition.left, top: popoverPosition.top, maxHeight: popoverPosition.maxHeight }}>
          <div className="mb-2 px-1"><p className="text-[10px] font-semibold">Add item</p><p className="text-[9px] text-muted">Place it at the current playhead</p></div>
          <div className="mb-2 grid grid-cols-2 gap-1.5">
            <button type="button" onClick={() => inputRef.current?.click()} className="flex items-center gap-2 rounded-xl border border-border bg-control p-2 text-[9px] font-semibold hover:border-primary-300"><FileVideo className="size-3.5 text-primary-600" /> Media</button>
            <button type="button" onClick={() => imageInputRef.current?.click()} className="flex items-center gap-2 rounded-xl border border-border bg-control p-2 text-[9px] font-semibold hover:border-primary-300"><ImagePlus className="size-3.5 text-primary-600" /> Image</button>
            <button type="button" disabled={!canAddGesture} onClick={() => { onAddGesture(); setOpen(false); }} className="flex items-center gap-2 rounded-xl border border-border bg-control p-2 text-[9px] font-semibold hover:border-primary-300 disabled:opacity-40"><MousePointerClick className="size-3.5 text-primary-600" /> Gestures</button>
            <button type="button" onClick={() => { onSplitClip(); setOpen(false); }} className="flex items-center gap-2 rounded-xl border border-border bg-control p-2 text-[9px] font-semibold hover:border-primary-300"><Scissors className="size-3.5 text-primary-600" /> Split clip</button>
            <button type="button" onClick={() => { onAddText(); setOpen(false); }} className="flex items-center gap-2 rounded-xl border border-border bg-control p-2 text-[9px] font-semibold hover:border-primary-300"><Type className="size-3.5 text-primary-600" /> Text</button>
            <button type="button" onClick={() => { onAddZoom(); setOpen(false); }} className="flex items-center gap-2 rounded-xl border border-border bg-control p-2 text-[9px] font-semibold hover:border-primary-300"><Search className="size-3.5 text-primary-600" /> Zoom</button>
          </div>
          <p className="mb-1 px-1 text-[9px] font-semibold uppercase tracking-wide text-muted">Project media</p>
          <div className="max-h-36 space-y-1 overflow-y-auto">
            <button type="button" onClick={() => { onAddOriginal(); setOpen(false); }} className="flex w-full items-center gap-2 rounded-xl border border-primary-200 bg-selection p-1.5 text-left hover:border-selection-border"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-100 text-primary-950"><FileVideo className="size-3.5" /></span><span><span className="block text-[9px] font-semibold text-ink">Original recording</span><span className="block text-[9px] text-muted">Permanent source asset</span></span></button>
            {assets.length === 0 && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full rounded-xl border border-dashed border-primary-200 bg-selection p-5 text-[9px] font-semibold text-primary-700"
              >
                Choose an image, video, or audio file
              </button>
            )}
            {assets.map((asset) => (
              <div key={asset.id} className="flex items-center gap-2 rounded-xl border border-border bg-control p-1.5">
                <button type="button" onClick={() => addPlacement(asset)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${TYPE_STYLES[asset.type]}`}><TypeIcon type={asset.type} /></span>
                  <span className="min-w-0">
                    <span className="block truncate text-[9px] font-semibold text-ink">{asset.name}</span>
                    <span className="block text-[9px] capitalize text-muted">{asset.type}</span>
                  </span>
                </button>
                <button type="button" aria-label={`Delete ${asset.name}`} onClick={() => onDeleteAsset(asset.id)} className="rounded-lg p-1.5 text-danger hover:bg-danger-soft"><Trash2 className="size-3" /></button>
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

export function MediaTimelineLane({
  items,
  assets,
  recordingUrl,
  recordingDurationMs,
  timelineDurationMs,
  onItemsChange,
  onDragStateChange,
}: MediaTimelineLaneProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const selectedItems = useEditorStore((state) => state.selectedTimelineItems);
  const selectItem = useEditorStore((state) => state.selectTimelineItem);
  const setSelection = useEditorStore((state) => state.setSelectedTimelineItem);


  const startDrag = (
    event: React.PointerEvent,
    index: number,
    interaction: 'item' | 'start' | 'end',
  ) => {
    event.stopPropagation();
    event.preventDefault();
    const bounds = trackRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const initial = items[index];
    const minimumSourceDurationMs = MIN_ITEM_MS * (initial.type === 'video' ? getPlaybackRate(initial) : 1);
    const startX = event.clientX;
    const pixelsPerMs = bounds.width / timelineDurationMs;
    const pointerTarget = event.currentTarget as HTMLElement;
    pointerTarget.setPointerCapture(event.pointerId);
    onDragStateChange(timelineDurationMs);
    const itemSelection = { kind: 'media' as const, id: initial.id };
    const alreadySelected = useEditorStore.getState().selectedTimelineItems.some((s) => selectionKey(s) === selectionKey(itemSelection));
    if (event.shiftKey) selectItem(itemSelection, true);
    else if (!alreadySelected) selectItem(itemSelection, false);
    useHistoryStore.getState().beginTransaction(interaction === 'item' ? 'Move timeline items' : 'Trim media clip');
    const initialStarts = captureSelectedTimelineStarts();
    const minimumStart = Math.min(...initialStarts.values());

    const onMove = (moveEvent: PointerEvent) => {
      const delta = snap((moveEvent.clientX - startX) / pixelsPerMs);
      const sourceDelta = initial.type === 'video' ? delta * getPlaybackRate(initial) : delta;
      if (interaction === 'item') {
        moveSelectedTimelineItems(Math.max(-minimumStart, delta), initialStarts);
        return;
      }
      onItemsChange(items.map((item) => {
        if (item.id !== initial.id) return item;
        if (interaction === 'start') {
          const latestSourceStartMs = initial.type === 'image'
            ? initial.sourceEndMs - MIN_ITEM_MS
            : Math.min(
                initial.sourceEndMs - minimumSourceDurationMs,
                initial.assetDurationMs - minimumSourceDurationMs,
              );
          const sourceStartMs = Math.max(
            0,
            Math.min(latestSourceStartMs, initial.sourceStartMs + sourceDelta),
          );
          return {
            ...item,
            sourceStartMs,
            timelineStartMs: Math.max(
              0,
              initial.timelineStartMs + (sourceStartMs - initial.sourceStartMs) / (initial.type === 'video' ? getPlaybackRate(initial) : 1),
            ),
          };
        }
        return {
          ...item,
          sourceEndMs: initial.type === 'audio'
            ? Math.min(
                initial.assetDurationMs,
                Math.max(initial.sourceStartMs + minimumSourceDurationMs, initial.sourceEndMs + sourceDelta),
              )
            : Math.max(
                initial.sourceStartMs + minimumSourceDurationMs,
                initial.sourceEndMs + sourceDelta,
              ),
        };
      }));
    };

    const stop = () => {
      if (pointerTarget.hasPointerCapture(event.pointerId)) {
        pointerTarget.releasePointerCapture(event.pointerId);
      }
      onDragStateChange(undefined);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      useHistoryStore.getState().commitTransaction();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop, { once: true });
    window.addEventListener('pointercancel', stop, { once: true });
  };

  if (items.length === 0) return null;

  return (
    <div ref={trackRef} className="relative shrink-0 border-t border-border/70 bg-surface/60">
      {items.map((item, index) => {
        const selected = selectedItems.some((selection) => selection.kind === 'media' && selection.id === item.id);
        const extendsPastSource = item.type === 'video' && item.sourceEndMs > item.assetDurationMs;
        const waveformSource = item.assetId === 'original-recording-audio'
          ? recordingUrl
          : assets.find((asset) => asset.id === item.assetId)?.url;
        return (
          <div key={item.id} className="relative h-12 border-b border-border/60 last:border-b-0">
            <div
              data-clip
              className="absolute bottom-1 top-1 max-h-10 touch-none"
              style={{
                left: `${item.timelineStartMs / timelineDurationMs * 100}%`,
                width: `${getTimelineItemDurationMs(item) / timelineDurationMs * 100}%`,
              }}
            >
              <div
                role="button"
                tabIndex={0}
                onPointerDown={(event) => startDrag(event, index, 'item')}
                onClick={(event) => { if (event.detail === 0) selectItem({ kind: 'media', id: item.id }, event.shiftKey); }}
                className={`absolute inset-0 cursor-grab overflow-hidden rounded-lg border transition-colors active:cursor-grabbing ${TYPE_STYLES[item.type]} ${selected ? 'border-selection-border ring-1 ring-selection-border/35' : ''}`}
              >
                {item.type === 'audio' && <>
                  <AudioWaveform src={waveformSource} sourceStartMs={item.sourceStartMs} sourceEndMs={item.sourceEndMs} sourceDurationMs={item.assetId === 'original-recording-audio' ? recordingDurationMs : item.assetDurationMs} volume={item.volume} className="left-0 bottom-0 h-5 text-cream-950" />
                  <AudioEnvelope item={item} />
                </>}
                <div className="pointer-events-none absolute inset-y-0 left-6 right-6 z-10 flex min-w-0 items-center gap-1.5">
                  <TypeIcon type={item.type} />
                  <span className="truncate text-[9px] font-semibold">{item.name}</span>
                  {item.type === 'audio' && <span className="shrink-0 rounded bg-surface/70 px-1 font-mono text-[9px] font-semibold">{timeLabel(getTimelineItemDurationMs(item))}</span>}
                  {item.type === 'video' && <span className="shrink-0 font-mono text-[9px] font-semibold">{getPlaybackRate(item)}×</span>}
                  {extendsPastSource && <span className="shrink-0 rounded bg-surface/75 px-1 py-0.5 text-[9px] font-semibold">Held</span>}
                </div>
              </div>
              <button
                type="button"
                aria-label={`Trim start of ${item.name}`}
                onPointerDown={(event) => startDrag(event, index, 'start')}
                className="pointer-events-auto absolute inset-y-0 left-0 z-50 flex w-5 cursor-ew-resize touch-none items-center justify-center rounded-l-lg bg-[var(--color-timeline-handle)] text-white"
              >
                <GripVertical className="size-3" />
              </button>
              <button
                type="button"
                aria-label={`Extend or trim end of ${item.name}`}
                title={item.type === 'video' ? 'Drag to extend past the original video duration' : 'Drag to resize'}
                onPointerDown={(event) => startDrag(event, index, 'end')}
                className="pointer-events-auto absolute inset-y-0 right-0 z-50 flex w-5 cursor-ew-resize touch-none items-center justify-center rounded-r-lg bg-[var(--color-timeline-handle)] text-white"
              >
                <GripVertical className="size-3" />
              </button>
              <ClipContextMenu label={item.name} onOpen={() => setSelection({ kind: 'media', id: item.id })} onDuplicate={duplicateSelectedTimelineItem} onDelete={deleteSelectedTimelineItem} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
