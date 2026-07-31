import { useEffect, useMemo, useState } from 'react';

const SAMPLE_COUNT = 720;
const waveformCache = new Map<string, Promise<number[]>>();

async function decodeWaveform(url: string): Promise<number[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Could not load audio waveform source.');
  const context = new OfflineAudioContext(1, 1, 44_100);
  const buffer = await context.decodeAudioData(await response.arrayBuffer());
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  if (channels.length === 0 || buffer.length === 0) return [];

  const samplesPerBucket = Math.max(1, Math.floor(buffer.length / SAMPLE_COUNT));
  const peaks = Array.from({ length: SAMPLE_COUNT }, (_, bucket) => {
    const start = bucket * samplesPerBucket;
    const end = Math.min(buffer.length, start + samplesPerBucket);
    let peak = 0;
    for (let sample = start; sample < end; sample += 1) {
      for (const channel of channels) peak = Math.max(peak, Math.abs(channel[sample] ?? 0));
    }
    return peak;
  });
  const maximum = Math.max(...peaks, 0.001);
  return peaks.map((peak) => Math.sqrt(peak / maximum));
}

function loadWaveform(url: string): Promise<number[]> {
  const cached = waveformCache.get(url);
  if (cached) return cached;
  const request = decodeWaveform(url).catch(() => []);
  waveformCache.set(url, request);
  return request;
}

export function AudioWaveform({
  src,
  sourceStartMs,
  sourceEndMs,
  sourceDurationMs,
  volume = 100,
  className = '',
}: {
  src?: string;
  sourceStartMs: number;
  sourceEndMs: number;
  sourceDurationMs: number;
  volume?: number;
  className?: string;
}) {
  const [peaks, setPeaks] = useState<number[]>([]);

  useEffect(() => {
    let active = true;
    if (!src) {
      setPeaks([]);
      return;
    }
    void loadWaveform(src).then((next) => {
      if (active) setPeaks(next);
    });
    return () => { active = false; };
  }, [src]);

  const playableEndMs = Math.min(sourceEndMs, sourceDurationMs);
  const requestedDurationMs = Math.max(0, sourceEndMs - sourceStartMs);
  const playableDurationMs = Math.max(0, playableEndMs - sourceStartMs);
  const playableWidth = requestedDurationMs > 0 ? Math.min(100, playableDurationMs / requestedDurationMs * 100) : 0;

  const visiblePeaks = useMemo(() => {
    if (peaks.length === 0 || sourceDurationMs <= 0 || playableDurationMs <= 0) return [];
    const startIndex = Math.max(0, Math.floor(sourceStartMs / sourceDurationMs * peaks.length));
    const endIndex = Math.min(peaks.length, Math.max(startIndex + 1, Math.ceil(playableEndMs / sourceDurationMs * peaks.length)));
    const source = peaks.slice(startIndex, endIndex);
    const barCount = Math.min(140, source.length);
    if (barCount === 0) return [];
    return Array.from({ length: barCount }, (_, index) => {
      const from = Math.floor(index / barCount * source.length);
      const to = Math.max(from + 1, Math.ceil((index + 1) / barCount * source.length));
      return Math.max(...source.slice(from, to));
    });
  }, [peaks, playableDurationMs, playableEndMs, sourceDurationMs, sourceStartMs]);

  if (visiblePeaks.length === 0) return null;
  const gain = Math.max(0.12, Math.min(1, volume / 100));
  const points = visiblePeaks.map((peak, index) => ({
    x: visiblePeaks.length === 1 ? 0 : index / (visiblePeaks.length - 1) * 100,
    y: 19 - Math.max(1.1, peak * 16 * gain),
  }));
  const curve = points.length === 1
    ? `M 0 ${points[0].y} L 100 ${points[0].y}`
    : points.slice(1).reduce((path, point, index) => {
        const previous = points[index];
        const midpointX = (previous.x + point.x) / 2;
        const midpointY = (previous.y + point.y) / 2;
        return `${path} Q ${previous.x} ${previous.y}, ${midpointX} ${midpointY}`;
      }, `M ${points[0].x} ${points[0].y}`) + ` T 100 ${points.at(-1)?.y ?? 19}`;
  const area = `${curve} L 100 20 L 0 20 Z`;

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute overflow-hidden ${className}`} style={{ width: `${playableWidth}%` }}>
      <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="absolute inset-0 size-full">
        <path d={area} fill="currentColor" opacity="0.34" />
        <path d={curve} fill="none" stroke="currentColor" strokeWidth="1.15" strokeOpacity="0.72" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
