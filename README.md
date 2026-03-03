# tinymce-structured-content

A TinyMCE 7 plugin for structured content templates — template browsing, typed placeholder fields, validation, authoring, versioning, and analytics.

Built for [ePortfolios](https://github.com/academeio/eportfolios) CBME (Competency-Based Medical Education) workflows where clinical encounter logs, assessment forms, and reflection templates require structured data entry with quality guarantees.

## Features

- **Template browser** — modal with category sidebar, search, and live HTML preview
- **Placeholder fields** — `<span class="tmpl-field">` elements with Tab/Shift+Tab navigation
- **Typed fields** — date pickers, dropdowns, number inputs with range validation
- **Field linking** — same-name fields auto-fill across the document
- **Required field validation** — warn mode highlights unresolved fields on save
- **Template authoring** — visual block-based builder for non-technical users
- **Template versioning** — detects outdated templates, offers in-place migration
- **Analytics hooks** — insertion and submission events with field completion metrics

## Quick Start

```javascript
tinymce.init({
  selector: '#editor',
  external_plugins: {
    structuredcontent: '/path/to/plugin.js'
  },
  structuredcontent: {
    fetch: async (query, scope) => {
      const res = await fetch(`/api/templates?q=${query || ''}&scope=${scope || ''}`);
      return res.json(); // { templates: [...], categories: [...] }
    },
    insertMode: 'both'
  }
});
```

## Configuration

All options are passed under the `structuredcontent` key in TinyMCE init config.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fetch` | `(query?, scope?) => Promise<FetchResult>` | — | Async callback to load templates and categories |
| `templates` | `Template[]` | — | Static template list (alternative to `fetch`) |
| `insertMode` | `'cursor' \| 'document' \| 'both'` | `'cursor'` | How templates are inserted into the editor |
| `variables` | `Record<string, string>` | — | Key-value pairs for `{{variable}}` substitution |
| `validation` | `'warn' \| 'none'` | `'none'` | Validate required fields on `BeforeGetContent` |
| `enableAuthoring` | `boolean` | `false` | Show "Create Template" button in browser modal |
| `scopes` | `('personal' \| 'group' \| 'site')[]` | — | Scope tabs in template browser (2+ shows tab bar) |
| `onSave` | `(template, scope) => Promise<{id}>` | — | Callback to persist authored templates |
| `checkVersion` | `(templateId, version) => Promise<VersionCheckResult \| null>` | — | Check for newer template versions |
| `onAnalyticsEvent` | `(event: AnalyticsEvent) => void` | — | Receive insertion and submission analytics events |
| `modalTitle` | `string` | `'Structured Content'` | Browser modal title |
| `strings` | `Record<string, string>` | — | UI string overrides for i18n |

## Template Format

Templates are HTML with placeholder fields marked by `tmpl-field` spans:

```html
<div class="sc-template">
  <h3>Clinical Encounter</h3>
  <div class="sc-field-row">
    <label>Date</label>
    <span class="tmpl-field" data-field="date" data-type="date" data-required="true">Select date</span>
  </div>
  <div class="sc-field-row">
    <label>Supervision Level</label>
    <span class="tmpl-field" data-field="supervision" data-type="select"
          data-options="Direct,Indirect,Distant" data-required="true">Choose level</span>
  </div>
  <div class="sc-field-row">
    <label>Score</label>
    <span class="tmpl-field" data-field="score" data-type="number"
          data-min="1" data-max="5">Enter score</span>
  </div>
</div>
```

### Field Attributes

| Attribute | Values | Description |
|-----------|--------|-------------|
| `data-field` | string | Field identifier (used for linking and analytics) |
| `data-type` | `text \| date \| select \| number` | Input widget type |
| `data-required` | `"true"` | Mark as required for validation |
| `data-options` | `"A,B,C"` | Comma-separated options for select fields |
| `data-min` / `data-max` | number | Range bounds for number fields |

## Template Builder

When `enableAuthoring` is enabled, the "Create Template" button opens a visual builder with:

- **Component palette** — click to add: Heading, Paragraph, Text Field, Date Field, Select Field, Number Field
- **Inline editing** — expand a block to edit properties (label, name, placeholder, options, required)
- **Auto-slug** — label automatically derives a snake_case field name
- **Live preview** — HTML output updates as you build
- **Reorder / delete** — up/down buttons and delete per block

The builder uses a JSON block model internally and generates template HTML via `modelToHTML()` for storage.

## Validation

Set `validation: 'warn'` to highlight unresolved required fields when the editor content is retrieved (e.g. on form save):

```javascript
structuredcontent: {
  validation: 'warn',
  // ...
}
```

In warn mode, a toast notification shows the count of unresolved fields and each field gets a red error highlight with shake animation.

## Analytics

Provide an `onAnalyticsEvent` callback to receive:

- **`template_inserted`** — fired after a template is inserted (includes template ID, insertion mode, field counts)
- **`template_submitted`** — fired on `BeforeGetContent` (includes `TemplateMetrics` with completion percentage and per-field breakdown)

```javascript
structuredcontent: {
  onAnalyticsEvent: (event) => {
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify(event)
    });
  }
}
```

## Development

```bash
npm install
npm test          # run Vitest tests (155 tests)
npm run build     # build dist/plugin.js via Rollup
npm run dev       # watch mode
```

### Architecture

| File | Purpose |
|------|---------|
| `src/plugin.ts` | Entry point — TinyMCE PluginManager registration |
| `src/types.ts` | TypeScript interfaces |
| `src/browser.ts` | Template browser modal |
| `src/placeholders.ts` | Placeholder field system + validation |
| `src/insertion.ts` | Template insertion (variable substitution, cursor/document mode) |
| `src/widgets.ts` | Typed field popovers (date, select, number) |
| `src/authoring.ts` | Template authoring modal |
| `src/versioning.ts` | Version check, banner, migration |
| `src/analytics.ts` | Analytics event firing and metrics |
| `src/builder.ts` | Block model logic (autoSlug, createBlock, modelToHTML) |
| `src/builder-ui.ts` | Visual builder UI (palette, canvas, inline editing) |
| `src/styles.ts` | Modal + placeholder CSS |
| `src/builder-styles.ts` | Builder CSS |
| `src/authoring-styles.ts` | Authoring CSS |
| `src/utils.ts` | Shared utilities (escapeHtml) |

## ePortfolios Integration

This plugin is integrated into [ePortfolios](https://github.com/academeio/eportfolios) (Mahara fork):

- Plugin bundle: `js/tinymce/plugins/structuredcontent/plugin.js`
- TinyMCE config: `lib/web.php` (search for `structuredcontent`)
- Template API: `json/structuredcontent.json.php` (fetch + save endpoints)
- Template storage: `lib/contenttemplates.php` (`content_template` table)

## License

GPL-3.0-or-later

Copyright (C) 2026 Academe Research, Inc.
