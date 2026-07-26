import { Copy, Download, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface MenuPosition { x: number; y: number; }

export function ClipContextMenu({ label, onOpen, onDuplicate, onDelete, onDownload }: { label: string; onOpen: () => void; onDuplicate: () => void; onDelete: () => void; onDownload?: () => void }) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<MenuPosition>();

  useEffect(() => {
    const anchor = anchorRef.current?.parentElement;
    if (!anchor) return;
    const open = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onOpen();
      setPosition({ x: Math.min(event.clientX, window.innerWidth - (onDownload ? 220 : 152)), y: Math.min(event.clientY, window.innerHeight - (onDownload ? 128 : 96)) });
    };
    anchor.addEventListener('contextmenu', open);
    return () => anchor.removeEventListener('contextmenu', open);
  }, [onOpen]);

  useEffect(() => {
    if (!position) return;
    const closeOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setPosition(undefined);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPosition(undefined);
    };
    document.addEventListener('pointerdown', closeOutside, true);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside, true);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [position]);

  const run = (action: () => void) => {
    action();
    setPosition(undefined);
  };

  return <>
    <span ref={anchorRef} className="hidden" />
    {position && createPortal(
      <div ref={menuRef} role="menu" aria-label={`${label} actions`} onContextMenu={(event) => event.preventDefault()} className="fixed z-[100] min-w-36 rounded-xl border border-border bg-surface p-1 shadow-xl shadow-ink/15" style={{ left: position.x, top: position.y }}>
        {onDownload && <button type="button" role="menuitem" onClick={() => run(onDownload)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[10px] font-semibold hover:bg-primary-50"><Download className="size-3.5 text-primary-600" /> Download original quality</button>}
        <button type="button" role="menuitem" onClick={() => run(onDuplicate)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[10px] font-semibold hover:bg-primary-50"><Copy className="size-3.5 text-primary-600" /> Duplicate</button>
        <button type="button" role="menuitem" onClick={() => run(onDelete)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[10px] font-semibold text-danger hover:bg-accent-50"><Trash2 className="size-3.5" /> Delete</button>
      </div>,
      document.body,
    )}
  </>;
}
