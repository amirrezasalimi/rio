import { Check, Image, LoaderCircle, Search, SlidersHorizontal, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEditorStore } from '../editor/store';
import { getBackgroundCss, getNoiseStyle, GRADIENT_PALETTES, GRADIENT_VARIANTS, MESH_VARIANTS, RADIANT_VARIANTS, type BackgroundType, type NoiseType } from '../editor/types';
import { EditorRange } from './EditorRange';
import { MeshEditorModal } from './MeshEditorModal';

interface UnsplashPhoto {
  id: string;
  alt_description: string | null;
  urls: { small: string; regular: string };
  user: { name: string; links: { html: string } };
  links: { download_location: string };
}

const BACKGROUND_TYPES: Array<{ value: BackgroundType; label: string }> = [
  { value: 'transparent', label: 'None' }, { value: 'solid', label: 'Solid' },
  { value: 'gradient', label: 'Gradient' }, { value: 'radiant', label: 'Radiant' },
  { value: 'mesh', label: 'Mesh' }, { value: 'image', label: 'Image' },
];
const NOISE_TYPES: Array<{ value: NoiseType; label: string }> = [
  { value: 'grain', label: 'Grain' }, { value: 'paper', label: 'Paper' },
  { value: 'dots', label: 'Dots' }, { value: 'scanlines', label: 'Lines' },
];
const CATEGORIES = ['Nature', 'Architecture', 'Minimal', 'Texture', 'Workspace', 'Travel'];
const UNSPLASH_ACCESS_KEY = import.meta.env.WXT_PUBLIC_UNSPLASH_ACCESS_KEY?.trim() ?? '';

