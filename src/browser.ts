import type { Template, Category, StructuredContentConfig } from './types';
import { injectModalStyles } from './styles';
import { insertTemplate } from './insertion';
import { activatePlaceholders } from './placeholders';

/** Filter templates by category and search term */
export function filterTemplates(
  templates: Template[],
  category: string | null,
  search: string
): Template[] {
  let filtered = templates;
  if (category) {
    filtered = filtered.filter((t) => t.category === category);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
    );
  }
  return filtered;
}

/** Escape HTML for safe insertion into the modal DOM */
function esc(str: string): string {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/** Open the template browser modal */
export function openBrowser(editor: any, config: StructuredContentConfig): void {
  injectModalStyles();

  let allTemplates: Template[] = [];
  let allCategories: Category[] = [];

  // Resolve template data
  const dataPromise: Promise<void> = config.fetch
    ? config.fetch().then((result) => {
        allTemplates = result.templates;
        allCategories = result.categories;
      })
    : Promise.resolve().then(() => {
        allTemplates = config.templates || [];
        const cats = new Set(allTemplates.map((t) => t.category).filter(Boolean));
        allCategories = Array.from(cats).map((c) => ({ id: c!, label: c! }));
      });

  dataPromise.then(() => {
    renderModal(editor, config, allTemplates, allCategories);
  });
}

/** Close and clean up the modal */
export function closeBrowser(): void {
  const overlay = document.getElementById('sc-overlay');
  if (overlay) overlay.remove();
  document.body.classList.remove('modal-open');
}

/**
 * Render the modal DOM.
 * Creates overlay, modal with header, sidebar, search, card grid, and preview panel.
 */
function renderModal(
  editor: any,
  config: StructuredContentConfig,
  templates: Template[],
  categories: Category[]
): void {
  const title = config.modalTitle || 'Structured Content';
  const insertMode = config.insertMode || 'both';
  let activeCategory: string | null = null;
  let searchQuery = '';
  let selectedTemplate: Template | null = null;

  // Build overlay
  const overlay = document.createElement('div');
  overlay.className = 'sc-overlay';
  overlay.id = 'sc-overlay';

  // Build modal container
  const modal = document.createElement('div');
  modal.className = 'sc-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-label', title);

  // -- Header --
  const header = document.createElement('div');
  header.className = 'sc-header';
  const h3 = document.createElement('h3');
  h3.textContent = title;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'sc-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', closeBrowser);
  header.appendChild(h3);
  header.appendChild(closeBtn);

  // -- Body (sidebar + main) --
  const body = document.createElement('div');
  body.className = 'sc-body';

  // Sidebar
  const sidebar = document.createElement('div');
  sidebar.className = 'sc-sidebar';

  const allBtn = document.createElement('button');
  allBtn.className = 'sc-sidebar-item active';
  allBtn.textContent = 'All';
  allBtn.addEventListener('click', () => {
    activeCategory = null;
    updateSidebarActive();
    renderCards();
  });
  sidebar.appendChild(allBtn);

  categories.forEach((cat) => {
    const btn = document.createElement('button');
    btn.className = 'sc-sidebar-item';
    btn.textContent = cat.label;
    btn.dataset.categoryId = cat.id;
    btn.addEventListener('click', () => {
      activeCategory = cat.id;
      updateSidebarActive();
      renderCards();
    });
    sidebar.appendChild(btn);
  });

  // Main area
  const main = document.createElement('div');
  main.className = 'sc-main';

  // Search bar
  const searchDiv = document.createElement('div');
  searchDiv.className = 'sc-search';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search templates...';
  searchInput.setAttribute('aria-label', 'Search templates');
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    renderCards();
  });
  searchDiv.appendChild(searchInput);

  // Card grid
  const grid = document.createElement('div');
  grid.className = 'sc-grid';

  main.appendChild(searchDiv);
  main.appendChild(grid);

  body.appendChild(sidebar);
  body.appendChild(main);

  // -- Preview panel --
  const preview = document.createElement('div');
  preview.className = 'sc-preview-panel';

  const previewHeader = document.createElement('div');
  previewHeader.className = 'sc-preview-header';
  const previewTitle = document.createElement('h4');
  previewTitle.textContent = '';
  const backBtn = document.createElement('button');
  backBtn.className = 'sc-btn';
  backBtn.textContent = 'Back';
  backBtn.addEventListener('click', hidePreview);
  previewHeader.appendChild(previewTitle);
  previewHeader.appendChild(backBtn);

  const previewContent = document.createElement('div');
  previewContent.className = 'sc-preview-content';

  const previewActions = document.createElement('div');
  previewActions.className = 'sc-preview-actions';

  if (insertMode === 'cursor' || insertMode === 'both') {
    const cursorBtn = document.createElement('button');
    cursorBtn.className = 'sc-btn sc-btn-primary';
    cursorBtn.textContent = 'Insert at cursor';
    cursorBtn.addEventListener('click', () => doInsert('cursor'));
    previewActions.appendChild(cursorBtn);
  }

  if (insertMode === 'document' || insertMode === 'both') {
    const docBtn = document.createElement('button');
    docBtn.className = 'sc-btn';
    docBtn.textContent = 'New document';
    docBtn.addEventListener('click', () => doInsert('document'));
    previewActions.appendChild(docBtn);
  }

  preview.appendChild(previewHeader);
  preview.appendChild(previewContent);
  preview.appendChild(previewActions);

  // Assemble modal
  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(preview);
  overlay.appendChild(modal);

  // Click outside to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeBrowser();
  });

  // Escape key to close
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeBrowser();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  document.body.appendChild(overlay);
  document.body.classList.add('modal-open');

  // Initial render
  renderCards();
  searchInput.focus();

  // -- Helper functions --

  function updateSidebarActive(): void {
    sidebar.querySelectorAll('.sc-sidebar-item').forEach((btn) => {
      const el = btn as HTMLElement;
      const catId = el.dataset.categoryId || null;
      el.classList.toggle('active', catId === activeCategory);
    });
  }

  function renderCards(): void {
    grid.innerHTML = '';
    const filtered = filterTemplates(templates, activeCategory, searchQuery);

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'sc-empty';
      empty.textContent = 'No templates found.';
      grid.appendChild(empty);
      return;
    }

    filtered.forEach((tpl) => {
      const card = document.createElement('div');
      card.className = 'sc-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', tpl.title);

      const cardTitle = document.createElement('h5');
      cardTitle.className = 'sc-card-title';
      cardTitle.textContent = tpl.title;

      card.appendChild(cardTitle);

      if (tpl.category) {
        const badge = document.createElement('span');
        badge.className = 'sc-card-cat';
        badge.textContent = tpl.category;
        card.appendChild(badge);
      }

      if (tpl.description) {
        const desc = document.createElement('p');
        desc.className = 'sc-card-desc';
        desc.textContent = tpl.description;
        card.appendChild(desc);
      }

      card.addEventListener('click', () => showPreview(tpl));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') showPreview(tpl);
      });

      grid.appendChild(card);
    });
  }

  function showPreview(tpl: Template): void {
    selectedTemplate = tpl;
    previewTitle.textContent = tpl.title;
    previewContent.innerHTML = tpl.content;
    preview.classList.add('active');
    grid.parentElement!.style.display = 'none';
  }

  function hidePreview(): void {
    selectedTemplate = null;
    preview.classList.remove('active');
    grid.parentElement!.style.display = '';
  }

  function doInsert(mode: 'cursor' | 'document'): void {
    if (!selectedTemplate) return;

    if (mode === 'document') {
      const existing = editor.getContent({ format: 'text' }).trim();
      if (existing && !confirm('Replace all editor content with this template?')) {
        return;
      }
    }

    insertTemplate(editor, selectedTemplate.content, selectedTemplate.id, mode, config);
    closeBrowser();
    activatePlaceholders(editor, config);
  }
}
