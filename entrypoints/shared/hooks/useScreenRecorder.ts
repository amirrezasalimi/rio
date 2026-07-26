import { useCallback, useEffect, useRef, useState } from 'react';
import { createRecorderChannel } from '../recording/channel';
import { getVideoCropRect, selectRecordingMimeType, stopStream } from '../recording/media';
import { saveRecording } from '../recording/storage';
import type {
  CropArea,
  RecorderCommand,
  RecordingOptions,
  RecordingSessionState,
} from '../recording/types';

interface PendingCapture {
  displayStream: MediaStream;
  microphoneStream?: MediaStream;
}

interface ActiveCapture extends PendingCapture {
  outputStream: MediaStream;
  recorder: MediaRecorder;
  audioContext?: AudioContext;
  stopDrawing?: () => void;
  startedAt: number;
  pausedAt?: number;
  pausedDuration: number;
}

interface MediaStreamTrackProcessorInstance {
  readable: ReadableStream<VideoFrame>;
}

interface MediaStreamTrackGeneratorInstance extends MediaStreamTrack {
  writable: WritableStream<VideoFrame>;
}

type InsertableStreamsGlobal = typeof globalThis & {
  MediaStreamTrackProcessor?: new (init: { track: MediaStreamTrack }) => MediaStreamTrackProcessorInstance;
  MediaStreamTrackGenerator?: new (init: { kind: 'video' }) => MediaStreamTrackGeneratorInstance;
};

const initialState: RecordingSessionState = { status: 'idle', elapsedMs: 0 };

