import ReactDOM, { type Root } from 'react-dom/client';
import type { ContentScriptUi } from 'wxt/utils/content-script-ui/types';
import { startInteractionTracking } from '../shared/recording/interactions';
import type { CropArea, RecorderRuntimeMessage, RecordingSessionState } from '../shared/recording/types';
import { CropGuide } from './CropGuide';
import { RecordingPanel } from './RecordingPanel';
import { RegionSelector } from './RegionSelector';
import './style.css';

interface SelectRegionMessage {
  type: 'select-recording-area';
  requestId: string;
}

interface ShowControlsMessage {
  type: 'show-recorder-controls';
  sessionId: string;
  state: RecordingSessionState;
  area?: CropArea;
}

interface UpdateControlsMessage {
  type: 'update-recorder-controls';
  sessionId: string;
  state: RecordingSessionState;
}

interface HideControlsMessage {
  type: 'hide-recorder-controls';
  sessionId: string;
}

type ContentMessage = SelectRegionMessage | ShowControlsMessage | UpdateControlsMessage | HideControlsMessage | RecorderRuntimeMessage;

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',

  main(ctx) {
    document.querySelectorAll('rio-region-selector, rio-recording-panel').forEach((element) => element.remove());
    let controlsUi: ContentScriptUi<Root> | undefined;
    let controlsRoot: Root | undefined;
    let controlsSessionId = '';
    let controlsState: RecordingSessionState = { status: 'choosing', elapsedMs: 0 };
    let controlsArea: CropArea | undefined;
    let stopInteractionTracking: (() => void) | undefined;

    const stopTracking = () => {
      stopInteractionTracking?.();
      stopInteractionTracking = undefined;
    };

    const startTracking = () => {
      if (stopInteractionTracking || !controlsSessionId) return;
      stopInteractionTracking = startInteractionTracking((event) => {
        void browser.runtime.sendMessage({
          type: 'interaction-event',
          sessionId: controlsSessionId,
          event,
        } satisfies RecorderRuntimeMessage).catch(() => undefined);
      });
    };

    const renderControls = () => {
      if (!controlsRoot || !controlsSessionId) return;
      controlsRoot.render(
        <>
          {controlsArea && <CropGuide area={controlsArea} />}
          <RecordingPanel
            sessionId={controlsSessionId}
            state={controlsState}
            onCommand={(command) => {
              void browser.runtime.sendMessage({
                type: 'recorder-command',
                sessionId: controlsSessionId,
                command,
              } satisfies RecorderRuntimeMessage);
            }}
          />
        </>,
      );
    };

    const showControls = async (message: ShowControlsMessage) => {
      controlsUi?.remove();
      controlsSessionId = message.sessionId;
      controlsState = message.state;
      controlsArea = message.area;
      controlsUi = await createShadowRootUi<Root>(ctx, {
        name: 'rio-recording-panel',
        position: 'modal',
        zIndex: 2_147_483_647,
        anchor: 'body',
        onMount: (container) => {
          const app = document.createElement('div');
          app.id = 'rio-recording-panel-root';
          container.append(app);
          controlsRoot = ReactDOM.createRoot(app);
          renderControls();
          return controlsRoot;
        },
        onRemove: (root) => {
          root?.unmount();
          controlsRoot = undefined;
        },
      });
      controlsUi.mount();
    };

    const handleMessage = (
      message: unknown,
      _sender: Browser.runtime.MessageSender,
      sendResponse: (response: CropArea | null) => void,
    ) => {
      const request = message as ContentMessage;

      if (request.type === 'show-recorder-controls') {
        void showControls(request).catch((error: unknown) => {
          console.error('Rio could not mount the recording controls.', error);
        });
        return;
      }

      if (request.type === 'update-recorder-controls' || request.type === 'recorder-state') {
        if (request.sessionId !== controlsSessionId) return;
        controlsState = request.state;
        if (request.state.status === 'recording') startTracking();
        if (request.state.status !== 'recording') stopTracking();
        if (request.state.status === 'idle') {
          controlsUi?.remove();
          controlsUi = undefined;
          controlsSessionId = '';
          controlsArea = undefined;
        } else {
          renderControls();
        }
        return;
      }

      if (request.type === 'hide-recorder-controls') {
        if (request.sessionId !== controlsSessionId) return;
        stopTracking();
        controlsUi?.remove();
        controlsUi = undefined;
        controlsSessionId = '';
        controlsArea = undefined;
        return;
      }

      if (request.type !== 'select-recording-area') return;

      void (async () => {
        document.querySelector('rio-region-selector')?.remove();
        let settled = false;
        const ui = await createShadowRootUi<Root>(ctx, {
          name: 'rio-region-selector',
          position: 'modal',
          zIndex: 2_147_483_647,
          anchor: 'body',
          onMount: (container) => {
            const app = document.createElement('div');
            app.id = 'rio-region-root';
            container.append(app);
            const root = ReactDOM.createRoot(app);
            root.render(
              <RegionSelector
                onComplete={(area) => {
                  if (settled) return;
                  settled = true;
                  sendResponse(area);
                  ui.remove();
                }}
              />,
            );
            return root;
          },
          onRemove: (root) => root?.unmount(),
        });
        ui.mount();
      })().catch((error: unknown) => {
        console.error('Rio could not mount the area selector.', error);
        sendResponse(null);
      });

      return true;
    };

    browser.runtime.onMessage.addListener(handleMessage);
    ctx.onInvalidated(() => {
      browser.runtime.onMessage.removeListener(handleMessage);
      stopTracking();
      controlsUi?.remove();
    });
  },
});
