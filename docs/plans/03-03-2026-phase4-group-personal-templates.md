# Phase 4: Group & Personal Templates — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add template authoring UI and scoped template browsing — users can create templates with a full authoring modal and browse templates by scope (My Templates / Group / Site).

**Architecture:** Extend types with `TemplateDraft` and config options (`enableAuthoring`, `scopes`, `onSave`). Add scope tabs and authoring footer to browser modal. Create separate `authoring.ts` module with modal shell, embedded TinyMCE editor, Insert Placeholder dialog, live preview, and save flow. All persistence delegated to host app via `onSave` callback.

**Tech Stack:** TypeScript, Vitest + jsdom for tests, Rollup for build, TinyMCE 7 API (windowManager, editor.ui.registry)

---

### Task 1: Extend types.ts with Phase 4 interfaces

**Files:**
- Modify: `src/types.ts:23-31` (StructuredContentConfig interface)

**Step 1: Add TemplateDraft and TemplateScope, extend StructuredContentConfig**

In `src/types.ts`, add after the `PlaceholderField` interface (after line 44):

```typescript

export type TemplateScope = 'personal' | 'group' | 'site';

export interface TemplateDraft {
  title: string;
  description: string;
  content: string;
  category: string;
}
```

Update `StructuredContentConfig` — change:

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

to:

```typescript
export interface StructuredContentConfig {
  templates?: Template[];
  fetch?: (query?: string, scope?: TemplateScope) => Promise<FetchResult>;
  onSave?: (template: TemplateDraft, scope: 'personal' | 'group') => Promise<{ id: string }>;
  insertMode?: 'cursor' | 'document' | 'both';
  variables?: Record<string, string>;
  modalTitle?: string;
  strings?: Record<string, string>;
  validation?: 'warn' | 'none';
  enableAuthoring?: boolean;
  scopes?: TemplateScope[];
}
```

**Step 2: Run build to verify types compile**

Run: `npm run build`
Expected: Build succeeds with no type errors

**Step 3: Run tests to verify nothing breaks**

Run: `npm test`
Expected: All existing tests pass

**Step 4: Commit**

```bash
git add src/types.ts
git commit -m "feat: add TemplateDraft interface and extend config for Phase 4"
```

---

### Task 2: Add scope tab and footer CSS to styles.ts

**Files:**
- Modify: `src/styles.ts:2-148` (MODAL_CSS constant)
- Modify: `test/browser.test.ts`

**Step 1: Write failing tests**

Add to `test/browser.test.ts`, after the existing imports:

```typescript
import { MODAL_CSS } from '../src/styles';
```

Add after the existing `describe('filterTemplates', ...)` block:

```typescript
describe('MODAL_CSS — Phase 4', () => {
  it('contains scope tab styles', () => {
    expect(MODAL_CSS).toContain('.sc-scope-tabs');
    expect(MODAL_CSS).toContain('.sc-scope-tab');
  });

  it('contains footer styles', () => {
    expect(MODAL_CSS).toContain('.sc-footer');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — MODAL_CSS doesn't contain `.sc-scope-tabs` or `.sc-footer`

**Step 3: Add CSS to MODAL_CSS**

In `src/styles.ts`, add before the closing backtick of `MODAL_CSS` (before the line with `` `; `` at line 148):

```css
.sc-scope-tabs {
  display: flex;
  border-bottom: 1px solid #dee2e6;
  padding: 0 20px;
}
.sc-scope-tab {
  padding: 8px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.85rem;
  color: #666;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.sc-scope-tab:hover { color: #333; }
.sc-scope-tab.active {
  color: #0d6efd;
  border-bottom-color: #0d6efd;
  font-weight: 600;
}
.sc-footer {
  padding: 10px 20px;
  border-top: 1px solid #dee2e6;
  text-align: right;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/styles.ts test/browser.test.ts
git commit -m "feat: add scope tab and footer CSS to MODAL_CSS"
```

---

### Task 3: Add scope tabs and footer to browser modal

**Files:**
- Modify: `src/browser.ts:1-4` (imports)
- Modify: `src/browser.ts:35-56` (openBrowser function)
- Modify: `src/browser.ts:69-317` (renderModal function)

**Step 1: Update openBrowser to pass scope to fetch**

In `src/browser.ts`, change the fetch call in `openBrowser` from:

```typescript
  const dataPromise: Promise<void> = config.fetch
    ? config.fetch().then((result) => {
        allTemplates = result.templates;
        allCategories = result.categories;
      })
```

to:

```typescript
  const initialScope = config.scopes?.[0];
  const dataPromise: Promise<void> = config.fetch
    ? config.fetch(undefined, initialScope).then((result) => {
        allTemplates = result.templates;
        allCategories = result.categories;
      })
```

**Step 2: Make renderModal parameters mutable**

Change the `renderModal` function signature and add mutable bindings:

```typescript
function renderModal(
  editor: any,
  config: StructuredContentConfig,
  initialTemplates: Template[],
  initialCategories: Category[]
): void {
  const title = config.modalTitle || 'Structured Content';
  const insertMode = config.insertMode || 'both';
  let activeCategory: string | null = null;
  let searchQuery = '';
  let selectedTemplate: Template | null = null;
  let templates = initialTemplates;
  let categories = initialCategories;
```

**Step 3: Add scope tab bar rendering**

After the `header` construction (after line 103) and before the `body` construction (line 105), add:

```typescript
  let activeScope = config.scopes?.[0] || 'site';

  // -- Scope tabs (only when 2+ scopes) --
  let scopeTabsEl: HTMLElement | null = null;
  if (config.scopes && config.scopes.length >= 2) {
    scopeTabsEl = document.createElement('div');
    scopeTabsEl.className = 'sc-scope-tabs';

    const scopeLabels: Record<string, string> = {
      personal: 'My Templates',
      group: 'Group',
      site: 'Site',
    };

    config.scopes.forEach((scope) => {
      const tab = document.createElement('button');
      tab.className = 'sc-scope-tab' + (scope === activeScope ? ' active' : '');
      tab.textContent = scopeLabels[scope] || scope;
      tab.dataset.scope = scope;
      tab.addEventListener('click', () => {
        activeScope = scope;
        updateScopeTabsActive();
        if (config.fetch) {
          config.fetch(searchQuery || undefined, scope).then((result) => {
            templates = result.templates;
            categories = result.categories;
            rebuildSidebar();
            renderCards();
          });
        }
      });
      scopeTabsEl!.appendChild(tab);
    });
  }
```

**Step 4: Add footer with "Create Template" button**

After the scope tabs and body construction, before assembling the modal, add:

```typescript
  // -- Footer (only when enableAuthoring is true) --
  let footerEl: HTMLElement | null = null;
  if (config.enableAuthoring) {
    footerEl = document.createElement('div');
    footerEl.className = 'sc-footer';

    const createBtn = document.createElement('button');
    createBtn.className = 'sc-btn sc-btn-primary';
    createBtn.textContent = '+ Create Template';
    createBtn.addEventListener('click', () => {
      closeBrowser();
      openAuthoring(config, categories);
    });
    footerEl.appendChild(createBtn);
  }
```

**Step 5: Add import for openAuthoring**

At the top of `src/browser.ts`, add:

```typescript
import { openAuthoring } from './authoring';
```

**Step 6: Insert scope tabs and footer into modal assembly**

Change the modal assembly from:

```typescript
  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(preview);
```

to:

```typescript
  modal.appendChild(header);
  if (scopeTabsEl) modal.appendChild(scopeTabsEl);
  modal.appendChild(body);
  if (footerEl) modal.appendChild(footerEl);
  modal.appendChild(preview);
```

**Step 7: Add helper functions**

Add `updateScopeTabsActive` and `rebuildSidebar` to the helper functions section inside `renderModal`:

```typescript
  function updateScopeTabsActive(): void {
    if (!scopeTabsEl) return;
    scopeTabsEl.querySelectorAll('.sc-scope-tab').forEach((btn) => {
      const el = btn as HTMLElement;
      el.classList.toggle('active', el.dataset.scope === activeScope);
    });
  }

  function rebuildSidebar(): void {
    sidebar.innerHTML = '';
    activeCategory = null;

    const allBtn = document.createElement('button');
    allBtn.className = 'sc-sidebar-item active';
    allBtn.textContent = 'All';
    allBtn.addEventListener('click', () => {
      activeCategory = null;
      updateSidebarActive();
      renderCards();
    });
    sidebar.appendChild(allBtn);

    categories.forEach((cat) => {
      const btn = document.createElement('button');
      btn.className = 'sc-sidebar-item';
      btn.textContent = cat.label;
      btn.dataset.categoryId = cat.id;
      btn.addEventListener('click', () => {
        activeCategory = cat.id;
        updateSidebarActive();
        renderCards();
      });
      sidebar.appendChild(btn);
    });
  }
```

**Step 8: Create authoring.ts stub**

Create `src/authoring.ts` so the import resolves:

```typescript
import type { StructuredContentConfig, Category } from './types';

/** Open the template authoring modal (stub — full implementation in Task 5) */
export function openAuthoring(config: StructuredContentConfig, categories: Category[]): void {
  console.log('Authoring modal not yet implemented');
}

/** Close the authoring modal */
export function closeAuthoring(): void {
  const overlay = document.getElementById('sc-authoring-overlay');
  if (overlay) overlay.remove();
}
```

**Step 9: Build and test**

Run: `npm run build && npm test`
Expected: Build succeeds (no circular dependency), all tests pass

**Step 10: Commit**

```bash
git add src/browser.ts src/authoring.ts
git commit -m "feat: add scope tabs and Create Template footer to browser modal"
```

---

### Task 4: Create authoring-styles.ts, buildPlaceholderSpan, and tests

**Files:**
- Create: `src/authoring-styles.ts`
- Modify: `src/authoring.ts`
- Create: `test/authoring.test.ts`

**Step 1: Write failing tests**

Create `test/authoring.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { AUTHORING_CSS, injectAuthoringStyles } from '../src/authoring-styles';
import { buildPlaceholderSpan } from '../src/authoring';

describe('AUTHORING_CSS', () => {
  it('contains authoring modal styles', () => {
    expect(AUTHORING_CSS).toContain('.sc-authoring-overlay');
    expect(AUTHORING_CSS).toContain('.sc-authoring-modal');
    expect(AUTHORING_CSS).toContain('.sc-authoring-header');
    expect(AUTHORING_CSS).toContain('.sc-authoring-body');
    expect(AUTHORING_CSS).toContain('.sc-authoring-preview');
    expect(AUTHORING_CSS).toContain('.sc-authoring-footer');
  });
});

describe('injectAuthoringStyles', () => {
  it('injects styles into document head (idempotent)', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    injectAuthoringStyles(dom.window.document);
    injectAuthoringStyles(dom.window.document);

    const styles = dom.window.document.querySelectorAll('#sc-authoring-styles');
    expect(styles).toHaveLength(1);
  });
});

describe('buildPlaceholderSpan', () => {
  it('builds a text placeholder span', () => {
    const html = buildPlaceholderSpan('name', 'text', false);
    expect(html).toContain('class="tmpl-field"');
    expect(html).toContain('data-field="name"');
    expect(html).toContain('data-type="text"');
    expect(html).not.toContain('data-required');
    expect(html).toContain('{name}');
  });

  it('builds a required field span', () => {
    const html = buildPlaceholderSpan('date', 'date', true);
    expect(html).toContain('data-required="true"');
    expect(html).toContain('data-type="date"');
    expect(html).toContain('{date}');
  });

  it('builds a select field with options', () => {
    const html = buildPlaceholderSpan('level', 'select', false, 'Direct|Indirect|Distant');
    expect(html).toContain('data-type="select"');
    expect(html).toContain('data-options="Direct|Indirect|Distant"');
  });

  it('builds a number field with min/max', () => {
    const html = buildPlaceholderSpan('score', 'number', true, undefined, 1, 5);
    expect(html).toContain('data-type="number"');
    expect(html).toContain('data-min="1"');
    expect(html).toContain('data-max="5"');
    expect(html).toContain('data-required="true"');
  });

  it('omits min/max when not provided', () => {
    const html = buildPlaceholderSpan('count', 'number', false);
    expect(html).toContain('data-type="number"');
    expect(html).not.toContain('data-min');
    expect(html).not.toContain('data-max');
  });

  it('omits options when type is not select', () => {
    const html = buildPlaceholderSpan('name', 'text', false, 'A|B|C');
    expect(html).not.toContain('data-options');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `AUTHORING_CSS` and `buildPlaceholderSpan` don't exist

**Step 3: Create authoring-styles.ts**

Create `src/authoring-styles.ts`:

```typescript
/** CSS for the template authoring modal */
export const AUTHORING_CSS = `
.sc-authoring-overlay {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100001;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 30px;
}
.sc-authoring-modal {
  background: #fff;
  border-radius: 8px;
  width: 960px;
  max-width: 95vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}
.sc-authoring-header {
  padding: 15px 20px;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.sc-authoring-header h3 { margin: 0; font-size: 1.1rem; }
.sc-authoring-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.sc-authoring-left {
  flex: 1;
  padding: 15px 20px;
  overflow-y: auto;
  border-right: 1px solid #dee2e6;
}
.sc-authoring-right {
  width: 380px;
  flex-shrink: 0;
  overflow-y: auto;
}
.sc-authoring-meta {
  margin-bottom: 15px;
}
.sc-authoring-meta label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 3px;
  color: #555;
}
.sc-authoring-meta input,
.sc-authoring-meta textarea,
.sc-authoring-meta select {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
  margin-bottom: 10px;
}
.sc-authoring-meta textarea { resize: vertical; min-height: 60px; }
.sc-authoring-editor {
  border: 1px solid #ccc;
  border-radius: 4px;
  min-height: 250px;
}
.sc-authoring-preview {
  padding: 15px 20px;
}
.sc-authoring-preview h4 {
  margin: 0 0 10px;
  font-size: 0.9rem;
  color: #555;
}
.sc-authoring-preview-content {
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 15px;
  min-height: 200px;
}
.sc-authoring-footer {
  padding: 12px 20px;
  border-top: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.sc-authoring-scope {
  display: flex;
  gap: 16px;
  align-items: center;
}
.sc-authoring-scope label {
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}
`;

