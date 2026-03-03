import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { autoSlug, createBlock, modelToHTML } from '../src/builder';
import { BUILDER_CSS, injectBuilderStyles } from '../src/builder-styles';
import type { HeadingBlock, ParagraphBlock, TextFieldBlock, DateFieldBlock, SelectFieldBlock, NumberFieldBlock, TemplateBlock } from '../src/types';

describe('autoSlug', () => {
  it('converts label to snake_case', () => {
    expect(autoSlug('Patient Name')).toBe('patient_name');
  });

  it('strips non-alphanumeric characters', () => {
    expect(autoSlug('Date (of birth)')).toBe('date_of_birth');
  });

  it('collapses multiple underscores', () => {
    expect(autoSlug('A -- B')).toBe('a_b');
  });

  it('trims leading/trailing underscores', () => {
    expect(autoSlug('  Name  ')).toBe('name');
  });

  it('returns empty string for empty input', () => {
    expect(autoSlug('')).toBe('');
  });
});

describe('createBlock', () => {
  it('creates a heading block with defaults', () => {
    const block = createBlock('heading') as HeadingBlock;
    expect(block.type).toBe('heading');
    expect(block.level).toBe(3);
    expect(block.text).toBe('Section Title');
    expect(block.id).toMatch(/^blk_/);
  });

  it('creates a paragraph block with defaults', () => {
    const block = createBlock('paragraph') as ParagraphBlock;
    expect(block.type).toBe('paragraph');
    expect(block.text).toBe('Enter instructions or description here.');
  });

  it('creates a text-field block with defaults', () => {
    const block = createBlock('text-field') as TextFieldBlock;
    expect(block.type).toBe('text-field');
    expect(block.name).toBe('text_field');
    expect(block.label).toBe('Text Field');
    expect(block.placeholder).toBe('Enter text');
    expect(block.required).toBe(false);
  });

  it('creates a date-field block with defaults', () => {
    const block = createBlock('date-field') as DateFieldBlock;
    expect(block.type).toBe('date-field');
    expect(block.name).toBe('date_field');
    expect(block.label).toBe('Date Field');
    expect(block.placeholder).toBe('Select date');
    expect(block.required).toBe(false);
  });

  it('creates a select-field block with defaults', () => {
    const block = createBlock('select-field') as SelectFieldBlock;
    expect(block.type).toBe('select-field');
    expect(block.name).toBe('select_field');
    expect(block.label).toBe('Select Field');
    expect(block.placeholder).toBe('Choose option');
    expect(block.required).toBe(false);
    expect(block.options).toEqual(['Option 1', 'Option 2']);
  });

  it('creates a number-field block with defaults', () => {
    const block = createBlock('number-field') as NumberFieldBlock;
    expect(block.type).toBe('number-field');
    expect(block.name).toBe('number_field');
    expect(block.label).toBe('Number Field');
    expect(block.placeholder).toBe('Enter number');
    expect(block.required).toBe(false);
    expect(block.min).toBeUndefined();
    expect(block.max).toBeUndefined();
  });

  it('generates unique IDs', () => {
    const a = createBlock('heading');
    const b = createBlock('heading');
    expect(a.id).not.toBe(b.id);
  });
});

