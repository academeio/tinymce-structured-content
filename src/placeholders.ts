import type { PlaceholderField } from './types';

/** CSS injected into the editor iframe for placeholder styling */
export const PLACEHOLDER_CSS = `
.tmpl-field {
  background: #e8f4fd;
  border: 1px dashed #7ab8e0;
  border-radius: 3px;
  padding: 1px 4px;
  color: #1a6ca1;
  cursor: text;
  font-style: italic;
}
.tmpl-field[data-required="true"] {
  border-left: 3px solid #d9534f;
}
.tmpl-field:focus {
  outline: 2px solid #0d6efd;
  outline-offset: 1px;
}
`;

/** Find all placeholder fields in a document and return metadata */
export function findPlaceholderFields(doc: Document): PlaceholderField[] {
  const elements = doc.querySelectorAll('.tmpl-field');
  return Array.from(elements).map((el) => ({
    element: el as HTMLElement,
    name: el.getAttribute('data-field') || '',
    defaultText: (el.textContent || '').trim(),
    required: el.getAttribute('data-required') === 'true',
    resolved: false,
  }));
}

/** Check if a field's text has changed from its default and strip placeholder markup if so */
export function resolveField(field: PlaceholderField): void {
  const currentText = (field.element.textContent || '').trim();
  if (currentText === field.defaultText) return;

  field.resolved = true;
  field.element.classList.remove('tmpl-field');
  field.element.removeAttribute('data-field');
  field.element.removeAttribute('data-required');
}

/** Get the next unresolved field after the current one (wraps around) */
export function getNextField(
  fields: PlaceholderField[],
  current: PlaceholderField
): PlaceholderField | null {
  const unresolved = fields.filter((f) => !f.resolved);
  if (unresolved.length === 0) return null;

  const currentIdx = fields.indexOf(current);
  for (let i = 1; i <= fields.length; i++) {
    const candidate = fields[(currentIdx + i) % fields.length];
    if (!candidate.resolved) return candidate;
  }
  return null;
}

/** Get the previous unresolved field before the current one (wraps around) */
export function getPrevField(
  fields: PlaceholderField[],
  current: PlaceholderField
): PlaceholderField | null {
  const unresolved = fields.filter((f) => !f.resolved);
  if (unresolved.length === 0) return null;

  const currentIdx = fields.indexOf(current);
  for (let i = 1; i <= fields.length; i++) {
    const candidate = fields[(currentIdx - i + fields.length) % fields.length];
    if (!candidate.resolved) return candidate;
  }
  return null;
}

/** Inject placeholder CSS into a document (idempotent) */
export function injectPlaceholderStyles(doc: Document): void {
  if (doc.getElementById('sc-placeholder-styles')) return;
  const style = doc.createElement('style');
  style.id = 'sc-placeholder-styles';
  style.textContent = PLACEHOLDER_CSS;
  doc.head.appendChild(style);
}

/**
 * Activate placeholder system on an editor.
 * Call after inserting a template. Sets up Tab navigation and field resolution.
 */
export function activatePlaceholders(editor: any): void {
  const doc: Document = editor.getDoc();
  injectPlaceholderStyles(doc);

  const fields = findPlaceholderFields(doc);
  if (fields.length === 0) return;

  // Focus the first field
  const firstField = fields.find((f) => !f.resolved);
  if (firstField) {
    editor.selection.select(firstField.element, true);
  }

  // Tab navigation handler
  editor.on('keydown', (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const node = editor.selection.getNode();
    const currentField = fields.find(
      (f) => f.element === node || f.element.contains(node)
    );
    if (!currentField) return;

    e.preventDefault();

    // Resolve current field if text was modified
    resolveField(currentField);

    // Navigate to next/prev
    const target = e.shiftKey
      ? getPrevField(fields, currentField)
      : getNextField(fields, currentField);

    if (target) {
      editor.selection.select(target.element, true);
    }
  });

  // Resolve fields on blur/click away
  editor.on('NodeChange', () => {
    const node = editor.selection.getNode();
    fields.forEach((field) => {
      if (field.element !== node && !field.element.contains(node)) {
        resolveField(field);
      }
    });
  });
}
