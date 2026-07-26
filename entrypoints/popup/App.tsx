import { AppWindow, Circle, Crop, FilePlus2, FolderKanban, Mic, Monitor, PanelsTopLeft, Volume2, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { LogoMark } from '../shared/components/LogoMark';
import type { CaptureMode, RecordingOptions } from '../shared/recording/types';
import { createBlankProject } from './blankProject';

const modes: Array<{ id: CaptureMode; title: string; icon: LucideIcon }> = [
  { id: 'browser', title: 'Tab', icon: PanelsTopLeft },
  { id: 'window', title: 'Window', icon: AppWindow },
  { id: 'monitor', title: 'Screen', icon: Monitor },
  { id: 'region', title: 'Area', icon: Crop },
];

function OptionToggle({ checked, icon: ToggleIcon, label, onChange }: {
  checked: boolean;
  icon: LucideIcon;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5 hover:border-primary-200">
      <span className="flex items-center gap-2 text-xs font-semibold">
        <ToggleIcon className="size-4 text-muted" />
        {label}
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
      <span className="relative h-5 w-9 rounded-full bg-cream-300 transition peer-checked:bg-primary-500 peer-focus-visible:outline-2 peer-focus-visible:outline-primary-500 after:absolute after:left-1 after:top-1 after:size-3 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-4" />
    </label>
  );
}

function App() {
  const [options, setOptions] = useState<RecordingOptions>({
    mode: 'browser',
    microphone: false,
    sourceAudio: false,
  });
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string>();

  const openBlankProject = async () => {
    setOpening(true);
    setError(undefined);
    try {
      const id = await createBlankProject();
      await browser.tabs.create({ url: browser.runtime.getURL(`/playback.html?id=${id}`) });
      window.close();
    } catch (projectError: unknown) {
      setError(projectError instanceof Error ? projectError.message : 'Could not create a blank project.');
      setOpening(false);
    }
  };

  const openProjects = async () => {
    await browser.tabs.create({ url: chrome.runtime.getURL('/projects.html') });
    window.close();
  };

  const openRecorder = async () => {
    setOpening(true);
    setError(undefined);

    try {
      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!activeTab?.id) throw new Error('Rio could not find the active tab.');

      const captureRequest = browser.runtime.sendMessage({
        type: 'start-capture',
        options,
        targetTabId: activeTab.id,
      });
      window.close();
      const response = await captureRequest as { ok: boolean; error?: string } | undefined;
      if (response?.error) throw new Error(response.error);
    } catch (captureError: unknown) {
      setError(captureError instanceof Error ? captureError.message : 'Could not start the recording.');
    } finally {
      setOpening(false);
    }
  };

  return (
    <main className="relative w-96 overflow-hidden bg-canvas p-5 text-ink">
      <div className="absolute -right-16 -top-20 size-44 rounded-full bg-primary-100" />
      <div className="relative flex items-center justify-between">
        <LogoMark />
        <span className="rounded-full bg-cream-100 px-2.5 py-1 text-[10px] font-semibold text-muted">Private</span>
      </div>

      <div className="relative mt-6">
        <p className="text-xs font-semibold text-primary-600">New recording</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">What would you like to capture?</h1>
        <p className="mt-1.5 text-xs leading-5 text-muted">Your browser asks you to confirm the source next.</p>
      </div>

      <div className="relative mt-4 grid grid-cols-4 gap-2">
        {modes.map((mode) => {
          const selected = options.mode === mode.id;
          const ModeIcon = mode.icon;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => setOptions((current) => ({ ...current, mode: mode.id }))}
              className={`flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-xs font-semibold transition ${selected ? 'border-primary-300 bg-primary-50 text-primary-700 ring-1 ring-primary-200' : 'border-border bg-surface text-muted hover:border-primary-200 hover:text-primary-600'}`}
            >
              <ModeIcon className="size-5" />
              {mode.title}
            </button>
          );
        })}
      </div>

      <div className="relative mt-3 grid grid-cols-2 gap-2">
        <OptionToggle
          checked={options.microphone}
          icon={Mic}
          label="Microphone"
          onChange={(microphone) => setOptions((current) => ({ ...current, microphone }))}
        />
        <OptionToggle
          checked={options.sourceAudio}
          icon={Volume2}
          label="Source audio"
          onChange={(sourceAudio) => setOptions((current) => ({ ...current, sourceAudio }))}
        />
      </div>

      <button
        onClick={openRecorder}
        disabled={opening}
        className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-primary-500/20 transition hover:bg-primary-600 disabled:cursor-wait disabled:opacity-70"
      >
        <Circle className="size-4 fill-current" />
        {opening ? 'Opening picker…' : 'Start recording'}
      </button>
      <div className="relative mt-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => void openBlankProject()} disabled={opening} className="flex items-center justify-center gap-2 rounded-xl border border-primary-200 bg-surface px-3 py-2.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 disabled:cursor-wait disabled:opacity-60"><FilePlus2 className="size-4" /> Blank project</button>
        <button type="button" onClick={() => void openProjects()} disabled={opening} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-xs font-semibold text-ink transition hover:border-primary-200 hover:bg-primary-50 disabled:opacity-60"><FolderKanban className="size-4 text-primary-600" /> Manage projects</button>
      </div>
      {error && (
        <p role="alert" className="relative mt-3 rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-center text-xs font-medium text-danger">
          {error}
        </p>
      )}
      <p className="relative mt-3 text-center text-[10px] leading-4 text-muted">Permissions are requested only for the options you enable.</p>
    </main>
  );
}

export default App;
