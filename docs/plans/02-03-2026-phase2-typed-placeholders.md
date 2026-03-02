# Phase 2: Typed Placeholders — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add typed placeholder widgets (date picker, dropdown, number input) that appear as popovers when users click typed fields in the editor.

**Architecture:** Extend `PlaceholderField` with `type`/`options`/`min`/`max`. Create new `src/widgets.ts` for popover rendering in the parent page DOM. Wire click handlers in `activatePlaceholders`. Validate on resolve (not save).

**Tech Stack:** TypeScript, Vitest + jsdom for tests, Rollup for build

---

### Task 1: Extend PlaceholderField type

**Files:**
- Modify: `src/types.ts:33-40`

**Step 1: Update PlaceholderField interface**

In `src/types.ts`, change lines 33-40 from:

```typescript
/** Internal representation of a placeholder field in the editor */
export interface PlaceholderField {
  element: HTMLElement;
  name: string;
  defaultText: string;
  required: boolean;
  resolved: boolean;
}
```

to:

```typescript
/** Internal representation of a placeholder field in the editor */
export interface PlaceholderField {
  element: HTMLElement;
  name: string;
  defaultText: string;
  required: boolean;
  resolved: boolean;
  type: 'text' | 'date' | 'select' | 'number';
  options?: string[];
  min?: number;
  max?: number;
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: Errors in `placeholders.ts` and `test/placeholders.test.ts` because existing `PlaceholderField` objects don't include `type`. This is expected — Task 2 fixes it.

**Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): add type, options, min, max to PlaceholderField"
```

---

### Task 2: Update findPlaceholderFields to parse typed attributes

**Files:**
- Modify: `src/placeholders.ts:47-57`
- Modify: `test/placeholders.test.ts`

**Step 1: Write the failing tests**

Add a new describe block to the end of `test/placeholders.test.ts`:

