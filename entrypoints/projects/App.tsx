import { Clock3, FolderOpen, LayoutGrid, LoaderCircle, MousePointerClick, Plus, Trash2, Video } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { LogoMark } from '../shared/components/LogoMark';
import { ThemeToggle } from '../shared/components/ThemeToggle';
import { formatDuration } from '../shared/recording/media';
import { deleteRecordingProject, getRecordings, type StoredRecording } from '../shared/recording/storage';

interface ProjectPreview {
  recording: StoredRecording;
  url: string;
}

const captureLabels: Record<NonNullable<StoredRecording['captureMode']>, string> = {
  browser: 'Browser tab',
  window: 'Window',
  monitor: 'Screen',
  region: 'Selected area',
};

function ProjectCard({ project, deleting, onOpen, onDelete }: {
  project: ProjectPreview;
  deleting: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { recording, url } = project;
  const actionCount = recording.interactions?.length ?? 0;
  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lg hover:shadow-primary-500/10">
      <button type="button" onClick={onOpen} className="relative block aspect-video w-full overflow-hidden bg-ink text-left">
        <video src={url} muted preload="metadata" className="size-full object-cover transition duration-300 group-hover:scale-[1.02]" />
        <span className="absolute bottom-2 right-2 rounded-lg bg-ink/80 px-2 py-1 font-mono text-[10px] font-semibold text-white backdrop-blur">{formatDuration(recording.durationMs)}</span>
        <span className="absolute inset-0 grid place-items-center bg-ink/0 transition group-hover:bg-ink/10"><span className="grid size-11 scale-90 place-items-center rounded-full bg-surface/90 text-primary-600 opacity-0 shadow-lg transition group-hover:scale-100 group-hover:opacity-100"><FolderOpen className="size-5" /></span></span>
      </button>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
            <h2 className="truncate text-sm font-semibold text-ink">Project {new Date(recording.createdAt).toLocaleDateString()}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-[10px] text-muted"><Clock3 className="size-3" />{new Date(recording.createdAt).toLocaleString()}</p>
          </button>
          <button type="button" aria-label="Delete project" title="Delete project" disabled={deleting} onClick={onDelete} className="rounded-lg p-2 text-muted transition hover:bg-danger-soft hover:text-danger disabled:cursor-wait disabled:opacity-40">{deleting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-primary-50 px-2 py-1 text-[9px] font-semibold text-primary-700">{recording.captureMode ? captureLabels[recording.captureMode] : 'Project'}</span>
          {actionCount > 0 && <span className="flex items-center gap-1 rounded-full bg-accent-50 px-2 py-1 text-[9px] font-semibold text-accent-700"><MousePointerClick className="size-3" />{actionCount} actions</span>}
        </div>
      </div>
    </article>
  );
}

export default function App() {
  const [projects, setProjects] = useState<ProjectPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    const urls: string[] = [];
    void getRecordings().then((recordings) => {
      if (!active) return;
      const previews = recordings.map((recording) => {
        const url = URL.createObjectURL(recording.blob);
        urls.push(url);
        return { recording, url };
      });
      setProjects(previews);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Could not load projects.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; urls.forEach((url) => URL.revokeObjectURL(url)); };
  }, []);

  const totalDuration = useMemo(() => projects.reduce((sum, project) => sum + project.recording.durationMs, 0), [projects]);
  const openProject = (id: string) => { window.location.href = browser.runtime.getURL(`/playback.html?id=${id}`); };
  const openRecorder = async () => {
    try { await browser.action.openPopup(); } catch { setError('Open Rio from the browser toolbar to start a recording.'); }
  };
  const deleteProject = async (project: ProjectPreview) => {
    if (!window.confirm('Delete this project, its recording, and all imported media? This cannot be undone.')) return;
    setDeletingId(project.recording.id);
    setError(undefined);
    try {
      await deleteRecordingProject(project.recording.id);
      URL.revokeObjectURL(project.url);
      setProjects((current) => current.filter((item) => item.recording.id !== project.recording.id));
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Could not delete this project.');
    } finally {
      setDeletingId(undefined);
    }
  };

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8"><LogoMark /><div className="flex items-center gap-2"><ThemeToggle compact /><button type="button" onClick={() => void openRecorder()} className="flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-xs font-semibold text-on-primary shadow-md shadow-primary-500/20 transition hover:bg-primary-600"><Plus className="size-4" />New recording</button></div></div>
      </header>
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-xs font-semibold text-primary-600">Your workspace</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Projects</h1><p className="mt-2 max-w-xl text-sm leading-6 text-muted">Choose a recording to continue editing, or remove projects you no longer need.</p></div>
          {!loading && projects.length > 0 && <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface px-4 py-3 text-xs"><span><strong className="block text-sm text-ink">{projects.length}</strong><span className="text-muted">Projects</span></span><span className="h-8 w-px bg-border" /><span><strong className="block font-mono text-sm text-ink">{formatDuration(totalDuration)}</strong><span className="text-muted">Recorded</span></span></div>}
        </div>
        {error && <div role="alert" className="mt-6 rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-xs font-medium text-danger">{error}</div>}
        {loading ? <div className="grid min-h-[360px] place-items-center"><div className="flex items-center gap-2 text-sm text-muted"><LoaderCircle className="size-5 animate-spin" />Loading projects…</div></div> : projects.length === 0 ? <div className="mt-10 grid min-h-[360px] place-items-center rounded-3xl border border-dashed border-primary-200 bg-surface/65 p-8 text-center"><div><span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-50 text-primary-600"><Video className="size-7" /></span><h2 className="mt-5 text-lg font-semibold">No projects yet</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">Create a recording or blank project from the Rio toolbar popup, then it will appear here.</p><button type="button" onClick={() => void openRecorder()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-xs font-semibold text-on-primary"><Plus className="size-4" />Create project</button></div></div> : <div className="mt-8"><div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted"><LayoutGrid className="size-3.5" />Recent projects</div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{projects.map((project) => <ProjectCard key={project.recording.id} project={project} deleting={deletingId === project.recording.id} onOpen={() => openProject(project.recording.id)} onDelete={() => void deleteProject(project)} />)}</div></div>}
      </section>
    </main>
  );
}
