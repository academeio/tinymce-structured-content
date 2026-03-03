# Phase 5: Template Versioning — Design Document

**Created:** 03-03-2026
**Status:** APPROVED
**Version target:** v0.6.0

## Summary

Track template versions so documents created from older templates can be detected and optionally migrated to the latest version. Plugin stamps version metadata on inserted content, checks for updates on content load via callback, shows an info banner when an update is available, and migrates unresolved field values by name when the user chooses to update.

## Decisions

### Plugin-side only
No ePortfolios backend changes in this phase. The plugin provides version stamping, checking, and migration UI. The host app handles version storage and comparison via a `checkVersion` callback.

### Host-provided version identifier
The `Template` interface gains an optional `version` field. The host app provides the version string (could be integer, hash, semantic version — plugin is agnostic). Plugin stores it as `data-template-version` attribute on inserted content.

### Auto-check on content load
Plugin checks for template updates automatically when editor content is loaded (`SetContent` event). If the content has `data-template-id` and `data-template-version`, it calls `checkVersion(templateId, currentVersion)`. No manual toolbar button — the check is automatic and non-intrusive.

### Info banner for update notification
A non-modal, dismissible banner at the top of the editor area: "This document uses an older version of [Template Name]. A newer version is available. [Update] [✕]". Persists until dismissed or updated.

### Name-based field value mapping
When migrating, unresolved placeholder field values are carried over by matching `data-field` name. Resolved fields (already stripped of placeholder markup) cannot be extracted by name and are not migrated. This is acceptable because:
- The common scenario is an admin updating a template before users fill it out
- Fully filled documents are "finalized" — their content is already baked into the HTML

## Config API Extensions

```typescript
export interface Template {
  // ... existing fields ...
  version?: string;  // host-provided version identifier
}

export interface VersionCheckResult {
  latestVersion: string;
  latestTemplate: Template;  // the updated template with new content
}

export interface StructuredContentConfig {
  // ... existing fields ...
  checkVersion?: (templateId: string, currentVersion: string) => Promise<VersionCheckResult | null>;
  // Returns null if current version is latest, or VersionCheckResult if update available
}
```

## Version Stamping

In `insertion.ts`, extend the wrapper div to include `data-template-version` when the template has a version:

```html
<div class="sc-template" data-template-id="123" data-template-version="2.1">
  <!-- template content -->
</div>
```

- Added only when `template.version` is provided
- Backward compatible — no version = no attribute

## Version Check Flow

```
Editor loads content (SetContent event)
    ↓
Find .sc-template[data-template-id][data-template-version]
    ↓ (found)
Extract templateId + currentVersion from DOM attributes
    ↓
Call config.checkVersion(templateId, currentVersion)
    ↓ (returns VersionCheckResult)
Show info banner with template name
    ↓
User clicks [Update] → migration flow
User clicks [✕] → dismiss banner
```

- No check when no `.sc-template` wrapper in content
- No check when no `data-template-version` attribute (pre-versioning content)
- No check when `checkVersion` callback not configured

## Info Banner

```
┌─────────────────────────────────────────────────────────────┐
│ ℹ This document uses an older version of "Clinical         │
│   Encounter". A newer version is available.  [Update] [✕]  │
└─────────────────────────────────────────────────────────────┘
```

- Rendered in the editor iframe (above content) or in the parent page near the editor
- CSS class `.sc-version-banner`
- Non-modal, dismissible
- Stores the `VersionCheckResult` in closure for the Update handler

## Migration Flow

When user clicks "Update":

1. **Extract unresolved field values** — use `findPlaceholderFields()` on current editor content to get unresolved fields with their current text and `data-field` names
2. **Replace content** — swap the `.sc-template` div's innerHTML with the latest template content, update `data-template-version` to the latest version
3. **Map values** — for each extracted field value, find a matching `data-field` name in the new content and set its text
4. **Activate placeholders** — call `activatePlaceholders(editor, config)` to set up Tab navigation and field resolution on the new content
5. **Dismiss banner** — remove the info banner

### Migration limitations

- Only unresolved placeholder values are migrated (resolved fields have lost their `data-field` attribute)
- Fields that exist in the old template but not the new one are silently dropped
- New fields in the updated template get their default placeholder text
- No field renaming support — mapping is by exact `data-field` name match

## New Files

| File | Purpose |
|------|---------|
| `src/versioning.ts` | Version check flow, info banner rendering, migration logic, banner CSS |
| `test/versioning.test.ts` | Version checking, banner, migration tests |

## Modified Files

| File | Change |
|------|--------|
| `src/types.ts` | Add `version` to `Template`, add `VersionCheckResult`, add `checkVersion` to config |
| `src/insertion.ts` | Stamp `data-template-version` when template has version |
| `src/plugin.ts` | Hook version check on `SetContent` event |
| `test/insertion.test.ts` | Test version stamping |

## Test Plan

**Types:**
- `VersionCheckResult` interface matches spec
- `checkVersion` accepted in config

**Insertion:**
- `data-template-version` stamped when template has version
- No version attribute when template has no version (backward compat)

**Version check flow:**
- `checkVersion` called with correct templateId and currentVersion
- Not called when no `.sc-template` in content
- Not called when no `data-template-version` attribute
- Banner shown when result returned
- Banner not shown when null returned

**Info banner:**
- Banner renders with template name, Update and Dismiss buttons
- Dismiss removes the banner
- CSS contains `.sc-version-banner`

**Migration:**
- Unresolved field values carried over by name to new template
- Fields with no match in new template are ignored
- New fields get default text
- `data-template-version` updated after migration
