import { Archive, ChevronRight, FilePlus2, FolderClock, FolderInput, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatDuration } from '../../shared/recording/media';
import { getRecordings, type StoredRecording } from '../../shared/recording/storage';

interface FileMenuProps {
  currentId?: string;
  busy: boolean;
  onImport: (file: File) => Promise<void>;
  onExport: () => Promise<void>;
  onDelete: () => Promise<void>;
  onError: (message: string) => void;
}

export function FileMenu({ currentId, busy, onImport, onExport, onDelete, onError }: FileMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [recentsOpen, setRecentsOpen] = useState(false);
  const [recents, setRecents] = useState<StoredRecording[]>([]);

  useEffect(() => {
    if (!open) return;
    void getRecordings().then(setRecents).catch(() => setRecents([]));
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close, true);
    window.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close, true);
      window.removeEventListener('keydown', escape);
    };
  }, [open]);

  const openNew = async () => {
    setOpen(false);
    try {
      await browser.action.openPopup();
    } catch {
      onError('Open Rio from the browser toolbar to start a new recording.');
    }
  };

  const openRecent = (id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('id', id);
    window.location.href = url.toString();
  };

  return (
    <div ref={rootRef} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold hover:bg-cream-100">File</button>
      <input ref={inputRef} type="file" accept=".zip,application/zip" className="hidden" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file) { setOpen(false); void onImport(file); } }} />
      {open && (
        <div role="menu" className="absolute left-0 top-full z-[100] mt-2 w-64 rounded-xl border border-border bg-surface p-1.5 shadow-xl shadow-ink/15">
          <button type="button" role="menuitem" onClick={() => void openNew()} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold hover:bg-cream-100"><FilePlus2 className="size-4 text-primary-600" /> New</button>
          <div className="relative" onPointerEnter={() => setRecentsOpen(true)} onPointerLeave={() => setRecentsOpen(false)}>
            <button type="button" role="menuitem" aria-haspopup="menu" aria-expanded={recentsOpen} onClick={() => setRecentsOpen((value) => !value)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold hover:bg-cream-100"><FolderClock className="size-4 text-primary-600" /> <span className="flex-1">Recents</span><ChevronRight className="size-3.5" /></button>
            {recentsOpen && <div role="menu" className="absolute left-[calc(100%-4px)] top-0 w-72 rounded-xl border border-border bg-surface p-1.5 shadow-xl shadow-ink/15">
              {recents.length === 0 ? <p className="px-3 py-4 text-center text-[10px] text-muted">No recent projects</p> : recents.slice(0, 12).map((item) => <button type="button" role="menuitem" key={item.id} onClick={() => openRecent(item.id)} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-cream-100 ${item.id === currentId ? 'bg-primary-50' : ''}`}><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-semibold">Recording {new Date(item.createdAt).toLocaleString()}</span><span className="block text-[9px] text-muted">{formatDuration(item.durationMs)}</span></span>{item.id === currentId && <span className="text-[8px] font-semibold text-primary-700">Open</span>}</button>)}</div>}
          </div>
          <button type="button" role="menuitem" disabled={busy} onClick={() => inputRef.current?.click()} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold hover:bg-cream-100 disabled:opacity-40"><FolderInput className="size-4 text-primary-600" /> Import…</button>
          <button type="button" role="menuitem" disabled={!currentId || busy} onClick={() => { setOpen(false); void onExport(); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold hover:bg-cream-100 disabled:opacity-40"><Archive className="size-4 text-primary-600" /> Export current as ZIP</button>
          <div className="my-1 h-px bg-border" />
          <button type="button" role="menuitem" disabled={!currentId || busy} onClick={() => { if (window.confirm('Delete this project, its original recording, and all imported media? This cannot be undone.')) { setOpen(false); void onDelete(); } }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold text-danger hover:bg-accent-50 disabled:opacity-40"><Trash2 className="size-4" /> Delete current</button>
        </div>
      )}
    </div>
  );
}
