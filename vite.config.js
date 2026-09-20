import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import localApi from './tools/local-api.js';

// The dev server falls back to index.html for unknown paths, so /builder
// works locally; vercel.json does the same in production. localApi() serves
// the api/ routes during `npm run dev` (see tools/local-api.js).
export default defineConfig({
  plugins: [react(), localApi()],
});
