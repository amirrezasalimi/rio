import { StaticSquircle } from '@squircle-js/react';
import { Audio, Video } from '@remotion/media';
import type { CSSProperties, ReactNode } from 'react';
import type { CropArea, RecordedInteraction } from '../../shared/recording/types';
import { AbsoluteFill, Freeze, Sequence, useVideoConfig } from 'remotion';
import type { BackgroundSettings, BorderShape, ClipVisualSettings, EditorClip, EditorSettings, FrameStyle, MediaTransform, ShadowStyle, TextClip, TimelineAssetSource, TimelineMediaItem } from './types';
import { getBackgroundCss, getClipDurationMs, getClipMediaTransform, getClipVisualSettings, getEditedDurationMs, getNoiseStyle, getPlaybackRate, getTimelineItemDurationMs } from './types';
import { GestureOverlay } from './GestureOverlay';

export interface VideoCompositionProps extends EditorSettings, Record<string, unknown> {
  src: string;
  sourceWidth: number;
  sourceHeight: number;
  sourceDurationMs: number;
  assetSources: TimelineAssetSource[];
  interactions: RecordedInteraction[];
  crop?: CropArea;
  renderScale?: number;
}



function getFrameAppearance(frameStyle: FrameStyle, borderOpacity: number, borderWidth: number, borderColor: string): CSSProperties {
  const strokeWidth = Math.max(0, borderWidth);
  const stroke = `color-mix(in srgb, ${borderColor} ${borderOpacity}%, transparent)`;
  const innerStroke = strokeWidth > 0 ? `inset 0 0 0 ${strokeWidth}px ${stroke}` : 'none';

  switch (frameStyle) {
    case 'glass-light': return { background: 'rgba(255,253,248,.44)', padding: 14, backdropFilter: 'blur(24px)', boxShadow: innerStroke };
    case 'glass-dark': return { background: 'rgba(21,42,68,.58)', padding: 14, backdropFilter: 'blur(24px)', boxShadow: innerStroke };
    case 'liquid-glass': return { background: 'linear-gradient(135deg, rgba(255,255,255,.62), rgba(134,201,255,.2))', padding: 16, backdropFilter: 'blur(30px) saturate(1.35)', boxShadow: `${innerStroke === 'none' ? '' : `${innerStroke}, `}inset 0 0 24px rgba(255,255,255,.34)` };
    case 'inset-light': return { background: '#fffdf8', padding: 16, boxShadow: `${innerStroke === 'none' ? '' : `${innerStroke}, `}inset 0 12px 28px rgba(24,50,74,.1)` };
    case 'inset-dark': return { background: '#18324a', padding: 16, boxShadow: `${innerStroke === 'none' ? '' : `${innerStroke}, `}inset 0 12px 32px rgba(0,0,0,.28)` };
    case 'outline': return { boxShadow: strokeWidth > 0 ? `0 0 0 ${strokeWidth}px ${stroke}` : 'none' };
    case 'border': return { background: stroke, padding: strokeWidth };
    default: return { background: 'transparent' };
  }
}

function getShadow(shadowStyle: ShadowStyle, opacity: number, background: BackgroundSettings, lightX: number, lightY: number): string {
  const alpha = Math.max(0, Math.min(opacity, 100)) / 100;
  if (shadowStyle === 'none') return 'none';
  if (shadowStyle === 'spread') return `0 20px 60px 12px rgba(24,50,74,${alpha * 0.72})`;
  if (shadowStyle === 'huge') return `0 48px 110px rgba(24,50,74,${alpha * 0.9})`;
  const offsetX = (50 - lightX) * .55;
  const offsetY = (50 - lightY) * .55;
  const ambientColor = background.type === 'transparent' || background.type === 'image' ? '#18324a' : background.colorB;
  return `${offsetX}px ${offsetY}px 72px color-mix(in srgb, ${ambientColor} ${Math.round(alpha * 62)}%, transparent), ${offsetX * .25}px ${offsetY * .25}px 18px rgba(24,50,74,${alpha * .35})`;
}

