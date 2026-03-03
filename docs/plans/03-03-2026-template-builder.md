# Template Builder Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the embedded TinyMCE editor in the authoring modal with a block-based visual template builder using a JSON model.

**Architecture:** A JSON array of typed block objects is the source of truth. `builder.ts` handles pure model logic (create, slug, toHTML). `builder-ui.ts` renders the palette, canvas with inline editing, and wires preview updates. `authoring.ts` is modified to mount the builder instead of TinyMCE.

**Tech Stack:** TypeScript, vanilla DOM, Vitest + jsdom for testing

---

### Task 1: Add block type interfaces to types.ts

**Files:**
- Modify: `src/types.ts`
- Test: `test/builder.test.ts` (created in Task 2, but types needed first)

**Step 1: Add block types to `src/types.ts`**

Append after line 102 (after `TemplateSubmittedEvent`):

```typescript
// -- Builder block types --

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

**Step 2: Run build to verify no type errors**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add block type interfaces for template builder"
```

---

### Task 2: Create builder.ts — model logic

**Files:**
- Create: `src/builder.ts`
- Create: `test/builder.test.ts`

**Step 1: Write failing tests for `autoSlug`, `createBlock`, and `modelToHTML`**

Create `test/builder.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { autoSlug, createBlock, modelToHTML } from '../src/builder';
import type { HeadingBlock, ParagraphBlock, TextFieldBlock, DateFieldBlock, SelectFieldBlock, NumberFieldBlock, TemplateBlock } from '../src/types';

describe('autoSlug', () => {
  it('converts label to snake_case', () => {
    expect(autoSlug('Patient Name')).toBe('patient_name');
  });

  it('strips non-alphanumeric characters', () => {
    expect(autoSlug('Date (of birth)')).toBe('date_of_birth');
  });

  it('collapses multiple underscores', () => {
    expect(autoSlug('A -- B')).toBe('a_b');
  });

  it('trims leading/trailing underscores', () => {
    expect(autoSlug('  Name  ')).toBe('name');
  });

  it('returns empty string for empty input', () => {
    expect(autoSlug('')).toBe('');
  });
});

describe('createBlock', () => {
  it('creates a heading block with defaults', () => {
    const block = createBlock('heading') as HeadingBlock;
    expect(block.type).toBe('heading');
    expect(block.level).toBe(3);
    expect(block.text).toBe('Section Title');
    expect(block.id).toMatch(/^blk_/);
  });

  it('creates a paragraph block with defaults', () => {
    const block = createBlock('paragraph') as ParagraphBlock;
    expect(block.type).toBe('paragraph');
    expect(block.text).toBe('Enter instructions or description here.');
  });

  it('creates a text-field block with defaults', () => {
    const block = createBlock('text-field') as TextFieldBlock;
    expect(block.type).toBe('text-field');
    expect(block.name).toBe('text_field');
    expect(block.label).toBe('Text Field');
    expect(block.placeholder).toBe('Enter text');
    expect(block.required).toBe(false);
  });

  it('creates a date-field block with defaults', () => {
    const block = createBlock('date-field') as DateFieldBlock;
    expect(block.type).toBe('date-field');
    expect(block.name).toBe('date_field');
    expect(block.label).toBe('Date Field');
    expect(block.placeholder).toBe('Select date');
    expect(block.required).toBe(false);
  });

  it('creates a select-field block with defaults', () => {
    const block = createBlock('select-field') as SelectFieldBlock;
    expect(block.type).toBe('select-field');
    expect(block.name).toBe('select_field');
    expect(block.label).toBe('Select Field');
    expect(block.placeholder).toBe('Choose option');
    expect(block.required).toBe(false);
    expect(block.options).toEqual(['Option 1', 'Option 2']);
  });

  it('creates a number-field block with defaults', () => {
    const block = createBlock('number-field') as NumberFieldBlock;
    expect(block.type).toBe('number-field');
    expect(block.name).toBe('number_field');
    expect(block.label).toBe('Number Field');
    expect(block.placeholder).toBe('Enter number');
    expect(block.required).toBe(false);
    expect(block.min).toBeUndefined();
    expect(block.max).toBeUndefined();
  });

  it('generates unique IDs', () => {
    const a = createBlock('heading');
    const b = createBlock('heading');
    expect(a.id).not.toBe(b.id);
  });
});

describe('modelToHTML', () => {
  it('returns empty wrapper for empty model', () => {
    expect(modelToHTML([])).toBe('<div class="sc-template"></div>');
  });

  it('renders a heading', () => {
    const blocks: TemplateBlock[] = [
      { id: 'b1', type: 'heading', level: 3, text: 'Patient Info' },
    ];
    expect(modelToHTML(blocks)).toContain('<h3>Patient Info</h3>');
  });

  it('renders heading with correct level', () => {
    const blocks: TemplateBlock[] = [
      { id: 'b1', type: 'heading', level: 2, text: 'Title' },
    ];
    expect(modelToHTML(blocks)).toContain('<h2>Title</h2>');
  });

  it('renders a paragraph', () => {
    const blocks: TemplateBlock[] = [
      { id: 'b1', type: 'paragraph', text: 'Fill in all fields below.' },
    ];
    expect(modelToHTML(blocks)).toContain('<p>Fill in all fields below.</p>');
  });

  it('renders a text field with label and placeholder span', () => {
    const blocks: TemplateBlock[] = [
      { id: 'b1', type: 'text-field', name: 'patient_name', label: 'Patient Name', placeholder: 'Enter name', required: true },
    ];
    const html = modelToHTML(blocks);
    expect(html).toContain('<label>Patient Name</label>');
    expect(html).toContain('class="tmpl-field"');
    expect(html).toContain('data-field="patient_name"');
    expect(html).toContain('data-type="text"');
    expect(html).toContain('data-required="true"');
    expect(html).toContain('Enter name');
  });

  it('renders a date field', () => {
    const blocks: TemplateBlock[] = [
      { id: 'b1', type: 'date-field', name: 'dob', label: 'Date of Birth', placeholder: 'Select date', required: false },
    ];
    const html = modelToHTML(blocks);
    expect(html).toContain('data-type="date"');
    expect(html).toContain('data-field="dob"');
    expect(html).not.toContain('data-required');
  });

  it('renders a select field with options', () => {
    const blocks: TemplateBlock[] = [
      { id: 'b1', type: 'select-field', name: 'setting', label: 'Setting', placeholder: 'Choose', required: true, options: ['Inpatient', 'Outpatient'] },
    ];
    const html = modelToHTML(blocks);
    expect(html).toContain('data-type="select"');
    expect(html).toContain('data-options="Inpatient,Outpatient"');
    expect(html).toContain('data-required="true"');
  });

  it('renders a number field with min/max', () => {
    const blocks: TemplateBlock[] = [
      { id: 'b1', type: 'number-field', name: 'score', label: 'Score', placeholder: 'Enter score', required: true, min: 1, max: 10 },
    ];
    const html = modelToHTML(blocks);
    expect(html).toContain('data-type="number"');
    expect(html).toContain('data-min="1"');
    expect(html).toContain('data-max="10"');
  });

  it('omits min/max when not set on number field', () => {
    const blocks: TemplateBlock[] = [
      { id: 'b1', type: 'number-field', name: 'count', label: 'Count', placeholder: 'Enter', required: false },
    ];
    const html = modelToHTML(blocks);
    expect(html).not.toContain('data-min');
    expect(html).not.toContain('data-max');
  });

  it('renders multiple blocks in order', () => {
    const blocks: TemplateBlock[] = [
      { id: 'b1', type: 'heading', level: 3, text: 'Section' },
      { id: 'b2', type: 'text-field', name: 'name', label: 'Name', placeholder: 'Enter', required: false },
      { id: 'b3', type: 'paragraph', text: 'Notes below.' },
    ];
    const html = modelToHTML(blocks);
    const headingIdx = html.indexOf('<h3>');
    const fieldIdx = html.indexOf('data-field="name"');
    const paraIdx = html.indexOf('<p>Notes');
    expect(headingIdx).toBeLessThan(fieldIdx);
    expect(fieldIdx).toBeLessThan(paraIdx);
  });

  it('escapes HTML in text content', () => {
    const blocks: TemplateBlock[] = [
      { id: 'b1', type: 'heading', level: 3, text: '<script>alert("xss")</script>' },
    ];
    const html = modelToHTML(blocks);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('wraps output in sc-template div', () => {
    const html = modelToHTML([{ id: 'b1', type: 'heading', level: 3, text: 'Hi' }]);
    expect(html).toMatch(/^<div class="sc-template">/);
    expect(html).toMatch(/<\/div>$/);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `../src/builder` module not found.

**Step 3: Implement `src/builder.ts`**

```typescript
import type { BlockType, TemplateBlock, HeadingBlock, ParagraphBlock, TextFieldBlock, DateFieldBlock, SelectFieldBlock, NumberFieldBlock } from './types';

