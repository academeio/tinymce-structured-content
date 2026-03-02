import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { closePopover, injectWidgetStyles, WIDGET_CSS } from '../src/widgets';

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
