import type {
  CaptureMode,
  CropArea,
  RecorderRuntimeMessage,
  RecordingOptions,
  RecordingSessionState,
} from './shared/recording/types';

interface StartCaptureMessage {
  type: 'start-capture';
  options: RecordingOptions;
  targetTabId: number;
}

interface RecorderReadyMessage {
  type: 'recorder-ready';
  sessionId: string;
}

type DesktopSource = 'screen' | 'window' | 'tab' | 'audio';
type CaptureRequest = StartCaptureMessage | RecorderReadyMessage | RecorderRuntimeMessage;

interface StartCaptureResponse {
  ok: boolean;
  error?: string;
}

interface PendingCapture {
  options: RecordingOptions;
  recorderTabId?: number;
  targetTabId: number;
  area?: CropArea;
}

const pendingCaptures = new Map<string, PendingCapture>();
const activeCaptures = new Map<string, PendingCapture>();

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

async function createRecorderHostTab(sessionId: string, pending: PendingCapture) {
  const query = new URLSearchParams({
    sessionId,
    mode: pending.options.mode,
    microphone: String(pending.options.microphone),
    sourceAudio: String(pending.options.sourceAudio),
    targetTabId: String(pending.targetTabId),
  });
  if (pending.area) query.set('crop', JSON.stringify(pending.area));

  const targetTab = await browser.tabs.get(pending.targetTabId);
  const recorderTab = await browser.tabs.create({
    url: browser.runtime.getURL(`/recorder.html?${query}`),
    windowId: targetTab.windowId,
    active: false,
  });
  if (!recorderTab.id) throw new Error('Could not initialize the recording host.');

  pending.recorderTabId = recorderTab.id;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Could not start the recording.';
}

function canInjectIntoPage(url?: string) {
  return Boolean(url && /^(https?|file):/i.test(url));
}

async function sendPageMessage<T>(tabId: number, message: unknown): Promise<T> {
  try {
    return await browser.tabs.sendMessage(tabId, message) as T;
  } catch (error: unknown) {
    const tab = await browser.tabs.get(tabId);
    if (!canInjectIntoPage(tab.url)) throw error;
    await browser.scripting.executeScript({
      target: { tabId },
      files: ['/content-scripts/region.js'],
    });
    return await browser.tabs.sendMessage(tabId, message) as T;
  }
}

async function selectRecordingArea(tabId: number, requestId: string) {
  try {
    return await sendPageMessage<CropArea | null | undefined>(tabId, { type: 'select-recording-area', requestId });
  } catch (error: unknown) {
    const tab = await browser.tabs.get(tabId);
    if (!canInjectIntoPage(tab.url)) {
      throw new Error('Area recording is unavailable on this browser page. Open a website and try again.');
    }
    throw new Error('Rio could not open the Area selector on this page. Reload the page and try again.', { cause: error });
  }
}

async function showPageControls(sessionId: string, pending: PendingCapture) {
  const state: RecordingSessionState = { status: 'choosing', elapsedMs: 0 };
  await sendPageMessage(pending.targetTabId, {
    type: 'show-recorder-controls',
    sessionId,
    state,
    area: pending.area,
  });
}

async function refocusCapturedPage(pending: PendingCapture) {
  const targetTab = await browser.tabs.get(pending.targetTabId);
  if (targetTab.windowId !== undefined) {
    await browser.windows.update(targetTab.windowId, { focused: true });
  }
  await browser.tabs.update(pending.targetTabId, { active: true });
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(async (message: unknown) => {
    const request = message as CaptureRequest;

    if (request.type === 'recorder-command') return;

    if (request.type === 'recorder-state') {
      await browser.tabs.sendMessage(request.targetTabId, request).catch(() => undefined);
      if (request.state.status === 'idle') activeCaptures.delete(request.sessionId);
      return;
    }

    if (request.type === 'start-capture') {
      const sessionId = crypto.randomUUID();
      const pending: PendingCapture = {
        options: request.options,
        targetTabId: request.targetTabId,
      };
      pendingCaptures.set(sessionId, pending);

      if (request.options.mode === 'region') {
        try {
          const area = await selectRecordingArea(request.targetTabId, sessionId);
          if (!area) {
            pendingCaptures.delete(sessionId);
            return { ok: false } satisfies StartCaptureResponse;
          }
          pending.area = area;
          await createRecorderHostTab(sessionId, pending);
          return { ok: true } satisfies StartCaptureResponse;
        } catch (error: unknown) {
          pendingCaptures.delete(sessionId);
          console.error('Rio area capture setup failed.', error);
          return {
            ok: false,
            error: getErrorMessage(error),
          } satisfies StartCaptureResponse;
        }
      }

      try {
        await createRecorderHostTab(sessionId, pending);
        return { ok: true } satisfies StartCaptureResponse;
      } catch (error: unknown) {
        pendingCaptures.delete(sessionId);
        return {
          ok: false,
          error: getErrorMessage(error),
        } satisfies StartCaptureResponse;
      }
    }

    if (request.type !== 'recorder-ready') return;
    const pending = pendingCaptures.get(request.sessionId);
    if (!pending?.recorderTabId) return;
    pendingCaptures.delete(request.sessionId);
    activeCaptures.set(request.sessionId, pending);

    if (pending.options.mode === 'region') {
      try {
        const streamId = await chrome.tabCapture.getMediaStreamId({
          targetTabId: pending.targetTabId,
          consumerTabId: pending.recorderTabId,
        });
        await browser.runtime.sendMessage({
          type: 'capture-approved',
          sessionId: request.sessionId,
          streamId,
          source: 'tab',
          sourceAudioAllowed: pending.options.sourceAudio,
        });
        await showPageControls(request.sessionId, pending);
        await refocusCapturedPage(pending);
      } catch {
        activeCaptures.delete(request.sessionId);
        await browser.tabs.remove(pending.recorderTabId).catch(() => undefined);
      }
      return;
    }

    chrome.desktopCapture.chooseDesktopMedia(
      getDesktopSources(pending.options),
      await browser.tabs.get(pending.recorderTabId),
      async (streamId, pickerOptions) => {
        if (!streamId) {
          activeCaptures.delete(request.sessionId);
          await browser.tabs.remove(pending.recorderTabId!).catch(() => undefined);
          return;
        }
        await browser.runtime.sendMessage({
          type: 'capture-approved',
          sessionId: request.sessionId,
          streamId,
          source: 'desktop',
          sourceAudioAllowed: pickerOptions.canRequestAudioTrack,
        });
        await showPageControls(request.sessionId, pending);
        await refocusCapturedPage(pending);
      },
    );
  });
});
