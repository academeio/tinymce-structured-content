# Template Builder — Design Document

**Created:** 03-03-2026
**Status:** APPROVED

## Summary

Replace the embedded TinyMCE editor in the authoring modal with a block-based visual template builder. Non-technical users build templates by clicking components from a palette (Heading, Paragraph, Text Field, Date Field, Select Field, Number Field), configuring them inline, and seeing a live preview. A JSON block model is the source of truth; `modelToHTML()` generates clean template markup for storage.

## Decisions

### JSON model approach
Source of truth is an array of typed block objects. Builder renders from the model, edits update the model, preview and save generate HTML from the model. Clean separation of data and rendering. Model is testable without DOM. Adding new block types later is just adding a new type to the union.

### Click-to-add interaction
Component palette with buttons. Click → append block to canvas. Reorder via up/down arrow buttons. No drag-and-drop (simpler, more reliable, touch-friendly).

### Inline editing
Click a block to expand it and edit properties in-place. One block expanded at a time. No separate side panel or popup dialog.

### Keep live preview
Builder on left, live HTML preview on right. Preview renders `modelToHTML(blocks)` debounced on every change. Shows final template appearance with placeholder field styling.

### Replace existing TinyMCE editor
The Phase 4 authoring modal shell stays (title, description, category, scope selector, save button). Only the editor area is replaced with the builder. The embedded TinyMCE init and placeholder dialog code are removed.

### HTML-only persistence
`modelToHTML()` generates HTML for `TemplateDraft.content`. No JSON model is persisted — HTML is the storage format. The `onSave` callback receives the draft with generated HTML.

## Block Model

```typescript
export type BlockType = 'heading' | 'paragraph' | 'text-field' | 'date-field' | 'select-field' | 'number-field';

export interface HeadingBlock {
  id: string;
  type: 'heading';
  level: 2 | 3 | 4;
  text: string;
}

export interface ParagraphBlock {
  id: string;
  type: 'paragraph';
  text: string;
}

export interface TextFieldBlock {
  id: string;
  type: 'text-field';
  name: string;
  label: string;
  placeholder: string;
  required: boolean;
}

export interface DateFieldBlock {
  id: string;
  type: 'date-field';
  name: string;
  label: string;
  placeholder: string;
  required: boolean;
}

export interface SelectFieldBlock {
  id: string;
  type: 'select-field';
  name: string;
  label: string;
  placeholder: string;
  required: boolean;
  options: string[];
}

export interface NumberFieldBlock {
  id: string;
  type: 'number-field';
  name: string;
  label: string;
  placeholder: string;
  required: boolean;
  min?: number;
  max?: number;
}

export type TemplateBlock = HeadingBlock | ParagraphBlock | TextFieldBlock
  | DateFieldBlock | SelectFieldBlock | NumberFieldBlock;
```

## Builder UI Layout

```
┌─────────────────────────────────────────────────────────┐
│ [Title] [Description] [Category ▼]                      │
├─────────────────────────────┬───────────────────────────┤
│  BUILDER                    │  PREVIEW                  │
│                             │                           │
│  ┌─ Palette ─────────────┐  │  Live HTML render of      │
│  │ +Heading  +Paragraph  │  │  modelToHTML(blocks)      │
│  │ +Text  +Date  +Select │  │  with placeholder styling │
│  │ +Number               │  │                           │
│  └───────────────────────┘  │                           │
│                             │                           │
│  ┌─ Canvas ──────────────┐  │                           │
│  │ Block cards with:     │  │                           │
│  │ - Collapsed: icon,    │  │                           │
│  │   summary, ▲▼✕        │  │                           │
│  │ - Expanded: inline    │  │                           │
│  │   property editors    │  │                           │
│  └───────────────────────┘  │                           │
│                             │                           │
├─────────────────────────────┴───────────────────────────┤
│                    [◉ Personal ○ Group]      [Save]     │
└─────────────────────────────────────────────────────────┘
```

## Behaviour

### Adding blocks
Click palette button → new block with auto-generated id and defaults → appended to model → canvas re-renders with new block expanded → preview updates.

### Editing blocks
Click collapsed block → expands (previous collapses). Inline inputs:
- **All fields:** name (text), label (text), placeholder (text), required (checkbox)
- **Select:** options (comma-separated text input)
- **Number:** min/max (number inputs)
- **Heading:** level (h2/h3/h4 dropdown), text (text input)
- **Paragraph:** text (text input)

### Auto-slug
Label auto-derives name: lowercase, spaces → underscores, strip non-alphanumeric. Stops when user manually edits name.

### Reordering
▲/▼ buttons swap block with neighbour. Disabled at boundaries.

### Deleting
✕ removes block from model. No confirmation.

### Empty state
"Click a component above to start building your template."

### Preview
Right pane renders `modelToHTML(blocks)` debounced 300ms on every model change.

### Saving
`modelToHTML(blocks)` → `TemplateDraft.content` → existing `onSave` callback.

## New Files

| File | Purpose |
|------|---------|
| `src/builder.ts` | Block types, `modelToHTML()`, `createBlock()` factory, auto-slug utility |
| `src/builder-ui.ts` | Builder canvas rendering, palette, inline editing, expand/collapse, reorder |
| `src/builder-styles.ts` | CSS for palette, canvas, block cards, inline editors |
| `test/builder.test.ts` | Model logic and HTML generation tests |
| `test/builder-ui.test.ts` | UI interaction tests |

## Modified Files

| File | Change |
|------|--------|
| `src/authoring.ts` | Replace TinyMCE editor with builder. Import `renderBuilder()`. Wire `onChange` to preview and `toHTML` for save. Remove TinyMCE init and placeholder dialog. |
| `src/authoring-styles.ts` | Remove TinyMCE-specific styles, adjust left pane for builder |
| `src/types.ts` | Add `TemplateBlock` union and individual block interfaces |

## Test Plan

**Model (`builder.ts`):**
- `modelToHTML([])` returns empty `<div class="sc-template"></div>`
- Each block type generates correct HTML
- Attributes: `data-field`, `data-type`, `data-required`, `data-options`, `data-min`, `data-max`
- `createBlock('text-field')` returns block with sensible defaults
- Auto-slug: "Supervisor Name" → "supervisor_name", handles special chars

**UI (`builder-ui.ts`):**
- Click palette button → block appears in canvas
- Click block → expands, previous collapses
- Edit label → model updates, preview refreshes
- Auto-slug populates name from label
- ▲/▼ reorder, disabled at boundaries
- ✕ removes block
- Empty state message when no blocks
- Select field: comma-separated options
- Number field: min/max inputs
- Heading: level dropdown
