import type { CSSProperties } from 'react';
import type { ZoomAnimation, ZoomClip, ZoomPoint, ZoomTarget } from './types';

export interface ResolvedZoom {
  positionX: number;
  positionY: number;
  zoom: number;
}

export function zoomTargetsMatch(left: ZoomTarget, right: ZoomTarget): boolean {
  return left.kind === right.kind && (left.kind === 'canvas' || (right.kind !== 'canvas' && left.id === right.id));
}

function ease(progress: number, animation: ZoomAnimation): number {
  const value = Math.max(0, Math.min(1, progress));
  if (animation === 'snap') return value < 1 ? 0 : 1;
  if (animation === 'linear') return value;
  if (animation === 'ease-in') return value * value * value;
  if (animation === 'ease-out') return 1 - Math.pow(1 - value, 3);
  return value * value * (3 - 2 * value);
}

function interpolatePoint(from: ResolvedZoom, to: ResolvedZoom, progress: number, animation: ZoomAnimation): ResolvedZoom {
  const amount = ease(progress, animation);
  return {
    positionX: from.positionX + (to.positionX - from.positionX) * amount,
    positionY: from.positionY + (to.positionY - from.positionY) * amount,
    zoom: from.zoom + (to.zoom - from.zoom) * amount,
  };
}

export function resolveZoom(clips: ZoomClip[], target: ZoomTarget, timelineTimeMs: number): ResolvedZoom {
  const active = clips.find((clip) => zoomTargetsMatch(clip.target, target) && timelineTimeMs >= clip.timelineStartMs && timelineTimeMs <= clip.timelineStartMs + clip.durationMs);
  const neutral: ResolvedZoom = { positionX: 50, positionY: 50, zoom: 1 };
  if (!active || active.points.length === 0) return neutral;
  const timeMs = timelineTimeMs - active.timelineStartMs;
  const points = [...active.points].sort((left, right) => left.timeMs - right.timeMs);
  let previous: ResolvedZoom = neutral;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (timeMs < point.timeMs) return previous;
    const nextPoint = points[index + 1];
    const availableDurationMs = nextPoint ? nextPoint.timeMs - point.timeMs : Number.POSITIVE_INFINITY;
    const transitionDurationMs = active.animation === 'snap'
      ? 0
      : Math.min(Math.max(0, active.transitionDurationMs ?? 400), availableDurationMs);
    if (transitionDurationMs > 0 && timeMs < point.timeMs + transitionDurationMs) {
      return interpolatePoint(previous, point, (timeMs - point.timeMs) / transitionDurationMs, active.animation);
    }
    previous = point;
  }

  return previous;
}

export function getZoomStyle(clips: ZoomClip[], target: ZoomTarget, timelineTimeMs: number): CSSProperties {
  const zoom = resolveZoom(clips, target, timelineTimeMs);
  if (zoom.zoom <= 1.001) return {};
  return {
    transform: `scale(${zoom.zoom})`,
    transformOrigin: `${zoom.positionX}% ${zoom.positionY}%`,
  };
}
