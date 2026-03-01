# tinymce-structured-content — Roadmap

## Current: v0.1.0 (Released 01-03-2026)

MVP feature set:
- Template browser modal with category sidebar, search, live preview
- Two insertion modes: cursor (inline snippet) and document (full replace)
- Placeholder field system (`<span class="tmpl-field" data-field="name" data-required="true">`)
- Tab/Shift+Tab navigation between unresolved fields
- Auto-resolve when user edits a field
- Variable substitution (`{{variable}}` → values) with XSS protection
- Async `fetch()` callback for host app integration
- 25 tests passing (Vitest + jsdom)

---

## Phase 1: Required Field Validation — v0.2.0

**Goal:** Warn or block form submission when required placeholder fields are unfilled.

**Why:** CBME assessments need data quality guarantees — clinical encounter logs without dates or procedure names are useless for competency tracking.

### Tasks

1. **Add validation API to placeholders module**
   - `getUnresolvedRequired(doc)` → returns array of unresolved required `PlaceholderField` objects
   - `isTemplateComplete(doc)` → boolean (all required fields resolved)
   - `highlightUnresolved(doc)` → adds visual error state (red border/background) to unresolved required fields
   - `clearValidationErrors(doc)` → removes error styling

2. **Add validation styles to styles.ts**
   - `.tmpl-field-error` class: red background (#fde8e8), solid red border, shake animation
   - Error tooltip/message below the field showing "This field is required"

3. **Hook into editor save/submit events**
   - Listen for `editor.on('submit')` and `editor.on('BeforeGetContent')`
   - When triggered: check `isTemplateComplete()`
   - If incomplete: highlight unresolved fields, focus first one, show notification
   - Configurable behavior via new config option: `validation: 'warn' | 'block' | 'none'`
     - `warn`: highlight fields + show warning, allow submit
     - `block`: highlight fields + prevent submit until resolved
     - `none`: no validation (current behavior, default for backward compat)

4. **Add notification/toast for validation messages**
   - Lightweight inline notification (not alert/confirm)
   - "N required fields need to be filled" with count
   - Auto-dismiss after 5 seconds or on field focus

5. **Update types.ts**
   - Add `validation?: 'warn' | 'block' | 'none'` to `StructuredContentConfig`

6. **Tests (TDD)**
   - `getUnresolvedRequired()` — finds only required + unresolved fields
   - `isTemplateComplete()` — true when all required resolved, true when no required fields
   - `highlightUnresolved()` — adds error class, `clearValidationErrors()` removes it
   - Validation on submit — warn mode allows, block mode prevents
   - Edge cases: no template in editor, template with zero required fields

7. **Update README and CLAUDE.md** with validation config docs

**Estimated scope:** ~150 lines source + ~80 lines tests
**Breaking changes:** None (validation defaults to 'none')

---

## Phase 2: Typed Placeholders — v0.3.0

**Goal:** Replace plain text placeholders with typed input widgets (date picker, dropdown, number).

**Why:** CBME encounter logs need dates (not freetext "Enter date"), procedure types from predefined lists, and numeric scores with range validation.

### Design Sketch

Extend the `data-field` attribute system:
```html
<span class="tmpl-field" data-field="date" data-type="date" data-required="true">Select date</span>
<span class="tmpl-field" data-field="supervision" data-type="select" data-options="Direct|Indirect|Distant">Level</span>
<span class="tmpl-field" data-field="score" data-type="number" data-min="1" data-max="5">Score</span>
```

### Tasks (High-Level)

1. **Extend PlaceholderField type** with `type`, `options`, `min`, `max` properties
2. **Create input renderers** for each type (date, select, number, text)
3. **Inline widget system** — click placeholder → show widget overlay positioned near field
4. **Value binding** — widget selection updates field text and resolves placeholder
5. **Integrate with Phase 1 validation** — typed fields validate format (date is valid date, number in range)
6. **Tests** — renderer unit tests, widget interaction tests
7. **Update host app templates** — add `data-type` attributes to CBME seed templates

**Estimated scope:** ~300 lines source + ~120 lines tests
**Dependencies:** Phase 1 (validation)

---

## Phase 3: Placeholder Linking — v0.4.0

**Goal:** When the same `data-field` name appears multiple times, filling one auto-fills all others.

**Why:** Patient name, encounter date, and procedure type often appear in multiple sections of a CBME template (header, body, summary). Users shouldn't type the same value repeatedly.

### Tasks (High-Level)

1. **Group fields by name** — `findPlaceholderFields()` returns grouped map
2. **Sync values** — when one field resolves, propagate value to all fields with same name
3. **First-fill wins** — only the first edit propagates; subsequent edits to linked fields are independent
4. **Visual indicator** — subtle link icon or shared color for linked fields
5. **Tests** — sync propagation, first-fill behavior, mixed resolved/unresolved groups

**Estimated scope:** ~100 lines source + ~60 lines tests
**Dependencies:** None (can parallel with Phase 2)

---

## Phase 4: Group & Personal Templates — v0.5.0

**Goal:** Users and groups can create, save, and share their own templates.

**Why:** Institutions need program-specific templates (different specialties, different assessment forms). Personal templates let learners create reusable structures for their reflections.

### Tasks (High-Level)

1. **Template authoring UI** — "Save as template" button in editor toolbar
2. **Scope system** — personal (user-only), group (shared with group members), site (admin-managed)
3. **Template metadata editor** — title, description, category, scope, placeholder field definitions
4. **Backend API changes** (ePortfolios repo) — CRUD endpoints for user/group templates
5. **Template browser updates** — scope filter tabs (My Templates / Group / Site)
6. **Permission model** — who can create/edit/delete at each scope level

**Estimated scope:** Large — ~500+ lines across both repos
**Dependencies:** Phases 1-3 ideally complete first
**Note:** This requires coordinated changes in both the plugin and ePortfolios repos.

---

## Phase 5: Template Versioning — v0.6.0

**Goal:** Track template changes over time and handle documents created from older versions.

**Why:** CBME programs evolve their assessment criteria. When a template is updated, existing filled documents should remain valid, and users should optionally be able to migrate to the new version.

### Tasks (High-Level)

1. **Version metadata** — `data-template-version` attribute on inserted content
2. **Change detection** — diff between template versions
3. **Migration prompts** — "This document uses v1 of template X. Update to v2?"
4. **Field mapping** — handle renamed/added/removed fields across versions
5. **Backend versioning** (ePortfolios repo) — version history table, rollback support

**Estimated scope:** Large — significant backend work
**Dependencies:** Phase 4 (template authoring creates the need for versioning)

---

## Phase 6: Template Analytics — v1.0.0

**Goal:** Track template usage, completion rates, and field fill patterns.

**Why:** Program administrators need to know which templates are being used, how completely they're filled, and where learners struggle.

### Tasks (High-Level)

1. **Usage tracking** — which templates are inserted, by whom, when
2. **Completion metrics** — % of required fields filled per submission
3. **Field-level analytics** — which fields are most often left empty
4. **Admin dashboard** (ePortfolios repo) — visual reports
5. **Export** — CSV/JSON data export for external analysis

**Estimated scope:** Medium-Large — mostly backend/UI work in ePortfolios
**Dependencies:** Phases 1-2 (validation + typed fields provide the data)

---

## Summary

| Phase | Version | Feature | Complexity | Priority |
|-------|---------|---------|-----------|----------|
| 1 | v0.2.0 | Required field validation | Low | **Next** |
| 2 | v0.3.0 | Typed placeholders (date, select, number) | Medium | High |
| 3 | v0.4.0 | Placeholder linking (auto-fill same fields) | Low-Medium | Medium |
| 4 | v0.5.0 | Group & personal templates | High | Medium |
| 5 | v0.6.0 | Template versioning | High | Low |
| 6 | v1.0.0 | Template analytics | Medium | Low |

## How to Start a Phase

1. Open this repo in Claude Code: `cd ~/Development/tinymce-structured-content`
2. Read this ROADMAP.md and the relevant phase section
3. Read CLAUDE.md for build/test commands and architecture
4. Implement using TDD: write failing tests first, then implement
5. Build (`npm run build`), test (`npm test`), verify
6. Copy `dist/plugin.js` to ePortfolios: `cp dist/plugin.js ~/Development/eportfolios/js/tinymce/plugins/structuredcontent/plugin.js`
7. Test in Docker: http://localhost:8091 (Journals → New Entry → click Structured Content button)
8. Commit, tag, push both repos
