import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MetadataView } from './views/MetadataView';
import './styles/global.css';

// Checked once at startup — if this is the metadata popup window, skip the full auth flow.
const isMetadataWindow = new URLSearchParams(window.location.search).get('view') === 'metadata';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isMetadataWindow ? <MetadataView /> : <App />}
  </React.StrictMode>
);
