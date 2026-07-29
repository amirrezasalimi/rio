import { History, Redo2, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { jumpToHistory, useHistoryStore } from '../editor/history';

export function HistoryMenu() {
  const [open, setOpen] = useState(false);
  const past = useHistoryStore((state) => state.past);
  const future = useHistoryStore((state) => state.future);
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;
  
  const undo = () => useHistoryStore.getState().undo();
  const redo = () => useHistoryStore.getState().redo();

  return (
    <div className="relative flex items-center">
      <div className="flex items-center rounded-lg border border-border bg-surface shadow-sm">
        <button
          type="button"
          disabled={!canUndo}
          onClick={undo}
          title={`Undo${past.length > 0 ? ` ${past[past.length - 1].label}` : ''} (Cmd/Ctrl+Z)`}
          className="flex items-center justify-center rounded-l-md px-2 py-1.5 text-ink hover:bg-cream-100 disabled:opacity-30"
        >
          <Undo2 className="size-3.5" />
        </button>
        <div className="h-4 w-px bg-border" />
        <button
          type="button"
          disabled={!canRedo}
          onClick={redo}
          title={`Redo${future.length > 0 ? ` ${future[0].label}` : ''} (Cmd/Ctrl+Shift+Z)`}
          className="flex items-center justify-center px-2 py-1.5 text-ink hover:bg-cream-100 disabled:opacity-30"
        >
          <Redo2 className="size-3.5" />
        </button>
        <div className="h-4 w-px bg-border" />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          title="History"
          className={`flex items-center justify-center rounded-r-md px-2 py-1.5 hover:bg-cream-100 ${open ? 'bg-cream-100 text-primary-600' : 'text-ink'}`}
        >
          <History className="size-3.5" />
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onPointerDown={() => setOpen(false)} />
          <div className="absolute right-0 top-[120%] z-50 flex max-h-96 w-64 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-ink/20">
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
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[10px] text-muted hover:bg-cream-100"
                >
                  <span className="truncate">{entry.label}</span>
                </button>
              ))}
              
              <div className="flex w-full items-center gap-2 rounded-lg bg-primary-50 px-2 py-1.5 text-left text-[10px] font-semibold text-primary-700">
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
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[10px] text-muted hover:bg-cream-100"
                >
                  <span className="truncate">{entry.label}</span>
                </button>
              ))}
              {past.length === 0 && future.length === 0 && (
                <div className="px-2 py-3 text-center text-[10px] text-muted">No history yet</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
