/**
 * popup.js - Logic for the popup interface of JSONL Viewer extension
 *
 * Copyright (c) 2025 Suheel Athamneh
 * Author: Suheel Athamneh
 */
document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const fileInput = document.getElementById('fileInput');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const recordCounter = document.getElementById('recordCounter');
  const jsonDisplay = document.getElementById('jsonDisplay');
  
  // State variables
  let records = [];
  let currentIndex = -1;
  
  // Check if there's any saved data in storage
  chrome.storage.local.get(['jsonlRecords', 'currentIndex'], (result) => {
    if (result.jsonlRecords && result.jsonlRecords.length > 0) {
      records = result.jsonlRecords;
      currentIndex = result.currentIndex || 0;
      updateUI();
    }
  });
  
  // File input event listener
  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        // Split file by newlines and parse each line as JSON
        const content = e.target.result;
        records = content.split('\n')
          .filter(line => line.trim() !== '')
          .map((line, index) => {
            try {
              return JSON.parse(line);
            } catch (err) {
              console.error(`Error parsing line ${index + 1}:`, err);
              return { error: `Invalid JSON on line ${index + 1}`, rawContent: line };
            }
          });
        
        // Reset current index and update UI
        currentIndex = records.length > 0 ? 0 : -1;
        
        // Save to storage
        chrome.storage.local.set({ 
          jsonlRecords: records,
          currentIndex: currentIndex
        });
        
        updateUI();
      } catch (err) {
        console.error('Error processing file:', err);
        jsonDisplay.textContent = `Error processing file: ${err.message}`;
      }
    };
    
    reader.onerror = (e) => {
      console.error('Error reading file:', e);
      jsonDisplay.textContent = 'Error reading file.';
    };
    
    reader.readAsText(file);
  });
  
  // Navigation buttons event listeners
  prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      chrome.storage.local.set({ currentIndex: currentIndex });
      updateUI();
    }
  });
  
  nextBtn.addEventListener('click', () => {
    if (currentIndex < records.length - 1) {
      currentIndex++;
      chrome.storage.local.set({ currentIndex: currentIndex });
      updateUI();
    }
  });
  
  // Update the UI based on current state
  function updateUI() {
    if (records.length === 0) {
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      recordCounter.textContent = 'No file loaded';
      jsonDisplay.textContent = 'No record to display';
      return;
    }
    
    // Update buttons state
    prevBtn.disabled = currentIndex <= 0;
    nextBtn.disabled = currentIndex >= records.length - 1;
    
    // Update record counter
    recordCounter.textContent = `Record ${currentIndex + 1} of ${records.length}`;
    
    // Display the current record
    const currentRecord = records[currentIndex];
    jsonDisplay.textContent = JSON.stringify(currentRecord, null, 2);
  }
});