import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API = `http://localhost:${process.env.API_PORT || 4180}`;

export default defineConfig({
  // En GitHub Pages el sitio vive en /<repo>/ (VITE_BASE=/tutis-moda/).
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': API,
      '/uploads': API,
    },
  },
});
