import type { StructuredContentConfig } from './types';
import { openBrowser } from './browser';

declare const tinymce: any;

tinymce.PluginManager.add('structuredcontent', (editor: any) => {
  const config: StructuredContentConfig = editor.options.get('structuredcontent') || {};

  // Register option so TinyMCE knows about our config key
  editor.options.register('structuredcontent', { processor: 'object', default: {} });

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
});
