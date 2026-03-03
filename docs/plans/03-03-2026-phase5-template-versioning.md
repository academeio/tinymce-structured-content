# Phase 5: Template Versioning — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Track template versions so documents created from older templates can be detected and optionally migrated to the latest version with name-based field value mapping.

**Architecture:** Extend `Template` with `version` field, stamp `data-template-version` on inserted content. New `versioning.ts` module handles version checking (via `checkVersion` callback), info banner UI, and migration logic. Plugin hooks version check on `SetContent` event. All persistence delegated to host app via callbacks.

**Tech Stack:** TypeScript, Vitest + jsdom for tests, Rollup for build, TinyMCE 7 API

---

### Task 1: Extend types.ts with Phase 5 interfaces

**Files:**
- Modify: `src/types.ts`

**Step 1: Add version to Template and new interfaces**

In `src/types.ts`, add `version` to the `Template` interface:

```typescript
export interface Template {
  id: string;
  title: string;
  description?: string;
  content: string;
  category?: string;
  thumbnail?: string;
  version?: string;
}
```

Add after the `TemplateDraft` interface (after line 56):

```typescript

export interface VersionCheckResult {
  latestVersion: string;
  latestTemplate: Template;
}
```

Add `checkVersion` to `StructuredContentConfig` (after the `scopes` line):

```typescript
  checkVersion?: (templateId: string, currentVersion: string) => Promise<VersionCheckResult | null>;
```

**Step 2: Run build to verify types compile**

Run: `npm run build`
Expected: Build succeeds with no type errors

**Step 3: Run tests to verify nothing breaks**

Run: `npm test`
Expected: All 79 tests pass

**Step 4: Commit**

```bash
git add src/types.ts
git commit -m "feat: add version to Template and VersionCheckResult interface for Phase 5"
```

---

### Task 2: Stamp version on insertion

**Files:**
- Modify: `src/insertion.ts:25-42` (insertTemplate function)
- Modify: `src/browser.ts:313` (insertTemplate caller)
- Modify: `test/insertion.test.ts`

**Step 1: Write failing tests**

Add to the `describe('insertTemplate', ...)` block in `test/insertion.test.ts`:

```typescript
  it('stamps data-template-version when version is provided (cursor mode)', () => {
    const editor = mockEditor();
    insertTemplate(editor, '<p>Hello</p>', 'tpl-1', 'cursor', {}, 'v2.1');
    expect(editor._content).toContain('data-template-version="v2.1"');
    expect(editor._content).toContain('data-template-id="tpl-1"');
  });

  it('does not stamp version when not provided (backward compat)', () => {
    const editor = mockEditor();
    insertTemplate(editor, '<p>Hello</p>', 'tpl-1', 'cursor', {});
    expect(editor._content).not.toContain('data-template-version');
    expect(editor._content).toContain('data-template-id="tpl-1"');
  });
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `insertTemplate` doesn't accept a 6th parameter yet (test 1 may still pass coincidentally since the param is unused; the assertion on `data-template-version` is what should fail)

**Step 3: Update insertTemplate to accept and stamp version**

In `src/insertion.ts`, change `insertTemplate` from:

```typescript
export function insertTemplate(
  editor: any,
  html: string,
  templateId: string,
  mode: 'cursor' | 'document',
  config: StructuredContentConfig
): void {
  const processed = replaceVariables(html, config.variables);

  editor.undoManager.transact(() => {
    if (mode === 'document') {
      editor.setContent(processed);
    } else {
      const wrapped = `<div class="sc-template" data-template-id="${escapeHtml(templateId)}">${processed}</div>`;
      editor.insertContent(wrapped);
    }
  });
}
```

to:

```typescript
export function insertTemplate(
  editor: any,
  html: string,
  templateId: string,
  mode: 'cursor' | 'document',
  config: StructuredContentConfig,
  templateVersion?: string
): void {
  const processed = replaceVariables(html, config.variables);

  editor.undoManager.transact(() => {
    if (mode === 'document') {
      editor.setContent(processed);
    } else {
      let versionAttr = '';
      if (templateVersion) {
        versionAttr = ` data-template-version="${escapeHtml(templateVersion)}"`;
      }
      const wrapped = `<div class="sc-template" data-template-id="${escapeHtml(templateId)}"${versionAttr}>${processed}</div>`;
      editor.insertContent(wrapped);
    }
  });
}
```

**Step 4: Update browser.ts caller to pass version**

In `src/browser.ts`, find the `doInsert` function (inside `renderModal`). Change:

```typescript
    insertTemplate(editor, selectedTemplate.content, selectedTemplate.id, mode, config);
