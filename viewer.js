// viewer.js - main script for JSONL Viewer, uses Web Worker and IndexedDB
import { getRecord, countRecords } from './db.js';

// DOM elements
const elements = {
  fileInput: document.getElementById('fileInput'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  recordCounter: document.getElementById('recordCounter'),
  jsonDisplay: document.getElementById('jsonDisplay'),
  tableHeader: document.getElementById('tableHeader'),
  tableBody: document.getElementById('tableBody'),
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn')
};

// Application state
const state = {
  currentIndex: -1,
  totalRecords: 0,
  isLoading: false
};

// Parser worker reference
let parserWorker = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

/** Initialize UI and load saved state */
function init() {
  // Disable search (not implemented)
  if (elements.searchInput) elements.searchInput.disabled = true;
  if (elements.searchBtn) elements.searchBtn.disabled = true;
  setupEventListeners();
  loadState();
}

/** Set up UI event listeners */
function setupEventListeners() {
  elements.fileInput.addEventListener('change', handleFileSelection);
  elements.prevBtn.addEventListener('click', () => {
    if (!state.isLoading && state.currentIndex > 0) {
      state.currentIndex--;
      saveIndex();
      updateRecord();
    }
  });
  elements.nextBtn.addEventListener('click', () => {
    if (!state.isLoading && state.currentIndex < state.totalRecords - 1) {
      state.currentIndex++;
      saveIndex();
      updateRecord();
    }
  });
}

/** Load last index and total count */
function loadState() {
  chrome.storage.local.get(['currentIndex'], async result => {
    const idx = result.currentIndex;
    state.currentIndex = Number.isInteger(idx) ? idx : 0;
    state.totalRecords = await countRecords();
    if (state.totalRecords > 0) {
      clampIndex();
      updateRecord();
    }
  });
}

/** Persist current index */
function saveIndex() {
  chrome.storage.local.set({ currentIndex: state.currentIndex });
}

/** Ensure index is within [0, totalRecords) */
function clampIndex() {
  if (state.currentIndex < 0) state.currentIndex = 0;
  if (state.currentIndex >= state.totalRecords) {
    state.currentIndex = state.totalRecords - 1;
  }
}

/** Handle file selection and trigger parsing */
function handleFileSelection(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.name.endsWith('.jsonl') && !file.name.endsWith('.json')) {
    showError('File must have .jsonl or .json extension');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => startParsing(reader.result);
  reader.onerror = () => showError('Error reading file');
  reader.readAsText(file);
}

/** Start parsing in worker */
function startParsing(text) {
  state.isLoading = true;
  updateLoadingUI();
  // Terminate any existing worker
  if (parserWorker) parserWorker.terminate();
  parserWorker = new Worker('parser.worker.js', { type: 'module' });
  parserWorker.onmessage = handleWorkerMessage;
  parserWorker.postMessage({ text });
}

/** Handle messages from parser worker */
function handleWorkerMessage(e) {
  const data = e.data;
  if (data.error) {
    showError(data.error);
    state.isLoading = false;
    updateLoadingUI();
  } else if (data.progress != null) {
    const pct = Math.floor(data.progress * 100);
    elements.recordCounter.textContent = `Parsing: ${pct}%`;
  } else if (data.done) {
    state.totalRecords = data.total;
    state.currentIndex = 0;
    saveIndex();
    state.isLoading = false;
    updateLoadingUI();
    updateRecord();
  }
}

/** Fetch and render the current record */
async function updateRecord() {
  clampIndex();
  // Update navigation buttons
  elements.prevBtn.disabled = state.isLoading || state.currentIndex <= 0;
  elements.nextBtn.disabled =
    state.isLoading || state.currentIndex >= state.totalRecords - 1;
  // Update counter
  elements.recordCounter.textContent = state.isLoading
    ? 'Loading...'
    : `Record ${state.currentIndex + 1} of ${state.totalRecords}`;
  // Fetch record
  try {
    const record = await getRecord(state.currentIndex);
    renderRecord(record);
  } catch (err) {
    showError(err.message);
  }
}

/** Render a single record into the table and raw view */
function renderRecord(record) {
  // Determine fields
  const fields =
    record && typeof record === 'object' ? Object.keys(record).sort() : [];
  // Header
  elements.tableHeader.innerHTML = '';
  if (fields.length === 0) {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = 'No data';
    elements.tableHeader.appendChild(th);
  } else {
    for (const f of fields) {
      const th = document.createElement('th');
      th.setAttribute('scope', 'col');
      th.textContent = f;
      elements.tableHeader.appendChild(th);
    }
  }
  // Body
  elements.tableBody.innerHTML = '';
  const tr = document.createElement('tr');
  if (!record || typeof record !== 'object') {
    const td = document.createElement('td');
    td.setAttribute('colspan', fields.length || 1);
    td.textContent = 'Invalid record';
    tr.appendChild(td);
  } else {
    for (const f of fields) {
      const td = document.createElement('td');
      const val = record[f];
      if (val === null) {
        td.textContent = 'null';
        td.classList.add('null-value');
      } else if (typeof val === 'object') {
        try {
          td.textContent = JSON.stringify(val);
        } catch {
          td.textContent = '[Object]';
        }
      } else {
        td.textContent = String(val);
      }
      tr.appendChild(td);
    }
  }
  elements.tableBody.appendChild(tr);
  // Raw JSON
  try {
    elements.jsonDisplay.textContent = JSON.stringify(record, null, 2);
  } catch {
    elements.jsonDisplay.textContent = 'Error displaying JSON';
  }
}

/** Update UI during loading */
function updateLoadingUI() {
  elements.prevBtn.disabled = true;
  elements.nextBtn.disabled = true;
  elements.jsonDisplay.textContent = 'Parsing...';
}

/** Display an error state */
function showError(msg) {
  elements.jsonDisplay.textContent = `Error: ${msg}`;
  elements.recordCounter.textContent = msg;
  elements.tableBody.innerHTML = `<tr><td colspan="1">Error: ${msg}</td></tr>`;
}