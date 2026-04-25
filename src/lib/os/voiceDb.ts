export type VoiceRecordingMeta = {
  id: string;
  createdAt: number;
  durationMs: number;
  mimeType: string;
};

const DB_NAME = "zza-os";
// Keep in sync with other modules using DB_NAME (e.g. galleryDb).
// Bump when adding new object stores.
const DB_VER = 2;
const STORE = "voice";
const META_KEY = "zza-os:voice:meta";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      // Ensure ALL stores exist (users may have an older DB created by another module).
      if (!db.objectStoreNames.contains("gallery")) {
        db.createObjectStore("gallery", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      } else {
        const tx = req.transaction;
        const s = tx?.objectStore(STORE);
        if (s && !s.indexNames.contains("createdAt")) {
          s.createIndex("createdAt", "createdAt");
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Failed to open IndexedDB"));
  });
}

type VoiceRow = VoiceRecordingMeta & { blob: Blob };

export function loadVoiceMetas(): VoiceRecordingMeta[] {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as VoiceRecordingMeta[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (m) =>
          typeof m?.id === "string" &&
          typeof m?.createdAt === "number" &&
          typeof m?.durationMs === "number" &&
          typeof m?.mimeType === "string",
      )
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

function saveVoiceMetas(metas: VoiceRecordingMeta[]) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(metas.slice(0, 500)));
  } catch {
    // ignore
  }
}

export async function listVoiceRecordings(): Promise<VoiceRecordingMeta[]> {
  // Fast path (sync source) for UI. Actual blobs are fetched per-item.
  return loadVoiceMetas();
}

export async function getVoiceRecordingBlob(id: string): Promise<Blob | null> {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.get(id);
    req.onsuccess = () => {
      const row = req.result as VoiceRow | undefined;
      resolve(row?.blob ?? null);
    };
    req.onerror = () => reject(req.error ?? new Error("Failed to get recording"));
    tx.oncomplete = () => db.close();
  });
}

export async function addVoiceRecording(meta: VoiceRecordingMeta, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.put({ ...meta, blob } satisfies VoiceRow);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error("Failed to add recording"));
    tx.oncomplete = () => db.close();
  });
  const next = [meta, ...loadVoiceMetas().filter((m) => m.id !== meta.id)].sort((a, b) => b.createdAt - a.createdAt);
  saveVoiceMetas(next);
}

export async function removeVoiceRecording(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error("Failed to remove recording"));
    tx.oncomplete = () => db.close();
  });
  saveVoiceMetas(loadVoiceMetas().filter((m) => m.id !== id));
}

