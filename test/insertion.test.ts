import { describe, it, expect } from 'vitest';
import { replaceVariables, insertTemplate } from '../src/insertion';

describe('replaceVariables', () => {
  it('replaces {{variable}} patterns with values', () => {
    const html = '<p>Author: {{author}}, Date: {{date}}</p>';
    const vars = { author: 'Dr. Smith', date: '01-03-2026' };
    expect(replaceVariables(html, vars)).toBe('<p>Author: Dr. Smith, Date: 01-03-2026</p>');
  });

  it('leaves unmatched variables as-is', () => {
    const html = '<p>{{known}} and {{unknown}}</p>';
    const vars = { known: 'hello' };
    expect(replaceVariables(html, vars)).toBe('<p>hello and {{unknown}}</p>');
  });

  it('returns html unchanged when no variables provided', () => {
    const html = '<p>{{author}}</p>';
    expect(replaceVariables(html, {})).toBe('<p>{{author}}</p>');
    expect(replaceVariables(html, undefined)).toBe('<p>{{author}}</p>');
  });

  it('handles multiple occurrences of the same variable', () => {
    const html = '<p>{{name}} wrote: signed {{name}}</p>';
    const vars = { name: 'Alice' };
    expect(replaceVariables(html, vars)).toBe('<p>Alice wrote: signed Alice</p>');
  });

  it('escapes HTML in variable values to prevent XSS', () => {
    const html = '<p>{{name}}</p>';
    const vars = { name: '<script>alert("xss")</script>' };
    const result = replaceVariables(html, vars);
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });
});

describe('insertTemplate', () => {
  function mockEditor() {
    return {
      _content: '',
      setContent(html: string) { this._content = html; },
      insertContent(html: string) { this._content += html; },
      undoManager: { transact(fn: () => void) { fn(); } },
      getContent() { return this._content; }
    };
  }

  it('inserts at cursor with sc-template wrapper', () => {
    const editor = mockEditor();
    insertTemplate(editor, '<p>Hello</p>', 'tpl-1', 'cursor', {});
    expect(editor._content).toContain('class="sc-template"');
    expect(editor._content).toContain('data-template-id="tpl-1"');
    expect(editor._content).toContain('<p>Hello</p>');
  });

  it('replaces content in document mode', () => {
    const editor = mockEditor();
    editor._content = '<p>Old content</p>';
    insertTemplate(editor, '<p>New</p>', 'tpl-2', 'document', {});
    expect(editor._content).toBe('<p>New</p>');
    expect(editor._content).not.toContain('Old content');
  });

  it('applies variable replacement before insertion', () => {
    const editor = mockEditor();
    insertTemplate(editor, '<p>By {{author}}</p>', 'tpl-3', 'document', {
      variables: { author: 'Dr. Smith' }
    });
    expect(editor._content).toContain('Dr. Smith');
    expect(editor._content).not.toContain('{{author}}');
  });

  it('stamps data-template-version when version is provided (cursor mode)', () => {
    const editor = mockEditor();
    insertTemplate(editor, '<p>Hello</p>', 'tpl-1', 'cursor', {}, 'v2.1');
    expect(editor._content).toContain('data-template-version="v2.1"');
    expect(editor._content).toContain('data-template-id="tpl-1"');
  });

  it('does not stamp version when not provided (backward compat)', () => {
    const editor = mockEditor();
    insertTemplate(editor, '<p>Hello</p>', 'tpl-1', 'cursor', {});
    expect(editor._content).not.toContain('data-template-version');
    expect(editor._content).toContain('data-template-id="tpl-1"');
  });
});
