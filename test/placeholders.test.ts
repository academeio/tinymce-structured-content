import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  findPlaceholderFields,
  resolveField,
  getNextField,
  getPrevField,
  getUnresolvedRequired,
  isTemplateComplete,
  highlightUnresolved,
  clearValidationErrors,
  PLACEHOLDER_CSS,
  showValidationToast
} from '../src/placeholders';

describe('findPlaceholderFields', () => {
  it('finds all tmpl-field elements and extracts metadata', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="date" data-required="true">Enter date</span>
        <span class="tmpl-field" data-field="notes">Add notes</span>
      </div>
    `);
    const fields = findPlaceholderFields(dom.window.document);
    expect(fields).toHaveLength(2);
    expect(fields[0].name).toBe('date');
    expect(fields[0].required).toBe(true);
    expect(fields[0].defaultText).toBe('Enter date');
    expect(fields[0].resolved).toBe(false);
    expect(fields[1].name).toBe('notes');
    expect(fields[1].required).toBe(false);
  });

  it('returns empty array when no placeholders exist', () => {
    const dom = new JSDOM('<div><p>No fields here</p></div>');
    expect(findPlaceholderFields(dom.window.document)).toHaveLength(0);
  });
});

describe('resolveField', () => {
  it('strips tmpl-field class and data attributes when text is modified', () => {
    const dom = new JSDOM(
      '<span class="tmpl-field" data-field="date" data-required="true">Enter date</span>'
    );
    const el = dom.window.document.querySelector('.tmpl-field') as HTMLElement;
    const field = { element: el, name: 'date', defaultText: 'Enter date', required: true, resolved: false, type: 'text' as const };

    el.textContent = 'March 2026';
    resolveField(field);

    expect(field.resolved).toBe(true);
    expect(el.classList.contains('tmpl-field')).toBe(false);
    expect(el.hasAttribute('data-field')).toBe(false);
    expect(el.hasAttribute('data-required')).toBe(false);
    expect(el.textContent).toBe('March 2026');
  });

  it('does not resolve if text still matches default', () => {
    const dom = new JSDOM(
      '<span class="tmpl-field" data-field="date">Enter date</span>'
    );
    const el = dom.window.document.querySelector('.tmpl-field') as HTMLElement;
    const field = { element: el, name: 'date', defaultText: 'Enter date', required: false, resolved: false, type: 'text' as const };

    resolveField(field);

    expect(field.resolved).toBe(false);
    expect(el.classList.contains('tmpl-field')).toBe(true);
  });
});

describe('getNextField / getPrevField', () => {
  let fields: any[];

  beforeEach(() => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="a">A</span>
        <span class="tmpl-field" data-field="b">B</span>
        <span class="tmpl-field" data-field="c">C</span>
      </div>
    `);
    const els = dom.window.document.querySelectorAll('.tmpl-field');
    fields = Array.from(els).map((el, i) => ({
      element: el as HTMLElement,
      name: ['a', 'b', 'c'][i],
      defaultText: ['A', 'B', 'C'][i],
      required: false,
      resolved: false,
      type: 'text' as const
    }));
  });

  it('getNextField returns the next unresolved field', () => {
    expect(getNextField(fields, fields[0])).toBe(fields[1]);
    expect(getNextField(fields, fields[1])).toBe(fields[2]);
  });

  it('getNextField wraps around to the first field', () => {
    expect(getNextField(fields, fields[2])).toBe(fields[0]);
  });

  it('getNextField skips resolved fields', () => {
    fields[1].resolved = true;
    expect(getNextField(fields, fields[0])).toBe(fields[2]);
  });

  it('getPrevField returns the previous unresolved field', () => {
    expect(getPrevField(fields, fields[2])).toBe(fields[1]);
    expect(getPrevField(fields, fields[1])).toBe(fields[0]);
  });

  it('getPrevField wraps around to the last field', () => {
    expect(getPrevField(fields, fields[0])).toBe(fields[2]);
  });

  it('returns null when all fields are resolved', () => {
    fields.forEach(f => f.resolved = true);
    expect(getNextField(fields, fields[0])).toBeNull();
  });
});

describe('getUnresolvedRequired', () => {
  it('returns only required unresolved fields', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="date" data-required="true">Enter date</span>
        <span class="tmpl-field" data-field="notes">Add notes</span>
        <span class="tmpl-field" data-field="name" data-required="true">Enter name</span>
      </div>
    `);
    const result = getUnresolvedRequired(dom.window.document);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('date');
    expect(result[1].name).toBe('name');
  });

  it('excludes resolved required fields', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="date" data-required="true">Enter date</span>
        <span class="tmpl-field" data-field="name" data-required="true">Enter name</span>
      </div>
    `);
    const fields = findPlaceholderFields(dom.window.document);
    fields[0].element.textContent = 'March 2026';
    resolveField(fields[0]);

    const result = getUnresolvedRequired(dom.window.document);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('name');
  });

  it('returns empty array when no required fields exist', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="notes">Add notes</span>
      </div>
    `);
    expect(getUnresolvedRequired(dom.window.document)).toHaveLength(0);
  });

  it('returns empty array when no placeholders exist', () => {
    const dom = new JSDOM('<div><p>No fields</p></div>');
    expect(getUnresolvedRequired(dom.window.document)).toHaveLength(0);
  });
});

describe('isTemplateComplete', () => {
  it('returns true when all required fields are resolved', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="date" data-required="true">Enter date</span>
      </div>
    `);
    const fields = findPlaceholderFields(dom.window.document);
    fields[0].element.textContent = 'March 2026';
    resolveField(fields[0]);

    expect(isTemplateComplete(dom.window.document)).toBe(true);
  });

  it('returns false when required fields are unresolved', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="date" data-required="true">Enter date</span>
      </div>
    `);
    expect(isTemplateComplete(dom.window.document)).toBe(false);
  });

  it('returns true when no required fields exist', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="notes">Add notes</span>
      </div>
    `);
    expect(isTemplateComplete(dom.window.document)).toBe(true);
  });

  it('returns true when document has no placeholders at all', () => {
    const dom = new JSDOM('<div><p>Plain text</p></div>');
    expect(isTemplateComplete(dom.window.document)).toBe(true);
  });
});

