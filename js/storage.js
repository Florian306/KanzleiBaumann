/**
 * Storage Service for Kanzlei Dr. jur. Lars Baumann (Berlin)
 * Combines localStorage for metadata and IndexedDB for large media files (PDFs, Images, Videos)
 */

const DB_NAME = 'KanzleiBaumannBerlinDB';
const DB_VERSION = 1;
const STORE_NAME = 'case_files';

class StorageService {
  constructor() {
    this.db = null;
    this.initPromise = this.initIndexedDB();
  }

  initIndexedDB() {
    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('caseId', 'caseId', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB opening error:', event);
        resolve(null);
      };
    });
  }

  async saveFile(fileRecord) {
    // Cloud D1 sync
    try {
      await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fileRecord)
      });
    } catch (e) { /* Fallback to local IndexedDB */ }

    await this.initPromise;
    if (!this.db) return true;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(fileRecord);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async getFilesByCaseId(caseId) {
    try {
      const res = await fetch(`/api/files?caseId=${encodeURIComponent(caseId)}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.files)) return json.files;
      }
    } catch (e) { /* Fallback to IndexedDB */ }

    await this.initPromise;
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('caseId');
      const req = index.getAll(caseId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteFile(fileId) {
    try {
      await fetch(`/api/files?id=${encodeURIComponent(fileId)}`, { method: 'DELETE' });
    } catch (e) { /* Ignore */ }

    await this.initPromise;
    if (!this.db) return true;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(fileId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async getFileById(fileId) {
    try {
      const res = await fetch(`/api/files?id=${encodeURIComponent(fileId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.file) return json.file;
      }
    } catch (e) { /* Fallback to IndexedDB */ }

    await this.initPromise;
    if (!this.db) return null;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(fileId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }
}

