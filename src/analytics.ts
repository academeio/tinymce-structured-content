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
