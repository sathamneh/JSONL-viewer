/**
 * db.js - Simple IndexedDB wrapper for JSONL Viewer
 *
 * Copyright (c) 2025 Suheel Athamneh
 * Author: Suheel Athamneh
 */
const DB_NAME = 'jsonl-viewer';
const STORE_NAME = 'records';
let dbPromise;
/**
 * Open (or create) the IndexedDB database and object store.
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = event => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'idx' });
        }
      };
      req.onsuccess = event => resolve(event.target.result);
      req.onerror = event => reject(event.target.error);
    });
  }
  return dbPromise;
}

/**
 * Clear all records from the store.
 * @returns {Promise<void>}
 */
async function clearStore() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = event => reject(event.target.error);
  });
}

/**
 * Save a batch of records at given offset.
 * @param {Array<any>} records - Array of record objects
 * @param {number} offset - Starting index for these records
 * @returns {Promise<void>}
 */
async function saveRecordsBatch(records, offset) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (let i = 0; i < records.length; i++) {
      store.put({ idx: offset + i, data: records[i] });
    }
    tx.oncomplete = () => resolve();
    tx.onerror = event => reject(event.target.error);
  });
}

/**
 * Get a single record by index.
 * @param {number} idx - Record index
 * @returns {Promise<any|null>}
 */
async function getRecord(idx) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(idx);
    req.onsuccess = event => {
      const result = event.target.result;
      resolve(result ? result.data : null);
    };
    req.onerror = event => reject(event.target.error);
  });
}

/**
 * Count total records in store.
 * @returns {Promise<number>}
 */
async function countRecords() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.count();
    req.onsuccess = event => resolve(event.target.result);
    req.onerror = event => reject(event.target.error);
  });
}

export { clearStore, saveRecordsBatch, getRecord, countRecords };