describe('modelToHTML', () => {
  it('returns empty wrapper for empty model', () => {
    expect(modelToHTML([])).toBe('<div class="sc-template"></div>');
  });

  it('renders a heading', () => {
    const blocks: TemplateBlock[] = [
      { id: 'b1', type: 'heading', level: 3, text: 'Patient Info' },
    ];
    expect(modelToHTML(blocks)).toContain('<h3>Patient Info</h3>');
  });

  it('renders heading with correct level', () => {
    const blocks: TemplateBlock[] = [
      { id: 'b1', type: 'heading', level: 2, text: 'Title' },
    ];
    expect(modelToHTML(blocks)).toContain('<h2>Title</h2>');
  });

  it('renders a paragraph', () => {
    const blocks: TemplateBlock[] = [
      { id: 'b1', type: 'paragraph', text: 'Fill in all fields below.' },
    ];
    expect(modelToHTML(blocks)).toContain('<p>Fill in all fields below.</p>');
  });

  it('renders a text field with label and placeholder span', () => {
    const blocks: TemplateBlock[] = [
      { id: 'b1', type: 'text-field', name: 'patient_name', label: 'Patient Name', placeholder: 'Enter name', required: true },
    ];
    const html = modelToHTML(blocks);
    expect(html).toContain('<label>Patient Name</label>');
    expect(html).toContain('class="tmpl-field"');
    expect(html).toContain('data-field="patient_name"');
    expect(html).toContain('data-type="text"');
    expect(html).toContain('data-required="true"');
    expect(html).toContain('Enter name');
  });

  it('renders a date field', () => {
    const blocks: TemplateBlock[] = [
      { id: 'b1', type: 'date-field', name: 'dob', label: 'Date of Birth', placeholder: 'Select date', required: false },
    ];
    const html = modelToHTML(blocks);
    expect(html).toContain('data-type="date"');
    expect(html).toContain('data-field="dob"');
    expect(html).not.toContain('data-required');
  });

  it('renders a select field with options', () => {
    const blocks: TemplateBlock[] = [
      { id: 'b1', type: 'select-field', name: 'setting', label: 'Setting', placeholder: 'Choose', required: true, options: ['Inpatient', 'Outpatient'] },
    ];
    const html = modelToHTML(blocks);
    expect(html).toContain('data-type="select"');
    expect(html).toContain('data-options="Inpatient,Outpatient"');
    expect(html).toContain('data-required="true"');
  });

  it('renders a number field with min/max', () => {
    const blocks: TemplateBlock[] = [
      { id: 'b1', type: 'number-field', name: 'score', label: 'Score', placeholder: 'Enter score', required: true, min: 1, max: 10 },
    ];
    const html = modelToHTML(blocks);
    expect(html).toContain('data-type="number"');
    expect(html).toContain('data-min="1"');
    expect(html).toContain('data-max="10"');
  });

  it('omits min/max when not set on number field', () => {
    const blocks: TemplateBlock[] = [
      { id: 'b1', type: 'number-field', name: 'count', label: 'Count', placeholder: 'Enter', required: false },
    ];
    const html = modelToHTML(blocks);
    expect(html).not.toContain('data-min');
    expect(html).not.toContain('data-max');
  });

  it('renders multiple blocks in order', () => {
    const blocks: TemplateBlock[] = [
      { id: 'b1', type: 'heading', level: 3, text: 'Section' },
      { id: 'b2', type: 'text-field', name: 'name', label: 'Name', placeholder: 'Enter', required: false },
      { id: 'b3', type: 'paragraph', text: 'Notes below.' },
    ];
    const html = modelToHTML(blocks);
    const headingIdx = html.indexOf('<h3>');
    const fieldIdx = html.indexOf('data-field="name"');
    const paraIdx = html.indexOf('<p>Notes');
    expect(headingIdx).toBeLessThan(fieldIdx);
    expect(fieldIdx).toBeLessThan(paraIdx);
  });

  it('escapes HTML in text content', () => {
    const blocks: TemplateBlock[] = [
      { id: 'b1', type: 'heading', level: 3, text: '<script>alert("xss")</script>' },
    ];
    const html = modelToHTML(blocks);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('wraps output in sc-template div', () => {
    const html = modelToHTML([{ id: 'b1', type: 'heading', level: 3, text: 'Hi' }]);
    expect(html).toMatch(/^<div class="sc-template">/);
    expect(html).toMatch(/<\/div>$/);
  });
});

describe('BUILDER_CSS', () => {
  it('contains palette styles', () => {
    expect(BUILDER_CSS).toContain('.sc-builder-palette');
  });

  it('contains canvas styles', () => {
    expect(BUILDER_CSS).toContain('.sc-builder-canvas');
  });

  it('contains block card styles', () => {
    expect(BUILDER_CSS).toContain('.sc-block-card');
  });
});

describe('injectBuilderStyles', () => {
  it('injects styles idempotently', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    injectBuilderStyles(dom.window.document);
    injectBuilderStyles(dom.window.document);
    const styles = dom.window.document.querySelectorAll('#sc-builder-styles');
    expect(styles).toHaveLength(1);
  });
});
