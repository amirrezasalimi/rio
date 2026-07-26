export type CaptureMode = 'browser' | 'window' | 'monitor' | 'region';
export type RecordingStatus = 'idle' | 'choosing' | 'cropping' | 'recording' | 'paused' | 'saving' | 'error';

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RecordingOptions {
  mode: CaptureMode;
  microphone: boolean;
  sourceAudio: boolean;
}

export interface RecordingSessionState {
  status: RecordingStatus;
  elapsedMs: number;
  error?: string;
}

export type RecorderCommand = 'pause' | 'resume' | 'stop';

export type RecorderMessage =
  | { type: 'command'; command: RecorderCommand }
  | { type: 'state'; state: RecordingSessionState }
  | { type: 'request-state' };

export type RecorderRuntimeMessage =
  | { type: 'recorder-command'; sessionId: string; command: RecorderCommand }
  | { type: 'recorder-state'; sessionId: string; targetTabId: number; state: RecordingSessionState };
