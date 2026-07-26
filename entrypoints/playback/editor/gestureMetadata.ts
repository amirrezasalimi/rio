import type { CropArea, RecordedInteraction } from '../../shared/recording/types';

const FOOTER_MAGIC = new TextEncoder().encode('RIOGESTURESv1');

export interface RioGestureMetadata {
  version: 1;
  durationMs: number;
  interactions: RecordedInteraction[];
  crop?: CropArea;
}

export function embedGestureMetadata(video: Blob, metadata: RioGestureMetadata): Blob {
  const encoded = new TextEncoder().encode(JSON.stringify(metadata));
  const length = new Uint8Array(4);
  new DataView(length.buffer).setUint32(0, encoded.byteLength, true);
  return new Blob([video, encoded, length, FOOTER_MAGIC], { type: video.type });
}

export async function readGestureMetadata(video: Blob): Promise<RioGestureMetadata | undefined> {
  const footerSize = FOOTER_MAGIC.byteLength + 4;
  if (video.size < footerSize) return undefined;
  const footer = new Uint8Array(await video.slice(video.size - footerSize).arrayBuffer());
  const marker = footer.slice(4);
  if (!marker.every((value, index) => value === FOOTER_MAGIC[index])) return undefined;
  const length = new DataView(footer.buffer, footer.byteOffset, 4).getUint32(0, true);
  if (length <= 0 || length > video.size - footerSize) return undefined;
  try {
    const text = await video.slice(video.size - footerSize - length, video.size - footerSize).text();
    const metadata = JSON.parse(text) as Partial<RioGestureMetadata>;
    if (metadata.version !== 1 || !Array.isArray(metadata.interactions) || !Number.isFinite(metadata.durationMs)) return undefined;
    return metadata as RioGestureMetadata;
  } catch {
    return undefined;
  }
}
