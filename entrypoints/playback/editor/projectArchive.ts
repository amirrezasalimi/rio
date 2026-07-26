import { BlobReader, BlobWriter, TextReader, TextWriter, ZipReader, ZipWriter } from '@zip.js/zip.js';
import { deleteRecordingProject, getEditorAssets, saveEditorAsset, saveEditorProject, saveRecording, type StoredEditorAsset, type StoredRecording } from '../../shared/recording/storage';
import type { EditorSettings } from './types';
import type { CropArea, RecordedInteraction } from '../../shared/recording/types';

const ARCHIVE_VERSION = 1;
const MANIFEST_PATH = 'rio-project.json';
const RECORDING_PATH = 'recording/source';

interface ArchiveAsset {
  id: string;
  path: string;
  name: string;
  mimeType: string;
  createdAt: number;
  gestureDurationMs?: number;
  interactions?: RecordedInteraction[];
  crop?: CropArea;
}

interface ProjectArchiveManifest {
  format: 'rio-project';
  version: number;
  exportedAt: number;
  recording: Omit<StoredRecording, 'blob' | 'id'> & { path: string };
  settings: EditorSettings;
  assets: ArchiveAsset[];
}

function safeFilename(value: string): string {
  return value.replaceAll(/[^a-zA-Z0-9._-]+/g, '-').replaceAll(/^-+|-+$/g, '') || 'asset';
}

export async function exportProjectArchive(recording: StoredRecording, settings: EditorSettings): Promise<Blob> {
  const assets = await getEditorAssets(recording.id);
  const writer = new ZipWriter(new BlobWriter('application/zip'));
  const archiveAssets = assets.map((asset, index) => ({
    id: asset.id,
    path: `assets/${index}-${safeFilename(asset.name)}`,
    name: asset.name,
    mimeType: asset.mimeType,
    createdAt: asset.createdAt,
    gestureDurationMs: asset.gestureDurationMs,
    interactions: asset.interactions,
    crop: asset.crop,
  }));
  const manifest: ProjectArchiveManifest = {
    format: 'rio-project',
    version: ARCHIVE_VERSION,
    exportedAt: Date.now(),
    recording: {
      path: RECORDING_PATH,
      mimeType: recording.mimeType,
      createdAt: recording.createdAt,
      durationMs: recording.durationMs,
      captureMode: recording.captureMode,
      crop: recording.crop,
      interactions: recording.interactions,
    },
    settings,
    assets: archiveAssets,
  };
  await writer.add(MANIFEST_PATH, new TextReader(JSON.stringify(manifest, null, 2)));
  await writer.add(RECORDING_PATH, new BlobReader(recording.blob));
  for (let index = 0; index < assets.length; index += 1) {
    await writer.add(archiveAssets[index].path, new BlobReader(assets[index].blob));
  }
  return writer.close();
}

export async function importProjectArchive(file: Blob): Promise<string> {
  const reader = new ZipReader(new BlobReader(file));
  try {
    const entries = await reader.getEntries();
    const byName = new Map(entries.filter((entry) => !entry.directory).map((entry) => [entry.filename, entry]));
    const manifestEntry = byName.get(MANIFEST_PATH);
    if (!manifestEntry?.getData) throw new Error('This ZIP is not a Rio project archive.');
    const manifest = JSON.parse(await manifestEntry.getData(new TextWriter())) as ProjectArchiveManifest;
    if (manifest.format !== 'rio-project' || manifest.version !== ARCHIVE_VERSION) throw new Error('This Rio project archive version is not supported.');
    const recordingEntry = byName.get(manifest.recording.path);
    if (!recordingEntry?.getData) throw new Error('The project archive is missing its original recording.');

    const recordingId = crypto.randomUUID();
    const assetIds = new Map(manifest.assets.map((asset) => [asset.id, crypto.randomUUID()]));
    const settings: EditorSettings = {
      ...manifest.settings,
      timelineMedia: manifest.settings.timelineMedia.map((item) => ({ ...item, assetId: assetIds.get(item.assetId) ?? item.assetId })),
      gestureClips: manifest.settings.gestureClips.map((clip) => ({ ...clip, sourceAssetId: clip.sourceAssetId ? assetIds.get(clip.sourceAssetId) ?? clip.sourceAssetId : undefined })),
    };
    const recordingBlob = await recordingEntry.getData(new BlobWriter(manifest.recording.mimeType));
    const recording: StoredRecording = { ...manifest.recording, id: recordingId, blob: recordingBlob };
    delete (recording as Partial<ProjectArchiveManifest['recording']>).path;
    try {
      await saveRecording(recording);
      await saveEditorProject(recordingId, settings);
      for (const asset of manifest.assets) {
        const entry = byName.get(asset.path);
        if (!entry?.getData) throw new Error(`The project archive is missing ${asset.name}.`);
        const stored: StoredEditorAsset = {
          id: assetIds.get(asset.id) ?? crypto.randomUUID(),
          recordingId,
          blob: await entry.getData(new BlobWriter(asset.mimeType)),
          name: asset.name,
          mimeType: asset.mimeType,
          createdAt: asset.createdAt,
          gestureDurationMs: asset.gestureDurationMs,
          interactions: asset.interactions,
          crop: asset.crop,
        };
        await saveEditorAsset(stored);
      }
      return recordingId;
    } catch (error) {
      await deleteRecordingProject(recordingId);
      throw error;
    }
  } finally {
    await reader.close();
  }
}
