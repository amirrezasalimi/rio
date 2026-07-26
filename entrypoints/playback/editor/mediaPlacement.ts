import type { TimelineAssetSource, TimelineMediaItem } from './types';

const MIN_ITEM_MS = 150;

export function createTimelineMediaPlacement(
  asset: TimelineAssetSource,
  timelineStartMs: number,
  position?: { x: number; y: number },
): TimelineMediaItem {
  const duration = asset.type === 'image' ? 5_000 : Math.max(asset.durationMs, MIN_ITEM_MS);
  return {
    id: crypto.randomUUID(),
    assetId: asset.id,
    type: asset.type,
    name: asset.name,
    assetDurationMs: duration,
    sourceStartMs: 0,
    sourceEndMs: duration,
    timelineStartMs: Math.max(0, timelineStartMs),
    playbackRate: 1,
    scale: asset.type === 'audio' ? 0 : 42,
    positionX: position?.x ?? 50,
    positionY: position?.y ?? 50,
    opacity: 100,
    volume: 100,
    fadeInMs: 0,
    fadeOutMs: 0,
    holdLastFrame: false,
  };
}
