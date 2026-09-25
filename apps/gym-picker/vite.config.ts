import { cloudflare } from '@cloudflare/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Le plugin Cloudflare fait tourner le Worker (worker/index.ts) dans le vrai
// runtime workerd, en dev comme en preview : /api/* se teste en local.
export default defineConfig({
  plugins: [react(), cloudflare()],
});