describe('highlightUnresolved', () => {
  it('adds tmpl-field-error class to unresolved required fields', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="date" data-required="true">Enter date</span>
        <span class="tmpl-field" data-field="notes">Add notes</span>
        <span class="tmpl-field" data-field="name" data-required="true">Enter name</span>
      </div>
    `);
    const result = highlightUnresolved(dom.window.document);
    expect(result).toHaveLength(2);

    const els = dom.window.document.querySelectorAll('.tmpl-field-error');
    expect(els).toHaveLength(2);
    expect(els[0].getAttribute('data-field')).toBe('date');
    expect(els[1].getAttribute('data-field')).toBe('name');
  });

  it('does not add error class to non-required fields', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="notes">Add notes</span>
      </div>
    `);
    highlightUnresolved(dom.window.document);
    expect(dom.window.document.querySelectorAll('.tmpl-field-error')).toHaveLength(0);
  });

  it('returns empty array when all required fields are resolved', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="date" data-required="true">Enter date</span>
      </div>
    `);
    const fields = findPlaceholderFields(dom.window.document);
    fields[0].element.textContent = 'March 2026';
    resolveField(fields[0]);

    expect(highlightUnresolved(dom.window.document)).toHaveLength(0);
  });
});

describe('clearValidationErrors', () => {
  it('removes tmpl-field-error class from all fields', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field tmpl-field-error" data-field="date" data-required="true">Enter date</span>
        <span class="tmpl-field tmpl-field-error" data-field="name" data-required="true">Enter name</span>
      </div>
    `);
    clearValidationErrors(dom.window.document);

    expect(dom.window.document.querySelectorAll('.tmpl-field-error')).toHaveLength(0);
    // Original tmpl-field class should remain
    expect(dom.window.document.querySelectorAll('.tmpl-field')).toHaveLength(2);
  });

  it('is safe to call when no errors exist', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="date">Enter date</span>
      </div>
    `);
    expect(() => clearValidationErrors(dom.window.document)).not.toThrow();
  });
});

describe('PLACEHOLDER_CSS', () => {
  it('contains error styling for tmpl-field-error', () => {
    expect(PLACEHOLDER_CSS).toContain('.tmpl-field-error');
  });

  it('contains toast styling for sc-validation-toast', () => {
    expect(PLACEHOLDER_CSS).toContain('.sc-validation-toast');
  });

  it('contains shake animation', () => {
    expect(PLACEHOLDER_CSS).toContain('sc-shake');
  });
});

describe('showValidationToast', () => {
  it('creates a toast element in the document', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    showValidationToast(dom.window.document, 3);

    const toast = dom.window.document.querySelector('.sc-validation-toast');
    expect(toast).not.toBeNull();
    expect(toast!.textContent).toBe('3 required field(s) need to be filled');
  });

  it('replaces existing toast (idempotent)', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    showValidationToast(dom.window.document, 3);
    showValidationToast(dom.window.document, 1);

    const toasts = dom.window.document.querySelectorAll('.sc-validation-toast');
    expect(toasts).toHaveLength(1);
    expect(toasts[0].textContent).toBe('1 required field(s) need to be filled');
  });
});

describe('findPlaceholderFields — typed fields', () => {
  it('parses data-type attribute, defaults to text', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="date" data-type="date">Select date</span>
        <span class="tmpl-field" data-field="notes">Add notes</span>
      </div>
    `);
    const fields = findPlaceholderFields(dom.window.document);
    expect(fields[0].type).toBe('date');
    expect(fields[1].type).toBe('text');
  });

  it('parses data-options for select type', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="level" data-type="select" data-options="Direct|Indirect|Distant">Level</span>
      </div>
    `);
    const fields = findPlaceholderFields(dom.window.document);
    expect(fields[0].type).toBe('select');
    expect(fields[0].options).toEqual(['Direct', 'Indirect', 'Distant']);
  });

  it('parses data-min and data-max for number type', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="score" data-type="number" data-min="1" data-max="5">Score</span>
      </div>
    `);
    const fields = findPlaceholderFields(dom.window.document);
    expect(fields[0].type).toBe('number');
    expect(fields[0].min).toBe(1);
    expect(fields[0].max).toBe(5);
  });

  it('leaves options/min/max undefined when not present', () => {
    const dom = new JSDOM(`
      <div>
        <span class="tmpl-field" data-field="notes" data-type="text">Notes</span>
      </div>
    `);
    const fields = findPlaceholderFields(dom.window.document);
    expect(fields[0].options).toBeUndefined();
    expect(fields[0].min).toBeUndefined();
    expect(fields[0].max).toBeUndefined();
  });
});
