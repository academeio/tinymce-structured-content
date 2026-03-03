import type { StructuredContentConfig, Category, TemplateDraft, TemplateBlock } from './types';
import { injectAuthoringStyles } from './authoring-styles';
import { PLACEHOLDER_CSS } from './placeholders';
import { renderBuilder } from './builder-ui';
import { modelToHTML } from './builder';

/**
 * Build an HTML span for a placeholder field.
 * Used by the Insert Placeholder dialog to generate tmpl-field markup.
 */
export function buildPlaceholderSpan(
  name: string,
  type: string,
  required: boolean,
  options?: string,
  min?: number,
  max?: number
): string {
  let attrs = `class="tmpl-field" data-field="${name}" data-type="${type}"`;
  if (required) attrs += ' data-required="true"';
  if (type === 'select' && options) attrs += ` data-options="${options}"`;
  if (type === 'number' && min !== undefined) attrs += ` data-min="${min}"`;
  if (type === 'number' && max !== undefined) attrs += ` data-max="${max}"`;
  const display = `{${name}}`;
  return `<span ${attrs}>${display}</span>`;
}

/** Open the template authoring modal */
export function openAuthoring(config: StructuredContentConfig, categories: Category[]): void {
  injectAuthoringStyles(document);

  let currentBlocks: TemplateBlock[] = [];
  let debounceTimer: ReturnType<typeof setTimeout>;

  // -- Overlay --
  const overlay = document.createElement('div');
  overlay.className = 'sc-authoring-overlay';
  overlay.id = 'sc-authoring-overlay';

  // -- Modal --
  const modal = document.createElement('div');
  modal.className = 'sc-authoring-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-label', 'Create Template');

  // -- Header --
  const header = document.createElement('div');
  header.className = 'sc-authoring-header';
  const h3 = document.createElement('h3');
  h3.textContent = 'Create Template';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'sc-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', closeAuthoring);
  header.appendChild(h3);
  header.appendChild(closeBtn);

  // -- Body --
  const body = document.createElement('div');
  body.className = 'sc-authoring-body';

  // Left pane: metadata + builder
  const left = document.createElement('div');
  left.className = 'sc-authoring-left';

  // Metadata fields
  const meta = document.createElement('div');
  meta.className = 'sc-authoring-meta';

  const titleLabel = document.createElement('label');
  titleLabel.textContent = 'Title';
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.placeholder = 'Template title';

  const descLabel = document.createElement('label');
  descLabel.textContent = 'Description';
  const descInput = document.createElement('textarea');
  descInput.placeholder = 'Brief description';

  const catLabel = document.createElement('label');
  catLabel.textContent = 'Category';
  const catSelect = document.createElement('select');
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = 'Select category...';
  catSelect.appendChild(defaultOpt);
  categories.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.label;
    catSelect.appendChild(opt);
  });

  meta.appendChild(titleLabel);
  meta.appendChild(titleInput);
  meta.appendChild(descLabel);
  meta.appendChild(descInput);
  meta.appendChild(catLabel);
  meta.appendChild(catSelect);

  // Builder area (replaces TinyMCE)
  const builderDiv = document.createElement('div');
  builderDiv.className = 'sc-authoring-editor';

  left.appendChild(meta);
  left.appendChild(builderDiv);

  // Right pane: live preview
  const right = document.createElement('div');
  right.className = 'sc-authoring-right';

  const previewSection = document.createElement('div');
  previewSection.className = 'sc-authoring-preview';
  const previewH4 = document.createElement('h4');
  previewH4.textContent = 'Live Preview';
  const previewContent = document.createElement('div');
  previewContent.className = 'sc-authoring-preview-content';

  const previewStyle = document.createElement('style');
  previewStyle.textContent = PLACEHOLDER_CSS;

  previewSection.appendChild(previewH4);
  previewSection.appendChild(previewContent);
  right.appendChild(previewStyle);
  right.appendChild(previewSection);

  body.appendChild(left);
  body.appendChild(right);

  // -- Footer: scope + save --
  const footer = document.createElement('div');
  footer.className = 'sc-authoring-footer';

  const scopeDiv = document.createElement('div');
  scopeDiv.className = 'sc-authoring-scope';
  const savableScopes = (config.scopes || ['personal']).filter((s) => s !== 'site');
  savableScopes.forEach((scope, i) => {
    const label = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'sc-authoring-scope';
    radio.value = scope;
    if (i === 0) radio.checked = true;
    const scopeLabels: Record<string, string> = { personal: 'Personal', group: 'Group' };
    label.appendChild(radio);
    label.appendChild(document.createTextNode(' ' + (scopeLabels[scope] || scope)));
    scopeDiv.appendChild(label);
  });

  const saveBtn = document.createElement('button');
  saveBtn.className = 'sc-btn sc-btn-primary';
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', async () => {
    const titleVal = titleInput.value.trim();
    if (!titleVal) {
      titleInput.style.borderColor = '#d9534f';
      titleInput.focus();
      return;
    }

    const description = descInput.value.trim();
    const category = catSelect.value;
    const content = modelToHTML(currentBlocks);
    const scopeRadio = document.querySelector(
      'input[name="sc-authoring-scope"]:checked'
    ) as HTMLInputElement | null;
    const scope = (scopeRadio?.value || 'personal') as 'personal' | 'group';

    const draft: TemplateDraft = { title: titleVal, description, content, category };

    if (config.onSave) {
      try {
        await config.onSave(draft, scope);
        closeAuthoring();
      } catch (err) {
        console.error('Failed to save template:', err);
      }
    }
  });

  footer.appendChild(scopeDiv);
  footer.appendChild(saveBtn);

  // Assemble modal
  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  overlay.appendChild(modal);

  // Click outside to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeAuthoring();
  });

  // Escape to close
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeAuthoring();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  document.body.appendChild(overlay);

  // -- Initialize builder --
  renderBuilder(builderDiv, document, (blocks) => {
    currentBlocks = blocks;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      previewContent.innerHTML = modelToHTML(blocks);
    }, 300);
  });

  titleInput.focus();
}

/** Close the authoring modal */
export function closeAuthoring(): void {
  const overlay = document.getElementById('sc-authoring-overlay');
  if (overlay) overlay.remove();
}
