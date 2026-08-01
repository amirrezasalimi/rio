import { Player, type PlayerRef } from '@remotion/player';
import { AlertCircle, CheckCircle2, LoaderCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LogoMark } from '../shared/components/LogoMark';
import { formatDuration } from '../shared/recording/media'; import { deleteEditorAsset, deleteRecordingProject, getEditorAssets, getEditorProject, getRecording, getRecordings, saveEditorAsset, saveEditorProject, type StoredEditorAsset, type StoredRecording } from '../shared/recording/storage';
import { EditorSidebar } from './components/EditorSidebar'; import { ExportMenu } from './components/ExportMenu'; import { ExportSettingsMenu } from './components/ExportSettingsMenu';
import { FileMenu } from './components/FileMenu';
import { HistoryMenu } from './components/HistoryMenu';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { Timeline } from './components/Timeline';
import { copySelectedTimelineItem, deleteSelectedTimelineItem, deleteSelectedZoomPoint, duplicateSelectedTimelineItem, pasteTimelineItem } from './editor/clipActions';
import { downloadRecordingClip } from './editor/clipDownload'; import { exportRecording } from './editor/export'; import { readGestureMetadata } from './editor/gestureMetadata';
import { useHistoryStore } from './editor/history';
import { createTimelineMediaPlacement } from './editor/mediaPlacement';
import { exportProjectArchive, importProjectArchive } from './editor/projectArchive';
import { useEditorStore } from './editor/store'; import { createDefaultGestureSettings, createDefaultMeshPoints, DEFAULT_EXPORT_SETTINGS, EXPORT_FPS_OPTIONS, EXPORT_QUALITY_OPTIONS, getEditedDurationMs, FPS, type EditorClip, type EditorSettings, type ExportFormat, type ExportSettings, type TimelineAssetSource, type TimelineMediaType } from './editor/types';
import { VideoComposition } from './editor/VideoComposition';
function getAssetType(mimeType: string): TimelineMediaType | undefined {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return undefined;
}

async function getAssetMetadata(blob: Blob, type: TimelineMediaType): Promise<{ durationMs: number; width: number; height: number }> {
  const url = URL.createObjectURL(blob);
  try {
    if (type === 'image') {
      return await new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve({ durationMs: 5_000, width: image.naturalWidth || 1, height: image.naturalHeight || 1 });
        image.onerror = () => resolve({ durationMs: 5_000, width: 1, height: 1 });
        image.src = url;
      });
    }
    return await new Promise((resolve) => {
      const media = document.createElement(type);
      media.preload = 'metadata';
      media.onloadedmetadata = () => {
        const video = type === 'video' ? media as HTMLVideoElement : undefined;
        resolve({
          durationMs: Number.isFinite(media.duration) ? Math.max(150, media.duration * 1_000) : 5_000,
          width: video?.videoWidth || 1,
          height: video?.videoHeight || 1,
        });
      };
      media.onerror = () => resolve({ durationMs: 5_000, width: 1, height: 1 });
      media.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function resolveAsset(asset: StoredEditorAsset): Promise<TimelineAssetSource | undefined> {
  const type = getAssetType(asset.mimeType);
  if (!type) return undefined;
  const metadata = await getAssetMetadata(asset.blob, type);
  return {
    id: asset.id,
    url: URL.createObjectURL(asset.blob),
    name: asset.name,
    type,
    mimeType: asset.mimeType,
    gestureDurationMs: asset.gestureDurationMs,
    interactions: asset.interactions,
    crop: asset.crop,
    ...metadata,
    durationMs: asset.durationMs ?? metadata.durationMs,
  };
}

function getSerializableProject(): EditorSettings {
  const state = useEditorStore.getState();
  return {
    clips: state.clips,
    timelineMedia: state.timelineMedia,
    gestureClips: state.gestureClips,
    textClips: state.textClips,
    zoomClips: state.zoomClips,
    timelineLimitMs: state.timelineLimitMs,
    frameStyle: state.frameStyle,
    borderShape: state.borderShape,
    cornerRadius: state.cornerRadius,
    cornerSmoothing: state.cornerSmoothing,
    borderOpacity: state.borderOpacity,
    borderWidth: state.borderWidth,
    borderColor: state.borderColor,
    shadowStyle: state.shadowStyle,
    shadowOpacity: state.shadowOpacity,
    shadowLightX: state.shadowLightX,
    shadowLightY: state.shadowLightY,
    background: state.background,
    media: state.media,
    canvas: state.canvas,
    sceneSpeed: state.sceneSpeed ?? 1,
  };
}

const EXPORT_SETTINGS_KEY = 'rio-export-settings';

function getSavedExportSettings(): ExportSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(EXPORT_SETTINGS_KEY) ?? '') as Partial<ExportSettings>;
    const quality = EXPORT_QUALITY_OPTIONS.some((option) => option.value === saved.quality) ? saved.quality : DEFAULT_EXPORT_SETTINGS.quality;
    const fps = EXPORT_FPS_OPTIONS.includes(saved.fps as ExportSettings['fps']) ? saved.fps as ExportSettings['fps'] : DEFAULT_EXPORT_SETTINGS.fps;
    return { quality, fps } as ExportSettings;
  } catch {
    return DEFAULT_EXPORT_SETTINGS;
  }
}