function UnsplashExplorer({ anchor, onClose, onSelect }: { anchor: DOMRect; onClose: () => void; onSelect: (photo: UnsplashPhoto) => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('minimal workspace');
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const search = async (term = query) => {
    if (!UNSPLASH_ACCESS_KEY) return setError('Unsplash is not configured for this build.');
    setLoading(true); setError(undefined);
    try {
      const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(term)}&orientation=landscape&per_page=18`, { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } });
      if (!response.ok) throw new Error(response.status === 401 ? 'The configured access key was not accepted.' : 'Unsplash search failed.');
      setPhotos((await response.json() as { results: UnsplashPhoto[] }).results);
    } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Could not reach Unsplash.'); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    const close = (event: KeyboardEvent | PointerEvent) => {
      if (event instanceof KeyboardEvent && event.key === 'Escape') onClose();
      if (event instanceof PointerEvent && !panelRef.current?.contains(event.target as Node)) onClose();
    };
    window.addEventListener('keydown', close); window.addEventListener('pointerdown', close);
    if (UNSPLASH_ACCESS_KEY) void search();
    return () => { window.removeEventListener('keydown', close); window.removeEventListener('pointerdown', close); };
  }, []);
  const top = Math.max(12, Math.min(anchor.top - 80, window.innerHeight - 620));
  return <div ref={panelRef} role="dialog" aria-label="Unsplash explorer" className="fixed z-[100] flex h-[min(610px,calc(100vh-24px))] w-[min(620px,calc(100vw-340px))] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-ink/20" style={{ left: Math.min(anchor.right + 10, window.innerWidth - 630), top }} onPointerDown={(event) => event.stopPropagation()}>
    <header className="flex items-center justify-between border-b border-border px-4 py-3"><div><h3 className="text-sm font-semibold">Unsplash explorer</h3><p className="text-[10px] text-muted">Search without leaving your canvas.</p></div><button type="button" aria-label="Close Unsplash explorer" onClick={onClose} className="rounded-lg p-2 hover:bg-cream-100"><X className="size-4" /></button></header>
    <div className="border-b border-border p-3"><div className="flex gap-2"><label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-cream-50 px-3 focus-within:border-primary-300"><Search className="size-3.5 text-muted" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void search(); }} placeholder="Search photos" className="min-w-0 flex-1 bg-transparent py-2 text-xs outline-none" /></label><button type="button" onClick={() => void search()} className="rounded-xl bg-primary-500 px-4 text-xs font-semibold text-white">Search</button></div><div className="mt-2 flex flex-wrap gap-1.5">{CATEGORIES.map((category) => <button type="button" key={category} onClick={() => { setQuery(category); void search(category); }} className="rounded-full border border-border px-2 py-1 text-[9px] text-muted hover:border-primary-300">{category}</button>)}</div>{error && <p role="alert" className="mt-2 text-[10px] text-danger">{error}</p>}</div>
    <div className="min-h-52 flex-1 overflow-y-auto p-3">{loading ? <div className="grid h-full place-items-center"><LoaderCircle className="size-5 animate-spin text-primary-500" /></div> : <div className="grid grid-cols-3 gap-2">{photos.map((photo) => <button type="button" key={photo.id} onClick={() => onSelect(photo)} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-cream-100"><img src={photo.urls.small} alt={photo.alt_description ?? ''} className="size-full object-cover transition duration-300 group-hover:scale-105" /><span className="absolute inset-x-0 bottom-0 truncate bg-ink/65 px-2 py-1 text-left text-[8px] text-white">{photo.user.name}</span></button>)}</div>}</div>
    <footer className="border-t border-border px-4 py-2 text-[9px] text-muted">Photos by <a href="https://unsplash.com/?utm_source=rio_recorder&utm_medium=referral" target="_blank" rel="noreferrer" className="font-semibold text-primary-700">Unsplash</a> · Escape closes</footer>
  </div>;
}

export function BackgroundPanel() {
  const background = useEditorStore((state) => state.background);
  const update = useEditorStore((state) => state.updateBackground);
  const [unsplashAnchor, setUnsplashAnchor] = useState<DOMRect>();
  const [meshOpen, setMeshOpen] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const unsplashButtonRef = useRef<HTMLButtonElement>(null);
  const variants = background.type === 'mesh' ? MESH_VARIANTS : background.type === 'radiant' ? RADIANT_VARIANTS : GRADIENT_VARIANTS;
  const upload = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update({ type: 'image', imageUrl: String(reader.result), imageCredit: 'Custom photo', imageCreditUrl: undefined });
    reader.readAsDataURL(file);
  };
  const selectUnsplash = (photo: UnsplashPhoto) => {
    update({ type: 'image', imageUrl: photo.urls.regular, imageCredit: photo.user.name, imageCreditUrl: `${photo.user.links.html}?utm_source=rio_recorder&utm_medium=referral` });
    void fetch(photo.links.download_location, { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } });
    setUnsplashAnchor(undefined);
  };
  const setPalette = (palette: readonly string[]) => update({ colorA: palette[0], colorB: palette[1], colorC: palette[2], colorD: palette[3], meshPoints: background.meshPoints.map((point, index) => ({ ...point, color: palette[index % palette.length] })) });

  return <div className="space-y-3">
    <div className="grid grid-cols-3 gap-1.5">{BACKGROUND_TYPES.map((type) => <button type="button" key={type.value} onClick={() => update({ type: type.value })} className={`overflow-hidden rounded-xl border p-1.5 text-left transition ${background.type === type.value ? 'border-primary-400 bg-primary-50' : 'border-border bg-cream-50 hover:border-primary-200'}`}><span className="mb-1 block h-8 rounded-lg border border-white/80" style={{ background: type.value === 'transparent' ? 'linear-gradient(45deg,#fff 25%,#dff1ff 25% 50%,#fff 50% 75%,#dff1ff 75%) 0 0/10px 10px' : type.value === 'solid' ? background.colorA : type.value === 'image' && background.imageUrl ? `url(${background.imageUrl}) center/cover` : getBackgroundCss({ ...background, type: type.value === 'image' ? 'gradient' : type.value }) }} /><span className="flex items-center justify-between px-0.5 text-[9px] font-semibold text-muted">{type.label}{background.type === type.value && <Check className="size-3 text-primary-600" />}</span></button>)}</div>
    {background.type === 'solid' && <label className="flex items-center justify-between rounded-xl border border-border bg-cream-50 p-2.5 text-[10px] text-muted">Canvas color <span className="flex items-center gap-2 font-mono text-ink"><input type="color" value={background.colorA} onChange={(event) => update({ colorA: event.target.value })} className="size-7 cursor-pointer rounded-lg border-0 bg-transparent" />{background.colorA}</span></label>}
    {(background.type === 'gradient' || background.type === 'radiant' || background.type === 'mesh') && <><div><p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted">Color stories</p><div className="grid grid-cols-5 gap-1.5">{GRADIENT_PALETTES.map((palette, index) => <button type="button" key={index} aria-label={`Color preset ${index + 1}`} onClick={() => setPalette(palette)} className="h-8 rounded-lg border-2 border-surface shadow-sm hover:border-primary-300" style={{ background: `linear-gradient(135deg,${palette.join(',')})` }} />)}</div></div><div className="grid grid-cols-5 gap-1.5">{variants.map((variant) => <button type="button" key={variant.id} title={variant.label} onClick={() => update({ variant: variant.id, meshMode: background.type === "mesh" ? "preset" : background.meshMode })} className={`relative aspect-square rounded-xl border-2 ${background.variant === variant.id ? 'border-primary-500' : 'border-surface hover:border-primary-200'}`} style={{ background: variant.preview(background.colorA, background.colorB) }}>{background.variant === variant.id && <Check className="absolute bottom-1 right-1 size-3 rounded-full bg-surface p-0.5 text-primary-600" />}</button>)}</div>{background.type === 'mesh' && <button type="button" onClick={() => { update({ meshMode: "custom" }); setMeshOpen(true); }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-[10px] font-semibold text-white"><SlidersHorizontal className="size-3.5" /> Open mesh studio</button>}</>}
    {background.type === 'image' && <div className="space-y-2"><div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-cream-100" style={{ background: background.imageUrl ? `url(${background.imageUrl}) center/cover` : getBackgroundCss({ ...background, type: 'gradient' }) }}>{!background.imageUrl && <div className="grid size-full place-items-center text-[10px] text-muted"><Image className="size-5" />Choose a photo</div>}</div><div className="grid grid-cols-2 gap-1.5"><button ref={unsplashButtonRef} type="button" onClick={() => { const rect = unsplashButtonRef.current?.getBoundingClientRect(); if (rect) setUnsplashAnchor(rect); }} className="flex items-center justify-center gap-1.5 rounded-xl bg-ink py-2 text-[10px] font-semibold text-white"><Search className="size-3" /> Unsplash</button><button type="button" onClick={() => uploadRef.current?.click()} className="flex items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-[10px] font-semibold"><Upload className="size-3" /> Custom</button></div><input ref={uploadRef} type="file" accept="image/*" onChange={(event) => upload(event.target.files?.[0])} className="hidden" />{background.imageUrl && <><EditorRange label="Photo size" value={background.scale} min={100} max={220} suffix="%" onChange={(scale) => update({ scale })} /><div className="grid grid-cols-2 gap-2"><EditorRange label="Horizontal" value={background.positionX} min={0} max={100} suffix="%" onChange={(positionX) => update({ positionX })} /><EditorRange label="Vertical" value={background.positionY} min={0} max={100} suffix="%" onChange={(positionY) => update({ positionY })} /></div></>}</div>}
    <div className="border-t border-border pt-3"><p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted">Texture</p><div className="grid grid-cols-4 gap-1.5">{NOISE_TYPES.map((noise) => <button key={noise.value} type="button" onClick={() => update({ noiseType: noise.value, noise: Math.max(background.noise, 12) })} className={`rounded-xl border p-1.5 ${background.noiseType === noise.value && background.noise > 0 ? 'border-primary-400 bg-primary-50' : 'border-border'}`}><span className="block h-7 rounded-lg bg-primary-200" style={getNoiseStyle(noise.value)} /><span className="mt-1 block text-[8px] font-semibold text-muted">{noise.label}</span></button>)}</div><div className="mt-3 grid grid-cols-2 gap-2"><EditorRange label="Noise opacity" value={background.noise} min={0} max={40} suffix="%" onChange={(noise) => update({ noise })} /><EditorRange label="Blur" value={background.blur} min={0} max={40} suffix="px" onChange={(blur) => update({ blur })} /></div></div>
    {unsplashAnchor && <UnsplashExplorer anchor={unsplashAnchor} onClose={() => setUnsplashAnchor(undefined)} onSelect={selectUnsplash} />}
    {meshOpen && createPortal(<MeshEditorModal onClose={() => setMeshOpen(false)} />, document.body)}
  </div>;
}