export function useScreenRecorder() {
  const [state, setState] = useState<RecordingSessionState>(initialState);
  const [previewStream, setPreviewStream] = useState<MediaStream>();
  const pendingRef = useRef<PendingCapture | null>(null);
  const activeRef = useRef<ActiveCapture | null>(null);
  const stateRef = useRef(state);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  const publishState = useCallback((next: RecordingSessionState) => {
    stateRef.current = next;
    setState(next);
    channelRef.current?.postMessage({ type: 'state', state: next });
  }, []);

  const cleanUp = useCallback(() => {
    window.clearInterval(timerRef.current);
    timerRef.current = undefined;

    const active = activeRef.current;
    active?.stopDrawing?.();
    active?.audioContext?.close().catch(() => undefined);
    stopStream(active?.outputStream);
    stopStream(active?.displayStream);
    stopStream(active?.microphoneStream);

    const pending = pendingRef.current;
    stopStream(pending?.displayStream);
    stopStream(pending?.microphoneStream);

    activeRef.current = null;
    pendingRef.current = null;
    setPreviewStream(undefined);
  }, []);

  const stop = useCallback(() => {
    const recorder = activeRef.current?.recorder;
    if (recorder && recorder.state !== 'inactive') {
      publishState({ ...stateRef.current, status: 'saving' });
      recorder.stop();
    }
  }, [publishState]);

  const pause = useCallback(() => {
    const active = activeRef.current;
    if (!active || active.recorder.state !== 'recording') return;

    active.recorder.pause();
    active.pausedAt = performance.now();
    publishState({ ...stateRef.current, status: 'paused' });
  }, [publishState]);

  const resume = useCallback(() => {
    const active = activeRef.current;
    if (!active || active.recorder.state !== 'paused') return;

    if (active.pausedAt) active.pausedDuration += performance.now() - active.pausedAt;
    active.pausedAt = undefined;
    active.recorder.resume();
    publishState({ ...stateRef.current, status: 'recording' });
  }, [publishState]);

  const handleCommand = useCallback((command: RecorderCommand) => {
    if (command === 'pause') pause();
    if (command === 'resume') resume();
    if (command === 'stop') stop();
  }, [pause, resume, stop]);

  useEffect(() => {
    const channel = createRecorderChannel((message) => {
      if (message.type === 'command') handleCommand(message.command);
      if (message.type === 'request-state') {
        channelRef.current?.postMessage({ type: 'state', state: stateRef.current });
      }
    });
    channelRef.current = channel;

    return () => {
      channel.close();
      cleanUp();
    };
  }, [cleanUp, handleCommand]);

  const startTimer = useCallback(() => {
    window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      const active = activeRef.current;
      if (!active || stateRef.current.status !== 'recording') return;
      const elapsedMs = performance.now() - active.startedAt - active.pausedDuration;
      publishState({ status: 'recording', elapsedMs });
    }, 250);
  }, [publishState]);

  const mixAudio = useCallback((capture: PendingCapture) => {
    const tracks = [
      ...capture.displayStream.getAudioTracks(),
      ...(capture.microphoneStream?.getAudioTracks() ?? []),
    ];
    if (tracks.length === 0) return {};

    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    tracks.forEach((track) => {
      audioContext.createMediaStreamSource(new MediaStream([track])).connect(destination);
    });

    return { audioContext, audioTracks: destination.stream.getAudioTracks() };
  }, []);

  const createRegionStream = useCallback((stream: MediaStream, crop: CropArea, normalized = false) => {
    const sourceTrack = stream.getVideoTracks()[0];
    if (!sourceTrack) throw new Error('The selected source does not contain video.');
    const insertableStreams = globalThis as InsertableStreamsGlobal;
    const Processor = insertableStreams.MediaStreamTrackProcessor;
    const Generator = insertableStreams.MediaStreamTrackGenerator;
    if (!Processor || !Generator) {
      throw new Error('Area recording is unavailable in this version of Chromium.');
    }

    const processor = new Processor({ track: sourceTrack });
    const generator = new Generator({ kind: 'video' });
    const reader = processor.readable.getReader();
    const writer = generator.writable.getWriter();
    let stopped = false;
    let canvas: OffscreenCanvas | undefined;
    let context: OffscreenCanvasRenderingContext2D | null = null;

    const processFrames = async () => {
      try {
        while (!stopped) {
          const { done, value: frame } = await reader.read();
          if (done) break;

          try {
            const { x, y, width, height } = getVideoCropRect(
              crop,
              frame.displayWidth,
              frame.displayHeight,
              normalized,
            );
            if (!canvas || canvas.width !== width || canvas.height !== height) {
              canvas = new OffscreenCanvas(width, height);
              context = canvas.getContext('2d', { alpha: false });
            }
            if (!context || !canvas) throw new Error('Could not initialize the area crop surface.');
            context.drawImage(frame, x, y, width, height, 0, 0, width, height);
            const croppedFrame = new VideoFrame(canvas, {
              timestamp: frame.timestamp,
              duration: frame.duration ?? undefined,
              alpha: 'discard',
            });

            try {
              await writer.write(croppedFrame);
            } finally {
              croppedFrame.close();
            }
          } finally {
            frame.close();
          }
        }
      } catch (error) {
        if (!stopped) throw error;
      }
    };
    void processFrames().catch(() => {
      if (!stopped && activeRef.current?.recorder.state !== 'inactive') {
        activeRef.current?.recorder.stop();
      }
    });

    return {
      stream: new MediaStream([generator]),
      stopDrawing: () => {
        stopped = true;
        void reader.cancel().catch(() => undefined);
        void writer.close().catch(() => undefined);
        generator.stop();
      },
    };
  }, []);

  const beginMediaRecorder = useCallback(async (capture: PendingCapture, crop?: CropArea, normalizedCrop = false) => {
    let videoStream = capture.displayStream;
    let stopDrawing: (() => void) | undefined;

    if (crop) {
      const regionCapture = await createRegionStream(capture.displayStream, crop, normalizedCrop);
      videoStream = regionCapture.stream;
      stopDrawing = regionCapture.stopDrawing;
    }

    const { audioContext, audioTracks = [] } = mixAudio(capture);
    const outputStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...audioTracks,
    ]);
    const mimeType = selectRecordingMimeType();
    const recorder = new MediaRecorder(outputStream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    const startedAt = performance.now();

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => {
      publishState({ status: 'error', elapsedMs: stateRef.current.elapsedMs, error: 'The browser could not continue recording.' });
      cleanUp();
    };
    recorder.onstop = async () => {
      const durationMs = stateRef.current.elapsedMs;
      const finalType = recorder.mimeType || 'video/webm';
      const id = crypto.randomUUID();

      try {
        const blob = new Blob(chunks, { type: finalType });
        if (blob.size === 0) {
          throw new Error('No video frames were captured. Please reload the extension and try again.');
        }

        await saveRecording({
          id,
          blob,
          mimeType: finalType,
          createdAt: Date.now(),
          durationMs,
        });
        cleanUp();
        publishState({ status: 'idle', elapsedMs: 0 });
        await browser.tabs.create({ url: browser.runtime.getURL(`/playback.html?id=${id}`) });
        window.close();
      } catch (error) {
        cleanUp();
        publishState({
          status: 'error',
          elapsedMs: durationMs,
          error: error instanceof Error ? error.message : 'Could not save the recording.',
        });
      }
    };

    activeRef.current = {
      ...capture,
      outputStream,
      recorder,
      audioContext,
      stopDrawing,
      startedAt,
      pausedDuration: 0,
    };
    pendingRef.current = null;
    setPreviewStream(undefined);
    recorder.start(1_000);
    publishState({ status: 'recording', elapsedMs: 0 });
    startTimer();

    capture.displayStream.getVideoTracks()[0]?.addEventListener('ended', stop, { once: true });

  }, [cleanUp, createRegionStream, mixAudio, publishState, startTimer, stop]);

  const requestCapture = useCallback(async (options: RecordingOptions) => {
    cleanUp();
    publishState({ status: 'choosing', elapsedMs: 0 });

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: options.mode === 'region' ? 'monitor' : options.mode },
        audio: options.sourceAudio,
        preferCurrentTab: options.mode === 'browser',
        selfBrowserSurface: 'exclude',
        surfaceSwitching: 'include',
        systemAudio: options.sourceAudio ? 'include' : 'exclude',
      } as DisplayMediaStreamOptions);
      const microphoneStream = options.microphone
        ? await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          })
        : undefined;
      const capture = { displayStream, microphoneStream };
      pendingRef.current = capture;

      if (options.mode === 'region') {
        displayStream.getVideoTracks()[0]?.addEventListener('ended', () => {
          cleanUp();
          publishState(initialState);
        }, { once: true });
        setPreviewStream(displayStream);
        publishState({ status: 'cropping', elapsedMs: 0 });
      } else {
        await beginMediaRecorder(capture);
      }
    } catch (error) {
      cleanUp();
      const wasCancelled = error instanceof DOMException && error.name === 'NotAllowedError';
      publishState({
        status: wasCancelled ? 'idle' : 'error',
        elapsedMs: 0,
        error: wasCancelled ? undefined : error instanceof Error ? error.message : 'Could not start capture.',
      });
    }
  }, [beginMediaRecorder, cleanUp, publishState]);

  const startApprovedCapture = useCallback(async (
    streamId: string,
    options: RecordingOptions,
    sourceAudioAllowed: boolean,
    source: 'desktop' | 'tab' = 'desktop',
    crop?: CropArea,
  ) => {
    cleanUp();
    publishState({ status: 'choosing', elapsedMs: 0 });

    try {
      const displayStream = await navigator.mediaDevices.getUserMedia({
        video: {
          mandatory: {
            chromeMediaSource: source,
            chromeMediaSourceId: streamId,
          },
        },
        audio: options.sourceAudio && sourceAudioAllowed
          ? {
              mandatory: {
                chromeMediaSource: source,
                chromeMediaSourceId: streamId,
              },
            }
          : false,
      } as unknown as MediaStreamConstraints);
      const microphoneStream = options.microphone
        ? await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          })
        : undefined;
      const capture = { displayStream, microphoneStream };
      pendingRef.current = capture;

      await beginMediaRecorder(capture, crop, options.mode === 'region');
    } catch (error) {
      cleanUp();
      publishState({
        status: 'error',
        elapsedMs: 0,
        error: error instanceof Error ? error.message : 'Could not start capture.',
      });
    }
  }, [beginMediaRecorder, cleanUp, publishState]);

  const confirmCrop = useCallback(async (crop: CropArea) => {
    if (!pendingRef.current) return;
    try {
      await beginMediaRecorder(pendingRef.current, crop);
    } catch (error) {
      cleanUp();
      publishState({
        status: 'error',
        elapsedMs: 0,
        error: error instanceof Error ? error.message : 'Could not record the selected area.',
      });
    }
  }, [beginMediaRecorder, cleanUp, publishState]);

  const cancelCrop = useCallback(() => {
    cleanUp();
    publishState(initialState);
  }, [cleanUp, publishState]);

  return { state, previewStream, requestCapture, startApprovedCapture, confirmCrop, cancelCrop, pause, resume, stop };
}
