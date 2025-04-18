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
    // Split lines and filter empty
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const total = lines.length;
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
      // Save to IndexedDB
      await saveRecordsBatch(batch, offset);
      offset = end;
      // Report progress
      self.postMessage({ progress: offset / total });
      // Yield to idle (with fallback)
      await new Promise(resolve => _requestIdleCallback(resolve, { timeout: 200 }));
    }
    // Done
    self.postMessage({ done: true, total });
  } catch (err) {
    self.postMessage({ error: err.message });
  }
};