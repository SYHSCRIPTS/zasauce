export type GalleryItem = {
  id: string;
  createdAt: number;
  kind: "photo" | "placeholder";
  label: string;
  mime: string;
};

type StoredItem = GalleryItem & {
  blob?: Blob;
};

const DB_NAME = "zza-os";
// Keep in sync with other modules using DB_NAME (e.g. voiceDb).
const DB_VERSION = 2;
const STORE = "gallery";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("voice")) {
        const store = db.createObjectStore("voice", { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      } else {
        const tx = req.transaction;
        const s = tx?.objectStore("voice");
        if (s && !s.indexNames.contains("createdAt")) {
          s.createIndex("createdAt", "createdAt");
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        const req = run(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
        t.onerror = () => {
          reject(t.error);
          db.close();
        };
      }),
  );
}

export async function listGallery(): Promise<GalleryItem[]> {
  const all = (await tx<StoredItem[]>("readonly", (s) => s.getAll())) ?? [];
  return all
    .map(({ blob, ...meta }) => {
      void blob;
      return meta;
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getGalleryBlob(id: string): Promise<Blob | null> {
  const item = await tx<StoredItem | undefined>("readonly", (s) => s.get(id));
  return item?.blob ?? null;
}

export async function addPhoto(blob: Blob, label = "Camera capture"): Promise<GalleryItem> {
  const item: StoredItem = {
    id: uid(),
    createdAt: Date.now(),
    kind: "photo",
    label,
    mime: blob.type || "image/png",
    blob,
  };
  await tx("readwrite", (s) => s.put(item));
  const { blob: b, ...meta } = item;
  void b;
  return meta;
}

export async function addPlaceholder(svgDataUrl: string, label: string): Promise<GalleryItem> {
  // Store placeholder as a blob too, so gallery treats it uniformly.
  const res = await fetch(svgDataUrl);
  const blob = await res.blob();
  const item: StoredItem = {
    id: uid(),
    createdAt: Date.now(),
    kind: "placeholder",
    label,
    mime: blob.type || "image/svg+xml",
    blob,
  };
  await tx("readwrite", (s) => s.put(item));
  const { blob: b, ...meta } = item;
  void b;
  return meta;
}

export async function removeGalleryItem(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
}

