# Phase 6: Template Analytics — Design Document

**Created:** 03-03-2026
**Status:** APPROVED
**Version target:** v1.0.0

## Summary

Add analytics event infrastructure to the plugin so the host app can track template usage and field completion rates. Plugin fires events via a single `onAnalyticsEvent` callback at two key moments (insertion and submission) and exposes a `getTemplateMetrics()` utility for on-demand field state queries. All persistence and reporting is delegated to the host app.

## Decisions

### Plugin-side only
No ePortfolios backend changes in this phase. The plugin provides event firing and metrics extraction. The host app handles storage, dashboards, and export via the callback.

### Single event callback
One `onAnalyticsEvent?: (event: AnalyticsEvent) => void` callback in config. Synchronous (fire-and-forget). Host app handles async persistence internally if needed. Extensible — new event types can be added without changing the callback signature.

### Two event types
- `template_inserted` — fired after template insertion in the browser modal
- `template_submitted` — fired on `BeforeGetContent` when editor content contains a template

### Metrics extraction utility
`getTemplateMetrics(editor)` returns a snapshot of field completion state. Pure computation, no side effects. Host app can call it at any point for progress indicators or custom reporting.

## Type Definitions

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

export interface TemplateSubmittedEvent extends AnalyticsEvent {
  type: 'template_submitted';
  metrics: TemplateMetrics;
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

export interface StructuredContentConfig {
  // ... existing fields ...
  onAnalyticsEvent?: (event: AnalyticsEvent) => void;
}
```

## Event Firing Points

### Template Insertion

In `browser.ts`, after `insertTemplate()` is called in the `doInsert` function. The plugin has the selected template object (id, title, version) and the insertion mode.

```
User clicks Insert in browser modal
    ↓
insertTemplate(editor, ...) runs
    ↓
Fire TemplateInsertedEvent with templateId, title, version, mode, field counts
```

### Template Submission

In the existing `BeforeGetContent` handler in `placeholders.ts`. Fires whenever a `.sc-template` is present in the editor (regardless of validation mode).

```
Host app calls editor.getContent() (Pieform submit)
    ↓
BeforeGetContent fires
    ↓
If .sc-template exists in editor:
    compute metrics via getTemplateMetrics()
    fire TemplateSubmittedEvent
```

Both check `config.onAnalyticsEvent` before firing. No event if callback not configured.

## Metrics Extraction Utility

```typescript
export function getTemplateMetrics(editor: any): TemplateMetrics | null
```

- Returns `null` if no `.sc-template` wrapper in editor
- Uses `findPlaceholderFields(doc)` to get all fields
- Computes: total fields, required count, resolved count, unresolved required, completion percentage, per-field breakdown
- Completion percentage = `(resolvedFields / totalFields) * 100` (or 100 if no fields)
- Pure computation, no side effects

## New Files

| File | Purpose |
|------|---------|
| `src/analytics.ts` | Event types, `getTemplateMetrics()`, `fireInsertionEvent()`, `fireSubmissionEvent()` |
| `test/analytics.test.ts` | Analytics tests |

## Modified Files

| File | Change |
|------|--------|
| `src/types.ts` | Add analytics interfaces, add `onAnalyticsEvent` to config |
| `src/browser.ts` | Call `fireInsertionEvent()` after `insertTemplate()` in `doInsert` |
| `src/placeholders.ts` | Call `fireSubmissionEvent()` in `BeforeGetContent` handler |

## Test Plan

**Metrics:**
- `getTemplateMetrics` computes correctly (total, required, resolved, percentage, breakdown)
- Returns `null` when no `.sc-template` present
- Returns 100% when all fields resolved
- Correct breakdown for mixed field states (required/optional, resolved/unresolved, different types)

**Insertion event:**
- `fireInsertionEvent` calls `onAnalyticsEvent` with correct `TemplateInsertedEvent` shape
- No-op when callback not configured
- Includes field count and required field count

**Submission event:**
- `fireSubmissionEvent` calls `onAnalyticsEvent` with correct `TemplateSubmittedEvent` shape
- No-op when no `.sc-template` in editor
- No-op when callback not configured
- Includes full `TemplateMetrics` payload

**Event properties:**
- `timestamp` is a number (Date.now())
- `templateId`, `templateTitle`, `templateVersion` populated from DOM attributes
