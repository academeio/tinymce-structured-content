import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { renderBuilder } from '../src/builder-ui';
import type { TemplateBlock } from '../src/types';

function setup() {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
  const doc = dom.window.document;
  const container = doc.createElement('div');
  doc.body.appendChild(container);
  const onChange = vi.fn();
  renderBuilder(container, doc, onChange);
  return { doc, container, onChange };
}

describe('renderBuilder', () => {
  it('renders palette with 6 block type buttons', () => {
    const { container } = setup();
    const buttons = container.querySelectorAll('.sc-builder-palette button');
    expect(buttons).toHaveLength(6);
  });

  it('renders empty state message when no blocks', () => {
    const { container } = setup();
    const empty = container.querySelector('.sc-builder-empty');
    expect(empty).not.toBeNull();
    expect(empty!.textContent).toContain('Click a component');
  });

  it('adds a block when palette button is clicked', () => {
    const { container, onChange } = setup();
    const headingBtn = container.querySelector('.sc-builder-palette button') as HTMLElement;
    headingBtn.click();
    const cards = container.querySelectorAll('.sc-block-card');
    expect(cards).toHaveLength(1);
    expect(onChange).toHaveBeenCalled();
  });

  it('removes empty state after adding a block', () => {
    const { container } = setup();
    const btn = container.querySelector('.sc-builder-palette button') as HTMLElement;
    btn.click();
    expect(container.querySelector('.sc-builder-empty')).toBeNull();
  });

  it('expands new block for inline editing', () => {
    const { container } = setup();
    (container.querySelector('.sc-builder-palette button') as HTMLElement).click();
    const card = container.querySelector('.sc-block-card');
    expect(card!.classList.contains('selected')).toBe(true);
  });

  it('collapses previous block when another is selected', () => {
    const { container } = setup();
    const btns = container.querySelectorAll('.sc-builder-palette button');
    (btns[0] as HTMLElement).click(); // heading
    (btns[2] as HTMLElement).click(); // text-field
    const cards = container.querySelectorAll('.sc-block-card');
    expect(cards[0].classList.contains('selected')).toBe(false);
    expect(cards[1].classList.contains('selected')).toBe(true);
  });

  it('deletes a block when X is clicked', () => {
    const { container, onChange } = setup();
    (container.querySelector('.sc-builder-palette button') as HTMLElement).click();
    onChange.mockClear();
    const delBtn = container.querySelector('.sc-block-actions button:last-child') as HTMLElement;
    delBtn.click();
    expect(container.querySelectorAll('.sc-block-card')).toHaveLength(0);
    expect(container.querySelector('.sc-builder-empty')).not.toBeNull();
    expect(onChange).toHaveBeenCalled();
  });

  it('reorders blocks with move up button', () => {
    const { container, onChange } = setup();
    const btns = container.querySelectorAll('.sc-builder-palette button');
    (btns[0] as HTMLElement).click(); // heading
    (btns[1] as HTMLElement).click(); // paragraph
    onChange.mockClear();

    // Click move-up on second block
    const cards = container.querySelectorAll('.sc-block-card');
    const header2 = cards[1].querySelector('.sc-block-header') as HTMLElement;
    header2.click(); // select it
    const moveUpBtn = cards[1].querySelector('.sc-block-actions button:first-child') as HTMLElement;
    moveUpBtn.click();

    const updatedCards = container.querySelectorAll('.sc-block-card');
    const firstType = updatedCards[0].querySelector('.sc-block-type')!.textContent;
    expect(firstType).toContain('paragraph');
    expect(onChange).toHaveBeenCalled();
  });

  it('calls onChange with blocks when editing inline properties', () => {
    const { container, doc, onChange } = setup();
    // Add a text field
    const btns = container.querySelectorAll('.sc-builder-palette button');
    (btns[2] as HTMLElement).click(); // text-field
    onChange.mockClear();

    // Edit the label input
    const labelInput = container.querySelector('.sc-block-body input[type="text"]') as HTMLInputElement;
    labelInput.value = 'Patient Name';
    labelInput.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));

    expect(onChange).toHaveBeenCalled();
    const blocks: TemplateBlock[] = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    const field = blocks[0] as any;
    expect(field.label).toBe('Patient Name');
  });

  it('auto-slugs name from label when name not manually edited', () => {
    const { container, doc, onChange } = setup();
    const btns = container.querySelectorAll('.sc-builder-palette button');
    (btns[2] as HTMLElement).click(); // text-field

    // Edit label
    const inputs = container.querySelectorAll('.sc-block-body input[type="text"]');
    const labelInput = inputs[0] as HTMLInputElement; // label is first text input
    labelInput.value = 'Supervisor Name';
    labelInput.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));

    const blocks: TemplateBlock[] = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    const field = blocks[0] as any;
    expect(field.name).toBe('supervisor_name');
  });

  it('returns current blocks via onChange', () => {
    const { container, onChange } = setup();
    const btns = container.querySelectorAll('.sc-builder-palette button');
    (btns[0] as HTMLElement).click(); // heading
    (btns[2] as HTMLElement).click(); // text-field

    const blocks: TemplateBlock[] = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe('heading');
    expect(blocks[1].type).toBe('text-field');
  });
});
