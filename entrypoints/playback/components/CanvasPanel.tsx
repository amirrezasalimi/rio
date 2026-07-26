import { Crosshair, Maximize2, RotateCcw, Snowflake } from 'lucide-react';
import { useState } from 'react';
import { useEditorStore } from '../editor/store';
import type { CanvasRatio } from '../editor/types';
import { getClipMediaTransform, getTimelineItemDurationMs } from '../editor/types';
import { EditorRange } from './EditorRange';

const RATIOS: Array<{ value: CanvasRatio; label: string }> = [
  { value: '16:9', label: 'Wide' },
  { value: '4:3', label: 'Classic' },
  { value: '1:1', label: 'Square' },
  { value: '9:16', label: 'Story' },
];

export function CanvasPanel({ mode }: { mode: 'general' | 'selection' }) {
  const canvas = useEditorStore((state) => state.canvas);
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
  const [audioFadeUnit, setAudioFadeUnit] = useState<'time' | 'percent'>('time');

  const applySize = () => {
    const nextWidth = Number(width);
    const nextHeight = Number(height);
    if (Number.isFinite(nextWidth) && Number.isFinite(nextHeight)) {
      setCanvasSize(nextWidth, nextHeight);
    }
  };

  const isUploadedMedia = selection?.kind === 'media' && selectedUpload;
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
      });
    } else if (selectedRecording) {
      updateSelectedClip({ media: { scale: 86, positionX: 50, positionY: 50 } });
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
              setCanvasRatio(ratio.value);
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

      <div className="rounded-xl border border-border bg-cream-50 p-2.5">
        <div className="mb-2 flex items-center justify-between text-[10px]">
          <span className="flex items-center gap-1.5 text-muted">
            <Maximize2 className="size-3" /> Canvas size
          </span>
          <button
            type="button"
            onClick={() => {
              resetCanvas();
              setWidth('1280');
              setHeight('720');
            }}
            className="flex items-center gap-1 font-semibold text-primary-700"
          >
            <RotateCcw className="size-3" /> Reset
          </button>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-1.5">
          <input aria-label="Canvas width" inputMode="numeric" value={width} onChange={(event) => setWidth(event.target.value.replace(/\D/g, ''))} onKeyDown={(event) => { if (event.key === 'Enter') applySize(); }} className="min-w-0 rounded-lg border border-border bg-surface px-2 py-1.5 font-mono text-[10px] outline-none focus:border-primary-300" />
          <span className="text-muted">×</span>
          <input aria-label="Canvas height" inputMode="numeric" value={height} onChange={(event) => setHeight(event.target.value.replace(/\D/g, ''))} onKeyDown={(event) => { if (event.key === 'Enter') applySize(); }} className="min-w-0 rounded-lg border border-border bg-surface px-2 py-1.5 font-mono text-[10px] outline-none focus:border-primary-300" />
          <button type="button" onClick={applySize} className="rounded-lg bg-ink px-2 py-1.5 text-[9px] font-semibold text-white">Set</button>
        </div>
      </div>
      <p className="text-[9px] leading-relaxed text-muted">Canvas size and aspect ratio apply to the complete project.</p>
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
          <EditorRange label="Media size" value={transform.scale} min={10} max={160} suffix="%" onChange={(scale) => updateTransform({ scale })} />
          <div className="grid grid-cols-2 gap-2">
            <EditorRange label="Horizontal" value={transform.positionX} min={0} max={100} suffix="%" onChange={(positionX) => updateTransform({ positionX })} />
            <EditorRange label="Vertical" value={transform.positionY} min={0} max={100} suffix="%" onChange={(positionY) => updateTransform({ positionY })} />
          </div>
        </>
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
          <input type="checkbox" checked={selectedUpload.holdLastFrame} onChange={(event) => updateTimelineMediaItem(selectedUpload.id, { holdLastFrame: event.currentTarget.checked })} className="peer sr-only" />
          <span className="relative h-5 w-9 shrink-0 rounded-full bg-border transition peer-checked:bg-primary-500 after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-4" />
        </label>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" disabled={isUploadedMedia && selectedUpload.type === 'audio'} onClick={() => updateTransform({ positionX: 50, positionY: 50 })} className="flex items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-[10px] font-semibold hover:border-primary-300 hover:bg-primary-50 disabled:opacity-35"><Crosshair className="size-3" /> Center</button>
        <button type="button" onClick={resetTransform} className="flex items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-[10px] font-semibold hover:border-primary-300 hover:bg-primary-50"><RotateCcw className="size-3" /> Reset clip</button>
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
