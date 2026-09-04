import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Bind every interface so phones and tablets on the same wifi can reach
    // the dev server at http://<your-lan-ip>:5173. Loopback-only is the Vite
    // default and is why localhost works but 192.168.x.x does not.
    host: true,
    // Same-origin in dev, so the httpOnly auth cookie just works.
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