function Shape({ shape, width, height, radius, smoothing, style, children }: { shape: BorderShape; width: number; height: number; radius: number; smoothing: number; style: CSSProperties; children: ReactNode }) {
  if (shape === 'curved') {
    return <StaticSquircle width={width} height={height} cornerRadius={Math.min(radius, width / 2, height / 2)} cornerSmoothing={smoothing} style={style}>{children}</StaticSquircle>;
  }
  return <div style={{ ...style, borderRadius: shape === 'rounded' ? radius : 0 }}>{children}</div>;
}

function BackgroundLayer({ background }: { background: BackgroundSettings }) {
  const isImage = background.type === 'image' && background.imageUrl;
  return <>
    <AbsoluteFill style={{ background: isImage ? 'transparent' : getBackgroundCss(background) }} />
    {isImage && <AbsoluteFill style={{ overflow: 'hidden' }}><img src={background.imageUrl} alt="" style={{ position: 'absolute', width: `${background.scale}%`, height: `${background.scale}%`, maxWidth: 'none', left: `${background.positionX}%`, top: `${background.positionY}%`, transform: 'translate(-50%, -50%)', objectFit: 'cover', filter: background.blur ? `blur(${background.blur}px)` : undefined }} /></AbsoluteFill>}
    {!isImage && background.blur > 0 && <AbsoluteFill style={{ filter: `blur(${background.blur}px)`, transform: 'scale(1.04)', background: getBackgroundCss(background) }} />}
    {background.noise > 0 && <AbsoluteFill style={{ opacity: background.noise / 100, ...getNoiseStyle(background.noiseType) as CSSProperties }} />}
  </>;
}

function TimelineMediaSurface({ item, asset, canvasWidth, canvasHeight, defaultVisual, background, children }: { item: TimelineMediaItem; asset: TimelineAssetSource; canvasWidth: number; canvasHeight: number; defaultVisual: ClipVisualSettings; background: BackgroundSettings; children: ReactNode }) {
  const visual = { ...defaultVisual, ...item.visual };
  const sourceWidth = Math.max(1, asset.width);
  const sourceHeight = Math.max(1, asset.height);
  const fit = Math.min(canvasWidth / sourceWidth, canvasHeight / sourceHeight) * item.scale / 100;
  const contentWidth = Math.max(2, Math.round(sourceWidth * fit));
  const contentHeight = Math.max(2, Math.round(sourceHeight * fit));
  const appearance = getFrameAppearance(visual.frameStyle, visual.borderOpacity, visual.borderWidth, visual.borderColor);
  const padding = typeof appearance.padding === 'number' ? appearance.padding : 0;
  const frameWidth = contentWidth + padding * 2;
  const frameHeight = contentHeight + padding * 2;

  return (
    <div style={{ position: 'absolute', width: frameWidth, height: frameHeight, left: `${item.positionX}%`, top: `${item.positionY}%`, transform: 'translate(-50%, -50%)', opacity: item.opacity / 100, boxShadow: getShadow(visual.shadowStyle, visual.shadowOpacity, background, visual.shadowLightX, visual.shadowLightY), borderRadius: visual.borderShape === 'sharp' ? 0 : visual.cornerRadius }}>
      <Shape shape={visual.borderShape} width={frameWidth} height={frameHeight} radius={visual.cornerRadius} smoothing={visual.cornerSmoothing} style={{ ...appearance, boxSizing: 'border-box', position: 'relative', width: frameWidth, height: frameHeight, overflow: 'hidden' }}>
        <div style={{ position: 'relative', width: contentWidth, height: contentHeight, overflow: 'hidden', borderRadius: visual.borderShape === 'rounded' ? Math.max(0, visual.cornerRadius - padding) : 0 }}>
          {children}
        </div>
      </Shape>
    </div>
  );
}

