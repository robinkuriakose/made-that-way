import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { initTestMode } from './lib/testMode.js';
import { readArrival } from './lib/share.js';
import './styles.css';

// /?test=1 from the builder switches test mode on (only when signed in to it).
initTestMode();

// The builder: password protected, reachable only by typing /builder.
// Loaded separately so players never download it.
const BuilderApp = lazy(() => import('./builder/BuilderApp.jsx'));

const isBuilderRoute = window.location.pathname.replace(/\/+$/, '') === '/builder';

// The lab (/lab): rough prototypes of new kinds of question, kept in the
// gitignored lab/ folder on the owner's machine. Only the dev server looks
// for it, so a production build never contains it.
let LabApp = null;
if (import.meta.env.DEV && window.location.pathname.replace(/\/+$/, '') === '/lab') {
  const load = Object.values(import.meta.glob('../lab/LabApp.jsx'))[0];
  if (load) LabApp = lazy(load);
}

// A shared link (/q/<id> or /daily/<day>), read once, before anything renders.
const arrival = isBuilderRoute || LabApp ? null : readArrival();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {LabApp ? (
      <Suspense fallback={null}>
        <LabApp />
      </Suspense>
    ) : isBuilderRoute ? (
      <Suspense fallback={null}>
        <BuilderApp />
      </Suspense>
    ) : (
      <App arrival={arrival} />
    )}
  </React.StrictMode>,
);
