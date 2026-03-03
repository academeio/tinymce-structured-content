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

## Group & Personal Templates (v0.5.0)

- `TemplateDraft` interface: `{ title, description, content, category }`
- `enableAuthoring: boolean` — shows "Create Template" button in browser footer
- `scopes: ('personal' | 'group' | 'site')[]` — scope tabs in browser (2+ = tab bar)
- `onSave(template, scope)` — callback for host app to persist templates
- `fetch(query?, scope?)` — gains optional scope parameter
- Authoring modal: TinyMCE editor + Insert Placeholder toolbar + live preview
- `buildPlaceholderSpan(name, type, required, options?, min?, max?)` — generates tmpl-field HTML
- `src/authoring.ts` — authoring modal module
- `src/authoring-styles.ts` — authoring CSS

## Template Versioning (v0.6.0)

- `Template.version?: string` — host-provided version identifier
- `data-template-version` attribute stamped on cursor-mode insertions
- `checkVersion(templateId, currentVersion)` — callback to check for updates
- `VersionCheckResult` — `{ latestVersion, latestTemplate }` returned by callback
- Auto-checks on content load (`SetContent` event, once per session)
- Info banner: "A newer version is available" with Update / Dismiss
- Migration: replaces content, maps unresolved field values by `data-field` name
- `src/versioning.ts` — version check, banner, migration module

## Template Analytics (v1.0.0)

- `onAnalyticsEvent?: (event: AnalyticsEvent) => void` — single callback for all analytics events
- `template_inserted` event — fired after template insertion (includes template ID, title, version, mode, field counts)
- `template_submitted` event — fired on `BeforeGetContent` (includes full `TemplateMetrics`)
- `getTemplateMetrics(editor)` — on-demand field completion snapshot (total, required, resolved, percentage, breakdown)
- `TemplateMetrics`, `FieldMetric`, `TemplateInsertedEvent`, `TemplateSubmittedEvent` interfaces
- `src/analytics.ts` — analytics module
- `data-template-title` attribute stamped on cursor-mode insertions
