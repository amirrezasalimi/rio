import { fetchFile } from '@ffmpeg/util';
import { canRenderMediaOnWeb, renderMediaOnWeb } from '@remotion/web-renderer';
import { getFfmpeg, loadFfmpeg } from '../../shared/utils/ffmpeg';
import type { ExportFormat, ExportSettings } from './types';
import { getEditedDurationMs, getExportDimensions } from './types';
import { VideoComposition, type VideoCompositionProps } from './VideoComposition';

interface ExportOptions {
  props: VideoCompositionProps;
  format: ExportFormat;
  settings: ExportSettings;
  onProgress: (progress: number) => void;
}

const CORE_URL = new URL('/ffmpeg/ffmpeg-core.js', window.location.href).href;
const WASM_URL = new URL('/ffmpeg/ffmpeg-core.wasm', window.location.href).href;

async function renderStyledVideo(props: VideoCompositionProps, format: 'webm' | 'mp4', settings: ExportSettings, onProgress: (progress: number) => void): Promise<Blob> {
  const projectDurationMs = Math.max(
    getEditedDurationMs(props.clips, props.timelineMedia, props.gestureClips, props.textClips),
    props.timelineLimitMs,
  );
  const durationInFrames = Math.max(1, Math.ceil(projectDurationMs / 1000 * settings.fps));
  const dimensions = getExportDimensions(props.canvas, settings.quality);
  const renderProps = { ...props, renderScale: dimensions.width / props.canvas.width };
  const availability = await canRenderMediaOnWeb({
    container: format,
    videoCodec: format === 'mp4' ? 'h264' : 'vp9',
    width: dimensions.width,
    height: dimensions.height,
    transparent: props.background.type === 'transparent' && format === 'webm',
  });
  if (!availability.canRender) {
    throw new Error(availability.issues.find((issue) => issue.severity === 'error')?.message ?? `${format.toUpperCase()} rendering is unavailable in this browser.`);
  }

  const { getBlob } = await renderMediaOnWeb({
    composition: {
      id: 'rio-editor-export',
      component: VideoComposition,
      durationInFrames,
      fps: settings.fps,
      width: dimensions.width,
      height: dimensions.height,
      defaultProps: renderProps,
    },
    inputProps: renderProps,
    container: format,
    videoCodec: format === 'mp4' ? 'h264' : 'vp9',
    videoBitrate: 'high',
    transparent: props.background.type === 'transparent' && format === 'webm',
    onProgress: ({ progress }) => onProgress(progress * 0.9),
    outputTarget: 'arraybuffer',
  });

  return getBlob();
}

async function convertToGif(video: Blob, settings: ExportSettings, onProgress: (progress: number) => void): Promise<Blob> {
  const ffmpeg = await loadFfmpeg({ coreURL: CORE_URL, wasmURL: WASM_URL });
  const input = 'rio-styled.webm';
  const output = 'rio-output.gif';
  const progressHandler = ({ progress }: { progress: number }) => onProgress(0.9 + Math.max(0, Math.min(1, progress)) * 0.1);
  ffmpeg.on('progress', progressHandler);

  try {
    await ffmpeg.writeFile(input, await fetchFile(video));
    const exitCode = await ffmpeg.exec([
      '-i', input,
      '-vf', `fps=${settings.fps},split[g0][g1];[g0]palettegen=max_colors=192[p];[g1][p]paletteuse=dither=sierra2_4a`,
      '-loop', '0', output,
    ]);
    if (exitCode !== 0) throw new Error('FFmpeg could not create the GIF.');
    const data = await ffmpeg.readFile(output);
    if (typeof data === 'string') throw new Error('FFmpeg returned an unexpected text result.');
    const copied = new Uint8Array(data.byteLength);
    copied.set(data);
    return new Blob([copied], { type: 'image/gif' });
  } finally {
    ffmpeg.off('progress', progressHandler);
    await Promise.all([input, output].map((path) => getFfmpeg().deleteFile(path).catch(() => false)));
  }
}

export async function exportRecording({ props, format, settings, onProgress }: ExportOptions): Promise<Blob> {
  onProgress(0);
  const renderFormat = format === 'gif' ? 'webm' : format;
  const video = await renderStyledVideo(props, renderFormat, settings, onProgress);
  if (format !== 'gif') {
    onProgress(1);
    return video;
  }

  const gif = await convertToGif(video, settings, onProgress);
  onProgress(1);
  return gif;
}
