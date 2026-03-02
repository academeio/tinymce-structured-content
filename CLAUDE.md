# CLAUDE.md

## Project: tinymce-structured-content

TinyMCE 7 plugin for structured content templates. Modular TypeScript, bundled via Rollup.

## Commands

- `npm run build` — build dist/plugin.js
- `npm test` — run Vitest tests
- `npm run dev` — watch mode

## Architecture

- `src/plugin.ts` — entry point, TinyMCE PluginManager registration
- `src/types.ts` — TypeScript interfaces (Template, Category, StructuredContentConfig)
- `src/browser.ts` — template browser modal UI
- `src/placeholders.ts` — placeholder field system (rendering, Tab navigation, cleanup)
- `src/insertion.ts` — template insertion logic (variable replacement, cursor/document mode)
- `src/styles.ts` — CSS injection for placeholders and modal

## Design

See ~/Development/eportfolios/docs/plans/01-03-2026-tinymce-structured-content-design.md

## Validation (v0.2.0)

- `validation: 'warn' | 'none'` config option (default `'none'`)
- `getUnresolvedRequired(doc)` — returns unresolved required fields
- `isTemplateComplete(doc)` — true when all required fields resolved
- `highlightUnresolved(doc)` — adds `.tmpl-field-error` class
- `clearValidationErrors(doc)` — removes error styling
- `showValidationToast(doc, count)` — notification toast, auto-dismiss 5s
- In warn mode, `BeforeGetContent` event triggers validation automatically

## Typed Placeholders (v0.3.0)

- `data-type="date|select|number"` attribute on `tmpl-field` spans
- `data-options="A|B|C"` for select fields (pipe-separated)
- `data-min="1" data-max="5"` for number fields
- Click typed field → popover with native input in parent page
- `openPopover(doc, field)` / `closePopover(doc)` — widget API
- Number fields validate range on resolve, show inline error
- `src/widgets.ts` — popover rendering and styles

## Placeholder Linking (v0.4.0)

- Fields with the same `data-field` name are linked — filling one auto-fills all others
- First-fill only: after propagation, each field is independent
- `resolveField(field, fields?)` — optional second param enables linking
- Linked fields get `data-linked` attribute and green-tinted background
- `data-linked` is stripped on resolve (along with all other data attributes)
