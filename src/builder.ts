import type { BlockType, TemplateBlock, HeadingBlock, ParagraphBlock, TextFieldBlock, DateFieldBlock, SelectFieldBlock, NumberFieldBlock } from './types';
import { escapeHtml } from './utils';

let blockCounter = 0;

/** Generate a unique block ID */
function nextId(): string {
  return `blk_${++blockCounter}`;
}

/** Reset the block ID counter (for test isolation) */
export function resetBlockCounter(): void {
  blockCounter = 0;
}

/** Convert a label string to a snake_case field name */
export function autoSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
}

/** Create a new block with sensible defaults */
export function createBlock(type: BlockType): TemplateBlock {
  const id = nextId();

  switch (type) {
    case 'heading':
      return { id, type, level: 3, text: 'Section Title' };
    case 'paragraph':
      return { id, type, text: 'Enter instructions or description here.' };
    case 'text-field':
      return { id, type, name: 'text_field', label: 'Text Field', placeholder: 'Enter text', required: false };
    case 'date-field':
      return { id, type, name: 'date_field', label: 'Date Field', placeholder: 'Select date', required: false };
    case 'select-field':
      return { id, type, name: 'select_field', label: 'Select Field', placeholder: 'Choose option', required: false, options: ['Option 1', 'Option 2'] };
    case 'number-field':
      return { id, type, name: 'number_field', label: 'Number Field', placeholder: 'Enter number', required: false };
  }
}

const esc = escapeHtml;

/** Build the tmpl-field span for a field block */
function fieldSpan(name: string, type: string, placeholder: string, required: boolean, extras: string = ''): string {
  let attrs = `class="tmpl-field" data-field="${esc(name)}" data-type="${type}"`;
  if (required) attrs += ' data-required="true"';
  if (extras) attrs += ' ' + extras;
  return `<span ${attrs}>${esc(placeholder)}</span>`;
}

/** Convert block model array to template HTML */
export function modelToHTML(blocks: TemplateBlock[]): string {
  if (blocks.length === 0) return '<div class="sc-template"></div>';

  const parts = blocks.map((block) => {
    switch (block.type) {
      case 'heading':
        return `<h${block.level}>${esc(block.text)}</h${block.level}>`;
      case 'paragraph':
        return `<p>${esc(block.text)}</p>`;
      case 'text-field':
        return `<div class="sc-field-row"><label>${esc(block.label)}</label>${fieldSpan(block.name, 'text', block.placeholder, block.required)}</div>`;
      case 'date-field':
        return `<div class="sc-field-row"><label>${esc(block.label)}</label>${fieldSpan(block.name, 'date', block.placeholder, block.required)}</div>`;
      case 'select-field': {
        const optAttr = `data-options="${esc(block.options.join(','))}"`;
        return `<div class="sc-field-row"><label>${esc(block.label)}</label>${fieldSpan(block.name, 'select', block.placeholder, block.required, optAttr)}</div>`;
      }
      case 'number-field': {
        let extras = '';
        if (block.min !== undefined) extras += `data-min="${block.min}"`;
        if (block.max !== undefined) extras += `${extras ? ' ' : ''}data-max="${block.max}"`;
        return `<div class="sc-field-row"><label>${esc(block.label)}</label>${fieldSpan(block.name, 'number', block.placeholder, block.required, extras)}</div>`;
      }
    }
  });

  return `<div class="sc-template">${parts.join('')}</div>`;
}
