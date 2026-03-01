/** CSS for the template browser modal — injected into the host page (not the editor iframe) */
export const MODAL_CSS = `
.sc-overlay {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 40px;
}
.sc-modal {
  background: #fff;
  border-radius: 8px;
  width: 800px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}
.sc-header {
  padding: 15px 20px;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.sc-header h3 { margin: 0; font-size: 1.1rem; }
.sc-close {
  background: none; border: none; font-size: 1.5rem;
  cursor: pointer; color: #666; line-height: 1;
}
.sc-close:hover { color: #333; }
.sc-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.sc-sidebar {
  width: 140px;
  border-right: 1px solid #dee2e6;
  padding: 10px 0;
  overflow-y: auto;
  flex-shrink: 0;
}
.sc-sidebar-item {
  display: block;
  width: 100%;
  padding: 8px 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 0.85rem;
  color: #333;
}
.sc-sidebar-item:hover { background: #f0f0f0; }
.sc-sidebar-item.active { background: #e8f4fd; color: #0d6efd; font-weight: 600; }
.sc-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sc-search {
  padding: 10px 15px;
  border-bottom: 1px solid #dee2e6;
}
.sc-search input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
}
.sc-grid {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  align-content: start;
}
.sc-card {
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 12px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.sc-card:hover { border-color: #0d6efd; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.sc-card:focus { outline: 2px solid #0d6efd; outline-offset: 2px; }
.sc-card-title { margin: 0 0 4px; font-size: 0.95rem; }
.sc-card-cat {
  font-size: 0.7rem;
  background: #e9ecef;
  padding: 1px 6px;
  border-radius: 3px;
  display: inline-block;
  margin-bottom: 6px;
}
.sc-card-desc { margin: 0; font-size: 0.8rem; color: #666; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.sc-preview-panel {
  border-top: 1px solid #dee2e6;
  display: none;
}
.sc-preview-panel.active { display: block; }
.sc-preview-header {
  padding: 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
}
.sc-preview-header h4 { margin: 0; font-size: 1rem; }
.sc-preview-content {
  padding: 15px 20px;
  max-height: 200px;
  overflow-y: auto;
  background: #fafafa;
}
.sc-preview-actions {
  padding: 10px 20px;
  text-align: right;
  border-top: 1px solid #eee;
}
.sc-btn {
  padding: 6px 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  margin-left: 8px;
  background: #fff;
}
.sc-btn:hover { background: #f0f0f0; }
.sc-btn-primary { background: #0d6efd; color: #fff; border-color: #0d6efd; }
.sc-btn-primary:hover { background: #0b5ed7; }
.sc-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px;
  color: #999;
}
`;

/** Inject modal CSS into the host page (idempotent) */
export function injectModalStyles(): void {
  if (document.getElementById('sc-modal-styles')) return;
  const style = document.createElement('style');
  style.id = 'sc-modal-styles';
  style.textContent = MODAL_CSS;
  document.head.appendChild(style);
}
