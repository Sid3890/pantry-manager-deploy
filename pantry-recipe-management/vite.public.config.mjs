import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const runtimeEnv = loadEnv(mode, projectRoot, '');

  return {
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_APP_ID': JSON.stringify(runtimeEnv.VITE_APP_ID || runtimeEnv.MANUS_PROJECT_ID || ''),
    'import.meta.env.VITE_OAUTH_PORTAL_URL': JSON.stringify(runtimeEnv.VITE_OAUTH_PORTAL_URL || runtimeEnv.MANUS_OAUTH_PORTAL_URL || ''),
  },
  resolve: {
    alias: {
      '@': path.resolve(projectRoot, 'client', 'src'),
      '@shared': path.resolve(projectRoot, 'shared'),
      '@assets': path.resolve(projectRoot, 'attached_assets'),
    },
  },
  envDir: projectRoot,
  root: path.resolve(projectRoot, 'client'),
  publicDir: path.resolve(projectRoot, 'client', 'public'),
  build: {
    outDir: path.resolve(projectRoot, 'dist', 'public'),
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: true,
  },
  };
});
