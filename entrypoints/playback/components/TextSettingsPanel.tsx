import { Brush, CaseSensitive, RefreshCw, RotateCw, Square, Type } from 'lucide-react';
import { useMemo, useState } from 'react';
import { RIO_CONTENT_COLORS } from '../editor/designPresets';
import { useEditorStore } from '../editor/store';
import type { TextFill } from '../editor/types';
import { EditorRange } from './EditorRange';
import { InspectorSection } from './InspectorSection';

const SYSTEM_FONTS = ['Arial', 'Arial Black', 'Courier New', 'Georgia', 'Helvetica', 'Impact', 'Times New Roman', 'Trebuchet MS', 'Verdana'];
const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
interface LocalFontData { family: string; }
type LocalFontWindow = Window & { queryLocalFonts?: () => Promise<LocalFontData[]> };

import { useHistoryStore } from '../editor/history';

export function TextSettingsPanel() {
  const selection = useEditorStore((state) => state.selectedTimelineItem);
  const clip = useEditorStore((state) => selection?.kind === 'text' ? state.textClips.find((item) => item.id === selection.id) : undefined);
  const updateTextClip = useEditorStore((state) => state.updateTextClip);
  const [installedFonts, setInstalledFonts] = useState<string[]>([]);
  const [fontStatus, setFontStatus] = useState<string>();
  const fonts = useMemo(() => [...new Set([...SYSTEM_FONTS, ...installedFonts, clip?.fontFamily ?? ''])].filter(Boolean).sort((a, b) => a.localeCompare(b)), [clip?.fontFamily, installedFonts]);
  if (!clip) return null;

  const patchFill = (patch: Partial<TextFill>) => updateTextClip(clip.id, { fill: { ...clip.fill, ...patch } as TextFill });
  const loadInstalledFonts = async () => {
    const queryLocalFonts = (window as LocalFontWindow).queryLocalFonts;
    if (!queryLocalFonts) {
      setFontStatus('Installed font access is not supported by this browser.');
      return;
    }
    setFontStatus('Loading installed fonts…');
    try {
      const localFonts = await queryLocalFonts();
      setInstalledFonts([...new Set(localFonts.map((font) => font.family))]);
      setFontStatus(`${new Set(localFonts.map((font) => font.family)).size} font families available.`);
    } catch {
      setFontStatus('Font access was not granted. System fonts remain available.');
    }
  };

  return <>
    <InspectorSection icon={Type} title="Content" summary={clip.text || 'Empty text'} defaultOpen>
      <label className="block text-[10px] text-muted">Text<textarea aria-label="Text content" rows={3} value={clip.text} onChange={(event) => updateTextClip(clip.id, { text: event.currentTarget.value })} onBlur={() => useHistoryStore.getState().record('Change text content')} className="mt-1 w-full resize-none rounded-xl border border-border bg-control px-3 py-2 text-xs text-ink outline-none transition focus:border-selection-border focus:ring-2 focus:ring-primary-100" /></label>
    </InspectorSection>
    <InspectorSection icon={CaseSensitive} title="Typography" summary={`${clip.fontFamily} · ${clip.fontSize}px · ${clip.fontWeight}`} defaultOpen>
      <EditorRange label="Font size" value={clip.fontSize} min={8} max={240} suffix="px" onChange={(fontSize) => updateTextClip(clip.id, { fontSize })} />
      <div className="mt-3 flex items-end gap-2"><label className="min-w-0 flex-1 text-[10px] text-muted">Font family<select aria-label="Font family" value={clip.fontFamily} onChange={(event) => { useHistoryStore.getState().record('Change font family'); updateTextClip(clip.id, { fontFamily: event.currentTarget.value }); }} className="mt-1 block w-full rounded-xl border border-border bg-control px-2.5 py-2 text-[11px] text-ink outline-none focus:border-selection-border">{fonts.map((font) => <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>)}</select></label><button type="button" onClick={() => void loadInstalledFonts()} aria-label="Load installed fonts" title="Load installed fonts" className="rounded-xl border border-border bg-control p-2 text-primary-700 hover:border-primary-300"><RefreshCw className="size-3.5" /></button></div>
      {fontStatus && <p className="mt-1.5 text-[9px] leading-relaxed text-muted">{fontStatus}</p>}
      <label className="mt-3 block text-[10px] text-muted">Weight<select aria-label="Font weight" value={clip.fontWeight} onChange={(event) => { useHistoryStore.getState().record('Change font weight'); updateTextClip(clip.id, { fontWeight: Number(event.currentTarget.value) }); }} className="mt-1 block w-full rounded-xl border border-border bg-control px-2.5 py-2 text-[11px] text-ink outline-none focus:border-selection-border">{WEIGHTS.map((weight) => <option key={weight} value={weight}>{weight}{weight === 400 ? ' · Regular' : weight === 700 ? ' · Bold' : ''}</option>)}</select></label>
    </InspectorSection>
    <InspectorSection icon={RotateCw} title="Transform" summary={`${clip.scale}% scale · ${clip.rotation}°`}>
      <EditorRange label="Scale" value={clip.scale} min={10} max={300} suffix="%" onChange={(scale) => updateTextClip(clip.id, { scale })} />
      <EditorRange className="mt-3" label="Rotation" value={clip.rotation} min={-180} max={180} suffix="°" onChange={(rotation) => updateTextClip(clip.id, { rotation })} />
    </InspectorSection>
    <InspectorSection icon={Brush} title="Fill" summary={`${clip.fill.type} · ${clip.opacity}% opacity`}>
      <div className="grid grid-cols-2 gap-1.5">{(['solid', 'gradient'] as const).map((type) => <button key={type} type="button" aria-pressed={clip.fill.type === type} onClick={() => { useHistoryStore.getState().record('Change fill type'); updateTextClip(clip.id, { fill: type === 'solid' ? { type, color: clip.fill.type === 'solid' ? clip.fill.color : clip.fill.colorA } : { type, colorA: clip.fill.type === 'gradient' ? clip.fill.colorA : clip.fill.color, colorB: RIO_CONTENT_COLORS.primary, angle: 135 } }); }} className={`rounded-xl border px-2 py-2 text-[9px] font-semibold capitalize ${clip.fill.type === type ? 'border-selection-border bg-selection text-primary-800' : 'border-border bg-control text-muted'}`}>{type}</button>)}</div>
      {clip.fill.type === 'solid' ? <label className="mt-2 flex items-center justify-between text-[10px] text-muted">Fill color<input aria-label="Text fill color" type="color" value={clip.fill.color} onChange={(event) => patchFill({ color: event.currentTarget.value })} onBlur={() => useHistoryStore.getState().record('Change text color')} className="size-8 cursor-pointer rounded-lg border-0 bg-transparent" /></label> : <div className="mt-2 space-y-2"><div className="flex items-center justify-between text-[10px] text-muted"><span>Gradient colors</span><span className="flex gap-1"><input aria-label="Gradient start color" type="color" value={clip.fill.colorA} onChange={(event) => patchFill({ colorA: event.currentTarget.value })} onBlur={() => useHistoryStore.getState().record('Change text color')} className="size-8 cursor-pointer border-0 bg-transparent" /><input aria-label="Gradient end color" type="color" value={clip.fill.colorB} onChange={(event) => patchFill({ colorB: event.currentTarget.value })} onBlur={() => useHistoryStore.getState().record('Change text color')} className="size-8 cursor-pointer border-0 bg-transparent" /></span></div><EditorRange label="Gradient angle" value={clip.fill.angle} min={0} max={360} suffix="°" onChange={(angle) => patchFill({ angle })} /></div>}
      <EditorRange className="mt-3" label="Opacity" value={clip.opacity} min={0} max={100} suffix="%" onChange={(opacity) => updateTextClip(clip.id, { opacity })} />
    </InspectorSection>
    <InspectorSection icon={Square} title="Stroke" summary={`${clip.strokeWidth}px`}>
      <div className="grid grid-cols-[1fr_auto] items-end gap-3"><EditorRange label="Stroke weight" value={clip.strokeWidth} min={0} max={20} suffix="px" onChange={(strokeWidth) => updateTextClip(clip.id, { strokeWidth })} /><label className="text-[10px] text-muted">Color<input aria-label="Text stroke color" type="color" value={clip.strokeColor} onChange={(event) => updateTextClip(clip.id, { strokeColor: event.currentTarget.value })} onBlur={() => useHistoryStore.getState().record('Change text stroke color')} className="mt-1 block size-8 cursor-pointer border-0 bg-transparent" /></label></div>
    </InspectorSection>
    <InspectorSection icon={Square} title="Background" summary={`${clip.backgroundOpacity}% opacity · ${clip.backgroundRadius ?? 8}px radius`}>
      <div className="grid grid-cols-[1fr_auto] items-end gap-3"><EditorRange label="Opacity" value={clip.backgroundOpacity} min={0} max={100} suffix="%" onChange={(backgroundOpacity) => updateTextClip(clip.id, { backgroundOpacity })} /><label className="text-[10px] text-muted">Color<input aria-label="Text background color" type="color" value={clip.backgroundColor} onChange={(event) => updateTextClip(clip.id, { backgroundColor: event.currentTarget.value })} onBlur={() => useHistoryStore.getState().record('Change text background color')} className="mt-1 block size-8 cursor-pointer border-0 bg-transparent" /></label></div>
      <EditorRange className="mt-3" label="Radius" value={clip.backgroundRadius ?? 8} min={0} max={100} suffix="px" onChange={(backgroundRadius) => updateTextClip(clip.id, { backgroundRadius })} />
    </InspectorSection>
  </>;
}