function TimelineMediaSequence({ item, asset, compositionDurationInFrames, canvasWidth, canvasHeight, defaultVisual, background }: { item: TimelineMediaItem; asset: TimelineAssetSource; compositionDurationInFrames: number; canvasWidth: number; canvasHeight: number; defaultVisual: ClipVisualSettings; background: BackgroundSettings }) {
  const { fps } = useVideoConfig();
  const src = asset.url;
  const from = Math.round(item.timelineStartMs / 1000 * fps);
  const durationInFrames = Math.max(1, Math.round(getTimelineItemDurationMs(item) / 1000 * fps));
  const playbackRate = item.type === 'video' ? getPlaybackRate(item) : 1;
  const playableDurationMs = Math.max(
    0,
    Math.min(getTimelineItemDurationMs(item), (item.assetDurationMs - item.sourceStartMs) / playbackRate),
  );
  const playableDurationInFrames = Math.max(1, Math.round(playableDurationMs / 1000 * fps));
  const trimBefore = Math.round(item.sourceStartMs / 1000 * fps);
  const baseVolume = item.volume / 100;
  const fadeInFrames = Math.max(0, Math.min(Math.round(item.fadeInMs / 1000 * fps), Math.floor(durationInFrames / 2)));
  const fadeOutFrames = Math.max(0, Math.min(Math.round(item.fadeOutMs / 1000 * fps), Math.floor(durationInFrames / 2)));
  const audioVolume = (frame: number) => {
    const fadeInGain = fadeInFrames > 0 ? Math.min(1, frame / fadeInFrames) : 1;
    const framesUntilEnd = Math.max(0, durationInFrames - 1 - frame);
    const fadeOutGain = fadeOutFrames > 0 ? Math.min(1, framesUntilEnd / fadeOutFrames) : 1;
    return baseVolume * Math.min(fadeInGain, fadeOutGain);
  };
  const surface = (media: ReactNode) => (
    <TimelineMediaSurface item={item} asset={asset} canvasWidth={canvasWidth} canvasHeight={canvasHeight} defaultVisual={defaultVisual} background={background}>
      {media}
    </TimelineMediaSurface>
  );

  const frozenPlacementFrames = item.type === 'video'
    ? Math.max(0, durationInFrames - playableDurationInFrames)
    : 0;
  const placementEnd = from + durationInFrames;
  const trailingHoldDuration = item.holdLastFrame
    ? Math.max(0, compositionDurationInFrames - placementEnd)
    : 0;

  return (
    <>
      {item.type === 'audio' && (
        <Sequence from={from} durationInFrames={durationInFrames} premountFor={fps}>
          <Audio src={src} trimBefore={trimBefore} volume={audioVolume} />
        </Sequence>
      )}
      {item.type === 'image' && (
        <Sequence from={from} durationInFrames={durationInFrames} premountFor={fps}>
          {surface(<img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'fill' }} />)}
        </Sequence>
      )}
      {item.type === 'video' && (
        <Sequence from={from} durationInFrames={playableDurationInFrames} premountFor={fps}>
          {surface(<Video src={src} trimBefore={trimBefore} playbackRate={playbackRate} volume={item.volume / 100} style={{ width: '100%', height: '100%', objectFit: 'fill' }} />)}
        </Sequence>
      )}
      {item.type === 'video' && frozenPlacementFrames > 0 && (
        <Sequence from={from + playableDurationInFrames} durationInFrames={frozenPlacementFrames} premountFor={fps}>
          <Freeze frame={playableDurationInFrames - 1}>
            {surface(<Video src={src} trimBefore={trimBefore} muted style={{ width: '100%', height: '100%', objectFit: 'fill' }} />)}
          </Freeze>
        </Sequence>
      )}
      {item.type === 'video' && trailingHoldDuration > 0 && (
        <Sequence from={placementEnd} durationInFrames={trailingHoldDuration} premountFor={fps}>
          <Freeze frame={playableDurationInFrames - 1}>
            {surface(<Video src={src} trimBefore={trimBefore} muted style={{ width: '100%', height: '100%', objectFit: 'fill' }} />)}
          </Freeze>
        </Sequence>
      )}
    </>
  );
}

