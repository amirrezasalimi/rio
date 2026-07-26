import type { CSSProperties } from 'react';

interface EditorRangeProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  className?: string;
  onChange: (value: number) => void;
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
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      />
    </label>
  );
}
