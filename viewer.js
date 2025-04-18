/**
 * viewer.js - List-based JSONL Viewer with collapsible records
 *
 * Copyright (c) 2025 Suheel Athamneh
 * Author: Suheel Athamneh
 */
import { getRecord } from './db.js';

// DOM elements
const fileInput = document.getElementById('fileInput');
const recordCounter = document.getElementById('recordCounter');
const listContainer = document.getElementById('listContainer');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

let parserWorker = null;
// Threshold for collapsing long cell content (in characters)
const CELL_COLLAPSE_THRESHOLD = 100;
// Raw lines and indices for search
let lines = [];
let allIndices = [];
let totalRecords = 0;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

function init() {
  fileInput.addEventListener('change', handleFileSelection);
  // Initialize search controls
  if (searchInput && searchBtn) {
    searchInput.disabled = true;
    searchBtn.disabled = true;
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') performSearch();
    });
  }
}

// Handle file selection and trigger parsing
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

// Start parsing in Web Worker
function startParsing(text) {
  // Prepare raw lines for search
  lines = text.split('\n').filter(line => line.trim() !== '');
  totalRecords = lines.length;
  allIndices = [];
  recordCounter.textContent = 'Parsing: 0%';
  clearList();
  if (parserWorker) parserWorker.terminate();
  parserWorker = new Worker('parser.worker.js', { type: 'module' });
  parserWorker.onmessage = handleWorkerMessage;
  parserWorker.postMessage({ text });
}

// Handle messages from parser worker
function handleWorkerMessage(e) {
  const data = e.data;
  if (data.error) {
    showError(data.error);
  } else if (data.progress != null) {
    const pct = Math.floor(data.progress * 100);
    recordCounter.textContent = `Parsing: ${pct}%`;
  } else if (data.done) {
    // Parsing complete
    totalRecords = data.total;
    // Prepare indices array
    allIndices = Array.from({ length: totalRecords }, (_, i) => i);
    recordCounter.textContent = `${totalRecords} record${totalRecords !== 1 ? 's' : ''} loaded`;
    // Populate full list
    clearList();
    populateList(allIndices);
    // Enable search
    if (searchInput && searchBtn) {
      searchInput.disabled = false;
      searchBtn.disabled = false;
    }
  }
}

// Populate the list of records for given indices
function populateList(indices) {
  for (const i of indices) {
    const detail = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = `Record ${i + 1}`;
    detail.appendChild(summary);
    detail.addEventListener('toggle', async () => {
      if (detail.open && !detail._loaded) {
        detail._loaded = true;
        try {
          const record = await getRecord(i);
          renderRecordItem(detail, record);
        } catch (err) {
          const pre = document.createElement('pre');
          pre.textContent = `Error loading record: ${err.message}`;
          detail.appendChild(pre);
        }
      }
    });
    listContainer.appendChild(detail);
  }
}

// Clear the list container
function clearList() {
  listContainer.innerHTML = '';
}

// Render a single record inside a details element
function renderRecordItem(detail, record) {
  const flat = flatten(record);
  const fields = Object.keys(flat).sort();

  // Create table
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const thr = document.createElement('tr');
  fields.forEach(f => {
    const th = document.createElement('th');
    th.textContent = f;
    thr.appendChild(th);
  });
  thead.appendChild(thr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const tr = document.createElement('tr');
  fields.forEach(f => {
    const td = document.createElement('td');
    const val = flat[f];
    // Determine text representation
    let text;
    if (val === null) {
      text = 'null';
      td.classList.add('null-value');
    } else if (typeof val === 'object') {
      text = JSON.stringify(val);
    } else {
      text = String(val);
    }
    // Collapse long content
    if (text.length > CELL_COLLAPSE_THRESHOLD || text.includes('\n')) {
      const wrapper = document.createElement('div');
      wrapper.classList.add('cell-content', 'collapsed');
      wrapper.textContent = text;
      td.appendChild(wrapper);
      const btn = document.createElement('button');
      btn.className = 'toggle-cell';
      btn.textContent = 'Show more';
      btn.addEventListener('click', () => {
        const collapsed = wrapper.classList.toggle('collapsed');
        btn.textContent = collapsed ? 'Show more' : 'Show less';
      });
      td.appendChild(btn);
    } else {
      td.textContent = text;
    }
    tr.appendChild(td);
  });
  tbody.appendChild(tr);
  table.appendChild(tbody);
  // Wrap table and JSON in a collapsible body
  const bodyWrapper = document.createElement('div');
  bodyWrapper.classList.add('record-body', 'collapsed');
  // Append table
  bodyWrapper.appendChild(table);
  // Append raw JSON with syntax highlighting
  const pre = document.createElement('pre');
  pre.innerHTML = syntaxHighlight(record);
  bodyWrapper.appendChild(pre);
  detail.appendChild(bodyWrapper);
  // Add toggle button for expanding/collapsing content
  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = 'Show more';
  toggleBtn.className = 'toggle-content';
  toggleBtn.addEventListener('click', () => {
    const isCollapsed = bodyWrapper.classList.toggle('collapsed');
    toggleBtn.textContent = isCollapsed ? 'Show more' : 'Show less';
  });
  detail.appendChild(toggleBtn);
}

// Flatten nested objects into dot-notation keys
function flatten(obj, prefix = '', res = {}) {
  if (obj !== null && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const key in obj) {
      const val = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        flatten(val, newKey, res);
      } else {
        res[newKey] = val;
      }
    }
  } else {
    res[prefix] = obj;
  }
  return res;
}

// Syntax highlight JSON string using span classes
function syntaxHighlight(json) {
  let str = typeof json !== 'string'
    ? JSON.stringify(json, null, 2)
    : json;
  str = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return str.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    match => {
      let cls = 'number';
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'key' : 'string';
      } else if (/true|false/.test(match)) {
        cls = 'boolean';
      } else if (/null/.test(match)) {
        cls = 'null';
      }
      return `<span class="${cls}">${match}</span>`;
    });
}

// Display an error message
function showError(msg) {
  recordCounter.textContent = `Error: ${msg}`;
  clearList();
  const div = document.createElement('div');
  div.textContent = `Error: ${msg}`;
  listContainer.appendChild(div);
}
/**
 * Perform search on loaded lines and update the list
 */
function performSearch() {
  const term = searchInput.value.trim().toLowerCase();
  if (!term) {
    // Reset to full list
    recordCounter.textContent = `${totalRecords} record${totalRecords !== 1 ? 's' : ''} loaded`;
    clearList();
    populateList(allIndices);
    return;
  }
  // Filter indices where raw line contains term
  const matches = allIndices.filter(i => lines[i].toLowerCase().includes(term));
  recordCounter.textContent = `${matches.length} of ${totalRecords} record${matches.length !== 1 ? 's' : ''} match`;
  clearList();
  populateList(matches);
}