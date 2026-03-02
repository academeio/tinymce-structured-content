# Phase 4: Group & Personal Templates — Design Document

**Created:** 03-03-2026
**Status:** APPROVED
**Version target:** v0.5.0

## Summary

Add template authoring UI and scoped template browsing to the plugin. Users can create templates with a full authoring modal (editor + placeholder insertion + live preview). Template browser gains scope tabs (My Templates / Group / Site). All persistence is delegated to the host app via callbacks — plugin-side only, no backend changes.

## Decisions

### Plugin-side only
No ePortfolios backend changes in this phase. The plugin provides UI; the host app handles persistence via `onSave` callback and scoped filtering via `fetch(query, scope)`.

### Full authoring UI
Dedicated authoring modal with TinyMCE editor instance, "Insert Placeholder" toolbar button + dialog, metadata fields, live preview, and scope selection. Not a simple export flow.

### Toolbar button + dialog for placeholder insertion
"Insert Placeholder" button in the authoring editor toolbar opens a dialog to configure field name, type, required, options (select), min/max (number). Inserts a `<span class="tmpl-field" ...>` at cursor.

### Separate authoring modal
Authoring lives in its own modal, not inside the browser. Keeps browsing and authoring concerns separated. Opened via "Create Template" button in the browser modal footer.

### Scope tabs in browser
Template browser gains scope filter tabs when `config.scopes` has 2+ entries. Fetch callback receives scope parameter.

### Create Template button in modal footer
"Create Template" button is in the browser modal footer — visible only when `config.enableAuthoring` is true. Staff get it; students don't. Host app controls via config.

## Config API Extensions

```typescript
export interface StructuredContentConfig {
  // ... existing fields ...
  fetch?: (query?: string, scope?: 'personal' | 'group' | 'site') => Promise<FetchResult>;
  onSave?: (template: TemplateDraft, scope: 'personal' | 'group') => Promise<{ id: string }>;
  enableAuthoring?: boolean;  // show "Create Template" button, default false
  scopes?: ('personal' | 'group' | 'site')[];  // which scope tabs to show, default ['site']
}

export interface TemplateDraft {
  title: string;
  description: string;
  content: string;   // HTML with tmpl-field spans
  category: string;
}
```

- `fetch` gains optional `scope` parameter — host app filters accordingly
- `onSave` called when user saves from authoring modal — host app persists
- `enableAuthoring` controls "Create Template" button visibility
- `scopes` controls which tabs appear (single scope = no tab bar)

## Template Browser Changes

```
┌─────────────────────────────────────────────────┐
│  [ My Templates ] [ Group ] [ Site ]            │
├──────────┬──────────────────────────────────────┤
│ Categories│  Template cards...                  │
│           │                                      │
│ All       │                                      │
│ CBME      │                                      │
│ Layout    │                                      │
├──────────┴──────────────────────────────────────┤
│                          [+ Create Template]    │
└─────────────────────────────────────────────────┘
```

- Scope tabs at top — rendered from `config.scopes`, only shown when 2+ scopes
- Clicking a tab calls `fetch(query, scope)` and re-renders template list
- Footer bar — only rendered when `config.enableAuthoring` is true
- "Create Template" button right-aligned in footer — closes browser, opens authoring modal

## Authoring Modal

```
┌─────────────────────────────────────────────────────────┐
│  Create Template                              [ Close ] │
├─────────────────────────┬───────────────────────────────┤
│  Title: [____________]  │                               │
│  Description: [______]  │        Live Preview           │
│  Category: [dropdown_]  │                               │
│                         │   (renders the template as    │
│  ┌─────────────────┐    │    it would appear in the     │
│  │ Editor toolbar   │    │    editor, with styled        │
│  │ [Insert Field]   │    │    placeholder fields)        │
│  ├─────────────────┤    │                               │
│  │                 │    │                               │
│  │  TinyMCE editor │    │                               │
│  │  instance       │    │                               │
│  │                 │    │                               │
│  └─────────────────┘    │                               │
├─────────────────────────┴───────────────────────────────┤
│  Scope: (•) Personal  ( ) Group          [ Save ]       │
└─────────────────────────────────────────────────────────┘
```

### Left pane
- Metadata: title (text input), description (text area), category (dropdown — populated from existing categories in fetch result)
- TinyMCE editor instance for writing template content
- "Insert Placeholder" toolbar button

### Right pane
- Live preview: renders editor content with PLACEHOLDER_CSS applied
- Updates on editor change (debounced)

### Footer
- Scope radio buttons: Personal / Group (only scopes from `config.scopes` minus 'site')
- Save button: calls `config.onSave(draft, scope)`

### Insert Placeholder Dialog

Uses TinyMCE's `editor.windowManager.open`:

- Field name (text input)
- Type (dropdown: text / date / select / number)
- Required (checkbox)
- Options (text input, pipe-separated — conditionally shown when type is "select")
- Min / Max (number inputs — conditionally shown when type is "number")

On confirm: inserts `<span class="tmpl-field" data-field="name" data-type="type" data-required="true" data-options="A|B|C">placeholder text</span>` at cursor.

## New Files

| File | Purpose |
|------|---------|
| `src/authoring.ts` | Authoring modal: editor setup, placeholder dialog, save flow |
| `src/authoring-styles.ts` | CSS for authoring modal (same pattern as styles.ts) |
| `test/authoring.test.ts` | Authoring modal tests |

## Modified Files

| File | Change |
|------|--------|
| `src/types.ts` | Add `TemplateDraft`, `onSave`, `enableAuthoring`, `scopes`; update `fetch` signature |
| `src/browser.ts` | Add scope tabs, footer with "Create Template" button |
| `src/styles.ts` | Add scope tab CSS, footer CSS |
| `src/plugin.ts` | Register authoring modal opener |
| `test/browser.test.ts` | Tests for scope tabs and footer |

## Test Plan

**Config/types:**
- `TemplateDraft` interface matches spec
- `enableAuthoring`, `scopes`, `onSave` accepted in config

**Browser scope tabs:**
- Scope tabs render when `scopes` has 2+ entries
- No tab bar when single scope
- Active tab changes on click
- `fetch` called with scope parameter on tab click
- Footer with "Create Template" renders when `enableAuthoring` is true
- Footer hidden when `enableAuthoring` is false/omitted

**Authoring modal:**
- Modal opens and renders editor + preview + metadata fields
- Insert Placeholder dialog produces correct `tmpl-field` span HTML
- Conditional fields: options shown only for select, min/max shown only for number
- Live preview updates on editor content change
- Save button calls `onSave` with correct `TemplateDraft` and scope
- Close button removes modal

**Integration:**
- "Create Template" in browser footer opens authoring modal
- Full flow: create template → save → callback receives correct data
