import type {
  StructuredContentConfig,
  Template,
  AnalyticsEvent,
  TemplateInsertedEvent,
  TemplateSubmittedEvent,
  TemplateMetrics,
  FieldMetric,
} from './types';
import { findPlaceholderFields } from './placeholders';

/**
 * Compute metrics for the current template in the editor.
 * Returns null if no .sc-template wrapper is present.
 */
export function getTemplateMetrics(editor: any): TemplateMetrics | null {
  const doc: Document = editor.getDoc();
  const wrapper = doc.querySelector('.sc-template[data-template-id]');
  if (!wrapper) return null;

  const fields = findPlaceholderFields(doc);

  const totalFields = fields.length;
  const resolvedFields = fields.filter((f) => f.resolved).length;
  const requiredFields = fields.filter((f) => f.required).length;
  const unresolvedRequired = fields.filter((f) => f.required && !f.resolved).length;
  const completionPercentage = totalFields === 0 ? 100 : Math.round((resolvedFields / totalFields) * 100);

  const fieldBreakdown: FieldMetric[] = fields.map((f) => ({
    name: f.name,
    type: f.type,
    required: f.required,
    resolved: f.resolved,
  }));

  return {
    totalFields,
    requiredFields,
    resolvedFields,
    unresolvedRequired,
    completionPercentage,
    fieldBreakdown,
  };
}

/**
 * Fire a template_inserted analytics event.
 * Called from browser.ts after insertTemplate().
 */
export function fireInsertionEvent(
  editor: any,
  config: StructuredContentConfig,
  template: Template,
  mode: 'cursor' | 'document'
): void {
  if (!config.onAnalyticsEvent) return;

  const doc: Document = editor.getDoc();
  const fields = findPlaceholderFields(doc);

  const event: TemplateInsertedEvent = {
    type: 'template_inserted',
    templateId: template.id,
    templateTitle: template.title,
    templateVersion: template.version,
    timestamp: Date.now(),
    insertionMode: mode,
    fieldCount: fields.length,
    requiredFieldCount: fields.filter((f) => f.required).length,
  };

  config.onAnalyticsEvent(event);
}

/**
 * Fire a template_submitted analytics event.
 * Called from plugin.ts in BeforeGetContent handler.
 */
export function fireSubmissionEvent(
  editor: any,
  config: StructuredContentConfig
): void {
  if (!config.onAnalyticsEvent) return;

  const doc: Document = editor.getDoc();
  const wrapper = doc.querySelector('.sc-template[data-template-id]');
  if (!wrapper) return;

  const metrics = getTemplateMetrics(editor);
  if (!metrics) return;

  const event: TemplateSubmittedEvent = {
    type: 'template_submitted',
    templateId: wrapper.getAttribute('data-template-id')!,
    templateTitle: wrapper.getAttribute('data-template-title') || '',
    templateVersion: wrapper.getAttribute('data-template-version') || undefined,
    timestamp: Date.now(),
    metrics,
  };

  config.onAnalyticsEvent(event);
}
