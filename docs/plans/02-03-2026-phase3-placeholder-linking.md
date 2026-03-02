# Phase 3: Placeholder Linking — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When the same `data-field` name appears on multiple placeholder fields, filling one auto-fills all others (first-fill only).

**Architecture:** Enhance `resolveField` with an optional `fields` array parameter. When provided, it finds siblings with the same name and resolves them too. Add `data-linked` CSS indicator in `activatePlaceholders` for fields sharing a name. No new modules.

**Tech Stack:** TypeScript, Vitest + jsdom for tests, Rollup for build

---

### Task 1: Add linked field CSS to PLACEHOLDER_CSS

**Files:**
- Modify: `src/placeholders.ts:5-52` (PLACEHOLDER_CSS constant)
- Modify: `test/placeholders.test.ts` (PLACEHOLDER_CSS describe block)

**Step 1: Write the failing test**

Add to the `describe('PLACEHOLDER_CSS', ...)` block in `test/placeholders.test.ts`:

```typescript
  it('contains linked field styles', () => {
    expect(PLACEHOLDER_CSS).toContain('data-linked');
  });
```

**Step 2: Run tests to verify it fails**

Run: `npm test`
Expected: FAIL — PLACEHOLDER_CSS doesn't contain `data-linked`

**Step 3: Add linked field CSS**

