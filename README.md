# JSONL Viewer Chrome Extension

A Chrome extension that displays JSONL (JSON Lines) files in a tabular format, with easy navigation and search capabilities.

> **Note:** The current UI layout is a work in progress and may not be fully optimized. We plan to refine and improve it in the near future.

## Features

- Open JSONL files directly in a Chrome tab
- Display records in a table format with all fields as columns
- Navigate through records with Previous/Next buttons
- Search functionality to filter records
- View the raw JSON for the current record
- Persistent storage to remember the last loaded file
- Dark mode support
- Keyboard navigation (arrow keys)
- Accessibility features
- Proper error handling

## Project Structure

```
├── manifest.json       # Extension configuration
├── viewer.html         # Main UI page
├── viewer.css          # Styles
├── viewer.js           # Main application logic
├── background.js       # Background script
└── icons/              # Extension icons
    ├── 16.png          # 16x16 icon
    ├── 48.png          # 48x48 icon
    └── 128.png         # 128x128 icon
```

## Installation

### Local Development

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked" and select the project folder
5. The extension should now be visible in your Chrome toolbar

### Usage

1. Click the JSONL Viewer icon in the Chrome toolbar
2. A new tab will open with the JSONL Viewer interface
3. Click "Choose JSONL file" to select a JSONL file from your computer
4. The first record will be displayed in the table
5. Use the Previous/Next buttons to navigate between records
6. Use the search box to filter records
7. View the raw JSON data at the bottom of the page

## Features Explained

### 1. File Handling

The extension uses the [FileReader API](https://developer.mozilla.org/en-US/docs/Web/API/FileReader) to load JSONL files. Each line is parsed as a separate JSON object.

```javascript
// Sample JSONL file content:
// {"name": "John", "age": 30}
// {"name": "Jane", "age": 25}
// {"name": "Bob", "age": 40}
```

### 2. Tabular Display

The extension automatically extracts all possible fields from the records and creates a table with columns for each field. This gives you a clean, structured view of your data.

### 3. State Management

The extension keeps track of:
- All records from the loaded file
- Currently filtered records (if search is active)
- Current record index
- All possible fields across all records

### 4. Search & Filter

You can search across all JSON fields - the extension will filter records that contain the search term in any field.

### 5. Persistence

The extension saves the loaded records and current position to Chrome's local storage, so you can close and reopen the tab without losing your place.

## Chrome Extension Best Practices

This extension follows Chrome's recommended best practices:

1. **Manifest V3** - Using the latest manifest format for better security and performance
2. **Content Security Policy** - Restricting content sources for better security
3. **Permissions** - Only requesting the minimum permissions needed
4. **ES Modules** - Using proper module structure
5. **Error Handling** - Comprehensive error handling for all operations
6. **Accessibility** - ARIA attributes, keyboard navigation, and screen reader support
7. **Responsive Design** - Works well on different screen sizes
8. **Performance** - Efficient loading and processing of files

## Customization & Enhancement Ideas

- Add syntax highlighting for the JSON display
- Allow exporting filtered results as a new JSONL file
- Add column sorting functionality to the table
- Implement a dark/light theme toggle
- Add support for more file formats (CSV, TSV, etc.)
- Implement pagination for very large files
- Add visualization options for numeric data

## License

This project is open source and available under the [MIT License](LICENSE).
Feel free to use, modify, and distribute it as you wish. Contributions are welcome!

### Author
- Suheel Athamneh (suheel</at/>athamneh.info)