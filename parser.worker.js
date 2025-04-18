// parser.worker.js - Web Worker for parsing JSONL in chunks and saving to IndexedDB
import { clearStore, saveRecordsBatch } from './db.js';
// Polyfill requestIdleCallback in environments where it's not available (e.g., Web Worker)
const _requestIdleCallback = (typeof requestIdleCallback === 'function')
  ? requestIdleCallback
  : (callback, opts) => setTimeout(() => callback({ didTimeout: true, timeRemaining: () => 0 }), (opts && opts.timeout) || 0);

// Listen for messages from main thread
self.onmessage = async function(event) {
  const { text } = event.data;
  try {
    // Split lines, filter empty, and prepare key tracking
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const total = lines.length;
    // Track all field keys across records
    const allKeys = new Set();
    // Clear existing data
    await clearStore();
    const BATCH = 500;
    let offset = 0;
    while (offset < total) {
      const end = Math.min(offset + BATCH, total);
      // Parse batch
      const batch = [];
      for (let i = offset; i < end; i++) {
        try {
          batch.push(JSON.parse(lines[i]));
        } catch (err) {
          batch.push({ __error: err.message, __raw: lines[i] });
        }
      }
      // Collect keys from this batch
      batch.forEach(rec => {
        if (rec && typeof rec === 'object') {
          Object.keys(rec).forEach(key => allKeys.add(key));
        }
      });
      // Save to IndexedDB
      await saveRecordsBatch(batch, offset);
      offset = end;
      // Report progress
      self.postMessage({ progress: offset / total });
      // Yield to idle (with fallback)
      await new Promise(resolve => _requestIdleCallback(resolve, { timeout: 200 }));
    }
    // Done: send total and collected keys
    self.postMessage({ done: true, total, keys: Array.from(allKeys) });
  } catch (err) {
    self.postMessage({ error: err.message });
  }
};