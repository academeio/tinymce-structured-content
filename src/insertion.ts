import type { StructuredContentConfig } from './types';

/** Escape HTML special characters in a string */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Replace {{variable}} patterns in template HTML with config values */
export function replaceVariables(
  html: string,
  variables: Record<string, string> | undefined
): string {
  if (!variables) return html;
  return html.replace(/\{\{(\w+)\}\}/g, (match, name) => {
    return name in variables ? escapeHtml(variables[name]) : match;
  });
}

/** Insert processed template HTML into the editor */
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
