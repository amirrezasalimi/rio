import type { RecorderMessage } from './types';

const CHANNEL_NAME = 'rio-recorder-session';

export function createRecorderChannel(onMessage?: (message: RecorderMessage) => void) {
  const channel = new BroadcastChannel(CHANNEL_NAME);

  if (onMessage) {
    channel.addEventListener('message', (event: MessageEvent<RecorderMessage>) => {
      onMessage(event.data);
    });
  }

  return channel;
}
