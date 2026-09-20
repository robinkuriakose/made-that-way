import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { initTestMode } from './lib/testMode.js';
import './styles.css';

// /?test=1 from the builder switches test mode on (only when signed in to it).
initTestMode();

// The builder: password protected, reachable only by typing /builder.
// Loaded separately so players never download it.
const BuilderApp = lazy(() => import('./builder/BuilderApp.jsx'));

const isBuilderRoute = window.location.pathname.replace(/\/+$/, '') === '/builder';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isBuilderRoute ? (
      <Suspense fallback={null}>
        <BuilderApp />
      </Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
