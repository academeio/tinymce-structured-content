# Phase 6: Template Analytics — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add analytics event infrastructure so the host app can track template usage and field completion rates via a single callback and an on-demand metrics utility.

**Architecture:** New `src/analytics.ts` module with type definitions, metrics computation (`getTemplateMetrics`), and event firing functions (`fireInsertionEvent`, `fireSubmissionEvent`). Plugin fires `template_inserted` from `browser.ts` after insertion, and `template_submitted` from `placeholders.ts` in `BeforeGetContent`. Host app receives events via `onAnalyticsEvent` callback.

**Tech Stack:** TypeScript, Vitest + jsdom for tests, Rollup for build, TinyMCE 7 API

---

### Task 1: Extend types.ts with Phase 6 interfaces

**Files:**
- Modify: `src/types.ts`

**Step 1: Add analytics interfaces and config extension**

In `src/types.ts`, add after the `VersionCheckResult` interface (after line 63):

```typescript

export type AnalyticsEventType = 'template_inserted' | 'template_submitted';

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  templateId: string;
  templateTitle: string;
  templateVersion?: string;
  timestamp: number;
}

export interface TemplateInsertedEvent extends AnalyticsEvent {
  type: 'template_inserted';
  insertionMode: 'cursor' | 'document';
  fieldCount: number;
  requiredFieldCount: number;
}

export interface TemplateMetrics {
  totalFields: number;
  requiredFields: number;
  resolvedFields: number;
  unresolvedRequired: number;
  completionPercentage: number;
  fieldBreakdown: FieldMetric[];
}

export interface FieldMetric {
  name: string;
  type: 'text' | 'date' | 'select' | 'number';
  required: boolean;
  resolved: boolean;
}

export interface TemplateSubmittedEvent extends AnalyticsEvent {
  type: 'template_submitted';
  metrics: TemplateMetrics;
}
```

Add `onAnalyticsEvent` to `StructuredContentConfig` (after the `checkVersion` line):

```typescript
  onAnalyticsEvent?: (event: AnalyticsEvent) => void;
```

**Step 2: Run build to verify types compile**

Run: `npm run build`
Expected: Build succeeds with no type errors

**Step 3: Run tests to verify nothing breaks**

Run: `npm test`
Expected: All 104 tests pass

**Step 4: Commit**

```bash
git add src/types.ts
git commit -m "feat: add analytics event types and onAnalyticsEvent config for Phase 6"
```

---

### Task 2: Create analytics.ts with getTemplateMetrics

**Files:**
- Create: `src/analytics.ts`
- Create: `test/analytics.test.ts`

**Step 1: Write failing tests**

