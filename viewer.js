/**
 * JSONL Viewer - A Chrome extension for viewing JSONL files in a tabular format
 * 
 * This file contains the main logic for the JSONL Viewer extension.
 * It handles loading JSONL files, parsing them, and displaying the records
 * in a table format with navigation controls.
 */

// Use strict mode to catch common JavaScript pitfalls
'use strict';

/**
 * Main module for the JSONL Viewer
 */
(function() {
  // DOM Elements
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

  // State management
  const state = {
    records: [],
    filteredRecords: [],
    currentIndex: -1,
    allFields: new Set(),
    isLoading: false
  };

  // Constants
  const STORAGE_KEYS = {
    RECORDS: 'jsonlRecords',
    CURRENT_INDEX: 'currentIndex'
  };

  const ERROR_MESSAGES = {
    PARSE_ERROR: 'Error parsing JSON line',
    FILE_READ_ERROR: 'Error reading file',
    PROCESSING_ERROR: 'Error processing file',
    NO_RECORDS: 'No records found',
    INVALID_RECORD: 'Invalid record'
  };

  /**
   * Initialize the application
   */
  function init() {
    // Load data from storage
    loadFromStorage();
    
    // Set up event listeners
    setupEventListeners();
  }

  /**
   * Load saved data from Chrome storage
   */
  function loadFromStorage() {
    try {
      chrome.storage.local.get([STORAGE_KEYS.RECORDS, STORAGE_KEYS.CURRENT_INDEX], (result) => {
        if (result[STORAGE_KEYS.RECORDS] && result[STORAGE_KEYS.RECORDS].length > 0) {
          state.records = result[STORAGE_KEYS.RECORDS];
          state.filteredRecords = [...state.records];
          state.currentIndex = result[STORAGE_KEYS.CURRENT_INDEX] || 0;
          extractAllFields();
          updateUI();
        }
      });
    } catch (error) {
      console.error('Error loading from storage:', error);
      // Continue without storage data
    }
  }

  /**
   * Set up all event listeners
   */
  function setupEventListeners() {
    // File selection
    elements.fileInput.addEventListener('change', handleFileSelection);
    
    // Navigation
    elements.prevBtn.addEventListener('click', navigateToPrevious);
    elements.nextBtn.addEventListener('click', navigateToNext);
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboardNavigation);
    
    // Search
    elements.searchBtn.addEventListener('click', performSearch);
    elements.searchInput.addEventListener('keyup', event => {
      if (event.key === 'Enter') {
        performSearch();
      }
    });
    
    // Accessibility - make file input label keyboard accessible
    const fileLabel = document.querySelector('label[for="fileInput"]');
    if (fileLabel) {
      fileLabel.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          elements.fileInput.click();
        }
      });
    }
  }

  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} event - The keyboard event
   */
  function handleKeyboardNavigation(event) {
    // Only respond to keyboard events when not in an input field
    if (event.target.tagName === 'INPUT') return;
    
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      if (!elements.prevBtn.disabled) {
        navigateToPrevious();
      }
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      if (!elements.nextBtn.disabled) {
        navigateToNext();
      }
    }
  }

  /**
   * Handle file selection
   * @param {Event} event - The file input change event
   */
  function handleFileSelection(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check if it's a JSONL file
    if (!file.name.endsWith('.jsonl') && !file.name.endsWith('.json')) {
      showError('File must have a .jsonl or .json extension');
      return;
    }
    
    loadFile(file);
  }

  /**
   * Load and process a JSONL file
   * @param {File} file - The file to load
   */
  function loadFile(file) {
    const reader = new FileReader();
    state.isLoading = true;
    updateUIForLoading(true);
    
    reader.onload = event => {
      try {
        processFileContent(event.target.result);
      } catch (error) {
        showError(`${ERROR_MESSAGES.PROCESSING_ERROR}: ${error.message}`);
      } finally {
        state.isLoading = false;
        updateUIForLoading(false);
      }
    };
    
    reader.onerror = () => {
      showError(ERROR_MESSAGES.FILE_READ_ERROR);
      state.isLoading = false;
      updateUIForLoading(false);
    };
    
    reader.readAsText(file);
  }

  /**
   * Process the loaded file content
   * @param {string} content - The file content as text
   */
  function processFileContent(content) {
    // Split by newlines and parse each line
    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    // Parse each line as JSON
    state.records = lines.map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        console.error(`${ERROR_MESSAGES.PARSE_ERROR} ${index + 1}:`, error);
        return { 
          error: `${ERROR_MESSAGES.PARSE_ERROR} on line ${index + 1}`, 
          rawContent: line 
        };
      }
    });
    
    // Reset state
    state.filteredRecords = [...state.records];
    state.currentIndex = state.records.length > 0 ? 0 : -1;
    
    // Extract fields and update UI
    extractAllFields();
    
    // Save to storage
    saveToStorage();
    
    // Update UI
    updateUI();
  }

  /**
   * Show an error message
   * @param {string} message - The error message to display
   */
  function showError(message) {
    console.error(message);
    elements.jsonDisplay.textContent = message;
    elements.tableBody.innerHTML = `<tr><td colspan="${Math.max(1, state.allFields.size)}">Error: ${message}</td></tr>`;
  }

  /**
   * Update UI to show loading state
   * @param {boolean} isLoading - Whether the app is in loading state
   */
  function updateUIForLoading(isLoading) {
    if (isLoading) {
      elements.recordCounter.textContent = 'Loading...';
      elements.jsonDisplay.textContent = 'Loading file...';
      elements.prevBtn.disabled = true;
      elements.nextBtn.disabled = true;
    }
  }

  /**
   * Extract all possible fields from records
   */
  function extractAllFields() {
    state.allFields = new Set();
    
    state.records.forEach(record => {
      if (record && typeof record === 'object') {
        Object.keys(record).forEach(key => state.allFields.add(key));
      }
    });
  }

  /**
   * Save current state to Chrome storage
   */
  function saveToStorage() {
    try {
      chrome.storage.local.set({ 
        [STORAGE_KEYS.RECORDS]: state.records,
        [STORAGE_KEYS.CURRENT_INDEX]: state.currentIndex
      });
    } catch (error) {
      console.error('Error saving to storage:', error);
      // Continue without saving to storage
    }
  }

  /**
   * Navigate to the previous record
   */
  function navigateToPrevious() {
    if (state.currentIndex > 0) {
      state.currentIndex--;
      saveToStorage();
      updateUI();
    }
  }

  /**
   * Navigate to the next record
   */
  function navigateToNext() {
    if (state.currentIndex < state.filteredRecords.length - 1) {
      state.currentIndex++;
      saveToStorage();
      updateUI();
    }
  }

  /**
   * Perform search on records
   */
  function performSearch() {
    const searchTerm = elements.searchInput.value.trim().toLowerCase();
    
    if (searchTerm === '') {
      // Reset to show all records
      state.filteredRecords = [...state.records];
    } else {
      // Filter records containing the search term
      state.filteredRecords = state.records.filter(record => {
        if (!record || typeof record !== 'object') return false;
        
        try {
          const jsonString = JSON.stringify(record).toLowerCase();
          return jsonString.includes(searchTerm);
        } catch (error) {
          console.error('Error stringifying record for search:', error);
          return false;
        }
      });
    }
    
    // Reset current index and update UI
    state.currentIndex = state.filteredRecords.length > 0 ? 0 : -1;
    updateUI();
  }

  /**
   * Create table header based on all fields
   */
  function createTableHeader() {
    elements.tableHeader.innerHTML = '';
    
    if (state.allFields.size === 0) {
      const th = document.createElement('th');
      th.setAttribute('scope', 'col');
      th.textContent = 'No data available';
      elements.tableHeader.appendChild(th);
      return;
    }
    
    // Convert Set to Array and sort alphabetically
    const fields = Array.from(state.allFields).sort();
    
    fields.forEach(field => {
      const th = document.createElement('th');
      th.setAttribute('scope', 'col');
      th.textContent = field;
      elements.tableHeader.appendChild(th);
    });
  }

  /**
   * Render current record in table
   * @param {Object} record - The record to render
   */
  function renderTableRow(record) {
    elements.tableBody.innerHTML = '';
    
    if (!record || typeof record !== 'object') {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', Math.max(1, state.allFields.size));
      td.textContent = ERROR_MESSAGES.INVALID_RECORD;
      tr.appendChild(td);
      elements.tableBody.appendChild(tr);
      return;
    }
    
    const tr = document.createElement('tr');
    const fields = Array.from(state.allFields).sort();
    
    fields.forEach(field => {
      const td = document.createElement('td');
      const value = record[field];
      
      if (value === undefined) {
        td.textContent = '';
      } else if (value === null) {
        td.textContent = 'null';
        td.classList.add('null-value');
      } else if (typeof value === 'object') {
        try {
          td.textContent = JSON.stringify(value);
        } catch (error) {
          td.textContent = '[Complex Object]';
          td.classList.add('complex-value');
        }
      } else {
        td.textContent = String(value);
      }
      
      tr.appendChild(td);
    });
    
    elements.tableBody.appendChild(tr);
  }

  /**
   * Update the UI based on current state
   */
  function updateUI() {
    if (state.filteredRecords.length === 0) {
      elements.prevBtn.disabled = true;
      elements.nextBtn.disabled = true;
      elements.recordCounter.textContent = 'No matching records';
      elements.jsonDisplay.textContent = ERROR_MESSAGES.NO_RECORDS;
      
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', Math.max(1, state.allFields.size));
      td.textContent = ERROR_MESSAGES.NO_RECORDS;
      tr.appendChild(td);
      elements.tableBody.innerHTML = '';
      elements.tableBody.appendChild(tr);
      return;
    }
    
    // Create/update table header
    createTableHeader();
    
    // Update buttons state
    elements.prevBtn.disabled = state.currentIndex <= 0;
    elements.nextBtn.disabled = state.currentIndex >= state.filteredRecords.length - 1;
    
    // Update record counter
    elements.recordCounter.textContent = `Record ${state.currentIndex + 1} of ${state.filteredRecords.length}`;
    
    // Get current record
    const currentRecord = state.filteredRecords[state.currentIndex];
    
    // Display the current record in table
    renderTableRow(currentRecord);
    
    // Display raw JSON with pretty printing
    try {
      elements.jsonDisplay.textContent = JSON.stringify(currentRecord, null, 2);
    } catch (error) {
      elements.jsonDisplay.textContent = 'Error displaying JSON: ' + error.message;
    }
  }

  // Initialize the application when DOM is loaded
  document.addEventListener('DOMContentLoaded', init);
})();