import type { CaptureMode, CropArea, RecordedInteraction } from './types';

const DATABASE_NAME = 'rio-recorder';
const DATABASE_VERSION = 3;
const RECORDINGS_STORE = 'recordings';
const PROJECTS_STORE = 'editor-projects';
const ASSETS_STORE = 'editor-assets';
const projectSaveQueues = new Map<string, Promise<void>>();
const deletedProjects = new Set<string>();

export interface StoredRecording {
  id: string;
  blob: Blob;
  mimeType: string;
  createdAt: number;
  durationMs: number;
  /** Whether the recorded media stream contained an audio track. */
  hasAudio?: boolean;
  captureMode?: CaptureMode;
  crop?: CropArea;
  interactions?: RecordedInteraction[];
}

export interface StoredEditorAsset {
  id: string;
  recordingId: string;
  blob: Blob;
  name: string;
  mimeType: string;
  createdAt: number;
  durationMs?: number;
  gestureDurationMs?: number;
  interactions?: RecordedInteraction[];
  crop?: CropArea;
}

interface StoredEditorProject<T> {
  recordingId: string;
  settings: T;
  updatedAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(RECORDINGS_STORE)) {
        database.createObjectStore(RECORDINGS_STORE, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(PROJECTS_STORE)) {
        database.createObjectStore(PROJECTS_STORE, { keyPath: 'recordingId' });
      }
      if (!database.objectStoreNames.contains(ASSETS_STORE)) {
        const assets = database.createObjectStore(ASSETS_STORE, { keyPath: 'id' });
        assets.createIndex('recordingId', 'recordingId');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open recording storage.'));
  });
}

export async function saveRecording(recording: StoredRecording): Promise<void> {
  deletedProjects.delete(recording.id);
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(RECORDINGS_STORE, 'readwrite');
    transaction.objectStore(RECORDINGS_STORE).put(recording);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save the recording.'));
  });

  database.close();
}

export async function getRecordings(): Promise<StoredRecording[]> {
  const database = await openDatabase();
  const recordings = await new Promise<StoredRecording[]>((resolve, reject) => {
    const request = database.transaction(RECORDINGS_STORE).objectStore(RECORDINGS_STORE).getAll();
    request.onsuccess = () => resolve(request.result as StoredRecording[]);
    request.onerror = () => reject(request.error ?? new Error('Could not load recordings.'));
  });
  database.close();
  return recordings.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getRecording(id: string): Promise<StoredRecording | undefined> {
  const database = await openDatabase();
  const recording = await new Promise<StoredRecording | undefined>((resolve, reject) => {
    const request = database.transaction(RECORDINGS_STORE).objectStore(RECORDINGS_STORE).get(id);
    request.onsuccess = () => resolve(request.result as StoredRecording | undefined);
    request.onerror = () => reject(request.error ?? new Error('Could not load the recording.'));
  });
  database.close();
  return recording;
}

export async function getEditorProject<T>(recordingId: string): Promise<T | undefined> {
  const database = await openDatabase();
  const project = await new Promise<StoredEditorProject<T> | undefined>((resolve, reject) => {
    const request = database.transaction(PROJECTS_STORE).objectStore(PROJECTS_STORE).get(recordingId);
    request.onsuccess = () => resolve(request.result as StoredEditorProject<T> | undefined);
    request.onerror = () => reject(request.error ?? new Error('Could not load editor settings.'));
  });
  database.close();
  return project?.settings;
}

export async function saveEditorAsset(asset: StoredEditorAsset): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(ASSETS_STORE, 'readwrite');
    transaction.objectStore(ASSETS_STORE).put(asset);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save editor media.'));
  });
  database.close();
}

export async function getEditorAssets(recordingId: string): Promise<StoredEditorAsset[]> {
  const database = await openDatabase();
  const assets = await new Promise<StoredEditorAsset[]>((resolve, reject) => {
    const request = database.transaction(ASSETS_STORE).objectStore(ASSETS_STORE).index('recordingId').getAll(recordingId);
    request.onsuccess = () => resolve(request.result as StoredEditorAsset[]);
    request.onerror = () => reject(request.error ?? new Error('Could not load editor media.'));
  });
  database.close();
  return assets;
}

export async function deleteRecordingProject(recordingId: string): Promise<void> {
  deletedProjects.add(recordingId);
  await projectSaveQueues.get(recordingId)?.catch(() => undefined);
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction([RECORDINGS_STORE, PROJECTS_STORE, ASSETS_STORE], 'readwrite');
    transaction.objectStore(RECORDINGS_STORE).delete(recordingId);
    transaction.objectStore(PROJECTS_STORE).delete(recordingId);
    const assets = transaction.objectStore(ASSETS_STORE);
    const request = assets.index('recordingId').getAllKeys(recordingId);
    request.onsuccess = () => request.result.forEach((key) => assets.delete(key));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not delete the project.'));
  });
  database.close();
}

export async function deleteEditorAsset(id: string): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(ASSETS_STORE, 'readwrite');
    transaction.objectStore(ASSETS_STORE).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not delete editor media.'));
  });
  database.close();
}

export function saveEditorProject<T>(recordingId: string, settings: T): Promise<void> {
  if (deletedProjects.has(recordingId)) return Promise.resolve();
  const requestedAt = Date.now();
  const previous = projectSaveQueues.get(recordingId) ?? Promise.resolve();
  const save = previous.catch(() => undefined).then(async () => {
    if (deletedProjects.has(recordingId)) return;
    const database = await openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(PROJECTS_STORE, 'readwrite');
        const store = transaction.objectStore(PROJECTS_STORE);
        const currentRequest = store.get(recordingId);
        currentRequest.onsuccess = () => {
          const current = currentRequest.result as StoredEditorProject<T> | undefined;
          if (!current || current.updatedAt <= requestedAt) {
            store.put({ recordingId, settings, updatedAt: requestedAt } satisfies StoredEditorProject<T>);
          }
        };
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('Could not save editor settings.'));
      });
    } finally {
      database.close();
    }
  });
  projectSaveQueues.set(recordingId, save);
  const cleanup = () => {
    if (projectSaveQueues.get(recordingId) === save) projectSaveQueues.delete(recordingId);
  };
  void save.then(cleanup, cleanup);
  return save;
}