let blockCounter = 0;

/** Generate a unique block ID */
function nextId(): string {
  return `blk_${++blockCounter}`;
}

/** Convert a label string to a snake_case field name */
export function autoSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
}

/** Create a new block with sensible defaults */
export function createBlock(type: BlockType): TemplateBlock {
  const id = nextId();

  switch (type) {
    case 'heading':
      return { id, type, level: 3, text: 'Section Title' };
    case 'paragraph':
      return { id, type, text: 'Enter instructions or description here.' };
    case 'text-field':
      return { id, type, name: 'text_field', label: 'Text Field', placeholder: 'Enter text', required: false };
    case 'date-field':
      return { id, type, name: 'date_field', label: 'Date Field', placeholder: 'Select date', required: false };
    case 'select-field':
      return { id, type, name: 'select_field', label: 'Select Field', placeholder: 'Choose option', required: false, options: ['Option 1', 'Option 2'] };
    case 'number-field':
      return { id, type, name: 'number_field', label: 'Number Field', placeholder: 'Enter number', required: false };
  }
}

/** Escape HTML special characters */
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Build the tmpl-field span for a field block */
function fieldSpan(name: string, type: string, placeholder: string, required: boolean, extras: string = ''): string {
  let attrs = `class="tmpl-field" data-field="${esc(name)}" data-type="${type}"`;
  if (required) attrs += ' data-required="true"';
  if (extras) attrs += ' ' + extras;
  return `<span ${attrs}>${esc(placeholder)}</span>`;
}

