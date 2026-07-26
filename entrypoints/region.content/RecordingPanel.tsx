import { ChevronLeft, ChevronRight, GripVertical, Pause, Play, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatDuration } from '../shared/recording/media';
import type { RecorderCommand, RecordingSessionState } from '../shared/recording/types';

interface RecordingPanelProps {
  sessionId: string;
  state: RecordingSessionState;
  onCommand: (command: RecorderCommand) => void;
}

interface Position {
  x: number;
  y: number;
}

const PANEL_MARGIN = 16;

export function RecordingPanel({ sessionId, state, onCommand }: RecordingPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState<Position>();

  useEffect(() => {
    setCollapsed(false);
    setPosition(undefined);
  }, [sessionId]);

  const startDragging = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || !panelRef.current) return;
    const bounds = panelRef.current.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const drag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const active = dragRef.current;
    const panel = panelRef.current;
    if (!active || active.pointerId !== event.pointerId || !panel) return;
    const x = Math.max(PANEL_MARGIN, Math.min(event.clientX - active.offsetX, window.innerWidth - panel.offsetWidth - PANEL_MARGIN));
    const y = Math.max(PANEL_MARGIN, Math.min(event.clientY - active.offsetY, window.innerHeight - panel.offsetHeight - PANEL_MARGIN));
    setPosition({ x, y });
  };

  const stopDragging = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const paused = state.status === 'paused';
  const saving = state.status === 'saving';
  const disabled = saving || state.status === 'choosing';

  return (
    <div
      ref={panelRef}
      className="pointer-events-auto fixed z-[2147483647] flex items-center overflow-hidden rounded-2xl border border-border bg-surface text-ink shadow-2xl shadow-ink/25"
      style={position ? { left: position.x, top: position.y } : { right: PANEL_MARGIN, bottom: PANEL_MARGIN }}
    >
      <button
        type="button"
        aria-label="Move recording controls"
        className="grid h-12 w-7 cursor-grab touch-none place-items-center text-muted hover:bg-cream-100 active:cursor-grabbing"
        onPointerDown={startDragging}
        onPointerMove={drag}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      >
        <GripVertical className="size-4" />
      </button>

      <div className="flex h-12 items-center gap-2 border-l border-border px-2">
        <span className={`size-2 shrink-0 rounded-full ${paused ? 'bg-warning' : saving ? 'bg-primary-500' : 'animate-pulse bg-accent-500'}`} />
        {!collapsed && (
          <span className="min-w-16 font-mono text-sm font-semibold tabular-nums">
            {saving ? 'Saving…' : formatDuration(state.elapsedMs)}
          </span>
        )}

        {!collapsed && (
          <>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onCommand(paused ? 'resume' : 'pause')}
              aria-label={paused ? 'Continue recording' : 'Pause recording'}
              className="grid size-8 place-items-center rounded-lg bg-primary-100 text-primary-700 transition hover:bg-primary-200 disabled:opacity-40"
            >
              {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onCommand('stop')}
              aria-label="Stop recording"
              className="grid size-8 place-items-center rounded-lg bg-accent-500 text-white transition hover:bg-accent-600 disabled:opacity-40"
            >
              <Square className="size-3.5 fill-current" />
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          aria-label={collapsed ? 'Show recording controls' : 'Hide recording controls'}
          className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-cream-100 hover:text-ink"
        >
          {collapsed ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
      </div>
    </div>
  );
}
