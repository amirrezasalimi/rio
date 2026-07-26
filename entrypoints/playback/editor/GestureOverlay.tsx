import { MousePointer2 } from 'lucide-react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { CropArea, RecordedInteraction } from '../../shared/recording/types';
import type { EditorClip, GestureAction, GestureClip, MediaTransform } from './types';
import { getClipMediaTransform } from './types';

interface ProjectedEvent extends RecordedInteraction {
  timelineMs: number;
  x: number;
  y: number;
}

function getAction(event: RecordedInteraction): GestureAction {
  if (event.kind === 'click') return 'click';
  if (event.kind === 'double-click') return 'double-click';
  if (event.kind.startsWith('drag')) return 'drag';
  if (event.kind === 'scroll') return 'scroll';
  return 'pointer';
}

function getSourcePoint(event: RecordedInteraction, sourceWidth: number, sourceHeight: number, crop?: CropArea) {
  if (event.x === undefined || event.y === undefined) return undefined;
  if (crop) {
    const x = (event.x - crop.x) / crop.width;
    const y = (event.y - crop.y) / crop.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return undefined;
    return { x, y };
  }
  const scale = Math.min(sourceWidth / Math.max(1, event.viewportWidth), sourceHeight / Math.max(1, event.viewportHeight));
  const contentWidth = event.viewportWidth * scale;
  const contentHeight = event.viewportHeight * scale;
  return {
    x: (Math.max(0, (sourceWidth - contentWidth) / 2) + event.x * scale) / sourceWidth,
    y: (Math.max(0, (sourceHeight - contentHeight) / 2) + event.y * scale) / sourceHeight,
  };
}

function getMediaBounds(clip: EditorClip | undefined, fallback: MediaTransform, canvasWidth: number, canvasHeight: number, sourceWidth: number, sourceHeight: number) {
  const media = clip ? getClipMediaTransform(clip, fallback) : fallback;
  const fit = Math.min(canvasWidth / sourceWidth, canvasHeight / sourceHeight) * media.scale / 100;
  const width = sourceWidth * fit;
  const height = sourceHeight * fit;
  return {
    left: canvasWidth * media.positionX / 100 - width / 2,
    top: canvasHeight * media.positionY / 100 - height / 2,
    width,
    height,
  };
}

function Effect({ event, ageMs, clip }: { event: ProjectedEvent; ageMs: number; clip: GestureClip }) {
  const settings = clip.settings;
  const progress = Math.max(0, Math.min(1, ageMs / settings.durationMs));
  const color = event.kind.startsWith('drag') ? settings.dragColor : settings.clickColor;
  const scale = settings.animation === 'pulse'
    ? interpolate(progress, [0, 0.35, 1], [0.3, 1.15, 0.85])
    : settings.animation === 'burst'
      ? interpolate(progress, [0, 1], [0.2, 1.6])
      : interpolate(progress, [0, 1], [0.25, 1.8]);
  const opacity = interpolate(progress, [0, 0.65, 1], [1, 0.7, 0]);
  const rings = event.kind === 'double-click' ? [0, 0.16] : [0];

  return rings.map((delay) => {
    const delayedProgress = Math.max(0, Math.min(1, (progress - delay) / Math.max(0.01, 1 - delay)));
    if (progress < delay) return null;
    return <span key={delay} style={{ position: 'absolute', left: event.x, top: event.y, width: settings.effectSize, height: settings.effectSize, borderRadius: '50%', border: `${Math.max(2, settings.trailWidth * 0.65)}px solid ${color}`, background: settings.animation === 'pulse' ? `color-mix(in srgb, ${color} 28%, transparent)` : 'transparent', transform: `translate(-50%, -50%) scale(${scale * (0.85 + delayedProgress * 0.15)})`, opacity: opacity * settings.opacity / 100 }} />;
  });
}