/** Convert block model array to template HTML */
export function modelToHTML(blocks: TemplateBlock[]): string {
  if (blocks.length === 0) return '<div class="sc-template"></div>';

  const parts = blocks.map((block) => {
    switch (block.type) {
      case 'heading':
        return `<h${block.level}>${esc(block.text)}</h${block.level}>`;
      case 'paragraph':
        return `<p>${esc(block.text)}</p>`;
      case 'text-field':
        return `<div class="sc-field-row"><label>${esc(block.label)}</label>${fieldSpan(block.name, 'text', block.placeholder, block.required)}</div>`;
      case 'date-field':
        return `<div class="sc-field-row"><label>${esc(block.label)}</label>${fieldSpan(block.name, 'date', block.placeholder, block.required)}</div>`;
      case 'select-field': {
        const optAttr = `data-options="${esc(block.options.join(','))}"`;
        return `<div class="sc-field-row"><label>${esc(block.label)}</label>${fieldSpan(block.name, 'select', block.placeholder, block.required, optAttr)}</div>`;
      }
      case 'number-field': {
        let extras = '';
        if (block.min !== undefined) extras += `data-min="${block.min}"`;
        if (block.max !== undefined) extras += `${extras ? ' ' : ''}data-max="${block.max}"`;
        return `<div class="sc-field-row"><label>${esc(block.label)}</label>${fieldSpan(block.name, 'number', block.placeholder, block.required, extras)}</div>`;
      }
    }
  });

  return `<div class="sc-template">${parts.join('')}</div>`;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All new builder tests pass.

**Step 5: Commit**

```bash
git add src/builder.ts test/builder.test.ts
git commit -m "feat: builder model logic — createBlock, autoSlug, modelToHTML"
```

---

### Task 3: Create builder-styles.ts

**Files:**
- Create: `src/builder-styles.ts`
- Modify: `test/builder.test.ts` (add style injection tests)

**Step 1: Write failing tests for builder CSS and injection**

Append to `test/builder.test.ts`:

```typescript
import { JSDOM } from 'jsdom';
import { BUILDER_CSS, injectBuilderStyles } from '../src/builder-styles';

describe('BUILDER_CSS', () => {
  it('contains palette styles', () => {
    expect(BUILDER_CSS).toContain('.sc-builder-palette');
  });

  it('contains canvas styles', () => {
    expect(BUILDER_CSS).toContain('.sc-builder-canvas');
  });

  it('contains block card styles', () => {
    expect(BUILDER_CSS).toContain('.sc-block-card');
  });
});

describe('injectBuilderStyles', () => {
  it('injects styles idempotently', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    injectBuilderStyles(dom.window.document);
    injectBuilderStyles(dom.window.document);
    const styles = dom.window.document.querySelectorAll('#sc-builder-styles');
    expect(styles).toHaveLength(1);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — module not found.

**Step 3: Implement `src/builder-styles.ts`**

```typescript
/** CSS for the block-based template builder */
export const BUILDER_CSS = `
.sc-builder-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 0;
  border-bottom: 1px solid #dee2e6;
  margin-bottom: 10px;
}
.sc-builder-palette button {
  padding: 4px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f8f9fa;
  cursor: pointer;
  font-size: 0.78rem;
  color: #333;
}
.sc-builder-palette button:hover {
  background: #e9ecef;
  border-color: #0d6efd;
}
.sc-builder-canvas {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}
.sc-builder-empty {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  font-size: 0.85rem;
}
.sc-block-card {
  border: 1px solid #dee2e6;
  border-radius: 6px;
  margin-bottom: 8px;
  background: #fff;
  transition: border-color 0.15s;
}
.sc-block-card.selected {
  border-color: #0d6efd;
}
.sc-block-header {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  cursor: pointer;
  gap: 8px;
}
.sc-block-type {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #666;
  background: #e9ecef;
  padding: 1px 6px;
  border-radius: 3px;
  flex-shrink: 0;
}
.sc-block-summary {
  flex: 1;
  font-size: 0.85rem;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sc-block-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}
.sc-block-actions button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  color: #666;
  padding: 2px 5px;
  border-radius: 3px;
}
.sc-block-actions button:hover {
  background: #e9ecef;
  color: #333;
}
.sc-block-actions button:disabled {
  opacity: 0.3;
  cursor: default;
}
.sc-block-body {
  display: none;
  padding: 8px 10px 12px;
  border-top: 1px solid #eee;
}
.sc-block-card.selected .sc-block-body {
  display: block;
}
.sc-block-body label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #555;
  margin-bottom: 2px;
  margin-top: 8px;
}
.sc-block-body label:first-child {
  margin-top: 0;
}
.sc-block-body input[type="text"],
.sc-block-body input[type="number"],
.sc-block-body select {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.85rem;
}
.sc-block-body .sc-checkbox-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}
.sc-block-body .sc-checkbox-row input[type="checkbox"] {
  margin: 0;
}
.sc-block-body .sc-checkbox-row label {
  margin: 0;
  font-weight: normal;
}
`;

/** Inject builder CSS into a document (idempotent) */
export function injectBuilderStyles(doc: Document): void {
  if (doc.getElementById('sc-builder-styles')) return;
  const style = doc.createElement('style');
  style.id = 'sc-builder-styles';
  style.textContent = BUILDER_CSS;
  doc.head.appendChild(style);
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/builder-styles.ts test/builder.test.ts
git commit -m "feat: builder CSS — palette, canvas, block card styles"
```

---

### Task 4: Create builder-ui.ts — palette, canvas, inline editing

**Files:**
- Create: `src/builder-ui.ts`
- Create: `test/builder-ui.test.ts`

**Step 1: Write failing tests for builder UI**

Create `test/builder-ui.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { renderBuilder } from '../src/builder-ui';
import type { TemplateBlock } from '../src/types';

function setup() {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
  const doc = dom.window.document;
  const container = doc.createElement('div');
  doc.body.appendChild(container);
  const onChange = vi.fn();
  renderBuilder(container, doc, onChange);
  return { doc, container, onChange };
}

describe('renderBuilder', () => {
  it('renders palette with 6 block type buttons', () => {
    const { container } = setup();
    const buttons = container.querySelectorAll('.sc-builder-palette button');
    expect(buttons).toHaveLength(6);
  });

  it('renders empty state message when no blocks', () => {
    const { container } = setup();
    const empty = container.querySelector('.sc-builder-empty');
    expect(empty).not.toBeNull();
    expect(empty!.textContent).toContain('Click a component');
  });

  it('adds a block when palette button is clicked', () => {
    const { container, onChange } = setup();
    const headingBtn = container.querySelector('.sc-builder-palette button') as HTMLElement;
    headingBtn.click();
    const cards = container.querySelectorAll('.sc-block-card');
    expect(cards).toHaveLength(1);
    expect(onChange).toHaveBeenCalled();
  });

  it('removes empty state after adding a block', () => {
    const { container } = setup();
    const btn = container.querySelector('.sc-builder-palette button') as HTMLElement;
    btn.click();
    expect(container.querySelector('.sc-builder-empty')).toBeNull();
  });

  it('expands new block for inline editing', () => {
    const { container } = setup();
    (container.querySelector('.sc-builder-palette button') as HTMLElement).click();
    const card = container.querySelector('.sc-block-card');
    expect(card!.classList.contains('selected')).toBe(true);
  });

  it('collapses previous block when another is selected', () => {
    const { container } = setup();
    const btns = container.querySelectorAll('.sc-builder-palette button');
    (btns[0] as HTMLElement).click(); // heading
    (btns[2] as HTMLElement).click(); // text-field
    const cards = container.querySelectorAll('.sc-block-card');
    expect(cards[0].classList.contains('selected')).toBe(false);
    expect(cards[1].classList.contains('selected')).toBe(true);
  });

  it('deletes a block when X is clicked', () => {
    const { container, onChange } = setup();
    (container.querySelector('.sc-builder-palette button') as HTMLElement).click();
    onChange.mockClear();
    const delBtn = container.querySelector('.sc-block-actions button:last-child') as HTMLElement;
    delBtn.click();
    expect(container.querySelectorAll('.sc-block-card')).toHaveLength(0);
    expect(container.querySelector('.sc-builder-empty')).not.toBeNull();
    expect(onChange).toHaveBeenCalled();
  });

  it('reorders blocks with move up button', () => {
    const { container, onChange } = setup();
    const btns = container.querySelectorAll('.sc-builder-palette button');
    (btns[0] as HTMLElement).click(); // heading
    (btns[1] as HTMLElement).click(); // paragraph
    onChange.mockClear();

    // Click move-up on second block
    const cards = container.querySelectorAll('.sc-block-card');
    const header2 = cards[1].querySelector('.sc-block-header') as HTMLElement;
    header2.click(); // select it
    const moveUpBtn = cards[1].querySelector('.sc-block-actions button:first-child') as HTMLElement;
    moveUpBtn.click();

    const updatedCards = container.querySelectorAll('.sc-block-card');
    const firstType = updatedCards[0].querySelector('.sc-block-type')!.textContent;
    expect(firstType).toContain('paragraph');
    expect(onChange).toHaveBeenCalled();
  });

  it('calls onChange with blocks when editing inline properties', () => {
    const { container, doc, onChange } = setup();
    // Add a text field
    const btns = container.querySelectorAll('.sc-builder-palette button');
    (btns[2] as HTMLElement).click(); // text-field
    onChange.mockClear();

    // Edit the label input
    const labelInput = container.querySelector('.sc-block-body input[type="text"]') as HTMLInputElement;
    labelInput.value = 'Patient Name';
    labelInput.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));

    expect(onChange).toHaveBeenCalled();
    const blocks: TemplateBlock[] = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    const field = blocks[0] as any;
    expect(field.label).toBe('Patient Name');
  });

  it('auto-slugs name from label when name not manually edited', () => {
    const { container, doc, onChange } = setup();
    const btns = container.querySelectorAll('.sc-builder-palette button');
    (btns[2] as HTMLElement).click(); // text-field

    // Edit label
    const inputs = container.querySelectorAll('.sc-block-body input[type="text"]');
    const labelInput = inputs[0] as HTMLInputElement; // label is first text input
    labelInput.value = 'Supervisor Name';
    labelInput.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));

    const blocks: TemplateBlock[] = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    const field = blocks[0] as any;
    expect(field.name).toBe('supervisor_name');
  });

  it('returns current blocks via onChange', () => {
    const { container, onChange } = setup();
    const btns = container.querySelectorAll('.sc-builder-palette button');
    (btns[0] as HTMLElement).click(); // heading
    (btns[2] as HTMLElement).click(); // text-field

    const blocks: TemplateBlock[] = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe('heading');
    expect(blocks[1].type).toBe('text-field');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — module not found.

**Step 3: Implement `src/builder-ui.ts`**

```typescript
import type { BlockType, TemplateBlock, HeadingBlock, TextFieldBlock, DateFieldBlock, SelectFieldBlock, NumberFieldBlock } from './types';
import { autoSlug, createBlock } from './builder';
import { injectBuilderStyles } from './builder-styles';

type OnChange = (blocks: TemplateBlock[]) => void;

const PALETTE_ITEMS: { type: BlockType; label: string }[] = [
  { type: 'heading', label: '+Heading' },
  { type: 'paragraph', label: '+Paragraph' },
  { type: 'text-field', label: '+Text' },
  { type: 'date-field', label: '+Date' },
  { type: 'select-field', label: '+Select' },
  { type: 'number-field', label: '+Number' },
];

/** Render the block builder into a container element */
export function renderBuilder(
  container: HTMLElement,
  doc: Document,
  onChange: OnChange
): void {
  injectBuilderStyles(doc);

  const blocks: TemplateBlock[] = [];
  let selectedId: string | null = null;
  // Track which block names have been manually edited (stops auto-slug)
  const manualNames = new Set<string>();

  // -- Palette --
  const palette = doc.createElement('div');
  palette.className = 'sc-builder-palette';

  PALETTE_ITEMS.forEach(({ type, label }) => {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      const block = createBlock(type);
      blocks.push(block);
      selectedId = block.id;
      renderCanvas();
      notify();
    });
    palette.appendChild(btn);
  });

  // -- Canvas --
  const canvas = doc.createElement('div');
  canvas.className = 'sc-builder-canvas';

  container.appendChild(palette);
  container.appendChild(canvas);

  renderCanvas();

  function notify(): void {
    onChange([...blocks]);
  }

  function renderCanvas(): void {
    canvas.innerHTML = '';

    if (blocks.length === 0) {
      const empty = doc.createElement('div');
      empty.className = 'sc-builder-empty';
      empty.textContent = 'Click a component above to start building your template.';
      canvas.appendChild(empty);
      return;
    }

    blocks.forEach((block, idx) => {
      const card = doc.createElement('div');
      card.className = 'sc-block-card' + (block.id === selectedId ? ' selected' : '');
      card.dataset.blockId = block.id;

      // -- Header row --
      const header = doc.createElement('div');
      header.className = 'sc-block-header';
      header.addEventListener('click', () => {
        selectedId = selectedId === block.id ? null : block.id;
        renderCanvas();
      });

      const typeBadge = doc.createElement('span');
      typeBadge.className = 'sc-block-type';
      typeBadge.textContent = block.type;

      const summary = doc.createElement('span');
      summary.className = 'sc-block-summary';
      summary.textContent = getBlockSummary(block);

      const actions = doc.createElement('span');
      actions.className = 'sc-block-actions';
      // Stop clicks on action buttons from toggling selection
      actions.addEventListener('click', (e) => e.stopPropagation());

      const moveUp = doc.createElement('button');
      moveUp.type = 'button';
      moveUp.textContent = '\u25B2';
      moveUp.disabled = idx === 0;
      moveUp.addEventListener('click', () => {
        if (idx > 0) {
          [blocks[idx - 1], blocks[idx]] = [blocks[idx], blocks[idx - 1]];
          renderCanvas();
          notify();
        }
      });

      const moveDown = doc.createElement('button');
      moveDown.type = 'button';
      moveDown.textContent = '\u25BC';
      moveDown.disabled = idx === blocks.length - 1;
      moveDown.addEventListener('click', () => {
        if (idx < blocks.length - 1) {
          [blocks[idx], blocks[idx + 1]] = [blocks[idx + 1], blocks[idx]];
          renderCanvas();
          notify();
        }
      });

      const del = doc.createElement('button');
      del.type = 'button';
      del.textContent = '\u2715';
      del.addEventListener('click', () => {
        blocks.splice(idx, 1);
        if (selectedId === block.id) selectedId = null;
        renderCanvas();
        notify();
      });

      actions.appendChild(moveUp);
      actions.appendChild(moveDown);
      actions.appendChild(del);

      header.appendChild(typeBadge);
      header.appendChild(summary);
      header.appendChild(actions);

      // -- Body (inline editor) --
      const body = doc.createElement('div');
      body.className = 'sc-block-body';
      renderBlockEditor(body, block, idx, doc);

      card.appendChild(header);
      card.appendChild(body);
      canvas.appendChild(card);
    });
  }

  function renderBlockEditor(body: HTMLElement, block: TemplateBlock, idx: number, doc: Document): void {
    switch (block.type) {
      case 'heading': {
        const b = block as HeadingBlock;
        addSelectField(body, doc, 'Level', String(b.level), ['2', '3', '4'], (val) => {
          b.level = Number(val) as 2 | 3 | 4;
          renderCanvas();
          notify();
        });
        addTextField(body, doc, 'Text', b.text, (val) => {
          b.text = val;
          renderCanvas();
          notify();
        });
        break;
      }
      case 'paragraph': {
        addTextField(body, doc, 'Text', block.text, (val) => {
          block.text = val;
          renderCanvas();
          notify();
        });
        break;
      }
      case 'text-field':
      case 'date-field':
      case 'number-field':
      case 'select-field': {
        const b = block as TextFieldBlock | DateFieldBlock | SelectFieldBlock | NumberFieldBlock;
        addTextField(body, doc, 'Label', b.label, (val) => {
          b.label = val;
          if (!manualNames.has(b.id)) {
            b.name = autoSlug(val);
          }
          renderCanvas();
          notify();
        });
        addTextField(body, doc, 'Name', b.name, (val) => {
          manualNames.add(b.id);
          b.name = val;
          renderCanvas();
          notify();
        });
        addTextField(body, doc, 'Placeholder', b.placeholder, (val) => {
          b.placeholder = val;
          notify();
        });
        addCheckbox(body, doc, 'Required', b.required, (val) => {
          b.required = val;
          notify();
        });

        if (block.type === 'select-field') {
          const sb = block as SelectFieldBlock;
          addTextField(body, doc, 'Options (comma-separated)', sb.options.join(', '), (val) => {
            sb.options = val.split(',').map((s) => s.trim()).filter(Boolean);
            notify();
          });
        }

        if (block.type === 'number-field') {
          const nb = block as NumberFieldBlock;
          addNumberField(body, doc, 'Min', nb.min, (val) => {
            nb.min = val;
            notify();
          });
          addNumberField(body, doc, 'Max', nb.max, (val) => {
            nb.max = val;
            notify();
          });
        }
        break;
      }
    }
  }

  function addTextField(parent: HTMLElement, doc: Document, labelText: string, value: string, onInput: (val: string) => void): void {
    const label = doc.createElement('label');
    label.textContent = labelText;
    const input = doc.createElement('input');
    input.type = 'text';
    input.value = value;
    input.addEventListener('input', () => onInput(input.value));
    parent.appendChild(label);
    parent.appendChild(input);
  }

  function addNumberField(parent: HTMLElement, doc: Document, labelText: string, value: number | undefined, onInput: (val: number | undefined) => void): void {
    const label = doc.createElement('label');
    label.textContent = labelText;
    const input = doc.createElement('input');
    input.type = 'number';
    if (value !== undefined) input.value = String(value);
    input.addEventListener('input', () => {
      onInput(input.value === '' ? undefined : Number(input.value));
    });
    parent.appendChild(label);
    parent.appendChild(input);
  }

  function addSelectField(parent: HTMLElement, doc: Document, labelText: string, value: string, options: string[], onInput: (val: string) => void): void {
    const label = doc.createElement('label');
    label.textContent = labelText;
    const select = doc.createElement('select');
    options.forEach((opt) => {
      const option = doc.createElement('option');
      option.value = opt;
      option.textContent = opt;
      if (opt === value) option.selected = true;
      select.appendChild(option);
    });
    select.addEventListener('change', () => onInput(select.value));
    parent.appendChild(label);
    parent.appendChild(select);
  }

  function addCheckbox(parent: HTMLElement, doc: Document, labelText: string, checked: boolean, onInput: (val: boolean) => void): void {
    const row = doc.createElement('div');
    row.className = 'sc-checkbox-row';
    const input = doc.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.addEventListener('change', () => onInput(input.checked));
    const label = doc.createElement('label');
    label.textContent = labelText;
    row.appendChild(input);
    row.appendChild(label);
    parent.appendChild(row);
  }
}

function getBlockSummary(block: TemplateBlock): string {
  switch (block.type) {
    case 'heading':
      return block.text || 'Untitled heading';
    case 'paragraph':
      return block.text.substring(0, 50) || 'Empty paragraph';
    default:
      return (block as any).label || (block as any).name || block.type;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All builder-ui tests pass.

**Step 5: Commit**

```bash
git add src/builder-ui.ts test/builder-ui.test.ts
git commit -m "feat: builder UI — palette, canvas, inline editing, reorder, delete"
```

---

### Task 5: Replace TinyMCE editor in authoring.ts with builder

**Files:**
- Modify: `src/authoring.ts`
- Modify: `src/authoring-styles.ts`
- Modify: `test/authoring.test.ts`

**Step 1: Update tests**

Replace the TinyMCE-specific tests. Update `test/authoring.test.ts` — keep the existing `buildPlaceholderSpan` and CSS tests, add a test that `openAuthoring` no longer references TinyMCE:

Append to `test/authoring.test.ts`:

```typescript
import { openAuthoring, closeAuthoring } from '../src/authoring';

describe('openAuthoring with builder', () => {
  it('renders builder palette instead of TinyMCE', () => {
    // Mock minimal DOM environment
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    const doc = dom.window.document;

    // Patch global document for openAuthoring
    const origDoc = globalThis.document;
    (globalThis as any).document = doc;

    try {
      openAuthoring({ enableAuthoring: true }, [{ id: 'general', label: 'General' }]);
      const overlay = doc.getElementById('sc-authoring-overlay');
      expect(overlay).not.toBeNull();
      // Should have builder palette, not TinyMCE textarea
      expect(overlay!.querySelector('.sc-builder-palette')).not.toBeNull();
      expect(overlay!.querySelector('#sc-authoring-textarea')).toBeNull();
    } finally {
      (globalThis as any).document = origDoc;
    }
  });
});
```

**Step 2: Run tests to verify the new test fails**

Run: `npm test`
Expected: FAIL — authoring still renders TinyMCE textarea.

**Step 3: Modify `src/authoring.ts`**

Replace the TinyMCE editor section with the block builder. Key changes:

1. Remove `declare const tinymce: any;`
2. Remove the `authoringEditor` variable and `cleanupEditor()` function
3. Remove the TinyMCE `init()` call and `openPlaceholderDialog` function
4. Replace the editor div with a call to `renderBuilder()`
5. Wire builder's `onChange` to update the preview via `modelToHTML()`
6. Store latest blocks so Save button can call `modelToHTML()` for `TemplateDraft.content`
7. Keep `buildPlaceholderSpan` exported (it may be used elsewhere)

The full modified `src/authoring.ts`:

```typescript
import type { StructuredContentConfig, Category, TemplateDraft, TemplateBlock } from './types';
import { injectAuthoringStyles } from './authoring-styles';
import { PLACEHOLDER_CSS } from './placeholders';
import { renderBuilder } from './builder-ui';
import { modelToHTML } from './builder';

/**
 * Build an HTML span for a placeholder field.
 * Used by the Insert Placeholder dialog to generate tmpl-field markup.
 */
export function buildPlaceholderSpan(
  name: string,
  type: string,
  required: boolean,
  options?: string,
  min?: number,
  max?: number
): string {
  let attrs = `class="tmpl-field" data-field="${name}" data-type="${type}"`;
  if (required) attrs += ' data-required="true"';
  if (type === 'select' && options) attrs += ` data-options="${options}"`;
  if (type === 'number' && min !== undefined) attrs += ` data-min="${min}"`;
  if (type === 'number' && max !== undefined) attrs += ` data-max="${max}"`;
  const display = `{${name}}`;
  return `<span ${attrs}>${display}</span>`;
}

/** Open the template authoring modal */
export function openAuthoring(config: StructuredContentConfig, categories: Category[]): void {
  injectAuthoringStyles(document);

  let currentBlocks: TemplateBlock[] = [];
  let debounceTimer: ReturnType<typeof setTimeout>;

  // -- Overlay --
  const overlay = document.createElement('div');
  overlay.className = 'sc-authoring-overlay';
  overlay.id = 'sc-authoring-overlay';

  // -- Modal --
  const modal = document.createElement('div');
  modal.className = 'sc-authoring-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-label', 'Create Template');

  // -- Header --
  const header = document.createElement('div');
  header.className = 'sc-authoring-header';
  const h3 = document.createElement('h3');
  h3.textContent = 'Create Template';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'sc-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', closeAuthoring);
  header.appendChild(h3);
  header.appendChild(closeBtn);

  // -- Body --
  const body = document.createElement('div');
  body.className = 'sc-authoring-body';

  // Left pane: metadata + builder
  const left = document.createElement('div');
  left.className = 'sc-authoring-left';

  // Metadata fields
  const meta = document.createElement('div');
  meta.className = 'sc-authoring-meta';

  const titleLabel = document.createElement('label');
  titleLabel.textContent = 'Title';
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.placeholder = 'Template title';

  const descLabel = document.createElement('label');
  descLabel.textContent = 'Description';
  const descInput = document.createElement('textarea');
  descInput.placeholder = 'Brief description';

  const catLabel = document.createElement('label');
  catLabel.textContent = 'Category';
  const catSelect = document.createElement('select');
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = 'Select category...';
  catSelect.appendChild(defaultOpt);
  categories.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.label;
    catSelect.appendChild(opt);
  });

  meta.appendChild(titleLabel);
  meta.appendChild(titleInput);
  meta.appendChild(descLabel);
  meta.appendChild(descInput);
  meta.appendChild(catLabel);
  meta.appendChild(catSelect);

  // Builder area (replaces TinyMCE)
  const builderDiv = document.createElement('div');
  builderDiv.className = 'sc-authoring-editor';

  left.appendChild(meta);
  left.appendChild(builderDiv);

  // Right pane: live preview
  const right = document.createElement('div');
  right.className = 'sc-authoring-right';

  const previewSection = document.createElement('div');
  previewSection.className = 'sc-authoring-preview';
  const previewH4 = document.createElement('h4');
  previewH4.textContent = 'Live Preview';
  const previewContent = document.createElement('div');
  previewContent.className = 'sc-authoring-preview-content';

  const previewStyle = document.createElement('style');
  previewStyle.textContent = PLACEHOLDER_CSS;

  previewSection.appendChild(previewH4);
  previewSection.appendChild(previewContent);
  right.appendChild(previewStyle);
  right.appendChild(previewSection);

  body.appendChild(left);
  body.appendChild(right);

  // -- Footer: scope + save --
  const footer = document.createElement('div');
  footer.className = 'sc-authoring-footer';

  const scopeDiv = document.createElement('div');
  scopeDiv.className = 'sc-authoring-scope';
  const savableScopes = (config.scopes || ['personal']).filter((s) => s !== 'site');
  savableScopes.forEach((scope, i) => {
    const label = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'sc-authoring-scope';
    radio.value = scope;
    if (i === 0) radio.checked = true;
    const scopeLabels: Record<string, string> = { personal: 'Personal', group: 'Group' };
    label.appendChild(radio);
    label.appendChild(document.createTextNode(' ' + (scopeLabels[scope] || scope)));
    scopeDiv.appendChild(label);
  });

  const saveBtn = document.createElement('button');
  saveBtn.className = 'sc-btn sc-btn-primary';
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', async () => {
    const titleVal = titleInput.value.trim();
    if (!titleVal) {
      titleInput.style.borderColor = '#d9534f';
      titleInput.focus();
      return;
    }

    const description = descInput.value.trim();
    const category = catSelect.value;
    const content = modelToHTML(currentBlocks);
    const scopeRadio = document.querySelector(
      'input[name="sc-authoring-scope"]:checked'
    ) as HTMLInputElement | null;
    const scope = (scopeRadio?.value || 'personal') as 'personal' | 'group';

    const draft: TemplateDraft = { title: titleVal, description, content, category };

    if (config.onSave) {
      try {
        await config.onSave(draft, scope);
        closeAuthoring();
      } catch (err) {
        console.error('Failed to save template:', err);
      }
    }
  });

  footer.appendChild(scopeDiv);
  footer.appendChild(saveBtn);

  // Assemble modal
  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  overlay.appendChild(modal);

  // Click outside to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeAuthoring();
  });

  // Escape to close
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeAuthoring();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  document.body.appendChild(overlay);

  // -- Initialize builder --
  renderBuilder(builderDiv, document, (blocks) => {
    currentBlocks = blocks;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      previewContent.innerHTML = modelToHTML(blocks);
    }, 300);
  });

  titleInput.focus();
}

