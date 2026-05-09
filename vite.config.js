import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const appDomain = String(process.env.APP_DOMAIN ?? '').trim();
const allowedHosts = [
  'localhost',
  '127.0.0.1',
  ...(appDomain ? [appDomain, `www.${appDomain}`] : []),
];

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4173,
    host: '0.0.0.0',
    allowedHosts,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    host: '0.0.0.0',
    allowedHosts,
  },
});
