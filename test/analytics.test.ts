import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { getTemplateMetrics, fireInsertionEvent } from '../src/analytics';

describe('getTemplateMetrics', () => {
  function makeEditor(bodyHtml: string) {
    const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>${bodyHtml}</body></html>`);
    return {
      dom,
      getDoc: () => dom.window.document,
    };
  }

  it('returns null when no sc-template wrapper', () => {
    const editor = makeEditor('<p>Plain content</p>');
    expect(getTemplateMetrics(editor)).toBeNull();
  });

  it('returns metrics for a template with mixed field states', () => {
    const editor = makeEditor(
      '<div class="sc-template" data-template-id="tpl-1">' +
        '<span class="tmpl-field" data-field="date" data-required="true" data-type="date">Enter date</span>' +
        '<span class="tmpl-field" data-field="notes" data-type="text">Add notes</span>' +
        '<span class="tmpl-field" data-field="score" data-required="true" data-type="number">Score</span>' +
      '</div>'
    );

    const metrics = getTemplateMetrics(editor)!;
    expect(metrics.totalFields).toBe(3);
    expect(metrics.requiredFields).toBe(2);
    expect(metrics.resolvedFields).toBe(0);
    expect(metrics.unresolvedRequired).toBe(2);
    expect(metrics.completionPercentage).toBe(0);
    expect(metrics.fieldBreakdown).toHaveLength(3);

    expect(metrics.fieldBreakdown[0]).toEqual({
      name: 'date',
      type: 'date',
      required: true,
      resolved: false,
    });
    expect(metrics.fieldBreakdown[1]).toEqual({
      name: 'notes',
      type: 'text',
      required: false,
      resolved: false,
    });
  });

  it('returns 100% completion when no fields exist', () => {
    const editor = makeEditor(
      '<div class="sc-template" data-template-id="tpl-1"><p>No fields here</p></div>'
    );
    const metrics = getTemplateMetrics(editor)!;
    expect(metrics.totalFields).toBe(0);
    expect(metrics.completionPercentage).toBe(100);
    expect(metrics.fieldBreakdown).toHaveLength(0);
  });

  it('computes correct percentage with partially resolved fields', () => {
    const editor = makeEditor(
      '<div class="sc-template" data-template-id="tpl-1">' +
        '<span class="tmpl-field" data-field="date" data-required="true">Enter date</span>' +
        '<span data-field="name">John Doe</span>' +
      '</div>'
    );
    const metrics = getTemplateMetrics(editor)!;
    expect(metrics.totalFields).toBe(1);
    expect(metrics.resolvedFields).toBe(0);
  });
});

describe('fireInsertionEvent', () => {
  function makeEditor(bodyHtml: string) {
    const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>${bodyHtml}</body></html>`);
    return {
      dom,
      getDoc: () => dom.window.document,
    };
  }

  it('calls onAnalyticsEvent with TemplateInsertedEvent', () => {
    const editor = makeEditor(
      '<div class="sc-template" data-template-id="tpl-1">' +
        '<span class="tmpl-field" data-field="date" data-required="true">Enter date</span>' +
        '<span class="tmpl-field" data-field="notes">Add notes</span>' +
      '</div>'
    );
    let received: any = null;
    const config: any = {
      onAnalyticsEvent: (event: any) => { received = event; },
    };
    const template = { id: 'tpl-1', title: 'Clinical Encounter', content: '', version: 'v2' };

    fireInsertionEvent(editor, config, template, 'cursor');

    expect(received).not.toBeNull();
    expect(received.type).toBe('template_inserted');
    expect(received.templateId).toBe('tpl-1');
    expect(received.templateTitle).toBe('Clinical Encounter');
    expect(received.templateVersion).toBe('v2');
    expect(received.insertionMode).toBe('cursor');
    expect(received.fieldCount).toBe(2);
    expect(received.requiredFieldCount).toBe(1);
    expect(typeof received.timestamp).toBe('number');
  });

  it('is a no-op when onAnalyticsEvent not configured', () => {
    const editor = makeEditor('<div class="sc-template" data-template-id="tpl-1"></div>');
    const template = { id: 'tpl-1', title: 'Test', content: '' };

    expect(() => fireInsertionEvent(editor, {}, template, 'cursor')).not.toThrow();
  });

  it('works when template has no version', () => {
    const editor = makeEditor('<div class="sc-template" data-template-id="tpl-1"></div>');
    let received: any = null;
    const config: any = {
      onAnalyticsEvent: (event: any) => { received = event; },
    };
    const template = { id: 'tpl-1', title: 'Test', content: '' };

    fireInsertionEvent(editor, config, template, 'document');

    expect(received.templateVersion).toBeUndefined();
    expect(received.insertionMode).toBe('document');
  });
});
