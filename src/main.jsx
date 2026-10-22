import { createRoot } from 'react-dom/client';
import '@fontsource-variable/unbounded';
import '@fontsource-variable/geist';
import './styles/base.css';
import './styles/components.css';
import './styles/app.css';
import './styles/views.css';
import App from './App.jsx';
import { loadData } from './lib/platform.js';
import { initStore, flushSave, getState } from './state/store.js';
import { startWatcher } from './state/watcher.js';
import { timer } from './lib/focusTimer.js';

async function boot() {
  const { data, version, dataPath, safeGraphics = false, safeReason = '' } = await loadData();
  initStore(data);
  document.documentElement.dataset.theme = getState().settings.theme;
  window.__beyond = { version, dataPath, safeGraphics, safeReason };
  startWatcher();
  timer.syncDurations();
  window.addEventListener('beforeunload', flushSave);
  createRoot(document.getElementById('root')).render(<App />);
}

boot();
