# Phase 1: Required Field Validation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add validation for required placeholder fields — highlight unfilled required fields on save, show a notification, and expose a public API for host app integration.

**Architecture:** Extend `src/placeholders.ts` with 4 validation functions, error CSS, and a notification toast. Hook `BeforeGetContent` for automatic warn-mode validation. Update `src/types.ts` with the `validation` config option. Update `src/browser.ts` to pass config to `activatePlaceholders()`.

**Tech Stack:** TypeScript, Vitest + jsdom for tests, Rollup for build

---

### Task 1: Add `validation` config option to types

**Files:**
- Modify: `src/types.ts:23-30`

**Step 1: Update StructuredContentConfig**

Add the `validation` property to the interface. In `src/types.ts`, change lines 23-30 from:

```typescript
export interface StructuredContentConfig {
  templates?: Template[];
  fetch?: (query?: string) => Promise<FetchResult>;
  insertMode?: 'cursor' | 'document' | 'both';
  variables?: Record<string, string>;
  modalTitle?: string;
  strings?: Record<string, string>;
}
```

to:

```typescript
export interface StructuredContentConfig {
  templates?: Template[];
  fetch?: (query?: string) => Promise<FetchResult>;
  insertMode?: 'cursor' | 'document' | 'both';
  variables?: Record<string, string>;
  modalTitle?: string;
  strings?: Record<string, string>;
  validation?: 'warn' | 'none';
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): add validation config option"
```

---

### Task 2: Add `getUnresolvedRequired` and `isTemplateComplete`

**Files:**
- Modify: `src/placeholders.ts` (add after `resolveField`, before `getNextField` — after line 44)
- Modify: `test/placeholders.test.ts` (add new describe block at end)

**Step 1: Write the failing tests**

Add to the end of `test/placeholders.test.ts`:

```typescript
import {
  findPlaceholderFields,
  resolveField,
  getNextField,
  getPrevField,
  getUnresolvedRequired,
  isTemplateComplete
} from '../src/placeholders';

// ... existing tests ...

describe('getUnresolvedRequired', () => {
  it('returns only required unresolved fields', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="date" data-required="true">Enter date</span>
        <span class="tmpl-field" data-field="notes">Add notes</span>
        <span class="tmpl-field" data-field="name" data-required="true">Enter name</span>
      </div>
    `);
    const result = getUnresolvedRequired(dom.window.document);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('date');
    expect(result[1].name).toBe('name');
  });

  it('excludes resolved required fields', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="date" data-required="true">Enter date</span>
        <span class="tmpl-field" data-field="name" data-required="true">Enter name</span>
      </div>
    `);
    const fields = findPlaceholderFields(dom.window.document);
    // Simulate user editing the first field
    fields[0].element.textContent = 'March 2026';
    resolveField(fields[0]);

    const result = getUnresolvedRequired(dom.window.document);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('name');
  });

  it('returns empty array when no required fields exist', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="notes">Add notes</span>
      </div>
    `);
    expect(getUnresolvedRequired(dom.window.document)).toHaveLength(0);
  });

  it('returns empty array when no placeholders exist', () => {
    const dom = new JSDOM('<div><p>No fields</p></div>');
    expect(getUnresolvedRequired(dom.window.document)).toHaveLength(0);
  });
});

