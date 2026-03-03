import type { BlockType, TemplateBlock, HeadingBlock, ParagraphBlock, TextFieldBlock, DateFieldBlock, SelectFieldBlock, NumberFieldBlock } from './types';
import { autoSlug, createBlock } from './builder';
import { injectBuilderStyles } from './builder-styles';

interface PaletteItem {
  type: BlockType;
  label: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'heading', label: '+Heading' },
  { type: 'paragraph', label: '+Paragraph' },
  { type: 'text-field', label: '+Text' },
  { type: 'date-field', label: '+Date' },
  { type: 'select-field', label: '+Select' },
  { type: 'number-field', label: '+Number' },
];

/** Get display summary for a collapsed block card header */
function getBlockSummary(block: TemplateBlock): string {
  switch (block.type) {
    case 'heading':
      return block.text;
    case 'paragraph':
      return block.text.length > 50 ? block.text.slice(0, 50) + '...' : block.text;
    case 'text-field':
    case 'date-field':
    case 'select-field':
    case 'number-field':
      return block.label || block.name;
  }
}

/** Create a label + text input field and append to parent */
function addTextField(
  parent: HTMLElement,
  doc: Document,
  labelText: string,
  value: string,
  onInput: (val: string) => void,
): HTMLInputElement {
  const lbl = doc.createElement('label');
  lbl.textContent = labelText;
  parent.appendChild(lbl);

  const input = doc.createElement('input');
  input.type = 'text';
  input.value = value;
  input.addEventListener('input', () => onInput(input.value));
  parent.appendChild(input);
  return input;
}

/** Create a label + number input field and append to parent */
function addNumberField(
  parent: HTMLElement,
  doc: Document,
  labelText: string,
  value: number | undefined,
  onInput: (val: number | undefined) => void,
): HTMLInputElement {
  const lbl = doc.createElement('label');
  lbl.textContent = labelText;
  parent.appendChild(lbl);

  const input = doc.createElement('input');
  input.type = 'number';
  if (value !== undefined) input.value = String(value);
  input.addEventListener('input', () => {
    const v = input.value.trim();
    onInput(v === '' ? undefined : Number(v));
  });
  parent.appendChild(input);
  return input;
}

/** Create a label + select dropdown and append to parent */
function addSelectField(
  parent: HTMLElement,
  doc: Document,
  labelText: string,
  options: { value: string; label: string }[],
  currentValue: string,
  onChange: (val: string) => void,
): HTMLSelectElement {
  const lbl = doc.createElement('label');
  lbl.textContent = labelText;
  parent.appendChild(lbl);

  const select = doc.createElement('select');
  for (const opt of options) {
    const option = doc.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    if (opt.value === currentValue) option.selected = true;
    select.appendChild(option);
  }
  select.addEventListener('change', () => onChange(select.value));
  parent.appendChild(select);
  return select;
}

/** Create a checkbox row and append to parent */
function addCheckbox(
  parent: HTMLElement,
  doc: Document,
  labelText: string,
  checked: boolean,
  onChange: (val: boolean) => void,
): HTMLInputElement {
  const row = doc.createElement('div');
  row.className = 'sc-checkbox-row';

  const input = doc.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  row.appendChild(input);

  const lbl = doc.createElement('label');
  lbl.textContent = labelText;
  row.appendChild(lbl);

  parent.appendChild(row);
  return input;
}

/**
 * Render the block-based template builder into a container.
 *
 * @param container - DOM element to render into
 * @param doc - Document to create elements in
 * @param onChange - Called with a copy of the blocks array on every change
 */
