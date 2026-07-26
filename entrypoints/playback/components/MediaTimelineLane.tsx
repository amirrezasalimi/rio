import {
  FileAudio,
  FileImage,
  FileVideo,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../editor/store';
import type {
  TimelineAssetSource,
  TimelineMediaItem,
  TimelineMediaType,
} from '../editor/types';
import { getTimelineItemDurationMs } from '../editor/types';

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
}

interface MediaTimelineLaneProps {
  items: TimelineMediaItem[];
  timelineDurationMs: number;
  onItemsChange: (items: TimelineMediaItem[]) => void;
  onDragStateChange: (lockedDurationMs: number | undefined) => void;
}

const TYPE_STYLES: Record<TimelineMediaType, string> = {
  image: 'border-accent-300 bg-accent-100 text-accent-900',
  video: 'border-primary-300 bg-primary-100 text-primary-950',
  audio: 'border-cream-400 bg-cream-200 text-cream-950',
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

export function MediaLibrary({
  assets,
  items,
  timelineDurationMs,
  currentTimeMs,
  onItemsChange,
  onUpload,
  onDeleteAsset,
}: MediaLibraryProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const setSelection = useEditorStore((state) => state.setSelectedTimelineItem);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside, true);
    return () => document.removeEventListener('pointerdown', closeOutside, true);
  }, [open]);

  const addPlacement = (asset: TimelineAssetSource) => {
    const duration = asset.type === 'image'
      ? 5_000
      : Math.max(asset.durationMs, MIN_ITEM_MS);
    const start = Math.max(
      0,
      Math.min(currentTimeMs, timelineDurationMs - MIN_ITEM_MS),
    );
    const placement: TimelineMediaItem = {
      id: crypto.randomUUID(),
      assetId: asset.id,
      type: asset.type,
      name: asset.name,
      assetDurationMs: duration,
      sourceStartMs: 0,
      sourceEndMs: duration,
      timelineStartMs: start,
      scale: asset.type === 'audio' ? 0 : 42,
      positionX: 50,
      positionY: 50,
      opacity: 100,
      volume: 100,
      fadeInMs: 0,
      fadeOutMs: 0,
      holdLastFrame: false,
    };
    onItemsChange([...items, placement]);
    setSelection({ kind: 'media', id: placement.id });
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-xl border border-border bg-cream-50 px-2.5 py-2 text-[10px] font-semibold transition hover:border-primary-300 hover:bg-primary-50"
      >
        <Plus className="size-3.5" /> Add media
      </button>
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

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[70] w-72 rounded-2xl border border-border bg-surface p-2 shadow-2xl shadow-ink/15">
          <div className="mb-2 flex items-center justify-between px-1">
            <div>
              <p className="text-[10px] font-semibold">Project media</p>
              <p className="text-[8px] text-muted">Add at the current playhead</p>
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg bg-primary-500 px-2 py-1 text-[9px] font-semibold text-white hover:bg-primary-600"
            >
              Upload
            </button>
          </div>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {assets.length === 0 && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full rounded-xl border border-dashed border-primary-200 bg-primary-50 p-5 text-[9px] font-semibold text-primary-700"
              >
                Choose an image, video, or audio file
              </button>
            )}
            {assets.map((asset) => (
              <div key={asset.id} className="flex items-center gap-2 rounded-xl border border-border bg-cream-50 p-1.5">
                <button type="button" onClick={() => addPlacement(asset)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${TYPE_STYLES[asset.type]}`}><TypeIcon type={asset.type} /></span>
                  <span className="min-w-0">
                    <span className="block truncate text-[9px] font-semibold text-ink">{asset.name}</span>
                    <span className="block text-[8px] capitalize text-muted">{asset.type}</span>
                  </span>
                </button>
                <button type="button" aria-label={`Delete ${asset.name}`} onClick={() => onDeleteAsset(asset.id)} className="rounded-lg p-1.5 text-danger hover:bg-accent-50"><Trash2 className="size-3" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function MediaTimelineLane({
  items,
  timelineDurationMs,
  onItemsChange,
  onDragStateChange,
}: MediaTimelineLaneProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const selection = useEditorStore((state) => state.selectedTimelineItem);
  const setSelection = useEditorStore((state) => state.setSelectedTimelineItem);
  const selectedId = selection?.kind === 'media' ? selection.id : undefined;

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
    const startX = event.clientX;
    const pixelsPerMs = bounds.width / timelineDurationMs;
    const pointerTarget = event.currentTarget as HTMLElement;
    pointerTarget.setPointerCapture(event.pointerId);
    onDragStateChange(timelineDurationMs);
    setSelection({ kind: 'media', id: initial.id });

    const onMove = (moveEvent: PointerEvent) => {
      const delta = snap((moveEvent.clientX - startX) / pixelsPerMs);
      onItemsChange(items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        if (interaction === 'item') {
          return { ...item, timelineStartMs: Math.max(0, initial.timelineStartMs + delta) };
        }
        if (interaction === 'start') {
          const latestSourceStartMs = initial.type === 'image'
            ? initial.sourceEndMs - MIN_ITEM_MS
            : Math.min(
                initial.sourceEndMs - MIN_ITEM_MS,
                initial.assetDurationMs - MIN_ITEM_MS,
              );
          const sourceStartMs = Math.max(
            0,
            Math.min(latestSourceStartMs, initial.sourceStartMs + delta),
          );
          return {
            ...item,
            sourceStartMs,
            timelineStartMs: Math.max(
              0,
              initial.timelineStartMs + sourceStartMs - initial.sourceStartMs,
            ),
          };
        }
        return {
          ...item,
          sourceEndMs: initial.type === 'audio'
            ? Math.min(
                initial.assetDurationMs,
                Math.max(initial.sourceStartMs + MIN_ITEM_MS, initial.sourceEndMs + delta),
              )
            : Math.max(
                initial.sourceStartMs + MIN_ITEM_MS,
                initial.sourceEndMs + delta,
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
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop, { once: true });
    window.addEventListener('pointercancel', stop, { once: true });
  };

  return (
    <div ref={trackRef} className="relative shrink-0 border-t border-border/70 bg-surface/60">
      {items.length === 0 && (
        <div className="flex h-11 items-center px-3 text-[8px] text-muted">Added media will appear on separate tracks.</div>
      )}
      {items.map((item, index) => {
        const selected = item.id === selectedId;
        const extendsPastSource = item.type === 'video' && item.sourceEndMs > item.assetDurationMs;
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
                onClick={() => setSelection({ kind: 'media', id: item.id })}
                className={`absolute inset-0 cursor-grab overflow-hidden rounded-lg border-2 transition-colors active:cursor-grabbing ${TYPE_STYLES[item.type]} ${selected ? 'ring-2 ring-primary-500/25' : ''}`}
              >
                {item.type === 'audio' && <AudioEnvelope item={item} />}
                <div className="pointer-events-none absolute inset-y-0 left-6 right-6 z-10 flex min-w-0 items-center gap-1.5">
                  <TypeIcon type={item.type} />
                  <span className="truncate text-[8px] font-semibold">{item.name}</span>
                  {extendsPastSource && <span className="shrink-0 rounded bg-surface/75 px-1 py-0.5 text-[7px] font-semibold">Held</span>}
                </div>
              </div>
              <button
                type="button"
                aria-label={`Trim start of ${item.name}`}
                onPointerDown={(event) => startDrag(event, index, 'start')}
                className="pointer-events-auto absolute inset-y-0 left-0 z-50 flex w-6 -translate-x-1/2 cursor-ew-resize touch-none items-center justify-center rounded-l-lg bg-ink/70 text-white"
              >
                <GripVertical className="size-3" />
              </button>
              <button
                type="button"
                aria-label={`Extend or trim end of ${item.name}`}
                title={item.type === 'video' ? 'Drag to extend past the original video duration' : 'Drag to resize'}
                onPointerDown={(event) => startDrag(event, index, 'end')}
                className="pointer-events-auto absolute inset-y-0 right-0 z-50 flex w-6 translate-x-1/2 cursor-ew-resize touch-none items-center justify-center rounded-r-lg bg-ink/70 text-white"
              >
                <GripVertical className="size-3" />
              </button>
            </div>
            {selected && (
              <button
                type="button"
                onClick={() => {
                  onItemsChange(items.filter((candidate) => candidate.id !== selectedId));
                  const firstClip = useEditorStore.getState().clips[0];
                  setSelection(firstClip ? { kind: 'recording', id: firstClip.id } : undefined);
                }}
                className="absolute right-2 top-1.5 z-10 rounded-lg bg-surface p-1.5 text-danger shadow-sm hover:bg-accent-50"
                aria-label="Remove selected media from timeline"
              >
                <Trash2 className="size-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
