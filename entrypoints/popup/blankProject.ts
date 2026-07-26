import { saveEditorProject, saveRecording, type StoredRecording } from '../shared/recording/storage';
import { createInitialSettings } from '../playback/editor/types';

async function createBlankVideo(): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create a blank project canvas.');
  context.fillStyle = '#fffaf0';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const stream = canvas.captureStream(1);
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  const stopped = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => reject(new Error('Could not create the blank project video.'));
  });
  recorder.start();
  await new Promise((resolve) => window.setTimeout(resolve, 1_050));
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());
  return new Blob(chunks, { type: 'video/webm' });
}

export async function createBlankProject(): Promise<string> {
  const id = crypto.randomUUID();
  const durationMs = 1_000;
  const recording: StoredRecording = { id, blob: await createBlankVideo(), mimeType: 'video/webm', createdAt: Date.now(), durationMs, interactions: [] };
  const settings = createInitialSettings(durationMs);
  settings.clips = [];
  await saveRecording(recording);
  await saveEditorProject(id, settings);
  return id;
}
