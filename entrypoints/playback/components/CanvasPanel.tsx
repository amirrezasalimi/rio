import { Crosshair, FlipHorizontal2, FlipVertical2, Gauge, Maximize2, RotateCcw, Share2, Snowflake } from 'lucide-react';
import { useState } from 'react';
import { useEditorStore } from '../editor/store';
import type { CanvasRatio, MediaAspectRatio, MediaContentFit, MediaCropShape } from '../editor/types';
import { getClipMediaTransform, getTimelineItemDurationMs } from '../editor/types';
import { EditorRange } from './EditorRange';

const RATIOS: Array<{ value: CanvasRatio; label: string }> = [
  { value: '16:9', label: 'Wide' },
  { value: '4:3', label: 'Classic' },
  { value: '1:1', label: 'Square' },
  { value: '9:16', label: 'Story' },
];

const MEDIA_RATIOS: Array<{ value: MediaAspectRatio; label: string }> = [
  { value: 'source', label: 'Original' },
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '4:3', label: '4:3' },
  { value: '9:16', label: '9:16' },
];

const SOCIAL_PRESETS = [
  { id: 'instagram-square', platform: 'Instagram', label: 'Square post', width: 1080, height: 1080 },
  { id: 'instagram-portrait', platform: 'Instagram', label: 'Portrait post', width: 1080, height: 1350 },
  { id: 'instagram-story', platform: 'Instagram', label: 'Story / Reel', width: 1080, height: 1920 },
  { id: 'youtube-video', platform: 'YouTube', label: 'Video', width: 1920, height: 1080 },
  { id: 'youtube-shorts', platform: 'YouTube', label: 'Shorts', width: 1080, height: 1920 },
  { id: 'tiktok-video', platform: 'TikTok', label: 'Vertical video', width: 1080, height: 1920 },
  { id: 'facebook-feed', platform: 'Facebook', label: 'Feed landscape', width: 1200, height: 630 },
  { id: 'facebook-story', platform: 'Facebook', label: 'Story / Reel', width: 1080, height: 1920 },
  { id: 'x-landscape', platform: 'X', label: 'Landscape post', width: 1600, height: 900 },
  { id: 'linkedin-landscape', platform: 'LinkedIn', label: 'Landscape post', width: 1200, height: 627 },
  { id: 'pinterest-pin', platform: 'Pinterest', label: 'Standard pin', width: 1000, height: 1500 },
] as const;

const SOCIAL_PLATFORMS = [...new Set(SOCIAL_PRESETS.map((preset) => preset.platform))];

import { useHistoryStore } from '../editor/history';

