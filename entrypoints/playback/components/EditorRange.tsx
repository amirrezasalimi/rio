import type { CSSProperties } from 'react';

import { useHistoryStore } from '../editor/history';

interface EditorRangeProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  className?: string;
  onChange: (value: number) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

export function EditorRange({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  className = '',
  onChange,
  onInteractionStart,
  onInteractionEnd,
}: EditorRangeProps) {
  const progress = Math.max(
    0,
    Math.min(100, ((value - min) / Math.max(1, max - min)) * 100),
  );

  return (
    <label className={`block ${className}`}>
      <span className="mb-1 flex justify-between text-[10px] text-muted">
        <span>{label}</span>
        <span className="font-mono text-ink">
          {Math.round(value * 100) / 100}{suffix}
        </span>
      </span>
      <input
        aria-label={label}
        className="rio-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--rio-range-progress': `${progress}%` } as CSSProperties}
        onPointerDown={() => {
          if (onInteractionStart) onInteractionStart();
          else useHistoryStore.getState().beginTransaction(`Change ${label.toLowerCase()}`);
        }}
        onPointerUp={() => {
          if (onInteractionEnd) onInteractionEnd();
          else useHistoryStore.getState().commitTransaction();
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            useHistoryStore.getState().record(`Change ${label.toLowerCase()}`);
          }
        }}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      />
    </label>
  );
}
