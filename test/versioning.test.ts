import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  VERSIONING_CSS,
  injectVersioningStyles,
  showVersionBanner,
  dismissVersionBanner,
} from '../src/versioning';

describe('VERSIONING_CSS', () => {
  it('contains version banner styles', () => {
    expect(VERSIONING_CSS).toContain('.sc-version-banner');
    expect(VERSIONING_CSS).toContain('.sc-version-update');
    expect(VERSIONING_CSS).toContain('.sc-version-dismiss');
  });
});

describe('injectVersioningStyles', () => {
  it('injects styles into document head (idempotent)', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    injectVersioningStyles(dom.window.document);
    injectVersioningStyles(dom.window.document);

    const styles = dom.window.document.querySelectorAll('#sc-versioning-styles');
    expect(styles).toHaveLength(1);
  });
});

describe('showVersionBanner', () => {
  it('creates a banner with template name', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><p>Content</p></body></html>');
    showVersionBanner(dom.window.document, 'Clinical Encounter', () => {}, () => {});

    const banner = dom.window.document.querySelector('.sc-version-banner');
    expect(banner).not.toBeNull();
    expect(banner!.textContent).toContain('Clinical Encounter');
    expect(banner!.textContent).toContain('newer version');
  });

  it('renders Update and Dismiss buttons', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    showVersionBanner(dom.window.document, 'Test', () => {}, () => {});

    const updateBtn = dom.window.document.querySelector('.sc-version-update');
    const dismissBtn = dom.window.document.querySelector('.sc-version-dismiss');
    expect(updateBtn).not.toBeNull();
    expect(updateBtn!.textContent).toBe('Update');
    expect(dismissBtn).not.toBeNull();
  });

  it('calls onUpdate when Update button is clicked', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    let updated = false;
    showVersionBanner(dom.window.document, 'Test', () => { updated = true; }, () => {});

    const updateBtn = dom.window.document.querySelector('.sc-version-update') as HTMLElement;
    updateBtn.click();
    expect(updated).toBe(true);
  });

  it('calls onDismiss when Dismiss button is clicked', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    let dismissed = false;
    showVersionBanner(dom.window.document, 'Test', () => {}, () => { dismissed = true; });

    const dismissBtn = dom.window.document.querySelector('.sc-version-dismiss') as HTMLElement;
    dismissBtn.click();
    expect(dismissed).toBe(true);
  });

  it('inserts banner before existing content', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><p>Content</p></body></html>');
    showVersionBanner(dom.window.document, 'Test', () => {}, () => {});

    const firstChild = dom.window.document.body.firstElementChild;
    expect(firstChild!.classList.contains('sc-version-banner')).toBe(true);
  });

  it('replaces existing banner (only one at a time)', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    showVersionBanner(dom.window.document, 'First', () => {}, () => {});
    showVersionBanner(dom.window.document, 'Second', () => {}, () => {});

    const banners = dom.window.document.querySelectorAll('.sc-version-banner');
    expect(banners).toHaveLength(1);
    expect(banners[0].textContent).toContain('Second');
  });
});

describe('dismissVersionBanner', () => {
  it('removes the banner from DOM', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    showVersionBanner(dom.window.document, 'Test', () => {}, () => {});
    expect(dom.window.document.querySelector('.sc-version-banner')).not.toBeNull();

    dismissVersionBanner(dom.window.document);
    expect(dom.window.document.querySelector('.sc-version-banner')).toBeNull();
  });

  it('is safe to call when no banner exists', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    expect(() => dismissVersionBanner(dom.window.document)).not.toThrow();
  });
});
