import type { PlaceholderField } from './types';

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
export function openPopover(doc: Document, field: PlaceholderField, resolve: (f: PlaceholderField) => void): void {
  closePopover(doc);
  injectWidgetStyles(doc);

  const popover = doc.createElement('div');
  popover.className = 'sc-popover';

  // Position popover near the field element
  const rect = field.element.getBoundingClientRect();
  popover.style.top = `${rect.bottom + 4}px`;
  popover.style.left = `${rect.left}px`;

  const content = createInput(doc, field, popover, resolve);
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

function createInput(doc: Document, field: PlaceholderField, popover: HTMLElement, resolve: (f: PlaceholderField) => void): HTMLElement {
  switch (field.type) {
    case 'date':
      return createDateInput(doc, field, popover, resolve);
    case 'select':
      return createSelectInput(doc, field, popover, resolve);
    case 'number':
      return createNumberInput(doc, field, popover, resolve);
    default:
      return doc.createElement('span');
  }
}

function createDateInput(doc: Document, field: PlaceholderField, popover: HTMLElement, resolve: (f: PlaceholderField) => void): HTMLElement {
  const input = doc.createElement('input');
  input.type = 'date';
  input.addEventListener('change', () => {
    if (input.value) {
      field.element.textContent = input.value;
      resolve(field);
      closePopover(doc);
    }
  });
  return input;
}

function createSelectInput(doc: Document, field: PlaceholderField, popover: HTMLElement, resolve: (f: PlaceholderField) => void): HTMLElement {
  const select = doc.createElement('select');

  // Placeholder option
  const placeholder = doc.createElement('option');
  placeholder.textContent = 'Choose...';
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);

  (field.options || []).forEach((opt) => {
    const option = doc.createElement('option');
    option.value = opt;
    option.textContent = opt;
    select.appendChild(option);
  });

  select.addEventListener('change', () => {
    if (select.value) {
      field.element.textContent = select.value;
      resolve(field);
      closePopover(doc);
    }
  });

  return select;
}

function createNumberInput(doc: Document, field: PlaceholderField, popover: HTMLElement, resolve: (f: PlaceholderField) => void): HTMLElement {
  const wrapper = doc.createElement('div');

  const input = doc.createElement('input');
  input.type = 'number';
  if (field.min !== undefined) input.min = String(field.min);
  if (field.max !== undefined) input.max = String(field.max);
  wrapper.appendChild(input);

  input.addEventListener('change', () => {
    // Clear previous error
    const existingError = popover.querySelector('.sc-popover-error');
    if (existingError) existingError.remove();

    const val = Number(input.value);
    if (input.value === '') return;

    // Range validation
    if (field.min !== undefined && val < field.min) {
      showNumberError(doc, popover, field.min, field.max);
      return;
    }
    if (field.max !== undefined && val > field.max) {
      showNumberError(doc, popover, field.min, field.max);
      return;
    }

    field.element.textContent = input.value;
    resolve(field);
    closePopover(doc);
  });

  return wrapper;
}

function showNumberError(doc: Document, popover: HTMLElement, min?: number, max?: number): void {
  const existing = popover.querySelector('.sc-popover-error');
  if (existing) existing.remove();

  const error = doc.createElement('div');
  error.className = 'sc-popover-error';
  if (min !== undefined && max !== undefined) {
    error.textContent = `Value must be between ${min} and ${max}`;
  } else if (min !== undefined) {
    error.textContent = `Value must be at least ${min}`;
  } else if (max !== undefined) {
    error.textContent = `Value must be at most ${max}`;
  }
  popover.appendChild(error);
}
