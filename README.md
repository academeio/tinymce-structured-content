# tinymce-structured-content

A TinyMCE 7 plugin for structured content templates with placeholder fields, category browsing, and live preview.

## Install

```
npm install @academeio/tinymce-structured-content
```

## Usage

```javascript
tinymce.init({
  external_plugins: {
    structuredcontent: '/path/to/plugin.js'
  },
  structuredcontent: {
    fetch: async () => ({ templates: [...], categories: [...] }),
    insertMode: 'both'
  }
});
```

## License

GPL-3.0-or-later