/** Inject authoring CSS into a document (idempotent) */
export function injectAuthoringStyles(doc: Document): void {
  if (doc.getElementById('sc-authoring-styles')) return;
  const style = doc.createElement('style');
  style.id = 'sc-authoring-styles';
  style.textContent = AUTHORING_CSS;
  doc.head.appendChild(style);
}
```

**Step 4: Add buildPlaceholderSpan to authoring.ts**

Replace the contents of `src/authoring.ts` with:

```typescript
import type { StructuredContentConfig, Category, TemplateDraft } from './types';
import { injectAuthoringStyles } from './authoring-styles';
import { PLACEHOLDER_CSS } from './placeholders';

declare const tinymce: any;

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

/** Open the template authoring modal (full implementation in Task 5) */
export function openAuthoring(config: StructuredContentConfig, categories: Category[]): void {
  injectAuthoringStyles(document);
  console.log('Authoring modal — full implementation pending');
}

/** Close the authoring modal */
export function closeAuthoring(): void {
  const overlay = document.getElementById('sc-authoring-overlay');
  if (overlay) overlay.remove();
}
```

**Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/authoring-styles.ts src/authoring.ts test/authoring.test.ts
git commit -m "feat: add authoring CSS, buildPlaceholderSpan utility, and tests"
```

---

### Task 5: Implement full authoring modal

**Files:**
- Modify: `src/authoring.ts`

**Step 1: Replace openAuthoring with full implementation**

Replace the `openAuthoring` function in `src/authoring.ts`:

```typescript
/** Open the template authoring modal */
export function openAuthoring(config: StructuredContentConfig, categories: Category[]): void {
  injectAuthoringStyles(document);

  let authoringEditor: any = null;

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
  closeBtn.addEventListener('click', () => {
    cleanupEditor();
    closeAuthoring();
  });
  header.appendChild(h3);
  header.appendChild(closeBtn);

  // -- Body --
  const body = document.createElement('div');
  body.className = 'sc-authoring-body';

  // Left pane: metadata + editor
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

  // Editor area
  const editorDiv = document.createElement('div');
  editorDiv.className = 'sc-authoring-editor';
  const textarea = document.createElement('textarea');
  textarea.id = 'sc-authoring-textarea';
  editorDiv.appendChild(textarea);

  left.appendChild(meta);
  left.appendChild(editorDiv);

  // Right pane: live preview
  const right = document.createElement('div');
  right.className = 'sc-authoring-right';

  const previewSection = document.createElement('div');
  previewSection.className = 'sc-authoring-preview';
  const previewH4 = document.createElement('h4');
  previewH4.textContent = 'Live Preview';
  const previewContent = document.createElement('div');
  previewContent.className = 'sc-authoring-preview-content';

  // Inject placeholder CSS into preview for field styling
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

  // Scope radio buttons (personal/group — excludes 'site')
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

  // Save button
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
    const content = authoringEditor ? authoringEditor.getContent() : '';
    const scopeRadio = document.querySelector(
      'input[name="sc-authoring-scope"]:checked'
    ) as HTMLInputElement | null;
    const scope = (scopeRadio?.value || 'personal') as 'personal' | 'group';

    const draft: TemplateDraft = { title: titleVal, description, content, category };

    if (config.onSave) {
      try {
        await config.onSave(draft, scope);
        cleanupEditor();
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
    if (e.target === overlay) {
      cleanupEditor();
      closeAuthoring();
    }
  });

  // Escape to close
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      cleanupEditor();
      closeAuthoring();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  document.body.appendChild(overlay);

  // -- Initialize TinyMCE editor --
  let debounceTimer: ReturnType<typeof setTimeout>;

  tinymce.init({
    target: textarea,
    height: 280,
    menubar: false,
    toolbar: 'undo redo | bold italic underline | bullist numlist | insertplaceholder',
    plugins: 'lists',
    promotion: false,
    branding: false,
    setup: (ed: any) => {
      authoringEditor = ed;

      // Register Insert Placeholder toolbar button
      ed.ui.registry.addButton('insertplaceholder', {
        text: 'Insert Placeholder',
        onAction: () => openPlaceholderDialog(ed),
      });

      // Live preview on content change
      ed.on('input keyup change SetContent', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          previewContent.innerHTML = ed.getContent();
        }, 300);
      });
    },
  });

  titleInput.focus();

  function cleanupEditor(): void {
    if (authoringEditor) {
      authoringEditor.remove();
      authoringEditor = null;
    }
  }
}
```