export function CanvasPanel({ mode, hasRecordingAudio }: { mode: 'general' | 'selection'; hasRecordingAudio: boolean }) {
  const canvas = useEditorStore((state) => state.canvas);
  const sceneSpeed = useEditorStore((state) => state.sceneSpeed ?? 1);
  const setSceneSpeed = useEditorStore((state) => state.setSceneSpeed);
  const recordedMedia = useEditorStore((state) => state.media);
  const selection = useEditorStore((state) => state.selectedTimelineItem);
  const selectedUpload = useEditorStore((state) =>
    state.selectedTimelineItem?.kind === 'media'
      ? state.timelineMedia.find((item) => item.id === state.selectedTimelineItem?.id)
      : undefined,
  );
  const selectedRecording = useEditorStore((state) =>
    state.selectedTimelineItem?.kind === 'recording'
      ? state.clips.find((clip) => clip.id === state.selectedTimelineItem?.id)
      : undefined,
  );
  const timelineMedia = useEditorStore((state) => state.timelineMedia);
  const {
    setCanvasRatio,
    setCanvasSize,
    resetCanvas,
    updateMedia,
    resetMedia,
    updateTimelineMediaItem,
    updateSelectedClip,
  } = useEditorStore.getState();
  const [width, setWidth] = useState(String(canvas.width));
  const [height, setHeight] = useState(String(canvas.height));
  const [socialPresetId, setSocialPresetId] = useState(() => SOCIAL_PRESETS.find((preset) => preset.width === canvas.width && preset.height === canvas.height)?.id ?? '');
  const [audioFadeUnit, setAudioFadeUnit] = useState<'time' | 'percent'>('time');

  const applySize = () => {
    const nextWidth = Number(width);
    const nextHeight = Number(height);
    if (Number.isFinite(nextWidth) && Number.isFinite(nextHeight)) {
      setCanvasSize(nextWidth, nextHeight);
      setSocialPresetId('');
    }
  };
  const applySocialPreset = (presetId: string) => {
    const preset = SOCIAL_PRESETS.find((item) => item.id === presetId);
    if (!preset) {
      setSocialPresetId('');
      return;
    }
    setCanvasSize(preset.width, preset.height);
    setWidth(String(preset.width));
    setHeight(String(preset.height));
    setSocialPresetId(preset.id);
  };

  const isUploadedMedia = selection?.kind === 'media' && selectedUpload;
  const selectedRecordingHasAudio = Boolean(selectedRecording && hasRecordingAudio && !selectedRecording.audioDetached && !timelineMedia.some((item) =>
    item.assetId === 'original-recording-audio'
    && item.sourceStartMs === selectedRecording.sourceStartMs
    && item.sourceEndMs === selectedRecording.sourceEndMs
    && item.timelineStartMs === selectedRecording.timelineStartMs
  ));
  const transform = isUploadedMedia
    ? selectedUpload
    : selectedRecording
      ? getClipMediaTransform(selectedRecording, recordedMedia)
      : recordedMedia;
  const updateTransform = (patch: Partial<typeof recordedMedia>) => {
    if (isUploadedMedia) updateTimelineMediaItem(selectedUpload.id, patch);
    else if (selectedRecording) updateSelectedClip({ media: { ...transform, ...patch } });
    else updateMedia(patch);
  };
  const resetTransform = () => {
    if (isUploadedMedia) {
      updateTimelineMediaItem(selectedUpload.id, {
        scale: selectedUpload.type === 'audio' ? 0 : 42,
        positionX: 50,
        positionY: 50,
        opacity: 100,
        volume: 100,
        fadeInMs: 0,
        fadeOutMs: 0,
        holdLastFrame: false,
        flipHorizontal: false,
        flipVertical: false,
      });
    } else if (selectedRecording) {
      updateSelectedClip({ media: { scale: 86, positionX: 50, positionY: 50, flipHorizontal: false, flipVertical: false } });
    } else resetMedia();
  };

  return (
    <div className="space-y-3">
      {mode === 'general' && <>
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-cream-100 p-1">
        {RATIOS.map((ratio) => (
          <button
            type="button"
            key={ratio.value}
            title={ratio.label}
            onClick={() => {
              useHistoryStore.getState().record('Change canvas ratio');
              setCanvasRatio(ratio.value);
              setSocialPresetId('');
              const preset = useEditorStore.getState().canvas;
              setWidth(String(preset.width));
              setHeight(String(preset.height));
            }}
            className={`rounded-lg py-2 text-[9px] font-semibold ${
              canvas.ratio === ratio.value
                ? 'bg-surface text-ink shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            {ratio.value}
          </button>
        ))}
      </div>

      <label className="block rounded-xl border border-border bg-cream-50 p-2.5">
        <span className="mb-2 flex items-center gap-1.5 text-[10px] text-muted"><Share2 className="size-3" /> Social media preset</span>
        <select aria-label="Social media canvas preset" value={socialPresetId} onChange={(event) => { useHistoryStore.getState().record('Apply canvas preset'); applySocialPreset(event.currentTarget.value); }} className="w-full cursor-pointer rounded-lg border border-border bg-surface px-2.5 py-2 text-[10px] font-semibold text-ink outline-none transition focus:border-primary-300">
          <option value="">Custom size</option>
          {SOCIAL_PLATFORMS.map((platform) => <optgroup key={platform} label={platform}>{SOCIAL_PRESETS.filter((preset) => preset.platform === platform).map((preset) => <option key={preset.id} value={preset.id}>{preset.label} — {preset.width} × {preset.height}</option>)}</optgroup>)}
        </select>
        <span className="mt-1.5 block text-[8px] leading-relaxed text-muted">Choose a ready-to-publish canvas, then fine-tune it below if needed.</span>
      </label>

      <div className="rounded-xl border border-border bg-cream-50 p-2.5">
        <div className="mb-2 flex items-center justify-between text-[10px]">
          <span className="flex items-center gap-1.5 text-muted">
            <Maximize2 className="size-3" /> Canvas size
          </span>
          <button
            type="button"
            onClick={() => {
              useHistoryStore.getState().record('Reset canvas size');
              resetCanvas();
              setSocialPresetId('');
              setWidth('1280');
              setHeight('720');
            }}
            className="flex items-center gap-1 font-semibold text-primary-700"
          >
            <RotateCcw className="size-3" /> Reset
          </button>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-1.5">
          <input aria-label="Canvas width" inputMode="numeric" value={width} onChange={(event) => setWidth(event.target.value.replace(/\D/g, ''))} onBlur={() => applySize()} onKeyDown={(event) => { if (event.key === 'Enter') applySize(); }} className="min-w-0 rounded-lg border border-border bg-surface px-2 py-1.5 font-mono text-[10px] outline-none focus:border-primary-300" />
          <span className="text-muted">×</span>
          <input aria-label="Canvas height" inputMode="numeric" value={height} onChange={(event) => setHeight(event.target.value.replace(/\D/g, ''))} onBlur={() => applySize()} onKeyDown={(event) => { if (event.key === 'Enter') applySize(); }} className="min-w-0 rounded-lg border border-border bg-surface px-2 py-1.5 font-mono text-[10px] outline-none focus:border-primary-300" />
          <button type="button" onClick={() => { useHistoryStore.getState().record('Set canvas size'); applySize(); }} className="rounded-lg bg-ink px-2 py-1.5 text-[9px] font-semibold text-white">Set</button>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-cream-50 p-2.5">
        <div className="mb-2 flex items-center justify-between text-[10px]">
          <span className="flex items-center gap-1.5 text-muted">
            <Gauge className="size-3" /> Scene speed
          </span>
          <button
            type="button"
            onClick={() => { useHistoryStore.getState().record('Reset playback speed'); setSceneSpeed(1); }}
            className="flex items-center gap-1 font-semibold text-primary-700"
          >
            <RotateCcw className="size-3" /> Reset
          </button>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {[0.5, 0.75, 1, 1.5, 2].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => { useHistoryStore.getState().record('Change playback speed'); setSceneSpeed(rate); }}
              className={`rounded-lg border py-1.5 font-mono text-[9px] font-semibold transition ${
                sceneSpeed === rate
                  ? 'border-primary-400 bg-primary-50 text-primary-700'
                  : 'border-border bg-surface text-muted hover:border-primary-200'
              }`}
            >
              {rate}×
            </button>
          ))}
        </div>
        <EditorRange
          className="mt-3"
          label="Custom speed"
          value={sceneSpeed}
          min={0.25}
          max={4}
          step={0.05}
          suffix="×"
          onChange={setSceneSpeed}
        />
        <p className="mt-2 text-[8px] leading-relaxed text-muted">
          Speed up or slow down the entire video. Changes preview playback rate and exported video speed.
        </p>
      </div>

      <p className="text-[9px] leading-relaxed text-muted">Canvas size, aspect ratio, and speed apply to the complete project.</p>
      </>}

      {mode === 'selection' && <>
      <div className="rounded-xl border border-primary-100 bg-primary-50/60 px-2.5 py-2">
        <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-primary-700">Selected clip</p>
        <p className="mt-0.5 truncate text-[10px] font-semibold text-ink">
          {isUploadedMedia ? selectedUpload.name : 'Screen recording'}
        </p>
      </div>

      {(!isUploadedMedia || selectedUpload.type !== 'audio') && (
        <>
          {isUploadedMedia && selectedUpload.type !== 'audio' && (
            <div className="space-y-2 rounded-xl border border-border bg-cream-50 p-2.5">
              <div>
                <p className="mb-1.5 text-[9px] font-semibold text-muted">Clip ratio</p>
                <div className="grid grid-cols-5 gap-1">
                  {MEDIA_RATIOS.map((ratio) => (
                    <button
                      key={ratio.value}
                      type="button"
                      onClick={() => {
                        useHistoryStore.getState().record('Change media ratio');
                        updateTimelineMediaItem(selectedUpload.id, { aspectRatio: ratio.value });
                      }}
                      className={`rounded-lg border px-1 py-1.5 text-[8px] font-semibold transition ${
                        (selectedUpload.aspectRatio ?? 'source') === ratio.value
                          ? 'border-primary-400 bg-primary-50 text-primary-700'
                          : 'border-border bg-surface text-muted hover:border-primary-200'
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[9px] font-semibold text-muted">Crop shape</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['rectangle', 'circle'] as MediaCropShape[]).map((shape) => (
                    <button
                      key={shape}
                      type="button"
                      onClick={() => {
                        useHistoryStore.getState().record('Change media crop shape');
                        updateTimelineMediaItem(selectedUpload.id, {
                          cropShape: shape,
                          aspectRatio: shape === 'circle' ? '1:1' : selectedUpload.aspectRatio,
                        });
                      }}
                      className={`rounded-lg border py-2 text-[9px] font-semibold capitalize transition ${
                        (selectedUpload.cropShape ?? 'rectangle') === shape
                          ? 'border-primary-400 bg-primary-50 text-primary-700'
                          : 'border-border bg-surface text-muted hover:border-primary-200'
                      }`}
                    >
                      {shape}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {isUploadedMedia && selectedUpload.type !== 'audio' && (
            <div className="grid grid-cols-3 gap-1.5">
              {(['cover', 'contain', 'fill'] as MediaContentFit[]).map((fit) => (
                <button
                  key={fit}
                  type="button"
                  onClick={() => {
                    useHistoryStore.getState().record('Change media fit');
                    updateTimelineMediaItem(selectedUpload.id, { contentFit: fit });
                  }}
                  className={`rounded-lg border py-2 text-[9px] font-semibold capitalize transition ${
                    (selectedUpload.contentFit ?? 'cover') === fit
                      ? 'border-primary-400 bg-primary-50 text-primary-700'
                      : 'border-border bg-surface text-muted hover:border-primary-200'
                  }`}
                >
                  {fit}
                </button>
              ))}
            </div>
          )}
          <EditorRange label="Clip size" value={transform.scale} min={5} max={160} suffix="%" onChange={(scale) => updateTransform({ scale })} />
          {isUploadedMedia && selectedUpload.type !== 'audio' && (
            <EditorRange label="Content zoom" value={selectedUpload.contentScale ?? 100} min={50} max={300} suffix="%" onChange={(contentScale) => updateTimelineMediaItem(selectedUpload.id, { contentScale })} />
          )}
          <div className="grid grid-cols-2 gap-2">
            <EditorRange label="Horizontal" value={transform.positionX} min={0} max={100} suffix="%" onChange={(positionX) => updateTransform({ positionX })} />
            <EditorRange label="Vertical" value={transform.positionY} min={0} max={100} suffix="%" onChange={(positionY) => updateTransform({ positionY })} />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              aria-pressed={transform.flipHorizontal ?? false}
              onClick={() => {
                useHistoryStore.getState().record('Flip clip horizontally');
                updateTransform({ flipHorizontal: !(transform.flipHorizontal ?? false) });
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[9px] font-semibold transition ${
                transform.flipHorizontal
                  ? 'border-primary-400 bg-primary-50 text-primary-700'
                  : 'border-border bg-surface text-muted hover:border-primary-200'
              }`}
            >
              <FlipHorizontal2 className="size-3.5" /> Flip horizontal
            </button>
            <button
              type="button"
              aria-pressed={transform.flipVertical ?? false}
              onClick={() => {
                useHistoryStore.getState().record('Flip clip vertically');
                updateTransform({ flipVertical: !(transform.flipVertical ?? false) });
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[9px] font-semibold transition ${
                transform.flipVertical
                  ? 'border-primary-400 bg-primary-50 text-primary-700'
                  : 'border-border bg-surface text-muted hover:border-primary-200'
              }`}
            >
              <FlipVertical2 className="size-3.5" /> Flip vertical
            </button>
          </div>
        </>
      )}

      {selectedRecordingHasAudio && selectedRecording && (
        <EditorRange label="Volume" value={selectedRecording.volume ?? 100} min={0} max={100} suffix="%" onChange={(volume) => updateSelectedClip({ volume })} />
      )}

      {isUploadedMedia && selectedUpload.type !== 'audio' && (
        <EditorRange label="Opacity" value={selectedUpload.opacity} min={0} max={100} suffix="%" onChange={(opacity) => updateTimelineMediaItem(selectedUpload.id, { opacity })} />
      )}
      {isUploadedMedia && selectedUpload.type !== 'image' && (
        <EditorRange label="Volume" value={selectedUpload.volume} min={0} max={100} suffix="%" onChange={(volume) => updateTimelineMediaItem(selectedUpload.id, { volume })} />
      )}
      {isUploadedMedia && selectedUpload.type === 'audio' && (() => {
        const durationMs = getTimelineItemDurationMs(selectedUpload);
        const maxFadeMs = Math.max(0, Math.floor(durationMs / 2));
        return (
          <div className="space-y-3 rounded-xl border border-border bg-cream-50 p-2.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold text-ink">Audio fades</p>
                <p className="mt-0.5 text-[8px] leading-relaxed text-muted">Set either fade to 0 to disable it.</p>
              </div>
              <div className="flex shrink-0 rounded-lg border border-border bg-surface p-0.5" aria-label="Audio fade slider unit">
                <button type="button" aria-pressed={audioFadeUnit === 'time'} onClick={() => setAudioFadeUnit('time')} className={`rounded-md px-2 py-1 text-[8px] font-semibold transition ${audioFadeUnit === 'time' ? 'bg-primary-100 text-primary-800' : 'text-muted hover:text-ink'}`}>Time</button>
                <button type="button" aria-pressed={audioFadeUnit === 'percent'} onClick={() => setAudioFadeUnit('percent')} className={`rounded-md px-2 py-1 text-[8px] font-semibold transition ${audioFadeUnit === 'percent' ? 'bg-primary-100 text-primary-800' : 'text-muted hover:text-ink'}`}>%</button>
              </div>
            </div>
            {audioFadeUnit === 'time' ? <>
              <EditorRange label="Fade in" value={Math.min(selectedUpload.fadeInMs, maxFadeMs)} min={0} max={maxFadeMs} step={50} suffix="ms" onChange={(fadeInMs) => updateTimelineMediaItem(selectedUpload.id, { fadeInMs })} />
              <EditorRange label="Fade out" value={Math.min(selectedUpload.fadeOutMs, maxFadeMs)} min={0} max={maxFadeMs} step={50} suffix="ms" onChange={(fadeOutMs) => updateTimelineMediaItem(selectedUpload.id, { fadeOutMs })} />
            </> : <>
              <EditorRange label="Fade in" value={durationMs > 0 ? Math.min(50, selectedUpload.fadeInMs / durationMs * 100) : 0} min={0} max={50} step={1} suffix="%" onChange={(percent) => updateTimelineMediaItem(selectedUpload.id, { fadeInMs: Math.round(durationMs * percent / 100) })} />
              <EditorRange label="Fade out" value={durationMs > 0 ? Math.min(50, selectedUpload.fadeOutMs / durationMs * 100) : 0} min={0} max={50} step={1} suffix="%" onChange={(percent) => updateTimelineMediaItem(selectedUpload.id, { fadeOutMs: Math.round(durationMs * percent / 100) })} />
            </>}
          </div>
        );
      })()}
      {isUploadedMedia && selectedUpload.type === 'video' && (
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-cream-50 p-2.5 transition hover:border-primary-200">
          <span className="flex min-w-0 items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-100 text-primary-700"><Snowflake className="size-3.5" /></span>
            <span><span className="block text-[10px] font-semibold text-ink">Hold last frame</span><span className="block text-[8px] leading-relaxed text-muted">Keep the final frame visible after this clip ends.</span></span>
          </span>
          <input type="checkbox" checked={selectedUpload.holdLastFrame} onChange={(event) => { useHistoryStore.getState().record('Toggle hold last frame'); updateTimelineMediaItem(selectedUpload.id, { holdLastFrame: event.currentTarget.checked }); }} className="peer sr-only" />
          <span className="relative h-5 w-9 shrink-0 rounded-full bg-border transition peer-checked:bg-primary-500 after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-4" />
        </label>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" disabled={isUploadedMedia && selectedUpload.type === 'audio'} onClick={() => { useHistoryStore.getState().record('Center media'); updateTransform({ positionX: 50, positionY: 50 }); }} className="flex items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-[10px] font-semibold hover:border-primary-300 hover:bg-primary-50 disabled:opacity-35"><Crosshair className="size-3" /> Center</button>
        <button type="button" onClick={() => { useHistoryStore.getState().record('Reset clip transform'); resetTransform(); }} className="flex items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-[10px] font-semibold hover:border-primary-300 hover:bg-primary-50"><RotateCcw className="size-3" /> Reset clip</button>
      </div>
      <p className="text-[9px] leading-relaxed text-muted">
        {isUploadedMedia
          ? `${selectedUpload.type === 'audio' ? 'Audio controls' : 'Transform and appearance'} apply only to this ${selectedUpload.type} item.`
          : 'Frame, transform, and shadow controls apply only to this recording clip.'}
      </p>
      </>}
    </div>
  );
}
