import { ChevronDown, type LucideIcon } from 'lucide-react';
import { createContext, useContext, useId, useState, type ReactNode } from 'react';

interface InspectorSearchState {
  query: string;
  matchCount: number;
}

const InspectorSearchContext = createContext<InspectorSearchState>({ query: '', matchCount: 0 });

export function InspectorSearchProvider({ query, matchCount, children }: { query: string; matchCount: number; children: ReactNode }) {
  return <InspectorSearchContext.Provider value={{ query: query.trim().toLocaleLowerCase(), matchCount }}>{children}</InspectorSearchContext.Provider>;
}

interface InspectorSectionProps {
  icon: LucideIcon;
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  searchTerms?: string;
  children: ReactNode;
}

export function InspectorSection({
  icon: Icon,
  title,
  summary,
  defaultOpen = false,
  searchTerms,
  children,
}: InspectorSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  const { query, matchCount } = useContext(InspectorSearchContext);
  const searchableText = `${title} ${summary ?? ''} ${searchTerms ?? ''}`.toLocaleLowerCase();
  const expanded = open || Boolean(query && matchCount === 1);

  if (query && !searchableText.includes(query)) return null;

  return (
    <section className="border-b border-border last:border-0">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setOpen((current) => !current)}
        className="group flex w-full items-center gap-2.5 px-4 py-3 text-left transition hover:bg-control focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-400"
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-selection text-primary-700 transition group-hover:bg-primary-100">
          <Icon className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold text-ink">{title}</span>
          {!expanded && summary && <span className="mt-0.5 block truncate text-[9px] text-muted">{summary}</span>}
        </span>
        <ChevronDown className={`size-3.5 shrink-0 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && <div id={contentId} className="px-4 pb-4">{children}</div>}
    </section>
  );
}
