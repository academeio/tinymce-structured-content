import type { PlaceholderField, StructuredContentConfig } from './types';
import { openPopover, closePopover, injectWidgetStyles } from './widgets';

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
.tmpl-field-error {
  background: #fde8e8;
  border: 1px solid #d9534f;
  border-left: 3px solid #d9534f;
  animation: sc-shake 0.3s ease-in-out;
}
@keyframes sc-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}
.sc-validation-toast {
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: #d9534f;
  color: #fff;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 0.85rem;
  z-index: 10000;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.tmpl-field[data-type="date"],
.tmpl-field[data-type="select"],
.tmpl-field[data-type="number"] {
  cursor: pointer;
  border-style: solid;
}
`;

/** Find all placeholder fields in a document and return metadata */
export function findPlaceholderFields(doc: Document): PlaceholderField[] {
  const elements = doc.querySelectorAll('.tmpl-field');
  return Array.from(elements).map((el) => {
    const typeAttr = el.getAttribute('data-type');
    const type = (typeAttr === 'date' || typeAttr === 'select' || typeAttr === 'number') ? typeAttr : 'text';
    const optionsAttr = el.getAttribute('data-options');
    const minAttr = el.getAttribute('data-min');
    const maxAttr = el.getAttribute('data-max');

    return {
      element: el as HTMLElement,
      name: el.getAttribute('data-field') || '',
      defaultText: (el.textContent || '').trim(),
      required: el.getAttribute('data-required') === 'true',
      resolved: false,
      type,
      options: optionsAttr ? optionsAttr.split('|') : undefined,
      min: minAttr !== null ? Number(minAttr) : undefined,
      max: maxAttr !== null ? Number(maxAttr) : undefined,
    };
  });
}

/** Check if a field's text has changed from its default and strip placeholder markup if so */
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

/** Return all required fields that have not been resolved */
export function getUnresolvedRequired(doc: Document): PlaceholderField[] {
  return findPlaceholderFields(doc).filter((f) => f.required && !f.resolved);
}

/** Check if all required placeholder fields have been resolved */
export function isTemplateComplete(doc: Document): boolean {
  return getUnresolvedRequired(doc).length === 0;
}

/** Add error styling to all unresolved required fields */
export function highlightUnresolved(doc: Document): PlaceholderField[] {
  const unresolvedRequired = getUnresolvedRequired(doc);
  unresolvedRequired.forEach((f) => f.element.classList.add('tmpl-field-error'));
  return unresolvedRequired;
}

/** Remove error styling from all placeholder fields */
export function clearValidationErrors(doc: Document): void {
  doc.querySelectorAll('.tmpl-field-error').forEach((el) => {
    el.classList.remove('tmpl-field-error');
  });
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

/** Show a validation toast notification in the document */
export function showValidationToast(doc: Document, count: number): void {
  // Remove existing toast
  const existing = doc.querySelector('.sc-validation-toast');
  if (existing) existing.remove();

  const toast = doc.createElement('div');
  toast.className = 'sc-validation-toast';
  toast.textContent = `${count} required field(s) need to be filled`;
  doc.body.appendChild(toast);

  // Auto-dismiss after 5 seconds
  setTimeout(() => toast.remove(), 5000);

  // Dismiss when a placeholder field receives focus
  const dismissOnFocus = () => {
    toast.remove();
    doc.removeEventListener('focusin', dismissOnFocus);
  };
  doc.addEventListener('focusin', (e: Event) => {
    if ((e.target as HTMLElement)?.classList?.contains('tmpl-field')) {
      dismissOnFocus();
    }
  });
}

/**
 * Activate placeholder system on an editor.
 * Call after inserting a template. Sets up Tab navigation and field resolution.
 */
export function activatePlaceholders(editor: any, config?: StructuredContentConfig): void {
  const doc: Document = editor.getDoc();
  injectPlaceholderStyles(doc);
  injectWidgetStyles(document);

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

  // Click handler for typed fields — open widget popover
  fields.forEach((field) => {
    if (field.type !== 'text') {
      field.element.addEventListener('click', () => {
        openPopover(document, field, resolveField);
      });
    }
  });

  // Validation on content extraction (warn mode)
  if (config?.validation === 'warn') {
    editor.on('BeforeGetContent', () => {
      const currentDoc: Document = editor.getDoc();
      const unresolvedRequired = getUnresolvedRequired(currentDoc);
      if (unresolvedRequired.length > 0) {
        highlightUnresolved(currentDoc);
        editor.selection.select(unresolvedRequired[0].element, true);
        showValidationToast(currentDoc, unresolvedRequired.length);
      } else {
        clearValidationErrors(currentDoc);
      }
    });
  }
}
