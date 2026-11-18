import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { initSqlite } from './engine/sqlite';
import { App } from './App';
import './styles.css';

// Start loading the WebAssembly module straight away; every later call reuses it.
void initSqlite(wasmUrl);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
