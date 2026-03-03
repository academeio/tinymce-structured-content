import type { StructuredContentConfig } from './types';
import { openBrowser } from './browser';
import { checkForUpdates } from './versioning';
import { fireSubmissionEvent } from './analytics';

declare const tinymce: any;

tinymce.PluginManager.add('structuredcontent', (editor: any) => {
  // Register option first so TinyMCE recognises the config key before we read it
  editor.options.register('structuredcontent', { processor: 'object', default: {} });

  const config: StructuredContentConfig = editor.options.get('structuredcontent') || {};

  // Toolbar button
  editor.ui.registry.addButton('structuredcontent', {
    icon: 'template',
    tooltip: config.strings?.buttonTooltip || 'Structured Content',
    onAction: () => openBrowser(editor, config),
  });

  // Menu item
  editor.ui.registry.addMenuItem('structuredcontent', {
    icon: 'template',
    text: config.strings?.menuText || 'Structured Content',
    onAction: () => openBrowser(editor, config),
  });

  // Check for template version updates on content load (once per session)
  let versionChecked = false;
  editor.on('SetContent', () => {
    if (versionChecked) return;
    versionChecked = true;
    checkForUpdates(editor, config).catch(() => {});
  });

  // Fire analytics event on content extraction
  editor.on('BeforeGetContent', () => {
    fireSubmissionEvent(editor, config);
  });
});
