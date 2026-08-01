import { Check, Gauge, Settings2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { EXPORT_FPS_OPTIONS, EXPORT_QUALITY_OPTIONS, getExportDimensions, type ExportSettings } from '../editor/types';

interface ExportSettingsMenuProps {
  settings: ExportSettings;
  canvas: { width: number; height: number };
  disabled: boolean;
  onChange: (settings: ExportSettings) => void;
}

export function ExportSettingsMenu({ settings, canvas, disabled, onChange }: ExportSettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const dimensions = getExportDimensions(canvas, settings.quality);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Export settings"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className={`grid size-9 place-items-center rounded-xl border transition disabled:cursor-wait disabled:opacity-50 ${open ? 'border-selection-border bg-selection text-primary-700' : 'border-border bg-surface text-muted hover:border-primary-300 hover:bg-control-hover hover:text-primary-700'}`}
      >
        <Settings2 className="size-4" />
      </button>

      {open && (
        <div role="dialog" aria-label="Export settings" className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl shadow-ink/10">
          <header className="flex items-center gap-2 border-b border-border px-3.5 py-3">
            <span className="grid size-8 place-items-center rounded-xl bg-primary-100 text-primary-700"><Gauge className="size-4" /></span>
            <div><h2 className="text-xs font-semibold">Output settings</h2><p className="text-[10px] text-muted">{dimensions.width} × {dimensions.height} · {settings.fps} FPS</p></div>
          </header>

          <div className="space-y-4 p-3.5">
            <fieldset>
              <legend className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted">Quality</legend>
              <div className="grid grid-cols-2 gap-1.5">
                {EXPORT_QUALITY_OPTIONS.map((option) => {
                  const selected = option.value === settings.quality;
                  const size = getExportDimensions(canvas, option.value);
                  return <button key={option.value} type="button" onClick={() => onChange({ ...settings, quality: option.value })} className={`flex items-center rounded-xl border px-2.5 py-2 text-left transition ${selected ? 'border-selection-border bg-selection' : 'border-border bg-control hover:border-primary-200'}`}><span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold">{option.label}</span><span className="block text-[9px] text-muted">{size.width} × {size.height}</span></span>{selected && <Check className="size-3.5 shrink-0 text-primary-600" />}</button>;
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted">Frame rate</legend>
              <div className="grid grid-cols-4 gap-1.5">
                {EXPORT_FPS_OPTIONS.map((fps) => <button key={fps} type="button" onClick={() => onChange({ ...settings, fps })} className={`rounded-xl border py-2 text-[10px] font-semibold transition ${settings.fps === fps ? 'border-selection-border bg-primary-500 text-on-primary' : 'border-border bg-control text-muted hover:border-primary-200'}`}>{fps}<span className="ml-0.5 text-[9px] opacity-75">fps</span></button>)}
              </div>
            </fieldset>
          </div>
        </div>
      )}
    </div>
  );
}
