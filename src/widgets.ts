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
