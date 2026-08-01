import { ChevronDown, type LucideIcon } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

interface InspectorSectionProps {
  icon: LucideIcon;
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function InspectorSection({
  icon: Icon,
  title,
  summary,
  defaultOpen = false,
  children,
}: InspectorSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section className="border-b border-border last:border-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((current) => !current)}
        className="group flex w-full items-center gap-2.5 px-4 py-3 text-left transition hover:bg-control focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-400"
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-selection text-primary-700 transition group-hover:bg-primary-100">
          <Icon className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold text-ink">{title}</span>
          {!open && summary && <span className="mt-0.5 block truncate text-[9px] text-muted">{summary}</span>}
        </span>
        <ChevronDown className={`size-3.5 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div id={contentId} className="px-4 pb-4">{children}</div>}
    </section>
  );
}