export function GestureOverlay({ gestureClips, interactions, clips, crop, canvasWidth, canvasHeight, sourceWidth, sourceHeight, media }: { gestureClips: GestureClip[]; interactions: RecordedInteraction[]; clips: EditorClip[]; crop?: CropArea; canvasWidth: number; canvasHeight: number; sourceWidth: number; sourceHeight: number; media: MediaTransform }) {
  const { fps } = useVideoConfig();
  const timelineMs = useCurrentFrame() / fps * 1_000;

  return gestureClips.map((gestureClip) => {
    const duration = gestureClip.sourceEndMs - gestureClip.sourceStartMs;
    if (timelineMs < gestureClip.timelineStartMs || timelineMs > gestureClip.timelineStartMs + duration) return null;
    const projected = interactions.flatMap((event): ProjectedEvent[] => {
      const action = getAction(event);
      if (!gestureClip.settings.enabled[action]) return [];
      const point = getSourcePoint(event, sourceWidth, sourceHeight, crop);
      if (!point && action !== 'scroll') return [];

      return clips.flatMap((recordingClip): ProjectedEvent[] => {
        if (event.timestampMs < recordingClip.sourceStartMs || event.timestampMs > recordingClip.sourceEndMs) return [];
        const editedTimelineMs = recordingClip.timelineStartMs + event.timestampMs - recordingClip.sourceStartMs;
        if (editedTimelineMs < gestureClip.timelineStartMs || editedTimelineMs > gestureClip.timelineStartMs + duration) return [];
        const bounds = getMediaBounds(recordingClip, media, canvasWidth, canvasHeight, sourceWidth, sourceHeight);
        return [{
          ...event,
          timelineMs: editedTimelineMs,
          x: point ? bounds.left + point.x * bounds.width : bounds.left + bounds.width / 2,
          y: point ? bounds.top + point.y * bounds.height : bounds.top + bounds.height / 2,
        }];
      });
    });
    const cursor = [...projected].reverse().find((event) => event.timelineMs <= timelineMs && event.x !== undefined && event.kind !== 'scroll' && timelineMs - event.timelineMs < 1_500);
    const effects = projected.filter((event) => ['click', 'double-click', 'drag-start', 'drag-end'].includes(event.kind) && timelineMs >= event.timelineMs && timelineMs - event.timelineMs <= gestureClip.settings.durationMs);
    const dragPoints = projected.filter((event) => event.kind.startsWith('drag') && event.timelineMs <= timelineMs && timelineMs - event.timelineMs < 450).slice(-18);
    const scroll = [...projected].reverse().find((event) => event.kind === 'scroll' && event.timelineMs <= timelineMs && timelineMs - event.timelineMs <= gestureClip.settings.durationMs);

    return (
      <div key={gestureClip.id} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {dragPoints.length > 1 && gestureClip.settings.enabled.drag && <svg width={canvasWidth} height={canvasHeight} style={{ position: 'absolute', inset: 0, opacity: gestureClip.settings.opacity / 100 }}><polyline points={dragPoints.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={gestureClip.settings.dragColor} strokeWidth={gestureClip.settings.trailWidth} strokeLinecap="round" strokeLinejoin="round" /></svg>}
        {effects.map((event, index) => <Effect key={`${event.kind}-${event.timestampMs}-${index}`} event={event} ageMs={timelineMs - event.timelineMs} clip={gestureClip} />)}
        {cursor && gestureClip.settings.enabled.pointer && <MousePointer2 fill={gestureClip.settings.cursorColor} color="#ffffff" strokeWidth={2.2} style={{ position: 'absolute', left: cursor.x, top: cursor.y, width: gestureClip.settings.cursorSize, height: gestureClip.settings.cursorSize, transform: 'translate(-16%, -12%)', opacity: gestureClip.settings.opacity / 100, filter: 'drop-shadow(0 2px 3px rgba(24,50,74,.3))' }} />}
        {scroll && <div style={{ position: 'absolute', left: scroll.x, top: scroll.y, transform: `translate(-50%, -50%) scale(${interpolate(timelineMs - scroll.timelineMs, [0, gestureClip.settings.durationMs], [0.82, 1.08])})`, width: gestureClip.settings.effectSize * 0.52, height: gestureClip.settings.effectSize, borderRadius: 999, background: `color-mix(in srgb, ${gestureClip.settings.scrollColor} 86%, transparent)`, border: `2px solid ${gestureClip.settings.cursorColor}`, opacity: interpolate(timelineMs - scroll.timelineMs, [0, gestureClip.settings.durationMs], [gestureClip.settings.opacity / 100, 0]), boxShadow: '0 4px 16px rgba(24,50,74,.22)' }}><span style={{ position: 'absolute', left: '50%', top: '18%', width: 3, height: '28%', borderRadius: 9, background: gestureClip.settings.cursorColor, transform: 'translateX(-50%)' }} /></div>}
      </div>
    );
  });
}
