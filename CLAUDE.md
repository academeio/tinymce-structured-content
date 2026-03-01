# CLAUDE.md

## Project: tinymce-structured-content

TinyMCE 7 plugin for structured content templates. Modular TypeScript, bundled via Rollup.

## Commands

- `npm run build` — build dist/plugin.js
- `npm test` — run Vitest tests
- `npm run dev` — watch mode

## Architecture

- `src/plugin.ts` — entry point, TinyMCE PluginManager registration
- `src/types.ts` — TypeScript interfaces (Template, Category, StructuredContentConfig)
- `src/browser.ts` — template browser modal UI
- `src/placeholders.ts` — placeholder field system (rendering, Tab navigation, cleanup)
- `src/insertion.ts` — template insertion logic (variable replacement, cursor/document mode)
- `src/styles.ts` — CSS injection for placeholders and modal

## Design

See ~/Development/eportfolios/docs/plans/01-03-2026-tinymce-structured-content-design.md
