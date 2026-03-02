import type { StructuredContentConfig, Category, TemplateDraft } from './types';
import { injectAuthoringStyles } from './authoring-styles';
import { PLACEHOLDER_CSS } from './placeholders';

declare const tinymce: any;

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

  let authoringEditor: any = null;

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
  closeBtn.addEventListener('click', () => {
    cleanupEditor();
    closeAuthoring();
  });
  header.appendChild(h3);
  header.appendChild(closeBtn);

  // -- Body --
  const body = document.createElement('div');
  body.className = 'sc-authoring-body';

  // Left pane: metadata + editor
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

  // Editor area
  const editorDiv = document.createElement('div');
  editorDiv.className = 'sc-authoring-editor';
  const textarea = document.createElement('textarea');
  textarea.id = 'sc-authoring-textarea';
  editorDiv.appendChild(textarea);

  left.appendChild(meta);
  left.appendChild(editorDiv);

  // Right pane: live preview
  const right = document.createElement('div');
  right.className = 'sc-authoring-right';

  const previewSection = document.createElement('div');
  previewSection.className = 'sc-authoring-preview';
  const previewH4 = document.createElement('h4');
  previewH4.textContent = 'Live Preview';
  const previewContent = document.createElement('div');
  previewContent.className = 'sc-authoring-preview-content';

  // Inject placeholder CSS into preview for field styling
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

  // Scope radio buttons (personal/group — excludes 'site')
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

  // Save button
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
    const content = authoringEditor ? authoringEditor.getContent() : '';
    const scopeRadio = document.querySelector(
      'input[name="sc-authoring-scope"]:checked'
    ) as HTMLInputElement | null;
    const scope = (scopeRadio?.value || 'personal') as 'personal' | 'group';

    const draft: TemplateDraft = { title: titleVal, description, content, category };

    if (config.onSave) {
      try {
        await config.onSave(draft, scope);
        cleanupEditor();
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
    if (e.target === overlay) {
      cleanupEditor();
      closeAuthoring();
    }
  });

  // Escape to close
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      cleanupEditor();
      closeAuthoring();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  document.body.appendChild(overlay);

  // -- Initialize TinyMCE editor --
  let debounceTimer: ReturnType<typeof setTimeout>;

  tinymce.init({
    target: textarea,
    height: 280,
    menubar: false,
    toolbar: 'undo redo | bold italic underline | bullist numlist | insertplaceholder',
    plugins: 'lists',
    promotion: false,
    branding: false,
    setup: (ed: any) => {
      authoringEditor = ed;

      // Register Insert Placeholder toolbar button
      ed.ui.registry.addButton('insertplaceholder', {
        text: 'Insert Placeholder',
        onAction: () => openPlaceholderDialog(ed),
      });

      // Live preview on content change
      ed.on('input keyup change SetContent', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          previewContent.innerHTML = ed.getContent();
        }, 300);
      });
    },
  });

  titleInput.focus();

  function cleanupEditor(): void {
    if (authoringEditor) {
      authoringEditor.remove();
      authoringEditor = null;
    }
  }
}

/** Close the authoring modal */
export function closeAuthoring(): void {
  const overlay = document.getElementById('sc-authoring-overlay');
  if (overlay) overlay.remove();
}

/** Open the Insert Placeholder dialog in the authoring editor */
function openPlaceholderDialog(editor: any): void {
  editor.windowManager.open({
    title: 'Insert Placeholder',
    body: {
      type: 'panel',
      items: [
        { type: 'input', name: 'fieldName', label: 'Field name' },
        {
          type: 'selectbox',
          name: 'fieldType',
          label: 'Type',
          items: [
            { text: 'Text', value: 'text' },
            { text: 'Date', value: 'date' },
            { text: 'Select', value: 'select' },
            { text: 'Number', value: 'number' },
          ],
        },
        { type: 'checkbox', name: 'required', label: 'Required' },
        { type: 'input', name: 'options', label: 'Options (pipe-separated, for Select type)' },
        { type: 'input', name: 'min', label: 'Min (for Number type)' },
        { type: 'input', name: 'max', label: 'Max (for Number type)' },
      ],
    },
    buttons: [
      { type: 'cancel', text: 'Cancel' },
      { type: 'submit', text: 'Insert', primary: true },
    ],
    onSubmit: (api: any) => {
      const data = api.getData();
      if (!data.fieldName) return;

      const span = buildPlaceholderSpan(
        data.fieldName,
        data.fieldType,
        data.required,
        data.options || undefined,
        data.min ? Number(data.min) : undefined,
        data.max ? Number(data.max) : undefined
      );
      editor.insertContent(span);
      api.close();
    },
  });
}
