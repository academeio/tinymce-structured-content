import type { StructuredContentConfig, Category } from './types';

/** Open the template authoring modal (stub — full implementation in Task 5) */
export function openAuthoring(config: StructuredContentConfig, categories: Category[]): void {
  console.log('Authoring modal not yet implemented');
}

/** Close the authoring modal */
export function closeAuthoring(): void {
  const overlay = document.getElementById('sc-authoring-overlay');
  if (overlay) overlay.remove();
}
