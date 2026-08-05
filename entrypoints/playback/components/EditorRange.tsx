import { useId, type CSSProperties } from 'react';

import { useHistoryStore } from '../editor/history';

interface EditorRangeProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  className?: string;
  resetValue?: number;
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
  resetValue,
  onChange,
  onInteractionStart,
  onInteractionEnd,
}: EditorRangeProps) {
  const inputId = useId();
  const displayValue = `${Math.round(value * 100) / 100}${suffix}`;
  const progress = Math.max(
    0,
    Math.min(100, ((value - min) / Math.max(1, max - min)) * 100),
  );

  return (
    <div className={`block ${className}`}>
      <div className="mb-1 flex justify-between text-[10px] text-muted">
        <label htmlFor={inputId}>{label}</label>
        {resetValue === undefined ? (
          <span className="font-mono text-ink">{displayValue}</span>
        ) : (
          <button
            type="button"
            aria-label={`Reset ${label.toLowerCase()} to ${resetValue}${suffix}`}
            title={`Reset to ${resetValue}${suffix}`}
            onClick={() => {
              if (value === resetValue) return;
              useHistoryStore.getState().record(`Reset ${label.toLowerCase()}`);
              onChange(resetValue);
            }}
            className="rounded px-1 font-mono text-ink transition hover:bg-control-hover hover:text-primary-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary-500"
          >
            {displayValue}
          </button>
        )}
      </div>
      <input
        id={inputId}
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
    </div>
  );
}