/** Close the authoring modal */
export function closeAuthoring(): void {
  const overlay = document.getElementById('sc-authoring-overlay');
  if (overlay) overlay.remove();
}
```

**Step 4: Update `src/authoring-styles.ts`**

Remove the TinyMCE-specific `.sc-authoring-editor` min-height rule and adjust for the builder:

Replace the `.sc-authoring-editor` block (lines 68-72):

```css
.sc-authoring-editor {
  display: flex;
  flex-direction: column;
  flex: 1;
}
```

**Step 5: Run all tests**

Run: `npm test`
Expected: All tests pass (builder tests + authoring tests + existing tests).

**Step 6: Run build**

Run: `npm run build`
Expected: Build succeeds.

**Step 7: Commit**

```bash
git add src/authoring.ts src/authoring-styles.ts test/authoring.test.ts
git commit -m "feat: replace TinyMCE editor with block builder in authoring modal"
```

---

### Task 6: Update docs

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add builder entry to Architecture section in `CLAUDE.md`**

Add after the `src/styles.ts` line:

```markdown
- `src/builder.ts` — block model logic (createBlock, autoSlug, modelToHTML)
- `src/builder-ui.ts` — visual builder UI (palette, canvas, inline editing)
- `src/builder-styles.ts` — CSS for builder components
```

**Step 2: Run tests one final time**

Run: `npm test`
Expected: All tests pass.

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add builder files to architecture section"
```
