// src/types.ts

export interface Template {
  id: string;
  title: string;
  description?: string;
  content: string;
  category?: string;
  thumbnail?: string;
  version?: string;
}

export interface Category {
  id: string;
  label: string;
  icon?: string;
}

export interface FetchResult {
  templates: Template[];
  categories: Category[];
}

export interface StructuredContentConfig {
  templates?: Template[];
  fetch?: (query?: string, scope?: TemplateScope) => Promise<FetchResult>;
  onSave?: (template: TemplateDraft, scope: 'personal' | 'group') => Promise<{ id: string }>;
  insertMode?: 'cursor' | 'document' | 'both';
  variables?: Record<string, string>;
  modalTitle?: string;
  strings?: Record<string, string>;
  validation?: 'warn' | 'none';
  enableAuthoring?: boolean;
  scopes?: TemplateScope[];
  checkVersion?: (templateId: string, currentVersion: string) => Promise<VersionCheckResult | null>;
  onAnalyticsEvent?: (event: AnalyticsEvent) => void;
}

/** Internal representation of a placeholder field in the editor */
export interface PlaceholderField {
  element: HTMLElement;
  name: string;
  defaultText: string;
  required: boolean;
  resolved: boolean;
  type: 'text' | 'date' | 'select' | 'number';
  options?: string[];
  min?: number;
  max?: number;
}

export type TemplateScope = 'personal' | 'group' | 'site';

export interface TemplateDraft {
  title: string;
  description: string;
  content: string;
  category: string;
}

export interface VersionCheckResult {
  latestVersion: string;
  latestTemplate: Template;
}

export type AnalyticsEventType = 'template_inserted' | 'template_submitted';

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  templateId: string;
  templateTitle: string;
  templateVersion?: string;
  timestamp: number;
}

export interface TemplateInsertedEvent extends AnalyticsEvent {
  type: 'template_inserted';
  insertionMode: 'cursor' | 'document';
  fieldCount: number;
  requiredFieldCount: number;
}

export interface TemplateMetrics {
  totalFields: number;
  requiredFields: number;
  resolvedFields: number;
  unresolvedRequired: number;
  completionPercentage: number;
  fieldBreakdown: FieldMetric[];
}

export interface FieldMetric {
  name: string;
  type: 'text' | 'date' | 'select' | 'number';
  required: boolean;
  resolved: boolean;
}

export interface TemplateSubmittedEvent extends AnalyticsEvent {
  type: 'template_submitted';
  metrics: TemplateMetrics;
}

// -- Builder block types --

export type BlockType = 'heading' | 'paragraph' | 'text-field' | 'date-field' | 'select-field' | 'number-field';

export interface HeadingBlock {
  id: string;
  type: 'heading';
  level: 2 | 3 | 4;
  text: string;
}

export interface ParagraphBlock {
  id: string;
  type: 'paragraph';
  text: string;
}

export interface TextFieldBlock {
  id: string;
  type: 'text-field';
  name: string;
  label: string;
  placeholder: string;
  required: boolean;
}

export interface DateFieldBlock {
  id: string;
  type: 'date-field';
  name: string;
  label: string;
  placeholder: string;
  required: boolean;
}

export interface SelectFieldBlock {
  id: string;
  type: 'select-field';
  name: string;
  label: string;
  placeholder: string;
  required: boolean;
  options: string[];
}

export interface NumberFieldBlock {
  id: string;
  type: 'number-field';
  name: string;
  label: string;
  placeholder: string;
  required: boolean;
  min?: number;
  max?: number;
}

export type TemplateBlock = HeadingBlock | ParagraphBlock | TextFieldBlock
  | DateFieldBlock | SelectFieldBlock | NumberFieldBlock;
