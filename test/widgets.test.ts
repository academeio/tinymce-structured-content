import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { openPopover, closePopover, injectWidgetStyles, WIDGET_CSS } from '../src/widgets';
import type { PlaceholderField } from '../src/types';

describe('WIDGET_CSS', () => {
  it('contains popover styles', () => {
    expect(WIDGET_CSS).toContain('.sc-popover');
  });

  it('contains error styles', () => {
    expect(WIDGET_CSS).toContain('.sc-popover-error');
  });
});

describe('injectWidgetStyles', () => {
  it('injects styles into document head (idempotent)', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    injectWidgetStyles(dom.window.document);
    injectWidgetStyles(dom.window.document);

    const styles = dom.window.document.querySelectorAll('#sc-widget-styles');
    expect(styles).toHaveLength(1);
  });
});

describe('closePopover', () => {
  it('removes popover from DOM', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div class="sc-popover"></div></body></html>');
    closePopover(dom.window.document);
    expect(dom.window.document.querySelector('.sc-popover')).toBeNull();
  });

  it('is safe to call when no popover exists', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    expect(() => closePopover(dom.window.document)).not.toThrow();
  });
});

function makeField(dom: JSDOM, html: string): PlaceholderField {
  dom.window.document.body.innerHTML = html;
  const el = dom.window.document.querySelector('.tmpl-field') as HTMLElement;
  return {
    element: el,
    name: el.getAttribute('data-field') || '',
    defaultText: (el.textContent || '').trim(),
    required: el.getAttribute('data-required') === 'true',
    resolved: false,
    type: (el.getAttribute('data-type') as any) || 'text',
    options: el.getAttribute('data-options')?.split('|'),
    min: el.getAttribute('data-min') ? Number(el.getAttribute('data-min')) : undefined,
    max: el.getAttribute('data-max') ? Number(el.getAttribute('data-max')) : undefined,
  };
}

describe('openPopover — date', () => {
  let dom: JSDOM;
  let field: PlaceholderField;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    field = makeField(dom, '<span class="tmpl-field" data-field="date" data-type="date" data-required="true">Select date</span>');
  });

  afterEach(() => {
    closePopover(dom.window.document);
  });

  it('creates a popover with a date input', () => {
    openPopover(dom.window.document, field);
    const popover = dom.window.document.querySelector('.sc-popover');
    expect(popover).not.toBeNull();
    const input = popover!.querySelector('input[type="date"]');
    expect(input).not.toBeNull();
  });

  it('replaces existing popover (only one at a time)', () => {
    openPopover(dom.window.document, field);
    openPopover(dom.window.document, field);
    expect(dom.window.document.querySelectorAll('.sc-popover')).toHaveLength(1);
  });

  it('updates field text and resolves on value change', () => {
    openPopover(dom.window.document, field);
    const input = dom.window.document.querySelector('.sc-popover input[type="date"]') as HTMLInputElement;
    input.value = '2026-03-15';
    input.dispatchEvent(new dom.window.Event('change'));

    expect(field.element.textContent).toBe('2026-03-15');
    expect(field.resolved).toBe(true);
    // Popover should be dismissed
    expect(dom.window.document.querySelector('.sc-popover')).toBeNull();
  });
});
