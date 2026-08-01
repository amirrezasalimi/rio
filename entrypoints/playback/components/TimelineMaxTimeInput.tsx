import { useEffect, useRef, useState } from 'react';

import { useHistoryStore } from '../editor/history';

export function TimelineMaxTimeInput({ valueSeconds, minimumSeconds, onCommit }: { valueSeconds: number; minimumSeconds: number; onCommit: (seconds: number) => void }) {
  const [draft, setDraft] = useState(String(valueSeconds));
  const focused = useRef(false);
  const cancelNextBlur = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(String(valueSeconds));
  }, [valueSeconds]);

  const commit = () => {
    const parsed = Number(draft);
    const next = Number.isFinite(parsed) ? Math.max(minimumSeconds, Math.round(parsed)) : valueSeconds;
    setDraft(String(next));
    if (next !== valueSeconds) {
      useHistoryStore.getState().record('Change timeline duration');
    }
    onCommit(next);
  };

  return (
    <label className="flex items-center gap-1.5 rounded-xl border border-border bg-control px-2 py-1 text-[9px] font-semibold text-muted">
      Max time
      <input
        aria-label="Timeline maximum time in seconds"
        type="number"
        min={minimumSeconds}
        step={1}
        value={draft}
        onFocus={(event) => { focused.current = true; event.currentTarget.select(); }}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={() => {
          focused.current = false;
          if (cancelNextBlur.current) { cancelNextBlur.current = false; return; }
          commit();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') { cancelNextBlur.current = true; setDraft(String(valueSeconds)); event.currentTarget.blur(); }
        }}
        className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-right font-mono text-[10px] text-ink outline-none transition focus:border-selection-border focus:ring-2 focus:ring-primary-100"
      />
      <span>s</span>
    </label>
  );
}
