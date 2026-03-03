import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  VERSIONING_CSS,
  injectVersioningStyles,
  showVersionBanner,
  dismissVersionBanner,
  checkForUpdates,
  extractFieldValues,
  migrateTemplate,
} from '../src/versioning';
import type { VersionCheckResult } from '../src/types';

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

describe('extractFieldValues', () => {
  it('extracts values from unresolved fields with modified text', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="date" data-required="true" data-default="Enter date">Enter date</span>
        <span class="tmpl-field" data-field="name" data-default="Enter name">Enter name</span>
      </div>
    `);
    // Simulate user typing into the first field
    const dateField = dom.window.document.querySelector('[data-field="date"]') as HTMLElement;
    dateField.textContent = 'March 2026';

    const values = extractFieldValues(dom.window.document);
    expect(values.get('date')).toBe('March 2026');
    expect(values.has('name')).toBe(false); // unchanged = default text, not extracted
  });

  it('returns empty map when no fields are modified', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="date" data-default="Enter date">Enter date</span>
      </div>
    `);
    const values = extractFieldValues(dom.window.document);
    expect(values.size).toBe(0);
  });
});

describe('checkForUpdates', () => {
  function makeMockEditor(bodyHtml: string) {
    const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>${bodyHtml}</body></html>`);
    return {
      dom,
      getDoc: () => dom.window.document,
    };
  }

  it('calls checkVersion when template wrapper has id and version', async () => {
    const editor = makeMockEditor(
      '<div class="sc-template" data-template-id="tpl-1" data-template-version="v1"><p>Content</p></div>'
    );
    let calledWith: { id: string; version: string } | null = null;
    const config: any = {
      checkVersion: async (id: string, version: string) => {
        calledWith = { id, version };
        return null;
      },
    };

    await checkForUpdates(editor, config);
    expect(calledWith).toEqual({ id: 'tpl-1', version: 'v1' });
  });

  it('does not call checkVersion when no sc-template wrapper', async () => {
    const editor = makeMockEditor('<p>Plain content</p>');
    let called = false;
    const config: any = {
      checkVersion: async () => { called = true; return null; },
    };

    await checkForUpdates(editor, config);
    expect(called).toBe(false);
  });

  it('does not call checkVersion when no version attribute', async () => {
    const editor = makeMockEditor(
      '<div class="sc-template" data-template-id="tpl-1"><p>No version</p></div>'
    );
    let called = false;
    const config: any = {
      checkVersion: async () => { called = true; return null; },
    };

    await checkForUpdates(editor, config);
    expect(called).toBe(false);
  });

  it('does not call checkVersion when callback not configured', async () => {
    const editor = makeMockEditor(
      '<div class="sc-template" data-template-id="tpl-1" data-template-version="v1"><p>Content</p></div>'
    );

    // Should not throw
    await checkForUpdates(editor, {});
  });

  it('shows banner when checkVersion returns a result', async () => {
    const editor = makeMockEditor(
      '<div class="sc-template" data-template-id="tpl-1" data-template-version="v1"><p>Content</p></div>'
    );
    const config: any = {
      checkVersion: async () => ({
        latestVersion: 'v2',
        latestTemplate: { id: 'tpl-1', title: 'Clinical Encounter', content: '<p>New</p>', version: 'v2' },
      }),
    };

    await checkForUpdates(editor, config);
    const banner = editor.dom.window.document.querySelector('.sc-version-banner');
    expect(banner).not.toBeNull();
    expect(banner!.textContent).toContain('Clinical Encounter');
  });

  it('does not show banner when checkVersion returns null', async () => {
    const editor = makeMockEditor(
      '<div class="sc-template" data-template-id="tpl-1" data-template-version="v1"><p>Content</p></div>'
    );
    const config: any = {
      checkVersion: async () => null,
    };

    await checkForUpdates(editor, config);
    const banner = editor.dom.window.document.querySelector('.sc-version-banner');
    expect(banner).toBeNull();
  });
});

describe('migrateTemplate', () => {
  function makeMigrationEditor(bodyHtml: string) {
    const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>${bodyHtml}</body></html>`, {
      url: 'http://localhost',
    });
    return {
      dom,
      getDoc: () => dom.window.document,
      selection: { select: () => {} },
      on: () => {},
      undoManager: { transact: (fn: () => void) => fn() },
    };
  }

  it('replaces wrapper content with new template', () => {
    const editor = makeMigrationEditor(
      '<div class="sc-version-banner"></div>' +
      '<div class="sc-template" data-template-id="tpl-1" data-template-version="v1">' +
        '<span class="tmpl-field" data-field="date">Enter date</span>' +
      '</div>'
    );
    const wrapper = editor.dom.window.document.querySelector('.sc-template') as HTMLElement;
    const result: VersionCheckResult = {
      latestVersion: 'v2',
      latestTemplate: {
        id: 'tpl-1',
        title: 'Updated',
        content: '<p>New content</p><span class="tmpl-field" data-field="date">Enter date</span>',
        version: 'v2',
      },
    };

    migrateTemplate(editor, {}, wrapper, result);

    expect(wrapper.innerHTML).toContain('New content');
    expect(wrapper.getAttribute('data-template-version')).toBe('v2');
  });

  it('carries over unresolved field values by name', () => {
    const editor = makeMigrationEditor(
      '<div class="sc-template" data-template-id="tpl-1" data-template-version="v1">' +
        '<span class="tmpl-field" data-field="date" data-required="true" data-default="Enter date">Enter date</span>' +
        '<span class="tmpl-field" data-field="notes" data-default="Add notes">Add notes</span>' +
      '</div>'
    );
    // Simulate user typing into the date field
    const dateField = editor.dom.window.document.querySelector('[data-field="date"]') as HTMLElement;
    dateField.textContent = 'March 2026';

    const wrapper = editor.dom.window.document.querySelector('.sc-template') as HTMLElement;
    const result: VersionCheckResult = {
      latestVersion: 'v2',
      latestTemplate: {
        id: 'tpl-1',
        title: 'Updated',
        content:
          '<span class="tmpl-field" data-field="date" data-required="true">Enter date</span>' +
          '<span class="tmpl-field" data-field="summary">Enter summary</span>',
        version: 'v2',
      },
    };

    migrateTemplate(editor, {}, wrapper, result);

    // date field should have the old value
    const newDateField = editor.dom.window.document.querySelector('[data-field="date"]') as HTMLElement;
    expect(newDateField.textContent).toBe('March 2026');

    // summary is a new field — should have its default text
    const summaryField = editor.dom.window.document.querySelector('[data-field="summary"]') as HTMLElement;
    expect(summaryField.textContent).toBe('Enter summary');
  });

  it('ignores old fields not present in new template', () => {
    const editor = makeMigrationEditor(
      '<div class="sc-template" data-template-id="tpl-1" data-template-version="v1">' +
        '<span class="tmpl-field" data-field="old_field" data-default="Old value">Old value</span>' +
      '</div>'
    );
    const oldField = editor.dom.window.document.querySelector('[data-field="old_field"]') as HTMLElement;
    oldField.textContent = 'User typed this';

    const wrapper = editor.dom.window.document.querySelector('.sc-template') as HTMLElement;
    const result: VersionCheckResult = {
      latestVersion: 'v2',
      latestTemplate: {
        id: 'tpl-1',
        title: 'Updated',
        content: '<span class="tmpl-field" data-field="new_field">Enter new field</span>',
        version: 'v2',
      },
    };

    migrateTemplate(editor, {}, wrapper, result);

    // old_field should be gone, new_field should have default
    expect(editor.dom.window.document.querySelector('[data-field="old_field"]')).toBeNull();
    const newField = editor.dom.window.document.querySelector('[data-field="new_field"]') as HTMLElement;
    expect(newField.textContent).toBe('Enter new field');
  });

  it('updates data-template-version attribute', () => {
    const editor = makeMigrationEditor(
      '<div class="sc-template" data-template-id="tpl-1" data-template-version="v1">' +
        '<p>Old</p>' +
      '</div>'
    );
    const wrapper = editor.dom.window.document.querySelector('.sc-template') as HTMLElement;
    const result: VersionCheckResult = {
      latestVersion: 'v3',
      latestTemplate: { id: 'tpl-1', title: 'Updated', content: '<p>New</p>', version: 'v3' },
    };

    migrateTemplate(editor, {}, wrapper, result);
    expect(wrapper.getAttribute('data-template-version')).toBe('v3');
  });

  it('dismisses the version banner after migration', () => {
    const editor = makeMigrationEditor(
      '<div class="sc-version-banner">Banner</div>' +
      '<div class="sc-template" data-template-id="tpl-1" data-template-version="v1"><p>Old</p></div>'
    );
    const wrapper = editor.dom.window.document.querySelector('.sc-template') as HTMLElement;
    const result: VersionCheckResult = {
      latestVersion: 'v2',
      latestTemplate: { id: 'tpl-1', title: 'Updated', content: '<p>New</p>', version: 'v2' },
    };

    migrateTemplate(editor, {}, wrapper, result);
    expect(editor.dom.window.document.querySelector('.sc-version-banner')).toBeNull();
  });
});
