// src/types.ts

export interface Template {
  id: string;
  title: string;
  description?: string;
  content: string;
  category?: string;
  thumbnail?: string;
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
