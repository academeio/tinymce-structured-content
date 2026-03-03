/** CSS for the template authoring modal */
export const AUTHORING_CSS = `
.sc-authoring-overlay {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100001;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 30px;
}
.sc-authoring-modal {
  background: #fff;
  border-radius: 8px;
  width: 960px;
  max-width: 95vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}
.sc-authoring-header {
  padding: 15px 20px;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.sc-authoring-header h3 { margin: 0; font-size: 1.1rem; }
.sc-authoring-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.sc-authoring-left {
  flex: 1;
  padding: 15px 20px;
  overflow-y: auto;
  border-right: 1px solid #dee2e6;
}
.sc-authoring-right {
  width: 380px;
  flex-shrink: 0;
  overflow-y: auto;
}
.sc-authoring-meta {
  margin-bottom: 15px;
}
.sc-authoring-meta label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 3px;
  color: #555;
}
.sc-authoring-meta input,
.sc-authoring-meta textarea,
.sc-authoring-meta select {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
  margin-bottom: 10px;
}
.sc-authoring-meta textarea { resize: vertical; min-height: 60px; }
.sc-authoring-editor {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.sc-authoring-preview {
  padding: 15px 20px;
}
.sc-authoring-preview h4 {
  margin: 0 0 10px;
  font-size: 0.9rem;
  color: #555;
}
.sc-authoring-preview-content {
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 15px;
  min-height: 200px;
}
.sc-authoring-footer {
  padding: 12px 20px;
  border-top: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.sc-authoring-scope {
  display: flex;
  gap: 16px;
  align-items: center;
}
.sc-authoring-scope label {
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}
`;

/** Inject authoring CSS into a document (idempotent) */
export function injectAuthoringStyles(doc: Document): void {
  if (doc.getElementById('sc-authoring-styles')) return;
  const style = doc.createElement('style');
  style.id = 'sc-authoring-styles';
  style.textContent = AUTHORING_CSS;
  doc.head.appendChild(style);
}