Create `test/analytics.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { getTemplateMetrics } from '../src/analytics';

describe('getTemplateMetrics', () => {
  function makeEditor(bodyHtml: string) {
    const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>${bodyHtml}</body></html>`);
    return {
      dom,
      getDoc: () => dom.window.document,
    };
  }

  it('returns null when no sc-template wrapper', () => {
    const editor = makeEditor('<p>Plain content</p>');
    expect(getTemplateMetrics(editor)).toBeNull();
  });

  it('returns metrics for a template with mixed field states', () => {
    const editor = makeEditor(
      '<div class="sc-template" data-template-id="tpl-1">' +
        '<span class="tmpl-field" data-field="date" data-required="true" data-type="date">Enter date</span>' +
        '<span class="tmpl-field" data-field="notes" data-type="text">Add notes</span>' +
        '<span class="tmpl-field" data-field="score" data-required="true" data-type="number">Score</span>' +
      '</div>'
    );

    const metrics = getTemplateMetrics(editor)!;
    expect(metrics.totalFields).toBe(3);
    expect(metrics.requiredFields).toBe(2);
    expect(metrics.resolvedFields).toBe(0);
    expect(metrics.unresolvedRequired).toBe(2);
    expect(metrics.completionPercentage).toBe(0);
    expect(metrics.fieldBreakdown).toHaveLength(3);

    expect(metrics.fieldBreakdown[0]).toEqual({
      name: 'date',
      type: 'date',
      required: true,
      resolved: false,
    });
    expect(metrics.fieldBreakdown[1]).toEqual({
      name: 'notes',
      type: 'text',
      required: false,
      resolved: false,
    });
  });

  it('returns 100% completion when no fields exist', () => {
    const editor = makeEditor(
      '<div class="sc-template" data-template-id="tpl-1"><p>No fields here</p></div>'
    );
    const metrics = getTemplateMetrics(editor)!;
    expect(metrics.totalFields).toBe(0);
    expect(metrics.completionPercentage).toBe(100);
    expect(metrics.fieldBreakdown).toHaveLength(0);
  });

  it('computes correct percentage with partially resolved fields', () => {
    const editor = makeEditor(
      '<div class="sc-template" data-template-id="tpl-1">' +
        '<span class="tmpl-field" data-field="date" data-required="true">Enter date</span>' +
        '<span data-field="name">John Doe</span>' +
      '</div>'
    );
    // Only 1 tmpl-field remains (the other is resolved — no tmpl-field class)
    const metrics = getTemplateMetrics(editor)!;
    expect(metrics.totalFields).toBe(1);
    expect(metrics.resolvedFields).toBe(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `analytics.ts` doesn't exist

**Step 3: Create analytics.ts with getTemplateMetrics**

Create `src/analytics.ts`:

```typescript
import type {
  StructuredContentConfig,
  Template,
  AnalyticsEvent,
  TemplateInsertedEvent,
  TemplateSubmittedEvent,
  TemplateMetrics,
  FieldMetric,
} from './types';
import { findPlaceholderFields } from './placeholders';

/**
 * Compute metrics for the current template in the editor.
 * Returns null if no .sc-template wrapper is present.
 */
export function getTemplateMetrics(editor: any): TemplateMetrics | null {
  const doc: Document = editor.getDoc();
  const wrapper = doc.querySelector('.sc-template[data-template-id]');
  if (!wrapper) return null;

  const fields = findPlaceholderFields(doc);

  const totalFields = fields.length;
  const resolvedFields = fields.filter((f) => f.resolved).length;
  const requiredFields = fields.filter((f) => f.required).length;
  const unresolvedRequired = fields.filter((f) => f.required && !f.resolved).length;
  const completionPercentage = totalFields === 0 ? 100 : Math.round((resolvedFields / totalFields) * 100);

  const fieldBreakdown: FieldMetric[] = fields.map((f) => ({
    name: f.name,
    type: f.type,
    required: f.required,
    resolved: f.resolved,
  }));

  return {
    totalFields,
    requiredFields,
    resolvedFields,
    unresolvedRequired,
    completionPercentage,
    fieldBreakdown,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/analytics.ts test/analytics.test.ts
git commit -m "feat: add getTemplateMetrics utility for on-demand field stats"
```

---

### Task 3: Add fireInsertionEvent

**Files:**
- Modify: `src/analytics.ts`
- Modify: `test/analytics.test.ts`

**Step 1: Write failing tests**

Add to `test/analytics.test.ts`. First update the import:

```typescript
import { getTemplateMetrics, fireInsertionEvent } from '../src/analytics';
```

Then add after the existing describe block:

```typescript
describe('fireInsertionEvent', () => {
  function makeEditor(bodyHtml: string) {
    const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>${bodyHtml}</body></html>`);
    return {
      dom,
      getDoc: () => dom.window.document,
    };
  }

  it('calls onAnalyticsEvent with TemplateInsertedEvent', () => {
    const editor = makeEditor(
      '<div class="sc-template" data-template-id="tpl-1">' +
        '<span class="tmpl-field" data-field="date" data-required="true">Enter date</span>' +
        '<span class="tmpl-field" data-field="notes">Add notes</span>' +
      '</div>'
    );
    let received: any = null;
    const config: any = {
      onAnalyticsEvent: (event: any) => { received = event; },
    };
    const template = { id: 'tpl-1', title: 'Clinical Encounter', content: '', version: 'v2' };

    fireInsertionEvent(editor, config, template, 'cursor');

    expect(received).not.toBeNull();
    expect(received.type).toBe('template_inserted');
    expect(received.templateId).toBe('tpl-1');
    expect(received.templateTitle).toBe('Clinical Encounter');
    expect(received.templateVersion).toBe('v2');
    expect(received.insertionMode).toBe('cursor');
    expect(received.fieldCount).toBe(2);
    expect(received.requiredFieldCount).toBe(1);
    expect(typeof received.timestamp).toBe('number');
  });

  it('is a no-op when onAnalyticsEvent not configured', () => {
    const editor = makeEditor('<div class="sc-template" data-template-id="tpl-1"></div>');
    const template = { id: 'tpl-1', title: 'Test', content: '' };

    // Should not throw
    expect(() => fireInsertionEvent(editor, {}, template, 'cursor')).not.toThrow();
  });

  it('works when template has no version', () => {
    const editor = makeEditor('<div class="sc-template" data-template-id="tpl-1"></div>');
    let received: any = null;
    const config: any = {
      onAnalyticsEvent: (event: any) => { received = event; },
    };
    const template = { id: 'tpl-1', title: 'Test', content: '' };

    fireInsertionEvent(editor, config, template, 'document');

    expect(received.templateVersion).toBeUndefined();
    expect(received.insertionMode).toBe('document');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `fireInsertionEvent` doesn't exist

**Step 3: Add fireInsertionEvent to analytics.ts**

Add at the end of `src/analytics.ts`:

```typescript
/**
 * Fire a template_inserted analytics event.
 * Called from browser.ts after insertTemplate().
 */
export function fireInsertionEvent(
  editor: any,
  config: StructuredContentConfig,
  template: Template,
  mode: 'cursor' | 'document'
): void {
  if (!config.onAnalyticsEvent) return;

  const doc: Document = editor.getDoc();
  const fields = findPlaceholderFields(doc);

  const event: TemplateInsertedEvent = {
    type: 'template_inserted',
    templateId: template.id,
    templateTitle: template.title,
    templateVersion: template.version,
    timestamp: Date.now(),
    insertionMode: mode,
    fieldCount: fields.length,
    requiredFieldCount: fields.filter((f) => f.required).length,
  };

  config.onAnalyticsEvent(event);
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/analytics.ts test/analytics.test.ts
git commit -m "feat: add fireInsertionEvent for template insertion tracking"
```

---

### Task 4: Add fireSubmissionEvent

**Files:**
- Modify: `src/analytics.ts`
- Modify: `test/analytics.test.ts`

**Step 1: Write failing tests**

Update the import in `test/analytics.test.ts`:

```typescript
import { getTemplateMetrics, fireInsertionEvent, fireSubmissionEvent } from '../src/analytics';
```

Add after the existing describe blocks:

```typescript
describe('fireSubmissionEvent', () => {
  function makeEditor(bodyHtml: string) {
    const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>${bodyHtml}</body></html>`);
    return {
      dom,
      getDoc: () => dom.window.document,
    };
  }

  it('calls onAnalyticsEvent with TemplateSubmittedEvent and metrics', () => {
    const editor = makeEditor(
      '<div class="sc-template" data-template-id="tpl-1" data-template-version="v3">' +
        '<span class="tmpl-field" data-field="date" data-required="true" data-type="date">Enter date</span>' +
        '<span class="tmpl-field" data-field="notes" data-type="text">Add notes</span>' +
      '</div>'
    );
    // Read template title from a data attribute on wrapper
    const wrapper = editor.dom.window.document.querySelector('.sc-template') as HTMLElement;
    wrapper.setAttribute('data-template-title', 'Clinical Encounter');

    let received: any = null;
    const config: any = {
      onAnalyticsEvent: (event: any) => { received = event; },
    };

    fireSubmissionEvent(editor, config);

    expect(received).not.toBeNull();
    expect(received.type).toBe('template_submitted');
    expect(received.templateId).toBe('tpl-1');
    expect(received.templateVersion).toBe('v3');
    expect(typeof received.timestamp).toBe('number');
    expect(received.metrics.totalFields).toBe(2);
    expect(received.metrics.requiredFields).toBe(1);
    expect(received.metrics.resolvedFields).toBe(0);
    expect(received.metrics.unresolvedRequired).toBe(1);
    expect(received.metrics.completionPercentage).toBe(0);
    expect(received.metrics.fieldBreakdown).toHaveLength(2);
  });

  it('is a no-op when no sc-template in editor', () => {
    const editor = makeEditor('<p>Plain content</p>');
    let called = false;
    const config: any = {
      onAnalyticsEvent: () => { called = true; },
    };

    fireSubmissionEvent(editor, config);
    expect(called).toBe(false);
  });

  it('is a no-op when onAnalyticsEvent not configured', () => {
    const editor = makeEditor(
      '<div class="sc-template" data-template-id="tpl-1"><p>Content</p></div>'
    );
    expect(() => fireSubmissionEvent(editor, {})).not.toThrow();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `fireSubmissionEvent` doesn't exist

**Step 3: Add fireSubmissionEvent to analytics.ts**

Add at the end of `src/analytics.ts`:

```typescript
/**
 * Fire a template_submitted analytics event.
 * Called from placeholders.ts in BeforeGetContent handler.
 */
export function fireSubmissionEvent(
  editor: any,
  config: StructuredContentConfig
): void {
  if (!config.onAnalyticsEvent) return;

  const doc: Document = editor.getDoc();
  const wrapper = doc.querySelector('.sc-template[data-template-id]');
  if (!wrapper) return;

  const metrics = getTemplateMetrics(editor);
  if (!metrics) return;

  const event: TemplateSubmittedEvent = {
    type: 'template_submitted',
    templateId: wrapper.getAttribute('data-template-id')!,
    templateTitle: wrapper.getAttribute('data-template-title') || '',
    templateVersion: wrapper.getAttribute('data-template-version') || undefined,
    timestamp: Date.now(),
    metrics,
  };

  config.onAnalyticsEvent(event);
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/analytics.ts test/analytics.test.ts
git commit -m "feat: add fireSubmissionEvent for template submission tracking"
```

---

### Task 5: Wire insertion event into browser.ts and stamp template title

**Files:**
- Modify: `src/browser.ts:1-6,396-409` (imports and doInsert function)
- Modify: `src/insertion.ts` (stamp `data-template-title` on wrapper)
- Modify: `test/insertion.test.ts`

**Step 1: Write failing test for title stamping**

Add to `test/insertion.test.ts` inside the `describe('insertTemplate', ...)` block:

```typescript
  it('stamps data-template-title when templateTitle is provided (cursor mode)', () => {
    const editor = mockEditor();
    insertTemplate(editor, '<p>Hello</p>', 'tpl-1', 'cursor', {}, 'v2.1', 'Clinical Encounter');
    expect(editor._content).toContain('data-template-title="Clinical Encounter"');
  });
```

**Step 2: Run tests to verify it fails**

Run: `npm test`
Expected: FAIL — `insertTemplate` doesn't accept a 7th parameter yet

**Step 3: Update insertTemplate to accept and stamp template title**

In `src/insertion.ts`, change the function signature to add `templateTitle?: string` as a 7th parameter. In the cursor-mode branch, add the title attribute:

Change from:

```typescript
export function insertTemplate(
  editor: any,
  html: string,
  templateId: string,
  mode: 'cursor' | 'document',
  config: StructuredContentConfig,
  templateVersion?: string
): void {
```

to:

```typescript
export function insertTemplate(
  editor: any,
  html: string,
  templateId: string,
  mode: 'cursor' | 'document',
  config: StructuredContentConfig,
  templateVersion?: string,
  templateTitle?: string
): void {
```

In the cursor-mode branch, add after the `versionAttr` logic:

```typescript
      let titleAttr = '';
      if (templateTitle) {
        titleAttr = ` data-template-title="${escapeHtml(templateTitle)}"`;
      }
      const wrapped = `<div class="sc-template" data-template-id="${escapeHtml(templateId)}"${versionAttr}${titleAttr}>${processed}</div>`;
```

**Step 4: Update browser.ts to import and call fireInsertionEvent**

Add the import at the top of `src/browser.ts`:

```typescript
import { fireInsertionEvent } from './analytics';
```

Update the `doInsert` function — change:

```typescript
  function doInsert(mode: 'cursor' | 'document'): void {
    if (!selectedTemplate) return;

    if (mode === 'document') {
      const existing = editor.getContent({ format: 'text' }).trim();
      if (existing && !confirm('Replace all editor content with this template?')) {
        return;
      }
    }

    insertTemplate(editor, selectedTemplate.content, selectedTemplate.id, mode, config, selectedTemplate.version);
    closeBrowser();
    activatePlaceholders(editor, config);
  }
```

to:

```typescript
  function doInsert(mode: 'cursor' | 'document'): void {
    if (!selectedTemplate) return;

    if (mode === 'document') {
      const existing = editor.getContent({ format: 'text' }).trim();
      if (existing && !confirm('Replace all editor content with this template?')) {
        return;
      }
    }

    insertTemplate(editor, selectedTemplate.content, selectedTemplate.id, mode, config, selectedTemplate.version, selectedTemplate.title);
    closeBrowser();
    activatePlaceholders(editor, config);
    fireInsertionEvent(editor, config, selectedTemplate, mode);
  }
```

**Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass

**Step 6: Run build to verify no circular dependencies**

Run: `npm run build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/insertion.ts src/browser.ts test/insertion.test.ts
git commit -m "feat: wire insertion analytics event and stamp template title"
```

---

### Task 6: Wire submission event into placeholders.ts

**Files:**
- Modify: `src/placeholders.ts:282-295` (BeforeGetContent handler)

**Step 1: Add import**

Add at the top of `src/placeholders.ts`:

```typescript
import { fireSubmissionEvent } from './analytics';
```

**Step 2: Update BeforeGetContent handler**

The current handler only fires in warn mode. We need to add a separate `BeforeGetContent` handler that fires the submission event regardless of validation mode. Add this after the existing validation handler block (after line 295), still inside `activatePlaceholders`:

```typescript

  // Fire analytics event on content extraction (regardless of validation mode)
  editor.on('BeforeGetContent', () => {
    fireSubmissionEvent(editor, config || {});
  });
```

**Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 4: Run build**

Run: `npm run build`
Expected: Build succeeds (no circular dependency — analytics imports from placeholders, placeholders imports from analytics, but the imports are type-compatible since `fireSubmissionEvent` doesn't import from placeholders directly... wait, `analytics.ts` imports `findPlaceholderFields` from `placeholders.ts`. This would create a circular dependency.)

**IMPORTANT: Circular dependency resolution.** `analytics.ts` imports `findPlaceholderFields` from `placeholders.ts`, and now `placeholders.ts` would import `fireSubmissionEvent` from `analytics.ts`. To avoid this:

Instead of importing `fireSubmissionEvent` directly in `placeholders.ts`, pass the config through and let `plugin.ts` handle the wiring. **Revised approach:**

Remove the import from `placeholders.ts`. Instead, add the `BeforeGetContent` handler in `plugin.ts`:

In `src/plugin.ts`, add the import:

```typescript
import { fireSubmissionEvent } from './analytics';
```

Add after the SetContent handler (before the closing `});`):

```typescript

  // Fire analytics event on content extraction
  editor.on('BeforeGetContent', () => {
    fireSubmissionEvent(editor, config);
  });
```

**Step 5: Run tests and build**

Run: `npm run build && npm test`
Expected: Build succeeds (no circular dependency), all tests pass

**Step 6: Commit**

```bash
git add src/plugin.ts
git commit -m "feat: wire submission analytics event on BeforeGetContent in plugin"
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

**Step 3: Verify dist bundle includes analytics code**

Run: `grep -c "template_inserted\|template_submitted\|onAnalyticsEvent" dist/plugin.js`
Expected: Non-zero count

**Step 4: Update CLAUDE.md**

Add after the "## Template Versioning (v0.6.0)" section:

```markdown

## Template Analytics (v1.0.0)

- `onAnalyticsEvent?: (event: AnalyticsEvent) => void` — single callback for all analytics events
- `template_inserted` event — fired after template insertion (includes template ID, title, version, mode, field counts)
- `template_submitted` event — fired on `BeforeGetContent` (includes full `TemplateMetrics`)
- `getTemplateMetrics(editor)` — on-demand field completion snapshot (total, required, resolved, percentage, breakdown)
- `TemplateMetrics`, `FieldMetric`, `TemplateInsertedEvent`, `TemplateSubmittedEvent` interfaces
- `src/analytics.ts` — analytics module
- `data-template-title` attribute stamped on cursor-mode insertions
```

**Step 5: Update ROADMAP.md**

Change `## Phase 6: Template Analytics — v1.0.0` to `## Phase 6: Template Analytics — v1.0.0 ✓`

In the Summary table, change Phase 6 Priority from `Low` to `**Done**`.

**Step 6: Commit**

```bash
git add CLAUDE.md ROADMAP.md
git commit -m "docs: update CLAUDE.md and ROADMAP.md for Phase 6 template analytics"
```

**Step 7: Tag release**

Do NOT create the tag. The user will tag when ready.