```

to:

```typescript
    insertTemplate(editor, selectedTemplate.content, selectedTemplate.id, mode, config, selectedTemplate.version);
```

**Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/insertion.ts src/browser.ts test/insertion.test.ts
git commit -m "feat: stamp data-template-version on cursor-mode insertion"
```

---

### Task 3: Create versioning.ts with CSS and banner functions

**Files:**
- Create: `src/versioning.ts`
- Create: `test/versioning.test.ts`

**Step 1: Write failing tests**

Create `test/versioning.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  VERSIONING_CSS,
  injectVersioningStyles,
  showVersionBanner,
  dismissVersionBanner,
} from '../src/versioning';

describe('VERSIONING_CSS', () => {
  it('contains version banner styles', () => {
    expect(VERSIONING_CSS).toContain('.sc-version-banner');
    expect(VERSIONING_CSS).toContain('.sc-version-update');
    expect(VERSIONING_CSS).toContain('.sc-version-dismiss');
  });
});

describe('injectVersioningStyles', () => {
  it('injects styles into document head (idempotent)', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    injectVersioningStyles(dom.window.document);
    injectVersioningStyles(dom.window.document);

    const styles = dom.window.document.querySelectorAll('#sc-versioning-styles');
    expect(styles).toHaveLength(1);
  });
});

describe('showVersionBanner', () => {
  it('creates a banner with template name', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><p>Content</p></body></html>');
    showVersionBanner(dom.window.document, 'Clinical Encounter', () => {}, () => {});

    const banner = dom.window.document.querySelector('.sc-version-banner');
    expect(banner).not.toBeNull();
    expect(banner!.textContent).toContain('Clinical Encounter');
    expect(banner!.textContent).toContain('newer version');
  });

  it('renders Update and Dismiss buttons', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    showVersionBanner(dom.window.document, 'Test', () => {}, () => {});

    const updateBtn = dom.window.document.querySelector('.sc-version-update');
    const dismissBtn = dom.window.document.querySelector('.sc-version-dismiss');
    expect(updateBtn).not.toBeNull();
    expect(updateBtn!.textContent).toBe('Update');
    expect(dismissBtn).not.toBeNull();
  });

  it('calls onUpdate when Update button is clicked', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    let updated = false;
    showVersionBanner(dom.window.document, 'Test', () => { updated = true; }, () => {});

    const updateBtn = dom.window.document.querySelector('.sc-version-update') as HTMLElement;
    updateBtn.click();
    expect(updated).toBe(true);
  });

  it('calls onDismiss when Dismiss button is clicked', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    let dismissed = false;
    showVersionBanner(dom.window.document, 'Test', () => {}, () => { dismissed = true; });

    const dismissBtn = dom.window.document.querySelector('.sc-version-dismiss') as HTMLElement;
    dismissBtn.click();
    expect(dismissed).toBe(true);
  });

  it('inserts banner before existing content', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><p>Content</p></body></html>');
    showVersionBanner(dom.window.document, 'Test', () => {}, () => {});

    const firstChild = dom.window.document.body.firstElementChild;
    expect(firstChild!.classList.contains('sc-version-banner')).toBe(true);
  });

  it('replaces existing banner (only one at a time)', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    showVersionBanner(dom.window.document, 'First', () => {}, () => {});
    showVersionBanner(dom.window.document, 'Second', () => {}, () => {});

    const banners = dom.window.document.querySelectorAll('.sc-version-banner');
    expect(banners).toHaveLength(1);
    expect(banners[0].textContent).toContain('Second');
  });
});

describe('dismissVersionBanner', () => {
  it('removes the banner from DOM', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    showVersionBanner(dom.window.document, 'Test', () => {}, () => {});
    expect(dom.window.document.querySelector('.sc-version-banner')).not.toBeNull();

    dismissVersionBanner(dom.window.document);
    expect(dom.window.document.querySelector('.sc-version-banner')).toBeNull();
  });

  it('is safe to call when no banner exists', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    expect(() => dismissVersionBanner(dom.window.document)).not.toThrow();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `versioning.ts` doesn't exist

**Step 3: Create versioning.ts with CSS and banner functions**

Create `src/versioning.ts`:

```typescript
import type { StructuredContentConfig, VersionCheckResult } from './types';
import { findPlaceholderFields, activatePlaceholders } from './placeholders';

