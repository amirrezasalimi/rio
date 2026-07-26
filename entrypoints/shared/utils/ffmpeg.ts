import { FFmpeg } from '@ffmpeg/ffmpeg';

export interface FfmpegCoreUrls {
  coreURL: string;
  wasmURL: string;
  workerURL?: string;
}

let ffmpeg: FFmpeg | undefined;
let loadPromise: Promise<FFmpeg> | undefined;

export function getFfmpeg(): FFmpeg {
  ffmpeg ??= new FFmpeg();
  return ffmpeg;
}

export function loadFfmpeg(urls: FfmpegCoreUrls): Promise<FFmpeg> {
  if (loadPromise) return loadPromise;

  const instance = getFfmpeg();
  loadPromise = instance.load(urls).then(() => instance).catch((error: unknown) => {
    loadPromise = undefined;
    throw error;
  });

  return loadPromise;
}
