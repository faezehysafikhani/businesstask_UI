import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Dev: /api is proxied to the host (no CORS needed). Production: set VITE_API_URL at build time
// and add the UI origin to Cors:AllowedOrigins in the host.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    server: { port: 5173, proxy: { '/api': { target: env.HOST_URL || 'http://localhost:5252', changeOrigin: true } } },
  };
});