/** CSS for the version update banner */
export const VERSIONING_CSS = `
.sc-version-banner {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  padding: 10px 16px;
  margin: 0 0 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #664d03;
}
.sc-version-banner-text {
  flex: 1;
}
.sc-version-banner-actions {
  display: flex;
  gap: 8px;
  margin-left: 12px;
}
.sc-version-banner-actions button {
  padding: 4px 12px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.8rem;
}
.sc-version-update {
  background: #0d6efd;
  color: #fff;
  border: 1px solid #0d6efd;
}
.sc-version-update:hover {
  background: #0b5ed7;
}
.sc-version-dismiss {
  background: transparent;
  color: #664d03;
  border: 1px solid #ffc107;
}
`;

/** Inject versioning CSS into a document (idempotent) */
export function injectVersioningStyles(doc: Document): void {
  if (doc.getElementById('sc-versioning-styles')) return;
  const style = doc.createElement('style');
  style.id = 'sc-versioning-styles';
  style.textContent = VERSIONING_CSS;
  doc.head.appendChild(style);
}

/** Remove the version banner from the document */
export function dismissVersionBanner(doc: Document): void {
  const banner = doc.querySelector('.sc-version-banner');
  if (banner) banner.remove();
}

/** Show a version update banner at the top of the document */
export function showVersionBanner(
  doc: Document,
  templateName: string,
  onUpdate: () => void,
  onDismiss: () => void
): void {
  dismissVersionBanner(doc);
  injectVersioningStyles(doc);

  const banner = doc.createElement('div');
  banner.className = 'sc-version-banner';
  banner.setAttribute('contenteditable', 'false');

  const text = doc.createElement('span');
  text.className = 'sc-version-banner-text';
  text.textContent = `This document uses an older version of "\u200B${templateName}\u200B". A newer version is available.`;

  const actions = doc.createElement('div');
  actions.className = 'sc-version-banner-actions';

  const updateBtn = doc.createElement('button');
  updateBtn.className = 'sc-version-update';
  updateBtn.textContent = 'Update';
  updateBtn.addEventListener('click', onUpdate);

  const dismissBtn = doc.createElement('button');
  dismissBtn.className = 'sc-version-dismiss';
  dismissBtn.textContent = '\u2715';
  dismissBtn.setAttribute('aria-label', 'Dismiss');
  dismissBtn.addEventListener('click', onDismiss);

  actions.appendChild(updateBtn);
  actions.appendChild(dismissBtn);
  banner.appendChild(text);
  banner.appendChild(actions);

  doc.body.insertBefore(banner, doc.body.firstChild);
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/versioning.ts test/versioning.test.ts
git commit -m "feat: add versioning CSS, info banner, and banner tests"
```

---

### Task 4: Add version check flow and extractFieldValues

**Files:**
- Modify: `src/versioning.ts`
- Modify: `test/versioning.test.ts`

**Step 1: Write failing tests**

Add to `test/versioning.test.ts`:

```typescript
import { findPlaceholderFields } from '../src/placeholders';
import {
  VERSIONING_CSS,
  injectVersioningStyles,
  showVersionBanner,
  dismissVersionBanner,
  checkForUpdates,
  extractFieldValues,
} from '../src/versioning';

// ... (add after the existing describe blocks)

describe('extractFieldValues', () => {
  it('extracts values from unresolved fields with modified text', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="date" data-required="true">Enter date</span>
        <span class="tmpl-field" data-field="name">Enter name</span>
      </div>
    `);
    // Simulate user typing into the first field
    const dateField = dom.window.document.querySelector('[data-field="date"]') as HTMLElement;
    dateField.textContent = 'March 2026';

    const values = extractFieldValues(dom.window.document);
    expect(values.get('date')).toBe('March 2026');
    expect(values.has('name')).toBe(false); // unchanged = default text, not extracted
  });

  it('returns empty map when no fields are modified', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="date">Enter date</span>
      </div>
    `);
    const values = extractFieldValues(dom.window.document);
    expect(values.size).toBe(0);
  });
});

