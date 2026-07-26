import type { CaptureMode, CropArea, RecordedInteraction } from './types';

const DATABASE_NAME = 'rio-recorder';
const DATABASE_VERSION = 3;
const RECORDINGS_STORE = 'recordings';
const PROJECTS_STORE = 'editor-projects';
const ASSETS_STORE = 'editor-assets';

export interface StoredRecording {
  id: string;
  blob: Blob;
  mimeType: string;
  createdAt: number;
  durationMs: number;
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
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(RECORDINGS_STORE, 'readwrite');
    transaction.objectStore(RECORDINGS_STORE).put(recording);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save the recording.'));
  });

  database.close();
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

export async function saveEditorProject<T>(recordingId: string, settings: T): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(PROJECTS_STORE, 'readwrite');
    transaction.objectStore(PROJECTS_STORE).put({ recordingId, settings, updatedAt: Date.now() } satisfies StoredEditorProject<T>);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save editor settings.'));
  });
  database.close();
}