In `src/placeholders.ts`, add before the closing backtick of `PLACEHOLDER_CSS` (before the line with `` `; ``):

```css
.tmpl-field[data-linked] {
  background: #e0f0e8;
  border-color: #6ab089;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/placeholders.ts test/placeholders.test.ts
git commit -m "feat: add CSS indicator for linked placeholder fields"
```

---

### Task 2: Enhance resolveField with propagation and data-linked stripping

**Files:**
- Modify: `src/placeholders.ts:78-91` (resolveField function)
- Modify: `test/placeholders.test.ts` (resolveField describe block)

**Step 1: Write the failing tests**

Add to the `describe('resolveField', ...)` block in `test/placeholders.test.ts`:

```typescript
  it('strips data-linked on resolve', () => {
    const dom = new JSDOM(
      '<span class="tmpl-field" data-field="date" data-linked="true">Enter date</span>'
    );
    const el = dom.window.document.querySelector('.tmpl-field') as HTMLElement;
    const field = { element: el, name: 'date', defaultText: 'Enter date', required: false, resolved: false, type: 'text' as const };

    el.textContent = 'March 2026';
    resolveField(field);

    expect(el.hasAttribute('data-linked')).toBe(false);
  });

  it('propagates value to siblings with same data-field name', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="date" data-required="true">Enter date</span>
        <span class="tmpl-field" data-field="notes">Add notes</span>
        <span class="tmpl-field" data-field="date">Enter date</span>
      </div>
    `);
    const fields = findPlaceholderFields(dom.window.document);

    fields[0].element.textContent = 'March 2026';
    resolveField(fields[0], fields);

    // Sibling with same name should be resolved
    expect(fields[2].resolved).toBe(true);
    expect(fields[2].element.textContent).toBe('March 2026');
    expect(fields[2].element.classList.contains('tmpl-field')).toBe(false);
    // Different-name field should NOT be affected
    expect(fields[1].resolved).toBe(false);
    expect(fields[1].element.textContent).toBe('Add notes');
  });

  it('does not propagate when fields param is omitted (backward compat)', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="date">Enter date</span>
        <span class="tmpl-field" data-field="date">Enter date</span>
      </div>
    `);
    const fields = findPlaceholderFields(dom.window.document);

    fields[0].element.textContent = 'March 2026';
    resolveField(fields[0]);

    // Without fields param, no propagation
    expect(fields[1].resolved).toBe(false);
    expect(fields[1].element.textContent).toBe('Enter date');
  });

  it('first-fill only — resolved siblings are independent after propagation', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="date">Enter date</span>
        <span class="tmpl-field" data-field="date">Enter date</span>
      </div>
    `);
    const fields = findPlaceholderFields(dom.window.document);

    // First fill: propagates
    fields[0].element.textContent = 'March 2026';
    resolveField(fields[0], fields);

    // Both resolved — siblings have no data-field attribute, so subsequent
    // calls can't find them even if we somehow called resolveField again
    expect(fields[0].element.hasAttribute('data-field')).toBe(false);
    expect(fields[1].element.hasAttribute('data-field')).toBe(false);
  });
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `data-linked` still present (test 1), propagation doesn't happen (tests 2, 4). Test 3 should pass since current behavior matches.

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
  field.element.removeAttribute('data-type');
  field.element.removeAttribute('data-options');
  field.element.removeAttribute('data-min');
  field.element.removeAttribute('data-max');
}
```

to:

```typescript
export function resolveField(field: PlaceholderField, fields?: PlaceholderField[]): void {
  const currentText = (field.element.textContent || '').trim();
  if (currentText === field.defaultText) return;

  // Read name before stripping attributes
  const fieldName = field.name;

  field.resolved = true;
  field.element.classList.remove('tmpl-field');
  field.element.removeAttribute('data-field');
  field.element.removeAttribute('data-required');
  field.element.removeAttribute('data-type');
  field.element.removeAttribute('data-options');
  field.element.removeAttribute('data-min');
  field.element.removeAttribute('data-max');
  field.element.removeAttribute('data-linked');

  // Propagate to linked fields (same name, first-fill only)
  if (fields && fieldName) {
    fields.forEach((sibling) => {
      if (sibling !== field && !sibling.resolved && sibling.name === fieldName) {
        sibling.element.textContent = currentText;
        resolveField(sibling); // no fields param = no further propagation
      }
    });
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/placeholders.ts test/placeholders.test.ts
git commit -m "feat: add placeholder linking — resolveField propagates to same-name siblings"
```

---

### Task 3: Mark linked fields in activatePlaceholders and update callers

**Files:**
- Modify: `src/placeholders.ts:188-260` (activatePlaceholders function)
- Modify: `src/widgets.ts:46` (openPopover signature — no change needed, callback type already accepts any resolve function)

**Step 1: Mark linked fields with data-linked attribute**

In `src/placeholders.ts`, in the `activatePlaceholders` function, add after `if (fields.length === 0) return;` (line 194):

```typescript
  // Mark linked fields (same data-field name appears 2+ times)
  const nameCounts = new Map<string, number>();
  fields.forEach((f) => nameCounts.set(f.name, (nameCounts.get(f.name) || 0) + 1));
  fields.forEach((f) => {
    if ((nameCounts.get(f.name) || 0) >= 2) {
      f.element.setAttribute('data-linked', 'true');
    }
  });
```

**Step 2: Update resolveField callers to pass fields array**

In the Tab navigation handler (line 215), change:

```typescript
    resolveField(currentField);
```

to:

```typescript
    resolveField(currentField, fields);
```

In the NodeChange handler (line 232), change:

```typescript
        resolveField(field);
```

to:

```typescript
        resolveField(field, fields);
```

In the click handler for typed fields (line 241), change:

```typescript
        openPopover(document, field, resolveField);
```

to:

```typescript
        openPopover(document, field, (f) => resolveField(f, fields));
```

**Step 3: Build and test**

Run: `npm run build && npm test`
Expected: Build succeeds (no circular dependency), all tests pass

**Step 4: Commit**

```bash
git add src/placeholders.ts
git commit -m "feat: mark linked fields with data-linked and pass fields to resolveField callers"
```

---

### Task 4: Build, full test run, update docs

**Files:**
- Modify: `ROADMAP.md` (mark Phase 3 complete)
- Modify: `CLAUDE.md` (add placeholder linking docs)

**Step 1: Full build**

Run: `npm run build`
Expected: `dist/plugin.js` generated without errors or warnings

**Step 2: Full test run**

Run: `npm test`
Expected: All tests pass

**Step 3: Update CLAUDE.md**

Add after the "## Typed Placeholders (v0.3.0)" section:

```markdown

## Placeholder Linking (v0.4.0)

- Fields with the same `data-field` name are linked — filling one auto-fills all others
- First-fill only: after propagation, each field is independent
- `resolveField(field, fields?)` — optional second param enables linking
- Linked fields get `data-linked` attribute and green-tinted background
- `data-linked` is stripped on resolve (along with all other data attributes)
```

**Step 4: Update ROADMAP.md**

Change the Phase 3 header from `## Phase 3: Placeholder Linking — v0.4.0` to `## Phase 3: Placeholder Linking — v0.4.0 ✓`

In the Summary table, change Phase 3 Priority from `Medium` to `**Done**`.

**Step 5: Commit**

```bash
git add CLAUDE.md ROADMAP.md
git commit -m "docs: update CLAUDE.md and ROADMAP.md for Phase 3 placeholder linking"
```

**Step 6: Tag release**

Do NOT create the tag. The user will tag when ready.
