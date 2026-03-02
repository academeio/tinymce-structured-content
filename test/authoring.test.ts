import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { AUTHORING_CSS, injectAuthoringStyles } from '../src/authoring-styles';
import { buildPlaceholderSpan } from '../src/authoring';

describe('AUTHORING_CSS', () => {
  it('contains authoring modal styles', () => {
    expect(AUTHORING_CSS).toContain('.sc-authoring-overlay');
    expect(AUTHORING_CSS).toContain('.sc-authoring-modal');
    expect(AUTHORING_CSS).toContain('.sc-authoring-header');
    expect(AUTHORING_CSS).toContain('.sc-authoring-body');
    expect(AUTHORING_CSS).toContain('.sc-authoring-preview');
    expect(AUTHORING_CSS).toContain('.sc-authoring-footer');
  });
});

describe('injectAuthoringStyles', () => {
  it('injects styles into document head (idempotent)', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    injectAuthoringStyles(dom.window.document);
    injectAuthoringStyles(dom.window.document);

    const styles = dom.window.document.querySelectorAll('#sc-authoring-styles');
    expect(styles).toHaveLength(1);
  });
});

describe('buildPlaceholderSpan', () => {
  it('builds a text placeholder span', () => {
    const html = buildPlaceholderSpan('name', 'text', false);
    expect(html).toContain('class="tmpl-field"');
    expect(html).toContain('data-field="name"');
    expect(html).toContain('data-type="text"');
    expect(html).not.toContain('data-required');
    expect(html).toContain('{name}');
  });

  it('builds a required field span', () => {
    const html = buildPlaceholderSpan('date', 'date', true);
    expect(html).toContain('data-required="true"');
    expect(html).toContain('data-type="date"');
    expect(html).toContain('{date}');
  });

  it('builds a select field with options', () => {
    const html = buildPlaceholderSpan('level', 'select', false, 'Direct|Indirect|Distant');
    expect(html).toContain('data-type="select"');
    expect(html).toContain('data-options="Direct|Indirect|Distant"');
  });

  it('builds a number field with min/max', () => {
    const html = buildPlaceholderSpan('score', 'number', true, undefined, 1, 5);
    expect(html).toContain('data-type="number"');
    expect(html).toContain('data-min="1"');
    expect(html).toContain('data-max="5"');
    expect(html).toContain('data-required="true"');
  });

  it('omits min/max when not provided', () => {
    const html = buildPlaceholderSpan('count', 'number', false);
    expect(html).toContain('data-type="number"');
    expect(html).not.toContain('data-min');
    expect(html).not.toContain('data-max');
  });

  it('omits options when type is not select', () => {
    const html = buildPlaceholderSpan('name', 'text', false, 'A|B|C');
    expect(html).not.toContain('data-options');
  });
});
