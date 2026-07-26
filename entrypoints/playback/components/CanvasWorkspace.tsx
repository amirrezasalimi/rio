import { Eye, EyeOff, Maximize, Minus, MousePointer2, Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlayerRef } from '@remotion/player';
import { Player } from '@remotion/player';
import { useEditorStore } from '../editor/store';
import { FPS, getClipMediaTransform, getEditedDurationMs } from '../editor/types';
import { VideoComposition, type VideoCompositionProps } from '../editor/VideoComposition';

interface CanvasWorkspaceProps {
  inputProps: VideoCompositionProps;
  playerRef: React.RefObject<PlayerRef | null>;
  movingMedia: boolean;
  onMovingMediaChange: (moving: boolean) => void;
}

export function CanvasWorkspace({ inputProps, playerRef, movingMedia, onMovingMediaChange }: CanvasWorkspaceProps) {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(50);
  const [showControls, setShowControls] = useState(true);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const selection = useEditorStore((state) => state.selectedTimelineItem);
  const selectedRecording = useEditorStore((state) => selection?.kind === 'recording' ? state.clips.find((clip) => clip.id === selection.id) : undefined);
  const selectedUpload = useEditorStore((state) => selection?.kind === 'media' ? state.timelineMedia.find((item) => item.id === selection.id) : undefined);
  const projectDurationMs = Math.max(
    getEditedDurationMs(inputProps.clips, inputProps.timelineMedia, inputProps.gestureClips),
    inputProps.timelineLimitMs,
  );
  const durationInFrames = Math.max(1, Math.ceil(projectDurationMs / 1000 * FPS));
  const fitCanvas = useCallback(() => {
    const bounds = workspaceRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const nextZoom = Math.min((bounds.width - 96) / inputProps.canvas.width, (bounds.height - 96) / inputProps.canvas.height, 1) * 100;
    setZoom(Math.max(10, Math.min(200, nextZoom)));
    setPan({ x: 0, y: 0 });
  }, [inputProps.canvas.height, inputProps.canvas.width]);

  useEffect(() => {
    fitCanvas();
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const observer = new ResizeObserver(fitCanvas);
    observer.observe(workspace);
    const zoomCanvas = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setZoom((value) => Math.max(10, Math.min(200, value - event.deltaY * .08)));
    };
    workspace.addEventListener('wheel', zoomCanvas, { passive: false });
    return () => { observer.disconnect(); workspace.removeEventListener('wheel', zoomCanvas); };
  }, [fitCanvas]);

  const panWorkspace = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button, input, [role="button"], [data-rp="controls"]')) return;
    if (!movingMedia) {
      useEditorStore.getState().setSelectedTimelineItem(undefined);
      onMovingMediaChange(false);
    }
    const start = { x: event.clientX, y: event.clientY, pan };
    const update = (moveEvent: PointerEvent) => setPan({ x: start.pan.x + moveEvent.clientX - start.x, y: start.pan.y + moveEvent.clientY - start.y });
    const stop = () => {
      window.removeEventListener('pointermove', update);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', update);
    window.addEventListener('pointerup', stop, { once: true });
  };

  const moveMedia = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!movingMedia || !canvasRef.current) return;
    event.stopPropagation();
    const bounds = canvasRef.current.getBoundingClientRect();
    const state = useEditorStore.getState();
    const start = selectedUpload ?? (selectedRecording ? getClipMediaTransform(selectedRecording, state.media) : state.media);
    const startX = event.clientX;
    const startY = event.clientY;
    const update = (moveEvent: PointerEvent) => {
      const patch = {
        positionX: Math.max(0, Math.min(100, start.positionX + (moveEvent.clientX - startX) / bounds.width * 100)),
        positionY: Math.max(0, Math.min(100, start.positionY + (moveEvent.clientY - startY) / bounds.height * 100)),
      };
      if (selectedUpload) state.updateTimelineMediaItem(selectedUpload.id, patch);
      else if (selectedRecording) state.updateSelectedClip({ media: { ...start, ...patch } });
      else state.updateMedia(patch);
    };
    const stop = () => {
      window.removeEventListener('pointermove', update);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', update);
    window.addEventListener('pointerup', stop, { once: true });
  };

  const safeSourceWidth = Math.max(1, inputProps.sourceWidth);
  const safeSourceHeight = Math.max(1, inputProps.sourceHeight);
  const selectedTransform = selectedUpload ?? (selectedRecording ? getClipMediaTransform(selectedRecording, inputProps.media) : inputProps.media);
  const fit = Math.min(inputProps.canvas.width / safeSourceWidth, inputProps.canvas.height / safeSourceHeight) * selectedTransform.scale / 100;
  const overlayWidth = selectedUpload ? inputProps.canvas.width * selectedUpload.scale / 100 : safeSourceWidth * fit;
  const overlayHeight = selectedUpload ? inputProps.canvas.height * selectedUpload.scale / 100 : safeSourceHeight * fit;
  const canMoveSelection = Boolean(selectedRecording || selectedUpload) && (!selectedUpload || selectedUpload.type !== 'audio');

  return (
    <section ref={workspaceRef} onPointerDown={panWorkspace} className="relative min-h-0 flex-1 cursor-grab overflow-hidden bg-cream-100/45 active:cursor-grabbing [background-image:radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:18px_18px]">
      <div className="pointer-events-none absolute left-3 top-3 z-30 flex items-center gap-1 rounded-xl border border-border bg-surface/92 p-1 shadow-sm backdrop-blur">
        <button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(10, value - 10))} className="pointer-events-auto rounded-lg p-1.5 hover:bg-primary-50"><Minus className="size-3.5" /></button>
        <span className="w-12 text-center font-mono text-[9px] text-muted">{Math.round(zoom)}%</span>
        <button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(200, value + 10))} className="pointer-events-auto rounded-lg p-1.5 hover:bg-primary-50"><Plus className="size-3.5" /></button>
        <button type="button" aria-label="Fit canvas" onClick={fitCanvas} className="pointer-events-auto rounded-lg p-1.5 hover:bg-primary-50"><Maximize className="size-3.5" /></button>
        <span className="mx-0.5 h-4 w-px bg-border" />
        <button type="button" aria-label={showControls ? 'Hide video controls' : 'Show video controls'} onClick={() => setShowControls((value) => !value)} className="pointer-events-auto rounded-lg p-1.5 hover:bg-primary-50">{showControls ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}</button>
      </div>
      <button type="button" disabled={!canMoveSelection} onClick={() => onMovingMediaChange(!movingMedia)} className={`absolute right-3 top-3 z-30 flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[10px] font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-40 ${movingMedia ? 'border-primary-400 bg-primary-500 text-white' : 'border-border bg-surface text-ink hover:border-primary-300'}`}><MousePointer2 className="size-3.5" />{movingMedia ? 'Done moving' : 'Move selected'}</button>

      <div className="absolute left-1/2 top-1/2" style={{ transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom / 100})` }}>
        <div data-canvas ref={canvasRef} className="relative overflow-hidden bg-surface shadow-2xl shadow-ink/15 ring-1 ring-ink/10" style={{ width: inputProps.canvas.width, height: inputProps.canvas.height }}>
          <Player ref={playerRef} component={VideoComposition} inputProps={inputProps} durationInFrames={durationInFrames} fps={FPS} compositionWidth={inputProps.canvas.width} compositionHeight={inputProps.canvas.height} controls={showControls && !movingMedia} className="size-full" />
          {movingMedia && <div role="application" aria-label="Drag media from its center" onPointerDown={moveMedia} className="absolute z-20 cursor-grab touch-none border-2 border-dashed border-primary-300 bg-primary-500/8 active:cursor-grabbing" style={{ width: overlayWidth, height: overlayHeight, left: `${selectedTransform.positionX}%`, top: `${selectedTransform.positionY}%`, transform: 'translate(-50%, -50%)' }}><span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-ink/82 px-2 py-1 text-[9px] font-semibold text-white">Drag media · Enter done</span></div>}
        </div>
      </div>
    </section>
  );
}
