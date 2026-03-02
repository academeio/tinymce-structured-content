# Phase 1: Required Field Validation — Design Document

**Created:** 02-03-2026
**Status:** APPROVED
**Version target:** v0.2.0

## Summary

Add validation for required placeholder fields. When `validation: 'warn'` is configured, the plugin highlights unfilled required fields on save and shows a notification — but never blocks content extraction. A public API lets the host app trigger validation independently.

## Decisions

### Save mechanism
ePortfolios uses Pieform, which calls `editor.getContent()` directly. No TinyMCE `submit` event fires. We hook `BeforeGetContent` instead.

### No block mode
The roadmap proposed `validation: 'warn' | 'block' | 'none'`. Block mode is dropped — the plugin informs, the host app enforces. Returning empty content or faking a block would be destructive or misleading. Config becomes `validation: 'warn' | 'none'` (default `'none'`).

### Extend placeholders.ts, not a new module
Validation operates on the same `PlaceholderField` data and DOM elements as the existing placeholder system. ~60 lines of new code doesn't justify a separate module.

## API Surface

Four new exported functions in `placeholders.ts`:

```typescript
/** Returns unresolved fields where data-required="true" */
getUnresolvedRequired(doc: Document): PlaceholderField[]

/** True when every required field has been resolved */
isTemplateComplete(doc: Document): boolean

/** Adds .tmpl-field-error class to unresolved required fields, returns them */
highlightUnresolved(doc: Document): PlaceholderField[]

/** Removes .tmpl-field-error from all fields */
clearValidationErrors(doc: Document): void
```

New config option in `StructuredContentConfig`:
```typescript
validation?: 'warn' | 'none';  // default: 'none'
```

## Validation Styles

Added to `PLACEHOLDER_CSS` in `placeholders.ts`:

```css
.tmpl-field-error {
  background: #fde8e8;
  border: 1px solid #d9534f;
  border-left: 3px solid #d9534f;
  animation: sc-shake 0.3s ease-in-out;
}

@keyframes sc-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}
```

Red background + border replaces the normal blue badge. Shake animation runs once to draw attention.

## BeforeGetContent Hook

Registered in `activatePlaceholders()` when `config.validation === 'warn'`:

1. `editor.on('BeforeGetContent')` fires
2. Call `getUnresolvedRequired(doc)`
3. If unfilled required fields exist:
   - `highlightUnresolved(doc)` — adds `.tmpl-field-error`
   - Focus first unfilled required field
   - Show notification toast
4. If all complete: `clearValidationErrors(doc)` — cleans up stale error state

Content always returns normally. This is visual feedback only.

## Notification Toast

Lightweight DOM element in the editor iframe:

- Positioned fixed, top-centre of editor iframe
- Class `sc-validation-toast` — styled in `PLACEHOLDER_CSS`
- Text: "N required field(s) need to be filled"
- Auto-dismisses after 5 seconds or when a `.tmpl-field` receives focus
- Idempotent — only one toast visible at a time

## Signature Change

```typescript
// Before
activatePlaceholders(editor: any): void

// After
activatePlaceholders(editor: any, config?: StructuredContentConfig): void
```

Optional parameter — backward compatible. Call site in `browser.ts` already has `config`.

## Files Changed

| File | Change |
|------|--------|
| `src/placeholders.ts` | Add 4 validation functions, error CSS, toast, BeforeGetContent hook |
| `src/types.ts` | Add `validation?: 'warn' \| 'none'` to `StructuredContentConfig` |
| `src/browser.ts` | Pass `config` to `activatePlaceholders()` |
| `test/placeholders.test.ts` | Add validation test cases |

## Test Plan

- `getUnresolvedRequired()` — finds only required + unresolved fields
- `isTemplateComplete()` — true when all required resolved, true when no required fields exist
- `highlightUnresolved()` — adds `.tmpl-field-error` class to correct elements
- `clearValidationErrors()` — removes `.tmpl-field-error` from all elements
- Edge cases: no template in editor, zero required fields, all fields already resolved
- Toast creation and idempotency
