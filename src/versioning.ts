import type { StructuredContentConfig, VersionCheckResult } from './types';
import { findPlaceholderFields, activatePlaceholders } from './placeholders';

/** CSS for the version update banner */
export const VERSIONING_CSS = `
.sc-version-banner {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  padding: 10px 16px;
  margin: 0 0 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #664d03;
}
.sc-version-banner-text {
  flex: 1;
}
.sc-version-banner-actions {
  display: flex;
  gap: 8px;
  margin-left: 12px;
}
.sc-version-banner-actions button {
  padding: 4px 12px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.8rem;
}
.sc-version-update {
  background: #0d6efd;
  color: #fff;
  border: 1px solid #0d6efd;
}
.sc-version-update:hover {
  background: #0b5ed7;
}
.sc-version-dismiss {
  background: transparent;
  color: #664d03;
  border: 1px solid #ffc107;
}
`;

/** Inject versioning CSS into a document (idempotent) */
export function injectVersioningStyles(doc: Document): void {
  if (doc.getElementById('sc-versioning-styles')) return;
  const style = doc.createElement('style');
  style.id = 'sc-versioning-styles';
  style.textContent = VERSIONING_CSS;
  doc.head.appendChild(style);
}

/** Remove the version banner from the document */
export function dismissVersionBanner(doc: Document): void {
  const banner = doc.querySelector('.sc-version-banner');
  if (banner) banner.remove();
}

/** Show a version update banner at the top of the document */
export function showVersionBanner(
  doc: Document,
  templateName: string,
  onUpdate: () => void,
  onDismiss: () => void
): void {
  dismissVersionBanner(doc);
  injectVersioningStyles(doc);

  const banner = doc.createElement('div');
  banner.className = 'sc-version-banner';
  banner.setAttribute('contenteditable', 'false');

  const text = doc.createElement('span');
  text.className = 'sc-version-banner-text';
  text.textContent = `This document uses an older version of "\u200B${templateName}\u200B". A newer version is available.`;

  const actions = doc.createElement('div');
  actions.className = 'sc-version-banner-actions';

  const updateBtn = doc.createElement('button');
  updateBtn.className = 'sc-version-update';
  updateBtn.textContent = 'Update';
  updateBtn.addEventListener('click', onUpdate);

  const dismissBtn = doc.createElement('button');
  dismissBtn.className = 'sc-version-dismiss';
  dismissBtn.textContent = '\u2715';
  dismissBtn.setAttribute('aria-label', 'Dismiss');
  dismissBtn.addEventListener('click', onDismiss);

  actions.appendChild(updateBtn);
  actions.appendChild(dismissBtn);
  banner.appendChild(text);
  banner.appendChild(actions);

  doc.body.insertBefore(banner, doc.body.firstChild);
}

/** Extract current values from unresolved placeholder fields (for migration) */
export function extractFieldValues(doc: Document): Map<string, string> {
  const fields = findPlaceholderFields(doc);
  const values = new Map<string, string>();

  fields.forEach((field) => {
    const text = (field.element.textContent || '').trim();
    const defaultText = field.element.getAttribute('data-default') || field.defaultText;
    if (text !== defaultText) {
      values.set(field.name, text);
    }
  });

  return values;
}

/** Check if the editor content uses an outdated template version */
export async function checkForUpdates(editor: any, config: StructuredContentConfig): Promise<void> {
  if (!config.checkVersion) return;

  const doc: Document = editor.getDoc();
  const wrapper = doc.querySelector('.sc-template[data-template-id][data-template-version]');
  if (!wrapper) return;

  const templateId = wrapper.getAttribute('data-template-id')!;
  const currentVersion = wrapper.getAttribute('data-template-version')!;

  const result = await config.checkVersion(templateId, currentVersion);
  if (!result) return;

  showVersionBanner(
    doc,
    result.latestTemplate.title,
    () => migrateTemplate(editor, config, wrapper as HTMLElement, result),
    () => dismissVersionBanner(doc)
  );
}

/** Migrate the editor content to the latest template version (implementation in Task 5) */
export function migrateTemplate(
  editor: any,
  config: StructuredContentConfig,
  wrapper: HTMLElement,
  result: VersionCheckResult
): void {
  // Stub — full implementation in Task 5
}