describe('isTemplateComplete', () => {
  it('returns true when all required fields are resolved', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="date" data-required="true">Enter date</span>
      </div>
    `);
    const fields = findPlaceholderFields(dom.window.document);
    fields[0].element.textContent = 'March 2026';
    resolveField(fields[0]);

    expect(isTemplateComplete(dom.window.document)).toBe(true);
  });

  it('returns false when required fields are unresolved', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="date" data-required="true">Enter date</span>
      </div>
    `);
    expect(isTemplateComplete(dom.window.document)).toBe(false);
  });

  it('returns true when no required fields exist', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="notes">Add notes</span>
      </div>
    `);
    expect(isTemplateComplete(dom.window.document)).toBe(true);
  });

  it('returns true when document has no placeholders at all', () => {
    const dom = new JSDOM('<div><p>Plain text</p></div>');
    expect(isTemplateComplete(dom.window.document)).toBe(true);
  });
});
```

**Step 2: Update the import statement**

Change the existing import at the top of `test/placeholders.test.ts` from:

```typescript
import {
  findPlaceholderFields,
  resolveField,
  getNextField,
  getPrevField
} from '../src/placeholders';
```

to:

```typescript
import {
  findPlaceholderFields,
  resolveField,
  getNextField,
  getPrevField,
  getUnresolvedRequired,
  isTemplateComplete
} from '../src/placeholders';
```

**Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `getUnresolvedRequired` and `isTemplateComplete` are not exported

**Step 4: Implement the functions**

In `src/placeholders.ts`, add after `resolveField` (after line 44, before `getNextField`):

```typescript
/** Return all required fields that have not been resolved */
export function getUnresolvedRequired(doc: Document): PlaceholderField[] {
  return findPlaceholderFields(doc).filter((f) => f.required && !f.resolved);
}

/** Check if all required placeholder fields have been resolved */
export function isTemplateComplete(doc: Document): boolean {
  return getUnresolvedRequired(doc).length === 0;
}
```

Note: `findPlaceholderFields` re-scans the DOM each time, so resolved fields (whose `.tmpl-field` class has been stripped by `resolveField`) won't appear in results. This means `getUnresolvedRequired` naturally excludes resolved fields without extra state tracking.

**Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/placeholders.ts test/placeholders.test.ts
git commit -m "feat: add getUnresolvedRequired and isTemplateComplete validation functions"
```

---

### Task 3: Add `highlightUnresolved` and `clearValidationErrors`

**Files:**
- Modify: `src/placeholders.ts` (add after `isTemplateComplete`)
- Modify: `test/placeholders.test.ts` (add new describe blocks at end)

**Step 1: Write the failing tests**

Add to the end of `test/placeholders.test.ts`:

```typescript
import {
  findPlaceholderFields,
  resolveField,
  getNextField,
  getPrevField,
  getUnresolvedRequired,
  isTemplateComplete,
  highlightUnresolved,
  clearValidationErrors
} from '../src/placeholders';

// ... existing tests ...

describe('highlightUnresolved', () => {
  it('adds tmpl-field-error class to unresolved required fields', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="date" data-required="true">Enter date</span>
        <span class="tmpl-field" data-field="notes">Add notes</span>
        <span class="tmpl-field" data-field="name" data-required="true">Enter name</span>
      </div>
    `);
    const result = highlightUnresolved(dom.window.document);
    expect(result).toHaveLength(2);

    const els = dom.window.document.querySelectorAll('.tmpl-field-error');
    expect(els).toHaveLength(2);
    expect(els[0].getAttribute('data-field')).toBe('date');
    expect(els[1].getAttribute('data-field')).toBe('name');
  });

  it('does not add error class to non-required fields', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="notes">Add notes</span>
      </div>
    `);
    highlightUnresolved(dom.window.document);
    expect(dom.window.document.querySelectorAll('.tmpl-field-error')).toHaveLength(0);
  });

  it('returns empty array when all required fields are resolved', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="date" data-required="true">Enter date</span>
      </div>
    `);
    const fields = findPlaceholderFields(dom.window.document);
    fields[0].element.textContent = 'March 2026';
    resolveField(fields[0]);

    expect(highlightUnresolved(dom.window.document)).toHaveLength(0);
  });
});

describe('clearValidationErrors', () => {
  it('removes tmpl-field-error class from all fields', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field tmpl-field-error" data-field="date" data-required="true">Enter date</span>
        <span class="tmpl-field tmpl-field-error" data-field="name" data-required="true">Enter name</span>
      </div>
    `);
    clearValidationErrors(dom.window.document);

    expect(dom.window.document.querySelectorAll('.tmpl-field-error')).toHaveLength(0);
    // Original tmpl-field class should remain
    expect(dom.window.document.querySelectorAll('.tmpl-field')).toHaveLength(2);
  });

  it('is safe to call when no errors exist', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="date">Enter date</span>
      </div>
    `);
    expect(() => clearValidationErrors(dom.window.document)).not.toThrow();
  });
});
```

**Step 2: Update the import statement**

Update the import at the top of `test/placeholders.test.ts` to include the two new functions (add `highlightUnresolved` and `clearValidationErrors`).

**Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `highlightUnresolved` and `clearValidationErrors` are not exported

**Step 4: Implement the functions**

In `src/placeholders.ts`, add after `isTemplateComplete`:

```typescript
/** Add error styling to all unresolved required fields */
export function highlightUnresolved(doc: Document): PlaceholderField[] {
  const unresolvedRequired = getUnresolvedRequired(doc);
  unresolvedRequired.forEach((f) => f.element.classList.add('tmpl-field-error'));
  return unresolvedRequired;
}

/** Remove error styling from all placeholder fields */
export function clearValidationErrors(doc: Document): void {
  doc.querySelectorAll('.tmpl-field-error').forEach((el) => {
    el.classList.remove('tmpl-field-error');
  });
}
```

**Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/placeholders.ts test/placeholders.test.ts
git commit -m "feat: add highlightUnresolved and clearValidationErrors"
```

---

### Task 4: Add validation error CSS and toast styles

**Files:**
- Modify: `src/placeholders.ts:4-21` (extend `PLACEHOLDER_CSS` constant)

**Step 1: Write the failing test**

Add to `test/placeholders.test.ts`:

```typescript
import { PLACEHOLDER_CSS } from '../src/placeholders';

// ... existing tests ...

describe('PLACEHOLDER_CSS', () => {
  it('contains error styling for tmpl-field-error', () => {
    expect(PLACEHOLDER_CSS).toContain('.tmpl-field-error');
  });

  it('contains toast styling for sc-validation-toast', () => {
    expect(PLACEHOLDER_CSS).toContain('.sc-validation-toast');
  });

  it('contains shake animation', () => {
    expect(PLACEHOLDER_CSS).toContain('sc-shake');
  });
});
```

Update the import to include `PLACEHOLDER_CSS`.

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `PLACEHOLDER_CSS` doesn't contain `.tmpl-field-error` or `.sc-validation-toast`

**Step 3: Extend PLACEHOLDER_CSS**

In `src/placeholders.ts`, replace the `PLACEHOLDER_CSS` constant (lines 4-21) with:

```typescript
export const PLACEHOLDER_CSS = `
.tmpl-field {
  background: #e8f4fd;
  border: 1px dashed #7ab8e0;
  border-radius: 3px;
  padding: 1px 4px;
  color: #1a6ca1;
  cursor: text;
  font-style: italic;
}
.tmpl-field[data-required="true"] {
  border-left: 3px solid #d9534f;
}
.tmpl-field:focus {
  outline: 2px solid #0d6efd;
  outline-offset: 1px;
}
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
.sc-validation-toast {
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: #d9534f;
  color: #fff;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 0.85rem;
  z-index: 10000;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
`;
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/placeholders.ts test/placeholders.test.ts
git commit -m "feat: add validation error CSS and toast styles"
```

---

### Task 5: Add toast notification helper

**Files:**
- Modify: `src/placeholders.ts` (add `showValidationToast` function before `activatePlaceholders`)

**Step 1: Write the failing test**

Add to `test/placeholders.test.ts`:

```typescript
import { showValidationToast } from '../src/placeholders';

// ... existing tests ...

describe('showValidationToast', () => {
  it('creates a toast element in the document', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    showValidationToast(dom.window.document, 3);

    const toast = dom.window.document.querySelector('.sc-validation-toast');
    expect(toast).not.toBeNull();
    expect(toast!.textContent).toBe('3 required field(s) need to be filled');
  });

  it('replaces existing toast (idempotent)', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    showValidationToast(dom.window.document, 3);
    showValidationToast(dom.window.document, 1);

    const toasts = dom.window.document.querySelectorAll('.sc-validation-toast');
    expect(toasts).toHaveLength(1);
    expect(toasts[0].textContent).toBe('1 required field(s) need to be filled');
  });
});
```

Update the import to include `showValidationToast`.

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `showValidationToast` is not exported

**Step 3: Implement the function**

In `src/placeholders.ts`, add before `activatePlaceholders`:

```typescript
/** Show a validation toast notification in the document */
export function showValidationToast(doc: Document, count: number): void {
  // Remove existing toast
  const existing = doc.querySelector('.sc-validation-toast');
  if (existing) existing.remove();

  const toast = doc.createElement('div');
  toast.className = 'sc-validation-toast';
  toast.textContent = `${count} required field(s) need to be filled`;
  doc.body.appendChild(toast);

  // Auto-dismiss after 5 seconds
  setTimeout(() => toast.remove(), 5000);

  // Dismiss when a placeholder field receives focus
  const dismissOnFocus = () => {
    toast.remove();
    doc.removeEventListener('focusin', dismissOnFocus);
  };
  doc.addEventListener('focusin', (e: Event) => {
    if ((e.target as HTMLElement)?.classList?.contains('tmpl-field')) {
      dismissOnFocus();
    }
  });
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/placeholders.ts test/placeholders.test.ts
git commit -m "feat: add showValidationToast notification helper"
```

---

### Task 6: Hook BeforeGetContent and update activatePlaceholders signature

**Files:**
- Modify: `src/placeholders.ts:91` (`activatePlaceholders` function signature and body)
- Modify: `src/browser.ts:315` (call site — pass config)

**Step 1: Update activatePlaceholders signature and add BeforeGetContent hook**

In `src/placeholders.ts`, update the import at the top of the file:

```typescript
import type { PlaceholderField, StructuredContentConfig } from './types';
```

Then change the `activatePlaceholders` function signature and add the hook at the end of the function body:

```typescript
export function activatePlaceholders(editor: any, config?: StructuredContentConfig): void {
```

Add after the `NodeChange` handler (before the closing `}` of `activatePlaceholders`):

```typescript
  // Validation on content extraction (warn mode)
  if (config?.validation === 'warn') {
    editor.on('BeforeGetContent', () => {
      const currentDoc: Document = editor.getDoc();
      const unresolvedRequired = getUnresolvedRequired(currentDoc);
      if (unresolvedRequired.length > 0) {
        highlightUnresolved(currentDoc);
        editor.selection.select(unresolvedRequired[0].element, true);
        showValidationToast(currentDoc, unresolvedRequired.length);
      } else {
        clearValidationErrors(currentDoc);
      }
    });
  }
```

**Step 2: Update the call site in browser.ts**

In `src/browser.ts`, line 315, change:

```typescript
    activatePlaceholders(editor);
```

to:

```typescript
    activatePlaceholders(editor, config);
```

**Step 3: Build and test**

Run: `npm run build && npm test`
Expected: Build succeeds, all tests PASS

**Step 4: Commit**

```bash
git add src/placeholders.ts src/browser.ts
git commit -m "feat: hook BeforeGetContent for warn-mode validation

Validation triggers when editor.getContent() is called. Highlights
unfilled required fields, focuses the first one, shows a toast.
activatePlaceholders now accepts optional config parameter."
```

---

### Task 7: Build, full test run, update docs

**Files:**
- Modify: `ROADMAP.md` (mark Phase 1 tasks complete)
- Modify: `CLAUDE.md` (add validation config docs)

**Step 1: Full build**

Run: `npm run build`
Expected: `dist/plugin.js` generated without errors

**Step 2: Full test run**

Run: `npm test`
Expected: All tests pass (existing 25 + new validation tests)

**Step 3: Update CLAUDE.md**

Add to the Design section of `CLAUDE.md`:

```markdown
## Validation (v0.2.0)

- `validation: 'warn' | 'none'` config option (default `'none'`)
- `getUnresolvedRequired(doc)` — returns unresolved required fields
- `isTemplateComplete(doc)` — true when all required fields resolved
- `highlightUnresolved(doc)` — adds `.tmpl-field-error` class
- `clearValidationErrors(doc)` — removes error styling
- `showValidationToast(doc, count)` — notification toast, auto-dismiss 5s
- In warn mode, `BeforeGetContent` event triggers validation automatically
```

**Step 4: Commit**

```bash
git add CLAUDE.md ROADMAP.md
git commit -m "docs: update CLAUDE.md and ROADMAP.md for Phase 1 validation"
```

**Step 5: Tag release**

```bash
git tag v0.2.0
```
