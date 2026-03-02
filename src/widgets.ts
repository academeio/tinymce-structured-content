import type { PlaceholderField } from './types';
import { resolveField } from './placeholders';

/** CSS for widget popovers — injected into the host page */
export const WIDGET_CSS = `
.sc-popover {
  position: absolute;
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 8px 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 100001;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 0.9rem;
}
.sc-popover input,
.sc-popover select {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
}
.sc-popover-error {
  color: #d9534f;
  font-size: 0.8rem;
  margin-top: 4px;
}
`;

/** Inject widget CSS into a document (idempotent) */
export function injectWidgetStyles(doc: Document): void {
  if (doc.getElementById('sc-widget-styles')) return;
  const style = doc.createElement('style');
  style.id = 'sc-widget-styles';
  style.textContent = WIDGET_CSS;
  doc.head.appendChild(style);
}

/** Close and remove the active popover */
export function closePopover(doc: Document): void {
  const existing = doc.querySelector('.sc-popover');
  if (existing) existing.remove();
}

/** Open a typed popover for a placeholder field */
export function openPopover(doc: Document, field: PlaceholderField): void {
  closePopover(doc);
  injectWidgetStyles(doc);

  const popover = doc.createElement('div');
  popover.className = 'sc-popover';

  // Position popover near the field element
  const rect = field.element.getBoundingClientRect();
  popover.style.top = `${rect.bottom + 4}px`;
  popover.style.left = `${rect.left}px`;

  const content = createInput(doc, field, popover);
  popover.appendChild(content);
  doc.body.appendChild(popover);

  // Focus the input
  const input = popover.querySelector('input, select') as HTMLElement;
  if (input) input.focus();

  // Escape to close
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closePopover(doc);
      doc.removeEventListener('keydown', escHandler);
    }
  };
  doc.addEventListener('keydown', escHandler);

  // Click outside to close
  const clickHandler = (e: MouseEvent) => {
    if (!popover.contains(e.target as Node)) {
      closePopover(doc);
      doc.removeEventListener('mousedown', clickHandler);
    }
  };
  // Delay to avoid immediate close from the triggering click
  setTimeout(() => doc.addEventListener('mousedown', clickHandler), 0);
}

function createInput(doc: Document, field: PlaceholderField, popover: HTMLElement): HTMLElement {
  switch (field.type) {
    case 'date':
      return createDateInput(doc, field, popover);
    default:
      return doc.createElement('span');
  }
}

function createDateInput(doc: Document, field: PlaceholderField, popover: HTMLElement): HTMLElement {
  const input = doc.createElement('input');
  input.type = 'date';
  input.addEventListener('change', () => {
    if (input.value) {
      field.element.textContent = input.value;
      resolveField(field);
      closePopover(doc);
    }
  });
  return input;
}
