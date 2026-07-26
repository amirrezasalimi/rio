import { Check, ChevronDown, Download, Film, Image } from 'lucide-react';
import { useState } from 'react';
import type { ExportFormat } from '../editor/types';

const FORMATS: Array<{ value: ExportFormat; label: string; detail: string; icon: typeof Film }> = [
  { value: 'webm', label: 'WebM', detail: 'Best quality', icon: Film },
  { value: 'mp4', label: 'MP4', detail: 'Most compatible', icon: Film },
  { value: 'gif', label: 'GIF', detail: 'Easy to share', icon: Image },
];

export function ExportMenu({ format, busy, progress, onFormatChange, onExport }: {
  format: ExportFormat;
  busy: boolean;
  progress: number;
  onFormatChange: (format: ExportFormat) => void;
  onExport: () => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = FORMATS.find((item) => item.value === format) ?? FORMATS[0];

  return (
    <div className="relative flex">
      <button
        type="button"
        disabled={busy}
        onClick={onExport}
        className="relative flex min-w-32 items-center justify-center gap-2 overflow-hidden rounded-l-xl bg-primary-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary-600 disabled:cursor-wait"
      >
        {busy && <span className="absolute inset-y-0 left-0 bg-primary-700/35 transition-[width]" style={{ width: `${progress * 100}%` }} />}
        <Download className="relative size-3.5" />
        <span className="relative">{busy ? `${Math.round(progress * 100)}%` : `Export ${selected.label}`}</span>
      </button>
      <button
        type="button"
        aria-label="Choose export format"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
        className="rounded-r-xl border-l border-white/20 bg-primary-500 px-2 text-white hover:bg-primary-600 disabled:cursor-wait"
      >
        <ChevronDown className="size-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-border bg-surface p-1.5 shadow-xl shadow-ink/10">
          {FORMATS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => { onFormatChange(item.value); setOpen(false); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-cream-100"
              >
                <Icon className="size-4 text-primary-600" />
                <span className="flex-1"><span className="block text-xs font-semibold">{item.label}</span><span className="block text-[10px] text-muted">{item.detail}</span></span>
                {format === item.value && <Check className="size-3.5 text-primary-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
