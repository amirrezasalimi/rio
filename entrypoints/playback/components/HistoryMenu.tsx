import { History, Redo2, Undo2 } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { jumpToHistory, useHistoryStore } from '../editor/history';

interface PopoverPosition {
  left: number;
  top: number;
  maxHeight: number;
}

const VIEWPORT_MARGIN = 12;
const POPOVER_GAP = 8;

export function HistoryMenu() {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition>({
    left: VIEWPORT_MARGIN,
    top: VIEWPORT_MARGIN,
    maxHeight: 384,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const past = useHistoryStore((state) => state.past);
  const future = useHistoryStore((state) => state.future);
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;
  
  const undo = () => useHistoryStore.getState().undo();
  const redo = () => useHistoryStore.getState().redo();

  useLayoutEffect(() => {
    if (!open) return;

    const positionPopover = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      if (!trigger) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = popoverRef.current?.offsetWidth ?? Math.min(256, viewportWidth - VIEWPORT_MARGIN * 2);
      const height = popoverRef.current?.offsetHeight ?? 384;
      const roomBelow = viewportHeight - trigger.bottom - POPOVER_GAP - VIEWPORT_MARGIN;
      const roomAbove = trigger.top - POPOVER_GAP - VIEWPORT_MARGIN;
      const openBelow = roomBelow >= Math.min(height, 160) || roomBelow >= roomAbove;
      const availableHeight = Math.max(80, openBelow ? roomBelow : roomAbove);
      const maxHeight = Math.min(384, availableHeight);
      const preferredLeft = trigger.right - width;
      const maxLeft = Math.max(VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN);
      const left = Math.max(VIEWPORT_MARGIN, Math.min(preferredLeft, maxLeft));
      const top = openBelow
        ? trigger.bottom + POPOVER_GAP
        : Math.max(VIEWPORT_MARGIN, trigger.top - POPOVER_GAP - Math.min(height, maxHeight));

      setPosition({ left, top, maxHeight });
    };

    positionPopover();
    window.addEventListener('resize', positionPopover);
    window.addEventListener('scroll', positionPopover, true);
    return () => {
      window.removeEventListener('resize', positionPopover);
      window.removeEventListener('scroll', positionPopover, true);
    };
  }, [open, past.length, future.length]);

  return (
    <div className="relative flex items-center">
      <div className="flex items-center rounded-lg border border-border bg-surface shadow-sm">
        <button
          type="button"
          disabled={!canUndo}
          onClick={undo}
          title={`Undo${past.length > 0 ? ` ${past[past.length - 1].label}` : ''} (Cmd/Ctrl+Z)`}
          className="flex items-center justify-center rounded-l-md px-2 py-1.5 text-ink hover:bg-control-hover disabled:opacity-30"
        >
          <Undo2 className="size-3.5" />
        </button>
        <div className="h-4 w-px bg-border" />
        <button
          type="button"
          disabled={!canRedo}
          onClick={redo}
          title={`Redo${future.length > 0 ? ` ${future[0].label}` : ''} (Cmd/Ctrl+Shift+Z)`}
          className="flex items-center justify-center px-2 py-1.5 text-ink hover:bg-control-hover disabled:opacity-30"
        >
          <Redo2 className="size-3.5" />
        </button>
        <div className="h-4 w-px bg-border" />
        <button
          ref={triggerRef}
          type="button"
          aria-label="History"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen(!open)}
          title="History"
          className={`flex items-center justify-center rounded-r-md px-2 py-1.5 hover:bg-control-hover ${open ? 'bg-cream-100 text-primary-600' : 'text-ink'}`}
        >
          <History className="size-3.5" />
        </button>
      </div>

      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[90]" onPointerDown={() => setOpen(false)} />
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Edit history"
            className="fixed z-[100] flex w-[min(16rem,calc(100vw-24px))] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-ink/20"
            style={{ left: position.left, top: position.top, maxHeight: position.maxHeight }}
          >
            <div className="border-b border-border px-3 py-2 text-[10px] font-semibold text-ink">
              History
            </div>
            <div className="flex-1 overflow-y-auto p-1">
              {[...future].reverse().map((entry, index) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    jumpToHistory(future.length - 1 - index, 'future');
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[10px] text-muted hover:bg-control-hover"
                >
                  <span className="truncate">{entry.label}</span>
                </button>
              ))}
              
              <div className="flex w-full items-center gap-2 rounded-lg bg-selection px-2 py-1.5 text-left text-[10px] font-semibold text-primary-700">
                <span className="truncate">Current state</span>
              </div>

              {[...past].reverse().map((entry, index) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    jumpToHistory(past.length - 1 - index, 'past');
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[10px] text-muted hover:bg-control-hover"
                >
                  <span className="truncate">{entry.label}</span>
                </button>
              ))}
              {past.length === 0 && future.length === 0 && (
                <div className="px-2 py-3 text-center text-[10px] text-muted">No history yet</div>
              )}
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