function downloadBlob(blob: Blob, recording: StoredRecording, extension: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `rio-recording-${new Date(recording.createdAt).toISOString().slice(0, 19).replaceAll(':', '-')}.${extension}`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function App() {
  const [recording, setRecording] = useState<StoredRecording>();
  const [videoUrl, setVideoUrl] = useState<string>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [format, setFormat] = useState<ExportFormat>('webm');
  const [exportSettings, setExportSettings] = useState<ExportSettings>(getSavedExportSettings);
  const [exporting, setExporting] = useState(false);
  const [projectFileBusy, setProjectFileBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [movingMedia, setMovingMedia] = useState(false);
  const [sourceSize, setSourceSize] = useState({ width: 16, height: 9 });
  const [projectReady, setProjectReady] = useState(false);
  const [assetSources, setAssetSources] = useState<TimelineAssetSource[]>([]);
  const playerRef = useRef<PlayerRef>(null);
  const initializedId = useRef<string | undefined>(undefined);
  const assetSourcesRef = useRef<TimelineAssetSource[]>([]);
  const settings = useEditorStore();
  const sceneSpeed = settings.sceneSpeed ?? 1;
  const editedDurationMs = getEditedDurationMs(settings.clips, settings.timelineMedia, settings.gestureClips, settings.textClips, settings.zoomClips);
  const projectDurationMs = Math.max(editedDurationMs, settings.timelineLimitMs);
  const durationInFrames = Math.max(1, Math.ceil((projectDurationMs / 1000 * FPS) / sceneSpeed));

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
      setError('This recording link is missing its recording ID.');
      return;
    }

    getRecording(id)
      .then(async (stored) => {
        if (!stored) throw new Error('This recording could not be found.');
        const url = URL.createObjectURL(stored.blob);
        const metadata = await new Promise<{ width: number; height: number }>((resolve) => {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => resolve({ width: video.videoWidth || 16, height: video.videoHeight || 9 });
          video.onerror = () => resolve({ width: 16, height: 9 });
          video.src = url;
        });
        setRecording(stored);
        setVideoUrl(url);
        setSourceSize(metadata);
        if (initializedId.current !== stored.id) {
          initializedId.current = stored.id;
          const [saved, storedAssets] = await Promise.all([
            getEditorProject<EditorSettings>(stored.id),
            getEditorAssets(stored.id),
          ]);
          const resolvedAssets = (await Promise.all(storedAssets.map(resolveAsset))).filter((asset): asset is TimelineAssetSource => Boolean(asset));
          setAssetSources(resolvedAssets);
          const migrated = saved ? {
            ...saved,
            timelineMedia: (saved.timelineMedia ?? []).map((item) => {
              const asset = resolvedAssets.find((source) => source.id === item.assetId);
              const hasStaleWebcamFallback = asset?.name === 'Webcam recording'
                && item.holdLastFrame === true
                && item.sourceStartMs === 0
                && Math.abs(item.assetDurationMs - 5_000) < 1
                && Math.abs(item.sourceEndMs - item.assetDurationMs) < 1;
              return {
                ...item,
                assetDurationMs: hasStaleWebcamFallback ? asset.durationMs : item.assetDurationMs,
                sourceEndMs: hasStaleWebcamFallback ? Math.min(asset.durationMs, stored.durationMs) : item.sourceEndMs,
                fadeInMs: item.fadeInMs ?? 0,
                fadeOutMs: item.fadeOutMs ?? 0,
                holdLastFrame: hasStaleWebcamFallback ? asset.durationMs < stored.durationMs : item.holdLastFrame ?? false,
                playbackRate: item.playbackRate ?? 1,
              };
            }),
            zoomClips: (saved.zoomClips ?? []).map((clip) => ({
              ...clip,
              animation: clip.animation ?? 'smooth',
              transitionDurationMs: clip.transitionDurationMs ?? 400,
              target: clip.target ?? { kind: 'canvas' },
              points: (clip.points ?? []).map((point) => ({ ...point, zoom: Math.max(1, Math.min(5, point.zoom ?? 1)), positionX: point.positionX ?? 50, positionY: point.positionY ?? 50 })),
            })),
            textClips: (saved.textClips ?? []).map((clip) => ({
              ...clip,
              durationMs: clip.durationMs ?? 5_000,
              scale: clip.scale ?? 100,
              rotation: clip.rotation ?? 0,
              fontWeight: clip.fontWeight ?? 700,
              fill: clip.fill ?? { type: 'solid', color: '#fffdf8' },
              strokeColor: clip.strokeColor ?? '#18324a',
              strokeWidth: clip.strokeWidth ?? 0,
            })),
            gestureClips: (saved.gestureClips ?? []).map((clip) => ({
              ...clip,
              sourceStartMs: clip.sourceStartMs ?? 0,
              sourceEndMs: clip.sourceEndMs ?? stored.durationMs,
              settings: { ...createDefaultGestureSettings(), ...clip.settings, enabled: { ...createDefaultGestureSettings().enabled, ...clip.settings?.enabled } },
            })),
            timelineLimitMs: saved.timelineLimitMs ?? Math.max(stored.durationMs, 1_000),
            borderOpacity: saved.borderOpacity ?? 100,
            borderWidth: saved.borderWidth ?? 2,
            borderColor: saved.borderColor ?? '#ffffff',
            shadowLightX: saved.shadowLightX ?? 24,
            shadowLightY: saved.shadowLightY ?? 18,
            background: {
              ...saved.background,
              noiseType: saved.background.noiseType ?? 'grain',
              meshMode: saved.background.meshMode ?? 'preset',
              meshPoints: saved.background.meshPoints?.length ? saved.background.meshPoints : createDefaultMeshPoints(),
            },
            clips: (saved.clips ?? []).map((clip, index, clips) => ({ ...clip, playbackRate: clip.playbackRate ?? 1, timelineStartMs: clip.timelineStartMs ?? clips.slice(0, index).reduce((total, item) => total + item.sourceEndMs - item.sourceStartMs, 0) })),
            sceneSpeed: saved.sceneSpeed ?? 1,
          } : undefined;
          useEditorStore.getState().initialize(stored.durationMs, migrated);
          if (!saved) {
            const webcam = resolvedAssets.find((asset) => asset.name === 'Webcam recording' && asset.type === 'video');
            if (webcam) {
              useEditorStore.getState().setTimelineMedia([{
                id: crypto.randomUUID(),
                assetId: webcam.id,
                type: 'video',
                name: webcam.name,
                assetDurationMs: webcam.durationMs,
                sourceStartMs: 0,
                sourceEndMs: Math.min(webcam.durationMs, stored.durationMs),
                timelineStartMs: 0,
                playbackRate: 1,
                scale: 24,
                positionX: 87,
                positionY: 81,
                opacity: 100,
                volume: 0,
                fadeInMs: 0,
                fadeOutMs: 0,
                holdLastFrame: webcam.durationMs < stored.durationMs,
                aspectRatio: '1:1',
                cropShape: 'circle',
                contentFit: 'cover',
                contentScale: 100,
                visual: {
                  frameStyle: 'outline',
                  borderShape: 'rounded',
                  cornerRadius: 72,
                  borderWidth: 4,
                  borderColor: '#ffffff',
                  borderOpacity: 100,
                  shadowStyle: 'spread',
                },
              }]);
            }
          }
          setProjectReady(true);
        }
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not load this recording.'));
  }, []);

  useEffect(() => () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  useEffect(() => {
    localStorage.setItem(EXPORT_SETTINGS_KEY, JSON.stringify(exportSettings));
  }, [exportSettings]);

  useEffect(() => {
    assetSourcesRef.current = assetSources;
    if (!recording) return;
    useEditorStore.getState().setGestureSources([
      { id: 'current', name: 'Current recording', durationMs: recording.durationMs, interactions: recording.interactions ?? [], crop: recording.crop },
      ...assetSources.filter((asset) => asset.type === 'video' && asset.interactions?.length).map((asset) => ({ id: asset.id, name: asset.name, durationMs: asset.gestureDurationMs ?? asset.durationMs, interactions: asset.interactions ?? [], crop: asset.crop })),
    ]);
  }, [assetSources, recording]);

  useEffect(() => () => {
    assetSourcesRef.current.forEach((asset) => URL.revokeObjectURL(asset.url));
  }, []);

  useEffect(() => {
    if (!recording || !projectReady) return;
    const timeout = window.setTimeout(() => {
      void saveEditorProject(recording.id, getSerializableProject());
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [recording, projectReady, settings]);

  useEffect(() => {
    if (!recording || !projectReady) return;
    useHistoryStore.getState().clear();
    const flush = () => void saveEditorProject(recording.id, getSerializableProject());
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [recording, projectReady]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const update = ({ detail }: { detail: { frame: number } }) => {
      const activeSpeed = useEditorStore.getState().sceneSpeed ?? 1;
      setCurrentTimeMs((detail.frame / FPS * 1000) * activeSpeed);
    };
    player.addEventListener('frameupdate', update);
    return () => player.removeEventListener('frameupdate', update);
  }, [videoUrl]);

  useEffect(() => {
    if (playerRef.current && playerRef.current.getCurrentFrame() >= durationInFrames) {
      playerRef.current.seekTo(Math.max(0, durationInFrames - 1));
    }
  }, [durationInFrames]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) useHistoryStore.getState().redo();
        else useHistoryStore.getState().undo();
      } else if (modifier && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        useHistoryStore.getState().redo();
      } else if (modifier && event.key.toLowerCase() === 'c') {
        if (copySelectedTimelineItem()) event.preventDefault();
      } else if (modifier && event.key.toLowerCase() === 'v') {
        if (pasteTimelineItem()) event.preventDefault();
      } else if (modifier && event.key.toLowerCase() === 'd') {
        if (duplicateSelectedTimelineItem()) event.preventDefault();
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        if (deleteSelectedZoomPoint() || deleteSelectedTimelineItem()) event.preventDefault();
      } else if (event.code === 'Space') {
        event.preventDefault();
        playerRef.current?.toggle();
      } else if (event.key === 'Escape') {
        setMovingMedia(false);
        playerRef.current?.pause();
      } else if (event.key === 'Enter' && movingMedia) {
        setMovingMedia(false);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        playerRef.current?.seekTo(Math.max(0, (playerRef.current?.getCurrentFrame() ?? 0) - FPS));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        playerRef.current?.seekTo(Math.min(durationInFrames - 1, (playerRef.current?.getCurrentFrame() ?? 0) + FPS));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [durationInFrames, movingMedia]);

  const inputProps = useMemo(() => ({
    src: videoUrl ?? '',
    clips: settings.clips,
    timelineMedia: settings.timelineMedia,
    gestureClips: settings.gestureClips,
    textClips: settings.textClips,
    zoomClips: settings.zoomClips,
    timelineLimitMs: settings.timelineLimitMs,
    assetSources,
    background: settings.background,
    media: settings.media,
    canvas: settings.canvas,
    frameStyle: settings.frameStyle,
    borderShape: settings.borderShape,
    cornerRadius: settings.cornerRadius,
    cornerSmoothing: settings.cornerSmoothing,
    borderOpacity: settings.borderOpacity,
    borderWidth: settings.borderWidth,
    borderColor: settings.borderColor,
    shadowStyle: settings.shadowStyle,
    shadowOpacity: settings.shadowOpacity,
    shadowLightX: settings.shadowLightX,
    shadowLightY: settings.shadowLightY,
    sourceWidth: sourceSize.width,
    sourceHeight: sourceSize.height,
    sourceDurationMs: recording?.durationMs ?? 0,
    interactions: recording?.interactions ?? [],
    crop: recording?.crop,
    sceneSpeed: settings.sceneSpeed ?? 1,
  }), [videoUrl, sourceSize, recording?.durationMs, recording?.interactions, recording?.crop, assetSources, settings.clips, settings.timelineMedia, settings.gestureClips, settings.textClips, settings.zoomClips, settings.timelineLimitMs, settings.background, settings.media, settings.canvas, settings.frameStyle, settings.borderShape, settings.cornerRadius, settings.cornerSmoothing, settings.borderOpacity, settings.borderWidth, settings.borderColor, settings.shadowStyle, settings.shadowOpacity, settings.shadowLightX, settings.shadowLightY, settings.sceneSpeed]);

  const seek = (timeMs: number) => {
    const activeSpeed = settings.sceneSpeed ?? 1;
    const frame = Math.min(durationInFrames - 1, Math.max(0, Math.round((timeMs / 1000 * FPS) / activeSpeed)));
    playerRef.current?.seekTo(frame);
    setCurrentTimeMs((frame / FPS * 1000) * activeSpeed);
  };

  const uploadMedia = async (files: FileList, placement?: { timelineStartMs: number; position?: { x: number; y: number } }) => {
    if (!recording) return;
    setError(undefined);
    try {
      const nextAssets: TimelineAssetSource[] = [];
      for (const file of Array.from(files)) {
        const type = getAssetType(file.type);
        if (!type) continue;
        const gestureMetadata = type === 'video' ? await readGestureMetadata(file) : undefined;
        const stored: StoredEditorAsset = {
          id: crypto.randomUUID(),
          recordingId: recording.id,
          blob: file,
          name: file.name,
          mimeType: file.type,
          createdAt: Date.now(),
          gestureDurationMs: gestureMetadata?.durationMs,
          interactions: gestureMetadata?.interactions,
          crop: gestureMetadata?.crop,
        };
        await saveEditorAsset(stored);
        const resolved = await resolveAsset(stored);
        if (resolved) nextAssets.push(resolved);
      }
      setAssetSources((current) => [...current, ...nextAssets]);
      if (placement && nextAssets.length > 0) {
        const placements = nextAssets.map((asset) => createTimelineMediaPlacement(asset, placement.timelineStartMs, placement.position));
        useEditorStore.getState().setTimelineMedia((current) => [...current, ...placements]);
        useEditorStore.getState().setSelectedTimelineItem({ kind: 'media', id: placements[0].id });
      }
      if (nextAssets.length === 0) setError('Choose a supported image, video, or audio file.');
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Could not add this media.');
    }
  };

  const removeAsset = async (assetId: string) => {
    const asset = assetSources.find((source) => source.id === assetId);
    await deleteEditorAsset(assetId);
    if (asset) URL.revokeObjectURL(asset.url);
    setAssetSources((current) => current.filter((source) => source.id !== assetId));
    const state = useEditorStore.getState();
    const removedIds = new Set(state.timelineMedia.filter((item) => item.assetId === assetId).map((item) => item.id));
    state.setTimelineMedia(state.timelineMedia.filter((item) => item.assetId !== assetId));
    state.setGestureClips((clips) => clips.map((clip) => clip.sourceAssetId === assetId ? { ...clip, sourceAssetId: undefined } : clip));
    if (state.selectedTimelineItem?.kind === 'media' && removedIds.has(state.selectedTimelineItem.id)) {
      state.setSelectedTimelineItem(state.clips[0] ? { kind: 'recording', id: state.clips[0].id } : undefined);
    }
  };

  const openProject = (id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('id', id);
    window.location.href = url.toString();
  };

  const exportProject = async () => {
    if (!recording || projectFileBusy) return;
    setProjectFileBusy(true);
    setError(undefined);
    try {
      const project = getSerializableProject();
      await saveEditorProject(recording.id, project);
      downloadBlob(await exportProjectArchive(recording, project), recording, 'zip');
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Could not export this project.');
    } finally {
      setProjectFileBusy(false);
    }
  };

  const importProject = async (file: File) => {
    if (projectFileBusy) return;
    setProjectFileBusy(true);
    setError(undefined);
    try {
      openProject(await importProjectArchive(file));
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Could not import this project.');
      setProjectFileBusy(false);
    }
  };

  const deleteCurrentProject = async () => {
    if (!recording || projectFileBusy) return;
    setProjectFileBusy(true);
    setProjectReady(false);
    try {
      await deleteRecordingProject(recording.id);
      const next = (await getRecordings())[0];
      if (next) openProject(next.id);
      else {
        try { await browser.action.openPopup(); } catch { /* The editor tab can still close without opening the toolbar popup. */ }
        window.close();
      }
    } catch (reason: unknown) {
      setProjectReady(true);
      setProjectFileBusy(false);
      setError(reason instanceof Error ? reason.message : 'Could not delete this project.');
    }
  };

  const downloadClip = async (clip: EditorClip) => {
    if (!recording) return;
    setError(undefined);
    try {
      await downloadRecordingClip(recording, clip);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Could not download this clip.');
    }
  };

  const runExport = async () => {
    if (!recording || exporting) return;
    setExporting(true);
    setProgress(0);
    setError(undefined);
    setNotice(undefined);
    try {
      const blob = await exportRecording({ props: inputProps, format, settings: exportSettings, onProgress: setProgress });
      downloadBlob(blob, recording, format);
      setNotice(`${format.toUpperCase()} export is ready.`);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Could not export this recording.');
    } finally {
      setExporting(false);
    }
  };

  if (error && !recording) {
    return <main className="grid min-h-screen place-items-center bg-canvas p-6"><div role="alert" className="max-w-md rounded-2xl border border-accent-200 bg-accent-50 p-5 text-danger">{error}</div></main>;
  }

  return (
    <main className="flex h-screen min-h-[620px] flex-col overflow-hidden bg-canvas text-ink">
      <header className="z-40 flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
        <div className="flex items-center gap-3">
          <LogoMark />
          <FileMenu currentId={recording?.id} busy={projectFileBusy} onImport={importProject} onExport={exportProject} onDelete={deleteCurrentProject} onError={setError} />
          <HistoryMenu />
          <span className="hidden h-5 w-px bg-border sm:block" />
          <div className="hidden sm:block"><p className="text-xs font-semibold">Recording complete</p><p className="text-[10px] text-muted">{recording ? formatDuration(recording.durationMs) : 'Loading…'}</p></div>
        </div>
        <div className="flex items-center gap-2">
          <ExportSettingsMenu settings={exportSettings} canvas={settings.canvas} disabled={exporting} onChange={setExportSettings} />
          <ExportMenu format={format} busy={exporting} progress={progress} onFormatChange={setFormat} onExport={runExport} />
        </div>
      </header>
      {error && <div role="alert" className="flex items-center gap-2 border-b border-accent-200 bg-accent-50 px-4 py-2 text-xs text-danger"><AlertCircle className="size-4" />{error}</div>}
      {notice && <div className="flex items-center gap-2 border-b border-primary-200 bg-primary-50 px-4 py-2 text-xs text-primary-800"><CheckCircle2 className="size-4" />{notice}</div>}
      <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)]">
        <EditorSidebar hasRecordingAudio={Boolean(recording && recording.hasAudio !== false)} />
        <div className="flex min-h-0 flex-col">
          {videoUrl ? <CanvasWorkspace inputProps={inputProps} playerRef={playerRef} movingMedia={movingMedia} onMovingMediaChange={setMovingMedia} onDropMedia={(files, position) => void uploadMedia(files, { timelineStartMs: currentTimeMs, position })} /> : <section className="grid min-h-0 flex-1 place-items-center"><div className="flex items-center gap-2 text-xs text-muted"><LoaderCircle className="size-4 animate-spin" /> Loading recording…</div></section>}
          {recording && <Timeline currentTimeMs={currentTimeMs} sourceDurationMs={recording.durationMs} recordingUrl={videoUrl} hasAudio={recording.hasAudio !== false} interactionCount={recording.interactions?.length ?? 0} onDownloadClip={(clip) => void downloadClip(clip)} onSeek={seek} assets={assetSources} onUploadMedia={(files) => void uploadMedia(files)} onDropMedia={(files, timelineStartMs) => void uploadMedia(files, { timelineStartMs })} onDeleteAsset={(assetId) => void removeAsset(assetId)} />}
        </div>
      </div>
    </main>
  );
}

export default App;
