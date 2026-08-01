import { Camera } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useScreenRecorder } from '../shared/hooks/useScreenRecorder';
import type {
  CaptureMode,
  CropArea,
  RecorderRuntimeMessage,
  RecordingOptions,
} from '../shared/recording/types';

interface WebcamPreviewMessage {
  type: 'webcam-preview-request' | 'webcam-preview-answer';
  id: string;
  answer?: RTCSessionDescriptionInit;
}

interface CaptureApprovedMessage {
  type: 'capture-approved';
  sessionId: string;
  streamId: string;
  sourceAudioAllowed: boolean;
  source: 'tab';
}

type DesktopSource = 'screen' | 'window' | 'tab' | 'audio';

function getDesktopSources(options: RecordingOptions): DesktopSource[] {
  const preferredSource: Record<Exclude<CaptureMode, 'region'>, DesktopSource> = {
    browser: 'tab',
    window: 'window',
    monitor: 'screen',
  };
  const sources: DesktopSource[] = [preferredSource[options.mode as Exclude<CaptureMode, 'region'>]];
  if (options.sourceAudio) sources.push('audio');
  return sources;
}

function App() {
  const startedRef = useRef(false);
  const webcamStreamRef = useRef<MediaStream | undefined>(undefined);
  const previewPeersRef = useRef(new Map<string, RTCPeerConnection>());
  const requestCameraRef = useRef<(() => void) | undefined>(undefined);
  const [permissionError, setPermissionError] = useState<string>();
  const [requestingCamera, setRequestingCamera] = useState(false);
  const capture = useMemo(() => {
    const query = new URLSearchParams(window.location.search);
    const requestedMode = query.get('mode');
    const mode: CaptureMode = ['browser', 'window', 'monitor', 'region'].includes(requestedMode ?? '')
      ? requestedMode as CaptureMode
      : 'browser';
    const serializedCrop = query.get('crop');

    return {
      sessionId: query.get('sessionId') ?? '',
      targetTabId: Number(query.get('targetTabId')),
      crop: serializedCrop ? JSON.parse(serializedCrop) as CropArea : undefined,
      options: {
        mode,
        microphone: query.get('microphone') === 'true',
        sourceAudio: query.get('sourceAudio') === 'true',
        webcam: query.get('webcam') === 'true',
      } satisfies RecordingOptions,
    };
  }, []);
  const { state, startApprovedCapture, pause, resume, stop, recordInteraction } = useScreenRecorder();

  useEffect(() => {
    const handleMessage = (message: unknown) => {
      const request = message as CaptureApprovedMessage | RecorderRuntimeMessage | WebcamPreviewMessage;
      if (request.type === 'webcam-preview-request' && webcamStreamRef.current) {
        const peer = new RTCPeerConnection();
        previewPeersRef.current.set(request.id, peer);
        webcamStreamRef.current.getVideoTracks().forEach((track) => peer.addTrack(track, webcamStreamRef.current!));
        peer.addEventListener('icecandidate', () => {
          if (peer.iceGatheringState !== 'complete' || !peer.localDescription) return;
          void browser.runtime.sendMessage({ type: 'webcam-preview-offer', id: request.id, offer: peer.localDescription });
        });
        void peer.createOffer().then((offer) => peer.setLocalDescription(offer));
        return;
      }
      if (request.type === 'webcam-preview-answer' && request.answer) {
        const peer = previewPeersRef.current.get(request.id);
        if (peer) void peer.setRemoteDescription(request.answer);
        return;
      }
      if (request.type === 'interaction-event' && request.sessionId === capture.sessionId) {
        recordInteraction(request.event);
        return;
      }

      if (request.type === 'recorder-command' && request.sessionId === capture.sessionId) {
        if (request.command === 'pause') pause();
        if (request.command === 'resume') resume();
        if (request.command === 'stop') stop();
        return;
      }

      if (
        request.type !== 'capture-approved'
        || request.sessionId !== capture.sessionId
        || startedRef.current
      ) return;

      startedRef.current = true;
      void startApprovedCapture(
        request.streamId,
        capture.options,
        request.sourceAudioAllowed,
        request.source,
        capture.crop,
        webcamStreamRef.current,
      );
    };

    browser.runtime.onMessage.addListener(handleMessage);

    const initializeCapture = async () => {
      await browser.runtime.sendMessage({ type: 'recorder-ready', sessionId: capture.sessionId });
      if (capture.options.mode === 'region' || startedRef.current) return;
      startedRef.current = true;

      chrome.desktopCapture.chooseDesktopMedia(
        getDesktopSources(capture.options),
        async (streamId, pickerOptions) => {
          const error = chrome.runtime.lastError;
          if (error || !streamId) {
            if (error) console.error('Rio desktop capture picker failed.', error.message);
            await browser.runtime.sendMessage({
              type: 'desktop-capture-result',
              sessionId: capture.sessionId,
              approved: false,
            });
            return;
          }

          const approved = await startApprovedCapture(
            streamId,
            capture.options,
            pickerOptions.canRequestAudioTrack,
            'desktop',
            undefined,
            webcamStreamRef.current,
          );
          await browser.runtime.sendMessage({
            type: 'desktop-capture-result',
            sessionId: capture.sessionId,
            approved,
          });
        },
      );
    };

    const requestCamera = async () => {
      setRequestingCamera(true);
      setPermissionError(undefined);
      try {
        webcamStreamRef.current = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        await initializeCapture();
      } catch (error) {
        setPermissionError(error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access for Rio, then try again.'
          : error instanceof Error ? error.message : 'Rio could not access your webcam.');
      } finally {
        setRequestingCamera(false);
      }
    };
    requestCameraRef.current = () => { void requestCamera(); };
    if (!capture.options.webcam) {
      void initializeCapture();
    } else {
      void navigator.permissions.query({ name: 'camera' as PermissionName }).then((permission) => {
        if (permission.state === 'granted') void requestCamera();
      }).catch(() => undefined);
    }
    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
      previewPeersRef.current.forEach((peer) => peer.close());
      previewPeersRef.current.clear();
      if (!startedRef.current) webcamStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [capture, pause, recordInteraction, resume, startApprovedCapture, stop]);

  useEffect(() => {
    void browser.runtime.sendMessage({
      type: 'recorder-state',
      sessionId: capture.sessionId,
      targetTabId: capture.targetTabId,
      state,
    } satisfies RecorderRuntimeMessage);
  }, [capture.sessionId, capture.targetTabId, state]);

  if (!capture.options.webcam) return null;

  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-6 text-ink">
      <section className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6 text-center shadow-xl shadow-ink/10">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary-100 text-primary-700">
          <Camera className="size-5" />
        </span>
        <h1 className="mt-4 text-lg font-semibold">Preparing your webcam</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {permissionError ?? 'Enable your camera to continue to screen selection.'}
        </p>
        <button
          type="button"
          disabled={requestingCamera}
          onClick={() => requestCameraRef.current?.()}
          className="mt-4 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-600 disabled:cursor-wait disabled:opacity-60"
        >
          {requestingCamera ? 'Requesting camera…' : permissionError ? 'Try again' : 'Enable camera'}
        </button>
      </section>
    </main>
  );
}

export default App;
