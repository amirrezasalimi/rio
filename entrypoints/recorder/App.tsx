import { useEffect, useMemo, useRef } from 'react';
import { useScreenRecorder } from '../shared/hooks/useScreenRecorder';
import type {
  CaptureMode,
  CropArea,
  RecorderRuntimeMessage,
  RecordingOptions,
} from '../shared/recording/types';

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
      } satisfies RecordingOptions,
    };
  }, []);
  const { state, startApprovedCapture, pause, resume, stop, recordInteraction } = useScreenRecorder();

  useEffect(() => {
    const handleMessage = (message: unknown) => {
      const request = message as CaptureApprovedMessage | RecorderRuntimeMessage;
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
      startApprovedCapture(
        request.streamId,
        capture.options,
        request.sourceAudioAllowed,
        request.source,
        capture.crop,
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
          );
          await browser.runtime.sendMessage({
            type: 'desktop-capture-result',
            sessionId: capture.sessionId,
            approved,
          });
        },
      );
    };

    void initializeCapture();
    return () => browser.runtime.onMessage.removeListener(handleMessage);
  }, [capture, pause, recordInteraction, resume, startApprovedCapture, stop]);

  useEffect(() => {
    void browser.runtime.sendMessage({
      type: 'recorder-state',
      sessionId: capture.sessionId,
      targetTabId: capture.targetTabId,
      state,
    } satisfies RecorderRuntimeMessage);
  }, [capture.sessionId, capture.targetTabId, state]);

  return null;
}

export default App;