function RecordingClipSequence({ clip, src, canvasWidth, canvasHeight, sourceWidth, sourceHeight, sourceDurationMs, defaultVisual, defaultMedia, background }: { clip: EditorClip; src: string; canvasWidth: number; canvasHeight: number; sourceWidth: number; sourceHeight: number; sourceDurationMs: number; defaultVisual: ClipVisualSettings; defaultMedia: MediaTransform; background: BackgroundSettings }) {
  const { fps } = useVideoConfig();
  const visual = getClipVisualSettings(clip, defaultVisual);
  const media = getClipMediaTransform(clip, defaultMedia);
  const fit = Math.min(canvasWidth / sourceWidth, canvasHeight / sourceHeight) * media.scale / 100;
  const contentWidth = Math.max(2, Math.round(sourceWidth * fit));
  const contentHeight = Math.max(2, Math.round(sourceHeight * fit));
  const appearance = getFrameAppearance(visual.frameStyle, visual.borderOpacity, visual.borderWidth, visual.borderColor);
  const padding = typeof appearance.padding === 'number' ? appearance.padding : 0;
  const frameWidth = contentWidth + padding * 2;
  const frameHeight = contentHeight + padding * 2;
  const trimBefore = Math.round(clip.sourceStartMs / 1000 * fps);
  const playbackRate = getPlaybackRate(clip);
  const durationInFrames = Math.max(1, Math.round(getClipDurationMs(clip) / 1000 * fps));
  const playableDurationMs = Math.max(0, Math.min(getClipDurationMs(clip), (sourceDurationMs - clip.sourceStartMs) / playbackRate));
  const playableDurationInFrames = Math.max(1, Math.round(playableDurationMs / 1000 * fps));
  const frozenDurationInFrames = Math.max(0, durationInFrames - playableDurationInFrames);
  const from = Math.round(clip.timelineStartMs / 1000 * fps);
  const surface = (mediaNode: ReactNode) => <div style={{ position: 'absolute', width: frameWidth, height: frameHeight, left: `${media.positionX}%`, top: `${media.positionY}%`, transform: 'translate(-50%, -50%)', boxShadow: getShadow(visual.shadowStyle, visual.shadowOpacity, background, visual.shadowLightX, visual.shadowLightY), borderRadius: visual.borderShape === 'sharp' ? 0 : visual.cornerRadius }}><Shape shape={visual.borderShape} width={frameWidth} height={frameHeight} radius={visual.cornerRadius} smoothing={visual.cornerSmoothing} style={{ ...appearance, boxSizing: 'border-box', position: 'relative', width: frameWidth, height: frameHeight, overflow: 'hidden' }}><div style={{ position: 'relative', width: contentWidth, height: contentHeight, overflow: 'hidden', borderRadius: visual.borderShape === 'rounded' ? Math.max(0, visual.cornerRadius - padding) : 0 }}>{mediaNode}</div></Shape></div>;

  return <>
    <Sequence from={from} durationInFrames={playableDurationInFrames} premountFor={fps}>{surface(<Video src={src} trimBefore={trimBefore} playbackRate={playbackRate} style={{ width: '100%', height: '100%', objectFit: 'fill' }} />)}</Sequence>
    {frozenDurationInFrames > 0 && <Sequence from={from + playableDurationInFrames} durationInFrames={frozenDurationInFrames} premountFor={fps}><Freeze frame={playableDurationInFrames - 1}>{surface(<Video src={src} trimBefore={trimBefore} muted style={{ width: '100%', height: '100%', objectFit: 'fill' }} />)}</Freeze></Sequence>}
  </>;
}

