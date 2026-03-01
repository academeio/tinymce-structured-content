import { describe, it, expect } from 'vitest';
import { filterTemplates } from '../src/browser';
import type { Template } from '../src/types';

const templates: Template[] = [
  { id: '1', title: 'Clinical Encounter', description: 'Log a clinical encounter', category: 'cbme', content: '' },
  { id: '2', title: 'Two Column Layout', description: 'Side by side columns', category: 'snippets', content: '' },
  { id: '3', title: 'Reflective Narrative', description: 'Gibbs cycle reflection', category: 'cbme', content: '' },
  { id: '4', title: 'Meeting Notes', description: 'Agenda and action items', category: 'general', content: '' },
];

describe('filterTemplates', () => {
  it('returns all templates when no category and no search', () => {
    expect(filterTemplates(templates, null, '')).toHaveLength(4);
  });

  it('filters by category', () => {
    const result = filterTemplates(templates, 'cbme', '');
    expect(result).toHaveLength(2);
    expect(result.map(t => t.id)).toEqual(['1', '3']);
  });

  it('filters by search term (title match)', () => {
    const result = filterTemplates(templates, null, 'clinical');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by search term (description match)', () => {
    const result = filterTemplates(templates, null, 'gibbs');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('combines category and search filters', () => {
    const result = filterTemplates(templates, 'cbme', 'encounter');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('search is case-insensitive', () => {
    expect(filterTemplates(templates, null, 'MEETING')).toHaveLength(1);
  });

  it('returns empty array when nothing matches', () => {
    expect(filterTemplates(templates, 'cbme', 'nonexistent')).toHaveLength(0);
  });
});