**Step 2: Add openPlaceholderDialog function**

Add after the `closeAuthoring` function:

```typescript
/** Open the Insert Placeholder dialog in the authoring editor */
function openPlaceholderDialog(editor: any): void {
  editor.windowManager.open({
    title: 'Insert Placeholder',
    body: {
      type: 'panel',
      items: [
        { type: 'input', name: 'fieldName', label: 'Field name' },
        {
          type: 'selectbox',
          name: 'fieldType',
          label: 'Type',
          items: [
            { text: 'Text', value: 'text' },
            { text: 'Date', value: 'date' },
            { text: 'Select', value: 'select' },
            { text: 'Number', value: 'number' },
          ],
        },
        { type: 'checkbox', name: 'required', label: 'Required' },
        { type: 'input', name: 'options', label: 'Options (pipe-separated, for Select type)' },
        { type: 'input', name: 'min', label: 'Min (for Number type)' },
        { type: 'input', name: 'max', label: 'Max (for Number type)' },
      ],
    },
    buttons: [
      { type: 'cancel', text: 'Cancel' },
      { type: 'submit', text: 'Insert', primary: true },
    ],
    onSubmit: (api: any) => {
      const data = api.getData();
      if (!data.fieldName) return;

      const span = buildPlaceholderSpan(
        data.fieldName,
        data.fieldType,
        data.required,
        data.options || undefined,
        data.min ? Number(data.min) : undefined,
        data.max ? Number(data.max) : undefined
      );
      editor.insertContent(span);
      api.close();
    },
  });
}
```

**Step 3: Build and test**

Run: `npm run build && npm test`
Expected: Build succeeds, all tests pass

**Step 4: Commit**

```bash
git add src/authoring.ts
git commit -m "feat: implement full authoring modal with editor, placeholder dialog, preview, and save"
```

---

### Task 6: Wire plugin and verify integration

**Files:**
- Modify: `src/plugin.ts` (no changes needed — browser.ts already imports authoring.ts)

**Step 1: Verify module graph**

Confirm the import chain: `plugin.ts → browser.ts → authoring.ts → authoring-styles.ts`. No circular dependencies. `plugin.ts` itself does NOT need to import authoring — the browser footer handles the launch.

**Step 2: Full build**

Run: `npm run build`
Expected: `dist/plugin.js` generated without errors or warnings. No circular dependency warnings.

**Step 3: Full test run**

Run: `npm test`
Expected: All tests pass

**Step 4: Verify dist bundle includes authoring code**

Run: `grep -c "sc-authoring" dist/plugin.js`
Expected: Non-zero count — authoring CSS and class names are in the bundle

**Step 5: Commit (only if changes were needed)**

If no changes were needed, skip this commit. If `plugin.ts` needed adjustment:

```bash
git add src/plugin.ts
git commit -m "feat: wire authoring modal into plugin module graph"
```

---

### Task 7: Build, full test run, update docs

**Files:**
- Modify: `CLAUDE.md`
- Modify: `ROADMAP.md`

**Step 1: Full build**

Run: `npm run build`
Expected: `dist/plugin.js` generated without errors or warnings

**Step 2: Full test run**

Run: `npm test`
Expected: All tests pass

**Step 3: Update CLAUDE.md**

Add after the "## Placeholder Linking (v0.4.0)" section:

```markdown

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
```

**Step 4: Update ROADMAP.md**

Change the Phase 4 header from `## Phase 4: Group & Personal Templates — v0.5.0` to `## Phase 4: Group & Personal Templates — v0.5.0 ✓`

In the Summary table, change Phase 4 Priority from `Medium` to `**Done**`.

**Step 5: Commit**

```bash
git add CLAUDE.md ROADMAP.md
git commit -m "docs: update CLAUDE.md and ROADMAP.md for Phase 4 group & personal templates"
```

**Step 6: Tag release**

Do NOT create the tag. The user will tag when ready.
