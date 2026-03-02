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