function TextClipSequence({ clip }: { clip: TextClip }) {
  const { fps } = useVideoConfig();
  const fillStyle: CSSProperties = clip.fill.type === 'solid'
    ? { color: clip.fill.color }
    : { color: 'transparent', backgroundImage: `linear-gradient(${clip.fill.angle}deg, ${clip.fill.colorA}, ${clip.fill.colorB})`, backgroundClip: 'text', WebkitBackgroundClip: 'text' };
  return (
    <Sequence from={Math.round(clip.timelineStartMs / 1000 * fps)} durationInFrames={Math.max(1, Math.round(clip.durationMs / 1000 * fps))} premountFor={fps}>
      <div style={{ position: 'absolute', left: `${clip.positionX}%`, top: `${clip.positionY}%`, transform: `translate(-50%, -50%) rotate(${clip.rotation}deg) scale(${clip.scale / 100})`, transformOrigin: 'center', fontFamily: `"${clip.fontFamily}", sans-serif`, fontSize: clip.fontSize, fontWeight: clip.fontWeight, lineHeight: 1.08, whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '90%', overflowWrap: 'anywhere', WebkitTextStroke: clip.strokeWidth > 0 ? `${clip.strokeWidth}px ${clip.strokeColor}` : undefined, paintOrder: 'stroke fill', ...fillStyle }}>{clip.text}</div>
    </Sequence>
  );
}

export function VideoComposition({ src, clips, timelineMedia, gestureClips, textClips, timelineLimitMs, assetSources, interactions, crop, canvas, sourceWidth, sourceHeight, sourceDurationMs, background, media, frameStyle, borderShape, cornerRadius, cornerSmoothing, borderOpacity, borderWidth, borderColor, shadowStyle, shadowOpacity, shadowLightX, shadowLightY, renderScale = 1 }: VideoCompositionProps) {
  const { fps } = useVideoConfig();
  const safeSourceWidth = Math.max(1, sourceWidth);
  const safeSourceHeight = Math.max(1, sourceHeight);
  const defaultVisual: ClipVisualSettings = { frameStyle, borderShape, cornerRadius, cornerSmoothing, borderOpacity, borderWidth, borderColor, shadowStyle, shadowOpacity, shadowLightX, shadowLightY };
  const compositionDurationInFrames = Math.max(
    1,
    Math.ceil(Math.max(getEditedDurationMs(clips, timelineMedia, gestureClips, textClips), timelineLimitMs) / 1000 * fps),
  );

  return (
    <AbsoluteFill style={{ background: 'transparent', overflow: 'hidden' }}>
      <div style={{ position: 'relative', width: canvas.width, height: canvas.height, transform: `scale(${renderScale})`, transformOrigin: 'top left' }}>
        <AbsoluteFill style={{ background: background.type === 'transparent' ? 'transparent' : '#fffaf0', overflow: 'hidden' }}>
          <BackgroundLayer background={background} />
          {clips.map((clip) => <RecordingClipSequence key={clip.id} clip={clip} src={src} canvasWidth={canvas.width} canvasHeight={canvas.height} sourceWidth={safeSourceWidth} sourceHeight={safeSourceHeight} sourceDurationMs={sourceDurationMs} defaultVisual={defaultVisual} defaultMedia={media} background={background} />)}
          {timelineMedia.map((item) => {
            const asset = assetSources.find((source) => source.id === item.assetId);
            return asset ? <TimelineMediaSequence key={item.id} item={item} asset={asset} compositionDurationInFrames={compositionDurationInFrames} canvasWidth={canvas.width} canvasHeight={canvas.height} defaultVisual={defaultVisual} background={background} /> : null;
          })}
          <GestureOverlay gestureClips={gestureClips} interactions={interactions} clips={clips} crop={crop} timelineMedia={timelineMedia} assetSources={assetSources} canvasWidth={canvas.width} canvasHeight={canvas.height} sourceWidth={safeSourceWidth} sourceHeight={safeSourceHeight} media={media} />
          {textClips.map((clip) => <TextClipSequence key={clip.id} clip={clip} />)}
          {background.type === 'image' && background.imageCreditUrl && <a href={background.imageCreditUrl} target="_blank" rel="noreferrer" style={{ position: 'absolute', left: 14, bottom: 10, color: 'rgba(255,255,255,.9)', fontSize: 10, textShadow: '0 1px 4px rgba(0,0,0,.6)' }}>Photo by {background.imageCredit} on Unsplash</a>}
        </AbsoluteFill>
      </div>
    </AbsoluteFill>
  );
}
