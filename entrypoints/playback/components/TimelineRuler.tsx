interface TimelineRulerProps {
  currentTimeMs: number;
  timelineDurationMs: number;
  preciseTicks: boolean;
}

function timeLabel(milliseconds: number): string {
  const totalSeconds = Math.max(0, milliseconds) / 1_000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds.toFixed(1)}s`;
  return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
}

export function TimelineRuler({ currentTimeMs, timelineDurationMs, preciseTicks }: TimelineRulerProps) {
  const tickTimes = preciseTicks
    ? Array.from({ length: Math.floor(timelineDurationMs / 500) + 1 }, (_, index) => index * 500)
    : [0, timelineDurationMs * 0.25, timelineDurationMs * 0.5, timelineDurationMs * 0.75, timelineDurationMs];

  return (
    <div className="sticky top-0 z-40 h-6 shrink-0 border-b border-border/70 bg-cream-100 font-mono text-[8px] text-muted">
      {tickTimes.map((timeMs, index) => (
        <span
          key={`${timeMs}-${index}`}
          className="pointer-events-none absolute bottom-1 -translate-x-1/2 whitespace-nowrap border-l border-border/80 pl-1 tabular-nums first:translate-x-0"
          style={{ left: `${timeMs / timelineDurationMs * 100}%` }}
        >
          {preciseTicks ? timeLabel(timeMs) : index === 0 ? '00:00' : timeLabel(timeMs)}
        </span>
      ))}
      <button
        type="button"
        aria-label="Drag timeline playhead"
        title="Drag playhead"
        className="group absolute inset-y-0 z-50 w-10 -translate-x-1/2 cursor-ew-resize touch-none"
        style={{ left: `${Math.min(100, currentTimeMs / timelineDurationMs * 100)}%` }}
      >
        <span className="pointer-events-none absolute bottom-0 left-1/2 size-4 -translate-x-1/2 translate-y-1/2 rotate-45 rounded-[4px] bg-accent-500 shadow-[0_1px_4px_rgba(24,50,74,.28)] ring-2 ring-white transition-transform group-active:scale-110" />
      </button>
    </div>
  );
}