describe('checkForUpdates', () => {
  function makeMockEditor(bodyHtml: string) {
    const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>${bodyHtml}</body></html>`);
    return {
      dom,
      getDoc: () => dom.window.document,
    };
  }

  it('calls checkVersion when template wrapper has id and version', async () => {
    const editor = makeMockEditor(
      '<div class="sc-template" data-template-id="tpl-1" data-template-version="v1"><p>Content</p></div>'
    );
    let calledWith: { id: string; version: string } | null = null;
    const config: any = {
      checkVersion: async (id: string, version: string) => {
        calledWith = { id, version };
        return null;
      },
    };

    await checkForUpdates(editor, config);
    expect(calledWith).toEqual({ id: 'tpl-1', version: 'v1' });
  });

  it('does not call checkVersion when no sc-template wrapper', async () => {
    const editor = makeMockEditor('<p>Plain content</p>');
    let called = false;
    const config: any = {
      checkVersion: async () => { called = true; return null; },
    };

    await checkForUpdates(editor, config);
    expect(called).toBe(false);
  });

  it('does not call checkVersion when no version attribute', async () => {
    const editor = makeMockEditor(
      '<div class="sc-template" data-template-id="tpl-1"><p>No version</p></div>'
    );
    let called = false;
    const config: any = {
      checkVersion: async () => { called = true; return null; },
    };

    await checkForUpdates(editor, config);
    expect(called).toBe(false);
  });

  it('does not call checkVersion when callback not configured', async () => {
    const editor = makeMockEditor(
      '<div class="sc-template" data-template-id="tpl-1" data-template-version="v1"><p>Content</p></div>'
    );

    // Should not throw
    await checkForUpdates(editor, {});
  });

  it('shows banner when checkVersion returns a result', async () => {
    const editor = makeMockEditor(
      '<div class="sc-template" data-template-id="tpl-1" data-template-version="v1"><p>Content</p></div>'
    );
    const config: any = {
      checkVersion: async () => ({
        latestVersion: 'v2',
        latestTemplate: { id: 'tpl-1', title: 'Clinical Encounter', content: '<p>New</p>', version: 'v2' },
      }),
    };

    await checkForUpdates(editor, config);
    const banner = editor.dom.window.document.querySelector('.sc-version-banner');
    expect(banner).not.toBeNull();
    expect(banner!.textContent).toContain('Clinical Encounter');
  });

  it('does not show banner when checkVersion returns null', async () => {
    const editor = makeMockEditor(
      '<div class="sc-template" data-template-id="tpl-1" data-template-version="v1"><p>Content</p></div>'
    );
    const config: any = {
      checkVersion: async () => null,
    };

    await checkForUpdates(editor, config);
    const banner = editor.dom.window.document.querySelector('.sc-version-banner');
    expect(banner).toBeNull();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `checkForUpdates` and `extractFieldValues` don't exist

**Step 3: Add checkForUpdates and extractFieldValues to versioning.ts**

Add to the end of `src/versioning.ts`:

```typescript
/** Extract current values from unresolved placeholder fields (for migration) */
export function extractFieldValues(doc: Document): Map<string, string> {
  const fields = findPlaceholderFields(doc);
  const values = new Map<string, string>();

  fields.forEach((field) => {
    const text = (field.element.textContent || '').trim();
    if (text !== field.defaultText) {
      values.set(field.name, text);
    }
  });

  return values;
}

/** Check if the editor content uses an outdated template version */
export async function checkForUpdates(editor: any, config: StructuredContentConfig): Promise<void> {
  if (!config.checkVersion) return;

  const doc: Document = editor.getDoc();
  const wrapper = doc.querySelector('.sc-template[data-template-id][data-template-version]');
  if (!wrapper) return;

  const templateId = wrapper.getAttribute('data-template-id')!;
  const currentVersion = wrapper.getAttribute('data-template-version')!;

  const result = await config.checkVersion(templateId, currentVersion);
  if (!result) return;

  showVersionBanner(
    doc,
    result.latestTemplate.title,
    () => migrateTemplate(editor, config, wrapper as HTMLElement, result),
    () => dismissVersionBanner(doc)
  );
}
```

Note: `migrateTemplate` is referenced here but doesn't exist yet — add a stub at the bottom of the file:

```typescript
/** Migrate the editor content to the latest template version (implementation in Task 5) */
export function migrateTemplate(
  editor: any,
  config: StructuredContentConfig,
  wrapper: HTMLElement,
  result: VersionCheckResult
): void {
  // Stub — full implementation in Task 5
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/versioning.ts test/versioning.test.ts
git commit -m "feat: add checkForUpdates flow and extractFieldValues utility"
```

---

### Task 5: Implement migration logic

**Files:**
- Modify: `src/versioning.ts` (replace migrateTemplate stub)
- Modify: `test/versioning.test.ts`

**Step 1: Write failing tests**

Add to `test/versioning.test.ts`:

```typescript
import {
  VERSIONING_CSS,
  injectVersioningStyles,
  showVersionBanner,
  dismissVersionBanner,
  checkForUpdates,
  extractFieldValues,
  migrateTemplate,
} from '../src/versioning';
import type { VersionCheckResult } from '../src/types';

// ... (add after the existing describe blocks)

describe('migrateTemplate', () => {
  function makeMigrationEditor(bodyHtml: string) {
    const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>${bodyHtml}</body></html>`);
    return {
      dom,
      getDoc: () => dom.window.document,
      selection: { select: () => {} },
      on: () => {},
      undoManager: { transact: (fn: () => void) => fn() },
    };
  }

  it('replaces wrapper content with new template', () => {
    const editor = makeMigrationEditor(
      '<div class="sc-version-banner"></div>' +
      '<div class="sc-template" data-template-id="tpl-1" data-template-version="v1">' +
        '<span class="tmpl-field" data-field="date">Enter date</span>' +
      '</div>'
    );
    const wrapper = editor.dom.window.document.querySelector('.sc-template') as HTMLElement;
    const result: VersionCheckResult = {
      latestVersion: 'v2',
      latestTemplate: {
        id: 'tpl-1',
        title: 'Updated',
        content: '<p>New content</p><span class="tmpl-field" data-field="date">Enter date</span>',
        version: 'v2',
      },
    };

    migrateTemplate(editor, {}, wrapper, result);

    expect(wrapper.innerHTML).toContain('New content');
    expect(wrapper.getAttribute('data-template-version')).toBe('v2');
  });

  it('carries over unresolved field values by name', () => {
    const editor = makeMigrationEditor(
      '<div class="sc-template" data-template-id="tpl-1" data-template-version="v1">' +
        '<span class="tmpl-field" data-field="date" data-required="true">Enter date</span>' +
        '<span class="tmpl-field" data-field="notes">Add notes</span>' +
      '</div>'
    );
    // Simulate user typing into the date field
    const dateField = editor.dom.window.document.querySelector('[data-field="date"]') as HTMLElement;
    dateField.textContent = 'March 2026';

    const wrapper = editor.dom.window.document.querySelector('.sc-template') as HTMLElement;
    const result: VersionCheckResult = {
      latestVersion: 'v2',
      latestTemplate: {
        id: 'tpl-1',
        title: 'Updated',
        content:
          '<span class="tmpl-field" data-field="date" data-required="true">Enter date</span>' +
          '<span class="tmpl-field" data-field="summary">Enter summary</span>',
        version: 'v2',
      },
    };

    migrateTemplate(editor, {}, wrapper, result);

    // date field should have the old value
    const newDateField = editor.dom.window.document.querySelector('[data-field="date"]') as HTMLElement;
    expect(newDateField.textContent).toBe('March 2026');

    // summary is a new field — should have its default text
    const summaryField = editor.dom.window.document.querySelector('[data-field="summary"]') as HTMLElement;
    expect(summaryField.textContent).toBe('Enter summary');
  });

  it('ignores old fields not present in new template', () => {
    const editor = makeMigrationEditor(
      '<div class="sc-template" data-template-id="tpl-1" data-template-version="v1">' +
        '<span class="tmpl-field" data-field="old_field">Old value</span>' +
      '</div>'
    );
    const oldField = editor.dom.window.document.querySelector('[data-field="old_field"]') as HTMLElement;
    oldField.textContent = 'User typed this';

    const wrapper = editor.dom.window.document.querySelector('.sc-template') as HTMLElement;
    const result: VersionCheckResult = {
      latestVersion: 'v2',
      latestTemplate: {
        id: 'tpl-1',
        title: 'Updated',
        content: '<span class="tmpl-field" data-field="new_field">Enter new field</span>',
        version: 'v2',
      },
    };

    migrateTemplate(editor, {}, wrapper, result);

    // old_field should be gone, new_field should have default
    expect(editor.dom.window.document.querySelector('[data-field="old_field"]')).toBeNull();
    const newField = editor.dom.window.document.querySelector('[data-field="new_field"]') as HTMLElement;
    expect(newField.textContent).toBe('Enter new field');
  });

  it('updates data-template-version attribute', () => {
    const editor = makeMigrationEditor(
      '<div class="sc-template" data-template-id="tpl-1" data-template-version="v1">' +
        '<p>Old</p>' +
      '</div>'
    );
    const wrapper = editor.dom.window.document.querySelector('.sc-template') as HTMLElement;
    const result: VersionCheckResult = {
      latestVersion: 'v3',
      latestTemplate: { id: 'tpl-1', title: 'Updated', content: '<p>New</p>', version: 'v3' },
    };

    migrateTemplate(editor, {}, wrapper, result);
    expect(wrapper.getAttribute('data-template-version')).toBe('v3');
  });

  it('dismisses the version banner after migration', () => {
    const editor = makeMigrationEditor(
      '<div class="sc-version-banner">Banner</div>' +
      '<div class="sc-template" data-template-id="tpl-1" data-template-version="v1"><p>Old</p></div>'
    );
    const wrapper = editor.dom.window.document.querySelector('.sc-template') as HTMLElement;
    const result: VersionCheckResult = {
      latestVersion: 'v2',
      latestTemplate: { id: 'tpl-1', title: 'Updated', content: '<p>New</p>', version: 'v2' },
    };

    migrateTemplate(editor, {}, wrapper, result);
    expect(editor.dom.window.document.querySelector('.sc-version-banner')).toBeNull();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `migrateTemplate` is a stub

**Step 3: Replace migrateTemplate stub with full implementation**

In `src/versioning.ts`, replace the `migrateTemplate` stub with:

```typescript
/** Migrate the editor content to the latest template version */
export function migrateTemplate(
  editor: any,
  config: StructuredContentConfig,
  wrapper: HTMLElement,
  result: VersionCheckResult
): void {
  const doc: Document = wrapper.ownerDocument;

  // 1. Extract unresolved field values by name
  const values = extractFieldValues(doc);

  // 2. Replace content and update version
  wrapper.innerHTML = result.latestTemplate.content;
  wrapper.setAttribute('data-template-version', result.latestVersion);

  // 3. Map old values to matching fields in new template
  const newFields = findPlaceholderFields(doc);
  newFields.forEach((field) => {
    const oldValue = values.get(field.name);
    if (oldValue) {
      field.element.textContent = oldValue;
    }
  });

  // 4. Dismiss banner
  dismissVersionBanner(doc);

  // 5. Activate placeholders on new content (if editor has full TinyMCE API)
  if (editor.on && editor.selection) {
    activatePlaceholders(editor, config);
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/versioning.ts test/versioning.test.ts
git commit -m "feat: implement migrateTemplate with name-based field value mapping"
```

---

### Task 6: Hook version check in plugin.ts

**Files:**
- Modify: `src/plugin.ts`

**Step 1: Add import and SetContent handler**

In `src/plugin.ts`, add the import:

```typescript
import { checkForUpdates } from './versioning';
```

Add the SetContent handler after the menu item registration (before the closing `});`):

```typescript

  // Check for template version updates on content load (once per session)
  let versionChecked = false;
  editor.on('SetContent', () => {
    if (versionChecked) return;
    versionChecked = true;
    checkForUpdates(editor, config).catch(() => {});
  });
```

**Step 2: Build and test**

Run: `npm run build && npm test`
Expected: Build succeeds (no circular dependency), all tests pass

**Step 3: Commit**

```bash
git add src/plugin.ts
git commit -m "feat: hook version check on SetContent event in plugin"
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

**Step 3: Verify dist bundle includes versioning code**

Run: `grep -c "sc-version" dist/plugin.js`
Expected: Non-zero count

**Step 4: Update CLAUDE.md**

Add after the "## Group & Personal Templates (v0.5.0)" section:

```markdown

## Template Versioning (v0.6.0)

- `Template.version?: string` — host-provided version identifier
- `data-template-version` attribute stamped on cursor-mode insertions
- `checkVersion(templateId, currentVersion)` — callback to check for updates
- `VersionCheckResult` — `{ latestVersion, latestTemplate }` returned by callback
- Auto-checks on content load (`SetContent` event, once per session)
- Info banner: "A newer version is available" with Update / Dismiss
- Migration: replaces content, maps unresolved field values by `data-field` name
- `src/versioning.ts` — version check, banner, migration module
```

**Step 5: Update ROADMAP.md**

Change the Phase 5 header from `## Phase 5: Template Versioning — v0.6.0` to `## Phase 5: Template Versioning — v0.6.0 ✓`

In the Summary table, change Phase 5 Priority from `Low` to `**Done**`.

**Step 6: Commit**

```bash
git add CLAUDE.md ROADMAP.md
git commit -m "docs: update CLAUDE.md and ROADMAP.md for Phase 5 template versioning"
```

**Step 7: Tag release**

Do NOT create the tag. The user will tag when ready.
