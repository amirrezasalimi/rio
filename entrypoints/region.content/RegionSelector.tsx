import { Check, Move, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CropArea } from '../shared/recording/types';

interface RegionSelectorProps {
  onComplete: (area: CropArea | null) => void;
}

interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Interaction =
  | { type: 'draw'; x: number; y: number }
  | { type: 'move'; x: number; y: number; initial: Selection }
  | { type: 'resize'; corner: 'nw' | 'ne' | 'sw' | 'se'; x: number; y: number; initial: Selection };

const MIN_SIZE = 24;

export function RegionSelector({ onComplete }: RegionSelectorProps) {
  const interactionRef = useRef<Interaction | null>(null);
  const [selection, setSelection] = useState<Selection>();

  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onComplete(null);
    };
    document.addEventListener('keydown', cancel, true);
    return () => document.removeEventListener('keydown', cancel, true);
  }, [onComplete]);

  const startDrawing = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.target !== event.currentTarget) return;
    interactionRef.current = { type: 'draw', x: event.clientX, y: event.clientY };
    setSelection({ x: event.clientX, y: event.clientY, width: 0, height: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const startMoving = (event: React.PointerEvent) => {
    if (!selection || event.button !== 0) return;
    event.stopPropagation();
    interactionRef.current = {
      type: 'move',
      x: event.clientX,
      y: event.clientY,
      initial: selection,
    };
    event.currentTarget.closest<HTMLElement>('[data-selector]')?.setPointerCapture(event.pointerId);
  };

  const startResizing = (event: React.PointerEvent, corner: 'nw' | 'ne' | 'sw' | 'se') => {
    if (!selection || event.button !== 0) return;
    event.stopPropagation();
    interactionRef.current = {
      type: 'resize',
      corner,
      x: event.clientX,
      y: event.clientY,
      initial: selection,
    };
    event.currentTarget.closest<HTMLElement>('[data-selector]')?.setPointerCapture(event.pointerId);
  };

  const updateSelection = (event: React.PointerEvent<HTMLDivElement>) => {
    const interaction = interactionRef.current;
    if (!interaction) return;
    const x = Math.max(0, Math.min(event.clientX, window.innerWidth));
    const y = Math.max(0, Math.min(event.clientY, window.innerHeight));

    if (interaction.type === 'draw') {
      setSelection({
        x: Math.min(interaction.x, x),
        y: Math.min(interaction.y, y),
        width: Math.abs(x - interaction.x),
        height: Math.abs(y - interaction.y),
      });
      return;
    }

    if (interaction.type === 'move') {
      setSelection({
        ...interaction.initial,
        x: Math.max(0, Math.min(interaction.initial.x + x - interaction.x, window.innerWidth - interaction.initial.width)),
        y: Math.max(0, Math.min(interaction.initial.y + y - interaction.y, window.innerHeight - interaction.initial.height)),
      });
      return;
    }

    const { corner, initial } = interaction;
    const left = corner.endsWith('w') ? Math.max(0, Math.min(x, initial.x + initial.width - MIN_SIZE)) : initial.x;
    const right = corner.endsWith('e') ? Math.min(window.innerWidth, Math.max(x, initial.x + MIN_SIZE)) : initial.x + initial.width;
    const top = corner.startsWith('n') ? Math.max(0, Math.min(y, initial.y + initial.height - MIN_SIZE)) : initial.y;
    const bottom = corner.startsWith('s') ? Math.min(window.innerHeight, Math.max(y, initial.y + MIN_SIZE)) : initial.y + initial.height;
    setSelection({ x: left, y: top, width: right - left, height: bottom - top });
  };

  const finishInteraction = (event: React.PointerEvent<HTMLDivElement>) => {
    interactionRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const confirm = () => {
    if (!selection || selection.width < MIN_SIZE || selection.height < MIN_SIZE) return;
    onComplete({
      x: selection.x / window.innerWidth,
      y: selection.y / window.innerHeight,
      width: selection.width / window.innerWidth,
      height: selection.height / window.innerHeight,
    });
  };

  const valid = selection && selection.width >= MIN_SIZE && selection.height >= MIN_SIZE;
  const actionsBelow = !selection || selection.y + selection.height + 58 <= window.innerHeight;
  const handles = [
    ['nw', '-left-2 -top-2 cursor-nwse-resize'],
    ['ne', '-right-2 -top-2 cursor-nesw-resize'],
    ['sw', '-bottom-2 -left-2 cursor-nesw-resize'],
    ['se', '-bottom-2 -right-2 cursor-nwse-resize'],
  ] as const;

  return (
    <div
      data-selector
      className="fixed inset-0 cursor-crosshair touch-none overflow-hidden font-sans text-ink"
      onPointerDown={startDrawing}
      onPointerMove={updateSelection}
      onPointerUp={finishInteraction}
      onPointerCancel={finishInteraction}
    >
      {!selection && <div className="pointer-events-none absolute inset-0 bg-ink/15" />}
      <div className="pointer-events-none absolute left-1/2 top-5 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-surface px-4 py-3 text-sm font-semibold shadow-xl shadow-ink/20">
        <span className="size-2.5 rounded-full bg-primary-500" />
        Draw the part of this page you want to record
        <span className="ml-2 rounded-md bg-cream-100 px-2 py-1 text-[10px] font-medium text-muted">Esc to cancel</span>
      </div>

      {selection && (
        <div
          className="absolute cursor-move border-2 border-primary-300 shadow-[0_0_0_9999px_rgba(24,50,74,0.18)]"
          style={{ left: selection.x, top: selection.y, width: selection.width, height: selection.height }}
          onPointerDown={startMoving}
        >
          <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5 rounded-lg bg-ink/85 px-2.5 py-1.5 text-xs font-semibold text-white">
            <Move className="size-3" />
            {Math.round(selection.width)} × {Math.round(selection.height)}
          </div>

          {handles.map(([corner, className]) => (
            <button
              key={corner}
              type="button"
              aria-label={`Resize from ${corner} corner`}
              className={`absolute z-10 size-4 rounded-full border-2 border-white bg-primary-500 ${className}`}
              onPointerDown={(event) => startResizing(event, corner)}
            />
          ))}

          <div
            className={`absolute right-0 flex gap-2 ${actionsBelow ? '-bottom-14' : '-top-14'}`}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button type="button" onClick={() => onComplete(null)} className="flex items-center gap-1.5 rounded-xl bg-surface px-3.5 py-2.5 text-xs font-semibold text-muted shadow-lg hover:text-ink">
              <X className="size-3.5" /> Cancel
            </button>
            <button type="button" disabled={!valid} onClick={confirm} className="flex items-center gap-1.5 rounded-xl bg-primary-500 px-3.5 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-primary-600 disabled:opacity-40">
              <Check className="size-3.5" /> Record area
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