```typescript
describe('findPlaceholderFields — typed fields', () => {
  it('parses data-type attribute, defaults to text', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="date" data-type="date">Select date</span>
        <span class="tmpl-field" data-field="notes">Add notes</span>
      </div>
    `);
    const fields = findPlaceholderFields(dom.window.document);
    expect(fields[0].type).toBe('date');
    expect(fields[1].type).toBe('text');
  });

  it('parses data-options for select type', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="level" data-type="select" data-options="Direct|Indirect|Distant">Level</span>
      </div>
    `);
    const fields = findPlaceholderFields(dom.window.document);
    expect(fields[0].type).toBe('select');
    expect(fields[0].options).toEqual(['Direct', 'Indirect', 'Distant']);
  });

  it('parses data-min and data-max for number type', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="score" data-type="number" data-min="1" data-max="5">Score</span>
      </div>
    `);
    const fields = findPlaceholderFields(dom.window.document);
    expect(fields[0].type).toBe('number');
    expect(fields[0].min).toBe(1);
    expect(fields[0].max).toBe(5);
  });

  it('leaves options/min/max undefined when not present', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="notes" data-type="text">Notes</span>
      </div>
    `);
    const fields = findPlaceholderFields(dom.window.document);
    expect(fields[0].options).toBeUndefined();
    expect(fields[0].min).toBeUndefined();
    expect(fields[0].max).toBeUndefined();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `fields[0].type` is undefined (property not set yet)

**Step 3: Update findPlaceholderFields**

In `src/placeholders.ts`, change lines 48-57 from:

```typescript
export function findPlaceholderFields(doc: Document): PlaceholderField[] {
  const elements = doc.querySelectorAll('.tmpl-field');
  return Array.from(elements).map((el) => ({
    element: el as HTMLElement,
    name: el.getAttribute('data-field') || '',
    defaultText: (el.textContent || '').trim(),
    required: el.getAttribute('data-required') === 'true',
    resolved: false,
  }));
}
```

to:

```typescript
export function findPlaceholderFields(doc: Document): PlaceholderField[] {
  const elements = doc.querySelectorAll('.tmpl-field');
  return Array.from(elements).map((el) => {
    const typeAttr = el.getAttribute('data-type');
    const type = (typeAttr === 'date' || typeAttr === 'select' || typeAttr === 'number') ? typeAttr : 'text';
    const optionsAttr = el.getAttribute('data-options');
    const minAttr = el.getAttribute('data-min');
    const maxAttr = el.getAttribute('data-max');

    return {
      element: el as HTMLElement,
      name: el.getAttribute('data-field') || '',
      defaultText: (el.textContent || '').trim(),
      required: el.getAttribute('data-required') === 'true',
      resolved: false,
      type,
      options: optionsAttr ? optionsAttr.split('|') : undefined,
      min: minAttr !== null ? Number(minAttr) : undefined,
      max: maxAttr !== null ? Number(maxAttr) : undefined,
    };
  });
}
```

**Step 4: Fix existing test PlaceholderField objects**

The existing tests in `test/placeholders.test.ts` create `PlaceholderField` objects manually (e.g., in `resolveField` and `getNextField/getPrevField` tests). Add `type: 'text'` to each manually constructed field object.

In the `resolveField` describe block, update both test cases. For example, change:

```typescript
const field = { element: el, name: 'date', defaultText: 'Enter date', required: true, resolved: false };
```

to:

```typescript
const field = { element: el, name: 'date', defaultText: 'Enter date', required: true, resolved: false, type: 'text' as const };
```

And in the `getNextField / getPrevField` describe block, update the `beforeEach`:

```typescript
fields = Array.from(els).map((el, i) => ({
  element: el as HTMLElement,
  name: ['a', 'b', 'c'][i],
  defaultText: ['A', 'B', 'C'][i],
  required: false,
  resolved: false,
  type: 'text' as const
}));
```

**Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/placeholders.ts test/placeholders.test.ts
git commit -m "feat: parse data-type, data-options, data-min, data-max in findPlaceholderFields"
```

---

### Task 3: Add typed field CSS indicators

**Files:**
- Modify: `src/placeholders.ts:4-45` (extend `PLACEHOLDER_CSS`)
- Modify: `test/placeholders.test.ts`

**Step 1: Write the failing test**

Add to the existing `PLACEHOLDER_CSS` describe block in `test/placeholders.test.ts`:

```typescript
  it('contains typed field cursor styles', () => {
    expect(PLACEHOLDER_CSS).toContain('data-type="date"');
    expect(PLACEHOLDER_CSS).toContain('data-type="select"');
    expect(PLACEHOLDER_CSS).toContain('data-type="number"');
  });
```

**Step 2: Run tests to verify it fails**

Run: `npm test`
Expected: FAIL — PLACEHOLDER_CSS doesn't contain `data-type`

**Step 3: Add typed field CSS**

In `src/placeholders.ts`, add before the closing backtick of `PLACEHOLDER_CSS` (before line 45's `` `; ``):

```css
.tmpl-field[data-type="date"],
.tmpl-field[data-type="select"],
.tmpl-field[data-type="number"] {
  cursor: pointer;
  border-style: solid;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/placeholders.ts test/placeholders.test.ts
git commit -m "feat: add CSS indicators for typed placeholder fields"
```

---

### Task 4: Create widgets.ts — popover rendering and styles

**Files:**
- Create: `src/widgets.ts`
- Create: `test/widgets.test.ts`

**Step 1: Write the failing tests**

Create `test/widgets.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { openPopover, closePopover, injectWidgetStyles, WIDGET_CSS } from '../src/widgets';
import type { PlaceholderField } from '../src/types';

describe('WIDGET_CSS', () => {
  it('contains popover styles', () => {
    expect(WIDGET_CSS).toContain('.sc-popover');
  });

  it('contains error styles', () => {
    expect(WIDGET_CSS).toContain('.sc-popover-error');
  });
});

describe('injectWidgetStyles', () => {
  it('injects styles into document head (idempotent)', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    injectWidgetStyles(dom.window.document);
    injectWidgetStyles(dom.window.document);

    const styles = dom.window.document.querySelectorAll('#sc-widget-styles');
    expect(styles).toHaveLength(1);
  });
});

describe('closePopover', () => {
  it('removes popover from DOM', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div class="sc-popover"></div></body></html>');
    closePopover(dom.window.document);
    expect(dom.window.document.querySelector('.sc-popover')).toBeNull();
  });

  it('is safe to call when no popover exists', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    expect(() => closePopover(dom.window.document)).not.toThrow();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — module `../src/widgets` does not exist

**Step 3: Create widgets.ts with styles and closePopover**

Create `src/widgets.ts`:

```typescript
import type { PlaceholderField } from './types';
import { resolveField } from './placeholders';

/** CSS for widget popovers — injected into the host page */
export const WIDGET_CSS = `
.sc-popover {
  position: absolute;
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 8px 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 100001;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 0.9rem;
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
`;

/** Inject widget CSS into a document (idempotent) */
export function injectWidgetStyles(doc: Document): void {
  if (doc.getElementById('sc-widget-styles')) return;
  const style = doc.createElement('style');
  style.id = 'sc-widget-styles';
  style.textContent = WIDGET_CSS;
  doc.head.appendChild(style);
}

/** Close and remove the active popover */
export function closePopover(doc: Document): void {
  const existing = doc.querySelector('.sc-popover');
  if (existing) existing.remove();
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/widgets.ts test/widgets.test.ts
git commit -m "feat: create widgets.ts with popover styles and closePopover"
```

---

### Task 5: Add openPopover — date type

**Files:**
- Modify: `src/widgets.ts`
- Modify: `test/widgets.test.ts`

**Step 1: Write the failing tests**

Add to `test/widgets.test.ts`:

```typescript
function makeField(dom: JSDOM, html: string): PlaceholderField {
  dom.window.document.body.innerHTML = html;
  const el = dom.window.document.querySelector('.tmpl-field') as HTMLElement;
  return {
    element: el,
    name: el.getAttribute('data-field') || '',
    defaultText: (el.textContent || '').trim(),
    required: el.getAttribute('data-required') === 'true',
    resolved: false,
    type: (el.getAttribute('data-type') as any) || 'text',
    options: el.getAttribute('data-options')?.split('|'),
    min: el.getAttribute('data-min') ? Number(el.getAttribute('data-min')) : undefined,
    max: el.getAttribute('data-max') ? Number(el.getAttribute('data-max')) : undefined,
  };
}

describe('openPopover — date', () => {
  let dom: JSDOM;
  let field: PlaceholderField;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    field = makeField(dom, '<span class="tmpl-field" data-field="date" data-type="date" data-required="true">Select date</span>');
  });

  afterEach(() => {
    closePopover(dom.window.document);
  });

  it('creates a popover with a date input', () => {
    openPopover(dom.window.document, field);
    const popover = dom.window.document.querySelector('.sc-popover');
    expect(popover).not.toBeNull();
    const input = popover!.querySelector('input[type="date"]');
    expect(input).not.toBeNull();
  });

  it('replaces existing popover (only one at a time)', () => {
    openPopover(dom.window.document, field);
    openPopover(dom.window.document, field);
    expect(dom.window.document.querySelectorAll('.sc-popover')).toHaveLength(1);
  });

  it('updates field text and resolves on value change', () => {
    openPopover(dom.window.document, field);
    const input = dom.window.document.querySelector('.sc-popover input[type="date"]') as HTMLInputElement;
    input.value = '2026-03-15';
    input.dispatchEvent(new dom.window.Event('change'));

    expect(field.element.textContent).toBe('2026-03-15');
    expect(field.resolved).toBe(true);
    // Popover should be dismissed
    expect(dom.window.document.querySelector('.sc-popover')).toBeNull();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `openPopover` is not exported / doesn't exist

**Step 3: Implement openPopover for date type**

In `src/widgets.ts`, add after `closePopover`:

```typescript
/** Open a typed popover for a placeholder field */
export function openPopover(doc: Document, field: PlaceholderField): void {
  closePopover(doc);
  injectWidgetStyles(doc);

  const popover = doc.createElement('div');
  popover.className = 'sc-popover';

  // Position popover near the field element
  const rect = field.element.getBoundingClientRect();
  popover.style.top = `${rect.bottom + 4}px`;
  popover.style.left = `${rect.left}px`;

  const content = createInput(doc, field, popover);
  popover.appendChild(content);
  doc.body.appendChild(popover);

  // Focus the input
  const input = popover.querySelector('input, select') as HTMLElement;
  if (input) input.focus();

  // Escape to close
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closePopover(doc);
      doc.removeEventListener('keydown', escHandler);
    }
  };
  doc.addEventListener('keydown', escHandler);

  // Click outside to close
  const clickHandler = (e: MouseEvent) => {
    if (!popover.contains(e.target as Node)) {
      closePopover(doc);
      doc.removeEventListener('mousedown', clickHandler);
    }
  };
  // Delay to avoid immediate close from the triggering click
  setTimeout(() => doc.addEventListener('mousedown', clickHandler), 0);
}

function createInput(doc: Document, field: PlaceholderField, popover: HTMLElement): HTMLElement {
  switch (field.type) {
    case 'date':
      return createDateInput(doc, field, popover);
    default:
      return doc.createElement('span');
  }
}

function createDateInput(doc: Document, field: PlaceholderField, popover: HTMLElement): HTMLElement {
  const input = doc.createElement('input');
  input.type = 'date';
  input.addEventListener('change', () => {
    if (input.value) {
      field.element.textContent = input.value;
      resolveField(field);
      closePopover(doc);
    }
  });
  return input;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/widgets.ts test/widgets.test.ts
git commit -m "feat: add openPopover with date input support"
```

---

### Task 6: Add openPopover — select type

**Files:**
- Modify: `src/widgets.ts`
- Modify: `test/widgets.test.ts`

**Step 1: Write the failing tests**

Add to `test/widgets.test.ts`:

```typescript
describe('openPopover — select', () => {
  let dom: JSDOM;
  let field: PlaceholderField;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    field = makeField(dom, '<span class="tmpl-field" data-field="level" data-type="select" data-options="Direct|Indirect|Distant">Level</span>');
  });

  afterEach(() => {
    closePopover(dom.window.document);
  });

  it('creates a popover with a select element', () => {
    openPopover(dom.window.document, field);
    const select = dom.window.document.querySelector('.sc-popover select');
    expect(select).not.toBeNull();
  });

  it('renders all options plus a placeholder', () => {
    openPopover(dom.window.document, field);
    const options = dom.window.document.querySelectorAll('.sc-popover select option');
    // First option is the placeholder "Choose..."
    expect(options).toHaveLength(4);
    expect(options[0].textContent).toBe('Choose...');
    expect((options[0] as HTMLOptionElement).disabled).toBe(true);
    expect(options[1].textContent).toBe('Direct');
    expect(options[2].textContent).toBe('Indirect');
    expect(options[3].textContent).toBe('Distant');
  });

  it('updates field text and resolves on selection', () => {
    openPopover(dom.window.document, field);
    const select = dom.window.document.querySelector('.sc-popover select') as HTMLSelectElement;
    select.value = 'Indirect';
    select.dispatchEvent(new dom.window.Event('change'));

    expect(field.element.textContent).toBe('Indirect');
    expect(field.resolved).toBe(true);
    expect(dom.window.document.querySelector('.sc-popover')).toBeNull();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — select popover creates empty span (hits the `default` case)

**Step 3: Add select case to createInput and implement**

In `src/widgets.ts`, update the `createInput` switch:

```typescript
function createInput(doc: Document, field: PlaceholderField, popover: HTMLElement): HTMLElement {
  switch (field.type) {
    case 'date':
      return createDateInput(doc, field, popover);
    case 'select':
      return createSelectInput(doc, field, popover);
    default:
      return doc.createElement('span');
  }
}
```

Add the new function:

```typescript
function createSelectInput(doc: Document, field: PlaceholderField, popover: HTMLElement): HTMLElement {
  const select = doc.createElement('select');

  // Placeholder option
  const placeholder = doc.createElement('option');
  placeholder.textContent = 'Choose...';
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);

  (field.options || []).forEach((opt) => {
    const option = doc.createElement('option');
    option.value = opt;
    option.textContent = opt;
    select.appendChild(option);
  });

  select.addEventListener('change', () => {
    if (select.value) {
      field.element.textContent = select.value;
      resolveField(field);
      closePopover(doc);
    }
  });

  return select;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/widgets.ts test/widgets.test.ts
git commit -m "feat: add select type support to openPopover"
```

---

### Task 7: Add openPopover — number type with validation

**Files:**
- Modify: `src/widgets.ts`
- Modify: `test/widgets.test.ts`

**Step 1: Write the failing tests**

Add to `test/widgets.test.ts`:

```typescript
describe('openPopover — number', () => {
  let dom: JSDOM;
  let field: PlaceholderField;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    field = makeField(dom, '<span class="tmpl-field" data-field="score" data-type="number" data-min="1" data-max="5">Score</span>');
  });

  afterEach(() => {
    closePopover(dom.window.document);
  });

  it('creates a popover with a number input', () => {
    openPopover(dom.window.document, field);
    const input = dom.window.document.querySelector('.sc-popover input[type="number"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.min).toBe('1');
    expect(input.max).toBe('5');
  });

  it('resolves field with valid value on change', () => {
    openPopover(dom.window.document, field);
    const input = dom.window.document.querySelector('.sc-popover input[type="number"]') as HTMLInputElement;
    input.value = '3';
    input.dispatchEvent(new dom.window.Event('change'));

    expect(field.element.textContent).toBe('3');
    expect(field.resolved).toBe(true);
    expect(dom.window.document.querySelector('.sc-popover')).toBeNull();
  });

  it('shows error for out-of-range value', () => {
    openPopover(dom.window.document, field);
    const input = dom.window.document.querySelector('.sc-popover input[type="number"]') as HTMLInputElement;
    input.value = '10';
    input.dispatchEvent(new dom.window.Event('change'));

    // Field should NOT be resolved
    expect(field.resolved).toBe(false);
    // Error message should appear
    const error = dom.window.document.querySelector('.sc-popover-error');
    expect(error).not.toBeNull();
    expect(error!.textContent).toContain('between');
    // Popover should still be open
    expect(dom.window.document.querySelector('.sc-popover')).not.toBeNull();
  });

  it('works without min/max constraints', () => {
    field = makeField(dom, '<span class="tmpl-field" data-field="count" data-type="number">Count</span>');
    openPopover(dom.window.document, field);
    const input = dom.window.document.querySelector('.sc-popover input[type="number"]') as HTMLInputElement;
    input.value = '999';
    input.dispatchEvent(new dom.window.Event('change'));

    expect(field.element.textContent).toBe('999');
    expect(field.resolved).toBe(true);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — number popover creates empty span

**Step 3: Add number case to createInput and implement**

In `src/widgets.ts`, update the `createInput` switch:

```typescript
function createInput(doc: Document, field: PlaceholderField, popover: HTMLElement): HTMLElement {
  switch (field.type) {
    case 'date':
      return createDateInput(doc, field, popover);
    case 'select':
      return createSelectInput(doc, field, popover);
    case 'number':
      return createNumberInput(doc, field, popover);
    default:
      return doc.createElement('span');
  }
}
```

Add the new function:

```typescript
function createNumberInput(doc: Document, field: PlaceholderField, popover: HTMLElement): HTMLElement {
  const wrapper = doc.createElement('div');

  const input = doc.createElement('input');
  input.type = 'number';
  if (field.min !== undefined) input.min = String(field.min);
  if (field.max !== undefined) input.max = String(field.max);
  wrapper.appendChild(input);

  input.addEventListener('change', () => {
    // Clear previous error
    const existingError = popover.querySelector('.sc-popover-error');
    if (existingError) existingError.remove();

    const val = Number(input.value);
    if (input.value === '') return;

    // Range validation
    if (field.min !== undefined && val < field.min) {
      showNumberError(doc, popover, field.min, field.max);
      return;
    }
    if (field.max !== undefined && val > field.max) {
      showNumberError(doc, popover, field.min, field.max);
      return;
    }

    field.element.textContent = input.value;
    resolveField(field);
    closePopover(doc);
  });

  return wrapper;
}

function showNumberError(doc: Document, popover: HTMLElement, min?: number, max?: number): void {
  const existing = popover.querySelector('.sc-popover-error');
  if (existing) existing.remove();

  const error = doc.createElement('div');
  error.className = 'sc-popover-error';
  if (min !== undefined && max !== undefined) {
    error.textContent = `Value must be between ${min} and ${max}`;
  } else if (min !== undefined) {
    error.textContent = `Value must be at least ${min}`;
  } else if (max !== undefined) {
    error.textContent = `Value must be at most ${max}`;
  }
  popover.appendChild(error);
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/widgets.ts test/widgets.test.ts
git commit -m "feat: add number type support with range validation to openPopover"
```

---

### Task 8: Wire click handlers in activatePlaceholders

**Files:**
- Modify: `src/placeholders.ts:165-227` (activatePlaceholders function)

**Step 1: Add import**

At the top of `src/placeholders.ts`, add:

```typescript
import { openPopover, closePopover, injectWidgetStyles } from './widgets';
```

**Step 2: Add click handler for typed fields**

In `activatePlaceholders`, after the line `injectPlaceholderStyles(doc);` (line 167) and before `const fields = findPlaceholderFields(doc);` (line 169), add:

```typescript
  injectWidgetStyles(document);
```

Then after the `// Focus the first field` block (after line 176), add:

```typescript
  // Click handler for typed fields — open widget popover
  fields.forEach((field) => {
    if (field.type !== 'text') {
      field.element.addEventListener('click', () => {
        openPopover(document, field);
      });
    }
  });
```

Note: `document` here is the parent page document (not `doc` which is the editor iframe document). The popover renders in the parent page.

**Step 3: Build and test**

Run: `npm run build && npm test`
Expected: Build succeeds, all tests PASS

**Step 4: Commit**

```bash
git add src/placeholders.ts
git commit -m "feat: wire typed field click handlers to open widget popover

Click on a date/select/number placeholder opens the popover in
the parent page. Text fields continue to work as before."
```

---

### Task 9: Add resolveField cleanup of data-type attributes

**Files:**
- Modify: `src/placeholders.ts:59-68` (resolveField function)
- Modify: `test/placeholders.test.ts`

**Step 1: Write the failing test**

Add to the `resolveField` describe block in `test/placeholders.test.ts`:

```typescript
  it('strips data-type, data-options, data-min, data-max on resolve', () => {
    const dom = new JSDOM(
      '<span class="tmpl-field" data-field="score" data-type="number" data-min="1" data-max="5" data-required="true">Score</span>'
    );
    const el = dom.window.document.querySelector('.tmpl-field') as HTMLElement;
    const field = { element: el, name: 'score', defaultText: 'Score', required: true, resolved: false, type: 'number' as const, min: 1, max: 5 };

    el.textContent = '3';
    resolveField(field);

    expect(field.resolved).toBe(true);
    expect(el.hasAttribute('data-type')).toBe(false);
    expect(el.hasAttribute('data-options')).toBe(false);
    expect(el.hasAttribute('data-min')).toBe(false);
    expect(el.hasAttribute('data-max')).toBe(false);
  });
```

**Step 2: Run tests to verify it fails**

Run: `npm test`
Expected: FAIL — `data-type` attribute still present after resolve

**Step 3: Update resolveField**

In `src/placeholders.ts`, change `resolveField` from:

```typescript
export function resolveField(field: PlaceholderField): void {
  const currentText = (field.element.textContent || '').trim();
  if (currentText === field.defaultText) return;

  field.resolved = true;
  field.element.classList.remove('tmpl-field');
  field.element.removeAttribute('data-field');
  field.element.removeAttribute('data-required');
}
```

to:

```typescript
export function resolveField(field: PlaceholderField): void {
  const currentText = (field.element.textContent || '').trim();
  if (currentText === field.defaultText) return;

  field.resolved = true;
  field.element.classList.remove('tmpl-field');
  field.element.removeAttribute('data-field');
  field.element.removeAttribute('data-required');
  field.element.removeAttribute('data-type');
  field.element.removeAttribute('data-options');
  field.element.removeAttribute('data-min');
  field.element.removeAttribute('data-max');
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/placeholders.ts test/placeholders.test.ts
git commit -m "feat: strip typed placeholder attributes on resolve"
```

---

### Task 10: Build, full test run, update docs

**Files:**
- Modify: `ROADMAP.md` (mark Phase 2 complete)
- Modify: `CLAUDE.md` (add typed placeholders docs)

**Step 1: Full build**

Run: `npm run build`
Expected: `dist/plugin.js` generated without errors

**Step 2: Full test run**

Run: `npm test`
Expected: All tests pass (43 existing + new widget/typed-field tests)

**Step 3: Update CLAUDE.md**

Add after the "## Validation (v0.2.0)" section:

```markdown

## Typed Placeholders (v0.3.0)

- `data-type="date|select|number"` attribute on `tmpl-field` spans
- `data-options="A|B|C"` for select fields (pipe-separated)
- `data-min="1" data-max="5"` for number fields
- Click typed field → popover with native input in parent page
- `openPopover(doc, field)` / `closePopover(doc)` — widget API
- Number fields validate range on resolve, show inline error
- `src/widgets.ts` — popover rendering and styles
```

**Step 4: Update ROADMAP.md**

Change Phase 2 header to: `## Phase 2: Typed Placeholders — v0.3.0 ✓`

In the Summary table, change Phase 2 Priority from `High` to `**Done**`.

**Step 5: Commit**

```bash
git add CLAUDE.md ROADMAP.md
git commit -m "docs: update CLAUDE.md and ROADMAP.md for Phase 2 typed placeholders"
```

**Step 6: Tag release**

Do NOT create the tag. The user will tag when ready.
