# Phase 2: Typed Placeholders — Design Document

**Created:** 02-03-2026
**Status:** APPROVED
**Version target:** v0.3.0

## Summary

Replace plain text placeholders with typed input widgets (date picker, dropdown, number). Users click a typed field to open a popover with a native input. Value selection resolves the field.

## Decisions

### Popover in parent page DOM
Typed fields live inside TinyMCE's editor iframe, but the popover renders in the parent page `document.body`. Avoids iframe clipping/z-index issues. Same pattern as TinyMCE's own inline toolbars. Position calculated from iframe offset + field bounding rect.

### Native browser inputs
Date uses `<input type="date">`, select uses `<select>`, number uses `<input type="number">`. Zero dependencies, accessible, consistent.

### Validate on resolve only
Type-specific validation (date is valid, number in range) happens when the popover closes — not at save time. Phase 1's unresolved-required-field check at save time already covers unresolved typed fields. No changes needed to the BeforeGetContent hook.

### New widgets.ts module
Popover/widget logic is distinct from placeholder field management. `placeholders.ts` stays focused on field lifecycle; `widgets.ts` handles typed interaction UI.

## Extended PlaceholderField Type

```typescript
export interface PlaceholderField {
  element: HTMLElement;
  name: string;
  defaultText: string;
  required: boolean;
  resolved: boolean;
  type: 'text' | 'date' | 'select' | 'number';
  options?: string[];   // select type — from data-options="A|B|C"
  min?: number;         // number type
  max?: number;         // number type
}
```

`findPlaceholderFields` reads from DOM attributes:
- `data-type` → `type` (defaults to `'text'` if absent — backward compatible)
- `data-options` → split on `|` into `options[]`
- `data-min` / `data-max` → parse as numbers

## Template Authoring Format

```html
<span class="tmpl-field" data-field="date" data-type="date" data-required="true">Select date</span>
<span class="tmpl-field" data-field="supervision" data-type="select" data-options="Direct|Indirect|Distant">Level</span>
<span class="tmpl-field" data-field="score" data-type="number" data-min="1" data-max="5">Score</span>
<span class="tmpl-field" data-field="notes">Add notes</span>  <!-- plain text, no data-type -->
```

## Popover System

### Module Interface

```typescript
// widgets.ts
export function openPopover(editor: any, field: PlaceholderField): void;
export function closePopover(): void;
export function injectWidgetStyles(): void;
```

### Behavior
- Single popover container — only one open at a time
- Positioned below the field; flips above if insufficient space
- Contents vary by type:
  - **date:** `<input type="date">` — on change, resolve and dismiss
  - **select:** `<select>` with options — on change, resolve and dismiss
  - **number:** `<input type="number" min max>` — on change, validate range; if invalid show inline error; if valid, resolve and dismiss
- Dismissal: Escape or click-outside closes without resolving

### Value Flow
1. User clicks typed `tmpl-field` in editor
2. `widgets.openPopover(editor, field)` renders popover in parent page
3. User interacts with native input
4. On valid value: set `field.element.textContent`, call `resolveField(field)`
5. Popover dismisses

## Click Handler Integration

Wired up in `activatePlaceholders`:
- For each field with `type !== 'text'`, register a click handler on the field element
- Click handler calls `openPopover(editor, field)`
- Tab navigation still works (Tab selects the field, user clicks to open popover)
- Tab does NOT auto-open popovers

## Visual Indicators

### Typed fields (editor iframe CSS)
```css
.tmpl-field[data-type="date"],
.tmpl-field[data-type="select"],
.tmpl-field[data-type="number"] {
  cursor: pointer;
  border-style: solid;
}
```

Solid border (vs. dashed for text) + pointer cursor signals "click me".

### Popover (parent page CSS)
```css
.sc-popover {
  position: absolute;
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 8px 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 100001;
}
.sc-popover input,
.sc-popover select {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
}
.sc-popover-error {
  color: #d9534f;
  font-size: 0.8rem;
  margin-top: 4px;
}
```

## Files Changed

| File | Change |
|------|--------|
| `src/types.ts` | Add `type`, `options`, `min`, `max` to `PlaceholderField` |
| `src/placeholders.ts` | Parse new attributes in `findPlaceholderFields`, add typed field CSS, wire click handlers in `activatePlaceholders` |
| `src/widgets.ts` | **New** — popover system: `openPopover`, `closePopover`, `injectWidgetStyles` |
| `test/placeholders.test.ts` | Tests for extended `findPlaceholderFields` |
| `test/widgets.test.ts` | **New** — popover rendering, value binding, dismissal, positioning |

## Test Plan

- `findPlaceholderFields` — parses `data-type`, `data-options`, `data-min`, `data-max`; defaults to `'text'`
- `openPopover` — creates correct input type per field type
- select popover — renders options from `field.options[]`
- number popover — respects min/max, rejects out-of-range values
- `closePopover` — removes popover from DOM
- value binding — selecting a value updates field text content
- resolve integration — after value selection, field is resolved
- positioning — popover gets correct style.top/left (mocked rects)
- dismissal — Escape closes without resolving, click-outside closes without resolving
