import type { CropArea } from './types';

export interface VideoCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function alignCropAxis(start: number, length: number, frameLength: number) {
  const evenFrameLength = Math.floor(frameLength / 2) * 2;
  const alignedStart = Math.min(
    Math.max(0, Math.ceil(start / 2) * 2),
    Math.max(0, evenFrameLength - 2),
  );
  const alignedEnd = Math.max(
    alignedStart + 2,
    Math.min(evenFrameLength, Math.floor((start + length) / 2) * 2),
  );

  return { start: alignedStart, length: alignedEnd - alignedStart };
}

export function getVideoCropRect(
  crop: CropArea,
  frameWidth: number,
  frameHeight: number,
  normalized: boolean,
): VideoCropRect {
  let sourceX = crop.x;
  let sourceY = crop.y;
  let sourceWidth = crop.width;
  let sourceHeight = crop.height;

  if (normalized) {
    const hasViewportSize = Boolean(crop.viewportWidth && crop.viewportHeight);
    const contentScale = hasViewportSize
      ? Math.min(frameWidth / crop.viewportWidth!, frameHeight / crop.viewportHeight!)
      : 1;
    const contentWidth = hasViewportSize ? crop.viewportWidth! * contentScale : frameWidth;
    const contentHeight = hasViewportSize ? crop.viewportHeight! * contentScale : frameHeight;
    const contentX = (frameWidth - contentWidth) / 2;
    const contentY = (frameHeight - contentHeight) / 2;

    sourceX = contentX + crop.x * contentWidth;
    sourceY = contentY + crop.y * contentHeight;
    sourceWidth = crop.width * contentWidth;
    sourceHeight = crop.height * contentHeight;
  }

  const horizontal = alignCropAxis(sourceX, sourceWidth, frameWidth);
  const vertical = alignCropAxis(sourceY, sourceHeight, frameHeight);
  return {
    x: horizontal.start,
    y: vertical.start,
    width: horizontal.length,
    height: vertical.length,
  };
}

export function selectRecordingMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return hours > 0
    ? [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
    : [minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

export function stopStream(stream?: MediaStream): void {
  stream?.getTracks().forEach((track) => track.stop());
}
