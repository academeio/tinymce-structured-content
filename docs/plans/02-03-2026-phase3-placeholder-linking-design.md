# Phase 3: Placeholder Linking — Design Document

**Created:** 02-03-2026
**Status:** APPROVED
**Version target:** v0.4.0

## Summary

When the same `data-field` name appears on multiple placeholder fields, filling one auto-fills all others. First-fill only — once linked fields resolve, subsequent edits are independent.

## Decisions

### Enhance resolveField (not a new module)
Linking logic lives inside the existing `resolveField` flow. When a field resolves, it walks the DOM to find siblings with the same `data-field` name and resolves them too. ~40 lines, no new module.

### First-fill only
Only the first resolve propagates. After propagation, siblings lose their `data-field` attribute (stripped by `resolveField`), so they can't be found by subsequent lookups. Each field is independent after resolution.

### Same-name regardless of type
Fields link by `data-field` name only. A text field and a select field with the same name will sync. Type only affects the input widget, not linking.

### Subtle CSS indicator
Linked fields get a `data-linked` attribute and a green-tinted background to distinguish them from standalone fields. The attribute is set in `activatePlaceholders` for any `data-field` name appearing 2+ times.

## Linking Mechanism

### resolveField enhancement

When `resolveField(field)` is called and the field's text has changed from its default:

1. Read `data-field` name from `field.element` (before stripping attributes)
2. Get the document via `field.element.ownerDocument`
3. Query all `.tmpl-field[data-field="<same-name>"]` elements (excludes the current field since it's about to lose `.tmpl-field`)
4. For each sibling element: set `textContent` to the resolved value, remove `tmpl-field` class and all `data-*` attributes, find the corresponding `PlaceholderField` object and mark `resolved: true`

### Challenge: finding PlaceholderField objects for siblings

`resolveField` currently only receives a single `PlaceholderField`. To mark siblings as resolved in the fields array, we need access to the full fields list. Two options:

**Option A:** `resolveField` only updates the DOM (text + attribute removal). The `fields` array objects for siblings stay `resolved: false` until `getNextField`/`getUnresolvedRequired` re-check the DOM. This is fragile — the field object says unresolved but the DOM element has no `tmpl-field` class.

**Option B (chosen):** Pass the full `fields` array to `resolveField`. Signature becomes `resolveField(field, fields?)`. When `fields` is provided, find siblings in the array by matching `data-field` name and update both DOM and object state. When `fields` is omitted (backward compat), only the single field resolves (current behavior).

## CSS Indicator

```css
.tmpl-field[data-linked] {
  background: #e0f0e8;
  border-color: #6ab089;
}
```

Green-tinted background signals "connected to other fields." `data-linked` attribute is:
- Set by `activatePlaceholders` for any `data-field` name appearing 2+ times
- Stripped by `resolveField` (along with all other `data-*` attributes)

## Integration

No changes to `widgets.ts` or Tab navigation. Typed field popovers call `resolveField`, which now propagates. Tab navigation skips resolved siblings via existing `getNextField` logic. Validation still works — propagated fields are resolved.

## Files Changed

| File | Change |
|------|--------|
| `src/placeholders.ts` | Enhance `resolveField` to propagate to same-name siblings; add `data-linked` CSS; mark linked fields in `activatePlaceholders`; strip `data-linked` in `resolveField` |
| `test/placeholders.test.ts` | Tests for propagation, first-fill, linked CSS, data-linked marking |

## Test Plan

- `resolveField` propagates value to siblings with same `data-field` name
- `resolveField` does NOT propagate to fields with different names
- After propagation, sibling elements have resolved text and lose `tmpl-field` class
- First-fill only: after resolve, siblings are independent (no `data-field` to find)
- `PLACEHOLDER_CSS` contains `data-linked`
- `activatePlaceholders` marks linked fields with `data-linked` attribute
- Fields with unique names do NOT get `data-linked`
- `resolveField` strips `data-linked` on resolve
