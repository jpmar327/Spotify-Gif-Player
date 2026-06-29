import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MetadataView } from './views/MetadataView';
import { DebugView } from './views/DebugView';
import './styles/global.css';

const params = new URLSearchParams(window.location.search);
const view = params.get('view');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {view === 'metadata' ? <MetadataView /> : view === 'debug' ? <DebugView /> : <App />}
  </React.StrictMode>
);
