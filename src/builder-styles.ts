/** CSS for the block-based template builder */
export const BUILDER_CSS = `
.sc-builder-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 0;
  border-bottom: 1px solid #dee2e6;
  margin-bottom: 10px;
}
.sc-builder-palette button {
  padding: 4px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f8f9fa;
  cursor: pointer;
  font-size: 0.78rem;
  color: #333;
}
.sc-builder-palette button:hover {
  background: #e9ecef;
  border-color: #0d6efd;
}
.sc-builder-canvas {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}
.sc-builder-empty {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  font-size: 0.85rem;
}
.sc-block-card {
  border: 1px solid #dee2e6;
  border-radius: 6px;
  margin-bottom: 8px;
  background: #fff;
  transition: border-color 0.15s;
}
.sc-block-card.selected {
  border-color: #0d6efd;
}
.sc-block-header {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  cursor: pointer;
  gap: 8px;
}
.sc-block-type {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #666;
  background: #e9ecef;
  padding: 1px 6px;
  border-radius: 3px;
  flex-shrink: 0;
}
.sc-block-summary {
  flex: 1;
  font-size: 0.85rem;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sc-block-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}
.sc-block-actions button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  color: #666;
  padding: 2px 5px;
  border-radius: 3px;
}
.sc-block-actions button:hover {
  background: #e9ecef;
  color: #333;
}
.sc-block-actions button:disabled {
  opacity: 0.3;
  cursor: default;
}
.sc-block-body {
  display: none;
  padding: 8px 10px 12px;
  border-top: 1px solid #eee;
}
.sc-block-card.selected .sc-block-body {
  display: block;
}
.sc-block-body label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #555;
  margin-bottom: 2px;
  margin-top: 8px;
}
.sc-block-body label:first-child {
  margin-top: 0;
}
.sc-block-body input[type="text"],
.sc-block-body input[type="number"],
.sc-block-body select {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.85rem;
}
.sc-block-body .sc-checkbox-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}
.sc-block-body .sc-checkbox-row input[type="checkbox"] {
  margin: 0;
}
.sc-block-body .sc-checkbox-row label {
  margin: 0;
  font-weight: normal;
}
`;

/** Inject builder CSS into a document (idempotent) */
export function injectBuilderStyles(doc: Document): void {
  if (doc.getElementById('sc-builder-styles')) return;
  const style = doc.createElement('style');
  style.id = 'sc-builder-styles';
  style.textContent = BUILDER_CSS;
  doc.head.appendChild(style);
}