export function renderBuilder(
  container: HTMLElement,
  doc: Document,
  onChange: (blocks: TemplateBlock[]) => void,
): void {
  injectBuilderStyles(doc);

  const blocks: TemplateBlock[] = [];
  let selectedId: string | null = null;
  const manualNames = new Set<string>();

  function notify(): void {
    onChange([...blocks]);
  }

  // -- Palette --
  const palette = doc.createElement('div');
  palette.className = 'sc-builder-palette';

  for (const item of PALETTE_ITEMS) {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.textContent = item.label;
    btn.addEventListener('click', () => {
      const block = createBlock(item.type);
      blocks.push(block);
      selectedId = block.id;
      renderCanvas();
      notify();
    });
    palette.appendChild(btn);
  }

  container.appendChild(palette);

  // -- Canvas --
  const canvas = doc.createElement('div');
  canvas.className = 'sc-builder-canvas';
  container.appendChild(canvas);

  function renderCanvas(): void {
    canvas.innerHTML = '';

    if (blocks.length === 0) {
      const empty = doc.createElement('div');
      empty.className = 'sc-builder-empty';
      empty.textContent = 'Click a component above to start building your template.';
      canvas.appendChild(empty);
      return;
    }

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const isSelected = block.id === selectedId;

      const card = doc.createElement('div');
      card.className = 'sc-block-card' + (isSelected ? ' selected' : '');

      // -- Header --
      const header = doc.createElement('div');
      header.className = 'sc-block-header';

      const typeBadge = doc.createElement('span');
      typeBadge.className = 'sc-block-type';
      typeBadge.textContent = block.type;
      header.appendChild(typeBadge);

      const summary = doc.createElement('span');
      summary.className = 'sc-block-summary';
      summary.textContent = getBlockSummary(block);
      header.appendChild(summary);

      // Action buttons
      const actions = doc.createElement('span');
      actions.className = 'sc-block-actions';

      // Move up
      const moveUpBtn = doc.createElement('button');
      moveUpBtn.type = 'button';
      moveUpBtn.textContent = '\u25B2';
      moveUpBtn.disabled = i === 0;
      moveUpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (i > 0) {
          const tmp = blocks[i - 1];
          blocks[i - 1] = blocks[i];
          blocks[i] = tmp;
          renderCanvas();
          notify();
        }
      });
      actions.appendChild(moveUpBtn);

      // Move down
      const moveDownBtn = doc.createElement('button');
      moveDownBtn.type = 'button';
      moveDownBtn.textContent = '\u25BC';
      moveDownBtn.disabled = i === blocks.length - 1;
      moveDownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (i < blocks.length - 1) {
          const tmp = blocks[i + 1];
          blocks[i + 1] = blocks[i];
          blocks[i] = tmp;
          renderCanvas();
          notify();
        }
      });
      actions.appendChild(moveDownBtn);

      // Delete
      const delBtn = doc.createElement('button');
      delBtn.type = 'button';
      delBtn.textContent = '\u2715';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        manualNames.delete(block.id);
        blocks.splice(i, 1);
        if (selectedId === block.id) {
          selectedId = null;
        }
        renderCanvas();
        notify();
      });
      actions.appendChild(delBtn);

      header.appendChild(actions);

      header.addEventListener('click', () => {
        selectedId = selectedId === block.id ? null : block.id;
        renderCanvas();
      });

      card.appendChild(header);

      // -- Body (inline editor) --
      const body = doc.createElement('div');
      body.className = 'sc-block-body';
      renderBlockEditor(body, doc, block, i);
      card.appendChild(body);

      canvas.appendChild(card);
    }
  }

  function renderBlockEditor(body: HTMLElement, doc: Document, block: TemplateBlock, index: number): void {
    switch (block.type) {
      case 'heading': {
        const hBlock = block as HeadingBlock;
        addSelectField(body, doc, 'Level', [
          { value: '2', label: 'H2' },
          { value: '3', label: 'H3' },
          { value: '4', label: 'H4' },
        ], String(hBlock.level), (val) => {
          hBlock.level = Number(val) as 2 | 3 | 4;
          renderCanvas();
          notify();
        });
        addTextField(body, doc, 'Text', hBlock.text, (val) => {
          hBlock.text = val;
          renderCanvas();
          notify();
        });
        break;
      }
      case 'paragraph': {
        const pBlock = block as ParagraphBlock;
        addTextField(body, doc, 'Text', pBlock.text, (val) => {
          pBlock.text = val;
          renderCanvas();
          notify();
        });
        break;
      }
      case 'text-field':
      case 'date-field':
      case 'number-field':
      case 'select-field': {
        const fBlock = block as TextFieldBlock | DateFieldBlock | NumberFieldBlock | SelectFieldBlock;

        // Label
        addTextField(body, doc, 'Label', fBlock.label, (val) => {
          fBlock.label = val;
          if (!manualNames.has(block.id)) {
            fBlock.name = autoSlug(val);
          }
          renderCanvas();
          notify();
        });

        // Name
        addTextField(body, doc, 'Name', fBlock.name, (val) => {
          manualNames.add(block.id);
          fBlock.name = val;
          renderCanvas();
          notify();
        });

        // Placeholder
        addTextField(body, doc, 'Placeholder', fBlock.placeholder, (val) => {
          fBlock.placeholder = val;
          renderCanvas();
          notify();
        });

        // Required
        addCheckbox(body, doc, 'Required', fBlock.required, (val) => {
          fBlock.required = val;
          renderCanvas();
          notify();
        });

        // Type-specific extras
        if (block.type === 'select-field') {
          const sBlock = block as SelectFieldBlock;
          addTextField(body, doc, 'Options (comma-separated)', sBlock.options.join(', '), (val) => {
            sBlock.options = val.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
            renderCanvas();
            notify();
          });
        }

        if (block.type === 'number-field') {
          const nBlock = block as NumberFieldBlock;
          addNumberField(body, doc, 'Min', nBlock.min, (val) => {
            nBlock.min = val;
            renderCanvas();
            notify();
          });
          addNumberField(body, doc, 'Max', nBlock.max, (val) => {
            nBlock.max = val;
            renderCanvas();
            notify();
          });
        }
        break;
      }
    }
  }

  // Initial render
  renderCanvas();
}
