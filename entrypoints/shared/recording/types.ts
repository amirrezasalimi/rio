export type CaptureMode = 'browser' | 'window' | 'monitor' | 'region';
export type RecordingStatus = 'idle' | 'choosing' | 'cropping' | 'recording' | 'paused' | 'saving' | 'error';

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
  viewportWidth?: number;
  viewportHeight?: number;
}

export interface RecordingOptions {
  mode: CaptureMode;
  microphone: boolean;
  sourceAudio: boolean;
  webcam: boolean;
}

export interface RecordingSessionState {
  status: RecordingStatus;
  elapsedMs: number;
  error?: string;
}

export type RecorderCommand = 'pause' | 'resume' | 'stop';

export type InteractionKind =
  | 'pointer-move'
  | 'click'
  | 'double-click'
  | 'drag-start'
  | 'drag-move'
  | 'drag-end'
  | 'scroll';

export interface InteractionTarget {
  tagName: string;
  id?: string;
  role?: string;
  name?: string;
  type?: string;
}

export interface InteractionEventInput {
  kind: InteractionKind;
  occurredAt: number;
  target?: InteractionTarget;
  x?: number;
  y?: number;
  normalizedX?: number;
  normalizedY?: number;
  pageX?: number;
  pageY?: number;
  viewportWidth: number;
  viewportHeight: number;
  pointerType?: string;
  button?: number;
  buttons?: number;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  scrollX?: number;
  scrollY?: number;
  scrollWidth?: number;
  scrollHeight?: number;
}

export interface RecordedInteraction extends Omit<InteractionEventInput, 'occurredAt'> {
  timestampMs: number;
}

export type RecorderMessage =
  | { type: 'command'; command: RecorderCommand }
  | { type: 'state'; state: RecordingSessionState }
  | { type: 'request-state' };

export type RecorderRuntimeMessage =
  | { type: 'recorder-command'; sessionId: string; command: RecorderCommand }
  | { type: 'recorder-state'; sessionId: string; targetTabId: number; state: RecordingSessionState }
  | { type: 'interaction-event'; sessionId: string; event: InteractionEventInput };
